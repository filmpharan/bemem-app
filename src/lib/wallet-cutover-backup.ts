import type { PreviewCard } from '../types/wallet-ui';
import type { WalletDocument } from '../types/wallet-document';
import { COMMIT_PATTERN } from './canvas-repository';
import { migratePhase1Wallet } from './wallet-migration';
import { WalletCoordinatorFailure } from './wallet-coordinator';

export type Phase1RawSource = { filename: string; raw: string; pendingCount: number };
export type WalletBackupFiles = {
  /** Caller supplies a distinct, approved private backup boundary. No production adapter is mounted here. */
  writeExclusive: (id: string, bytes: string) => Promise<void>;
  read: (id: string) => Promise<string>;
};
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
function blocked(reason: string): never { throw new WalletCoordinatorFailure('blocked', reason); }

export function preparePhase1Source(source: Phase1RawSource, demoCards: PreviewCard[]) {
  if (!Number.isSafeInteger(source.pendingCount) || source.pendingCount < 0) blocked('invalid_v1_pending_inventory');
  if (source.pendingCount) throw new WalletCoordinatorFailure('pending', 'v1_pending_requires_review');
  const match = COMMIT_PATTERN.exec(source.filename);
  if (!match || typeof source.raw !== 'string') blocked('invalid_v1_source');
  let document: WalletDocument;
  try { document = migratePhase1Wallet(source.raw, demoCards); }
  catch { return blocked('invalid_legacy_document'); }
  if (document.revision !== Number(match[1])) blocked('v1_filename_revision_mismatch');
  return document;
}

/** Exclusive byte-preserving source copy + manifest. Never overwrites or repairs a source/backup. */
export async function backupPhase1Source(source: Phase1RawSource, demoCards: PreviewCard[],
  files: WalletBackupFiles, id: string) {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9-]{0,79}$/.test(id)) blocked('invalid_backup_id');
  const original = { ...source }, manifest: PreviewCard[] = demoCards.map(card => ({ ...card, colors: [...card.colors] }));
  const prepared = preparePhase1Source(original, manifest);
  const serialized = JSON.stringify({ format: 'bemem-phase1-source-copy-1', source: original, demoCards: manifest });
  try {
    await files.writeExclusive(id, serialized);
    const bytes = await files.read(id);
    if (bytes !== serialized) throw Error('backup_bytes_changed');
    const readback = JSON.parse(bytes);
    const verified = preparePhase1Source(readback.source, readback.demoCards);
    if (!same(verified, prepared) || readback.source.raw !== original.raw || !same(readback.demoCards, manifest)) throw Error('backup_invalid');
  } catch { throw new WalletCoordinatorFailure('failed', 'backup_not_verified'); }
  // No source write capability, no cleanup capability and no mutable "backup complete" flag.
  return { id, source: original, demoCards: manifest, prepared };
}
