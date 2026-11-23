import {useCallback,useEffect,useMemo,useRef,useState,type ComponentRef} from 'react';
import {AccessibilityInfo,Animated,Easing,ActivityIndicator,Pressable,ScrollView,StyleSheet,Text,View,useWindowDimensions} from 'react-native';
import {useFonts} from 'expo-font';
import {captureRef,releaseCapture} from 'react-native-view-shot';
import manrope from '../../../assets/fonts/lagoon/manrope.ttf';
import thai from '../../../assets/fonts/lagoon/noto-sans-thai.ttf';
import type {MembershipCard} from '../../types/membership-card';
import {DEFAULT_SHARE_OPTIONS,SHARE_FIELDS,SHARE_LABELS,cardShareAvailability,prepareCardShare,type CardShareOptions,type CardSharePlan,type ShareField,type ShareTextMetrics} from '../../lib/card-share-plan';
import {createCardShareSession} from '../../lib/card-share-session';
import {cardShareNative} from '../../lib/card-share-native';
import {deviceArtworkStore} from '../../lib/card-artwork-store';
import {ciColors,ciTypography,ciButtons,fontForUiText} from '../../constants/ci-theme';
import {sheetVisual} from '../../constants/sheet-visual';
import {AddCardSheet} from './AddCardSheet';
import {GlassButton} from './GlassButton';
import {CardShareSurface} from './CardShareSurface';
import {AddCardIcon} from './AddCardIcon';
import {sharePresentationLayout,type ShareControlWidths} from '../../lib/share-presentation-layout';
import {AddCardText} from './AddCardText';

const EMPTY_TEXT_METRICS:ShareTextMetrics=Object.freeze({});
const FULL_PREVIEW_ORIGIN=Object.freeze({x:0,y:0});

