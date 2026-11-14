import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { PixelRatio, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import type { CardSharePlan } from '../../lib/card-share-plan';
import { emptyCardForm } from '../../lib/card-form';
import { emptyCardPresentation } from '../../lib/card-presentation';
import { lagoonFonts } from '../../constants/lagoon-theme';
import { CardAppearancePreview } from './CardAppearancePreview';

/** Only this native View is captured. No status bar, sheet controls, card IDs or metadata. */
export function CardShareSurface({ plan, onReady, onFailure }: {
  plan: CardSharePlan; onReady: (view: ComponentRef<typeof View>) => void; onFailure: () => void;
}) {
  const density = PixelRatio.get(), root = useRef<ComponentRef<typeof View>>(null);
  const image = plan.appearance.artwork?.[plan.side];
  const [laidOut, setLaidOut] = useState(false), [artReady, setArtReady] = useState(!image), [codeReady, setCodeReady] = useState(!plan.code);
  const sent = useRef(false);
  useEffect(() => {
    const timer = setTimeout(() => { if (!sent.current) onFailure(); }, 15000);
    return () => clearTimeout(timer);
  }, [onFailure]);
  useEffect(() => {
    if (!laidOut || !artReady || !codeReady || sent.current) return;
    let second = 0;
    const first = requestAnimationFrame(() => { second = requestAnimationFrame(() => {
      if (root.current && !sent.current) { sent.current = true; onReady(root.current); }
    }); });
    return () => { cancelAnimationFrame(first); cancelAnimationFrame(second); };
  }, [laidOut, artReady, codeReady, onReady]);
  const values = { ...emptyCardForm(), name: plan.name, memberNumber: '', orientation: plan.orientation };
  const presentation = { ...emptyCardPresentation(), side: plan.side,
    sizePresetId: plan.sizePresetId ?? (plan.orientation === 'portrait' ? 'card-portrait' as const : 'card-landscape' as const) };
  const margin = plan.mode === 'scan' ? 32 / density : 0;
  return <View ref={root} collapsable={false} pointerEvents="none" accessible={false} style={[styles.surface, { width: plan.width / density, padding: margin, gap: 24 / density }]}
    onLayout={event => {
      const { width, height } = event.nativeEvent.layout;
      if (width * height * density * density > 8_000_000 || height * density > 4096) { onFailure(); return; }
      if (width > 0 && height > 0) setLaidOut(true);
    }}>
    {plan.mode === 'scan' && <Text allowFontScaling={false} style={[styles.text, { fontSize: 32 / density, lineHeight: 44 / density, fontWeight: '700' }]}>{plan.name}</Text>}
    <CardAppearancePreview values={values} presentation={presentation} appearance={plan.appearance}
      width={plan.cardWidth / density} height={plan.cardHeight / density} showText={!image && plan.mode === 'image' && plan.side === 'front'}
      onArtworkReady={() => setArtReady(true)} onArtworkFailure={onFailure} />
    {plan.code && <View style={{ alignItems: 'center', backgroundColor: '#ffffff', paddingVertical: 16 / density, gap: 16 / density }}>
      <Image source={{ uri: plan.code.uri, width: plan.code.width, height: plan.code.height }} contentFit="contain" transition={0} cachePolicy="none"
        onDisplay={() => setCodeReady(true)} onError={onFailure} style={{ width: plan.code.width / density, height: plan.code.height / density, backgroundColor: '#ffffff' }} />
      {plan.memberNumber !== null && <Text allowFontScaling={false} style={[styles.text, { fontSize: 28 / density, lineHeight: 40 / density }]}>{plan.memberNumber}</Text>}
    </View>}
  </View>;
}
const styles = StyleSheet.create({
  surface: { alignItems: 'center', backgroundColor: '#ffffff' },
  text: { fontFamily: lagoonFonts.latin, color: '#000000', textAlign: 'center', alignSelf: 'stretch', includeFontPadding: false },
});
