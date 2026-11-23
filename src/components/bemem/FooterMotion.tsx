import { useEffect, useImperativeHandle, useRef, type Ref } from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';
import Animated, { cancelAnimation, Easing, interpolateColor, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { ciColors, ciTypography } from '../../constants/ci-theme';
import { FooterIcon, type FooterIconName } from './FooterIcon';

export const footerVisual = { active: ciColors.action.primary, inactive: '#58747A', duration: 200 } as const;
export type FooterPressHandle = { press: (pressed: boolean) => void };
/** One entrance per mounted presentation, including logical reopen during the existing tail. */
export function CanvasSelectorVisual({ reduced, style, ...props }: ViewProps & { reduced: boolean }) {
  const opacity = useSharedValue(reduced ? 1 : 0), entered = useRef(false);
  useEffect(() => {
    if (!entered.current) {
      entered.current = true;
      opacity.value = reduced ? 1 : withTiming(1, { duration: 120, easing: Easing.out(Easing.cubic) });
    } else if (reduced) {
      cancelAnimation(opacity); opacity.value = 1;
    }
  }, [reduced, opacity]);
  useEffect(() => () => {
    cancelAnimation(opacity);
    // Also leave an immediate endpoint if development Strict Effects replays setup.
    opacity.value = 1;
  }, [opacity]);
  const motion = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View {...props} style={[style, motion]} />;
}
export function FooterItemVisual({ name, label, active, disabled, reduced, width, ref }: {
  name: FooterIconName; label: string; active: boolean; disabled: boolean; reduced: boolean; width: number; ref?: Ref<FooterPressHandle>;
}) {
  const phase = useSharedValue(active ? 1 : 0), scale = useSharedValue(1);
  useImperativeHandle(ref, () => ({ press(pressed) {
    scale.value = withTiming(!disabled && !reduced && pressed ? .95 : 1, { duration: reduced ? 0 : footerVisual.duration, easing: Easing.out(Easing.cubic) });
  } }), [disabled, reduced]);
  useEffect(() => {
    phase.value = withTiming(active ? 1 : 0, { duration: reduced ? 0 : footerVisual.duration, easing: Easing.out(Easing.cubic) });
    if (disabled || reduced) { cancelAnimation(scale); scale.value = 1; }
  }, [active, disabled, reduced, phase, scale]);
  useEffect(() => () => { cancelAnimation(phase); cancelAnimation(scale); }, [phase, scale]);
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const inactiveStyle = useAnimatedStyle(() => ({ opacity: 1 - phase.value }));
  const activeStyle = useAnimatedStyle(() => ({ opacity: phase.value }));
  const textStyle = useAnimatedStyle(() => ({ color: interpolateColor(phase.value, [0, 1], [footerVisual.inactive, footerVisual.active]) }));
  return <Animated.View pointerEvents="none" style={[styles.content, { width }, pressStyle]}>
    <View style={styles.icon}>
      <Animated.View style={[styles.layer, inactiveStyle]}><FooterIcon name={name} color={footerVisual.inactive} /></Animated.View>
      <Animated.View style={[styles.layer, activeStyle]}><FooterIcon name={name} color={footerVisual.active} filled={name === 'home'} /></Animated.View>
    </View>
    <Animated.Text style={[styles.label, textStyle]}>{label}</Animated.Text>
  </Animated.View>;
}
/** Presentation follows the confirmed page prop, never a requested destination. */
export function CanvasSelectionPill({ page, width, reduced }: { page: number; width: number; reduced: boolean }) {
  const segment = Math.max(0, width) / 5, destination = segment * (page - 1);
  const position = useSharedValue(destination), previousWidth = useSharedValue(width);
  useEffect(() => {
    const resized = previousWidth.value !== width; previousWidth.value = width;
    position.value = withTiming(destination, { duration: reduced || resized ? 0 : footerVisual.duration, easing: Easing.out(Easing.cubic) });
  }, [destination, width, reduced, position, previousWidth]);
  useEffect(() => () => cancelAnimation(position), [position]);
  const motion = useAnimatedStyle(() => ({ transform: [{ translateX: position.value }] }));
  return <Animated.View testID="canvas-selected-pill" pointerEvents="none" accessible={false} style={[styles.canvasPill, { width: segment }, motion]} />;
}
const styles = StyleSheet.create({
  content: { alignItems: 'center', justifyContent: 'center', gap: 3 }, icon: { width: 24, height: 24 },
  layer: { position: 'absolute', left: 0, top: 0 },
  label: { ...ciTypography.supporting, fontWeight: '600', textAlign: 'center', width: '100%', flexShrink: 1 },
  canvasPill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 999, backgroundColor: '#B7E6DC' },
});
