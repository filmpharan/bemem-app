import { ScrollView,StyleSheet,Text,View } from 'react-native';
import { AddCardIcon } from './AddCardIcon';
import { GlassButton } from './GlassButton';
import { ciColors,ciTypography } from '../../constants/ci-theme';

/** Presentation only: the existing owner keeps this destination non-editable. */
export function CanvasLockedState({onLogin,onBack}:{onLogin:()=>void;onBack:()=>void}){
 return <ScrollView style={styles.viewport} contentContainerStyle={styles.content}>
  <View accessible accessibilityLabel="Canvas 2 is locked" style={styles.badge}><AddCardIcon name="lock" size={32} color={ciColors.brand.deep}/></View>
  <Text accessibilityRole="header" style={styles.title}>Canvas 2</Text>
  <Text style={styles.description}>Login to unlock more space for your cards.</Text>
  <Text style={styles.availability}>Coming soon</Text>
  <GlassButton accessibilityLabel="Login (Coming Soon)" onPress={onLogin} style={styles.action}><Text style={styles.label}>Login (Coming Soon)</Text></GlassButton>
  <GlassButton accessibilityLabel="Back to Canvas 1" onPress={onBack} style={styles.back}><Text style={styles.label}>Back to Canvas 1</Text></GlassButton>
 </ScrollView>;
}
const styles=StyleSheet.create({
 viewport:{flex:1,backgroundColor:ciColors.surface.canvas},
 content:{flexGrow:1,justifyContent:'center',alignItems:'center',padding:24,gap:12},
 badge:{width:64,height:64,borderRadius:32,alignItems:'center',justifyContent:'center',backgroundColor:ciColors.brand.light},
 title:{...ciTypography.title,color:ciColors.brand.ink,textAlign:'center'},
 description:{...ciTypography.body,color:ciColors.brand.ink,textAlign:'center',maxWidth:320},
 availability:{...ciTypography.supporting,color:ciColors.brand.deep,textAlign:'center'},
 action:{minHeight:48,maxWidth:'100%',paddingHorizontal:20,paddingVertical:12,borderRadius:24,marginTop:8},
 back:{minHeight:48,maxWidth:'100%',paddingHorizontal:16,paddingVertical:12,borderRadius:24},
 label:{...ciTypography.button,color:ciColors.brand.deep,textAlign:'center',flexShrink:1,maxWidth:'100%'},
});
