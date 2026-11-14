import { Directory, File, Paths } from 'expo-file-system';
import { uuid } from 'expo';
import * as Sharing from 'expo-sharing';
import { inspectSharePng } from './card-share-plan';

export const SHARE_CACHE_DIRECTORY = 'bemem-share-exports';
const MAX_BYTES = 32 * 1024 * 1024;
const folder = () => new Directory(Paths.cache, SHARE_CACHE_DIRECTORY);
function ownedPreview(uri: string) {
  const file = new File(uri), base = folder().uri.replace(/\/+$/, '') + '/';
  if (!/^preview-[a-zA-Z0-9-]+\.png$/.test(file.name) || file.uri !== base + file.name) throw Error('Invalid share preview path.');
  return file;
}
function info(file: File) {
  const value = file.info({ md5: true });
  if (!value.exists || !value.size || value.size > MAX_BYTES || !value.md5) throw Error('The export file is unavailable.');
  return value;
}
async function copy(source: File, prefix: 'preview' | 'shared') {
  const original = info(source);
  folder().create({ idempotent: true, overwrite: false });
  const target = new File(folder(), `${prefix}-${uuid.v4()}.png`);
  await source.copy(target, { overwrite: false });
  const copied = info(target);
  if (original.size !== copied.size || original.md5 !== copied.md5) throw Error('The export copy could not be verified.');
  return target;
}
export const cardShareNative = {
  async adoptCapture(uri: string, width: number) {
    if (!/^(file:\/\/|\/)/.test(uri)) throw Error('A local capture file is required.');
    const source = new File(uri); info(source);
    const dimensions = inspectSharePng(await source.bytes(), width);
    const target = await copy(source, 'preview');
    return { uri: target.uri, ...dimensions, md5: info(target).md5! };
  },
  available: Sharing.isAvailableAsync,
  async publish(uri: string, expectedDigest?: string) {
    // Separate retained copy: never delete immediately after chooser completion.
    const preview = ownedPreview(uri);
    if (!expectedDigest || info(preview).md5 !== expectedDigest) throw Error('The reviewed preview has changed.');
    const published = await copy(preview, 'shared');
    if (info(published).md5 !== expectedDigest) throw Error('The shared copy does not match the reviewed preview.');
    return published.uri;
  },
  open: (uri: string) => Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png', dialogTitle: 'Share membership card' }),
  async removePreview(uri: string) { const file = ownedPreview(uri); if (file.exists) await file.delete(); },
};
