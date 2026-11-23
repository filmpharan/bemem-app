import {useEffect,useRef,useState} from 'react';
import {AccessibilityInfo,Animated,Easing,Pressable,StyleSheet,View,useWindowDimensions} from 'react-native';
import {ciColors,ciTypography,ciButtons} from '../../constants/ci-theme';
import type {CardSheetDisplayMode} from '../../types/membership-card';
import {cardFormRowLayout} from '../../lib/card-form-row-layout';
import {AddCardText} from './AddCardText';

/** Only editor presentation. No storage or code generation occurs here. */
export function CardSheetModeSelector({mode,expiration,width,disabled,onExpiration,onChange}:{
 mode:CardSheetDisplayMode;expiration:string;width:number;disabled:boolean;onExpiration:()=>void;onChange:(mode:CardSheetDisplayMode)=>void;
}){
 const {fontScale=1}=useWindowDimensions(),position=useRef(new Animated.Value(mode==='frontback'?1:0)).current;
 const [reduced,setReduced]=useState(true),[measures,setMeasures]=useState<{key:string;exp?:number;card?:number;back?:number}>({key:''});
 const label=expiration?`EXP ${expiration}`:'EXP',key=label;
 const currentKey=useRef(key);currentKey.current=key;
 const current=measures.key===key?measures:{exp:undefined,card:measures.card,back:measures.back};
 function measured(field:'exp'|'card'|'back',width:number){if(currentKey.current!==key||!Number.isFinite(width)||width<=0)return;setMeasures(previous=>{const next=previous.key===key?previous:{key,card:previous.card,back:previous.back};return next[field]===width?previous:{...next,[field]:width};});}
 // Conservative first-frame bounds; the shared font-aware text component supplies real widths.
 const sizing=cardFormRowLayout(width,current.exp??label.length*6.8+4,current.card??9*7.2+4,current.back??10*7.2+4,fontScale);
 const {expWidth,segmentWidth,unit}=sizing;
 useEffect(()=>{let active=true;void AccessibilityInfo.isReduceMotionEnabled().then(value=>{if(active)setReduced(value);},()=>{});
  const listener=AccessibilityInfo.addEventListener('reduceMotionChanged',setReduced);return()=>{active=false;listener.remove();position.stopAnimation();};
 },[]);
 useEffect(()=>{const animation=Animated.timing(position,{toValue:mode==='frontback'?1:0,duration:reduced?0:170,easing:Easing.out(Easing.cubic),useNativeDriver:true});animation.start();return()=>animation.stop();},[mode,reduced]);
 return <View testID="card-exp-display-row" style={[styles.row,sizing.stacked&&styles.stacked]}>
  <Pressable accessibilityRole="button" accessibilityLabel="Expiration date" accessibilityValue={{text:expiration||'No expiry'}} accessibilityHint="Opens Day, Month and Year wheels" accessibilityState={{disabled}} disabled={disabled} onPress={onExpiration}
   style={({pressed})=>[styles.exp,{width:expWidth,opacity:disabled?.45:pressed?.7:1}]}><AddCardText maxWidth={sizing.expContentWidth} maxFontSizeMultiplier={1} style={[styles.expText,{fontSize:12*sizing.expFontScale,lineHeight:18*sizing.expFontScale}]}>{label}</AddCardText></Pressable>
  <View style={{width:sizing.viewportWidth,flexShrink:0}}>
   <View accessibilityRole="radiogroup" accessibilityLabel="Card sheet display" style={[styles.segment,{width:segmentWidth}]}>
    <Animated.View pointerEvents="none" accessible={false} style={[styles.indicator,{width:unit,transform:[{translateX:position.interpolate({inputRange:[0,1],outputRange:[0,unit]})}]}]}/>
    {(['cardcode','frontback'] as const).map((value,index)=><Pressable key={value} accessibilityRole="radio" accessibilityLabel={index===0?'Code+Card':'Card 2 Side'} accessibilityState={{checked:mode===value,disabled}} disabled={disabled} onPress={()=>{if(!disabled)onChange(value);}} style={[styles.option,{width:unit}]}>
     <AddCardText maxWidth={sizing.optionContentWidth} maxFontSizeMultiplier={1} style={[styles.optionText,{fontSize:12*sizing.modeFontScale,lineHeight:20*sizing.modeFontScale},mode===value&&styles.selected]}>{index===0?'Code+Card':'Card 2 Side'}</AddCardText>
    </Pressable>)}
   </View>
  </View>
  <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.probe}>
   <AddCardText maxWidth={4096} maxFontSizeMultiplier={1} onMeasure={value=>measured('exp',value)} style={styles.expText}>{label}</AddCardText>
   <AddCardText maxWidth={4096} maxFontSizeMultiplier={1} onMeasure={value=>measured('card',value)} style={styles.optionText}>Code+Card</AddCardText>
   <AddCardText maxWidth={4096} maxFontSizeMultiplier={1} onMeasure={value=>measured('back',value)} style={styles.optionText}>Card 2 Side</AddCardText>
  </View>
 </View>;
}
const styles=StyleSheet.create({
 row:{flexDirection:'row',flexWrap:'nowrap',alignItems:'center',gap:8},stacked:{flexDirection:'column',alignItems:'flex-start'},probe:{position:'absolute',width:4096,opacity:0},
 exp:{boxSizing:'border-box',minHeight:48,flexShrink:0,paddingHorizontal:6,paddingVertical:8,borderRadius:12,borderWidth:1,borderColor:ciButtons.border,backgroundColor:ciButtons.secondary,alignItems:'center',justifyContent:'center'},
 expText:{...ciTypography.body,fontSize:12,lineHeight:18,color:ciColors.text.primary},segment:{boxSizing:'border-box',flexDirection:'row',padding:4,borderWidth:1,borderColor:'#bdded8',borderRadius:28,backgroundColor:ciButtons.secondary},
 indicator:{position:'absolute',left:5,top:5,bottom:5,borderRadius:24,backgroundColor:ciButtons.primary},option:{flexShrink:0,minHeight:48,paddingVertical:8,paddingHorizontal:6,alignItems:'center',justifyContent:'center'},
 optionText:{...ciTypography.button,fontSize:12,lineHeight:20,color:ciColors.text.primary},selected:{color:ciColors.text.onAction},
});
