import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import { core } from '../../constants/lagoon-theme';
import { ciButtons } from '../../constants/ci-theme';

type Props = Omit<PressableProps, 'children' | 'style'> & {
  children: ReactNode; kind?: 'utility' | 'action' | 'gel'; selected?: boolean;
  tone?: 'tertiary'; busy?: boolean; style?: StyleProp<ViewStyle>;
};

/** Retain the widely used API; render only flat fill, border and existing content geometry. */
export function GlassButton({ children, kind = 'utility', selected, tone, busy, disabled, style, ...props }: Props) {
  const action = kind === 'action', tertiary = tone === 'tertiary';
  const layout = { ...StyleSheet.flatten(style) };
  // Local legacy decorations cannot reintroduce raised/glossy buttons. Geometry is preserved.
  for (const key of ['boxShadow', 'elevation', 'shadowColor', 'shadowOffset', 'shadowOpacity', 'shadowRadius', 'backgroundImage', 'experimental_backgroundImage']) {
    delete (layout as Record<string, unknown>)[key];
  }
  return <Pressable {...props} disabled={disabled || busy}
    accessibilityRole="button" accessibilityState={{ ...(selected === undefined ? {} : { selected }), ...props.accessibilityState, disabled: !!disabled || !!busy, busy: !!busy }}
    style={({ pressed }) => [styles.button, layout, {
      backgroundColor: tertiary ? (pressed && !disabled && !busy ? ciButtons.secondary : 'transparent')
        : action ? (disabled && !busy ? ciButtons.disabledPrimary : pressed || busy ? ciButtons.primaryPressed : ciButtons.primary)
        : disabled && !busy ? ciButtons.disabledSurface : pressed ? ciButtons.secondaryPressed : selected ? ciButtons.selected : ciButtons.secondary,
      borderColor: tertiary || action ? 'transparent' : disabled ? ciButtons.disabledBorder : selected ? ciButtons.primary : ciButtons.border,
    }]}>
    <View pointerEvents="none" style={[styles.content,disabled&&!busy&&!action&&styles.inactiveContent]}>{children}</View>
  </Pressable>;
}
const styles = StyleSheet.create({
  button: { minWidth: 48, minHeight: 48, borderWidth: 1, borderRadius: core.radius.utility, justifyContent: 'center', alignItems: 'center' },
  inactiveContent: { opacity: .55 },
  content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 2 },
});
