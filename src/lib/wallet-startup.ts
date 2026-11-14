import type { CanvasDocument, PreviewCard } from '../types/wallet-ui';
import type { WalletDocument } from '../types/wallet-document';
import { WalletRepositoryError, type createWalletRepository } from './wallet-repository';
import { validateWalletDocument, WalletValidationError } from './wallet-validation';

type Repository = ReturnType<typeof createWalletRepository>;
export type WalletStartupReaders = {
  v2: Pick<Repository, 'load' | 'prepareMigration'>;
  /** Supply the existing v1 repository's load method; resolver never opens files itself. */
  readV1: () => Promise<CanvasDocument | null>;
  demoCards: PreviewCard[];
  now?: () => string;
};
export type WalletStartupResult =
  | { status: 'ready'; source: 'v2' | 'v1-memory' | 'empty'; wallet: WalletDocument;
      pendingFiles: string[]; requiresPendingReview: boolean;
      expectedV2Revision: number; nextPersistence: 'save' | 'explicit-phase1-import' }
  | { status: 'blocked'; source: 'v2' | 'v1' | 'empty'; writeBlocked: true;
      error: { code: string; validationCode?: string } };

function blocked(source: 'v2' | 'v1' | 'empty', error: unknown): WalletStartupResult {
  // No raw exception messages, payloads, names or paths escape into UI/logs.
  return { status: 'blocked', source, writeBlocked: true, error: {
    code: error instanceof WalletRepositoryError ? error.code : 'startup_resolution_failed',
    validationCode: error instanceof WalletValidationError ? error.code
      : error instanceof WalletRepositoryError ? error.validationCode : undefined,
  } };
}

/** Read-only orchestration. Not imported by app runtime; no save/import/write capability. */
export async function resolveWalletStartup(readers: WalletStartupReaders): Promise<WalletStartupResult> {
  let pendingFiles: string[];
  try {
    const loaded = await readers.v2.load();
    pendingFiles = [...loaded.pendingFiles];
    if (loaded.document !== null) {
      const wallet = validateWalletDocument(loaded.document);
      return { status: 'ready', source: 'v2', wallet, pendingFiles,
        requiresPendingReview: pendingFiles.length > 0, expectedV2Revision: wallet.revision, nextPersistence: 'save' };
    }
  } catch (error) { return blocked('v2', error); }
  let legacy: CanvasDocument | null;
  try {
    legacy = await readers.readV1();
    if (legacy !== null) {
      // prepareMigration calls the original v1 decoder again; no automatic import.
      const wallet = validateWalletDocument(readers.v2.prepareMigration(JSON.stringify(legacy), readers.demoCards));
      return { status: 'ready', source: 'v1-memory', wallet, pendingFiles,
        requiresPendingReview: pendingFiles.length > 0, expectedV2Revision: 0, nextPersistence: 'explicit-phase1-import' };
    }
  } catch (error) { return blocked('v1', error); }
  try {
    const wallet = validateWalletDocument({ schemaVersion: 2, dataset: 'bemem-wallet', revision: 0,
      savedAt: (readers.now ?? (() => new Date().toISOString()))(), cards: [], canvas: { columns: 12, layout: {} } });
    return { status: 'ready', source: 'empty', wallet, pendingFiles,
      requiresPendingReview: pendingFiles.length > 0, expectedV2Revision: 0, nextPersistence: 'save' };
  } catch (error) { return blocked('empty', error); }
}
