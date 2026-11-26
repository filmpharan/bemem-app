import {useEffect,useRef,useState} from 'react';
import {Keyboard,Modal,StyleSheet,Text,View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import type {MembershipCard} from '../../types/membership-card';
import type {Receipt} from '../../lib/card-history';
import {createNativeKeepDraft} from '../../lib/keep-draft-native';
import type {KeepDraftSession} from '../../lib/keep-draft-session';
import {reminderNotificationLabel} from '../../lib/keep-recovery';
import {AddKeepSheet} from './AddKeepSheet';
import {MyKeepsScreen} from './MyKeepsScreen';
import {KeepDetailScreen} from './KeepDetailScreen';
import {ReceiptViewer} from './ReceiptViewer';
import {GlassButton} from './GlassButton';
import {ConfirmationDialog,type ConfirmationRequest} from './ConfirmationDialog';
import {useKeepsController} from './useKeepsController';
import {useKeepsOuterMotion} from './keeps-motion';
import {useKeepsNavigationMotion} from './keeps-navigation-motion';
import {keepsMutationPending} from './keeps-lifecycle';
import {ciColors,ciTypography} from '../../constants/ci-theme';

/** One live Keeps presentation. Domain/session modules retain the actual write authority. */
export function KeepsFeature({card,onClose,initialAdd=false,initialKeepId}:{card?:Readonly<MembershipCard>;onClose:()=>void;initialAdd?:boolean;initialKeepId?:string}){
 const access=useKeepsController(card?.id??''),latest=useRef(access);latest.current=access;
 const [route,setRoute]=useState<'list'|'detail'|'add'>(initialAdd?'add':initialKeepId?'detail':'list');
 const [selected,setSelected]=useState<string|null>(initialKeepId??null),[photo,setPhoto]=useState<Receipt|null>(null);
 const [draft,setDraft]=useState<KeepDraftSession|null>(null),draftRef=useRef<KeepDraftSession|null>(null),draftOwner=useRef<string|null>(null);
 const [origin,setOrigin]=useState<'card'|'list'>(initialAdd?'card':'list'),[request,setRequest]=useState<ConfirmationRequest|null>(null);
 const requestRef=useRef(request);requestRef.current=request;
 const [reveal,setReveal]=useState<string|null>(null),offset=useRef(0),sequence=useRef(0);
 const hostContext=access.context;
 const motion=useKeepsOuterMotion(hostContext,`${route}:${selected??''}:${photo?.id??''}`,onClose);
 const navigation=useKeepsNavigationMotion(hostContext,`${route}:${selected??''}:${photo?.id??''}`,access.stamp(),true);
 function openDraft(from:'card'|'list'){
  if(draftRef.current||!card||!latest.current.canPick())return;
  const start=latest.current.stamp(),context=latest.current.context;
  const current=()=>latest.current.context===context&&latest.current.stamp()===start;
  const value=createNativeKeepDraft({cardId:card.id,access:{canPick:()=>current()&&latest.current.canPick(),canRetain:()=>current()&&latest.current.canRetain(),canWrite:()=>current()&&latest.current.canWrite()},save:(form,confirmed)=>current()?latest.current.save(form,confirmed):Promise.resolve({kind:'not-started',message:'The wallet context changed. Your draft is preserved.'})});
  draftOwner.current=start;draftRef.current=value;setDraft(value);setOrigin(from);setRoute('add');
 }
 const initialize=useRef({initialAdd,openDraft});initialize.current={initialAdd,openDraft};
 useEffect(()=>{if(initialize.current.initialAdd)initialize.current.openDraft('card');return()=>{draftRef.current?.close();draftRef.current=null;};},[hostContext]);
 useEffect(()=>{draftRef.current?.refresh();},[access.document,access.inspection,access.busy,access.snapshot]);
 function close(){
  if(requestRef.current){if(!access.busy){setRequest(null);}return;}
  if(Keyboard.isVisible?.()){Keyboard.dismiss();return;}
  if(access.busy&&!access.uncertain)return;
  if(photo){setPhoto(null);return;}
  if(route==='detail'){if(navigation.prepare('list::','list')){setRoute('list');setSelected(null);}return;}
  motion.close('page',()=>latest.current.live()&&(!latest.current.busy||latest.current.uncertain));
 }
 function confirm(title:string,description:string,label:string,operation:()=>Promise<unknown>){
  if(requestRef.current||access.busy)return;
  const id=`keep-action-${++sequence.current}`,context=access.context,stamp=access.stamp();
  const valid=()=>latest.current.context===context&&latest.current.stamp()===stamp&&requestRef.current?.id===id;
  const cancel=()=>{if(valid())setRequest(null);};
  const value:ConfirmationRequest={id,title,description,onDismiss:cancel,actions:[{label:'Cancel',role:'primary',onPress:cancel},{label,role:label==='Delete Keep'?'destructive':'neutral',onPress:async()=>{if(!valid())return;setRequest(null);await operation();}}]};
  requestRef.current=value;setRequest(value);
 }
 const record=access.document?.records.find(r=>r.id===selected&&r.cardId===card?.id);
 const recovery=<View style={styles.recovery}>
  {access.needsReview&&<GlassButton accessibilityLabel="Review Keeps status" disabled={access.busy||keepsMutationPending(access.runtime)} onPress={()=>{void access.review();}} style={styles.button}><Text style={styles.label}>Review status</Text></GlassButton>}
  {access.historyRecovery.map(item=><GlassButton key={item.id} accessibilityLabel={`Review history recovery ${item.id}`} disabled={access.busy||access.inspection!=='verified'} onPress={()=>confirm('Review preserved history?',`Review ${item.records.length} preserved entries using the existing recovery process. Nothing will be retried automatically.`,'Recover',()=>access.recover(item,false))} style={styles.button}><Text style={styles.label}>Review preserved history ({item.records.length})</Text></GlassButton>)}
  {access.reminderRecovery.map(item=><GlassButton key={item.id} accessibilityLabel={`Review reminder recovery ${item.id}`} disabled={access.busy||access.inspection!=='verified'} onPress={()=>confirm('Review reminder recovery?','Verify the saved operation and notification cancellation. No reminder will be rescheduled.','Recover',()=>access.recover(item,true))} style={styles.button}><Text style={styles.label}>{item.operation==='complete'?'Review reminder completion':'Review notification cleanup'}</Text></GlassButton>)}
 </View>;
 if(photo)return <ReceiptViewer context="photo" receipt={photo} onClose={()=>setPhoto(null)}/>;
 if(route==='add'&&draft)return <AddKeepSheet draft={draft} cardName={card?.name??'Card'} onReview={()=>{void access.review();}} onClose={()=>{
  const old=draftRef.current;if(old!==draft)return;const committed=old.getSnapshot().historyConfirmed;old.close();draftRef.current=null;setDraft(null);
  if(committed&&draftOwner.current===latest.current.stamp()){setReveal(latest.current.confirmedRecordId());setRoute('list');}else if(origin==='card'||draftOwner.current!==latest.current.stamp())onClose();else setRoute('list');
 }} onSaved={saved=>{
  if(draftRef.current!==draft||!latest.current.live()||draftOwner.current!==latest.current.stamp())return;
  draft.close();draftRef.current=null;setDraft(null);setReveal(saved.recordId);setSelected(null);setRoute('list');
 }}/>;
 const content=route==='detail'&&record?<KeepDetailScreen record={record} cardName={card?.name??'Card'} notificationLabel={reminderNotificationLabel(record,access.reminderRecovery,access.scheduled,access.inspection==='verified'?'verified':access.inspection==='checking'?'checking':'unknown')} canMutate={access.canMutate()} busy={access.busy} notice={access.notice} recovery={recovery}
  onBack={close} onClose={()=>{if(!access.busy||access.uncertain)onClose();}} onPhoto={setPhoto}
  onComplete={()=>{void access.mutate(record,'complete');}}
  onDelete={()=>confirm('Delete this Keep?',`This Keep and its ${record.receipts.length} photo attachments will be permanently removed. Other Keeps remain unchanged.`,'Delete Keep',()=>access.mutate(record,'delete'))}/>
  :<MyKeepsScreen cardId={card?.id??''} cardName={card?.name??'Recovery only'} document={access.document} loadState={access.loadState} reviewIds={access.reviewIds} notice={route==='detail'&&!record&&access.loadState==='loaded'?'This Keep is no longer available.':access.notice} recovery={recovery} canAdd={!!card&&access.canPick()} onAdd={()=>openDraft('list')} onBack={close} onOpen={id=>{if(navigation.prepare(`detail:${id}:`,'detail')){setSelected(id);setRoute('detail');}}} revealId={reveal} onRevealConsumed={()=>setReveal(null)} scrollOffset={offset.current} onScrollOffset={v=>{offset.current=v;}}/>;
 return <Modal visible transparent animationType="none" statusBarTranslucent navigationBarTranslucent onShow={motion.onPageShow} onRequestClose={close}>
  <SafeAreaView style={styles.screen}>{motion.renderPage(<View style={styles.screen} pointerEvents={request?'none':'auto'} accessibilityElementsHidden={!!request} importantForAccessibility={request?'no-hide-descendants':'auto'}>{navigation.render(content)}</View>)}<ConfirmationDialog presentation="inline" request={request} busy={access.busy}/></SafeAreaView>
 </Modal>;
}
const styles=StyleSheet.create({screen:{flex:1,backgroundColor:ciColors.surface.sheet},recovery:{gap:8},button:{minHeight:48,padding:12,borderRadius:14},label:{...ciTypography.button,color:ciColors.action.primary}});
