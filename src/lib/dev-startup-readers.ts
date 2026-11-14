/* global __DEV__ */
import { canvasStorage } from './canvas-storage';
import { createExpoWalletFiles } from './wallet-storage';
import { createWalletRepository } from './wallet-repository';
import { PREVIEW_CARDS } from '../data/wallet-preview';
import { diagnoseWalletStartup } from './wallet-startup-diagnostics';

/** Explicit DEV action only. The repository gets read capabilities and forbidden writer stubs. */
export async function inspectDeviceWalletStartup() {
  if (!__DEV__) throw new Error('development_only');
  const files = createExpoWalletFiles();
  const forbidden = async (): Promise<never> => { throw new Error('diagnostics_read_only'); };
  const repo = createWalletRepository({ scope: files.scope, list: files.list, read: files.read,
    writeExclusive: forbidden, promoteExclusive: forbidden }, { token: () => { throw new Error('diagnostics_read_only'); } });
  return diagnoseWalletStartup({ v2: { load: repo.load, prepareMigration: repo.prepareMigration },
    readV1: () => canvasStorage.load(), demoCards: PREVIEW_CARDS }, repo.inspect);
}
