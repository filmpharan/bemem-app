import { Directory, File, Paths } from 'expo-file-system';
import { Platform, uuid } from 'expo';
import { createWalletRepository, WALLET_COMMIT_PATTERN, WALLET_PENDING_PATTERN, type WalletFiles } from './wallet-repository';
import { WalletRepositoryError } from './wallet-repository';
import { deviceArtworkStore } from './card-artwork-store';

export const WALLET_V2_DIRECTORY = 'bemem-wallet-v2';

/** Lazy adapter: construction/import performs NO filesystem access or migration. */
export function createExpoWalletFiles(): WalletFiles {
  function documents() {
    if (Platform.OS !== 'android' && Platform.OS !== 'ios') throw new Error('Native wallet storage required');
    return Paths.document;
  }
  function directory() { return new Directory(documents(), WALLET_V2_DIRECTORY); }
  function file(name: string) {
    if (!WALLET_COMMIT_PATTERN.test(name) && !WALLET_PENDING_PATTERN.test(name)) throw new Error('Invalid wallet filename');
    return new File(directory(), name);
  }
  return {
    scope: WALLET_V2_DIRECTORY,
    async list() {
      // Listing the parent distinguishes an absent folder from an inaccessible one.
      const folder = documents().list().find(entry => entry.name === WALLET_V2_DIRECTORY);
      if (!folder) return [];
      if (!(folder instanceof Directory)) throw new Error('Wallet path is not a directory');
      return folder.list().map(entry => entry.name);
    },
    async read(name) { return file(name).text(); },
    async writeExclusive(name, text) {
      if (!WALLET_PENDING_PATTERN.test(name)) throw new Error('Only pending writes are allowed');
      directory().create({ idempotent: true, overwrite: false });
      const pending = file(name);
      pending.create({ overwrite: false });
      await pending.write(text);
    },
    async promoteExclusive(pending, committed) {
      if (!WALLET_PENDING_PATTERN.test(pending) || !WALLET_COMMIT_PATTERN.test(committed)) throw new Error('Invalid promotion');
      await file(pending).move(file(committed), { overwrite: false });
    },
  };
}

/** Not called or imported by app runtime in Step 2A. */
export function createExpoWalletRepository() {
  const repository = createWalletRepository(createExpoWalletFiles(), { token: () => uuid.v4() });
  return { ...repository, async save(...args: Parameters<typeof repository.save>) {
    try { deviceArtworkStore.verifyWallet(args[0]); }
    catch { throw new WalletRepositoryError('invalid_snapshot', 'artwork_unavailable'); }
    const written = await repository.save(...args);
    try { deviceArtworkStore.verifyWallet(written); }
    catch { throw new WalletRepositoryError('commit_uncertain'); }
    return written;
  } };
}
