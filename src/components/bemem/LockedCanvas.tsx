import { useState } from 'react';
import { Modal,StyleSheet,Text,View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AddCardIcon } from './AddCardIcon';
import { GlassButton } from './GlassButton';
import { lagoon,lagoonFonts } from '../../constants/lagoon-theme';
import { ciColors,ciTypography } from '../../constants/ci-theme';
import { sheetVisual } from '../../constants/sheet-visual';
/** Never receives card data. No private content is mounted under the promotional surface. */
export function LockedCanvas(){const [open,setOpen]=useState(false);return <View style={styles.canvas}>
 <View pointerEvents="none" style={styles.frost}/><View style={styles.center}><AddCardIcon name="lock" size={32}/>
 <GlassButton accessibilityLabel="Unlock canvas" style={styles.unlock} onPress={()=>setOpen(true)}><Text style={styles.text}>Unlock</Text></GlassButton></View>
 <Modal visible={open} transparent animationType="none" onRequestClose={()=>setOpen(false)}><SafeAreaView style={styles.overlay}><View accessibilityViewIsModal style={styles.sheet}>
 <Text accessibilityRole="header" style={styles.title}>Membership</Text><Text style={styles.membershipText}>Coming Soon</Text>
 <GlassButton tone="tertiary" accessibilityLabel="Close Membership" style={styles.close} onPress={()=>setOpen(false)}><AddCardIcon name="close" size={22}/></GlassButton>
 </View></SafeAreaView></Modal>
 </View>;}
const styles=StyleSheet.create({canvas:{flex:1,backgroundColor:lagoon.canvas.base,justifyContent:'center',alignItems:'center'},frost:{...StyleSheet.absoluteFill,backgroundColor:'#ffffff77'},center:{alignItems:'center',gap:20},unlock:{minWidth:120,padding:12,borderRadius:24},text:{fontFamily:lagoonFonts.latin,color:lagoon.text.primary,fontSize:16,lineHeight:25},overlay:{flex:1,justifyContent:'flex-end',backgroundColor:sheetVisual.scrim},sheet:{padding:24,gap:16,backgroundColor:sheetVisual.surface,boxShadow:sheetVisual.shadow,borderTopLeftRadius:24,borderTopRightRadius:24},title:{paddingRight:64,...ciTypography.title,color:ciColors.text.primary},membershipText:{...ciTypography.body,color:ciColors.text.secondary},close:{backgroundColor:sheetVisual.elevated,position:'absolute',right:16,top:16,width:48,height:48,borderRadius:24}});
