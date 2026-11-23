import {useEffect,useRef,useState} from 'react';
import {Keyboard,Pressable,StyleSheet,Text,TextInput,View} from 'react-native';
import {Image} from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import {uuid} from 'expo';
import {AddCardSheet} from './AddCardSheet';
import type {KeepsContentMotion} from './keeps-editor-motion';
import {ReminderScheduleFields} from './ReminderScheduleFields';
import {initialReminderSelection} from '../../lib/reminder-calendar';
import {GlassButton} from './GlassButton';
import {AddCardIcon} from './AddCardIcon';
import {ConfirmationDialog,type ConfirmationRequest} from './ConfirmationDialog';
import {CardArtworkImage} from './CardArtworkImage';
import {keepMediaFiles,receiptUri} from '../../lib/card-history-native';
import {selectKeepReceipt} from '../../lib/receipt-picker';
import type {KeepMediaInput} from '../../lib/keep-media-files';
import {prepareKeep,reminderInstant,type KeepKind,type KeepForm} from '../../lib/keeps';
import {ciColors,ciTypography} from '../../constants/ci-theme';
import {KeepAdmissionBlockedError,admitKeepPicker,subscribeKeepPicker,observeKeepsWait,type KeepDraftAccess} from './keeps-lifecycle';
export function KeepEditor({kind,cardId,onCancel,onSave,access,contentMotion}:{contentMotion?:KeepsContentMotion;kind:KeepKind;cardId:string;access?:KeepDraftAccess;onCancel:(message?:string)=>void;onSave:(form:KeepForm)=>Promise<void>}){
 const latest=useRef({access,onSave});latest.current={access,onSave};
 const canWrite=()=> (latest.current.access?.canWrite()??true)&&!keepMediaFiles.hasIssues();
 const canRetain=()=> (latest.current.access?.canRetain?.()??latest.current.access?.canWrite()??true)&&!keepMediaFiles.hasIssues();
 const canPick=()=>latest.current.access?.canPick?.()??(latest.current.access?.canUseArtwork!==false);
 const [initialSchedule]=useState(()=>initialReminderSelection(new Date()));
 const [scheduleBusy,setScheduleBusy]=useState(false),wheelMoving=useRef(false);
 const [form,setForm]=useState<KeepForm>({kind,note:'',images:[]}),[title,setTitle]=useState(''),[date,setDate]=useState(initialSchedule.date),[time,setTime]=useState(initialSchedule.time),[reminder,setReminder]=useState(kind==='reminder');
 const [needsReview,setNeedsReview]=useState(false);
 const [staged,setStaged]=useState<KeepMediaInput|null>(null),selection=useRef<{input:KeepMediaInput;attempted:boolean}|null>(null);
 const [pickerVersion,setPickerVersion]=useState(0),saveAttempted=useRef(false);
 async function releasePhotos(images:KeepForm['images']){for(const {id,...artwork} of images)await keepMediaFiles.release(artwork);}

 const [busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[request,setRequest]=useState<ConfirmationRequest|null>(null);
 const active=useRef(true),working=useRef(false),started=useRef(false),confirming=useRef(false),sequence=useRef(0),current=useRef(form);current.current=form;
 useEffect(()=>{active.current=true;return()=>{active.current=false;selection.current=null;
  if(!saveAttempted.current&&!keepMediaFiles.isBusy())void releasePhotos(current.current.images).catch(()=>{/* Exact evidence remains in keepMediaFiles for review. */});
 };},[]);
 useEffect(()=>{const refresh=()=>{if(active.current)setPickerVersion(v=>v+1);};const unpick=subscribeKeepPicker(refresh),unfile=keepMediaFiles.subscribe(refresh);return()=>{unpick();unfile();};},[]);
 function wheelBusy(value:boolean){if(!active.current)return;wheelMoving.current=value;setScheduleBusy(value);}
 async function retainSelection(){
  const selected=selection.current;
  if(!selected||selected.attempted||working.current||!active.current||!canPick()||!canRetain())return;
  selected.attempted=true;working.current=true;setBusy(true);
  const stop=observeKeepsWait(()=>{if(active.current)setNotice('Photo storage is still pending. No Keep has been saved. Do not retry.');});
  try{
   const image=await keepMediaFiles.retain(selected.input,()=>active.current&&selection.current===selected&&canPick()&&canRetain());
   if(!active.current||selection.current!==selected||!canPick()||!canRetain()){await keepMediaFiles.release(image);return;}
   const receipt={...image,id:uuid.v4()};
   current.current={...current.current,images:[...current.current.images,receipt]};setForm(current.current);
   selection.current=null;setStaged(null);setNotice('');
  }catch(error){if(active.current)setNotice(error instanceof Error?error.message:'Photo retention was not confirmed.');}
  finally{stop();working.current=false;if(active.current)setBusy(false);else if(!saveAttempted.current)void releasePhotos(current.current.images).catch(()=>{});}
 }
 async function pick(camera:boolean){
  if(working.current||!active.current||confirming.current||needsReview||current.current.images.length>=4||keepMediaFiles.isBusy()||!canPick())return;
  const release=admitKeepPicker();if(!release)return;
  started.current=true;working.current=true;setBusy(true);setNotice('');Keyboard.dismiss();
  const stop=observeKeepsWait(()=>{if(active.current)setNotice('The photo picker is still pending. No Keep has been saved.');});
  try{
   const input=await selectKeepReceipt(camera,{active:()=>active.current&&canPick(),cameraPermission:async()=>(await ImagePicker.requestCameraPermissionsAsync()).granted,
    pick:useCamera=>{const options:ImagePicker.ImagePickerOptions={mediaTypes:['images'],allowsEditing:false,quality:1,base64:false,exif:false,preferredAssetRepresentationMode:ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible};return useCamera?ImagePicker.launchCameraAsync(options):ImagePicker.launchImageLibraryAsync(options);}});
   if(input&&active.current&&canPick()){selection.current={input,attempted:false};setStaged(input);}
  }catch(error){if(active.current)setNotice(error instanceof Error?error.message:'Photo selection failed. No Keep was saved.');}
  finally{stop();working.current=false;release();if(active.current){setBusy(false);void retainSelection();}}
 }
 useEffect(()=>{if(!started.current&&(kind==='camera'||kind==='gallery')&&canPick())void pick(kind==='camera');},[kind,access?.canUseArtwork,pickerVersion]);
 useEffect(()=>{void retainSelection();},[staged,access?.canSave]);
 async function discard(){if(working.current||!active.current)return;working.current=true;setBusy(true);let message:string|undefined;
  try{selection.current=null;setStaged(null);await releasePhotos(current.current.images);current.current={...current.current,images:[]};}catch{message='No Keep was saved. Temporary photo cleanup needs review.';}
  if(active.current)onCancel(message);
 }
 function close(){
  if(working.current||confirming.current)return;
  if(!needsReview&&!form.note&&!form.images.length&&!selection.current&&!title&&(!reminder||(date===initialSchedule.date&&time===initialSchedule.time))){onCancel();return;}
  const id=`keep-discard-${++sequence.current}`;confirming.current=true;
  const keep=()=>{if(!active.current||sequence.current!==Number(id.split('-').at(-1))||!confirming.current)return;confirming.current=false;setRequest(null);};
  setRequest({id,title:needsReview?'Close without retry?':'Discard this Keep?',description:needsReview?'Saving was not confirmed. Closing will not retry or remove photos. Reopen My Keeps to review.':'Your unsaved photos, note and reminder will not be saved.',onDismiss:keep,actions:[{label:'Keep Editing',role:'primary',onPress:keep},{label:needsReview?'Close without retry':'Discard Changes',role:'destructive',onPress:()=>{if(!active.current||!confirming.current||id!==`keep-discard-${sequence.current}`)return;keep();if(needsReview){onCancel('Save was not confirmed. Reload My Keeps before continuing.');return;}return discard();}}]});
 }
 async function save(){if(working.current||confirming.current||wheelMoving.current||needsReview||!!selection.current||!active.current)return;if(!canWrite()||keepMediaFiles.isBusy()){setNotice(latest.current.access?.message??'Saving is not ready yet. Your draft is unchanged.');return;}let submitted:KeepForm;
  try{if(reminder&&!title.trim())throw Error('Add a reminder note.');submitted={...form,...(reminder?{reminder:{title,at:reminderInstant(date,time)}}:{})};prepareKeep(submitted,cardId,'validation-only',new Date().toISOString());}catch(error){setNotice(error instanceof Error?error.message:'Add a photo, note or reminder.');return;}
  working.current=true;setBusy(true);setNotice('');Keyboard.dismiss();
  saveAttempted.current=true;
  try{await latest.current.onSave(submitted);keepMediaFiles.saved(submitted.images.map(({id,...image})=>image));}catch(error){if(error instanceof KeepAdmissionBlockedError)saveAttempted.current=false;if(active.current){setNotice(error instanceof Error?error.message:'Save was not confirmed. Reopen My Keeps before continuing.');if(!(error instanceof KeepAdmissionBlockedError))setNeedsReview(true);setBusy(false);}working.current=false;return;}
 }
 const photoMode=kind==='gallery'||kind==='camera';
 return <AddCardSheet modalOnly keepsContentMotion={contentMotion} fixedFooter={kind==='reminder'} contentScrollEnabled={!scheduleBusy} title={kind==='full'?'Add Keep':kind==='note'?'Note':kind==='reminder'?'Set Reminder':kind==='camera'?'Camera':'Gallery'} onClose={close} closeDisabled={busy}
  confirmation={request?{content:<ConfirmationDialog presentation="inline" request={request}/>,onRequestClose:request.onDismiss}:undefined}
  footer={<View style={styles.gap}>{access?.message&&<Text style={access.messageTone==='info'?styles.text:styles.error}>{access.message}</Text>}{access?.onReview&&<GlassButton accessibilityLabel={access.reviewLabel??'Check status'} disabled={busy} onPress={()=>{if(!working.current)access.onReview?.();}} style={styles.button}><Text style={styles.text}>{access.reviewLabel??'Check status'}</Text></GlassButton>}{keepMediaFiles.hasIssues()&&<Text style={styles.error}>Photo storage needs review. Saving remains locked; no file will be retried automatically.</Text>}{staged&&!busy&&!notice&&<Text style={styles.text}>Photo selected temporarily. Waiting for safe storage before saving.</Text>}{!!notice&&<Text accessibilityRole="alert" style={styles.error}>{notice}</Text>}<GlassButton kind="action" accessibilityLabel={kind==='reminder'?'Set Reminder':'Save Keep'} disabled={busy||needsReview||!!staged||keepMediaFiles.isBusy()||keepMediaFiles.hasIssues()||scheduleBusy||access?.canSave===false} onPress={()=>{void save();}} style={styles.button}><Text style={styles.white}>{busy?'Working...':kind==='reminder'?'Set Reminder':'Save'}</Text></GlassButton><GlassButton accessibilityLabel="Cancel Keep" disabled={busy} onPress={close} style={styles.button}><Text style={styles.text}>Cancel</Text></GlassButton></View>}>
  <View style={styles.gap}>
   {(kind==='full'||photoMode)&&<><View style={styles.photos}>{form.images.map((image,index)=><View key={image.id} style={styles.photo}><CardArtworkImage image={image} sourceUri={receiptUri(image.assetId)} displayPreview="editor"/><Text style={styles.photoLabel}>{index+1}</Text></View>)}{staged&&<View style={styles.photo}><Image source={{uri:staged.uri}} style={{width:'100%',height:'100%'}} contentFit="contain" allowDownscaling transition={0} onError={()=>{if(active.current&&selection.current?.input===staged){selection.current.attempted=true;setNotice('The temporary photo is unavailable. Please select it again.');}}}/></View>}</View>
    {form.images.length<4&&<View style={styles.row}><GlassButton accessibilityLabel="Gallery" disabled={busy||needsReview||access?.canUseArtwork===false} onPress={()=>{void pick(false);}} style={styles.photoButton}><AddCardIcon name="image" size={24}/><Text style={styles.text}>Gallery</Text></GlassButton><GlassButton accessibilityLabel="Camera" disabled={busy||needsReview||access?.canUseArtwork===false} onPress={()=>{void pick(true);}} style={styles.photoButton}><AddCardIcon name="camera" size={24}/><Text style={styles.text}>Camera</Text></GlassButton></View>}
   </>}
   {(kind==='full'||kind==='note')&&<TextInput accessibilityLabel="Keep note" placeholder="Write a note" multiline maxLength={100000} editable={!busy&&!needsReview} value={form.note} onChangeText={note=>setForm(previous=>({...previous,note}))} style={[styles.input,styles.note]}/>}
   {kind==='full'&&<Pressable accessibilityRole="checkbox" accessibilityLabel="Add reminder" accessibilityState={{checked:reminder}} disabled={busy||needsReview} onPress={()=>{wheelBusy(false);setReminder(value=>!value);}} style={styles.toggle}><AddCardIcon name="bell" size={24}/><Text style={styles.text}>{reminder?'Reminder':'Add reminder'}</Text></Pressable>}
   {reminder&&<><ReminderScheduleFields date={date} time={time} disabled={busy||needsReview||!!request} onDateChange={setDate} onTimeChange={setTime} onBusy={wheelBusy}/><View style={styles.noteHeading}><AddCardIcon name="note" color={ciColors.action.primary} size={22}/><Text style={styles.noteTitle}>{kind==='reminder'?'Note':'Reminder note'}</Text></View><TextInput accessibilityLabel="Reminder message" placeholder="What should I remind you about?" maxLength={240} multiline editable={!busy&&!needsReview} value={title} onChangeText={setTitle} style={[styles.input,styles.reminderNote]}/></>}
  </View>
 </AddCardSheet>;
}
const styles=StyleSheet.create({gap:{gap:12},row:{flexDirection:'row',gap:12},button:{minHeight:48,padding:12,borderRadius:14},text:{...ciTypography.body,color:ciColors.text.primary},white:{...ciTypography.button,color:ciColors.text.onAction},error:{...ciTypography.body,color:ciColors.status.error},input:{...ciTypography.body,color:ciColors.text.primary,backgroundColor:'#fff',borderWidth:1,borderColor:'#cbdcda',borderRadius:16,minHeight:52,padding:14},noteHeading:{flexDirection:'row',alignItems:'center',gap:8},noteTitle:{...ciTypography.section,color:ciColors.text.primary},reminderNote:{minHeight:80,textAlignVertical:'top'},note:{minHeight:120,textAlignVertical:'top'},toggle:{minHeight:48,flexDirection:'row',gap:10,alignItems:'center'},photos:{flexDirection:'row',gap:8,flexWrap:'wrap'},photo:{width:112,height:112,borderRadius:14,overflow:'hidden'},photoLabel:{position:'absolute',bottom:4,right:6,color:'#fff'},photoButton:{flex:1,minHeight:56,borderRadius:14}});
