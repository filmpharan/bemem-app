import type { WalletDocument } from '../types/wallet-document';
import type { PreviewCard } from '../types/wallet-ui';
import { migratePhase1Wallet } from './wallet-migration';
import { decodeWalletDocument, validateWalletDocument, WalletValidationError } from './wallet-validation';

export const WALLET_COMMIT_PATTERN = /^wallet-(\d{16})\.json$/;
export const WALLET_PENDING_PATTERN = /^wallet-\d{16}\.[a-zA-Z0-9-]{1,80}\.pending$/;
export type WalletFiles = {
  /** Every adapter for the same folder MUST use the same scope within a JS process. */
  readonly scope: string | object;
  list: () => Promise<string[]>;
  read: (name: string) => Promise<string>;
  writeExclusive: (name: string, text: string) => Promise<void>;
  promoteExclusive: (pending: string, committed: string) => Promise<void>;
};
export class WalletRepositoryError extends Error {
  constructor(public readonly code: string, public readonly validationCode?: string) {
    super(code); this.name = 'WalletRepositoryError';
  }
}
// Serializes repository instances sharing a folder. NOT an OS/multi-process lock.
const busy = new Set<WalletFiles['scope']>();
// Process-local uncertainty latch. Only a successful explicit load with no pending
// evidence acknowledges reinspection; internal transaction reads never clear it.
const uncertain = new Map<WalletFiles['scope'], object>();
function revisionName(revision: number) {
  if (!Number.isSafeInteger(revision) || revision < 1) throw new WalletRepositoryError('invalid_revision');
  return `wallet-${String(revision).padStart(16, '0')}.json`;
}
function invalidSnapshot(error: unknown): never {
  throw new WalletRepositoryError('invalid_snapshot', error instanceof WalletValidationError ? error.code : undefined);
}

export function createWalletRepository(files: WalletFiles, options: { token: () => string; now?: () => string }) {
  async function inspect() {
    let names: string[];
    try { names = await files.list(); } catch { throw new WalletRepositoryError('storage_unreadable'); }
    const revisions: number[] = [], pendingFiles: string[] = [];
    for (const name of names) {
      if (WALLET_PENDING_PATTERN.test(name)) { pendingFiles.push(name); continue; }
      const match = WALLET_COMMIT_PATTERN.exec(name);
      if (match) {
        const revision = Number(match[1]);
        if (revisionName(revision) !== name) throw new WalletRepositoryError('invalid_snapshot_name');
        revisions.push(revision);
      } else if (name.startsWith('wallet-')) {
        // A damaged committed name must not masquerade as an empty wallet.
        throw new WalletRepositoryError('invalid_snapshot_name');
      }
    }
    revisions.sort((a, b) => a - b);
    pendingFiles.sort();
    return { revisions, pendingFiles, requiresReinspection: uncertain.has(files.scope) };
  }
  async function readRevision(revision: number): Promise<WalletDocument> {
    const name = revisionName(revision);
    let text: string;
    try { text = await files.read(name); } catch { throw new WalletRepositoryError('snapshot_unreadable'); }
    let doc: WalletDocument;
    try { doc = decodeWalletDocument(text); } catch (error) { invalidSnapshot(error); }
    if (doc.revision !== revision) throw new WalletRepositoryError('revision_mismatch');
    return doc;
  }
  async function readLatest() {
    const inventory = await inspect();
    const latest = inventory.revisions.at(-1);
    return { document: latest === undefined ? null : await readRevision(latest), pendingFiles: inventory.pendingFiles };
  }
  async function load() {
    const observedUncertainty = uncertain.get(files.scope);
    const current = await readLatest();
    // A read started before a later failure cannot accidentally acknowledge it.
    if (observedUncertainty && uncertain.get(files.scope) === observedUncertainty && !current.pendingFiles.length) uncertain.delete(files.scope);
    return current;
  }
  async function checkExpected(expected: number, ownPending?: string) {
    const current = await readLatest(); // Internal reads do NOT acknowledge an uncertain outcome.
    if (current.pendingFiles.some(name => name !== ownPending)) throw new WalletRepositoryError('pending_requires_review');
    if (ownPending && !current.pendingFiles.includes(ownPending)) throw new WalletRepositoryError('pending_missing');
    if ((current.document?.revision ?? 0) !== expected) throw new WalletRepositoryError('revision_conflict');
  }
  async function commit(snapshot: WalletDocument, expected: number,admit:()=>boolean=()=>true) {
    if(!admit())throw new WalletRepositoryError('canvas_access_denied');
    const serialized = JSON.stringify(snapshot, null, 2);
    const finalName = revisionName(snapshot.revision);
    const token = options.token();
    if (!/^[a-zA-Z0-9-]{1,80}$/.test(token)) throw new WalletRepositoryError('invalid_transaction_token');
    const pendingName = finalName.replace('.json', `.${token}.pending`);
    try { await files.writeExclusive(pendingName, serialized); }
    catch { throw new WalletRepositoryError('pending_write_failed'); }
    try {
      const readback = await files.read(pendingName);
      const verified = decodeWalletDocument(readback);
      if (readback !== serialized || verified.revision !== snapshot.revision) throw new Error('Mismatch');
    } catch { throw new WalletRepositoryError('pending_verification_failed'); }
    await checkExpected(expected, pendingName);
    if(!admit())throw new WalletRepositoryError('canvas_access_denied');
    // From this point onward errors are ambiguous: native move may have completed.
    // Keep all evidence. Do not delete, roll back, or auto-retry a commit attempt.
    try {
      await files.promoteExclusive(pendingName, finalName);
      const finalText = await files.read(finalName);
      const verified = decodeWalletDocument(finalText);
      if (finalText !== serialized || verified.revision !== snapshot.revision) throw new Error('Mismatch');
      // Application-level success boundary: destination exists and passed readback.
      return verified;
    } catch {
      uncertain.set(files.scope, {});
      throw new WalletRepositoryError('commit_uncertain');
    }
  }
  async function locked<T>(operation: () => Promise<T>): Promise<T> {
    if (busy.has(files.scope)) throw new WalletRepositoryError('save_in_progress');
    busy.add(files.scope);
    try {
      if (uncertain.has(files.scope)) throw new WalletRepositoryError('reinspection_required');
      return await operation();
    } finally { busy.delete(files.scope); }
  }
  return {
    load,
    inspect,
    /** Read-only recovery preview. Does not select, restore, promote or delete anything. */
    readRevisionForRecovery: readRevision,
    prepareMigration: migratePhase1Wallet,
    save(input: WalletDocument, expectedRevision: number,admit:()=>boolean=()=>true) {
      return locked(async () => {
        if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0) throw new WalletRepositoryError('invalid_revision');
        const snapshot = validateWalletDocument(input); // Clone BEFORE the first await.
        if (snapshot.revision !== expectedRevision) throw new WalletRepositoryError('revision_conflict');
        if (expectedRevision === Number.MAX_SAFE_INTEGER) throw new WalletRepositoryError('revision_exhausted');
        await checkExpected(expectedRevision);
        const next = validateWalletDocument({ ...snapshot, revision: expectedRevision + 1,
          savedAt: (options.now ?? (() => new Date().toISOString()))() });
        return commit(next, expectedRevision,admit);
      });
    },
    /** Explicit future import only. Preserves v1 revision/time; refuses a nonempty v2 wallet. */
    importPhase1(text: string, demoCards: PreviewCard[]) {
      return locked(async () => {
        const migrated = migratePhase1Wallet(text, demoCards);
        await checkExpected(0);
        return commit(migrated, 0);
      });
    },
  };
}
