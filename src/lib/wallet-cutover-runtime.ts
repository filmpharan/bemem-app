import type { PreviewCard, CanvasDocument, CanvasLayout } from '../types/wallet-ui';
import type { WalletDocument } from '../types/wallet-document';
import type { createWalletRepository } from './wallet-repository';
import { createWalletStorageAdapters, mapWalletStorageFailure } from './wallet-storage-adapters';
import { createWalletOwnerScope } from './wallet-runtime-owner';
import { resolveWalletStartup } from './wallet-startup';
import { WalletCoordinatorFailure, type WalletInspection, type RuntimeWalletSession } from './wallet-coordinator';
import { backupPhase1Source, preparePhase1Source, type Phase1RawSource, type WalletBackupFiles } from './wallet-cutover-backup';
import { validateProductionWallet } from './wallet-production-policy';
import type { MembershipAccess } from './canvas-pages';

type Ports = {
  v1: { load: () => Promise<CanvasDocument | null>; save: (layout: CanvasLayout, expected: number) => Promise<CanvasDocument> };
  v2: ReturnType<typeof createWalletRepository>;
  readSource: () => Promise<Phase1RawSource>;
  demoCards: PreviewCard[];
  backups: WalletBackupFiles;
  nextBackupId: () => string;
  beforeInstall?: (session: RuntimeWalletSession) => Promise<void>;
  initialV1?: WalletDocument;
  authorizeImport?: () => boolean;
  /** Trusted composition-root provider, never persisted or controlled by public UI. */
  entitlement?:()=>MembershipAccess;
};
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
function conflict(): never { throw new WalletCoordinatorFailure('revision_conflict', 'v1_source_changed'); }

/** UNMOUNTED composition for isolated verification and later approval.
 * Does not import native storage, construct production adapters, or activate at construction.
 * Caller supplies privileged ports once; UI receives only this owner's guarded commands.
 */
export function createPreparedWalletRuntime(ports: Ports) {
  const demoCards: PreviewCard[] = ports.demoCards.map(card => ({ ...card, colors: [...card.colors] }));
  const emptySavedAt = new Date().toISOString();
  const adapters = createWalletStorageAdapters({ v1: ports.v1, v2: ports.v2, demoCards });
  async function inspect(): Promise<WalletInspection> {
    const resolved = await resolveWalletStartup({ v2: ports.v2, readV1: ports.v1.load, demoCards, now: () => emptySavedAt });
    if (resolved.status === 'blocked') return { source: resolved.source === 'v1' ? 'invalid_v1' : 'invalid_v2', pendingCount: 0,
      error: { kind: 'blocked', code: resolved.error.code, validationCode: resolved.error.validationCode } };
    if (resolved.source === 'empty' && ports.initialV1) return { source: 'v1', initialV1: true,
      wallet: validateProductionWallet(ports.initialV1), pendingCount: resolved.pendingFiles.length };
    try {
      validateProductionWallet(resolved.wallet);
      if (resolved.source === 'v1-memory') {
        const raw = await ports.readSource(), checked = preparePhase1Source(raw, demoCards);
        if (!same(checked, resolved.wallet)) conflict();
      }
    } catch (error) {
      return { source: resolved.source === 'v1-memory' ? 'invalid_v1' : 'invalid_v2', pendingCount: resolved.pendingFiles.length,
        error: error instanceof WalletCoordinatorFailure ? { kind: error.kind, code: error.reason }
          : { kind: 'blocked', code: 'wallet_compatibility_blocked' } };
    }
    return { source: resolved.source === 'v1-memory' ? 'v1' : resolved.source === 'v2' ? 'v2' : 'empty',
      wallet: resolved.wallet, pendingCount: resolved.pendingFiles.length };
  }
  async function guardedImport(reviewed: WalletDocument) {
    if (ports.authorizeImport && !ports.authorizeImport()) throw new WalletCoordinatorFailure('blocked', 'production_cutover_not_approved');
    const expected = validateProductionWallet(reviewed);
    let attempted = false;
    try {
      const source = await ports.readSource(), prepared = preparePhase1Source(source, demoCards);
      if (!same(prepared, expected)) conflict();
      // Called ONLY inside the existing coordinator's synchronous switching barrier,
      // after it has drained previous saves and resolved dirty-draft admission.
      const copy = await backupPhase1Source(source, demoCards, ports.backups, ports.nextBackupId());
      const fresh = await ports.readSource(), revalidated = preparePhase1Source(fresh, demoCards);
      if (!same(fresh, copy.source) || !same(revalidated, expected)) conflict();
      const inventory = await ports.v2.inspect();
      if (inventory.requiresReinspection) throw new WalletCoordinatorFailure('commit_uncertain', 'reinspection_required');
      if (inventory.pendingFiles.length) throw new WalletCoordinatorFailure('pending', 'pending_requires_review');
      if (inventory.revisions.length) throw new WalletCoordinatorFailure('blocked', 'v2_already_exists');
      attempted = true;
      const committed = await ports.v2.importPhase1(fresh.raw, demoCards);
      const readback = await ports.v2.load();
      if (readback.pendingFiles.length || !same(readback.document, committed) || !same(committed, expected)) {
        throw new WalletCoordinatorFailure('commit_uncertain', 'import_readback_mismatch');
      }
      return validateProductionWallet(committed);
    } catch (error) {
      if (error instanceof WalletCoordinatorFailure) throw error;
      const mapped = mapWalletStorageFailure(error, attempted);
      throw new WalletCoordinatorFailure(mapped.kind, mapped.code, mapped.validationCode);
    }
  }
  const scope = createWalletOwnerScope(() => ({ ...adapters, inspect, coordinatorWriters: {
    v1: { save: async (doc, expected,admit) => {
      const valid = validateProductionWallet(doc);
      if (expected === 0) { if (await ports.v1.load() !== null) conflict(); }
      else if (preparePhase1Source(await ports.readSource(), demoCards).revision !== expected) conflict();
      const inventory = await ports.v2.inspect();
      if (inventory.revisions.length) throw new WalletCoordinatorFailure('blocked', 'v2_already_exists');
      return adapters.coordinatorWriters.v1.save(valid, expected,admit);
    } },
    v2: { save: (doc, expected,admit) => adapters.coordinatorWriters.v2.save(validateProductionWallet(doc), expected,admit) },
  } }), { importV1: guardedImport, beforeInstall: async session => {
    validateProductionWallet(session.saved); validateProductionWallet(session.draft);
    if (ports.beforeInstall) await ports.beforeInstall(session);
    // A composition callback cannot expand bounds between policy validation and install.
    validateProductionWallet(session.saved); validateProductionWallet(session.draft);
  } },ports.entitlement);
  const owner = scope.getOwner();
  // No independent wallet state: projections, revision, generation and admission
  // all remain owned by the existing coordinator/bundle store.
  return { getSnapshot: owner.getSnapshot, subscribe: owner.subscribe,pages:owner.pages, commands: {
    ...owner.commands,
    updateDraft(generation: number, document: WalletDocument) {
      try {
        const valid = validateProductionWallet(document), current = owner.getSnapshot();
        if (current.state.source === 'v1' && current.session && (!same(valid.cards, current.session.saved.cards) || valid.canvas.decorations !== undefined||valid.canvas.pages!==undefined)) {
          return { ok: false as const, code: 'v1_card_changes_not_supported', kind: 'blocked' as const };
        }
        return owner.commands.updateDraft(generation, valid);
      }
      catch (error) { return { ok: false as const, code: error instanceof WalletCoordinatorFailure ? error.reason : 'invalid_draft', kind: 'blocked' as const }; }
    },
  } };
}
