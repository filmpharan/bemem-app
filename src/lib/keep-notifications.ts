import type {HistoryRecord} from './card-history';
export type ReminderNotification=NonNullable<NonNullable<HistoryRecord['keep']>['reminder']>['notification'];
export function createKeepNotifications(ports:{permission:()=>Promise<boolean>;scheduled:()=>Promise<{identifier:string}[]>;schedule:(id:string,at:string,title:string)=>Promise<string>;cancel:(id:string)=>Promise<void>}){
 async function cancelId(id:string){
  if(!id.startsWith('bemem-keep-')||id.length<=11)throw Error('Invalid Keep notification identifier.');
  if((await ports.scheduled()).some(item=>item.identifier===id))await ports.cancel(id);
  if((await ports.scheduled()).some(item=>item.identifier===id))throw Error('Notification cancellation was not confirmed.');
 }
 return{scheduled:async()=> (await ports.scheduled()).map(item=>item.identifier),cancelId,async schedule(record:HistoryRecord):Promise<ReminderNotification>{
  const reminder=record.keep?.reminder;if(!reminder)throw Error('No reminder.');const id=`bemem-keep-${record.id}`;
  try{if(Date.parse(reminder.at)<=Date.now())return{status:'failed',id:null};if(!await ports.permission())return{status:'denied',id:null};
   if((await ports.scheduled()).some(n=>n.identifier===id))return{status:'scheduled',id};
   const actual=await ports.schedule(id,reminder.at,reminder.title);if(actual!==id)throw Error('Unexpected notification identifier.');return{status:'scheduled',id};
  }catch{return{status:'failed',id:null};}
 },async cancel(record:HistoryRecord){if(record.keep?.reminder)await cancelId(`bemem-keep-${record.id}`);}};
}
