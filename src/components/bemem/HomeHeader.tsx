import { useState } from 'react';
import { useFonts } from 'expo-font';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import manrope from '../../../assets/fonts/lagoon/manrope.ttf';
import { bemem } from '../../constants/bemem-theme';
import { core, lagoon, lagoonFonts } from '../../constants/lagoon-theme';
import { GlassButton } from './GlassButton';
import { BememIcon } from './BememIcon';

type Props = { editing: boolean; searchOpen: boolean; disabled: boolean; onBack: () => void; onSearch: () => void; onCreate: () => void; onLogo: () => void };
export function HomeHeader({ editing, searchOpen, disabled, onBack, onSearch, onCreate, onLogo }: Props) {
  // Observe font readiness here too: a cached fallback-font measurement must not
  // constrain Manrope after the root's asynchronous font registration finishes.
  const [fontReady] = useFonts({ BememManrope: manrope });
  const { fontScale } = useWindowDimensions();
  const scale = Math.min(fontScale, 1.25);
  const [headerWidth, setHeaderWidth] = useState(0);
  const [measured, setMeasured] = useState<Record<string, number>>({});
  const label = editing ? 'Create PRO' : 'Create';
  const epoch = `${fontReady}-${fontScale}`;
  const logoKey = `${epoch}-bemem.`;
  const labelKey = `${epoch}-${label}`;
  const logoWidth = Math.ceil((measured[logoKey] ?? 126 * scale) + 12 * scale);
  const labelWidth = Math.ceil((measured[labelKey] ?? label.length * 11 * scale) + 10 * scale);
  const buttonWidth = labelWidth + 32; // 15 padding each side + two 1-unit borders.
  const controlsWidth = 48 + 8 + buttonWidth;
  const stacked = headerWidth > 0 && logoWidth + 8 + controlsWidth > headerWidth - 2 * core.geometry.header.paddingHorizontal;
  const font = { fontFamily: fontReady ? lagoonFonts.latin : undefined };
  function record(key: string, width: number) {
    const rounded = Math.ceil(width);
    if (rounded > 0) setMeasured(previous => previous[key] === rounded ? previous : { ...previous, [key]: rounded });
  }
  return <View onLayout={event => setHeaderWidth(event.nativeEvent.layout.width)} style={styles.header}>
    {/* Wide, non-interactive probes measure the entire string without button constraints. */}
    <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.measure}>
      <Text key={logoKey} maxFontSizeMultiplier={1.25} style={[styles.logo, font]}
        onTextLayout={event => record(logoKey, event.nativeEvent.lines[0]?.width ?? 0)}>bemem<Text style={styles.dot}>.</Text></Text>
      <Text key={labelKey} maxFontSizeMultiplier={1.25} style={[styles.createText, font]}
        onTextLayout={event => record(labelKey, event.nativeEvent.lines[0]?.width ?? 0)}>{label}</Text>
    </View>
    <Pressable accessibilityRole="button" accessibilityLabel="bemem. Back to Home" onPress={onLogo} disabled={disabled} style={[styles.logoButton, { width: logoWidth }]}>
      <Text key={epoch} maxFontSizeMultiplier={1.25} style={[styles.logo, font]}>bemem<Text style={styles.dot}>.</Text></Text>
    </Pressable>
    <View style={[styles.actionSlot, stacked && styles.stacked]}><View style={[styles.actions, { width: controlsWidth }]}>
      <GlassButton accessibilityLabel={editing ? 'Back to Home' : searchOpen ? 'Close search' : 'Search cards'}
        accessibilityState={editing ? { disabled } : { expanded: searchOpen, disabled }} onPress={editing ? onBack : onSearch} disabled={disabled}
        selected={!editing && searchOpen} style={styles.search}>
        <BememIcon name={editing ? 'chevron-left' : searchOpen ? 'close' : 'search'} color={lagoon.text.primary} />
      </GlassButton>
      <GlassButton accessibilityLabel={editing ? 'Create PRO' : 'Create'} disabled={disabled} onPress={onCreate}
        kind={editing ? 'action' : 'utility'} style={[styles.create, { width: buttonWidth }]}>
        <Text key={labelKey} maxFontSizeMultiplier={1.25} style={[styles.createText, font, { width: labelWidth, color: editing ? lagoon.text.onAction : lagoon.text.primary }]}>{label}</Text>
      </GlassButton>
    </View></View>
  </View>;
}
const styles = StyleSheet.create({
  // Keep the wordmark's intrinsic width. On narrow/scaled layouts, move the
  // control group to a right-aligned second row rather than squeezing the logo.
  header: { paddingHorizontal: core.geometry.header.paddingHorizontal, paddingTop: 14, paddingBottom: 8, minHeight: 70, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  logoButton: { minHeight: 44, justifyContent: 'center', flexShrink: 0 },
  logo: { fontSize: 30, lineHeight: 38, fontWeight: '800', letterSpacing: -1.2, fontFamily: lagoonFonts.latin, color: bemem.foreground },
  dot: { color: lagoon.action.primary },
  actionSlot: { flexShrink: 0, marginLeft: 'auto', alignItems: 'flex-end' },
  stacked: { width: '100%' },
  actions: { flexDirection: 'row', gap: 8, alignItems: 'center', flexShrink: 0 },
  measure: { position: 'absolute', left: 0, top: 0, width: 1024, opacity: 0 },
  search: { width: 48, height: 48, borderRadius: core.radius.utility },
  searchActive: { backgroundColor: bemem.border },
  create: { minHeight: 48, paddingHorizontal: 15, paddingVertical: 8, borderRadius: core.radius.utility },
  createText: { fontSize: 14, lineHeight: 20, fontWeight: '700', fontFamily: lagoonFonts.latin, color: lagoon.text.primary, textAlign: 'center', flexShrink: 0 },
  pressed: { opacity: 0.75 }, disabled: { opacity: 0.45 },
});
