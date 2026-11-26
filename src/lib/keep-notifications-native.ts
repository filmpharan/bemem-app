import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { createKeepNotifications, KEEP_NOTIFICATION_CHANNEL } from './keep-notifications';
import { normalizeKeepNotificationResponse, type KeepNotificationTap } from './keep-notification-target';

Notifications.setNotificationHandler({handleNotification:async()=>({shouldShowBanner:true,shouldShowList:true,shouldPlaySound:true,shouldSetBadge:false})});

export const keepNotifications = createKeepNotifications({
  async channel() {
    if (Platform.OS !== 'android') return false;
    await Notifications.setNotificationChannelAsync(KEEP_NOTIFICATION_CHANNEL, {
      name: 'Keep reminders', importance: Notifications.AndroidImportance.HIGH,
      sound: 'default', enableVibrate: true, vibrationPattern: [0, 250, 250, 250],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
    });
    // Existing Android channels retain user-controlled settings. Read what actually exists.
    const channel = await Notifications.getNotificationChannelAsync(KEEP_NOTIFICATION_CHANNEL);
    return channel !== null && channel.id === KEEP_NOTIFICATION_CHANNEL
      && channel.importance >= Notifications.AndroidImportance.HIGH
      && channel.sound === 'default' && channel.enableVibrate
      && channel.lockscreenVisibility === Notifications.AndroidNotificationVisibility.PRIVATE;
  },
  async permission() {
    const current = await Notifications.getPermissionsAsync();
    return current.granted || (await Notifications.requestPermissionsAsync()).granted;
  },
  scheduled: () => Notifications.getAllScheduledNotificationsAsync(),
  schedule: (identifier, at, title, data) => Notifications.scheduleNotificationAsync({
    identifier, content: {title, body:'You have a reminder.', sound:'default', color:'#007B66', data},
    trigger: {type:Notifications.SchedulableTriggerInputTypes.DATE, date:new Date(at), channelId:KEEP_NOTIFICATION_CHANNEL},
  }),
  cancel: id => Notifications.cancelScheduledNotificationAsync(id),
});

export function subscribeKeepNotificationResponses(listener: (tap: KeepNotificationTap) => void): () => void {
  const subscription = Notifications.addNotificationResponseReceivedListener(response => {
    const tap = normalizeKeepNotificationResponse(response); if (tap) listener(tap);
  });
  return () => subscription.remove();
}
export function getLastKeepNotificationResponse(): KeepNotificationTap | null {
  try { return normalizeKeepNotificationResponse(Notifications.getLastNotificationResponse()); }
  catch { return null; }
}
export function clearLastKeepNotificationResponse(): void {
  try { Notifications.clearLastNotificationResponse(); } catch { /* Optional native capability. */ }
}

/** Actual callback evidence only. It does not assert tray display, sound or delivery after process death. */
export type KeepReceivedEvidence = { event: 'received_callback'; identifier: string; observedAt: string };
export function subscribeKeepNotificationReceived(listener: (event: KeepReceivedEvidence) => void): () => void {
  const subscription = Notifications.addNotificationReceivedListener(notification => {
    const tap = normalizeKeepNotificationResponse({notification, actionIdentifier:Notifications.DEFAULT_ACTION_IDENTIFIER});
    if (tap) listener({event:'received_callback', identifier:tap.identifier, observedAt:new Date().toISOString()});
  });
  return () => subscription.remove();
}
