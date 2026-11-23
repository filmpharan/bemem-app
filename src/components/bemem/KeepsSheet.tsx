import {useEffect,useMemo,useRef,useState} from 'react';
import {FlatList,Modal,Pressable,StyleSheet,Text,View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {uuid} from 'expo';
import type {MembershipCard} from '../../types/membership-card';
import {cardHistory,localHistoryTimestamp,amountInput,type HistoryDocument,type HistoryRecord,type Receipt} from '../../lib/card-history';
import {createHistoryCommands} from '../../lib/card-history-commands';
import {deviceHistoryRepository,removeRetiredReceipts,receiptUri,prepareRetiredReminders,keepRecovery,keepMediaFiles} from '../../lib/card-history-native';
import {keepTitle,keepsForCard,type KeepKind,type KeepForm} from '../../lib/keeps';
import {keepNotifications} from '../../lib/keep-notifications-native';
import {reminderNotificationLabel,type KeepRecoveryIntent} from '../../lib/keep-recovery';
import type {HistoryDeleteIntent} from '../../lib/card-history-deletion';
import {useWalletRuntime} from './WalletRuntimeProvider';
import {AddCardSheet} from './AddCardSheet';
import {AddCardIcon} from './AddCardIcon';
import {BememIcon} from './BememIcon';
import {GlassButton} from './GlassButton';
import {CardArtworkImage} from './CardArtworkImage';
import {ReceiptViewer} from './ReceiptViewer';
import {KeepEditor} from './KeepEditor';
import {useKeepsOuterMotion} from './keeps-motion';
import {useKeepsNavigationMotion} from './keeps-navigation-motion';
import {useKeepsEditorMotion} from './keeps-editor-motion';
import {ConfirmationDialog,type ConfirmationRequest} from './ConfirmationDialog';
import {ciColors,ciTypography,ciButtons} from '../../constants/ci-theme';
import {inspectKeepsOnce,keepsMutationPending,admitKeepsMutation,observeKeepsWait,KeepAdmissionBlockedError,KeepsInspectionStaleError} from './keeps-lifecycle';

type Commands=ReturnType<typeof createHistoryCommands>;
type Row={section:'Upcoming'|'Keeps';record?:HistoryRecord};
export function KeepsSheet({card,onClose,initialAdd=false}:{card?:Readonly<MembershipCard>;onClose:()=>void;initialAdd?:boolean}){
 const cardId=card?.id??'';
 const {runtime,snapshot}=useWalletRuntime(),commands=useRef<Commands|null>(null),active=useRef(true),working=useRef(false),requestRef=useRef<ConfirmationRequest|null>(null),sequence=useRef(0);
 const [doc,setDoc]=useState<HistoryDocument|null>(null),[view,setView]=useState<'list'|'chooser'|'editor'|'detail'>(initialAdd?'chooser':'list'),[origin,setOrigin]=useState<'card'|'list'>(initialAdd?'card':'list'),[kind,setKind]=useState<KeepKind>('full'),[selected,setSelected]=useState<string|null>(null),[photo,setPhoto]=useState<Receipt|null>(null),[busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[blocked,setBlocked]=useState(false),[request,setRequest]=useState<ConfirmationRequest|null>(null);
 const context=useMemo(()=>({}),[runtime,cardId]),currentContext=useRef(context);currentContext.current=context;
 const isCurrent=()=>active.current&&currentContext.current===context;
 const motion=useKeepsOuterMotion(context,`${view}:${selected??''}:${photo?.id??''}`,onClose);
 const navigation=useKeepsNavigationMotion(context,`${view}:${selected??''}:${photo?.id??''}`,ownerStamp(),view!=='detail'||!!doc?.records.some(item=>item.id===selected&&item.cardId===cardId));
 const editorMotion=useKeepsEditorMotion(context,view==='editor'?`editor:${kind}`:view,ownerStamp());
 const [recordsState,setRecordsState]=useState<'loading'|'loaded'|'failed'>('loading'),[inspection,setInspection]=useState<'checking'|'delayed'|'stale'|'verified'|'unknown'>('checking'),[uncertain,setUncertain]=useState(false);
 const [,refreshMedia]=useState(0);
 useEffect(()=>keepMediaFiles.subscribe(()=>{if(isCurrent())refreshMedia(v=>v+1);}),[context]);
 const draftContext=useRef<{owner:string;context:object}|null>(null);
 const inspectionAttempt=useRef(0),loadAttempt=useRef(0);
 const capabilityContext=useRef<{capability:Commands|null;owner:string}|null>(null),inspectionContext=useRef<{capability:Commands|null;owner:string}|null>(null);
 function ownerStamp(){const current=runtime.getSnapshot();return JSON.stringify([current.state.source,current.state.generation,current.session?.revision??-1,!!current.session?.saved.cards.some(c=>c.kind==='membership'&&c.id===cardId)]);}
 function inspectionCurrent(){const checked=inspectionContext.current;return !!checked&&checked.owner===ownerStamp()&&checked.capability===commands.current;}
 function capabilityCurrent(){const loaded=capabilityContext.current;return !!loaded&&loaded.owner===ownerStamp()&&loaded.capability===commands.current;}
 function block(){capabilityContext.current=null;setBlocked(true);}
 function admitAction(recovery=false){const current=runtime.getSnapshot();if(isCurrent()&&inspectionCurrent()&&(recovery||capabilityCurrent())&&current.state.source==='v2'&&current.state.editsAllowed&&!current.state.saving&&!current.state.dirty&&!working.current&&!keepsMutationPending(runtime)&&(recovery||runtime.historyDeletion.allowed(cardId)&&(runtime.pages?.canEditCard(cardId)??true)))return true;
  if(isCurrent()){setInspection('unknown');setScheduled(null);setNotice('The wallet context changed or an operation is pending. Check recovery status before making changes.');}return false;
 }
 function showRequest(value:ConfirmationRequest|null){requestRef.current=value;setRequest(value);}
 const [historyRecoveries,setHistoryRecoveries]=useState<HistoryDeleteIntent[]>([]),[reminderRecoveries,setReminderRecoveries]=useState<KeepRecoveryIntent[]>([]),[scheduled,setScheduled]=useState<string[]|null>(null);
 function createCommands(cardId:string){return createHistoryCommands(deviceHistoryRepository,{cardId,now:()=>new Date().toISOString(),nextId:()=>uuid.v4(),beforeCommit:prepareRetiredReminders,afterCommit:removeRetiredReceipts,
  admission(){const current=runtime.getSnapshot();return{generation:current.state.generation,revision:current.session?.revision??-1,context:'home',cardExists:current.state.source==='v2'&&!!current.session?.saved.cards.some(c=>c.kind==='membership'&&c.id===cardId),canManage:(runtime.pages?.canEditCard(cardId)??true)&&current.state.editsAllowed&&!current.state.saving&&!current.state.dirty&&runtime.historyDeletion.allowed(cardId)};}});}
 async function inspectRecovery(){
  const attempt=++inspectionAttempt.current,owner=ownerStamp(),capability=commands.current;
  const alive=()=>isCurrent()&&inspectionAttempt.current===attempt;
  const valid=()=>alive()&&ownerStamp()===owner&&commands.current===capability;
  inspectionContext.current=null;
  if(alive()){setInspection('checking');setScheduled(null);}
  const stop=observeKeepsWait(()=>{if(alive())setInspection('delayed');});
  try{
   // Metadata must settle first: never hold an earlier queue snapshot while awaiting it.
   const [history,reminders]=await Promise.all([runtime.historyDeletion.list(),keepRecovery.list()]);
   if(!valid())throw new KeepsInspectionStaleError('The wallet context changed during inspection.');
   setHistoryRecoveries(history);setReminderRecoveries(reminders);
   const ids=await inspectKeepsOnce(runtime,()=>keepRecovery.scheduled(),true);
   if(!valid())throw new KeepsInspectionStaleError('The wallet context changed during inspection.');
   inspectionContext.current={capability,owner};setScheduled(ids);setInspection('verified');return{history,reminders};
  }catch(error){if(alive()){inspectionContext.current=null;setInspection(error instanceof KeepsInspectionStaleError?'stale':'unknown');setScheduled(null);}throw error;}finally{stop();}
 }
 async function reload(capability:Commands|null){
  const attempt=++loadAttempt.current,owner=ownerStamp();capabilityContext.current=null;
  const valid=()=>isCurrent()&&loadAttempt.current===attempt&&commands.current===capability;
  try{const value=capability?await capability.load():await deviceHistoryRepository.load();
   if(valid()){if(ownerStamp()!==owner)throw Error('The wallet context changed while reading Keeps.');capabilityContext.current={capability,owner};setDoc(value);setRecordsState('loaded');setBlocked(false);}
  }catch(error){if(valid()){setRecordsState('failed');block();}throw error;}
 }
 function refreshInspection(){void inspectRecovery().catch(()=>{/* Unknown status keeps mutation admission closed. */});}
 useEffect(()=>{
  active.current=true;const capability=cardId?createCommands(cardId):null;
  commands.current=capability;if(draftContext.current?.context!==context)draftContext.current=null;working.current=false;setBusy(false);setDoc(null);setRecordsState('loading');setBlocked(false);setUncertain(false);setNotice('');setSelected(null);setHistoryRecoveries([]);setReminderRecoveries([]);
  void reload(capability).catch(()=>{});refreshInspection();
  return()=>{active.current=false;inspectionAttempt.current++;loadAttempt.current++;capability?.close();if(commands.current===capability)commands.current=null;};
 },[runtime,cardId]);
 const canRecover=snapshot.state.source==='v2'&&snapshot.state.editsAllowed&&!snapshot.state.saving&&!snapshot.state.dirty&&!busy&&inspection==='verified'&&inspectionCurrent()&&!keepsMutationPending(runtime);
 const ready=!!cardId&&canRecover&&capabilityCurrent()&&(runtime.pages?.canEditCard(cardId)??true)&&!!doc&&recordsState==='loaded'&&inspection==='verified'&&!uncertain&&!blocked&&!historyRecoveries.some(item=>item.cardId===cardId)&&!reminderRecoveries.some(item=>item.cardId===cardId);
 function safeDraftReady(){const current=runtime.getSnapshot();return isCurrent()&&!!cardId&&current.state.source==='v2'&&current.state.editsAllowed&&!current.state.saving&&!current.state.dirty&&!busy&&!working.current&&!requestRef.current&&!keepsMutationPending(runtime)&&(runtime.pages?.canEditCard(cardId)??true)&&!!current.session?.saved.cards.some(c=>c.kind==='membership'&&c.id===cardId);}
 function draftCurrent(){return isCurrent()&&draftContext.current?.context===context&&draftContext.current.owner===ownerStamp();}
 function mutationAvailable(){const current=runtime.getSnapshot();return isCurrent()&&ready&&inspectionCurrent()&&capabilityCurrent()&&!working.current&&!keepsMutationPending(runtime)&&current.state.source==='v2'&&current.state.editsAllowed&&!current.state.saving&&!current.state.dirty&&runtime.historyDeletion.allowed(cardId)&&(runtime.pages?.canEditCard(cardId)??true);}
 function draftCanRetain(){return draftCurrent()&&mutationAvailable()&&!keepMediaFiles.hasIssues();}
 function draftCanWrite(){return draftCanRetain()&&!keepMediaFiles.isBusy();}
 function draftCanPick(){return draftCurrent()&&safeDraftReady()&&!keepMediaFiles.hasIssues();}
 function openEditor(option:KeepKind){if(motion.isClosing()||!safeDraftReady()||!editorMotion.prepare(`editor:${option}`,'editor'))return;
  draftContext.current={owner:ownerStamp(),context};setKind(option);setView('editor');
 }
 const hasRecovery=historyRecoveries.length>0||reminderRecoveries.length>0;
 const currentRecovery=historyRecoveries.some(item=>item.cardId===cardId)||reminderRecoveries.some(item=>item.cardId===cardId);
 const reviewLabel=hasRecovery||uncertain?'Check recovery status':'Check status';
 const verificationMessage=uncertain?'A previous operation is unconfirmed and needs review before saving.':recordsState==='failed'?'Records could not be loaded. Check status before saving.':inspection==='delayed'?'Verification is taking longer than expected. You can prepare a draft; saving remains locked.':inspection==='stale'||inspection==='verified'&&!inspectionCurrent()?'Verification needs review because its context is no longer current. Check status before making changes.':inspection==='unknown'?'Notification status needs review. Check status before making changes.':undefined;
 const draftMessage=!draftCurrent()?'The wallet context changed. Your draft is preserved. Close this draft and reopen Add Keep before saving.':currentRecovery?'Saved recovery work needs attention. Close this draft to review it before saving.':verificationMessage;
 const needsStatusCheck=keepMediaFiles.hasIssues()||blocked||inspection==='unknown'||inspection==='delayed'||inspection==='stale'||inspection==='verified'&&!inspectionCurrent()||uncertain||hasRecovery;

 function recoveryAdmission(){const start=runtime.getSnapshot();return()=>{const current=runtime.getSnapshot();return isCurrent()&&current.state.source==='v2'&&current.state.editsAllowed&&!current.state.saving&&!current.state.dirty&&current.state.generation===start.state.generation&&current.session?.revision===start.session?.revision;};}
 async function reviewAgain(){
  if(working.current||keepsMutationPending(runtime))return;
  await keepMediaFiles.inspect();
  if(!isCurrent())return;
  setUncertain(false);setNotice('');
  void reload(commands.current).catch(()=>{});refreshInspection();
 }
 function requestRecovery(item:HistoryDeleteIntent|KeepRecoveryIntent,notification:boolean){
  if(working.current||requestRef.current||!canRecover||!admitAction(true))return;
  const id=`recovery-${++sequence.current}`,cancel=()=>{if(working.current||requestRef.current?.id!==id)return;showRequest(null);};
  const description=notification
   ?(item as KeepRecoveryIntent).operation==='complete'?'Verify notification cancellation and finish the saved reminder completion. No reminder will be rescheduled.':'Check the saved deletion and cancel only its notification. If the Keep is still saved, leave it unchanged.'
   :`Review ${'records' in item?item.records.length:0} preserved entries. Restore them only if the parent card still exists; otherwise finish verified deletion cleanup.`;
  showRequest({id,title:'Review recovery?',description,onDismiss:cancel,actions:[{label:'Cancel',role:'primary',onPress:cancel},{label:'Recover',role:'neutral',onPress:async()=>{
   if(!isCurrent()||working.current||requestRef.current?.id!==id||!admitAction(true))return;working.current=true;setBusy(true);showRequest(null);setScheduled(null);const authorize=recoveryAdmission();let recoveryCommands:Commands|null=null;
   const stop=observeKeepsWait(()=>{if(isCurrent())setNotice('Recovery is still unconfirmed. Do not retry while this operation is pending.');});
   try{
    let feedback:string;
    if(notification){const intent=item as KeepRecoveryIntent;
     if(historyRecoveries.some(preserved=>preserved.cardId===intent.cardId))throw Error('Review preserved history for this card before reminder recovery.');
     if(intent.operation==='complete'&&runtime.getSnapshot().session?.saved.cards.some(parent=>parent.kind==='membership'&&parent.id===intent.cardId)){recoveryCommands=createCommands(intent.cardId);await recoveryCommands.load();}
     feedback=await keepRecovery.recover(item.id,recoveryCommands,authorize);
    }else{if(!authorize())throw Error('The wallet session changed. Reopen My Keeps.');feedback=await runtime.historyDeletion.recover(item.id);}
    await reload(commands.current);if(isCurrent())setNotice(feedback);
   }catch(error){if(isCurrent()){block();setNotice(message(error));}}
   finally{stop();recoveryCommands?.close();if(isCurrent()){working.current=false;setBusy(false);showRequest(null);refreshInspection();}}
  }}]});
 }
 const recoveryPanel=<View>
  {needsStatusCheck&&<GlassButton disabled={busy||keepsMutationPending(runtime)} onPress={()=>{void reviewAgain();}} accessibilityLabel={reviewLabel} style={styles.button}><Text style={styles.text}>{reviewLabel}</Text></GlassButton>}
  {historyRecoveries.map(item=><GlassButton key={item.id} disabled={!canRecover} onPress={()=>requestRecovery(item,false)} accessibilityLabel={`Review history recovery ${item.id}`} style={styles.button}><Text style={styles.text}>Review preserved history ({item.records.length})</Text></GlassButton>)}
  {reminderRecoveries.map(item=><GlassButton key={item.id} disabled={!canRecover} onPress={()=>requestRecovery(item,true)} accessibilityLabel={`Review reminder recovery ${item.id}`} style={styles.button}><Text style={styles.text}>{item.operation==='complete'?'Review reminder completion':'Review notification cleanup'}</Text></GlassButton>)}
 </View>;
 const [clock,setClock]=useState(0);
 useEffect(()=>{if(view!=='list'||!doc)return;const next=keepsForCard(doc,cardId).upcoming[0]?.keep?.reminder?.at;if(!next)return;const timer=setTimeout(()=>setClock(Date.now()),Math.min(2147483647,Math.max(1,Date.parse(next)-Date.now()+1)));return()=>clearTimeout(timer);},[doc,view,cardId,clock]);
 const data=useMemo(()=>doc?keepsForCard(doc,cardId):{all:[],upcoming:[]},[doc,cardId,view,clock]);
 const rows:Row[]=recordsState!=='loaded'?[]:[{section:'Upcoming'},...data.upcoming.map(record=>({section:'Upcoming' as const,record})),{section:'Keeps'},...data.all.map(record=>({section:'Keeps' as const,record}))];
 const record=doc?.records.find(r=>r.id===selected&&r.cardId===cardId);
 function close(){if(working.current&&!uncertain)return;if(requestRef.current){requestRef.current.onDismiss();return;}if(view==='detail'){if(!navigation.prepare('list::','list'))return;setSelected(null);setView('list');}else if(view==='chooser'&&origin==='list')setView('list');else {const owner=ownerStamp();motion.close(view==='chooser'?'sheet':'page',()=>isCurrent()&&ownerStamp()===owner&&(!working.current||uncertain)&&!requestRef.current);}}
 function add(){if(motion.isClosing()||!safeDraftReady())return;setOrigin('list');setView('chooser');}
 async function save(form:KeepForm){
  if(!draftCanWrite()||!commands.current||!admitAction())throw new KeepAdmissionBlockedError(draftMessage??'Saving is not ready yet. Your draft is unchanged.');working.current=true;setBusy(true);let result:Awaited<ReturnType<Commands['saveKeep']>>;
  try{result=await commands.current.saveKeep(form);}catch(error){working.current=false;if(isCurrent()){setBusy(false);block();}throw error;}
  let latest=result.document,feedback=result.cleanupPending?'Keep saved. Attachment cleanup needs review.':'';
  const created=latest.records.find(r=>r.id===result.recordId)!;
  if(created.keep?.reminder){const notification=await keepNotifications.schedule(created);
   try{latest=(await commands.current.updateReminder(created.id,{notification})).document;feedback=notification.status==='scheduled'?'Keep saved. Notification scheduled.':notification.status==='denied'?'Keep saved in Upcoming. Notification permission was not granted.':'Keep saved in Upcoming. Notification scheduling was not confirmed.';}
   catch{feedback='Keep saved. Notification status needs review. Reopen My Keeps before continuing.';if(isCurrent())block();}
  }
  try{await inspectRecovery();}catch{feedback='Keep saved. Notification status needs review.';if(isCurrent()){block();setScheduled(null);}}
  working.current=false;if(isCurrent()){setDoc(latest);setNotice(feedback);setBusy(false);setView('list');setOrigin('list');}
 }
 async function complete(){if(!record?.keep?.reminder||!ready||working.current||!commands.current||!admitAction())return;working.current=true;setBusy(true);setScheduled(null);const authorize=recoveryAdmission();
  const stop=observeKeepsWait(()=>{if(isCurrent())setNotice('Reminder completion is still unconfirmed. Do not retry while this operation is pending.');});
  try{const feedback=await keepRecovery.complete(record,commands.current,authorize);await reload(commands.current);if(isCurrent())setNotice(feedback);}
  catch(error){if(isCurrent()){setNotice(message(error));block();}}finally{stop();if(isCurrent()){working.current=false;setBusy(false);refreshInspection();}}
 }
 function remove(){if(!record||!ready||working.current||requestRef.current||!admitAction())return;const target=record,id=`keep-delete-${++sequence.current}`;
  const cancel=()=>{if(!isCurrent()||requestRef.current?.id!==id||working.current)return;showRequest(null);};
  showRequest({id,title:'Delete Keep?',description:`"${keepTitle(target)}"\nThis Keep and its ${target.receipts.length} photo attachments will be permanently removed.`,onDismiss:cancel,actions:[{label:'Cancel',role:'primary',onPress:cancel},{label:'Delete Keep',role:'destructive',onPress:()=>{
   if(!isCurrent()||working.current||requestRef.current?.id!==id||!commands.current||!ready||!admitAction())return;
   const release=admitKeepsMutation(runtime);if(!release)return;
   working.current=true;setBusy(true);showRequest(null);inspectionContext.current=null;setScheduled(null);setInspection('unknown');let expired=false;
   const capability=commands.current;
   const stop=observeKeepsWait(()=>{expired=true;if(isCurrent()){
    setUncertain(true);setBusy(false);block();showRequest(null);
    setNotice('Deletion outcome needs review. Notification cleanup may still be running. No retry was started.');
    // Read-only persisted state; the mutation capability may still be busy.
    void deviceHistoryRepository.load().then(value=>{if(isCurrent()){setDoc(value);setRecordsState('loaded');setSelected(null);setView('list');}},()=>{});
   }});
   return capability.deleteKeep(target.id).then(saved=>{if(isCurrent()){
    setDoc(saved.document);setRecordsState('loaded');setSelected(null);setView('list');
    setNotice(expired?'Deletion finished waiting. Check recovery status before making changes.':saved.cleanupPending?'Keep removed. Photo or notification cleanup needs review.':'Keep removed.');
    if(saved.cleanupPending||expired)block();
   }}).catch(error=>{if(isCurrent()){setNotice(message(error));block();}}).finally(()=>{
    stop();release();
    if(isCurrent()){working.current=false;setBusy(false);showRequest(null);if(!expired)refreshInspection();}
   });
  }}]});
 }
 if(photo)return <ReceiptViewer context="photo" receipt={photo} onClose={()=>setPhoto(null)}/>;
 if(view==='editor')return <KeepEditor contentMotion={editorMotion.presentation} key={kind} cardId={cardId} kind={kind} access={{canSave:draftCanWrite(),canUseArtwork:draftCanPick(),canPick:draftCanPick,canWrite:draftCanWrite,canRetain:draftCanRetain,message:draftMessage,messageTone:inspection==='delayed'&&draftCurrent()&&!currentRecovery&&!uncertain&&recordsState!=='failed'?'info':'error',onReview:needsStatusCheck&&!draftCanWrite()&&draftCurrent()&&!currentRecovery?()=>{void reviewAgain();}:undefined,reviewLabel}} onSave={save} onCancel={feedback=>{if(isCurrent()&&editorMotion.prepare('chooser','chooser')){draftContext.current=null;setNotice(feedback??'');setView('chooser');}}}/>;
 if(view==='chooser')return <AddCardSheet modalOnly keepsContentMotion={editorMotion.presentation} keepsMotion={motion.sheet} title="Add Keep" onClose={close} closeDisabled={busy} confirmation={request?{content:<ConfirmationDialog presentation="inline" request={request} busy={busy}/>,onRequestClose:close}:undefined} footer={<>{!!notice&&<Text accessibilityRole="alert" style={[styles.notice,blocked&&styles.error]}>{notice}</Text>}{verificationMessage&&<Text style={styles.notice}>{verificationMessage}</Text>}{recoveryPanel}</>}>
  <View style={styles.choices}>
   <Pressable accessibilityRole="button" accessibilityLabel="All-in-One" disabled={!safeDraftReady()} onPress={()=>openEditor('full')} style={styles.fullChoice}><View style={styles.fullIcon}><AddCardIcon name="keep" color="#fff" size={30}/></View><View style={{flex:1}}><Text style={styles.title}>All-in-One</Text><Text style={styles.text}>Add photos, notes &amp; reminders</Text></View><AddCardIcon name="chevron" size={22}/></Pressable>
   <View style={styles.choiceGrid}>{(['reminder','gallery','note','camera'] as const).map(option=><Pressable key={option} accessibilityRole="button" accessibilityLabel={option[0].toUpperCase()+option.slice(1)} disabled={!safeDraftReady()} onPress={()=>openEditor(option)} style={styles.choice}><AddCardIcon name={option==='reminder'?'bell':option==='gallery'?'image':option==='note'?'note':'camera'} color={ciColors.action.primary} size={36}/><Text style={styles.title}>{option[0].toUpperCase()+option.slice(1)}</Text></Pressable>)}</View>
  </View>
 </AddCardSheet>;
 const detail=record&&view==='detail';
 const inspectionNeedsReview=!busy&&(inspection==='unknown'||inspection==='stale'||inspection==='delayed'||inspection==='verified'&&!inspectionCurrent());
 const notificationLabel=record?reminderNotificationLabel(record,reminderRecoveries,scheduled,busy?'checking':inspectionNeedsReview?'unknown':inspection==='verified'?'verified':'checking'):'';
 const showNotificationLabel=!!notificationLabel&&(!inspectionNeedsReview||reminderRecoveries.some(item=>item.recordId===record?.id));
 const content=<View style={{flex:1}} pointerEvents={request?'none':'auto'} accessibilityElementsHidden={!!request} importantForAccessibility={request?'no-hide-descendants':'auto'}>
  <View style={styles.header}><Pressable accessibilityRole="button" accessibilityLabel="Back" disabled={busy&&!uncertain} onPress={close} style={styles.hit}><BememIcon name="chevron-left" color={ciColors.text.primary}/></Pressable><Text accessibilityRole="header" style={styles.heading}>{detail?'Keep':'My Keeps'}</Text>{!detail&&!!cardId&&<Pressable accessibilityRole="button" accessibilityLabel="Add Keep" disabled={!safeDraftReady()} onPress={add} style={styles.hit}><AddCardIcon name="plus" color={ciColors.action.primary} size={30}/></Pressable>}</View>
  {!!notice&&<Text accessibilityRole="alert" style={[styles.notice,blocked&&styles.error]}>{notice}</Text>}
  {recordsState==='failed'&&<Text accessibilityRole="alert" style={styles.notice}>Records could not be loaded. Check status to try reading again.</Text>}
  {inspectionNeedsReview&&<Text accessibilityRole={inspection==='delayed'?undefined:'alert'} style={styles.notice}>{verificationMessage}</Text>}
  {keepsMutationPending(runtime)&&!busy&&<Text style={styles.notice}>An earlier operation is still pending. Read-only viewing is available.</Text>}
  {navigation.render(detail?<FlatList data={record.receipts} keyExtractor={image=>image.id} initialNumToRender={4} maxToRenderPerBatch={4} windowSize={3} ListHeaderComponent={<View style={styles.detail}>{recoveryPanel}<Text style={styles.title}>{keepTitle(record)}</Text><Text style={styles.muted}>{localHistoryTimestamp(record)}</Text>{!!record.notes&&<Text selectable style={styles.text}>{record.notes}</Text>}{!!record.description&&<Text selectable style={styles.text}>{record.description}</Text>}{!!record.money&&<Text style={styles.text}>{record.money.currency} {amountInput(record.money)}</Text>}{record.entryKind!=='keep'&&<Text style={styles.muted}>{record.type} {'\u00b7'} {record.date} {record.time}</Text>}{record.keep?.reminder&&<><Text style={styles.text}>{new Date(record.keep.reminder.at).toLocaleString()}</Text>{showNotificationLabel&&<Text style={styles.muted}>{notificationLabel}</Text>}{record.keep.reminder.state==='pending'&&<GlassButton disabled={!ready} onPress={()=>{void complete();}} accessibilityLabel="Mark complete" style={styles.button}><Text style={styles.text}>Mark complete</Text></GlassButton>}</>}</View>}
    renderItem={({item,index})=><Pressable accessibilityRole="button" accessibilityLabel={`Open photo ${index+1}`} disabled={busy} onPress={()=>setPhoto(item)} style={styles.photoRow}><KeepThumbnail image={item}/><Text style={styles.text}>Photo {index+1}</Text><AddCardIcon name="fullscreen" size={20}/></Pressable>}
    ListFooterComponent={<Pressable accessibilityRole="button" accessibilityLabel="Delete Keep" disabled={!ready} onPress={remove} style={styles.button}><Text style={styles.destructive}>Delete Keep</Text></Pressable>}/>
   :<FlatList ListHeaderComponent={recoveryPanel} data={rows} keyExtractor={(item,index)=>item.record?item.section+item.record.id:item.section+index} initialNumToRender={6} maxToRenderPerBatch={4} windowSize={3} removeClippedSubviews contentContainerStyle={styles.list}
    renderItem={({item})=>!item.record?<View style={styles.section}><AddCardIcon name={item.section==='Upcoming'?'bell':'keep'} size={24} color={ciColors.action.primary}/><Text style={styles.title}>{item.section}{item.section==='Keeps'?` (${data.all.length})`:''}</Text>{item.section==='Upcoming'&&!data.upcoming.length&&<Text style={styles.muted}>No upcoming reminders</Text>}{item.section==='Keeps'&&!data.all.length&&<Text style={styles.muted}>No Keeps yet</Text>}</View>:<Pressable accessibilityRole="button" accessibilityLabel={`Open Keep ${keepTitle(item.record)}`} disabled={busy} onPress={()=>{if(!isCurrent()||motion.isClosing()||!navigation.prepare(`detail:${item.record!.id}:`,'detail'))return;setSelected(item.record!.id);setView('detail');}} style={[styles.item,item.section==='Upcoming'&&styles.upcoming]}>
     <KeepThumbnail image={item.record.receipts[0]} kind={item.record.keep?.kind}/><View style={styles.summary}><Text numberOfLines={2} style={styles.itemTitle}>{keepTitle(item.record)}</Text><Text numberOfLines={2} style={styles.muted}>{item.record.notes||item.record.description||localHistoryTimestamp(item.record)}</Text></View><Text style={styles.date}>{item.section==='Upcoming'?new Date(item.record.keep!.reminder!.at).toLocaleString():new Date(item.record.createdAt).toLocaleDateString()}</Text><View style={styles.chevronRight}><AddCardIcon name="chevron" size={20}/></View>
    </Pressable>}/>
  )}
  </View>;
 const surface=<SafeAreaView style={styles.screen}>{motion.renderPage(content)}<ConfirmationDialog presentation="inline" request={request} busy={busy}/></SafeAreaView>;
 return <Modal visible transparent animationType="none" onShow={motion.onPageShow} statusBarTranslucent navigationBarTranslucent onRequestClose={close}>{surface}</Modal>;
}
export function KeepThumbnail({image,kind}:{image?:Receipt;kind?:KeepKind}){return <View style={styles.thumbnail}>{image?<CardArtworkImage image={image} sourceUri={receiptUri(image.assetId)} displayPreview="detail"/>:<AddCardIcon name={kind==='reminder'?'bell':kind==='note'?'note':'keep'} size={28} color={ciColors.action.primary}/>}</View>;}
function message(error:unknown){return error instanceof Error?error.message:'Keeps could not be confirmed. Reopen My Keeps before continuing.';}
const styles=StyleSheet.create({screen:{flex:1,backgroundColor:'#fff'},header:{flexDirection:'row',alignItems:'center',paddingHorizontal:12,minHeight:64},hit:{width:48,height:48,alignItems:'center',justifyContent:'center'},chevronRight:{width:20,height:20,flexShrink:0,transform:[{rotate:'-90deg'}]},heading:{...ciTypography.title,flex:1,color:ciColors.text.primary},title:{...ciTypography.section,color:ciColors.text.primary},text:{...ciTypography.body,color:ciColors.text.primary},muted:{...ciTypography.supporting,color:ciColors.text.secondary},notice:{...ciTypography.body,color:ciColors.text.secondary,padding:16},error:{color:ciColors.status.error},list:{padding:16,paddingBottom:32,gap:10},section:{flexDirection:'row',flexWrap:'wrap',gap:10,alignItems:'center',padding:12,marginTop:8,backgroundColor:'#e8f8f4',borderRadius:18,minHeight:56},item:{flexDirection:'row',gap:10,alignItems:'center',padding:12,minHeight:88,backgroundColor:ciButtons.neutral,borderRadius:18,borderWidth:1,borderColor:'#e6efed'},upcoming:{backgroundColor:'#f1fbf8'},thumbnail:{width:56,height:56,borderRadius:12,overflow:'hidden',backgroundColor:'#e1eeeb',alignItems:'center',justifyContent:'center'},summary:{flex:1,minWidth:0},itemTitle:{...ciTypography.button,color:ciColors.text.primary},date:{...ciTypography.supporting,color:ciColors.action.primary,maxWidth:88},detail:{padding:20,gap:14},photoRow:{minHeight:80,marginHorizontal:20,padding:10,flexDirection:'row',gap:12,alignItems:'center'},button:{minHeight:48,padding:12,margin:12,borderRadius:14},destructive:{...ciTypography.button,color:ciColors.action.destructive,textAlign:'center'},choices:{gap:16},fullChoice:{flexDirection:'row',gap:16,alignItems:'center',padding:18,borderRadius:22,backgroundColor:ciButtons.secondary,minHeight:104},fullIcon:{width:56,height:56,borderRadius:16,backgroundColor:ciColors.action.primary,alignItems:'center',justifyContent:'center'},choiceGrid:{flexDirection:'row',flexWrap:'wrap',gap:12},choice:{width:'47%',flexGrow:1,minHeight:132,padding:16,borderRadius:22,backgroundColor:ciButtons.neutral,borderWidth:1,borderColor:'#dce9e5',alignItems:'center',justifyContent:'center',gap:14}});
