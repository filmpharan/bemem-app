import type { WalletFiles } from './wallet-repository';
import { cloneHistory, emptyHistory, HistoryError, validateHistoryDocument, type HistoryDocument } from './card-history';

export const HISTORY_COMMIT = /^history-(\d{16})\.json$/;
export const HISTORY_PENDING = /^history-\d{16}\.[a-zA-Z0-9-]{1,80}\.pending$/;
// Same-directory instances share this JS-process gate; not an OS/multi-process lock.
const active = new Set<WalletFiles['scope']>(), uncertain = new Map<WalletFiles['scope'], object>();
const nameFor = (revision: number) => `history-${String(revision).padStart(16, '0')}.json`;
export function createHistoryRepository(files: WalletFiles, options: { token: () => string; now: () => string; verifyImages: (doc: HistoryDocument) => void | Promise<void> }) {
  async function read() {
    const names = await files.list();
    if (names.some(name => !HISTORY_COMMIT.test(name) && !HISTORY_PENDING.test(name))) throw new HistoryError('blocked', 'Unrecognized history file. Review storage before saving.');
    const pending = names.filter(name => HISTORY_PENDING.test(name)), latest = names.filter(name => HISTORY_COMMIT.test(name)).sort().at(-1);
    let document = emptyHistory(options.now());
    if (latest) {
      const revision = Number(HISTORY_COMMIT.exec(latest)![1]);
      if (!Number.isSafeInteger(revision) || revision < 1) throw new HistoryError('blocked', 'Invalid history revision.');
      try { const parsed: unknown = JSON.parse(await files.read(latest)); validateHistoryDocument(parsed); document = parsed; }
      catch (error) { throw new HistoryError('blocked', error instanceof HistoryError ? error.message : 'The latest history snapshot is unreadable. No fallback was used.'); }
      if (document.revision !== revision) throw new HistoryError('blocked', 'History revision mismatch.');
    }
    return { document, pending };
  }
  async function load() {
    const observed = uncertain.get(files.scope);
    try {
      const result = await read();
      if (result.pending.length) throw new HistoryError('pending', 'A pending history transaction requires review. Nothing was retried.');
      if (observed && uncertain.get(files.scope) === observed) uncertain.delete(files.scope);
      return cloneHistory(result.document);
    } catch (error) { if (error instanceof HistoryError) throw error; throw new HistoryError('failed', 'History could not be read. No data was changed.'); }
  }
  async function expected(revision: number, own?: string) {
    const result = await read();
    if (result.pending.some(name => name !== own) || own && !result.pending.includes(own)) throw new HistoryError('pending', 'A pending history transaction requires review.');
    if (result.document.revision !== revision) throw new HistoryError('revision_conflict', 'History changed. Close this form and reload before making another change.');
  }
  return { load, isBusy: () => active.has(files.scope), async save(doc: HistoryDocument, expectedRevision: number, authorize: () => boolean) {
    if (active.has(files.scope)) throw new HistoryError('busy', 'Another history save is in progress.');
    if (uncertain.has(files.scope)) throw new HistoryError('commit_uncertain', 'The previous save needs explicit readback. Reload history before continuing.');
    active.add(files.scope); let began = false, promoting = false;
    try {
      validateHistoryDocument(doc);
      if (doc.revision !== expectedRevision || !Number.isSafeInteger(expectedRevision + 1)) throw new HistoryError('revision_conflict', 'History revision changed.');
      if (!authorize()) throw new HistoryError('blocked', 'This history editing session is no longer active.');
      await expected(expectedRevision);
      await options.verifyImages(doc);
      if (!authorize()) throw new HistoryError('blocked', 'The wallet session changed. No history was saved.');
      const written = cloneHistory({ ...doc, revision: expectedRevision + 1, savedAt: options.now() });
      validateHistoryDocument(written);
      const token = options.token(); if (!/^[a-zA-Z0-9-]{1,80}$/.test(token)) throw new HistoryError('invalid', 'Invalid transaction identifier.');
      const target = nameFor(written.revision), pending = target.replace('.json', `.${token}.pending`), raw = JSON.stringify(written);
      began = true; await files.writeExclusive(pending, raw);
      const pendingRaw = await files.read(pending); validateHistoryDocument(JSON.parse(pendingRaw));
      if (pendingRaw !== raw) throw new HistoryError('failed', 'History readback did not match. The pending snapshot was preserved.');
      await expected(expectedRevision, pending);
      await options.verifyImages(written);
      if (!authorize()) throw new HistoryError('blocked', 'The wallet session changed. The pending snapshot needs review.');
      promoting = true; await files.promoteExclusive(pending, target);
      const committedRaw = await files.read(target); validateHistoryDocument(JSON.parse(committedRaw));
      if (committedRaw !== raw) throw new Error('readback');
      await options.verifyImages(written);
      return cloneHistory(written); // Commit + exact readback + image integrity confirmed.
    } catch (error) {
      if (began) uncertain.set(files.scope, {});
      if (promoting) throw new HistoryError('commit_uncertain', 'History commit could not be confirmed. Do not retry. Close the form and explicitly reload history.');
      if (error instanceof HistoryError) throw error;
      throw new HistoryError('failed', began ? 'History was not confirmed. Pending evidence was preserved. Reload before continuing.' : 'History could not be saved. Existing data was preserved.');
    } finally { active.delete(files.scope); }
  } };
}
