import type { CardArtwork } from '../types/membership-card';
import { ARTWORK_ID, MAX_IMAGE_BYTES, MAX_IMAGE_PIXELS } from './card-artwork';

export const HISTORY_CURRENCIES = { THB: 2, USD: 2, EUR: 2, GBP: 2, JPY: 0 } as const;
export type HistoryCurrency = keyof typeof HISTORY_CURRENCIES;
export type Receipt = CardArtwork & { id: string; cropRatio?: number };
export type HistoryRecord = {
  /** Absent on legacy structured entries; never inferred from their contents. */
  entryKind?: 'photo' | 'keep';
  keep?: { kind:'full'|'reminder'|'gallery'|'note'|'camera'; reminder?: { at:string; title:string; state:'pending'|'completed'; notification:{status:'not_scheduled'|'scheduled'|'denied'|'failed';id:string|null} } };
  id: string; cardId: string; type: 'visit' | 'purchase' | 'note'; date: string; time: string;
  description: string; notes: string; money: { minorUnits: string; currency: HistoryCurrency } | null;
  receipts: Receipt[]; createdAt: string; updatedAt: string;
};
export type HistoryDocument = { schemaVersion: 1; dataset: 'bemem-history'; revision: number; savedAt: string; records: HistoryRecord[] };
export const cloneHistory = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
export type HistoryForm = { type: HistoryRecord['type']; date: string; time: string; description: string; notes: string;
  amount: string; currency: HistoryCurrency; receipts: Receipt[] };
