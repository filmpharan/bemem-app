import { useState } from 'react';
import { StyleSheet,Text,TextInput,View } from 'react-native';
import { AddCardSheet } from './AddCardSheet';
import { GlassButton } from './GlassButton';
import { ciColors,ciTypography } from '../../constants/ci-theme';
import type { Orientation } from '../../types/wallet-ui';

export function FolderNameSheet({initialName='',rename=false,error,onCancel,onConfirm}:{initialName?:string;rename?:boolean;error?:string;onCancel:()=>void;onConfirm:(name:string,orientation:Orientation)=>boolean}){
 const [name,setName]=useState(initialName),[orientation,setOrientation]=useState<Orientation>('landscape');
 const valid=!!name.trim()&&name.length<=120;
 return <AddCardSheet modalOnly title={rename?'Rename Folder':'Create Folder'} onClose={onCancel} footer={<View style={styles.row}>
  <GlassButton accessibilityLabel="Cancel folder changes" onPress={onCancel} style={styles.button}><Text style={styles.label}>Cancel</Text></GlassButton>
  <GlassButton kind="gel" accessibilityLabel={rename?'Save folder name to draft':'Create folder in draft'} disabled={!valid} onPress={()=>onConfirm(name,orientation)} style={styles.button}><Text style={styles.label}>{rename?'Save Name':'Create Folder'}</Text></GlassButton>
 </View>}>
  <Text style={styles.body}>{rename?'Change the name in your canvas draft.':'Keep these two cards together. Save your canvas to keep the folder.'}</Text>
  <Text style={styles.label}>Folder name</Text><TextInput accessibilityLabel="Folder name" value={name} onChangeText={setName} maxLength={120} autoCapitalize="sentences" style={styles.input}/>
  {!rename&&<><Text style={styles.label}>Folder orientation</Text><View style={styles.row}>{(['landscape','portrait'] as const).map(value=><GlassButton key={value} accessibilityLabel={`${value} folder`} accessibilityState={{selected:orientation===value}} onPress={()=>setOrientation(value)} style={[styles.button,orientation===value&&styles.selected]}><Text style={styles.label}>{value==='landscape'?'Landscape 6×4':'Portrait 4×6'}</Text></GlassButton>)}</View></>}
  {!!error&&<Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
 </AddCardSheet>;
}
const styles=StyleSheet.create({row:{flexDirection:'row',gap:12,flexWrap:'wrap'},button:{flexGrow:1,flexBasis:125,minHeight:48,padding:10},label:{...ciTypography.button,color:ciColors.text.primary,textAlign:'center'},body:{...ciTypography.body,color:ciColors.text.secondary},input:{...ciTypography.body,minHeight:52,borderRadius:14,borderWidth:1,borderColor:'#8299a6',padding:12,backgroundColor:ciColors.surface.elevated,color:ciColors.text.primary},selected:{borderWidth:2,borderColor:ciColors.action.primary},error:{...ciTypography.body,color:ciColors.status.error}});
