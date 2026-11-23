import { cloneHistory, historyId, HistoryError, type HistoryDocument, type HistoryRecord } from './card-history';
import type { createHistoryCommands } from './card-history-commands';
import type { createHistoryRepository } from './card-history-repository';

/** No note, title, photos, membership number or code payload is retained here. */
export type KeepRecoveryIntent = {
  schemaVersion: 1; id: string; operation: 'delete' | 'complete'; cardId: string; recordId: string;
  notificationId: string; reminderAt: string; historyRevision: number;
};
export function validateKeepRecovery(value: unknown): asserts value is KeepRecoveryIntent {
  const item = value as KeepRecoveryIntent;
  if (!item || typeof item !== 'object' || Array.isArray(item) || item.schemaVersion !== 1
    || !/^[a-zA-Z0-9-]{1,80}$/.test(item.id) || !['delete', 'complete'].includes(item.operation)
    || Object.keys(item).length !== 8 || Object.keys(item).some(key => !['schemaVersion','id','operation','cardId','recordId','notificationId','reminderAt','historyRevision'].includes(key)))
    throw new HistoryError('blocked', 'Reminder recovery evidence requires review.');
  historyId(item.cardId); historyId(item.recordId);
  if (item.notificationId !== `bemem-keep-${item.recordId}` || !Number.isSafeInteger(item.historyRevision) || item.historyRevision < 0
    || typeof item.reminderAt !== 'string' || !Number.isFinite(Date.parse(item.reminderAt)) || new Date(item.reminderAt).toISOString() !== item.reminderAt)
    throw new HistoryError('blocked', 'Reminder recovery identity is invalid.');
}
type Commands = Pick<ReturnType<typeof createHistoryCommands>, 'updateReminder'>;
export function createKeepRecovery(ports: {
  repository: Pick<ReturnType<typeof createHistoryRepository>, 'load'>;
  intents: { list(): Promise<KeepRecoveryIntent[]>; write(intent: KeepRecoveryIntent): Promise<void>; remove(id: string): Promise<void> };
  notifications: { scheduled(): Promise<string[]>; cancel(id: string): Promise<void> };
  nextId(): string;
}) {
  let busy = false;
  async function list() {
    const values = await ports.intents.list();
    const records = new Set<string>();
    for (const item of values) {
      validateKeepRecovery(item);
      if (records.has(item.recordId)) throw new HistoryError('blocked', 'Conflicting reminder recovery intents require review.');
      records.add(item.recordId);
    }
    return cloneHistory(values);
  }
  const check = (authorize: () => boolean) => { if (!authorize()) throw new HistoryError('blocked', 'The wallet session changed. Reopen My Keeps before recovery.'); };
  const recordFor = (doc: HistoryDocument, intent: KeepRecoveryIntent) => {
    if (doc.revision < intent.historyRevision) throw new HistoryError('revision_conflict', 'History is older than its recovery intent.');
    const record = doc.records.find(item => item.id === intent.recordId);
    if (record && (record.cardId !== intent.cardId || record.keep?.reminder?.at !== intent.reminderAt))
      throw new HistoryError('blocked', 'This reminder changed. Recovery will not modify it.');
    return record;
  };
  async function cancelVerified(id: string, authorize: () => boolean) {
    check(authorize);
    if ((await ports.notifications.scheduled()).includes(id)) {
      check(authorize); await ports.notifications.cancel(id);
    }
    if ((await ports.notifications.scheduled()).includes(id)) throw new HistoryError('failed', 'Notification cancellation was not confirmed. Recovery was preserved.');
    check(authorize);
  }
  async function finish(intent: KeepRecoveryIntent, commands: Commands | null, authorize: () => boolean, allowAbortedDelete: boolean) {
    check(authorize);
    const doc = await ports.repository.load(), record = recordFor(doc, intent);
    check(authorize);
    if (intent.operation === 'delete' && record) {
      // An interrupted precommit save is inspected, never replayed as a new deletion.
      if (!allowAbortedDelete) throw new HistoryError('blocked', 'Keep deletion is not verified. Recovery was preserved.');
      await ports.intents.remove(intent.id);
      return 'The Keep is still saved. No notification was canceled.';
    }
    if (intent.operation === 'complete' && !record) {
      if (!allowAbortedDelete || doc.revision <= intent.historyRevision)
        throw new HistoryError('blocked', 'The saved reminder is unavailable. Recovery was preserved.');
      // The record was subsequently removed by a verified history commit. Do not recreate it.
      await cancelVerified(intent.notificationId, authorize);
      const latest = await ports.repository.load(); check(authorize);
      if (recordFor(latest, intent)) throw new HistoryError('revision_conflict', 'The reminder reappeared. Review again.');
      await ports.intents.remove(intent.id);
      return 'Reminder no longer exists. Notification cleanup verified.';
    }
    if (intent.operation === 'complete' && !commands)
      throw new HistoryError('blocked', 'The parent card is unavailable. Recovery was preserved.');
    await cancelVerified(intent.notificationId, authorize);
    // Reinspect after the native await. No stale snapshot is ever written back.
    let latest = await ports.repository.load();
    const current = recordFor(latest, intent); check(authorize);
    if (intent.operation === 'delete') {
      if (current) throw new HistoryError('revision_conflict', 'The Keep reappeared during cleanup. Review again.');
    } else if (current?.keep?.reminder?.state !== 'completed' || current.keep.reminder.notification.status !== 'not_scheduled' || current.keep.reminder.notification.id !== null) {
      latest = (await commands!.updateReminder(intent.recordId, {state:'completed',notification:{status:'not_scheduled',id:null}})).document;
    }
    const readback = await ports.repository.load(); check(authorize);
    if (JSON.stringify(readback) !== JSON.stringify(latest)) throw new HistoryError('revision_conflict', 'History changed during recovery readback. Review again.');
    const verified = recordFor(readback, intent);
    if (intent.operation === 'complete' && (verified?.keep?.reminder?.state !== 'completed' || verified.keep.reminder.notification.status !== 'not_scheduled'))
      throw new HistoryError('commit_uncertain', 'Reminder completion readback was not confirmed.');
    if ((await ports.notifications.scheduled()).includes(intent.notificationId)) throw new HistoryError('failed', 'Notification cleanup still needs review.');
    check(authorize); await ports.intents.remove(intent.id);
    return intent.operation === 'delete' ? 'Deleted Keep notification cleanup verified.' : 'Reminder completion verified.';
  }
  async function locked<T>(work: () => Promise<T>) {
    if (busy) throw new HistoryError('busy', 'Reminder recovery is already running.');
    busy = true; try { return await work(); } finally { busy = false; }
  }
  function intentFor(record: HistoryRecord, revision: number, operation: KeepRecoveryIntent['operation']): KeepRecoveryIntent {
    const intent: KeepRecoveryIntent = {schemaVersion:1,id:ports.nextId(),operation,cardId:record.cardId,recordId:record.id,
      notificationId:`bemem-keep-${record.id}`,reminderAt:record.keep!.reminder!.at,historyRevision:revision};
    validateKeepRecovery(intent); return intent;
  }
  return {
    list,
    scheduled: () => ports.notifications.scheduled(),
    prepareDeletion(before: HistoryDocument, after: HistoryDocument) {
      const retained = new Set(after.records.map(record => record.id));
      const removed = before.records.filter(record => record.keep?.reminder && !retained.has(record.id));
      if (!removed.length) return Promise.resolve();
      return locked(async () => {
        const pending = await list();
        for (const record of removed) {
          if (pending.some(item => item.recordId === record.id)) throw new HistoryError('blocked', 'Resolve reminder recovery before deleting this Keep.');
          await ports.intents.write(intentFor(record, before.revision, 'delete'));
        }
      });
    },
    finishDeletion(before: HistoryDocument, after: HistoryDocument) {
      const retained = new Set(after.records.map(record => record.id));
      const removed = new Set(before.records.filter(record => !retained.has(record.id)).map(record => record.id));
      if (!removed.size) return Promise.resolve();
      return locked(async () => {
        for (const intent of await list()) if (intent.operation === 'delete' && removed.has(intent.recordId))
          await finish(intent, null, () => true, false);
      });
    },
    complete(record: HistoryRecord, commands: Commands, authorize: () => boolean) {
      return locked(async () => {
        check(authorize);
        const doc = await ports.repository.load();
        if (!record.keep?.reminder || record.keep.reminder.state !== 'pending' || JSON.stringify(doc.records.find(item => item.id === record.id)) !== JSON.stringify(record))
          throw new HistoryError('revision_conflict', 'Reminder changed. Reload My Keeps before completing it.');
        if ((await list()).some(item => item.recordId === record.id)) throw new HistoryError('blocked', 'Review the existing reminder recovery first.');
        const intent = intentFor(record, doc.revision, 'complete'); check(authorize);
        await ports.intents.write(intent); // Verified durable evidence BEFORE touching the native notification.
        return finish(intent, commands, authorize, false);
      });
    },
    recover(id: string, commands: Commands | null, authorize: () => boolean) {
      return locked(async () => {
        const intent = (await list()).find(item => item.id === id);
        if (!intent) return 'Recovery is already resolved. No action was repeated.';
        return finish(intent, commands, authorize, true);
      });
    },
  };
}

