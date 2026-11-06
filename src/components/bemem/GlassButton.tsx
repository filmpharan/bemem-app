import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import { alpha, core, lagoon } from '../../constants/lagoon-theme';

type Props = Omit<PressableProps, 'children' | 'style'> & {
  children: ReactNode; kind?: 'utility' | 'action' | 'gel'; selected?: boolean;
  busy?: boolean; style?: StyleProp<ViewStyle>;
};

/** Static opaque fallback: no native blur, animated glare, or drag-frame effect work. */
export function GlassButton({ children, kind = 'utility', selected, busy, disabled, style, ...props }: Props) {
  const inactive = disabled && !busy;
  const action = kind === 'action';
  const recipe = core.materials[inactive ? 'inactive' : selected && kind === 'utility' ? 'utilitySelected' : kind];
  // Keep white action labels on a dark solid fill even when disabled.
  const fill = action ? lagoon.action.primary : lagoon.surface.reducedTransparency;
  const radius = Number(StyleSheet.flatten(style)?.borderRadius ?? core.radius.utility);
  return <Pressable {...props} disabled={disabled || busy}
    accessibilityRole="button" accessibilityState={{ ...props.accessibilityState, disabled: !!disabled || !!busy, busy: !!busy }}
    style={({ pressed }) => [styles.button, {
      backgroundColor: fill,
      borderColor: selected ? lagoon.action.primary : alpha(lagoon.rim.boundary, action ? 0.85 : 0.7),
      boxShadow: inactive ? 'none' : `0 ${pressed ? 4 : 9}px ${pressed ? 12 : 24}px -9px ${alpha(lagoon.shadow.tint, 0.25)}`,
    }, style]}>
    {({ pressed }) => <>
      <View pointerEvents="none" accessible={false} style={[StyleSheet.absoluteFill, styles.clip, {
        borderRadius: radius,
        backgroundImage: `linear-gradient(180deg, ${alpha(lagoon.highlight.specular, pressed ? 0.05 : 0.15)}, transparent 30%, transparent 78%, ${alpha(lagoon.action.deep, recipe.bottomOcclusionAlpha)})`,
      }]} />
      <View pointerEvents="none" accessible={false} style={[styles.innerRim, {
        borderRadius: radius - 2,
        borderColor: alpha(lagoon.rim.outer, recipe.rimOuterAlpha),
      }]} />
      <View pointerEvents="none" accessible={false} style={[styles.specular, {
        height: kind === 'gel' ? 14 : 9,
        backgroundImage: `linear-gradient(175deg, ${alpha(lagoon.highlight.specular, pressed ? 0.28 : recipe.highlightTopAlpha)}, transparent)`,
      }]} />
      <View pointerEvents="none" accessible={false} style={[styles.depth, {
        backgroundImage: `radial-gradient(ellipse at 12% 0%, ${alpha(lagoon.highlight.body, recipe.highlightBodyAlpha)}, transparent 65%)`,
      }]} />
      <View pointerEvents="none" style={styles.content}>{children}</View>
    </>}
  </Pressable>;
}

const styles = StyleSheet.create({
  button: { minWidth: 48, minHeight: 48, borderWidth: 1, borderRadius: core.radius.utility, justifyContent: 'center', alignItems: 'center' },
  clip: { borderRadius: core.radius.utility },
  innerRim: { ...StyleSheet.absoluteFill, margin: 2, borderWidth: 1, borderRadius: core.radius.utility - 2 },
  specular: { position: 'absolute', left: 8, right: 8, top: 3, borderRadius: 12 },
  depth: { position: 'absolute', left: 2, right: 2, top: 2, height: 13, borderRadius: 16 },
  content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 2 },
});
