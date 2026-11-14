import { Directory, File, Paths } from 'expo-file-system';
import { uuid } from 'expo';
import { canvasStorage } from './canvas-storage';
import { COMMIT_PATTERN } from './canvas-repository';
import { createExpoWalletRepository } from './wallet-storage';
import { createPreparedWalletRuntime } from './wallet-cutover-runtime';
import { createWalletFeatureCommands } from './wallet-feature-commands';
import { preparePhase1Source } from './wallet-cutover-backup';
import { PREVIEW_CARDS, INITIAL_LAYOUT } from '../data/wallet-preview';
import { PRODUCTION_WALLET_V2_APPROVED } from '../constants/wallet-release';
import { WalletCoordinatorFailure } from './wallet-coordinator';
import { createDeviceHistoryDeletion } from './card-history-delete-native';

const V1_DIRECTORY = PREVIEW_CARDS.length ? 'bemem-phase1-canvas' : 'bemem-phase1-empty-canvas';
const BACKUP_DIRECTORY = 'bemem-pre-cutover-backup';

/** Lazy, read-only source reader. No source move/write/delete capability. */
export async function readDevicePhase1Source() {
  const folder = Paths.document.list().find(entry => entry.name === V1_DIRECTORY);
  if (!(folder instanceof Directory)) throw new Error('v1_source_unavailable');
  const entries = folder.list(), filenames = entries.map(entry => entry.name);
  const filename = filenames.filter(name => COMMIT_PATTERN.test(name)).sort().at(-1);
  if (!filename) throw new Error('v1_source_unavailable');
  return { filename, raw: await new File(folder, filename).text(), pendingCount: filenames.filter(name => name.endsWith('.pending')).length };
}

/** One App Root instance. No backup/import/write is performed at construction/startup. */
export function createDeviceWalletRuntime() {
  // Keep displayed admission and all privileged ports on the same session policy.
  // Fast Refresh may preserve the Provider's previous runtime; changing approval
  // requires a full reload, never replacing the live owner or discarding its Draft.
  const cutoverApproved = PRODUCTION_WALLET_V2_APPROVED;
  const repository = createExpoWalletRepository();
  const backupFile = (id: string) => {
    if (!/^[a-zA-Z0-9][a-zA-Z0-9-]{0,79}$/.test(id)) throw Error('invalid_backup_id');
    return new File(new Directory(Paths.document, BACKUP_DIRECTORY), `${id}.json`);
  };
  const owner = createPreparedWalletRuntime({ v1: canvasStorage, v2: repository, demoCards: PREVIEW_CARDS,
    readSource: readDevicePhase1Source,
    initialV1: cutoverApproved ? undefined : { schemaVersion: 2, dataset: 'bemem-wallet', revision: 0,
      savedAt: new Date().toISOString(), cards: PREVIEW_CARDS.map(card => ({ kind: 'demo', id: card.id, name: card.name,
        orientation: card.orientation, colors: [...card.colors] })),
      canvas: { columns: 12, layout: INITIAL_LAYOUT } },
    authorizeImport: () => cutoverApproved,
    backups: {
      async writeExclusive(id, text) {
        if (!cutoverApproved) throw Error('production_cutover_not_approved');
        new Directory(Paths.document, BACKUP_DIRECTORY).create({ idempotent: true, overwrite: false });
        const file = backupFile(id); file.create({ overwrite: false }); await file.write(text);
      },
      read: id => backupFile(id).text(),
    }, nextBackupId: () => `source-${uuid.v4()}`,
    beforeInstall: async session => {
      if (session.source === 'v2' && !cutoverApproved) throw new WalletCoordinatorFailure('blocked', 'wallet_v2_activation_not_approved');
    },
  });
  const historyDeletion = createDeviceHistoryDeletion(owner);
  return { ...owner, features: createWalletFeatureCommands(owner, historyDeletion.policy), historyDeletion, cutoverApproved,
    async reviewMigration() {
      const state = owner.getSnapshot();
      if (!state.state.editsAllowed || state.state.dirty || state.state.source !== 'v1' || !state.state.revision) {
        throw new WalletCoordinatorFailure('blocked', state.state.dirty ? 'draft_unresolved' : state.state.saving ? 'save_in_progress' : 'review_not_ready');
      }
      const inventory = await repository.inspect();
      if (inventory.pendingFiles.length) throw new WalletCoordinatorFailure('pending', 'pending_requires_review');
      if (inventory.revisions.length) throw new WalletCoordinatorFailure('blocked', 'v2_already_exists');
      if (inventory.requiresReinspection) throw new WalletCoordinatorFailure('commit_uncertain', 'reinspection_required');
      const document = preparePhase1Source(await readDevicePhase1Source(), PREVIEW_CARDS);
      if (JSON.stringify(document) !== JSON.stringify(state.session?.saved)) throw new WalletCoordinatorFailure('revision_conflict', 'source_changed');
      return { generation: state.state.generation, document };
    },
    async requestCutover(generation: number, document: Parameters<typeof owner.commands.cutover>[1]) {
      if (!cutoverApproved) return { ok: false as const, code: 'production_cutover_not_approved' };
      return owner.commands.cutover(generation, document);
    },
  };
}
