import { useState,type ReactNode } from 'react';
import { Pressable,StyleSheet,Text,View } from 'react-native';
import { useFonts } from 'expo-font';
import manrope from '../../../assets/fonts/lagoon/manrope.ttf';
import { lagoon,lagoonFonts } from '../../constants/lagoon-theme';

export type HeaderSlot=4|5|6|7|8;
/** Equal columns use the actual SafeArea-constrained parent width. */
export function EightSlotHeader({mode,slots,onLogo,disabled=false}:{mode:'Home'|'Create'|'Decorate';slots:Partial<Record<HeaderSlot,ReactNode>>;onLogo?:()=>void;disabled?:boolean}){
 const [fontReady]=useFonts({BememManrope:manrope}),[width,setWidth]=useState(0);
 const wordmark=<Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} maxFontSizeMultiplier={1.15} ellipsizeMode="clip"
   accessibilityRole={onLogo?undefined:'header'} accessibilityLabel={onLogo?undefined:`bemem. ${mode}`}
   style={[styles.wordmark,{fontFamily:fontReady?lagoonFonts.latin:undefined,fontSize:width>0&&width<320?22:24}]}>bemem<Text style={styles.dot}>.</Text></Text>;
 return <View accessibilityLabel={`${mode} header`} accessible={false} style={styles.header}
   onLayout={event=>{const next=event.nativeEvent.layout.width;if(next>0)setWidth(previous=>previous===next?previous:next);}}>
   <View style={styles.brand} nativeID="header-slots-1-3">
    {onLogo?<Pressable accessibilityRole="button" accessibilityLabel="bemem. Back to Home" disabled={disabled} onPress={onLogo} style={styles.brandContent}>{wordmark}</Pressable>:<View style={styles.brandContent}>{wordmark}</View>}
   </View>
   {([4,5,6,7,8] as const).map(slot=><View key={slot} nativeID={`header-slot-${slot}`} style={styles.slot}>{slots[slot]}</View>)}
 </View>;
}
const styles=StyleSheet.create({
 header:{width:'100%',maxWidth:600,alignSelf:'center',height:50,minHeight:50,flexDirection:'row',alignItems:'center',flexShrink:0},
 brand:{width:'37.5%',height:50,paddingLeft:12,paddingRight:4,justifyContent:'center',overflow:'hidden'},
 brandContent:{width:'100%',height:48,justifyContent:'center'},
 slot:{width:'12.5%',height:50,alignItems:'center',justifyContent:'center',overflow:'hidden'},
 wordmark:{lineHeight:30,fontWeight:'800',letterSpacing:-0.8,color:lagoon.text.primary,includeFontPadding:false},dot:{color:lagoon.action.primary},
});
/** At 360dp the target is 45x48dp, confined to its assigned column. */
export const compactHeaderStyles=StyleSheet.create({
 target:{width:'100%',maxWidth:48,height:48,alignItems:'center',justifyContent:'center'},
 circle:{width:32,maxWidth:'100%',aspectRatio:1,borderRadius:16,borderWidth:1,borderColor:'#cbd3d7',backgroundColor:lagoon.canvas.base,alignItems:'center',justifyContent:'center',overflow:'hidden'},
});
