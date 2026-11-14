/* global __DEV__ */
import { Directory, File, Paths } from 'expo-file-system';
import { Platform } from 'expo';
import { WALLET_COMMIT_PATTERN, WALLET_PENDING_PATTERN, type WalletFiles } from './wallet-repository';

export const TEST_DIRECTORY = 'bemem-wallet-v2-test';
export const CUTOVER_TEST_DIRECTORY = 'bemem-wallet-cutover-test';
export const TEST_CASES = ['main', 'pending', 'corrupt'] as const;
type TestCase = typeof TEST_CASES[number];
export function assertWalletTestDev() {
  if (!__DEV__) throw new Error('development_only');
}

/** All native operations are confined to this fixed sandbox; no configurable root. */
export function createWalletTestSandbox(namespace: typeof TEST_DIRECTORY | typeof CUTOVER_TEST_DIRECTORY = TEST_DIRECTORY) {
  function root() {
    assertWalletTestDev();
    if (namespace !== TEST_DIRECTORY && namespace !== CUTOVER_TEST_DIRECTORY) throw new Error('sandbox_namespace_rejected');
    if (Platform.OS !== 'android' && Platform.OS !== 'ios') throw new Error('native_device_required');
    return new Directory(Paths.document, namespace);
  }
  function folder(testCase: TestCase) {
    if (!TEST_CASES.includes(testCase)) throw new Error('invalid_test_case');
    const parent = root();
    const dir = new Directory(parent, testCase);
    if (!dir.uri.startsWith(parent.uri.replace(/\/$/, '') + '/')) throw new Error('sandbox_path_rejected');
    return dir;
  }
  function checkedFile(testCase: TestCase, name: string) {
    if (!WALLET_COMMIT_PATTERN.test(name) && !WALLET_PENDING_PATTERN.test(name)) throw new Error('sandbox_filename_rejected');
    return new File(folder(testCase), name);
  }
  function marker() { return new File(root(), 'run-info.json'); }
  return {
    path() { return root().uri; },
    async create() {
      root().create({ idempotent: true, overwrite: false });
      for (const testCase of TEST_CASES) folder(testCase).create({ idempotent: true, overwrite: false });
    },
    files(testCase: TestCase): WalletFiles {
      // Construction checks DEV/path only; it does not create, read or list files.
      const scope = folder(testCase).uri;
      return {
        scope,
        async list() { return folder(testCase).list().map(entry => entry.name); },
        async read(name) { return checkedFile(testCase, name).text(); },
        async writeExclusive(name, text) {
          if (!WALLET_PENDING_PATTERN.test(name)) throw new Error('pending_required');
          const file = checkedFile(testCase, name);
          file.create({ overwrite: false }); await file.write(text);
        },
        async promoteExclusive(pending, committed) {
          if (!WALLET_PENDING_PATTERN.test(pending) || !WALLET_COMMIT_PATTERN.test(committed)) throw new Error('invalid_promotion');
          await checkedFile(testCase, pending).move(checkedFile(testCase, committed), { overwrite: false });
        },
      };
    },
    async writeRestartMarker(text: string) {
      const file = marker(); file.create({ overwrite: true }); await file.write(text);
      if (await file.text() !== text) throw new Error('restart_marker_verification_failed');
    },
    async readRestartMarker() { return marker().text(); },
    async clear() {
      // Preflight EVERY entry before deleting anything. Never recursively delete a computed root.
      const entries = root().list();
      const files: File[] = [], directories: Directory[] = [];
      for (const entry of entries) {
        if (entry instanceof File && entry.name === 'run-info.json' && entry.uri === marker().uri) { files.push(entry); continue; }
        if (!(entry instanceof Directory) || !TEST_CASES.includes(entry.name as TestCase)) throw new Error('unknown_sandbox_entry_cleanup_blocked');
        if (entry.uri !== folder(entry.name as TestCase).uri) throw new Error('sandbox_path_rejected');
        directories.push(entry);
        for (const child of entry.list()) {
          if (!(child instanceof File) || (!WALLET_COMMIT_PATTERN.test(child.name) && !WALLET_PENDING_PATTERN.test(child.name))) throw new Error('unknown_sandbox_entry_cleanup_blocked');
          if (child.uri !== new File(entry, child.name).uri) throw new Error('sandbox_path_rejected');
          files.push(child);
        }
      }
      for (const file of files) file.delete();
      for (const directory of directories) {
        if (directory.list().length) throw new Error('sandbox_changed_cleanup_blocked');
        directory.delete();
      }
      // Keep the empty sandbox root: no recursive root deletion.
    },
  };
}
