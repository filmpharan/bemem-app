import type { WalletDocument } from '../types/wallet-document';
import { emptyCardForm } from './card-form';
import { emptyCardPresentation } from './card-presentation';
import { CARD_SIZE_PRESETS } from './card-size-presets';
import { createDevAddCardRuntime } from './dev-add-card-runtime';
import { createWalletRepository, WALLET_COMMIT_PATTERN } from './wallet-repository';
import { validateWalletDocument } from './wallet-validation';
import { assertWalletTestDev, CUTOVER_TEST_DIRECTORY, type createWalletTestSandbox } from './dev-wallet-sandbox';
import type { DeviceTestResult } from './dev-wallet-checks';

type Sandbox = ReturnType<typeof createWalletTestSandbox>;
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
function check(value: unknown): asserts value { if (!value) throw Error('synthetic_check_failed'); }
class TestOperationFailure extends Error {
  constructor(readonly code: string) { super('test_operation_blocked'); }
}
function completed(result: { ok: boolean; code: string }) {
  if (!result.ok) throw new TestOperationFailure(result.code);
}
function safeFailure(error: unknown) {
  const codes = ['pending_requires_review', 'revision_conflict', 'commit_uncertain', 'reinspection_required',
    'pending_write_failed', 'pending_verification_failed', 'save_not_admitted', 'runtime_activation_failed'];
  return error instanceof TestOperationFailure && codes.includes(error.code) ? ` Reason: ${error.code}.` : '';
}
function confined(sandbox: Sandbox) {
  assertWalletTestDev();
  // Accept ONLY this dedicated test namespace, even if an older sandbox is supplied.
  check(sandbox.path().replace(/\/$/, '').endsWith(`/${CUTOVER_TEST_DIRECTORY}`));
}
function fixtureFields(document: WalletDocument) {
  check(document.cards.length === CARD_SIZE_PRESETS.length);
  for (const [index, preset] of CARD_SIZE_PRESETS.entries()) {
    const card = document.cards[index];
    check(card.kind === 'membership' && card.name === `Synthetic FS ${index + 1}`
      && card.memberNumber === ` 0000${index + 1} Ab ` && card.payload === ` 0000${index + 1} Ab `
      && card.sizePresetId === preset.id && card.widthBlocks === preset.ratioWidth && card.heightBlocks === preset.ratioHeight
      && card.orientation === preset.orientation && !Object.hasOwn(card, 'country') && card.expiryMonth === '2029-12'
      && !Object.hasOwn(card, 'brandId') && !Object.hasOwn(card, 'brandQuery') && card.appearance.gradientPresetId === 'ptt'
      && card.appearance.imageAssetId === null);
  }
}

