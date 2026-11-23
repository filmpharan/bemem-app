import { Directory, File, Paths } from 'expo-file-system';
import { uuid } from 'expo';
import { Image } from 'expo-image';
import { createArtworkStore } from './card-artwork-store';
import { ARTWORK_ID } from './card-artwork';
import { createHistoryRepository, HISTORY_COMMIT, HISTORY_PENDING } from './card-history-repository';
import { HISTORY_DELETE_DIRECTORY, recoveryFiles } from './history-recovery-files-native';
import { createKeepRecovery, validateKeepRecovery, type KeepRecoveryIntent } from './keep-recovery';
import {createKeepMediaFiles} from './keep-media-files';
import type { HistoryDocument, Receipt } from './card-history';

export const HISTORY_DIRECTORY = 'bemem-card-history';
export const RECEIPT_DIRECTORY = 'bemem-receipts';
const historyFolder = () => new Directory(Paths.document, HISTORY_DIRECTORY);
export function receiptUri(id: string) {
  if (!ARTWORK_ID.test(id)) throw Error('Invalid receipt reference.');
  return new File(new Directory(Paths.document, RECEIPT_DIRECTORY), id).uri;
}
function historyFile(name: string) {
  if (!HISTORY_COMMIT.test(name) && !HISTORY_PENDING.test(name)) throw Error('Invalid history filename.');
  return new File(historyFolder(), name);
}
async function copyReceipt(source:string,id:string,overwrite=false,admit=()=>true){
    // Sniff file signatures before retaining; decoding failures also surface in the image viewer.
    const bytes = await new File(source).bytes();
    const png = bytes.length >= 24 && [137, 80, 78, 71, 13, 10, 26, 10].every((n, i) => bytes[i] === n);
    const jpg = bytes.length >= 4 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
    const webp = bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP';
    if (!(id.endsWith('.png') && png || id.endsWith('.jpg') && jpg || id.endsWith('.webp') && webp)) throw Error('The receipt is not a supported image.');
    const decoded = await Image.loadAsync({ uri: source }, { maxWidth: 256, maxHeight: 256 });
    try { if (!(decoded.width > 0 && decoded.height > 0)) throw Error('The receipt image cannot be decoded.'); }
    finally { decoded.release(); }
    new Directory(Paths.document, RECEIPT_DIRECTORY).create({ idempotent: true, overwrite: false });
    if(!admit())throw Error('The photo context changed before copying.');
    await new File(source).copy(new File(receiptUri(id)), { overwrite });
}
const receiptStore = createArtworkStore({info:uri=>new File(uri).info({md5:true}),uri:receiptUri,nextId:()=>uuid.v4(),copyExclusive:(source,id)=>copyReceipt(source,id)});
export const deviceReceiptStore = receiptStore;
export const deviceHistoryRepository = createHistoryRepository({
  scope: HISTORY_DIRECTORY,
  async list() {
    const entry = Paths.document.list().find(item => item.name === HISTORY_DIRECTORY);
    if (!entry) return [];
    if (!(entry instanceof Directory)) throw Error('History path is not a directory.');
    return entry.list().map(item => item.name);
  },
  read: name => historyFile(name).text(),
  async writeExclusive(name, raw) {
    if (!HISTORY_PENDING.test(name)) throw Error('Only pending history writes are allowed.');
    historyFolder().create({ idempotent: true, overwrite: false });
    const file = historyFile(name); file.create({ overwrite: false }); await file.write(raw);
  },
  async promoteExclusive(pending, committed) {
    if (!HISTORY_PENDING.test(pending) || !HISTORY_COMMIT.test(committed)) throw Error('Invalid history commit.');
    await historyFile(pending).move(historyFile(committed), { overwrite: false });
  },
}, { token: () => uuid.v4(), now: () => new Date().toISOString(),
  verifyImages(doc) { for (const record of doc.records) for (const receipt of record.receipts) receiptStore.verifyArtwork(receipt); },
});

