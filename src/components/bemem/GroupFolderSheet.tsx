import { useMemo,useState } from 'react';
import { Modal,Pressable,ScrollView,StyleSheet,Text,View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { PreviewCard } from '../../types/wallet-ui';
import { packFolderContents } from '../../lib/group-folder';
import { canvasItemFrame } from '../../lib/canvas-layout';
import { MembershipCard } from './MembershipCard';
import { AddCardIcon } from './AddCardIcon';
import { GlassButton } from './GlassButton';
import { FolderNameSheet } from './FolderNameSheet';
import { ConfirmationDialog,type ConfirmationRequest } from './ConfirmationDialog';
import { ciColors,ciTypography,fontForUiText } from '../../constants/ci-theme';
import { sheetVisual } from '../../constants/sheet-visual';

export function GroupFolderSheet({folder,editing,error,onClose,onOpen,onRename,onUngroup}:{folder:PreviewCard;editing:boolean;error?:string;onClose:()=>void;onOpen:(card:PreviewCard)=>void;onRename:(name:string)=>boolean;onUngroup:()=>boolean}){
 const [width,setWidth]=useState(328),[renaming,setRenaming]=useState(false),[confirmation,setConfirmation]=useState<ConfirmationRequest|null>(null);
 const columns=width<320?10:12;
 const members=folder.folder?.members??[],packed=useMemo(()=>packFolderContents(members,columns),[members,columns]);
 if(renaming)return <FolderNameSheet rename initialName={folder.name} error={error} onCancel={()=>setRenaming(false)} onConfirm={name=>{const ok=onRename(name);if(ok)setRenaming(false);return ok;}}/>;
 const dismiss=()=>{if(confirmation)setConfirmation(null);else onClose();};
 return <Modal visible transparent animationType="slide" statusBarTranslucent navigationBarTranslucent onRequestClose={dismiss}>
  <SafeAreaView style={styles.safe}>
   <Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel="Close folder contents" onPress={dismiss}/>
   <View style={styles.sheet} accessibilityViewIsModal accessibilityElementsHidden={!!confirmation} importantForAccessibility={confirmation?'no-hide-descendants':'auto'}>
    <View style={styles.header}><View style={styles.nameGroup}>
     <Text accessibilityRole="header" numberOfLines={2} style={[styles.title,{fontFamily:fontForUiText(folder.name)}]}>{folder.name}</Text>
     {editing&&<GlassButton accessibilityLabel="Rename Folder" style={styles.icon} onPress={()=>setRenaming(true)}><AddCardIcon name="edit"/></GlassButton>}
     </View>
     <GlassButton accessibilityLabel="Close folder" onPress={onClose} style={styles.close}><AddCardIcon name="close"/></GlassButton>
    </View>
    {!!error&&<Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
     <View onLayout={e=>setWidth(e.nativeEvent.layout.width)} style={{height:packed.rows*width/columns}}>{members.map(card=><Pressable key={card.id} accessibilityRole="button" accessibilityLabel={`${card.name}. Open card detail.`} onPress={()=>onOpen(card)} style={{position:'absolute',...canvasItemFrame(card,packed.layout[card.id],width/columns)}}><MembershipCard card={card}/></Pressable>)}</View>
    </ScrollView>
    {editing&&<Pressable accessibilityRole="button" accessibilityLabel="Ungroup Cards. Keep all membership cards." style={styles.delete} onPress={()=>setConfirmation({id:'ungroup-'+folder.id,title:'Ungroup this folder?',description:'The folder will be removed. All cards will be kept.',onDismiss:()=>setConfirmation(null),actions:[{label:'Cancel',role:'neutral',onPress:()=>setConfirmation(null)},{label:'Ungroup',role:'destructive',onPress:()=>{setConfirmation(null);onUngroup();}}]})}><Text style={styles.deleteLabel}>Ungroup Cards</Text></Pressable>}
   </View>
   <ConfirmationDialog presentation="inline" request={confirmation}/>
  </SafeAreaView>
 </Modal>;
}
const styles=StyleSheet.create({safe:{flex:1,justifyContent:'flex-end',backgroundColor:sheetVisual.scrim},sheet:{height:'86%',maxWidth:600,width:'100%',alignSelf:'center',backgroundColor:ciColors.surface.sheet,borderTopLeftRadius:24,borderTopRightRadius:24,overflow:'hidden'},header:{padding:16,flexDirection:'row',gap:8,alignItems:'center'},nameGroup:{flex:1,minWidth:0,flexDirection:'row',alignItems:'center',gap:4},title:{...ciTypography.title,color:ciColors.text.primary,flexShrink:1},icon:{width:48,height:48,flexShrink:0},close:{width:48,height:48,borderRadius:24,flexShrink:0},scroll:{flex:1},content:{paddingHorizontal:16,paddingBottom:24},delete:{minHeight:48,alignItems:'center',justifyContent:'center',margin:12,borderRadius:12},deleteLabel:{...ciTypography.button,color:ciColors.action.destructive},error:{...ciTypography.supporting,color:ciColors.status.error,paddingHorizontal:16,paddingBottom:12}});
