import { ciColors,ciTypography,ciButtons,ciStates,fontForUiText } from '../../constants/ci-theme';
import { useEffect,useRef,useState,type ComponentRef,type RefObject } from 'react';
import { AccessibilityInfo,ActivityIndicator,Keyboard,Modal,Pressable,ScrollView,StyleSheet,Text,View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { lagoon } from '../../constants/lagoon-theme';

export type ConfirmationAction={label:string;role:'primary'|'neutral'|'destructive';disabled?:boolean;onPress:()=>unknown|Promise<unknown>};
export type ConfirmationRequest={id:string;title:string;description:string;actions:readonly ConfirmationAction[];onDismiss:()=>void};
type Props={request:ConfirmationRequest|null;busy?:boolean;presentation?:'modal'|'inline'};
/** Presentation only. Callers own mutations, outcomes and closing decisions. */
export function ConfirmationDialog({request,busy=false,presentation='modal'}:Props){
 const dismissRef=useRef<(()=>void)|null>(null);
 if(!request)return null;
 const content=<ConfirmationSurface key={request.id} request={request} busy={busy} dismissRef={dismissRef}/>;
 return presentation==='inline'?content:<Modal visible transparent animationType="none" statusBarTranslucent navigationBarTranslucent
  onRequestClose={()=>dismissRef.current?.()}><SafeAreaView style={styles.safe}><View style={styles.safe}>{content}</View></SafeAreaView></Modal>;
}
function ConfirmationSurface({request,busy,dismissRef}:{request:ConfirmationRequest;busy:boolean;dismissRef:RefObject<(()=>void)|null>}){
 const latest=useRef({request,busy});latest.current={request,busy};
 const consumed=useRef(false),dismissed=useRef(false),failed=useRef(false),pending=useRef(false),mounted=useRef(true),focused=useRef(false),title=useRef<ComponentRef<typeof Text>>(null);
 const [working,setWorking]=useState(false),[failure,setFailure]=useState('');
 useEffect(()=>{mounted.current=true;Keyboard.dismiss();return()=>{mounted.current=false;};},[]);
 function dismiss(){if(!mounted.current||pending.current||latest.current.busy||dismissed.current||consumed.current&&!failed.current)return;dismissed.current=true;consumed.current=true;latest.current.request.onDismiss();}
 dismissRef.current=dismiss;
 async function choose(index:number){
  const action=latest.current.request.actions[index];
  if(!mounted.current||!action||action.disabled||pending.current||latest.current.busy||consumed.current)return;
  consumed.current=true;pending.current=true;setWorking(true);
  try{await action.onPress();}catch{failed.current=true;if(mounted.current)setFailure('The action was not confirmed. Close this dialog and review the current screen before continuing.');}
  finally{pending.current=false;if(mounted.current)setWorking(false);}
 }
 const locked=busy||working;
 return <View testID="confirmation-overlay" accessibilityViewIsModal style={styles.overlay}>
  <Pressable accessibilityRole="button" accessibilityLabel="Dismiss confirmation" disabled={locked} onPress={dismiss} style={StyleSheet.absoluteFill}/>
  <View testID="confirmation-surface" style={styles.dialog}>
   <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <Text ref={title} accessible accessibilityRole="header" style={[styles.title,{fontFamily:fontForUiText(request.title)}]} onLayout={()=>{
     if(!focused.current&&title.current){focused.current=true;AccessibilityInfo.sendAccessibilityEvent(title.current,'focus');}
    }}>{request.title}</Text>
    <Text style={[styles.body,{fontFamily:fontForUiText(request.description)}]}>{request.description}</Text>
    {!!failure&&<Text accessibilityRole="alert" style={styles.error}>{failure}</Text>}
    <View style={styles.actions}>{request.actions.map((action,index)=><Pressable key={`${index}-${action.label}`} accessibilityRole="button"
     accessibilityLabel={action.label} accessibilityState={{disabled:locked||!!action.disabled||!!failure,busy:locked}}
     disabled={locked||!!action.disabled||!!failure} onPress={()=>{void choose(index);}}
     style={({pressed})=>[styles.button,action.role==='primary'?styles.primary:action.role==='neutral'?styles.secondary:undefined,(locked||action.disabled)&&styles.disabled,pressed&&styles.pressed,pressed&&!locked&&!action.disabled&&{backgroundColor:action.role==='primary'?ciButtons.primaryPressed:ciButtons.secondaryPressed}]}>
     <Text style={[styles.label,action.role==='primary'&&styles.onPrimary,action.role==='destructive'&&styles.destructive,{fontFamily:fontForUiText(action.label)}]}>{action.label}</Text>
    </Pressable>)}</View>
    {locked&&<View accessibilityLiveRegion="polite" style={styles.progress}><ActivityIndicator color={lagoon.text.primary}/><Text style={styles.body}>Working…</Text></View>}
   </ScrollView>
  </View>
 </View>;
}
const styles=StyleSheet.create({
 safe:{flex:1},overlay:{...StyleSheet.absoluteFill,justifyContent:'center',alignItems:'center',padding:24,backgroundColor:'rgba(15,23,42,0.5)',zIndex:100},
 dialog:{width:'100%',maxWidth:400,maxHeight:'100%',flexShrink:1,borderRadius:20,backgroundColor:ciColors.surface.sheet,overflow:'hidden'},scroll:{flexShrink:1},
 content:{padding:20,gap:12},title:{...ciTypography.title,color:ciColors.text.primary},
 body:{...ciTypography.body,color:ciColors.text.secondary},actions:{gap:4,marginTop:8},
 button:{minHeight:48,paddingHorizontal:12,paddingVertical:12,borderRadius:12,alignItems:'center',justifyContent:'center'},primary:{backgroundColor:ciButtons.primary},secondary:{backgroundColor:ciButtons.secondary},
 label:{...ciTypography.button,color:ciColors.action.neutral,textAlign:'center',flexShrink:1},
 onPrimary:{color:ciColors.text.onAction},destructive:{color:ciColors.action.destructive},disabled:{opacity:ciStates.confirmationDisabled},pressed:{opacity:ciStates.confirmationPressed},
 error:{...ciTypography.body,color:ciColors.status.error},progress:{flexDirection:'row',gap:8,alignItems:'center',justifyContent:'center'},
});