/** Manual, synthetic-only checks. Reuses the Form -> Coordinator -> Repository path from Step 2. */
export async function runCutoverFileChecks(sandbox: Sandbox, session: string, report: (result: DeviceTestResult) => void) {
  confined(sandbox);
  async function step(label: string, action: () => Promise<void>) {
    try { await action(); report({ label, status: 'Passed', detail: 'Synthetic fixtures in the dedicated test directory only.' }); return true; }
    catch (error) { report({ label, status: 'Failed', detail: `Check failed.${safeFailure(error)} Files retained; reinspect before continuing. No automatic retry or card data display.` }); return false; }
  }
  if (!await step('Create dedicated test folders', () => sandbox.create())) return;
  const files = sandbox.files('main');
  if (!await step('Require an empty test wallet before a new run', async () => { check((await files.list()).length === 0); })) return;
  const observed = new Set<string>();
  const tracked = { ...files,
    async writeExclusive(name: string, text: string) { await files.writeExclusive(name, text); observed.add('write'); },
    async read(name: string) { const text = await files.read(name); observed.add(name.endsWith('.pending') ? 'pending-read' : 'committed-read'); return text; },
    async promoteExclusive(pending: string, committed: string) { await files.promoteExclusive(pending, committed); observed.add('move'); },
  };
  const runtime = createDevAddCardRuntime({ files: tracked });
  if (!await step('Resolve empty DEV wallet without writing a snapshot', async () => {
    completed(await runtime.initialize()); check((await files.list()).length === 0);
  })) return;
  if (!await step('Validate seven sizes and add to Draft using automatic placement', async () => {
    for (const [index, preset] of CARD_SIZE_PRESETS.entries()) {
      const result = runtime.add(runtime.beginSubmission(), { ...emptyCardForm(), name: `Synthetic FS ${index + 1}`,
        memberNumber: ` 0000${index + 1} Ab `, payload: ` 0000${index + 1} CODE `, payloadEdited: true, orientation: preset.orientation },
      { ...emptyCardPresentation(), sizePresetId: preset.id, expiryMonth: '2029-12', brandQuery: 'Synthetic brand' });
      check(result.ok);
    }
    const bundle = runtime.getSnapshot().session; check(bundle && bundle.saved.cards.length === 0);
    fixtureFields(validateWalletDocument(bundle.draft)); check((await files.list()).length === 0);
  })) return;
  if (!await step('Coordinator Save, duplicate admission, pending/move/final readback', async () => {
    const saving = runtime.save(); check(!(await runtime.save()).ok); completed(await saving);
    check(['write', 'pending-read', 'move', 'committed-read'].every(event => observed.has(event)));
    const bundle = runtime.getSnapshot().session;
    check(bundle && bundle.revision === 1 && same(bundle.saved, bundle.draft)); fixtureFields(validateWalletDocument(bundle.saved));
  })) return;
  if (!await step('Second revision preserves cards and previous committed bytes', async () => {
    const firstName = (await files.list()).find(name => WALLET_COMMIT_PATTERN.test(name)); check(firstName);
    const original = await files.read(firstName), bundle = runtime.getSnapshot().session; check(bundle);
    check(runtime.move(bundle.draft.cards[0].id, { col: 0, row: 50 }));
    completed(await runtime.save()); check(await files.read(firstName) === original);
    check(runtime.getSnapshot().state.revision === 2); check((await runtime.reload()).ok);
    const saved = runtime.getSnapshot().session?.saved; check(saved);
    fixtureFields(validateWalletDocument(saved));
  })) return;
  if (!await step('Fresh Runtime Owner reads exact saved snapshot without a new write', async () => {
    const expected = runtime.getSnapshot().session?.saved; check(expected);
    const before = await files.list(), fresh = createDevAddCardRuntime({ files });
    check((await fresh.initialize()).ok); check(same(fresh.getSnapshot().session?.saved, expected));
    check(same(await files.list(), before)); check(!(await fresh.save()).ok);
    await sandbox.writeRestartMarker(JSON.stringify({ test: 'cutover-persistence-v1', session, expected }));
  })) return;
  report({ label: 'After closing Expo Go', status: 'Not Verified', detail: 'Fully close Expo Go, reopen this route, then press Verify After Restart before Run Test.' });
  report({ label: 'Crash / power-loss durability', status: 'Not Verified', detail: 'Readback and JS/runtime restart do not prove native crash safety or fsync durability.' });
}

/** Does not create folders, write a marker, save, import, clean up, or mutate production data. */
export async function verifyCutoverRestart(sandbox: Sandbox, session: string): Promise<DeviceTestResult> {
  confined(sandbox);
  const label = 'Restart / saved FileSystem readback';
  try {
    const proof = JSON.parse(await sandbox.readRestartMarker());
    check(proof?.test === 'cutover-persistence-v1' && typeof proof.session === 'string');
    const expected = validateWalletDocument(proof.expected); fixtureFields(expected); check(expected.revision === 2);
    const runtime = createDevAddCardRuntime({ files: sandbox.files('main') });
    check((await runtime.initialize()).ok); check(same(runtime.getSnapshot().session?.saved, expected));
    check((await runtime.reload()).ok);
    return proof.session === session
      ? { label, status: 'Not Verified', detail: 'Files read back correctly, but the harness session is unchanged. Close Expo Go and reopen first.' }
      : { label: 'Different harness session FileSystem readback', status: 'Passed', detail: 'Exact IDs, raw strings, dimensions, coordinates, metadata and revision matched saved files. Confirm full Expo Go closure manually; Fast Refresh/session changes alone do not prove native process restart.' };
  } catch {
    return { label, status: 'Failed', detail: 'Saved test files or verification marker failed validation. No files changed; no retry or fallback.' };
  }
}

/** Recovery inspection is read-only; never promotes pending or selects an old revision. */
export async function inspectCutoverFiles(sandbox: Sandbox): Promise<DeviceTestResult> {
  confined(sandbox);
  try {
    const files = sandbox.files('main');
    const repo = createWalletRepository(files, { token: () => { throw Error('inspection_is_read_only'); } });
    const inventory = await repo.inspect(), latest = await repo.load();
    return { label: 'Read-only reinspection', status: 'Passed',
      detail: `Revision ${latest.document?.revision ?? 0}; pending ${inventory.pendingFiles.length}. No save, retry, deletion, promotion or recovery was performed.` };
  } catch { return { label: 'Read-only reinspection', status: 'Failed', detail: 'Unreadable/corrupt test storage. Preserve files; no fallback or automatic recovery.' }; }
}
