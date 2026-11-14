import type { CanvasDocument, CanvasLayout, PreviewCard } from '../types/wallet-ui';
import type { WalletDocument } from '../types/wallet-document';
import { migratePhase1Wallet } from './wallet-migration';
import { validateWalletDocument, WalletValidationError } from './wallet-validation';
import { WalletRepositoryError, type createWalletRepository } from './wallet-repository';
import { WalletCoordinatorFailure, type WalletInspection, type WalletFailureKind } from './wallet-coordinator';

type V2 = Pick<ReturnType<typeof createWalletRepository>, 'load' | 'inspect' | 'save'>;
export type StorageAdapterResult<T> = { ok: true; value: T } | {
  ok: false; kind: WalletFailureKind; code: string; validationCode?: string;
};
type Ports = {
  v1: { load: () => Promise<CanvasDocument | null>; save: (layout: CanvasLayout, expected: number) => Promise<CanvasDocument> };
  v2: V2; demoCards: PreviewCard[]; now?: () => string;
};
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
function failure(error: unknown, attempted: boolean): Exclude<StorageAdapterResult<never>, { ok: true }> {
  if (error instanceof WalletValidationError) return { ok: false, kind: attempted ? 'commit_uncertain' : 'blocked', code: attempted ? 'committed_result_invalid' : error.code };
  if (error instanceof WalletRepositoryError) {
    const kind = error.code === 'revision_conflict' ? 'revision_conflict' : error.code === 'pending_requires_review' ? 'pending'
      : ['commit_uncertain', 'reinspection_required'].includes(error.code) ? 'commit_uncertain'
      : ['pending_write_failed', 'pending_verification_failed', 'save_in_progress'].includes(error.code) ? 'failed' : 'blocked';
    return { ok: false, kind, code: error.code, validationCode: error.validationCode };
  }
  // The unchanged v1 repository has untyped errors; recognize only its exact fixed conflict message.
  if (error instanceof Error && error.message === 'Saved Canvas changed; reopen the app') return { ok: false, kind: 'revision_conflict', code: 'revision_conflict' };
  return { ok: false, kind: attempted ? 'commit_uncertain' : 'blocked', code: attempted ? 'unclassified_write_outcome' : 'storage_unreadable' };
}
/** Shared typed mapping for a future composition-root import capability; no I/O. */
export { failure as mapWalletStorageFailure };

