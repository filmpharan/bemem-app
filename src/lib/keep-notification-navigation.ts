import type { KeepNotificationTap, KeepNotificationTargetResult } from './keep-notification-target';

type PendingIntent = { tap: KeepNotificationTap; key: string; owner: string | null; ownerChanged: boolean };
/** Holds navigation intent across UI blocking and readonly validation; only opening consumes a target. */
export function createKeepNotificationNavigation(ports: {
  available(): boolean;
  owner(): string | null;
  resolve(tap: KeepNotificationTap): Promise<KeepNotificationTargetResult>;
  open(target: {cardId:string;keepId:string}): void;
  unavailable(): void;
  consumed(tap: KeepNotificationTap): void;
}) {
  let pending: PendingIntent | null = null, running = false, closed = false;
  const handled = new Set<string>();
  function finish(intent: PendingIntent, result: KeepNotificationTargetResult) {
    if (closed || pending !== intent) return;
    pending = null;
    handled.add(intent.key);
    // Clearing native response evidence must not prevent the already verified UI action.
    try { ports.consumed(intent.tap); } catch { /* Native clear unavailable; in-memory dedup remains. */ }
    if (result.status === 'ready') ports.open({cardId:result.cardId,keepId:result.keepId});
    else if (result.status !== 'duplicate') ports.unavailable();
  }
  function refresh() {
    if (closed || running || !pending || !ports.available()) return;
    const owner = ports.owner();
    if (owner === null) return; // Cold responses wait for current Wallet authority to exist.
    const intent = pending;
    if (intent.owner !== null && intent.owner !== owner) intent.ownerChanged = true;
    if (intent.ownerChanged) { finish(intent, {status:'owner_changed'}); return; }
    intent.owner = owner;
    running = true;
    void Promise.resolve().then(() => ports.resolve(intent.tap)).catch((): KeepNotificationTargetResult => ({status:'unavailable'})).then(result => {
      running = false;
      if (closed) return;
      if (pending !== intent) { refresh(); return; }
      if (ports.owner() !== intent.owner || result.status === 'owner_changed') intent.ownerChanged = true;
      // Do not consume a verified result while another screen owns the UI.
      // The next refresh performs another fresh readonly validation, never a schedule/write.
      if (!ports.available()) return;
      if (intent.ownerChanged) { finish(intent, {status:'owner_changed'}); return; }
      finish(intent, result);
    });
  }
  return {
    enqueue(tap: KeepNotificationTap) {
      if (closed) return;
      const key = JSON.stringify([tap.identifier,tap.cardId,tap.keepId,tap.at,tap.actionIdentifier]);
      if (handled.has(key) || pending?.key === key) return;
      pending = {tap,key,owner:ports.owner(),ownerChanged:false};
      refresh();
    },
    refresh,
    close() { closed = true; pending = null; },
  };
}
