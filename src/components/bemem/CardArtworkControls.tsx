import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Keyboard, Modal, PanResponder, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { CardArtwork } from '../../types/membership-card';
import type { CardPresentationDraft } from '../../lib/card-presentation';
import { deviceArtworkStore } from '../../lib/card-artwork-store';
import { cardPaintSize } from '../../lib/card-geometry';
import { createArtworkGesture, zoomArtwork, cropClamp } from '../../lib/artwork-adjustment';
import { ArtworkSlider } from './ArtworkSlider';
import { cardSizePreset } from '../../lib/card-size-presets';
import { lagoon, lagoonFonts } from '../../constants/lagoon-theme';
import { GlassButton } from './GlassButton';
import { AddCardIcon } from './AddCardIcon';
import { CardArtworkImage } from './CardArtworkImage';
import { addCardLayout as layout } from './add-card-layout';

/** Uses one persistent file per selection. Crop is non-destructive metadata, never a stretched bitmap. */
export function CardArtworkControls({ presentation, onChange, disabled, onBusy }: {
  presentation: CardPresentationDraft; onChange: (next: CardPresentationDraft) => void; disabled: boolean; onBusy?: (busy: boolean) => void; simpleReplacement?: boolean;
}) {
  const [busy, setBusy] = useState(false), [crop, setCrop] = useState<CardArtwork | null>(null);
  const active = useRef(true), running = useRef(false);
  const cropSide = useRef(presentation.side);
  const cropSession = useRef<CardArtwork|null>(null);
  const change = useRef(onChange);change.current=onChange;
  const latest = useRef(presentation); latest.current = presentation;
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  async function choose(camera: boolean) {
    if (running.current || disabled) return;
    running.current = true; setBusy(true); onBusy?.(true); Keyboard.dismiss();
    const side = presentation.side;
    try {
      if (camera) {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) { Alert.alert('Camera permission needed', 'Allow camera access in system settings to take a photo. You can still choose a photo from Gallery.'); return; }
      }
      // System photo picker grants access only to the chosen image; no broad library permission requested.
      if (!active.current) return;
      const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], allowsEditing: false, quality: 0.9,
        preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible };
      const result = camera ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
      if (!active.current || result.canceled) return;
      const input = result.assets?.[0]; if (!input) throw Error('No image was selected.');
      const image = await deviceArtworkStore.retain(input);
      if (!active.current) return;
      cropSide.current = side; cropSession.current=image;setCrop(image);
    } catch (error) {
      if (active.current) Alert.alert('Image unavailable', error instanceof Error && /^(Choose|The image|No image)/.test(error.message)
        ? error.message : 'The image could not be opened or copied. Your form and previous artwork are unchanged.');
    } finally { running.current = false; if (active.current) { setBusy(false); onBusy?.(false); } }
  }
  const preset = cardSizePreset(presentation.sizePresetId);
  const paint = cardPaintSize(preset.ratioWidth,preset.ratioHeight);
  return <>
    <GlassButton disabled={disabled || busy} accessibilityLabel="Choose from Gallery" hitSlop={6} style={styles.tool} onPress={() => { void choose(false); }}><AddCardIcon name="image" /></GlassButton>
    <GlassButton disabled={disabled || busy} accessibilityLabel="Take Photo" hitSlop={6} style={styles.tool} onPress={() => { void choose(true); }}><AddCardIcon name="camera" /></GlassButton>
    {busy && <Text accessibilityLiveRegion="polite" style={styles.hint}>Opening...</Text>}
    {crop && <ArtworkCrop image={crop} ratio={paint.width / paint.height} side={cropSide.current} onCancel={() => {cropSession.current=null;setCrop(null);}}
      onConfirm={next => {if(!active.current||cropSession.current!==crop)return;cropSession.current=null;
        change.current({ ...latest.current, artwork: { ...latest.current.artwork, [cropSide.current]: next } }); setCrop(null); }} />}
  </>;
}
export function ArtworkCrop({ image, ratio, side = 'front', onCancel, onConfirm, sourceUri }: { image: CardArtwork; ratio: number; side?: 'front'|'back'; onCancel: () => void; onConfirm: (image: CardArtwork) => void; sourceUri?: string }) {
  const [value,setValue]=useState(image),[grid,setGrid]=useState(false),[fine,setFine]=useState(false);
  const [ready,setReady]=useState(false),[failed,setFailed]=useState(false),visible=useRef(false);
  const {width:screenWidth,height:screenHeight}=useWindowDimensions();
  const [available,setAvailable]=useState(Math.min(560,screenWidth-40));
  const height=Math.min(available/ratio,Math.max(160,screenHeight*.45)),width=height*ratio;
  const current=useRef(value);current.current=value;
  const update=(crop:CardArtwork['crop'])=>{const next={...current.current,crop};current.current=next;setValue(next);};
  const gesture=useMemo(()=>createArtworkGesture(value,width,height,()=>current.current.crop,update),[value.width,value.height,width,height]);
  const origin=useRef({x:0,y:0});
  const points=(e: Parameters<NonNullable<Parameters<typeof PanResponder.create>[0]['onPanResponderMove']>>[0])=>Array.from(e.nativeEvent.touches).map(t=>({x:t.pageX-origin.current.x,y:t.pageY-origin.current.y}));
  const responder=useMemo(()=>PanResponder.create({onStartShouldSetPanResponder:()=>true,onMoveShouldSetPanResponder:()=>true,
    onPanResponderGrant:e=>{origin.current={x:e.nativeEvent.pageX-e.nativeEvent.locationX,y:e.nativeEvent.pageY-e.nativeEvent.locationY};gesture.begin(points(e));},
    onPanResponderMove:e=>gesture.move(points(e)),onPanResponderRelease:()=>gesture.end(),onPanResponderTerminate:()=>gesture.end(),
    onPanResponderTerminationRequest:()=>false,onShouldBlockNativeResponder:()=>true}),[gesture]);
  const zoom=(z:number)=>update(zoomArtwork(current.current,current.current.crop,width,height,z));
  const reset=()=>update({...image.crop});
  return <Modal visible onRequestClose={onCancel} animationType="none" statusBarTranslucent navigationBarTranslucent>
    <SafeAreaView style={styles.overlay}>
      <View style={styles.cropHeader}><Text accessibilityRole="header" style={styles.title}>Adjust image</Text>
        <GlassButton style={styles.close} accessibilityLabel="Cancel image crop" onPress={onCancel}><AddCardIcon name="close" size={22}/></GlassButton></View>
      <ScrollView style={{flex:1}} contentContainerStyle={styles.cropSheet}>
        <Text style={styles.hint}>{side==='front'?'Front':'Back'}</Text>
        <View onLayout={e=>setAvailable(Math.min(560,e.nativeEvent.layout.width))} style={{width:'100%',alignItems:'center'}}>
          <View accessibilityLabel="Image crop viewport" style={{width,height,borderRadius:14,overflow:'hidden'}} {...responder.panHandlers}>
            <CardArtworkImage image={value} sourceUri={sourceUri} onReady={()=>{visible.current=true;setReady(true);}}
              onFailure={()=>{visible.current=false;setReady(false);setFailed(true);}}
              onDimensions={dimensions=>{const next={...current.current,...dimensions};current.current=next;setValue(next);}} />
            {grid && <View pointerEvents="none" accessible={false} style={StyleSheet.absoluteFill}>{[1,2].map(n=><View key={n} style={[StyleSheet.absoluteFill,{left:width*n/3,width:1,backgroundColor:'#ffffff80'}]}/>)}{[1,2].map(n=><View key={n} style={[StyleSheet.absoluteFill,{top:height*n/3,height:1,backgroundColor:'#ffffff80'}]}/>)}</View>}
          </View>
        </View>
        <Text style={[styles.hint,{textAlign:'center'}]}>Drag to frame · Pinch to zoom</Text>
        {failed&&<Text accessibilityRole="alert" style={styles.hint}>Image unavailable. Cancel and choose another image.</Text>}
        <View style={styles.zoomRow}>
          <GlassButton style={styles.close} accessibilityLabel="Zoom out" onPress={()=>zoom(current.current.crop.zoom-.1)}><Text style={styles.buttonText}>−</Text></GlassButton>
          <ArtworkSlider label="Image zoom" value={value.crop.zoom} min={1} max={3} onChange={zoom}/>
          <GlassButton style={styles.close} accessibilityLabel="Zoom in" onPress={()=>zoom(current.current.crop.zoom+.1)}><Text style={styles.buttonText}>+</Text></GlassButton>
        </View>
        <View style={styles.row}><GlassButton style={styles.button} accessibilityLabel="Reset image crop" onPress={reset}><Text style={styles.buttonText}>Reset</Text></GlassButton>
          <GlassButton style={styles.button} accessibilityLabel="Toggle crop grid" selected={grid} accessibilityState={{selected:grid}} onPress={()=>setGrid(!grid)}><Text style={styles.buttonText}>Grid {grid?'on':'off'}</Text></GlassButton></View>
        <GlassButton style={styles.button} accessibilityLabel="Fine adjustment" accessibilityState={{expanded:fine}} onPress={()=>setFine(!fine)}><Text style={styles.buttonText}>Fine adjustment</Text><AddCardIcon name="chevron"/></GlassButton>
        {fine && <View style={{gap:8}}>{(['x','y'] as const).map(axis=><View key={axis} style={{gap:2}}><Text style={styles.hint}>{axis==='x'?'Horizontal':'Vertical'}</Text>
          <ArtworkSlider label={axis==='x'?'Horizontal image position':'Vertical image position'} value={value.crop[axis]} min={0} max={1}
            onChange={v=>update({...current.current.crop,[axis]:cropClamp(v)})}/></View>)}</View>}
      </ScrollView>
      <View style={styles.footer}><GlassButton style={[styles.button,{flex:1}]} accessibilityLabel="Cancel image crop" onPress={onCancel}><Text style={styles.buttonText}>Cancel</Text></GlassButton>
        <GlassButton kind="action" disabled={!ready||failed} style={[styles.button,{flex:2}]} accessibilityLabel="Use image crop" onPress={()=>{if(visible.current)onConfirm(current.current);}}><Text style={[styles.buttonText,styles.onAction]}>Use Image</Text></GlassButton></View>
    </SafeAreaView>
  </Modal>;
}
const styles=StyleSheet.create({
  tool:{width:layout.toolSize,height:layout.toolSize,minWidth:layout.toolSize,minHeight:layout.toolSize,borderRadius:layout.buttonRadius},
  overlay:{flex:1,backgroundColor:lagoon.canvas.base},cropSheet:{padding:20,gap:12},
  cropHeader:{paddingHorizontal:20,paddingVertical:12,flexDirection:'row',alignItems:'center',gap:12},
  title:{flex:1,fontFamily:lagoonFonts.latin,fontWeight:'800',fontSize:20,lineHeight:28,color:lagoon.text.primary},
  close:{width:48,height:48,minWidth:48,minHeight:48,borderRadius:24},
  hint:{fontFamily:lagoonFonts.latin,fontSize:12,lineHeight:18,color:lagoon.text.secondary},
  row:{flexDirection:'row',justifyContent:'space-between',gap:12},zoomRow:{flexDirection:'row',alignItems:'center',gap:12},
  button:{minHeight:48,padding:10,borderRadius:14},buttonText:{fontFamily:lagoonFonts.latin,fontSize:14,lineHeight:21,color:lagoon.text.primary,flexShrink:1},
  onAction:{color:lagoon.text.onAction},footer:{flexDirection:'row',padding:16,gap:12},
});
