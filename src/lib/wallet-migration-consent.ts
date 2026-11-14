import type { CanvasDocument, PreviewCard } from '../types/wallet-ui';
import { MAX_ROWS } from './canvas-layout';
import { WalletRepositoryError, type createWalletRepository } from './wallet-repository';

type Repository = ReturnType<typeof createWalletRepository>;
type Readers = { repo: Pick<Repository, 'inspect' | 'load' | 'prepareMigration'>;
  readV1: () => Promise<CanvasDocument | null>; demoCards: PreviewCard[] };
export type MigrationPreview = {
  status: 'ready' | 'blocked'; source: 'Wallet v1' | 'Unavailable';
  cardCount: number | null; revision: number | null; canvas: 'compatible' | 'blocked' | 'not-verified';
  pendingCount: number | null; reason: string | null;
};
export type MigrationOutcome = { status: 'cancelled' | 'blocked' | 'failed' | 'commit-uncertain' | 'imported'; reason: string;
  metadata?: { confirmedAt: string; verifiedAt: string; snapshotRevision: number } };
const issue = (reason: string, pendingCount: number | null = null): MigrationPreview => ({ status: 'blocked', source: 'Unavailable',
  cardCount: null, revision: null, canvas: 'not-verified', pendingCount, reason });

/** Writer is OPTIONAL and supplied only to mock tests in Step 2C.3. */
export function createMigrationConsent(readers: Readers, writer?: Pick<Repository, 'importPhase1'>, now = () => new Date().toISOString()) {
  let reference: string | null = null;
  let consent = false, busy = false, attempted = false;
  async function inspect() {
    const inventory = await readers.repo.inspect();
    if (inventory.pendingFiles.length) return { preview: issue('pending_requires_review', inventory.pendingFiles.length) };
    const existing = (await readers.repo.load()).document;
    if (existing) return { preview: issue('v2_already_exists', 0) };
    const source = await readers.readV1();
    if (!source) return { preview: issue('v1_not_available', 0) };
    const text = JSON.stringify(source);
    const wallet = readers.repo.prepareMigration(text, readers.demoCards);
    const compatible = wallet.cards.every(card => wallet.canvas.layout[card.id].row + (card.orientation === 'portrait' ? 6 : 4) <= MAX_ROWS);
    return { text, wallet, preview: { status: compatible ? 'ready' : 'blocked', source: 'Wallet v1',
      cardCount: wallet.cards.length, revision: wallet.revision, canvas: compatible ? 'compatible' : 'blocked',
      pendingCount: 0, reason: compatible ? null : 'canvas_incompatible' } satisfies MigrationPreview };
  }
  function safeReason(error: unknown) {
    return error instanceof WalletRepositoryError ? error.code : 'migration_inspection_failed';
  }
  return {
    async preview(): Promise<MigrationPreview> {
      if (busy) return issue('operation_in_progress');
      busy = true;
      reference = null; consent = false;
      try {
        const fresh = await inspect();
        if (fresh.preview.status === 'ready') reference = fresh.text ?? null;
        return fresh.preview;
      } catch (error) { return issue(safeReason(error)); }
      finally { busy = false; }
    },
    requestConsent(): boolean { consent = reference !== null && !busy && !attempted; return consent; },
    cancel(): MigrationOutcome { consent = false; reference = null; return { status: 'cancelled', reason: 'No files were written.' }; },
    async confirm(): Promise<MigrationOutcome> {
      if (busy) return { status: 'blocked', reason: 'operation_in_progress' };
      if (attempted) return { status: 'blocked', reason: 'new_review_required_after_attempt' };
      if (!consent || !reference) return { status: 'blocked', reason: 'explicit_consent_required' };
      if (!writer) return { status: 'blocked', reason: 'device_import_locked_pending_approval' };
      busy = true; consent = false;
      const confirmedAt = now();
      let importReturned = false;
      try {
        const fresh = await inspect();
        if (fresh.preview.status !== 'ready' || !fresh.text || !fresh.wallet) return { status: 'blocked', reason: fresh.preview.reason ?? 'not_ready' };
        if (fresh.text !== reference) { reference = null; return { status: 'blocked', reason: 'v1_changed_refresh_preview' }; }
        // Last read before handing control to importPhase1 (which checks v2 revision again).
        if ((await readers.repo.inspect()).pendingFiles.length) return { status: 'blocked', reason: 'pending_requires_review' };
        attempted = true;
        const imported = await writer.importPhase1(fresh.text, readers.demoCards);
        importReturned = true;
        const readback = await readers.repo.load();
        if (!readback.document || JSON.stringify(imported) !== JSON.stringify(fresh.wallet)
          || JSON.stringify(readback.document) !== JSON.stringify(fresh.wallet)) {
          return { status: 'commit-uncertain', reason: 'post_import_verification_failed' };
        }
        return { status: 'imported', reason: 'Snapshot readback verified. Wallet v1 retained.',
          metadata: { confirmedAt, verifiedAt: now(), snapshotRevision: imported.revision } };
      } catch (error) {
        const knownBeforeCommit = error instanceof WalletRepositoryError && ['pending_write_failed', 'pending_verification_failed',
          'revision_conflict', 'save_in_progress', 'invalid_snapshot', 'snapshot_unreadable', 'storage_unreadable'].includes(error.code);
        return { status: attempted && (importReturned || !knownBeforeCommit) ? 'commit-uncertain' : 'failed', reason: safeReason(error) };
      } finally { busy = false; }
    },
  };
}
