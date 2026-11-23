import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, ScrollView, View, type NativeSyntheticEvent, type NativeScrollEvent, type ScrollViewInstance } from 'react-native';
import type { CardSizePresetId } from '../../lib/card-size-presets';
import { cardCarouselLayout, nearestCarouselIndex } from './add-card-layout';

/** Selection belongs to the form. Native scroll offsets are presentation only. */
export function CardSizeCarousel({ width, selectedId, disabled, onSelect, renderPreview, photoAction }: {
  width: number; selectedId: CardSizePresetId; disabled: boolean;
  onSelect: (id: CardSizePresetId) => void;
  renderPreview: (id: CardSizePresetId, width: number, height: number, renderArtwork: boolean) => ReactNode;
  photoAction: ReactNode;
}) {
  const model = cardCarouselLayout(width, selectedId);
  const index = model.presets.findIndex(p => p.id === selectedId);
  const scroll = useRef<ScrollViewInstance>(null), dragging = useRef(false);
  const [reduceMotion, setReduceMotion] = useState(true);
  const epoch = `${width}:${model.presets[0].orientation}`;
  const [visible,setVisible]=useState({epoch,selectedId,index});
  const visibleIndex=visible.epoch===epoch&&visible.selectedId===selectedId?visible.index:index;
  const current = useRef({ epoch, selectedId, disabled });
  if (current.current.epoch !== epoch || current.current.selectedId !== selectedId || disabled) dragging.current = false;
  current.current = { epoch, selectedId, disabled };
  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (active) setReduceMotion(value); }, () => {});
    const listener = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => { active = false; listener.remove(); };
  }, []);
  useEffect(() => {
    scroll.current?.scrollTo({ x: model.offsets[index], animated: !reduceMotion });
  }, [epoch, selectedId, reduceMotion]);
  function settle(event: NativeSyntheticEvent<NativeScrollEvent>) {
    if (!dragging.current || current.current.epoch !== epoch || current.current.selectedId !== selectedId || current.current.disabled) return;
    dragging.current = false;
    const next = nearestCarouselIndex(model.offsets, event.nativeEvent.contentOffset.x);
    if (model.presets[next].id !== selectedId) onSelect(model.presets[next].id);
    else scroll.current?.scrollTo({ x: model.offsets[index], animated: !reduceMotion });
  }
  return <View testID="card-size-carousel" style={{ width, height: model.height }}>
    <ScrollView key={epoch} ref={scroll} horizontal nestedScrollEnabled directionalLockEnabled
      scrollEnabled={!disabled} showsHorizontalScrollIndicator={false} bounces={false} overScrollMode="never"
      scrollEventThrottle={32} onScroll={event=>{
        if(current.current.epoch!==epoch||current.current.selectedId!==selectedId)return;
        const next=nearestCarouselIndex(model.offsets,event.nativeEvent.contentOffset.x);
        setVisible(previous=>previous.epoch===epoch&&previous.selectedId===selectedId&&previous.index===next?previous:{epoch,selectedId,index:next});
      }}
      snapToOffsets={model.offsets} decelerationRate="fast" disableIntervalMomentum
      contentOffset={{ x: model.offsets[index], y: 0 }} keyboardShouldPersistTaps="handled"
      onScrollBeginDrag={() => { if (current.current.epoch === epoch && !current.current.disabled) dragging.current = true; }}
      onScrollEndDrag={event => { if (Math.abs(event.nativeEvent.velocity?.x ?? 0) < .05) settle(event); }}
      onMomentumScrollEnd={settle}
      contentContainerStyle={{ paddingLeft: model.leading, paddingRight: model.trailing, alignItems: 'center', gap: model.gap }}>
      {model.presets.map((preset, i) => <View key={preset.id} testID={`carousel-${preset.id}`}
        accessibilityElementsHidden={i !== index} importantForAccessibility={i === index ? 'auto' : 'no-hide-descendants'}
        style={{ width: model.sizes[i].width, height: model.sizes[i].height, opacity: i === index ? 1 : .45 }}>
        {renderPreview(preset.id, model.sizes[i].width, model.sizes[i].height, Math.abs(i-visibleIndex)<=1)}
        {i === index && <View pointerEvents="box-none" testID="card-photo-action-host"
          style={{ position:'absolute',top:0,bottom:0,left:0,right:0,alignItems:'center',justifyContent:'center',overflow:'hidden',borderRadius:14 }}>{photoAction}</View>}
      </View>)}
    </ScrollView>
  </View>;
}
