import { StyleSheet,Text,View } from 'react-native';
import { GlassButton } from './GlassButton';
import { lagoon,lagoonFonts } from '../../constants/lagoon-theme';
import type { MembershipAccess } from '../../lib/canvas-pages';
/** Future Profile control. This changes a preference, never entitlement or Cloud consent. */
export function CanvasPageCountSetting({count,status,busy=false,onChange}:{count:number;status:MembershipAccess;busy?:boolean;onChange:(count:2|3|4|5)=>void}){
 return <View style={{gap:12}}><Text style={styles.title}>Canvas Pages</Text><Text style={styles.text}>{status==='expired'?'Expired':status==='active'?'Active':'Free'} · {count} selected</Text>
 <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{([2,3,4,5] as const).map(n=><GlassButton key={n} disabled={status!=='active'||busy} selected={n===count}
  accessibilityLabel={`${n} canvas pages`} accessibilityState={{selected:n===count}} style={styles.circle} onPress={()=>{if(status==='active'&&!busy)onChange(n);}}><Text style={styles.text}>{n}</Text></GlassButton>)}</View></View>;
}
const styles=StyleSheet.create({circle:{width:48,height:48,borderRadius:24},text:{fontFamily:lagoonFonts.latin,fontSize:14,lineHeight:21,color:lagoon.text.primary},title:{fontFamily:lagoonFonts.latin,fontSize:18,fontWeight:'800',color:lagoon.text.primary}});
