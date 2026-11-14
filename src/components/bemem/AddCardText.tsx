import { useState } from 'react';
import { useFonts } from 'expo-font';
import { StyleSheet, Text, View, useWindowDimensions, type StyleProp, type TextStyle, type TextProps } from 'react-native';
import manrope from '../../../assets/fonts/lagoon/manrope.ttf';
import notoThai from '../../../assets/fonts/lagoon/noto-sans-thai.ttf';
import { fontForUiText } from '../../constants/ci-theme';

/** Scoped glyph measurement: preserves font size, wraps within available space,
 * and reserves two units each side for Android glyph bearings/rounding. */
export function AddCardText({ children, style, maxWidth, accessibilityRole }: {
  children: string; style: StyleProp<TextStyle>; maxWidth: number; accessibilityRole?: TextProps['accessibilityRole'];
}) {
  const [fontReady] = useFonts({ BememManrope: manrope,BememThai:notoThai });
  const { fontScale } = useWindowDimensions();
  const [measured, setMeasured] = useState<{ epoch: string; width: number } | null>(null);
  const flat = StyleSheet.flatten(style);
  const epoch = `${fontReady}-${fontScale}-${children}-${flat?.fontSize}-${flat?.fontWeight}`;
  const textWidth = measured?.epoch === epoch ? measured.width : children.length * Number(flat?.fontSize ?? 14) * fontScale;
  const width = Math.max(1, Math.min(Math.ceil(textWidth) + 4, maxWidth));
  const font = { fontFamily: fontReady ? fontForUiText(children) : undefined };
  return <View style={{ width, flexShrink: 0 }}>
    <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.probe}>
      <Text key={epoch} allowFontScaling style={[style, font, styles.measureText]} onTextLayout={event => {
        const next = Math.ceil(Math.max(0, ...event.nativeEvent.lines.map(line => line.width)));
        if (next > 0) setMeasured(previous => previous?.epoch === epoch && previous.width === next ? previous : { epoch, width: next });
      }}>{children}</Text>
    </View>
    <Text key={epoch} accessibilityRole={accessibilityRole} allowFontScaling adjustsFontSizeToFit={false} style={[style, font, styles.visible, { width }]}>{children}</Text>
  </View>;
}
const styles = StyleSheet.create({
  probe: { position: 'absolute', left: 0, top: 0, width: 4096, opacity: 0 },
  measureText: { width: 4096, maxWidth: 4096, paddingHorizontal: 0, marginTop: 0, flexShrink: 0, includeFontPadding: true },
  visible: { paddingHorizontal: 2, includeFontPadding: true, flexShrink: 0 },
});
