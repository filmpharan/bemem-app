import { useRef,useState } from 'react';
import { Pressable,StyleSheet,Text,View,useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ciColors,ciTypography,ciStates } from '../../constants/ci-theme';
import { HomeAccountMenu } from './HomeAccountMenu';
import { BememIcon } from './BememIcon';
import { AddCardText } from './AddCardText';
import { navigationTextLayout } from '../../lib/navigation-text-layout';

type Props={mode:'Home'|'Create'|'Decorate';disabled?:boolean;searchOpen?:boolean;onSearch?:()=>void;onCancel?:()=>void;onSave?:()=>void;saveDisabled?:boolean;cancelDisabled?:boolean;saving?:boolean};
/** One viewport-centred anchor in every mode; actions use a bounded responsive row. */
export function NavigationHeader(props:Props){
 const {mode,disabled=false,searchOpen=false,saving=false}=props,editor=mode!=='Home';
 const window=useWindowDimensions(),insets=useSafeAreaInsets();
 const usableWidth=Math.min(600,(window.width??360)-insets.left-insets.right);
 const [measuredWidth,setWidth]=useState<number|null>(null),latest=useRef(props);latest.current=props;
 const width=Math.min(measuredWidth??usableWidth,usableWidth);
 const {fontScale}=window,epoch=String(fontScale),epochRef=useRef(epoch);epochRef.current=epoch;
 const [measured,setMeasured]=useState<{epoch:string;cancel:number;save:number;brand:number}|null>(null);
 const fallback={cancel:42*fontScale+4,save:30*fontScale+4,brand:100*Math.min(fontScale,1.15)};
 const text=measured?.epoch===epoch?measured:fallback;
 function measure(key:'cancel'|'save'|'brand',value:number){if(epochRef.current!==epoch)return;setMeasured(previous=>{const current=previous?.epoch===epoch?previous:{epoch,...fallback};return current[key]===value?previous:{...current,[key]:value};});}
 const geometry=navigationTextLayout(width,fontScale,text.cancel,text.save,text.brand),stacked=editor&&geometry.stacked;
 function action(label:'Cancel'|'Save'){
  const inactive=label==='Save'?disabled||saving||props.saveDisabled:saving||(props.cancelDisabled??disabled);
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{disabled:!!inactive,busy:label==='Save'&&saving}} disabled={!!inactive}
   onPress={()=>{const p=latest.current;if(p.saving||(label==='Save'?p.disabled||p.saveDisabled:p.cancelDisabled??p.disabled))return;(label==='Save'?p.onSave:p.onCancel)?.();}}
   style={({pressed})=>[styles.action,{width:label==='Cancel'?geometry.cancelWidth:geometry.saveWidth,minHeight:geometry.actionHeight},{opacity:inactive?ciStates.headerDisabled:pressed?ciStates.headerPressed:1}]}>
   <AddCardText onMeasure={value=>measure(label==='Cancel'?'cancel':'save',value)} maxWidth={Math.max(1,(label==='Cancel'?geometry.cancelWidth:geometry.saveWidth)-8)} style={[styles.actionText,{color:label==='Cancel'?ciColors.action.back:ciColors.action.positiveSave}]}>{label}</AddCardText>
  </Pressable>;
 }
 const {onSearch}=props;
 const modeLabel=mode==='Create'?'Arrange':mode;
 const actions=<View style={[styles.actions,{width:geometry.groupWidth,flexDirection:geometry.vertical?'column':'row'}]}>{action('Cancel')}{action('Save')}</View>;
 const left=<View style={styles.left}><HomeAccountMenu compact navigationActions={false} disabled={disabled}/></View>;
 // The same full-width anchor in every mode: side content never participates in centring.
 const brand=<View pointerEvents="none" style={styles.brand}><Text accessibilityRole="header" accessibilityLabel={`bemem. ${modeLabel}`} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={.7} maxFontSizeMultiplier={1.15} style={[styles.wordmark,{width:Math.max(1,Math.min(text.brand+8,width-136))}]}>bemem.</Text><View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.probe}><AddCardText maxWidth={4096} maxFontSizeMultiplier={1.15} style={styles.wordmark} onMeasure={value=>measure('brand',value)}>bemem.</AddCardText></View></View>;
 const right=<View style={styles.right}>{editor?(stacked?null:actions):<Pressable accessibilityRole="button" accessibilityLabel={searchOpen?'Close search':'Search cards'} accessibilityState={{disabled,expanded:searchOpen}} disabled={disabled} onPress={onSearch} style={({pressed})=>[styles.search,{opacity:disabled?ciStates.headerDisabled:pressed?ciStates.headerPressed:1}]}><BememIcon name={searchOpen?'close':'search'}/></Pressable>}</View>;
 return <View accessibilityLabel={`${modeLabel} header`} onLayout={event=>setWidth(event.nativeEvent.layout.width)} style={[styles.frame,{minHeight:editor?geometry.height:48}]}><View style={[styles.header,{height:editor&&!stacked?geometry.actionHeight:48}]}>{left}{brand}{right}</View>{stacked&&<View style={[styles.secondary,{minHeight:geometry.height-48}]}>{actions}</View>}</View>;

}
const styles=StyleSheet.create({
 frame:{width:'100%',flexShrink:0,boxSizing:'border-box'},header:{minHeight:48,width:'100%',flexShrink:0,justifyContent:'center'},secondary:{alignItems:'flex-end',paddingHorizontal:12,boxSizing:'border-box'},
 left:{position:'absolute',left:12,top:0,height:48,justifyContent:'center'},right:{position:'absolute',right:12,top:0,maxWidth:'100%',minHeight:48,justifyContent:'center'},brand:{position:'absolute',left:0,right:0,top:0,height:48,alignItems:'center',justifyContent:'center'},
 wordmark:{...ciTypography.title,fontSize:24,lineHeight:30,fontWeight:'800',letterSpacing:-.8,color:ciColors.brand.deep,includeFontPadding:false,textAlign:'center',width:'100%'},
 probe:{position:'absolute',opacity:0,width:4096},actions:{flexDirection:'row',gap:4,flexShrink:0,boxSizing:'border-box',maxWidth:'100%'},action:{boxSizing:'border-box',minWidth:48,minHeight:48,paddingHorizontal:4,alignItems:'center',justifyContent:'center'},actionText:{...ciTypography.button,includeFontPadding:false},
 search:{width:48,height:48,alignItems:'center',justifyContent:'center'},
});
