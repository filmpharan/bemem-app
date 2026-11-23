import {useEffect,useRef,useState,type ComponentRef} from 'react';
import {PixelRatio,StyleSheet,Text,View} from 'react-native';
import {Image} from 'expo-image';
import type {CardSharePlan,ShareField} from '../../lib/card-share-plan';
import {emptyCardForm} from '../../lib/card-form';
import {emptyCardPresentation} from '../../lib/card-presentation';
import {fontForUiText} from '../../constants/ci-theme';
import {CardAppearancePreview} from './CardAppearancePreview';

/** One composition at two resolutions: preview never captures, starts timers or prepares PNG files. */
export function CardShareSurface({plan,displayWidth,onReady,onFailure}:{plan:CardSharePlan;displayWidth?:number;onReady?:(view:ComponentRef<typeof View>)=>void;onFailure?:()=>void}){
 // The HD artwork design uses 3 output pixels per UI dp, including its existing14dp corners.
 const scale=displayWidth===undefined?1/PixelRatio.get():displayWidth/plan.width,root=useRef<ComponentRef<typeof View>>(null);
 const [laidOut,setLaidOut]=useState(false),[ready,setReady]=useState<ShareField[]>([]),sent=useRef(false);
 const media=plan.fields.filter(f=>f==='front'||f==='back'?!!plan.appearance.artwork?.[f]:true);
 const complete=(field:ShareField)=>setReady(previous=>previous.includes(field)?previous:[...previous,field]);
 const readySignature=ready.join('|');
 useEffect(()=>{if(!onReady)return;const timer=setTimeout(()=>{if(!sent.current)onFailure?.();},15000);return()=>clearTimeout(timer);},[onReady,onFailure]);
 useEffect(()=>{if(!onReady||!laidOut||sent.current||media.some(f=>!ready.includes(f)))return;
  let second=0;const first=requestAnimationFrame(()=>{second=requestAnimationFrame(()=>{if(root.current&&!sent.current){sent.current=true;onReady(root.current);}});});
  return()=>{cancelAnimationFrame(first);cancelAnimationFrame(second);};
 },[laidOut,readySignature,onReady]);
 return <View ref={root} collapsable={false} pointerEvents="none" accessible={false} style={[styles.surface,{width:plan.width*scale,height:plan.height*scale}]}
  onLayout={event=>{if(!onReady)return;const {width,height}=event.nativeEvent.layout;if(height/scale>4096.5||width*height/(scale*scale)>8_000_001){onFailure?.();return;}if(width>0&&height>0)setLaidOut(true);}}>
  {plan.items.map(item=>{const field=item.field,frame={position:'absolute' as const,left:item.x*scale,top:item.y*scale,width:item.width*scale,height:item.height*scale};
   if(field==='front'||field==='back')return <View key={field} style={frame}><CardAppearancePreview values={{...emptyCardForm(),name:'',memberNumber:'',orientation:plan.orientation}}
    presentation={{...emptyCardPresentation(),side:field,sizePresetId:plan.sizePresetId??(plan.orientation==='portrait'?'card-portrait':'card-landscape')}}
    appearance={plan.appearance} width={item.width*scale} height={item.height*scale} showText={false}
    onArtworkReady={onReady?()=>complete(field):undefined} onArtworkFailure={onFailure} renderScale={3*scale}/></View>;
   if(field==='qr'||field==='barcode'){const code=plan.codes[field]!;return <Image key={field} source={{uri:code.uri,width:code.width,height:code.height}} contentFit="contain" transition={0} cachePolicy="none"
    onDisplay={onReady?()=>complete(field):undefined} onError={onFailure} style={[frame,{backgroundColor:'#ffffff'}]}/>;}
   const value=plan.texts[field]!;return <Text key={field} allowFontScaling={false} onTextLayout={event=>{
     if(event.nativeEvent.lines.length>1||event.nativeEvent.lines.some(line=>line.width>item.width*scale+1)){onFailure?.();return;}if(onReady)complete(field);
    }} style={[styles.text,frame,{fontFamily:fontForUiText(value),fontSize:item.fontSize!*scale,lineHeight:item.lineHeight!*scale,letterSpacing:item.letterSpacing!*scale,textAlign:item.align,fontWeight:'400'}]}>{value}</Text>;
  })}
 </View>;
}

const styles=StyleSheet.create({surface:{alignItems:'center',backgroundColor:'#ffffff'},text:{color:'#000000',textAlign:'center',includeFontPadding:true}});
