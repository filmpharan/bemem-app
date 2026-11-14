import { useEffect,useMemo,useRef,useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import type { CardArtwork } from '../../types/membership-card';
import { artworkFrame } from '../../lib/card-artwork';
import { artworkUri } from '../../lib/card-artwork-store';
import { CARD_CORNER_RADIUS } from '../../constants/card-appearance';
import { artworkClock,artworkTiming } from '../../lib/artwork-performance';

export function CardArtworkImage({ image, onReady, onFailure, onDimensions, sourceUri, cornerRadius = CARD_CORNER_RADIUS, thumbnail = false }: {
  image: CardArtwork; onReady?: () => void; onFailure?: () => void; sourceUri?: string; cornerRadius?: number; thumbnail?: boolean;
  onDimensions?: (dimensions:{width:number;height:number})=>void;
}) {
  const uri=sourceUri??artworkUri(image.assetId),identity=image.assetId+'|'+uri;
  const request=useRef({identity,sequence:0,token:{},start:artworkClock()});
  if(request.current.identity!==identity)request.current={identity,sequence:request.current.sequence+1,token:{},start:artworkClock()};
  const {token,sequence,start}=request.current,mounted=useRef(true);
  const displayed=useRef<object|null>(null);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
  const current=()=>mounted.current&&request.current.token===token;
  const source=useMemo(()=>({uri}),[uri]);
  const [size, setSize] = useState({ width: 0, height: 0 }), [failed, setFailed] = useState<object|null>(null),[visible,setVisible]=useState<object|null>(null);
  const [loaded,setLoaded]=useState({token,width:image.width,height:image.height});
  const decoded=loaded.token===token?loaded:{width:image.width,height:image.height};
  const downscale=thumbnail||!!sourceUri;
  return <View pointerEvents="none" accessible={false} style={[styles.clip, { borderRadius: cornerRadius }]}
    onLayout={event => { const { width, height } = event.nativeEvent.layout; setSize(old=>old.width===width&&old.height===height?old:{width,height}); }}>
    {size.width > 0 && size.height > 0 && failed!==token && <Image key={identity+sequence} recyclingKey={identity+sequence} source={source}
      contentFit={downscale ? 'contain' : 'fill'} allowDownscaling={downscale} transition={0} cachePolicy={sourceUri?'memory-disk':'memory'}
      onDisplay={()=>{if(!current()||displayed.current===token)return;displayed.current=token;setVisible(token);if(sourceUri)artworkTiming('preview-visible',start);onReady?.();}}
      onError={() => { if(current()){setFailed(token);onFailure?.();} }}
      onLoad={event=>{if(!current())return;const {width,height}=event.source;if(width>0&&height>0&&Math.abs(width/height-decoded.width/decoded.height)>.001){setLoaded({token,width,height});onDimensions?.({width,height});}}}
      style={[styles.image, artworkFrame({...image,...decoded}, size.width, size.height)]} />}
    {failed!==token&&visible!==token&&<View pointerEvents="none" accessible accessibilityLabel="Loading artwork" style={[StyleSheet.absoluteFill,{backgroundColor:'#eceff1'}]}/>}
    {failed===token && <Text style={styles.error}>Artwork unavailable</Text>}
  </View>;
}
const styles = StyleSheet.create({
  clip: { ...StyleSheet.absoluteFill, borderRadius: CARD_CORNER_RADIUS, overflow: 'hidden' },
  image: { position: 'absolute' }, error: { padding: 8, color: '#ffffff', backgroundColor: '#263943', fontSize: 12 },
});
