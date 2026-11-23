import {prepareKeep,type KeepForm} from './keeps';
import { cloneHistory, HistoryError, preparePhotoEntry, type HistoryDocument, type PhotoEntryForm } from './card-history';
import type { createHistoryRepository } from './card-history-repository';

export type HistoryAdmission = { generation: number; revision: number; canManage: boolean; cardExists: boolean; context: 'home' | 'create' };
/** Capability scoped to a card/context. No Wallet write capability, no global form state. */
export function createHistoryCommands(repository: ReturnType<typeof createHistoryRepository>, ports: {
  cardId: string; admission: () => HistoryAdmission; now: () => string; nextId: () => string;
  beforeCommit?: (before: HistoryDocument, after: HistoryDocument) => Promise<void>;
  afterCommit?: (before: HistoryDocument, after: HistoryDocument) => Promise<void>;
}) {
  let document: HistoryDocument | null = null, generation = -1, walletRevision = -1, busy = false, closed = false, needsReview = false;
  let context: HistoryAdmission['context'] | null = null;
  const admission = (operation: 'add' | 'delete' | 'keep-delete') => {
    const current = ports.admission();
    return current.context === context && (operation !== 'delete' ? current.context === 'home' : current.context === 'create') && !closed && current.cardExists && current.canManage && current.generation === generation && current.revision === walletRevision;
  };
  async function mutate(operation: 'add' | 'delete' | 'keep-delete', change: (doc: HistoryDocument) => void) {
    if (busy) throw new HistoryError('busy', 'A history operation is in progress.');
    if (needsReview || !document || !admission(operation)) throw new HistoryError('blocked', 'This editing session ended. Close the form and reload history.');
    busy = true; const before = cloneHistory(document), next = cloneHistory(document);
    try {
      change(next);
      await ports.beforeCommit?.(before, next);
      const saved = await repository.save(next, before.revision, () => admission(operation));
      document = cloneHistory(saved);
      // Cleanup is never part of commit success and cannot delete original card artwork.
      let cleanupPending = false;
      try { await ports.afterCommit?.(before, saved); } catch { cleanupPending = true; }
      return { document: cloneHistory(saved), cleanupPending };
    } catch (error) { needsReview = true; throw error; }
    finally { busy = false; }
  }
  return {
    async load() {
      if (busy || closed) throw new HistoryError('busy', 'History is busy or closed.');
      busy = true;
      try {
        const current = ports.admission(), loaded = await repository.load(), latest = ports.admission();
        if (!current.cardExists || !latest.cardExists || latest.generation !== current.generation || latest.revision !== current.revision || latest.context !== current.context)
          throw new HistoryError('blocked', 'The wallet changed while history was loading. Reopen the card.');
        if (closed) throw new HistoryError('blocked', 'History is closed.');
        document = cloneHistory(loaded); generation = latest.generation; walletRevision = latest.revision; context = latest.context; needsReview = false;
        return cloneHistory(document);
      } finally { busy = false; }
    },
    savePhoto(form: PhotoEntryForm) {
      let recordId = '';
      return mutate('add', doc => {
        const record = preparePhotoEntry(form, ports.cardId, ports.nextId(), ports.now());
        recordId = record.id; doc.records.push(record);
      }).then(result => ({ ...result, recordId }));
    },
    saveKeep(form:KeepForm){let recordId='';return mutate('add',doc=>{const record=prepareKeep(form,ports.cardId,ports.nextId(),ports.now());recordId=record.id;doc.records.push(record);}).then(result=>({...result,recordId}));},
    updateReminder(id:string,change:{notification?:NonNullable<NonNullable<import('./card-history').HistoryRecord['keep']>['reminder']>['notification'];state?:'pending'|'completed'}){
      return mutate('add',doc=>{const record=doc.records.find(r=>r.id===id&&r.cardId===ports.cardId);if(!record?.keep?.reminder)throw new HistoryError('blocked','Reminder changed. Reload My Keeps.');Object.assign(record.keep.reminder,change);record.updatedAt=ports.now();});
    },
    deleteKeep(id:string){return mutate('keep-delete',doc=>{if(!doc.records.some(r=>r.id===id&&r.cardId===ports.cardId))throw new HistoryError('blocked','Keep changed. Reload My Keeps.');doc.records=doc.records.filter(r=>r.id!==id);});},
    deleteSelected(ids: readonly string[]) {
      return mutate('delete', doc => {
        const selected = new Set(ids);
        if (!ids.length || selected.size !== ids.length || ids.some(id => !doc.records.some(record => record.id === id && record.cardId === ports.cardId)))
          throw new HistoryError('blocked', 'The selection changed or contains an entry from another card. Reload history before deleting.');
        doc.records = doc.records.filter(record => record.cardId !== ports.cardId || !selected.has(record.id));
      });
    },
    clear() { return mutate('delete', doc => { doc.records = doc.records.filter(record => record.cardId !== ports.cardId); }); },
    close() { closed = true; },
  };
}
