/* global __DEV__ */
import { canvasStorage } from './canvas-storage';
import { PREVIEW_CARDS } from '../data/wallet-preview';
import { createExpoWalletFiles } from './wallet-storage';
import { createWalletRepository } from './wallet-repository';
import { createMigrationConsent } from './wallet-migration-consent';

/** No writer is handed to the device UI. Import cannot be enabled by a route parameter. */
export function createDeviceMigrationPreview() {
  if (!__DEV__) throw new Error('development_only');
  const files = createExpoWalletFiles();
  const forbidden = async (): Promise<never> => { throw new Error('device_import_locked_pending_approval'); };
  const repo = createWalletRepository({ scope: files.scope, list: files.list, read: files.read,
    writeExclusive: forbidden, promoteExclusive: forbidden }, { token: () => { throw new Error('device_import_locked_pending_approval'); } });
  return createMigrationConsent({ repo: { inspect: repo.inspect, load: repo.load, prepareMigration: repo.prepareMigration },
    readV1: () => canvasStorage.load(), demoCards: PREVIEW_CARDS });
}
