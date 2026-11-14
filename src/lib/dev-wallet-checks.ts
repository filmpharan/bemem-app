import type { WalletDocument } from '../types/wallet-document';
import { createWalletRepository, WalletRepositoryError } from './wallet-repository';
import { decodeWalletDocument } from './wallet-validation';
import { assertWalletTestDev, type createWalletTestSandbox } from './dev-wallet-sandbox';

type Sandbox = ReturnType<typeof createWalletTestSandbox>;
export type DeviceTestResult = { label: string; status: 'Passed' | 'Failed' | 'Not Verified'; detail: string };
export function walletTestError(error: unknown) {
  return error instanceof WalletRepositoryError ? `${error.code}${error.validationCode ? ` (${error.validationCode})` : ''}`
    : 'FileSystem or test assertion failed. No wallet contents are displayed.';
}
const fixedTime = '2026-11-07T00:00:00.000Z';
function fixture(revision = 0): WalletDocument {
  return { schemaVersion: 2, dataset: 'bemem-wallet', revision, savedAt: fixedTime,
    cards: [{ kind: 'membership', id: 'synthetic-device-test', name: 'Synthetic Test Card', memberNumber: '000001',
      payload: ' 000001 TEST ', preferredDisplayFormat: 'qr', orientation: 'landscape',
      appearance: { backgroundColor: '#405764', textColor: '#ffffff', imageAssetId: null }, createdAt: fixedTime, updatedAt: fixedTime }],
    canvas: { columns: 12, layout: { 'synthetic-device-test': { col: 0, row: 300 } } } };
}
function check(value: unknown): asserts value { if (!value) throw new Error('test_assertion_failed'); }
function synthetic(doc: WalletDocument) {
  check(doc.cards.length === 1);
  check(JSON.stringify(doc.cards) === JSON.stringify(fixture().cards));
  check(JSON.stringify(doc.canvas) === JSON.stringify(fixture().canvas));
}
const filename = (revision: number) => `wallet-${String(revision).padStart(16, '0')}.json`;

export async function runWalletDeviceChecks(sandbox: Sandbox, token: () => string, session: string, report: (result: DeviceTestResult) => void) {
  assertWalletTestDev();
  async function step(label: string, action: () => Promise<void>) {
    try { await action(); report({ label, status: 'Passed', detail: 'Completed using the device FileSystem sandbox.' }); return true; }
    catch (error) { report({ label, status: 'Failed', detail: walletTestError(error) }); return false; }
  }
  if (!await step('Create isolated test directories', () => sandbox.create())) return;
  const main = sandbox.files('main');
  const observed = new Set<string>();
  const tracked = {
    ...main,
    async writeExclusive(name: string, text: string) { await main.writeExclusive(name, text); observed.add('write'); },
    async read(name: string) {
      const text = await main.read(name); decodeWalletDocument(text);
      observed.add(name.endsWith('.pending') ? 'pending-read' : 'committed-read'); return text;
    },
    async promoteExclusive(pending: string, committed: string) { await main.promoteExclusive(pending, committed); observed.add('move'); },
  };
  const repo = createWalletRepository(tracked, { token });
  let saved: WalletDocument | null = null;
  const mainOK = await step('Pending write, schema readback, move and committed readback', async () => {
    const previous = (await repo.load()).document;
    if (previous) synthetic(previous);
    saved = await repo.save(fixture(previous?.revision ?? 0), previous?.revision ?? 0);
    synthetic(saved);
    check(['write', 'pending-read', 'move', 'committed-read'].every(op => observed.has(op)));
  });
  if (mainOK && saved) {
    const first: WalletDocument = saved;
    await step('Next revision preserves preceding committed snapshot and exact payload', async () => {
      const original = await main.read(filename(first.revision));
      saved = await repo.save(first, first.revision);
      check(saved.revision === first.revision + 1); synthetic(saved);
      check(await main.read(filename(first.revision)) === original);
    });
    await step('Stale expected revision is rejected', async () => {
      try { await repo.save(fixture(), 0); } catch (error) {
        if (error instanceof WalletRepositoryError && error.code === 'revision_conflict') return;
        throw error;
      }
      throw new Error('conflict_not_detected');
    });
    await step('Write restart-verification marker in sandbox', async () => {
      const latest = (await repo.load()).document; check(latest); synthetic(latest);
      await sandbox.writeRestartMarker(JSON.stringify({ schemaVersion: 1, session, revision: latest.revision }));
    });
  }
  await step('Leftover pending file is reported and never auto-committed', async () => {
    const files = sandbox.files('pending');
    const pending = `wallet-0000000000000001.${token()}.pending`;
    await files.writeExclusive(pending, JSON.stringify(fixture(1)));
    const loaded = await createWalletRepository(files, { token }).load();
    check(loaded.document === null && loaded.pendingFiles.includes(pending));
  });
  await step('Corrupt latest snapshot blocks load/save without silent fallback', async () => {
    const files = sandbox.files('corrupt'), corruptRepo = createWalletRepository(files, { token });
    const inventory = await corruptRepo.inspect();
    if (!inventory.revisions.length) await corruptRepo.save(fixture(), 0);
    const revision = ((await corruptRepo.inspect()).revisions.at(-1) ?? 0) + 1;
    const final = filename(revision), pending = final.replace('.json', `.${token()}.pending`);
    await files.writeExclusive(pending, '{synthetic-corrupt-json');
    await files.promoteExclusive(pending, final);
    for (const action of [() => corruptRepo.load(), () => corruptRepo.save(fixture(revision), revision)]) {
      let blocked = false;
      try { await action(); } catch (error) { blocked = error instanceof WalletRepositoryError && error.code === 'invalid_snapshot'; }
      check(blocked);
    }
    check(await files.read(final) === '{synthetic-corrupt-json');
    synthetic(await corruptRepo.readRevisionForRecovery(1));
  });
  report({ label: 'App relaunch readback', status: 'Not Verified', detail: 'Close Expo Go completely, reopen this tool, then press Verify After Restart.' });
  report({ label: 'Protected v1 / real v2 contents unchanged', status: 'Not Verified', detail: 'Protected paths are excluded by fixed sandbox guards. They are not read for before/after checksums.' });
  report({ label: 'Crash / power-loss durability', status: 'Not Verified', detail: 'Not established by Expo Go tests or successful move/readback.' });
}

export async function verifyWalletTestRestart(sandbox: Sandbox, token: () => string, session: string): Promise<DeviceTestResult> {
  assertWalletTestDev();
  const marker = JSON.parse(await sandbox.readRestartMarker());
  check(marker?.schemaVersion === 1 && typeof marker.session === 'string' && Number.isSafeInteger(marker.revision));
  if (marker.session === session) return { label: 'App relaunch readback', status: 'Not Verified', detail: 'Same JS session. Close Expo Go completely and reopen; do not run Run Test again first.' };
  const doc = (await createWalletRepository(sandbox.files('main'), { token }).load()).document;
  check(doc && doc.revision === marker.revision); synthetic(doc);
  return { label: 'Different JS session readback', status: 'Passed', detail: 'Saved snapshot survived a JS session change. This does not independently prove a native process crash or power-loss recovery.' };
}