/** Only the new Keep media path uses exclusive destination ownership and narrow rollback. */
export const keepMediaFiles=createKeepMediaFiles({
 nextId:()=>uuid.v4(),uri:receiptUri,info:uri=>new File(uri).info({md5:true}),
 reserve(id){new Directory(Paths.document,RECEIPT_DIRECTORY).create({idempotent:true,overwrite:false});new File(receiptUri(id)).create({overwrite:false});},
 copy:(source,id,admit)=>copyReceipt(source,id,true,admit),
 async remove(id){await new File(receiptUri(id)).delete();},
 async referenced(id){
  if(deviceHistoryRepository.isBusy())throw Error('History is saving.');
  const doc=await deviceHistoryRepository.load();
  const recovery=Paths.document.list().find(item=>item.name===HISTORY_DELETE_DIRECTORY);
  if(recovery&&(!(recovery instanceof Directory)||recovery.list().length))throw Error('Recovery evidence needs review before photo cleanup.');
  if(deviceHistoryRepository.isBusy())throw Error('History changed during cleanup review.');
  return doc.records.some(record=>record.receipts.some(image=>image.assetId===id));
 },
});

/** Lazy native notification access: no scans, scheduling or recovery on Home renders. */
export const keepRecovery = createKeepRecovery({
  repository: deviceHistoryRepository,
  intents: recoveryFiles<KeepRecoveryIntent>(true, validateKeepRecovery),
  nextId: () => uuid.v4(),
  notifications: {
    async scheduled() { const {keepNotifications}=await import('./keep-notifications-native'); return keepNotifications.scheduled(); },
    async cancel(id) { const {keepNotifications}=await import('./keep-notifications-native'); await keepNotifications.cancelId(id); },
  },
});
export const prepareRetiredReminders = keepRecovery.prepareDeletion;

/** Narrow, post-readback cleanup: only references removed from the committed latest snapshot. */
export async function removeRetiredReceipts(before: HistoryDocument, after: HistoryDocument) {
  const current = await deviceHistoryRepository.load();
  if (JSON.stringify(current) !== JSON.stringify(after)) throw Error('History changed before receipt cleanup.');
  const retainedIds=new Set(after.records.map(record=>record.id));
  for(const record of before.records)if(!retainedIds.has(record.id)&&record.keep?.reminder){
    const {keepNotifications}=await import('./keep-notifications-native');await keepNotifications.cancel(record);
  }
  await keepRecovery.finishDeletion(before, after);
  const kept = new Set(after.records.flatMap(record => record.receipts.map(image => image.assetId)));
  const removed = new Map<string, Receipt>();
  for (const record of before.records) for (const image of record.receipts) if (!kept.has(image.assetId)) removed.set(image.assetId, image);
  for (const image of removed.values()) {
    // Exact document path + validated immutable filename. No recursive delete or artwork directory access.
    const file = new File(receiptUri(image.assetId));
    if (!file.exists) continue;
    receiptStore.verifyArtwork(image);
    await file.delete();
  }
  // This new history store retains its latest verified snapshot, not deleted private
  // records in older JSON copies. Wallet snapshots/backups and pending evidence are untouched.
  const latest = await deviceHistoryRepository.load();
  if (JSON.stringify(latest) !== JSON.stringify(after)) throw Error('History changed before obsolete snapshot cleanup.');
  for (const entry of historyFolder().list()) {
    const match = HISTORY_COMMIT.exec(entry.name);
    if (entry instanceof File && match && Number(match[1]) < after.revision) await entry.delete();
  }
}

/** Only newly selected, never-submitted session files; pending/uncertain history blocks cleanup. */
export async function discardKeepPhotos(images:readonly Receipt[]){
 if(!images.length)return;
 if(deviceHistoryRepository.isBusy())throw Error('History is busy. Photo cleanup deferred.');
 const current=await deviceHistoryRepository.load(),used=new Set(current.records.flatMap(r=>r.receipts.map(i=>i.assetId)));
 for(const image of images){if(used.has(image.assetId))continue;receiptStore.verifyArtwork(image);const file=new File(receiptUri(image.assetId));if(file.exists)await file.delete();}
}
