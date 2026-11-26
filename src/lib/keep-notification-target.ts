import { validateHistoryDocument, type HistoryDocument, type HistoryRecord } from './card-history';
import { KEEP_NOTIFICATION_SCOPE } from './keep-notifications';

export type KeepNotificationTap = { identifier: string; actionIdentifier: string; cardId: string; keepId: string; at: string };
function object(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}
function safeId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 180 && !/[\\/]/.test(value) && !Array.from(value).some(char => char.charCodeAt(0) < 32);
}
/** Both live and cold-start responses cross this same untrusted-data parser. No URL is accepted. */
export function normalizeKeepNotificationResponse(value: unknown): KeepNotificationTap | null {
  const response = object(value), notification = object(response?.notification), request = object(notification?.request);
  const content = object(request?.content), data = object(content?.data);
  if (!safeId(data?.cardId) || !safeId(data.keepId) || data.scope !== KEEP_NOTIFICATION_SCOPE
    || typeof data.at !== 'string' || !Number.isFinite(Date.parse(data.at))
    || new Date(data.at).toISOString() !== data.at || request?.identifier !== `bemem-keep-${data.keepId}`
    || response?.actionIdentifier !== 'expo.modules.notifications.actions.DEFAULT') return null;
  return { identifier: request.identifier as string, actionIdentifier: response.actionIdentifier,
    cardId: data.cardId, keepId: data.keepId, at: data.at };
}
export type KeepNotificationTargetResult =
  | { status: 'ready'; cardId: string; keepId: string; record: HistoryRecord }
  | { status: 'invalid' | 'duplicate' | 'owner_changed' | 'missing' | 'stale' | 'unavailable' };

/** A tap grants navigation intent only; fresh owner/History metadata grants the target. */
export function createKeepNotificationTargetResolver(ports: {
  owner(): string | null;
  readHistory(): Promise<HistoryDocument>;
  cardExists(cardId: string): boolean;
}) {
  const handled = new Set<string>(), resolving = new Set<string>();
  return {
    async resolve(tap: KeepNotificationTap, options: { consume?: boolean } = {}): Promise<KeepNotificationTargetResult> {
      // Reparse exported tap values so callers cannot bypass the untrusted-data checks.
      if (!normalizeKeepNotificationResponse({ actionIdentifier: tap.actionIdentifier, notification: {
        request: { identifier: tap.identifier, content: { data: { scope: KEEP_NOTIFICATION_SCOPE,
          cardId: tap.cardId, keepId: tap.keepId, at: tap.at } } },
      } })) return {status:'invalid'};
      const owner = ports.owner();
      if (owner === null) return {status:'owner_changed'};
      const key = JSON.stringify([owner, tap.identifier, tap.at, tap.actionIdentifier]);
      if (handled.has(key) || resolving.has(key)) return {status:'duplicate'};
      resolving.add(key);
      try {
        const history = await ports.readHistory();
        if (ports.owner() !== owner) return {status:'owner_changed'};
        validateHistoryDocument(history);
        if (!ports.cardExists(tap.cardId)) return {status:'missing'};
        const record = history.records.find(item => item.id === tap.keepId && item.cardId === tap.cardId);
        if (!record || record.entryKind !== 'keep') return {status:'missing'};
        const reminder = record.keep?.reminder;
        if (!reminder || reminder.state !== 'pending' || reminder.at !== tap.at
          || reminder.notification.id !== tap.identifier) return {status:'stale'};
        if (ports.owner() !== owner) return {status:'owner_changed'};
        if (options.consume !== false) handled.add(key);
        return {status:'ready',cardId:record.cardId,keepId:record.id,record};
      } catch { return {status: ports.owner() !== owner ? 'owner_changed' : 'unavailable'}; }
      finally { resolving.delete(key); }
    },
  };
}