/** Presentation only: queue evidence never proves delivery or rewrites saved metadata. */
export function reminderNotificationLabel(record: HistoryRecord, pending: readonly KeepRecoveryIntent[], scheduled: readonly string[] | null,
  inspection: 'checking' | 'verified' | 'unknown' = 'verified', now = Date.now()) {
  const reminder = record.keep?.reminder;
  if (!reminder) return '';
  if (pending.some(item => item.recordId === record.id)) return 'Reminder recovery needs review';
  const overdue = reminder.state === 'pending' && Date.parse(reminder.at) <= now;
  if (inspection === 'checking') return overdue ? 'Overdue' : '';
  if (inspection !== 'verified' || scheduled === null) return 'Notification status needs review. Check recovery status before making changes.';
  const nativeScheduled = scheduled.includes(`bemem-keep-${record.id}`);
  if (reminder.state === 'completed') return nativeScheduled ? 'Notification cleanup needs review' : 'Completed';
  const prefix = overdue ? 'Overdue. ' : '';
  if (nativeScheduled) return prefix + (reminder.notification.status === 'scheduled' ? 'Pending notification found. Delivery is unconfirmed.' : 'Notification status needs review.');
  if (reminder.notification.status === 'denied') return prefix + 'Notification permission not granted';
  if (reminder.notification.status === 'failed') return prefix + 'Scheduling was not confirmed. No pending notification found.';
  return prefix + 'No pending notification found. Delivery is unconfirmed.';
}
