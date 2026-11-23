import {useEffect,useRef,useState,type ComponentRef} from 'react';
import {Keyboard,Pressable,StyleSheet,Text,View} from 'react-native';
import {ciColors,ciTypography} from '../../constants/ci-theme';
import {sheetVisual} from '../../constants/sheet-visual';
import {bemem} from '../../constants/bemem-theme';
import {useLocalProfile} from '../../hooks/use-local-profile';
import type {ProfileAnchor} from '../../lib/profile-sheet-layout';
import {AddCardSheet} from './AddCardSheet';
import {GlassButton} from './GlassButton';
import {ProfileSheet} from './ProfileSheet';
import {ProfileAvatar} from './ProfileAvatar';
import {compactHeaderStyles} from './EightSlotHeader';

const sections = [
  ['Local Device Storage', 'Your cards and decorations are currently stored on this device. Automatic cloud backup is not available. Uninstalling the app or changing devices may result in data loss.'],
  ['Decorate — One-Time Purchase', 'Decorate is currently available for testing. A one-time purchase to unlock Decorate is planned for a future release.'],
  ['Cloud Backup — Monthly Subscription', 'Cloud backup and sync are planned as a monthly subscription service. Login and cloud storage are not yet available.'],
] as const;

/** Shared Header trigger. Profile presentation settings never touch the Canvas owner. */
export function HomeAccountMenu({disabled,compact=false}: {disabled:boolean;compact?:boolean;navigationActions?:boolean;onAddCard?:()=>void;onDecorate?:()=>void}){
 const profile=useLocalProfile(),button=useRef<ComponentRef<typeof View>>(null),current=useRef<'closed'|'measuring'|'profile'|'policy'>('closed');
 const [anchor,setAnchor]=useState<ProfileAnchor|null>(null),[policy,setPolicy]=useState(false);
 useEffect(()=>()=>{current.current='closed';},[]);
 function open(){
  if(disabled||current.current!=='closed'||!button.current)return;
  current.current='measuring';Keyboard.dismiss();
  button.current.measureInWindow((x,y,width,height)=>{
   if(current.current!=='measuring')return;
   if(width<=0||height<=0){current.current='closed';return;}
   current.current='profile';setAnchor({x,y,width,height});
  });
 }
 function closed(showPolicy:boolean){setAnchor(null);current.current=showPolicy?'policy':'closed';setPolicy(showPolicy);}
 function closePolicy(){setPolicy(false);current.current='closed';}
 return <View style={[styles.control,compact&&{width:'100%',maxWidth:48,marginLeft:0}]}>
  <View ref={button} collapsable={false}><Pressable accessibilityRole="button" accessibilityLabel="Account" accessibilityState={{expanded:!!anchor||policy,disabled}} disabled={disabled} onPress={open}
   style={({pressed})=>[compact?compactHeaderStyles.target:styles.account,{opacity:disabled?.45:pressed?.7:1}]}>
   {compact?<View pointerEvents="none" style={compactHeaderStyles.circle}><ProfileAvatar avatar={profile.profile.avatar} size={32}/></View>:<ProfileAvatar avatar={profile.profile.avatar} size={32}/>}
  </Pressable></View>
  {anchor&&<ProfileSheet anchor={anchor} onClosed={closed}/>}
  {policy&&<AddCardSheet modalOnly background={null} title="Policy" onClose={closePolicy}
   footer={<GlassButton accessibilityLabel="Close Policy" onPress={closePolicy} style={styles.close}><Text style={styles.closeText}>Close</Text></GlassButton>}>
   {sections.map(([title,body])=><View key={title} style={styles.section}><Text accessibilityRole="header" style={styles.heading}>{title}</Text><Text style={styles.body}>{body}</Text></View>)}
  </AddCardSheet>}
 </View>;
}
const styles = StyleSheet.create({
  control: { flexShrink: 0, marginLeft: 'auto' },
  account: { width: 48, height: 48, borderRadius: 24, borderWidth: 1, borderColor: bemem.border, alignItems: 'center', justifyContent: 'center' },
  section: { gap: 8, paddingBottom: 18, marginBottom: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: sheetVisual.border },
  heading: { ...ciTypography.section, color:ciColors.text.primary },
  body: { ...ciTypography.body, fontSize:15, lineHeight:24, color:ciColors.text.primary },
  close: { minHeight: 48 },
  closeText: { ...ciTypography.button, fontSize:15, lineHeight:24, fontWeight:'700', color:ciColors.action.neutral },
});
