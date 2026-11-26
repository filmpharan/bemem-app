import {useEffect,useMemo,useRef,useState} from 'react';
import {uuid} from 'expo';
import {useWalletRuntime} from './WalletRuntimeProvider';
import {createHistoryCommands} from '../../lib/card-history-commands';
import {deviceHistoryRepository,keepMediaFiles,keepRecovery,prepareRetiredReminders,removeRetiredReceipts} from '../../lib/card-history-native';
import {keepNotifications} from '../../lib/keep-notifications-native';
import {notificationMetadata} from '../../lib/keep-notifications';
import type {KeepForm} from '../../lib/keeps';
import type {HistoryDocument,HistoryRecord} from '../../lib/card-history';
import type {KeepSaveOutcome} from '../../lib/keep-draft-session';
import type {KeepRecoveryIntent} from '../../lib/keep-recovery';
import type {HistoryDeleteIntent} from '../../lib/card-history-deletion';
import {admitKeepsMutation,inspectKeepsOnce,keepsMutationPending,observeKeepsWait} from './keeps-lifecycle';

type Commands=ReturnType<typeof createHistoryCommands>;
type Inspection='checking'|'verified'|'unknown'|'delayed';
const reason=(e:unknown)=>e instanceof Error?e.message:'The operation could not be confirmed. Review the saved state before continuing.';
/** Owns live Keeps admission and operation evidence; presentation never coordinates repository/native ordering. */
export function useKeepsController(cardId:string){
 const {runtime,snapshot}=useWalletRuntime();
 const context=useMemo(()=>({runtime,cardId}),[runtime,cardId]),current=useRef(context);current.current=context;
 const active=useRef(true),working=useRef(false),commands=useRef<Commands|null>(null),attempt=useRef(0),loadAttempt=useRef(0),confirmedRecord=useRef<string|null>(null);
 const loaded=useRef<{stamp:string;cap:Commands|null}|null>(null),inspected=useRef<{stamp:string;cap:Commands|null}|null>(null),documentOwner=useRef<string|null>(null);
 const [document,setDocument]=useState<HistoryDocument|null>(null),[loadState,setLoadState]=useState<'loading'|'loaded'|'failed'>('loading');
 const [inspection,setInspection]=useState<Inspection>('checking'),[scheduled,setScheduled]=useState<string[]|null>(null);
 const [historyRecovery,setHistoryRecovery]=useState<HistoryDeleteIntent[]>([]),[reminderRecovery,setReminderRecovery]=useState<KeepRecoveryIntent[]>([]);
 const [busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[blocked,setBlocked]=useState(false),[uncertain,setUncertain]=useState(false);
 const [reviewIds,setReviewIds]=useState<string[]>([]);
 const live=()=>active.current&&current.current===context;
 function stamp(){const s=runtime.getSnapshot();return JSON.stringify([s.state.source,s.state.generation,s.session?.revision,cardId,s.session?.saved.cards.some(c=>c.kind==='membership'&&c.id===cardId)]);}
 function authority(id=cardId){const s=runtime.getSnapshot();return live()&&s.state.source==='v2'&&s.state.editsAllowed&&!s.state.saving&&!s.state.dirty&&!!s.session?.saved.cards.some(c=>c.kind==='membership'&&c.id===id)&&(runtime.pages?.canEditCard(id)??true)&&runtime.historyDeletion.allowed(id);}
 function makeCommands(id:string){return createHistoryCommands(deviceHistoryRepository,{cardId:id,now:()=>new Date().toISOString(),nextId:()=>uuid.v4(),beforeCommit:prepareRetiredReminders,afterCommit:removeRetiredReceipts,admission(){const s=runtime.getSnapshot();return {context:'home',generation:s.state.generation,revision:s.session?.revision??-1,cardExists:!!s.session?.saved.cards.some(c=>c.kind==='membership'&&c.id===id),canManage:authority(id)};}});}
 function proof(p:{stamp:string;cap:Commands|null}|null){return !!p&&p.stamp===stamp()&&p.cap===commands.current;}
 async function reload(){const token=++loadAttempt.current,start=stamp(),cap=commands.current;loaded.current=null;
  try{const doc=cap&&!working.current?await cap.load():await deviceHistoryRepository.load();if(!live()||token!==loadAttempt.current||start!==stamp()||cap!==commands.current)return;
   documentOwner.current=start;setDocument(doc);setLoadState('loaded');if(!working.current)loaded.current={stamp:start,cap};setBlocked(false);
  }catch(e){if(live()&&token===loadAttempt.current){setLoadState('failed');setBlocked(true);setNotice(reason(e));}}
 }
 async function inspect(){const token=++attempt.current,start=stamp(),cap=commands.current;inspected.current=null;
  if(live()){setInspection('checking');setScheduled(null);}
  const stop=observeKeepsWait(()=>{if(live()&&token===attempt.current)setInspection('delayed');});
  try{const [hist,rem]=await Promise.all([runtime.historyDeletion.list(),keepRecovery.list()]);
   if(!live()||token!==attempt.current||start!==stamp()||cap!==commands.current)return;
   setHistoryRecovery(hist);setReminderRecovery(rem);
   const ids=await inspectKeepsOnce(runtime,()=>keepRecovery.scheduled(),true);
   if(!live()||token!==attempt.current||start!==stamp()||cap!==commands.current)return;
   inspected.current={stamp:start,cap};setScheduled(ids);setInspection('verified');
  }catch(e){if(live()&&token===attempt.current){setInspection('unknown');setNotice(reason(e));}}finally{stop();}
 }
 const lifecycle=useRef({cardId,makeCommands,reload,inspect,live});lifecycle.current={cardId,makeCommands,reload,inspect,live};
 useEffect(()=>{const scope=lifecycle.current,inspectionAttempt=attempt,historyAttempt=loadAttempt;active.current=true;const cap=scope.cardId?scope.makeCommands(scope.cardId):null;commands.current=cap;loaded.current=null;inspected.current=null;working.current=false;
  setDocument(null);setLoadState('loading');setNotice('');setBusy(false);setUncertain(false);setReviewIds([]);void scope.reload();void scope.inspect();
  return()=>{active.current=false;inspectionAttempt.current++;historyAttempt.current++;cap?.close();if(commands.current===cap)commands.current=null;};
 },[context]);
 const [,refresh]=useState(0);
 useEffect(()=>keepMediaFiles.subscribe(()=>{if(lifecycle.current.live())refresh(v=>v+1);}),[context]);
 function canPick(){return authority()&&!working.current&&!keepsMutationPending(runtime)&&!keepMediaFiles.hasIssues();}
 function canMutate(){return authority()&&!working.current&&!keepsMutationPending(runtime)&&!blocked&&!uncertain&&proof(loaded.current)&&proof(inspected.current)&&!historyRecovery.some(r=>r.cardId===cardId)&&!reminderRecovery.some(r=>r.cardId===cardId);}
 function canRetain(){return canMutate()&&!keepMediaFiles.hasIssues();}
 function canWrite(){return canRetain()&&!keepMediaFiles.isBusy();}
 function start(){if(!canMutate())return null;const release=admitKeepsMutation(runtime);if(!release)return null;working.current=true;setBusy(true);return release;}
 function finish(release:()=>void){release();working.current=false;if(live()){setBusy(false);void inspect();}}
 async function save(form:KeepForm,onHistoryConfirmed?:()=>void):Promise<KeepSaveOutcome>{
  if(!canWrite()||!commands.current)return {kind:'not-started',message:'Saving is not ready. Your draft is unchanged. Review status before saving.'};
  const cap=commands.current,startStamp=stamp(),release=start();if(!release)return {kind:'not-started',message:'Another operation is still pending.'};
  const authorize=()=>authority()&&stamp()===startStamp&&commands.current===cap;
  let verified:Awaited<ReturnType<Commands['saveKeep']>>|null=null;
  const stop=observeKeepsWait(()=>{if(live()){setNotice(verified?'Keep saved. Notification work is still unconfirmed. Do not retry.':'Save is still unconfirmed. Do not retry.');setUncertain(true);}});
  try{
   verified=await cap.saveKeep(form);confirmedRecord.current=verified.recordId;
   // Custody transfer follows verified History even when the originating UI became stale.
   try{onHistoryConfirmed?.();}catch{/* Presentation callbacks cannot turn a verified commit into an uncertain commit. */}
   let doc=verified.document,message=verified.cleanupPending?'Keep saved. Attachment cleanup needs review.':'Keep saved',needsReview=verified.cleanupPending;
   const record=doc.records.find(r=>r.id===verified!.recordId)!;
   if(live()&&stamp()===startStamp){documentOwner.current=startStamp;setDocument(doc);}
   if(record.keep?.reminder){
    if(!authorize()){message='Keep saved. The wallet context changed before notification scheduling.';needsReview=true;}
    else{const result=await keepNotifications.scheduleResult(record,{authorize});
     needsReview ||= result.status==='unconfirmed';
     message=result.status==='queue_confirmed'?'Keep saved. Reminder scheduled.':result.status==='denied'?'Keep saved. Notification permission is off.':result.status==='unconfirmed'?'Keep saved. Reminder status needs review.':'Keep saved. Reminder could not be scheduled.';
     if(authorize()){try{doc=(await cap.updateReminder(record.id,{notification:notificationMetadata(result)})).document;}catch{needsReview=true;message='Keep saved. Notification metadata needs review.';}}
     else{needsReview=true;message='Keep saved. The notification result belongs to an earlier wallet context.';}
    }
   }
   if(live()&&stamp()===startStamp){documentOwner.current=startStamp;setDocument(doc);setLoadState('loaded');loaded.current={stamp:startStamp,cap};setNotice(message);if(needsReview)setReviewIds(v=>[...new Set([...v,record.id])]);}
   return {kind:'saved',document:doc,recordId:record.id,message,needsReview};
  }catch(e){if(live()){setBlocked(true);setUncertain(true);setNotice(reason(e));}return {kind:'uncertain',message:reason(e)};}
  finally{stop();finish(release);}
 }
 async function mutate(record:HistoryRecord,operation:'complete'|'delete'){
  if(!commands.current||!canMutate()||JSON.stringify(document?.records.find(r=>r.id===record.id&&r.cardId===cardId))!==JSON.stringify(record))return;
  const cap=commands.current,startStamp=stamp(),release=start();if(!release)return;
  const authorize=()=>authority()&&stamp()===startStamp&&commands.current===cap;
  const stop=observeKeepsWait(()=>{if(live()){setUncertain(true);setNotice('The operation is still unconfirmed. Read-only viewing is available. Do not retry.');}});
  try{if(operation==='complete'){const message=await keepRecovery.complete(record,cap,authorize);if(live()&&authorize())setNotice(message);}
   else{const result=await cap.deleteKeep(record.id);if(live()&&authorize()){setDocument(result.document);setNotice(result.cleanupPending?'Keep removed. Cleanup needs review.':'Keep removed.');if(result.cleanupPending)setBlocked(true);}}
   if(authorize()){const readback=await deviceHistoryRepository.load();if(authorize())setDocument(readback);}
  }catch(e){if(live()){setBlocked(true);setNotice(reason(e));}}
  finally{stop();finish(release);}
 }
 async function review(){if(working.current||keepsMutationPending(runtime))return;await keepMediaFiles.inspect();if(!live())return;setUncertain(false);setNotice('');await reload();void inspect();}
 async function recover(item:HistoryDeleteIntent|KeepRecoveryIntent,notification:boolean){
  if(working.current||keepsMutationPending(runtime)||!proof(inspected.current))return;
  const release=admitKeepsMutation(runtime);if(!release)return;working.current=true;setBusy(true);
  const startStamp=stamp(),authorize=()=>live()&&stamp()===startStamp&&runtime.getSnapshot().state.editsAllowed&&!runtime.getSnapshot().state.saving&&!runtime.getSnapshot().state.dirty;
  let cap:Commands|null=null;const stop=observeKeepsWait(()=>{if(live())setNotice('Recovery is still unconfirmed. Do not retry.');});
  try{let message:string;if(notification){const intent=item as KeepRecoveryIntent;
    if(historyRecovery.some(r=>r.cardId===intent.cardId))throw Error('Review preserved history for this card first.');
    if(intent.operation==='complete'&&runtime.getSnapshot().session?.saved.cards.some(c=>c.kind==='membership'&&c.id===intent.cardId)){cap=makeCommands(intent.cardId);await cap.load();}
    message=await keepRecovery.recover(intent.id,cap,authorize);
   }else{if(!authorize())throw Error('The wallet context changed.');message=await runtime.historyDeletion.recover(item.id);}
   if(live())setNotice(message);
  }catch(e){if(live()){setBlocked(true);setNotice(reason(e));}}
  finally{stop();cap?.close();finish(release);if(live())void reload();}
 }
 const nativeReviewIds=(document?.records??[]).filter(r=>{const n=r.keep?.reminder?.notification;
  const e=keepNotifications.evidence(`bemem-keep-${r.id}`);
  return e?.status==='unconfirmed'||!!n?.id&&n.status==='failed'||inspection==='verified'&&!!scheduled?.includes(`bemem-keep-${r.id}`)&&(n?.status!=='scheduled'||r.keep?.reminder?.state==='completed');
 }).map(r=>r.id);
 const allReviewIds=[...new Set([...reviewIds,...nativeReviewIds,...reminderRecovery.map(r=>r.recordId),...historyRecovery.flatMap(r=>r.records.map(v=>v.id))])];
 const staleDocument=!!document&&documentOwner.current!==stamp();
 return {runtime,snapshot,context,live,stamp,document:staleDocument?null:document,loadState:staleDocument?'loading' as const:loadState,inspection,scheduled,historyRecovery,reminderRecovery,busy,notice:staleDocument?'The wallet context changed. Review status before continuing.':notice,uncertain,reviewIds:allReviewIds,
  canPick,canRetain,canWrite,canMutate,save,mutate,review,recover,confirmedRecordId:()=>confirmedRecord.current,needsReview:staleDocument||blocked||uncertain||allReviewIds.length>0||inspection==='unknown'||inspection==='delayed'||keepMediaFiles.hasIssues()||historyRecovery.length>0||reminderRecovery.length>0};
}