/** Privileged composition-root adapters ONLY. Construction does no I/O; no native imports. */
export function createWalletStorageAdapters(ports: Ports) {
  const demos = ports.demoCards.map(c => ({ ...c, colors: [...c.colors] as [string, string] }));
  function normalize(doc: CanvasDocument) { return migratePhase1Wallet(JSON.stringify(doc), demos); }
  async function readV1(): Promise<StorageAdapterResult<WalletDocument | null>> {
    try { const doc = await ports.v1.load(); return { ok: true, value: doc ? normalize(doc) : null }; }
    catch (error) { return failure(error, false); }
  }
  async function readV2() {
    try { return { ok: true as const, value: await ports.v2.load() }; }
    catch (error) { return failure(error, false); }
  }
  async function v2Admission(expected: number): Promise<StorageAdapterResult<null>> {
    if (!Number.isSafeInteger(expected) || expected < 0) return { ok: false, kind: 'blocked', code: 'invalid_revision' };
    const inventory = await ports.v2.inspect();
    if (inventory.requiresReinspection) return { ok: false, kind: 'commit_uncertain', code: 'reinspection_required' };
    if (inventory.pendingFiles.length) return { ok: false, kind: 'pending', code: 'pending_requires_review' };
    const latest = await ports.v2.load();
    if (latest.pendingFiles.length) return { ok: false, kind: 'pending', code: 'pending_requires_review' };
    if ((latest.document?.revision ?? 0) !== expected) return { ok: false, kind: 'revision_conflict', code: 'revision_conflict' };
    return { ok: true, value: null };
  }
  async function saveV1(input: WalletDocument, expected: number,admit:()=>boolean=()=>true): Promise<StorageAdapterResult<WalletDocument>> {
    let attempted = false;
    try {
      const snapshot = validateWalletDocument(input);
      if (snapshot.revision !== expected) return { ok: false, kind: 'revision_conflict', code: 'revision_conflict' };
      const fixedCards = demos.map(c => ({ kind: 'demo', ...c }));
      if (!same(snapshot.cards, fixedCards) || snapshot.canvas.decorations !== undefined || snapshot.canvas.folders !== undefined) return { ok: false, kind: 'blocked', code: 'v1_card_changes_not_supported' };
      // If v2/pending exists, even a privileged v1 adapter must refuse a new write.
      const v2 = await v2Admission(0);
      if (!v2.ok) return v2;
      const latest = await ports.v1.load();
      if ((latest?.revision ?? 0) !== expected) return { ok: false, kind: 'revision_conflict', code: 'revision_conflict' };
      if(!admit())return {ok:false,kind:'blocked',code:'canvas_access_denied'};
      attempted = true;
      const written = await ports.v1.save(snapshot.canvas.layout, expected);
      const verified = await ports.v1.load();
      if (!verified || !same(written, verified) || verified.revision !== expected + 1
        || !same(verified.layout, snapshot.canvas.layout)) return { ok: false, kind: 'commit_uncertain', code: 'v1_readback_mismatch' };
      return { ok: true, value: normalize(verified) };
    } catch (error) { return failure(error, attempted); }
  }
  async function saveV2(input: WalletDocument, expected: number,admit:()=>boolean=()=>true): Promise<StorageAdapterResult<WalletDocument>> {
    let attempted = false;
    try {
      const snapshot = validateWalletDocument(input);
      if (snapshot.revision !== expected) return { ok: false, kind: 'revision_conflict', code: 'revision_conflict' };
      const admitted = await v2Admission(expected);
      if (!admitted.ok) return admitted;
      attempted = true;
      return { ok: true, value: validateWalletDocument(await ports.v2.save(snapshot, expected,admit)) };
    } catch (error) { return failure(error, attempted); }
  }
  async function inspect(): Promise<WalletInspection> {
    const v2 = await readV2();
    if (!v2.ok) return { source: 'invalid_v2', pendingCount: 0,
      error: { kind: v2.kind, code: v2.code, validationCode: v2.validationCode } };
    const pendingCount = v2.value.pendingFiles.length;
    if (v2.value.document) {
      try { return { source: 'v2', wallet: validateWalletDocument(v2.value.document), pendingCount }; }
      catch (error) { return { source: 'invalid_v2', pendingCount,
        error: { kind: 'blocked', code: 'invalid_snapshot', validationCode: error instanceof WalletValidationError ? error.code : undefined } }; }
    }
    const v1 = await readV1();
    if (!v1.ok) return { source: 'invalid_v1', pendingCount,
      error: { kind: v1.kind, code: v1.code, validationCode: v1.validationCode } };
    if (v1.value) return { source: 'v1', wallet: v1.value, pendingCount };
    return { source: 'empty', pendingCount, wallet: validateWalletDocument({ schemaVersion: 2, dataset: 'bemem-wallet', revision: 0,
      savedAt: (ports.now ?? (() => new Date().toISOString()))(), cards: [], canvas: { columns: 12, layout: {} } }) };
  }
  async function unwrap(result: Promise<StorageAdapterResult<WalletDocument>>) {
    const value = await result;
    if (value.ok) return value.value;
    throw new WalletCoordinatorFailure(value.kind, value.code, value.validationCode);
  }
  return { readV1, readV2, saveV1, saveV2, inspect,
    coordinatorWriters: { v1: { save: (doc: WalletDocument, revision: number,admit?:()=>boolean) => unwrap(saveV1(doc, revision,admit)) },
      v2: { save: (doc: WalletDocument, revision: number,admit?:()=>boolean) => unwrap(saveV2(doc, revision,admit)) } } };
}