export class HistoryError extends Error {
  constructor(public readonly code: 'invalid' | 'blocked' | 'pending' | 'revision_conflict' | 'commit_uncertain' | 'failed' | 'busy', message: string) {
    super(message); this.name = 'HistoryError';
  }
}
const invalid = (message: string): never => { throw new HistoryError('invalid', message); };
const object = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return invalid('Invalid history data.');
  return value as Record<string, unknown>;
};
function keys(value: Record<string, unknown>, allowed: string[]) {
  if (Object.keys(value).some(key => !allowed.includes(key))) invalid('Unsupported history fields.');
}
function text(value: unknown, limit: number): asserts value is string {
  if (typeof value !== 'string' || value.length > limit || [...value].some(character => {
    const code = character.charCodeAt(0); return code < 32 && code !== 9 && code !== 10 && code !== 13;
  })) invalid('Invalid text or text is too long.');
}
export function historyId(value: unknown): asserts value is string {
  text(value, 180); if (!value.length || value.includes('/') || value.includes('\\')) invalid('Invalid record or card identifier.');
}
export function validateHistoryDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) invalid('Date must use YYYY-MM-DD.');
  const year = Number(match![1]), month = Number(match![2]), day = Number(match![3]);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (year < 1900 || year > 9999 || month < 1 || month > 12 || day < 1 || day > days[month - 1]) invalid('Enter a valid calendar date.');
}
export function parseHistoryAmount(value: string, currency: HistoryCurrency): HistoryRecord['money'] {
  if (!Object.hasOwn(HISTORY_CURRENCIES, currency)) return invalid('Choose a supported currency.');
  if (value === '') return null;
  const precision = HISTORY_CURRENCIES[currency];
  if (!new RegExp(`^\\d{1,12}${precision ? `(\\.\\d{1,${precision}})?` : ''}$`).test(value)) invalid(`Enter a non-negative amount with up to ${precision} decimal places. No commas or spaces.`);
  const [whole, fraction = ''] = value.split('.');
  const minorUnits = (whole + fraction.padEnd(precision, '0')).replace(/^0+(?=\d)/, '');
  return { currency, minorUnits };
}
export function amountInput(money: HistoryRecord['money']) {
  if (!money) return '';
  const precision = HISTORY_CURRENCIES[money.currency], padded = money.minorUnits.padStart(precision + 1, '0');
  return precision ? `${padded.slice(0, -precision)}.${padded.slice(-precision)}` : padded;
}
export function validateReceipt(value: unknown): asserts value is Receipt {
  const receipt = object(value); keys(receipt, ['id', 'assetId', 'width', 'height', 'byteLength', 'md5', 'crop', 'cropRatio']); historyId(receipt.id);
  if (typeof receipt.assetId !== 'string' || !ARTWORK_ID.test(receipt.assetId)) invalid('Invalid receipt image reference.');
  for (const field of ['width', 'height', 'byteLength']) if (!Number.isSafeInteger(receipt[field]) || Number(receipt[field]) < 1) invalid('Invalid image dimensions or size.');
  if (Number(receipt.width) * Number(receipt.height) > MAX_IMAGE_PIXELS || Number(receipt.byteLength) > MAX_IMAGE_BYTES
    || typeof receipt.md5 !== 'string' || !/^[a-f0-9]{32}$/i.test(receipt.md5)) invalid('Receipt image is invalid or too large.');
  const crop = object(receipt.crop); keys(crop, ['x', 'y', 'zoom']);
  if (![crop.x, crop.y, crop.zoom].every(n => typeof n === 'number' && Number.isFinite(n))
    || Number(crop.x) < 0 || Number(crop.x) > 1 || Number(crop.y) < 0 || Number(crop.y) > 1 || Number(crop.zoom) < 1 || Number(crop.zoom) > 3) invalid('Invalid receipt crop.');
  if (receipt.cropRatio !== undefined && (typeof receipt.cropRatio !== 'number' || !Number.isFinite(receipt.cropRatio) || receipt.cropRatio < 0.1 || receipt.cropRatio > 10)) invalid('Invalid receipt aspect ratio.');
  if (receipt.cropRatio === undefined && (crop.x !== 0.5 || crop.y !== 0.5 || crop.zoom !== 1)) invalid('A changed crop requires an explicit crop ratio.');
}
function timestamp(value: unknown) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString() !== value) invalid('Invalid timestamp.');
}
export function validateHistoryRecord(value: unknown): asserts value is HistoryRecord {
  const record = object(value); keys(record, ['entryKind', 'id', 'cardId', 'type', 'date', 'time', 'description', 'notes', 'money', 'receipts', 'createdAt', 'updatedAt', 'keep']);
  if (record.entryKind !== undefined && record.entryKind !== 'photo' && record.entryKind !== 'keep') invalid('Unsupported history entry kind.');
  historyId(record.id); historyId(record.cardId);
  if (typeof record.type !== 'string' || !['visit', 'purchase', 'note'].includes(record.type)) invalid('Choose Visit, Purchase or Note.');
  text(record.date, 10); validateHistoryDate(record.date); text(record.time, 5);
  if (record.time !== '' && !/^([01]\d|2[0-3]):[0-5]\d$/.test(record.time)) invalid('Time must use HH:mm (24-hour).');
  text(record.description, 240); text(record.notes, 100000);
  if (record.money !== null) {
    const money = object(record.money); keys(money, ['minorUnits', 'currency']);
    if (typeof money.currency !== 'string' || !Object.hasOwn(HISTORY_CURRENCIES, money.currency)
      || typeof money.minorUnits !== 'string' || !/^(0|[1-9]\d{0,13})$/.test(money.minorUnits)) invalid('Invalid monetary value.');
  }
  if (!Array.isArray(record.receipts) || record.receipts.length > 20) invalid('A record supports up to 20 receipts.');
  const ids = new Set<string>();
  for (const receipt of record.receipts as unknown[]) { validateReceipt(receipt); if (ids.has(receipt.id)) invalid('Duplicate receipt identifier.'); ids.add(receipt.id); }
  timestamp(record.createdAt); timestamp(record.updatedAt);
  if (record.entryKind === 'photo' && ((record.receipts as unknown[]).length < 1 || (record.receipts as unknown[]).length > 4 || record.type !== 'note' || record.description !== '' || record.money !== null
    || record.date !== String(record.createdAt).slice(0, 10) || record.time !== String(record.createdAt).slice(11, 16))) invalid('A photo entry requires 1–4 images and its automatic creation timestamp.');
  if(record.entryKind==='keep'){
    const keep=object(record.keep);keys(keep,['kind','reminder']);
    if(!['full','reminder','gallery','note','camera'].includes(String(keep.kind)))invalid('Unsupported Keep type.');
    if(record.type!=='note'||record.money!==null||record.description!==''||record.date!==String(record.createdAt).slice(0,10)||record.time!==String(record.createdAt).slice(11,16)||(record.receipts as unknown[]).length>4)invalid('Invalid Keep content or automatic timestamp.');
    if(keep.reminder!==undefined){
      const reminder=object(keep.reminder);keys(reminder,['at','title','state','notification']);timestamp(reminder.at);text(reminder.title,240);
      if(!(reminder.title as string).trim()||!['pending','completed'].includes(String(reminder.state)))invalid('Invalid reminder.');
      const notification=object(reminder.notification);keys(notification,['status','id']);
      if(!['not_scheduled','scheduled','denied','failed'].includes(String(notification.status))||notification.id!==null&&notification.id!==`bemem-keep-${record.id}`||notification.status==='scheduled'&&notification.id===null)invalid('Invalid notification status.');
    }
    if(!(record.notes as string).trim()&&!(record.receipts as unknown[]).length&&!keep.reminder)invalid('Add a photo, note or reminder.');
    if(keep.kind==='reminder'&&!keep.reminder||keep.kind==='note'&&!(record.notes as string).trim()||['camera','gallery'].includes(String(keep.kind))&&!(record.receipts as unknown[]).length)invalid('Keep is missing its required content.');
  }else if(record.keep!==undefined)invalid('Legacy entries cannot contain Keep metadata.');
  if (String(record.updatedAt) < String(record.createdAt)) invalid('Updated time precedes creation.');
}
export function validateHistoryDocument(value: unknown): asserts value is HistoryDocument {
  const doc = object(value); keys(doc, ['schemaVersion', 'dataset', 'revision', 'savedAt', 'records']);
  if (doc.schemaVersion !== 1 || doc.dataset !== 'bemem-history') throw new HistoryError('blocked', 'Unsupported history schema. No data was changed.');
  if (!Number.isSafeInteger(doc.revision) || Number(doc.revision) < 0) invalid('Invalid history revision.');
  timestamp(doc.savedAt); if (!Array.isArray(doc.records)) invalid('Invalid history records.');
  const ids = new Set<string>();
  for (const record of doc.records as unknown[]) { validateHistoryRecord(record); if (ids.has(record.id)) invalid('Duplicate history identifier.'); ids.add(record.id); }
}
export function emptyHistory(now: string): HistoryDocument { return { schemaVersion: 1, dataset: 'bemem-history', revision: 0, savedAt: now, records: [] }; }
export function newHistoryForm(now = new Date()): HistoryForm {
  const local = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return { type: 'visit', date: local, time: '', description: '', notes: '', amount: '', currency: 'THB', receipts: [] };
}
export function recordForm(record: HistoryRecord): HistoryForm {
  return { type: record.type, date: record.date, time: record.time, description: record.description, notes: record.notes,
    amount: amountInput(record.money), currency: record.money?.currency ?? 'THB', receipts: cloneHistory(record.receipts) };
}
export function prepareHistoryRecord(form: HistoryForm, cardId: string, id: string, now: string, original?: HistoryRecord): HistoryRecord {
  const record: HistoryRecord = { id, cardId, type: form.type, date: form.date, time: form.time, description: form.description,
    notes: form.notes, money: parseHistoryAmount(form.amount, form.currency), receipts: cloneHistory(form.receipts), createdAt: original?.createdAt ?? now, updatedAt: now };
  validateHistoryRecord(record); return record;
}
export function cardHistory(doc: HistoryDocument, cardId: string) {
  // Persisted append order breaks equal timestamp ties: a newly appended entry is first.
  return doc.records.map((record, index) => ({ record, index })).filter(item => item.record.cardId === cardId)
    .sort((a, b) => b.record.createdAt.localeCompare(a.record.createdAt) || b.index - a.index || a.record.id.localeCompare(b.record.id))
    .map(item => item.record);
}
export type PhotoEntryForm = { images: Receipt[]; note: string };
export function preparePhotoEntry(form: PhotoEntryForm, cardId: string, id: string, now: string): HistoryRecord {
  const record: HistoryRecord = { entryKind: 'photo', id, cardId, type: 'note', date: now.slice(0, 10), time: now.slice(11, 16),
    description: '', money: null, notes: form.note, receipts: Array.isArray(form.images) ? cloneHistory(form.images) : [], createdAt: now, updatedAt: now };
  validateHistoryRecord(record); return record;
}
export function localHistoryTimestamp(record: Pick<HistoryRecord, 'createdAt'>) {
  return new Date(record.createdAt).toLocaleString();
}
