import {validateHistoryRecord,cloneHistory,cardHistory,HistoryError,type HistoryRecord,type HistoryDocument,type Receipt} from './card-history';
export type KeepKind=NonNullable<HistoryRecord['keep']>['kind'];
export type KeepForm={kind:KeepKind;note:string;images:Receipt[];reminder?:{at:string;title:string}};
export function prepareKeep(form:KeepForm,cardId:string,id:string,now:string):HistoryRecord{
 if(form.reminder&&Date.parse(form.reminder.at)<=Date.parse(now))throw new HistoryError('invalid','Choose a reminder time in the future.');
 const record:HistoryRecord={entryKind:'keep',id,cardId,type:'note',date:now.slice(0,10),time:now.slice(11,16),description:'',notes:form.note,money:null,receipts:cloneHistory(form.images),createdAt:now,updatedAt:now,
 keep:{kind:form.kind,...(form.reminder?{reminder:{...form.reminder,state:'pending',notification:{status:'not_scheduled',id:null}}}: {})}};
 validateHistoryRecord(record);return record;
}
export function reminderInstant(date:string,time:string){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))throw new HistoryError('invalid','Choose a date and enter time as HH:mm.');
 const value=new Date(date+'T'+time+':00');
 if(!Number.isFinite(value.getTime())||value.getFullYear()!==Number(date.slice(0,4))||value.getMonth()+1!==Number(date.slice(5,7))||value.getDate()!==Number(date.slice(8,10))||value.getHours()!==Number(time.slice(0,2))||value.getMinutes()!==Number(time.slice(3,5)))throw new HistoryError('invalid','Enter a valid local date and time.');
 return value.toISOString();
}
export function keepTitle(record:HistoryRecord){return record.keep?.reminder?.title||record.description||record.notes.split('\n')[0].slice(0,90)||(record.receipts.length?'Photo':'Keep');}
export function keepsForCard(doc:HistoryDocument,id:string,now=new Date().toISOString()){
 const all=cardHistory(doc,id);return{all,upcoming:all.filter(r=>r.keep?.reminder?.state==='pending'&&r.keep.reminder.at>now).sort((a,b)=>a.keep!.reminder!.at.localeCompare(b.keep!.reminder!.at))};
}
