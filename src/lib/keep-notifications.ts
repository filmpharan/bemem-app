import type { HistoryRecord } from './card-history';

export const KEEP_NOTIFICATION_CHANNEL = 'bemem-keeps';
export const KEEP_NOTIFICATION_SCOPE = 'bemem-keeps-v1';
export type ReminderNotification = NonNullable<NonNullable<HistoryRecord['keep']>['reminder']>['notification'];
export type KeepNotificationData = { scope: typeof KEEP_NOTIFICATION_SCOPE; cardId: string; keepId: string; at: string };
export type KeepNotificationRequest = {
  identifier: string;
  content?: { title?: unknown; body?: unknown; data?: unknown };
  trigger?: unknown;
};
export type KeepScheduleStage = 'admission' | 'channel' | 'permission' | 'queue_before' | 'schedule' | 'queue_after';
export type KeepScheduleResult = {
  status: 'not_attempted' | 'denied' | 'expired' | 'rejected' | 'unconfirmed' | 'queue_confirmed';
  stage: KeepScheduleStage;
  intendedId: string | null;
  returnedId: string | null;
  attempted: boolean;
  reason: string;
};
type SchedulePorts = {
  permission(): Promise<boolean>;
  channel?(): Promise<boolean>;
  scheduled(): Promise<KeepNotificationRequest[]>;
  schedule(id: string, at: string, title: string, data: KeepNotificationData): Promise<string>;
  cancel(id: string): Promise<void>;
  now?: () => number;
};
function object(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}
/** Android SDK 58 returns {type:'date',value:<milliseconds>,channelId}; inputs use date instead. */
export function matchesKeepNotification(request: KeepNotificationRequest, record: HistoryRecord): boolean {
  const reminder = record.keep?.reminder;
  if (!reminder || request.identifier !== `bemem-keep-${record.id}`) return false;
  const trigger = object(request.trigger), data = object(request.content?.data);
  return trigger?.type === 'date' && trigger.repeats !== true
    && trigger.channelId === KEEP_NOTIFICATION_CHANNEL
    && typeof trigger.value === 'number' && trigger.value === Date.parse(reminder.at)
    && data?.scope === KEEP_NOTIFICATION_SCOPE && data.cardId === record.cardId
    && data.keepId === record.id && data.at === reminder.at
    && request.content?.title === 'bemem Reminder' && request.content.body === 'You have a reminder.';
}
export function notificationMetadata(result: KeepScheduleResult): ReminderNotification {
  return { status: result.status === 'queue_confirmed' ? 'scheduled' : result.status === 'denied' ? 'denied' : 'failed',
    id: result.status === 'queue_confirmed' || result.attempted || result.status === 'unconfirmed' ? result.intendedId : null };
}

