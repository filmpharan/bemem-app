import * as Notifications from 'expo-notifications';
import {Platform} from 'react-native';
import {createKeepNotifications} from './keep-notifications';
Notifications.setNotificationHandler({handleNotification:async()=>({shouldShowBanner:true,shouldShowList:true,shouldPlaySound:true,shouldSetBadge:false})});
export const keepNotifications=createKeepNotifications({
 async permission(){if(Platform.OS==='android')await Notifications.setNotificationChannelAsync('bemem-keeps',{name:'Keep reminders',importance:Notifications.AndroidImportance.HIGH});const current=await Notifications.getPermissionsAsync();return current.granted||(await Notifications.requestPermissionsAsync()).granted;},
 scheduled:()=>Notifications.getAllScheduledNotificationsAsync(),
 schedule:(identifier,at,title)=>Notifications.scheduleNotificationAsync({identifier,content:{title,body:'A reminder from My Keeps',sound:'default'},trigger:{type:Notifications.SchedulableTriggerInputTypes.DATE,date:new Date(at),channelId:'bemem-keeps'}}),
 cancel:id=>Notifications.cancelScheduledNotificationAsync(id),
});