/** Mounted only by the existing Detail Share action. No capture runs on mount or checkbox edits. */
export function ShareCardSheet({card,onClose}:{card:Readonly<MembershipCard>;onClose:()=>void}){
 const [options,setOptions]=useState<CardShareOptions>(()=>({...DEFAULT_SHARE_OPTIONS,front:cardShareAvailability(card).front})),[exportPlan,setExportPlan]=useState<CardSharePlan|null>(null);
 const [sharing,setSharing]=useState(false),[message,setMessage]=useState(''),[failure,setFailure]=useState(''),[contentWidth,setContentWidth]=useState(320);
 const {height:screenHeight,fontScale=1}=useWindowDimensions(),[fontsLoaded,fontError]=useFonts({BememManrope:manrope,BememThai:thai});
 const mounted=useRef(true),shareBusy=useRef(false),captureStarted=useRef(false),sessionRef=useRef<ReturnType<typeof createCardShareSession>|null>(null);
 const [controlMeasures,setControlMeasures]=useState<{epoch:number;values:ShareControlWidths}|null>(null);
 const [viewport,setViewport]=useState<{width:number;height:number}|null>(null);
 const segmentScroll=useRef<ComponentRef<typeof ScrollView>>(null);
 const controlLayoutKey=JSON.stringify([contentWidth,fontScale,controlMeasures]);
 const [controlHeight,setControlHeight]=useState<{key:string;height:number}|null>(null);
 const controlsEpoch=useRef(fontScale);controlsEpoch.current=fontScale;
 const presentation=sharePresentationLayout(contentWidth,viewport?.height??Math.max(140,screenHeight*.5),fontScale,controlMeasures?.epoch===fontScale?controlMeasures.values:{},controlHeight?.key===controlLayoutKey?controlHeight.height:undefined);
 const [reduceMotion,setReduceMotion]=useState(true),codePosition=useRef(new Animated.Value(1)).current;
 const [segmentWidth,setSegmentWidth]=useState(Math.max(1,(presentation.widths.code-8)/3));
 const selectedCode=options.qr?0:options.barcode?2:1;
 useEffect(()=>{if(presentation.segmentWidth>presentation.widths.code)segmentScroll.current?.scrollTo({x:Math.max(0,(selectedCode+.5)*(presentation.segmentWidth-8)/3-presentation.widths.code/2),animated:false});},[selectedCode,presentation.segmentWidth,presentation.widths.code]);
 useEffect(()=>{let active=true;void AccessibilityInfo.isReduceMotionEnabled().then(value=>{if(active)setReduceMotion(value);},()=>{});
  const listener=AccessibilityInfo.addEventListener('reduceMotionChanged',setReduceMotion);return()=>{active=false;listener.remove();codePosition.stopAnimation();};
 },[]);
 useEffect(()=>{const motion=Animated.timing(codePosition,{toValue:selectedCode,duration:reduceMotion?0:170,easing:Easing.out(Easing.cubic),useNativeDriver:true});motion.start();return()=>motion.stop();},[selectedCode,reduceMotion]);
 const [fullPreview,setFullPreview]=useState(false),[fullWidth,setFullWidth]=useState<number|null>(null);
 const [measurements,setMeasurements]=useState<{key:string;values:ShareTextMetrics}|null>(null);
 const textKey=JSON.stringify([card.name,card.memberNumber,card.expiryMonth]),currentTextKey=useRef(textKey);currentTextKey.current=textKey;
 const metrics=measurements?.key===textKey?measurements.values:EMPTY_TEXT_METRICS;
 const textValues={name:card.name,number:card.memberNumber??'',expiry:card.expiryMonth??''};
 const measurementPending=(['name','number','expiry'] as const).some(field=>options[field]&&metrics[field]===undefined);
 const available=useMemo(()=>cardShareAvailability(card),[card]);
 const selection=useMemo(()=>{try{return{plan:prepareCardShare(card,options,metrics),error:''};}catch(e){return{plan:null,error:(e as Error).message};}},[card,options,metrics]);
 const signature=JSON.stringify([card,options]),latest=useRef(signature);latest.current=signature;
 const ticket=useRef(''),selectionEpoch=useRef(0),renderedEpoch=selectionEpoch.current;
 useEffect(()=>{mounted.current=true;const session=createCardShareSession(cardShareNative);sessionRef.current=session;
  return()=>{mounted.current=false;if(sessionRef.current===session)sessionRef.current=null;void session.close();};
 },[]);
 const finish=useCallback(()=>{shareBusy.current=false;if(mounted.current){setSharing(false);setExportPlan(null);}},[]);
 const fail=useCallback(()=>{if(captureStarted.current)return;if(mounted.current)setFailure('Unable to export this selection. Your card is unchanged. Check its artwork or choose fewer items.');finish();},[finish]);
 const ready=useCallback((view:ComponentRef<typeof View>)=>{
  const plan=exportPlan,session=sessionRef.current;
  if(!plan||!session||!mounted.current||!shareBusy.current||captureStarted.current)return;
  captureStarted.current=true;
  void(async()=>{let raw:string|null=null,artifact:string|null=null;
   try{
    if(ticket.current!==latest.current)throw Error('Selection changed.');
    for(const field of plan.fields)if(field==='front'||field==='back'){const art=plan.appearance.artwork?.[field];if(art)deviceArtworkStore.verifyArtwork(art);}
    // Native pixels, no bitmap resizing or fractional code-module resampling.
    raw=await captureRef(view, { format: 'png', result: 'tmpfile' });
    const prepared=await cardShareNative.adoptCapture(raw,plan.width);artifact=prepared.uri;
    if(!session.track(prepared.uri,prepared.md5))return;
    if(prepared.height!==plan.height)throw Error('The captured composition height changed.');
    if(!mounted.current||ticket.current!==latest.current)throw Error('Selection changed.');
    for(const field of plan.fields)if(field==='front'||field==='back'){const art=plan.appearance.artwork?.[field];if(art)deviceArtworkStore.verifyArtwork(art);}
    const result=await session.share(prepared.uri);
    if(mounted.current)setMessage(result.message);
   }catch{if(mounted.current)setFailure('Sharing was not completed. Your card is unchanged. Review your selection and try again.');}
   finally{if(raw)releaseCapture(raw);if(artifact)await session.discard(artifact);finish();}
  })();
 },[exportPlan,finish]);
 function choose(field:ShareField){if(shareBusy.current||!available[field]&&!options[field])return;selectionEpoch.current++;
  setOptions(previous=>{const selected=!previous[field];return {...previous,[field]:selected,...(field==='qr'&&selected?{barcode:false}:field==='barcode'&&selected?{qr:false}:{})};});setFailure('');setMessage('');
 }
 function noCode(){if(shareBusy.current)return;selectionEpoch.current++;setOptions(previous=>({...previous,qr:false,barcode:false}));setFailure('');setMessage('');}
 function share(){if(renderedEpoch!==selectionEpoch.current||shareBusy.current||measurementPending||!selection.plan||!fontsLoaded||fontError||!sessionRef.current)return;
  shareBusy.current=true;captureStarted.current=false;ticket.current=latest.current;setSharing(true);setMessage('');setFailure('');setExportPlan(selection.plan);
 }
 const close=()=>{if(shareBusy.current)return;if(fullPreview)setFullPreview(false);else onClose();};
 const error=(!measurementPending&&selection.error)||failure||(fontError?'The local share font could not be loaded. Nothing was shared.':'');
 const plan=measurementPending?null:selection.plan,previewHeight=presentation.previewHeight;
 const miniWidth=plan?plan.width*Math.min(Math.max(1,contentWidth-16)/plan.width,Math.max(1,previewHeight-16)/plan.height):0;
 function checkbox(field:'front'|'back'|'name'|'number'|'expiry'){return <Pressable key={field} accessibilityRole="checkbox" accessibilityLabel={SHARE_LABELS[field]} accessibilityHint={field==='front'||field==='back'?'Text and codes already printed in artwork remain included.':undefined}
  accessibilityState={{checked:options[field],disabled:sharing||!available[field]&&!options[field]}} disabled={sharing||!available[field]&&!options[field]} onPress={()=>choose(field)}
  style={({pressed})=>[styles.choice,{opacity:sharing||!available[field]?.45:pressed?.7:1}]}><View style={[styles.checkbox,options[field]&&styles.checked]}><Text accessible={false} allowFontScaling={false} style={styles.check}>{options[field]?'✓':''}</Text></View><Text numberOfLines={1} style={styles.controlText}>{field==='number'?presentation.memberLabel:SHARE_LABELS[field]}</Text></Pressable>;}
 const preview=plan&&fontsLoaded?<CardShareSurface key={signature} plan={plan} displayWidth={fullPreview?Math.max(1,(fullWidth??viewport?.width??contentWidth)-16):miniWidth}
  onFailure={()=>setFailure('An image or text could not fit safely. Review this selection before sharing.')}/>:<Text style={styles.hint}>{measurementPending?'Measuring text...':selection.error?'This selection cannot be previewed.':fontsLoaded?'Select what to share.':'Loading preview...'}</Text>;
 function heading(title:'Card'|'Info'|'Code'){return <View style={styles.columnHeader}>
  {title==='Card'?<View accessible={false} style={styles.layers}>{[0,1,2].map(i=><View key={i} style={[styles.layer,{top:i*4}]}/>)}</View>:title==='Info'?<View accessible={false} style={styles.infoIcon}><Text allowFontScaling={false} style={styles.infoGlyph}>i</Text></View>:<AddCardIcon name="barcode" size={16}/>}
  <Text numberOfLines={1} style={styles.columnTitle}>{title}</Text></View>;}
 const codeControls=<View accessibilityRole="radiogroup" accessibilityLabel="Code options" onLayout={event=>setSegmentWidth(Math.max(0,(event.nativeEvent.layout.width-8)/3))} style={[styles.segment,{width:presentation.segmentWidth}]}>
  <Animated.View pointerEvents="none" accessible={false} style={[styles.indicator,{width:segmentWidth,transform:[{translateX:codePosition.interpolate({inputRange:[0,2],outputRange:[0,segmentWidth*2]})}]}]}/>
  {(['qr','none','barcode'] as const).map(field=>{const selected=field==='none'?!options.qr&&!options.barcode:options[field],disabled=sharing||field!=='none'&&!available[field];return <Pressable key={field} accessibilityRole="radio" accessibilityLabel={field==='none'?'None':SHARE_LABELS[field]} accessibilityHint={field!=='none'?'Encodes the saved Number, even when Membership Number is unchecked.':undefined} accessibilityState={{selected,checked:selected,disabled}} disabled={disabled}
   onPress={()=>{if(field==='none')noCode();else if(!selected)choose(field);}} style={[styles.codeChoice,{opacity:disabled?.45:1}]}><Text numberOfLines={1} style={[styles.controlText,styles.segmentText,selected&&styles.selectedText]}>{field==='none'?'None':SHARE_LABELS[field]}</Text></Pressable>;})}
 </View>;
 const fullAction=<Pressable accessibilityRole="button" accessibilityLabel="View full preview" disabled={!plan||sharing||!fontsLoaded} onPress={()=>{if(!shareBusy.current&&plan&&fontsLoaded){setFullWidth(null);setFullPreview(true);}}} style={({pressed})=>[styles.fullAction,{opacity:!plan||sharing||!fontsLoaded?.45:pressed?.7:1}]}><AddCardIcon name="fullscreen" size={16}/><Text style={styles.controlText}>View full preview</Text></Pressable>;
 const textProbes=fontsLoaded&&<View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.probes}>
    {(['name','number','expiry'] as const).filter(field=>options[field]).map(field=><Text key={textKey+field} allowFontScaling={false}
      style={{fontFamily:fontForUiText(textValues[field]),fontWeight:'400',fontSize:field==='name'?36:field==='number'?30:24,width:65536}}
      onTextLayout={event=>{if(currentTextKey.current!==textKey)return;const width=event.nativeEvent.lines.length===1?event.nativeEvent.lines[0].width:Infinity;
       setMeasurements(previous=>{const values=previous?.key===textKey?previous.values:{};return values[field]===width?previous:{key:textKey,values:{...values,[field]:width}};});}}>{textValues[field]}</Text>)}
   </View>;
 if(fullPreview)return <AddCardSheet modalOnly virtualized title="Full preview" onClose={close} footer={
  <GlassButton style={styles.action} accessibilityLabel="Back to Share" onPress={()=>setFullPreview(false)}><Text style={styles.text}>Back to Share</Text></GlassButton>}>
  <View accessibilityLabel="Full share preview" style={styles.fullViewport} onLayout={event=>{const width=event.nativeEvent.layout.width;setFullWidth(previous=>previous===width?previous:width);}}>
   {textProbes}
   {!!error&&<Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
   <ScrollView key="share-full-scroll" style={styles.fullScroll} contentContainerStyle={styles.fullContent} removeClippedSubviews={false} contentOffset={FULL_PREVIEW_ORIGIN}>
    {preview}
   </ScrollView>
  </View>
 </AddCardSheet>;
 return <AddCardSheet modalOnly fixedFooter onContentViewportLayout={size=>setViewport(previous=>previous?.width===size.width&&previous.height===size.height?previous:size)} title="Share Card" onClose={close} closeDisabled={sharing} footer={
  <GlassButton kind="action" style={styles.action} accessibilityLabel="Share selected content" busy={sharing} disabled={!plan||!fontsLoaded||!!fontError||!!selection.error}
   onPress={share}><AddCardText maxWidth={Math.max(1,contentWidth-30)} style={[styles.text,styles.onAction]}>{sharing?'Preparing share...':'Share'}</AddCardText></GlassButton>}>
  <View style={styles.group} onLayout={event=>setContentWidth(event.nativeEvent.layout.width)}>
   {textProbes}
   {fontsLoaded&&!fullPreview&&<View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.probes}>
    {([['front','Front'],['cardTitle','Card'],['memberShort','Member No.'],['memberFull','Membership Number'],['barcode','Barcode']] as const).map(([key,value])=><Text key={key+fontScale} style={[styles.controlProbe,key==='cardTitle'?{fontSize:14,fontWeight:'700'}:key==='barcode'?{fontSize:11}:undefined]} onTextLayout={event=>{if(controlsEpoch.current!==fontScale)return;const width=Math.ceil(Math.max(0,...event.nativeEvent.lines.map(line=>line.width)));
     setControlMeasures(previous=>{const values=previous?.epoch===fontScale?previous.values:{};return values[key]===width?previous:{epoch:fontScale,values:{...values,[key]:width}};});}}>{value}</Text>)}
   </View>}
   <View accessibilityLabel="Mini share preview" style={[styles.preview,{height:previewHeight}]}>
    <View style={styles.previewContent}>{preview}</View>
    {exportPlan&&<View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.captureHost}>
     <ScrollView horizontal removeClippedSubviews={false} scrollEnabled={false}><CardShareSurface key={signature} plan={exportPlan} onReady={ready} onFailure={fail}/></ScrollView>
    </View>}
    {sharing&&<View style={styles.progress}><ActivityIndicator color={ciColors.action.primary}/><Text style={styles.text}>Preparing share...</Text></View>}
   </View>
   {!fullPreview&&<View accessibilityLabel={`Share selection controls. ${presentation.mode} columns`} onLayout={event=>{const height=event.nativeEvent.layout.height;setControlHeight(previous=>previous?.key===controlLayoutKey&&previous.height===height?previous:{key:controlLayoutKey,height});}} style={[styles.choices,presentation.mode==='three'?styles.controlsRow:styles.controlsStack]}>
    {presentation.mode==='two'?<View style={styles.controlsRow}>
     <View style={[styles.column,{width:presentation.widths.card}]}>{heading('Card')}{checkbox('front')}{checkbox('back')}</View>
     <View style={[styles.column,{width:presentation.widths.info}]}>{heading('Info')}{checkbox('name')}{checkbox('expiry')}{checkbox('number')}</View>
    </View>:<>
     <View style={[styles.column,{width:presentation.widths.card}]}>{heading('Card')}{checkbox('front')}{checkbox('back')}</View>
     <View style={[styles.column,{width:presentation.widths.info}]}>{heading('Info')}{checkbox('name')}{checkbox('expiry')}{checkbox('number')}</View>
    </>}
    <View style={[styles.column,{width:presentation.widths.code}]}>{heading('Code')}
     {presentation.segmentWidth>presentation.widths.code?<ScrollView ref={segmentScroll} horizontal nestedScrollEnabled onContentSizeChange={()=>segmentScroll.current?.scrollTo({x:Math.max(0,(selectedCode+.5)*(presentation.segmentWidth-8)/3-presentation.widths.code/2),animated:false})}>{codeControls}</ScrollView>:codeControls}
     {fullAction}
    </View>
   </View>}
   {!!error&&<Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
   {!!message&&<Text accessibilityLiveRegion="polite" style={styles.hint}>{message}</Text>}
  </View>
 </AddCardSheet>;
}
const styles=StyleSheet.create({
 group:{gap:10},preview:{overflow:'hidden',backgroundColor:'transparent',backgroundImage:'radial-gradient(ellipse at 45% 55%, #C6F5EB70, transparent 72%)'},previewContent:{alignItems:'center',flex:1,justifyContent:'center'},fullViewport:{flex:1,minHeight:0},fullScroll:{flex:1,minHeight:0},fullContent:{flexGrow:1,alignItems:'center',justifyContent:'center',paddingHorizontal:8,paddingVertical:8},
 probes:{position:'absolute',width:65536,opacity:0},controlProbe:{...ciTypography.body,fontSize:12,lineHeight:18,width:4096},controlRow:{flexDirection:'row',gap:8},codeChoice:{flex:1,minWidth:48,minHeight:48,paddingHorizontal:2,paddingVertical:6,alignItems:'center',justifyContent:'center'},
 segment:{flexDirection:'row',paddingHorizontal:3,borderWidth:1,borderColor:sheetVisual.border,borderRadius:28,backgroundColor:ciButtons.secondary},indicator:{position:'absolute',left:4,top:4,bottom:4,borderRadius:24,backgroundColor:ciButtons.primary},segmentText:{fontSize:11,textAlign:'center'},selectedText:{color:'#ffffff'},
 choices:{alignItems:'flex-start'},controlsRow:{flexDirection:'row',flexWrap:'nowrap',gap:4,alignItems:'flex-start'},controlsStack:{flexDirection:'column',gap:8},column:{minWidth:0,flexShrink:0},columnHeader:{flexDirection:'row',alignItems:'center',gap:4,paddingBottom:8,marginBottom:4,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:sheetVisual.border},columnTitle:{...ciTypography.section,fontSize:14,lineHeight:22,color:ciColors.text.primary,flexShrink:0},
 controlText:{...ciTypography.body,fontSize:12,lineHeight:18,color:ciColors.text.primary,flexShrink:1},choice:{minHeight:48,paddingVertical:4,flexDirection:'row',alignItems:'center',gap:4,borderRadius:8},
 fullAction:{minHeight:48,paddingVertical:6,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:5},
 layers:{width:16,height:22},layer:{position:'absolute',left:1,width:14,height:10,borderWidth:1.4,borderColor:ciColors.text.primary,borderRadius:2,transform:[{rotate:'-15deg'}]},infoIcon:{width:16,height:16,borderWidth:1.4,borderColor:ciColors.text.primary,borderRadius:9,alignItems:'center',justifyContent:'center'},infoGlyph:{...ciTypography.supporting,fontSize:11,lineHeight:14,color:ciColors.text.primary},
 checkbox:{width:16,height:16,borderWidth:1.5,borderColor:ciColors.brand.deep,borderRadius:4,alignItems:'center',justifyContent:'center'},checked:{backgroundColor:ciColors.brand.deep},check:{color:'#ffffff',fontSize:12,lineHeight:15},
 action:{minHeight:48,paddingVertical:10,paddingHorizontal:14},text:{...ciTypography.body,color:ciColors.text.primary,lineHeight:21,flexShrink:1},onAction:{color:ciColors.text.onAction},
 hint:{...ciTypography.supporting,color:ciColors.text.supporting},error:{...ciTypography.supporting,color:ciColors.status.error,fontSize:13,lineHeight:20,fontWeight:'400'},
 captureHost:{position:'absolute',left:0,top:0},progress:{...StyleSheet.absoluteFill,backgroundColor:sheetVisual.elevated,alignItems:'center',justifyContent:'center',gap:12},
});
