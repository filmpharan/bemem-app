import {useEffect,useRef,useState,type ComponentRef} from 'react';
import {AccessibilityInfo,ActivityIndicator,Animated,Easing,Keyboard,Modal,Platform,Pressable,ScrollView,StyleSheet,Text,TextInput,View,useWindowDimensions} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {ciColors,ciTypography,ciButtons} from '../../constants/ci-theme';
import {chooseProfilePhoto} from '../../lib/local-profile-native';
import {profileName,type ProfileIdentity} from '../../lib/local-profile';
import {profileSheetLayout,type ProfileAnchor} from '../../lib/profile-sheet-layout';
import {useLocalProfile} from '../../hooks/use-local-profile';
import {AddCardIcon} from './AddCardIcon';
import {BememIcon} from './BememIcon';
import {ProfileAvatar} from './ProfileAvatar';
import {ConfirmationDialog} from './ConfirmationDialog';

type Props={anchor:ProfileAnchor;onClosed:(policy:boolean)=>void;identity?:ProfileIdentity};
export const premiumBenefits=[
 ['Theme & Decorate','Personalize your canvas with themes and decorations.'],
 ['5 Canvases','Organize your cards across five canvas pages.'],
 ['Local or Cloud Storage','Choose how to store your data when cloud storage becomes available.'],
] as const;
/** One native window. Unfold the clip, never scale the text or create a second Premium modal. */
export function ProfileSheet({anchor,onClosed,identity=null}:Props){
 const profile=useLocalProfile(),dimensions=useWindowDimensions(),insets=useSafeAreaInsets();
 const root=useRef<ComponentRef<typeof View>>(null),progress=useRef(new Animated.Value(0)).current;
 const started=useRef(false),closing=useRef(false),alive=useRef(true),busyRef=useRef(false);
 const [window,setWindow]=useState<{x:number;y:number;width:number;height:number}|null>(null),[contentHeight,setContentHeight]=useState(490);
 const [reduced,setReduced]=useState<boolean|null>(null),[view,setView]=useState<'profile'|'premium'>('profile');
 const [nameOpen,setNameOpen]=useState(false),[name,setName]=useState(profile.profile.name),[photoMenu,setPhotoMenu]=useState(false);
 const [photoRequest,setPhotoRequest]=useState<'gallery'|'camera'|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[keyboardTop,setKeyboardTop]=useState<number|null>(null);
 const [visible,setVisible]=useState(true),policyAfterClose=useRef(false),delivered=useRef(false);
 const [loginOpen,setLoginOpen]=useState(false),loginActive=useRef(false);
 function dismissLogin(){loginActive.current=false;setLoginOpen(false);}
 function showLogin(){if(identity?.status==='authenticated'||loginActive.current||closing.current||busyRef.current||profile.busy||!profile.ready)return;loginActive.current=true;setLoginOpen(true);Keyboard.dismiss();}
 function notifyClosed(){if(delivered.current)return;delivered.current=true;onClosed(policyAfterClose.current);}
 useEffect(()=>{if(!visible&&Platform.OS!=='ios')notifyClosed();},[visible]);
 const latest=useRef({view,nameOpen});latest.current={view,nameOpen};
 useEffect(()=>{alive.current=true;void profile.reload();
  void AccessibilityInfo.isReduceMotionEnabled().then(value=>{if(alive.current)setReduced(value);},()=>{if(alive.current)setReduced(false);});
  const motion=AccessibilityInfo.addEventListener('reduceMotionChanged',setReduced);
  const show=Keyboard.addListener('keyboardDidShow',e=>setKeyboardTop(e.endCoordinates.screenY)),hide=Keyboard.addListener('keyboardDidHide',()=>setKeyboardTop(null));
  return()=>{alive.current=false;progress.stopAnimation();motion.remove();show.remove();hide.remove();};
 },[]);
 const available=window?{...window,height:Math.min(window.height,keyboardTop===null?window.height:Math.max(1,keyboardTop-window.y))}:null;
 const geometry=profileSheetLayout(anchor,available??{x:0,y:0,width:dimensions.width,height:dimensions.height},insets,contentHeight);
 useEffect(()=>{if(!window||reduced===null||started.current||closing.current)return;started.current=true;
  Animated.timing(progress,{toValue:1,duration:reduced?0:300,easing:Easing.out(Easing.cubic),useNativeDriver:false}).start();
 },[window,reduced]);
 function measure(){root.current?.measureInWindow((x,y,width,height)=>{if(alive.current&&width>0&&height>0)setWindow({x,y,width,height});});}
 function close(policy=false){if(loginActive.current||closing.current||busyRef.current||profile.busy)return;closing.current=true;Keyboard.dismiss();progress.stopAnimation();
  Animated.timing(progress,{toValue:0,duration:reduced?0:250,easing:Easing.inOut(Easing.cubic),useNativeDriver:false}).start(({finished})=>{if(finished&&alive.current){policyAfterClose.current=policy;setVisible(false);}});
 }
 function back(){if(loginActive.current){dismissLogin();return;}if(busyRef.current||profile.busy)return;if(photoMenu){setPhotoMenu(false);return;}if(latest.current.nameOpen){setNameOpen(false);Keyboard.dismiss();return;}if(latest.current.view==='premium'){setView('profile');return;}close();}
 async function saveName(){if(busyRef.current||profile.busy)return;let valid:string;try{valid=profileName(name);}catch(e){setError((e as Error).message);return;}
  busyRef.current=true;setBusy(true);setError('');try{await profile.update({name:valid});if(alive.current){setNameOpen(false);Keyboard.dismiss();}}catch(e){if(alive.current)setError((e as Error).message);}finally{busyRef.current=false;if(alive.current)setBusy(false);}
 }
 function requestPhoto(source:'gallery'|'camera'){if(busyRef.current||profile.busy)return;busyRef.current=true;setBusy(true);setError('');setPhotoMenu(false);setPhotoRequest(source);Keyboard.dismiss();}
 useEffect(()=>{if(!photoRequest)return;void (async()=>{try{const avatar=await chooseProfilePhoto(photoRequest==='camera');if(avatar&&alive.current)await profile.update({avatar});}catch(e){if(alive.current)setError((e as Error).message);}finally{busyRef.current=false;if(alive.current){setBusy(false);setPhotoRequest(null);}}})();},[photoRequest]);
 async function removePhoto(){if(busyRef.current||profile.busy)return;busyRef.current=true;setBusy(true);setError('');try{await profile.update({avatar:null});if(alive.current)setPhotoMenu(false);}catch(e){if(alive.current)setError((e as Error).message);}finally{busyRef.current=false;if(alive.current)setBusy(false);}}
 const inactive=busy||profile.busy||!profile.ready;
 function action(label:string,onPress:()=>void,icon?:'policy'|'edit'|'camera'|'back',disabled=false){return <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled||inactive} accessibilityState={{disabled:disabled||inactive}} onPress={()=>{if(!busyRef.current&&!profile.busy)onPress();}} style={({pressed})=>[styles.row,{opacity:disabled?.45:pressed?.7:1}]}>{icon&&(icon==='back'?<BememIcon name="chevron-left"/>:<AddCardIcon name={icon} size={22}/>)}<Text style={styles.body}>{label}</Text></Pressable>;}
 return <Modal transparent visible={visible} onDismiss={()=>{if(!visible)notifyClosed();}} animationType="none" statusBarTranslucent navigationBarTranslucent onShow={measure} onRequestClose={back}>
  <View ref={root} collapsable={false} onLayout={measure} style={styles.overlay}>
   <Pressable accessibilityRole="button" accessibilityLabel="Close Profile" style={StyleSheet.absoluteFill} onPress={()=>close()}/>
   <Animated.View accessibilityViewIsModal accessibilityElementsHidden={loginOpen} importantForAccessibility={loginOpen?'no-hide-descendants':'yes'} style={[styles.sheet,{left:geometry.left,top:geometry.top,width:progress.interpolate({inputRange:[0,1],outputRange:[geometry.originWidth,geometry.width]}),height:progress.interpolate({inputRange:[0,1],outputRange:[geometry.originHeight,geometry.height]}),opacity:window?1:0}]}>
    <Animated.View style={{width:geometry.width,height:geometry.height,opacity:progress.interpolate({inputRange:[0,.45,1],outputRange:[0,0,1]})}}>
     <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content} onContentSizeChange={(_,height)=>setContentHeight(height)}>
      <View style={styles.header}>
       {view==='premium'&&action('Back to Profile',()=>setView('profile'),'back')}
       <Text accessibilityRole="header" style={[styles.title,{flex:1}]}>{view==='profile'?'Profile':'Get Premium'}</Text>
       <Pressable accessibilityRole="button" accessibilityLabel="Close Profile Sheet" disabled={inactive} onPress={()=>close()} style={styles.icon}><AddCardIcon name="close" size={24}/></Pressable>
      </View>
      {view==='profile'?<>
       <View style={styles.identity}>
        {!nameOpen&&<Pressable accessibilityRole="button" accessibilityLabel="Change profile photo" disabled={inactive} onPress={()=>{setPhotoMenu(!photoMenu);setError('');}} style={styles.avatar}>
         <ProfileAvatar avatar={profile.profile.avatar} size={80}/><View style={styles.camera}><AddCardIcon name="camera" size={18}/></View>
        </Pressable>}
        {photoMenu&&<View accessibilityLabel="Profile photo options" style={styles.options}>
         {action('Choose from Gallery',()=>requestPhoto('gallery'))}{action('Take Photo',()=>requestPhoto('camera'))}
         {profile.profile.avatar&&action('Remove Photo',()=>{void removePhoto();})}{action('Cancel',()=>setPhotoMenu(false))}
        </View>}
        {nameOpen?<View style={styles.options}>
         <TextInput accessibilityLabel="Display name" value={name} onChangeText={setName} maxLength={120} autoFocus editable={!inactive} returnKeyType="done" onSubmitEditing={()=>{void saveName();}} style={styles.input}/>
         <View style={styles.nameActions}>{action('Cancel',()=>{setNameOpen(false);Keyboard.dismiss();})}{action('Save name',()=>{void saveName();})}</View>
        </View>:<View style={styles.nameRow}>
         <Pressable accessibilityRole="button" accessibilityLabel="Edit display name" disabled={inactive} onPress={()=>{setName(profile.profile.name);setNameOpen(true);setPhotoMenu(false);setError('');}} style={styles.nameButton}><Text style={styles.title}>{profile.profile.name}</Text><AddCardIcon name="edit" size={18}/></Pressable>
         {identity?.status==='authenticated'&&identity.premiumEntitled&&<View accessibilityLabel="Premium member" style={styles.premiumBadge}><AddCardIcon name="crown" size={14} color="#795516"/><Text style={styles.secondary}>Premium</Text></View>}
        </View>}
        {identity?.status==='authenticated'&&!!identity.email&&<Text style={styles.secondary}>{identity.email}</Text>}
        {identity?.status!=='authenticated'&&!nameOpen&&<Pressable accessibilityRole="button" accessibilityLabel="Login" disabled={inactive} accessibilityState={{disabled:inactive}} onPress={showLogin} style={({pressed})=>[styles.login,{opacity:inactive?.45:pressed?.7:1}]}><Text style={styles.loginLabel}>Login</Text></Pressable>}
       </View>
       <Text style={styles.section}>Storage</Text>
       <View accessibilityLabel="Storage options" style={styles.storage}>
        <Pressable accessibilityRole="button" accessibilityLabel="Local storage" accessibilityState={{selected:true}} style={[styles.storageOption,styles.local]}><Text style={[styles.body,{color:'#ffffff'}]}>Local</Text></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Cloud storage unavailable" accessibilityState={{disabled:true}} disabled style={styles.storageOption}><AddCardIcon name="lock" size={16}/><Text style={styles.secondary}>Cloud</Text></Pressable>
       </View>
       <Text style={styles.secondary}>Cloud storage is not available yet.</Text>
       <Pressable accessibilityRole="button" accessibilityLabel={identity?.premiumEntitled?'Premium Benefits':'Get Premium'} disabled={inactive} onPress={()=>{setPhotoMenu(false);setView('premium');}} style={[styles.row,styles.premiumEntry]}><AddCardIcon name="crown" size={24} color="#946a1c"/><Text style={[styles.body,{flex:1}]}>{identity?.premiumEntitled?'Premium Benefits':'Get Premium'}</Text><View style={{transform:[{rotate:'-90deg'}]}}><AddCardIcon name="chevron" size={20}/></View></Pressable>
       <Pressable accessibilityRole="button" accessibilityLabel="Policy" disabled={inactive} onPress={()=>close(true)} style={styles.row}><AddCardIcon name="policy" size={22}/><Text style={[styles.body,{flex:1}]}>Policy</Text><View style={{transform:[{rotate:'-90deg'}]}}><AddCardIcon name="chevron" size={20}/></View></Pressable>
      </>:<>
       <View style={{alignItems:'center'}}><AddCardIcon name="crown" size={36} color="#946a1c"/></View>
       <Text style={[styles.title,{textAlign:'center'}]}>bemem Premium</Text>
       <Text style={[styles.body,{textAlign:'center'}]}>More space. More ways to make bemem yours.</Text>
       {premiumBenefits.map(([title,description])=><View key={title} style={styles.benefit}><Text style={styles.section}>{title}</Text><Text style={styles.body}>{description}</Text></View>)}
       <Text style={styles.secondary}>Premium features are in development.</Text>
      </>}
      {(busy||profile.busy)&&<ActivityIndicator accessibilityLabel="Saving profile" color={ciColors.brand.deep}/>}
      {!!(error||profile.error)&&<Text accessibilityRole="alert" style={styles.error}>{error||profile.error}</Text>}
     </ScrollView>
    </Animated.View>
   </Animated.View>
   <ConfirmationDialog presentation="inline" request={loginOpen?{id:'profile-login-coming-soon',title:'Login Coming Soon',description:'Login is not available yet. Your cards remain stored locally on this device.',actions:[{label:'OK',role:'primary',onPress:dismissLogin}],onDismiss:dismissLogin}:null}/>
  </View>
 </Modal>;
}
const styles=StyleSheet.create({
 overlay:{flex:1,backgroundColor:'#073F3C20'},sheet:{position:'absolute',overflow:'hidden',backgroundColor:'#ffffff',borderRadius:24,borderWidth:StyleSheet.hairlineWidth,borderColor:'#cbdedb'},
 content:{padding:20,gap:14},header:{flexDirection:'row',alignItems:'center',gap:8,flexWrap:'wrap'},icon:{width:48,height:48,alignItems:'center',justifyContent:'center'},
 title:{...ciTypography.title,color:ciColors.brand.ink,flexShrink:1},section:{...ciTypography.section,color:ciColors.brand.ink},body:{...ciTypography.body,color:ciColors.brand.ink,flexShrink:1},secondary:{...ciTypography.supporting,color:ciColors.brand.deep,flexShrink:1},
 identity:{alignItems:'center',gap:8},avatar:{width:88,height:88,alignItems:'center',justifyContent:'center',backgroundColor:ciColors.brand.light,borderRadius:44},camera:{position:'absolute',right:0,bottom:0,width:28,height:28,alignItems:'center',justifyContent:'center',backgroundColor:'#ffffff',borderRadius:14,borderWidth:1,borderColor:ciColors.brand.light},
 nameRow:{flexDirection:'row',flexWrap:'wrap',alignItems:'center',justifyContent:'center',gap:4},nameButton:{minHeight:48,flexDirection:'row',alignItems:'center',gap:8,maxWidth:'100%'},premiumBadge:{flexDirection:'row',alignItems:'center',gap:4,backgroundColor:'#fff4d4',padding:5,borderRadius:8},
 login:{minHeight:48,minWidth:88,maxWidth:'100%',alignSelf:'center',alignItems:'center',justifyContent:'center',paddingHorizontal:20,paddingVertical:8,borderRadius:24,backgroundColor:ciButtons.secondary,borderWidth:StyleSheet.hairlineWidth,borderColor:ciButtons.border},loginLabel:{...ciTypography.button,color:ciColors.brand.deep,textAlign:'center',flexShrink:1},
 storage:{flexDirection:'row',backgroundColor:ciButtons.secondary,padding:4,borderRadius:16,gap:4},storageOption:{flex:1,minHeight:48,padding:8,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:6,borderRadius:12},local:{backgroundColor:ciButtons.primary},
 row:{minHeight:48,paddingVertical:10,paddingHorizontal:10,flexDirection:'row',alignItems:'center',gap:12,borderRadius:12},premiumEntry:{backgroundColor:'#fff8e8'},crown:{fontSize:24,lineHeight:30,color:'#946a1c'},benefit:{gap:6,paddingVertical:10,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:'#deebe8'},
 options:{width:'100%',gap:4},input:{...ciTypography.body,color:ciColors.brand.ink,borderWidth:1,borderColor:ciColors.brand.deep,borderRadius:12,minHeight:48,padding:12},nameActions:{flexDirection:'row',justifyContent:'flex-end',flexWrap:'wrap'},error:{...ciTypography.supporting,color:ciColors.status.error},
});