/** Owns native evidence only. The caller alone owns the History metadata transaction. */
export function createKeepNotifications(ports: SchedulePorts) {
  const now = ports.now ?? Date.now;
  const inFlight = new Set<string>();
  const evidence = new Map<string, KeepScheduleResult>();
  async function cancelId(id: string) {
    if (!id.startsWith('bemem-keep-') || id.length <= 11) throw Error('Invalid Keep notification identifier.');
    if ((await ports.scheduled()).some(item => item.identifier === id)) await ports.cancel(id);
    if ((await ports.scheduled()).some(item => item.identifier === id)) throw Error('Notification cancellation was not confirmed.');
  }
  async function scheduleResult(record: HistoryRecord, options: { authorize(): boolean }): Promise<KeepScheduleResult> {
    const reminder = record.keep?.reminder;
    const intendedId = reminder ? `bemem-keep-${record.id}` : null;
    let stage: KeepScheduleStage = 'admission', attempted = false, returnedId: string | null = null;
    const result = (status: KeepScheduleResult['status'], reason: string): KeepScheduleResult => {
      const value = {status, stage, intendedId, returnedId, attempted, reason};
      if (intendedId) evidence.set(intendedId, value);
      return value;
    };
    const admitted = () => {
      if (!options.authorize()) return result(attempted ? 'unconfirmed' : 'not_attempted', 'Owner or operation changed.');
      if (!reminder || !Number.isFinite(Date.parse(reminder.at))
        || new Date(reminder.at).toISOString() !== reminder.at || Date.parse(reminder.at) <= now())
        return result(attempted ? 'unconfirmed' : 'expired', 'Reminder time is no longer in the future.');
      return null;
    };
    if (!reminder || reminder.state !== 'pending') return result('not_attempted', 'No pending reminder.');
    if (inFlight.has(intendedId!)) return {status:'not_attempted', stage, intendedId, returnedId, attempted, reason:'A scheduling operation is already running.'};
    // An uncertain native effect is never retried implicitly or explicitly through this coordinator.
    const prior = evidence.get(intendedId!);
    if (prior?.attempted) return { ...prior, status:'unconfirmed', stage:'admission',
      reason:'An earlier native attempt exists. Inspect its pending queue; no scheduling retry was made.' };
    inFlight.add(intendedId!);
    try {
      let blocked = admitted(); if (blocked) return blocked;
      stage = 'channel';
      if (!ports.channel || !await ports.channel()) return admitted() ?? result('rejected', 'Notification channel configuration could not be verified.');
      blocked = admitted(); if (blocked) return blocked;
      stage = 'permission';
      if (!await ports.permission()) return admitted() ?? result('denied', 'Notification permission was not granted.');
      blocked = admitted(); if (blocked) return blocked;
      stage = 'queue_before';
      const before = await ports.scheduled();
      blocked = admitted(); if (blocked) return blocked;
      const existing = before.filter(item => item.identifier === intendedId);
      if (existing.length) return existing.length === 1 && matchesKeepNotification(existing[0], record)
        ? result('queue_confirmed', 'Matching native pending request found; delivery is unconfirmed.')
        : result('unconfirmed', 'Existing native identifier has conflicting request details.');
      stage = 'schedule';
      // No await between this admission and invoking the native effect.
      blocked = admitted(); if (blocked) return blocked;
      attempted = true;
      try {
        returnedId = await ports.schedule(intendedId!, reminder.at, 'bemem Reminder', {
          scope: KEEP_NOTIFICATION_SCOPE, cardId: record.cardId, keepId: record.id, at: reminder.at,
        });
      } catch {
        // A rejected native promise does not prove that the native effect did not occur.
        return result('unconfirmed', 'Native scheduling rejected; its effect is uncertain. No retry was made.');
      }
      blocked = admitted(); if (blocked) return blocked;
      stage = 'queue_after';
      const after = await ports.scheduled();
      blocked = admitted(); if (blocked) return blocked;
      if (returnedId !== intendedId) return result('unconfirmed', 'Native returned an unexpected identifier.');
      const matching = after.filter(item => item.identifier === intendedId);
      return matching.length === 1 && matchesKeepNotification(matching[0], record)
        ? result('queue_confirmed', 'Matching native pending request confirmed; delivery is unconfirmed.')
        : result('unconfirmed', 'Native pending request could not be confirmed.');
    } catch {
      return result(attempted || stage === 'queue_before' ? 'unconfirmed' : 'rejected', 'Native evidence could not be read. No retry was made.');
    } finally { inFlight.delete(intendedId!); }
  }
  return {
    scheduled: async () => (await ports.scheduled()).map(item => item.identifier),
    inspect: () => ports.scheduled(), cancelId, scheduleResult,
    evidence: (id: string) => { const value = evidence.get(id); return value ? {...value} : null; },
    async schedule(record: HistoryRecord, options: { authorize(): boolean } = { authorize: () => false }): Promise<ReminderNotification> {
      return notificationMetadata(await scheduleResult(record, options));
    },
    async cancel(record: HistoryRecord) { if (record.keep?.reminder) await cancelId(`bemem-keep-${record.id}`); },
  };
}
