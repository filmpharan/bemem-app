import { useMemo, useState } from 'react';
import { PixelRatio, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import type { DisplayFormat, MembershipCard } from '../../types/membership-card';
import { encodeCardCode, cardCodeDataUri, cardCodeFrame } from '../../lib/card-code';
import { code128DisplaySvg } from '../../lib/code128-display';
import { lagoonFonts } from '../../constants/lagoon-theme';

/** Solid white SVG only; no tint, blur, gradients, overlay, network or disk cache. */
export function CardCodeView({ card, format, maxHeight = Infinity }: { maxHeight?: number; card: Readonly<MembershipCard>; format: DisplayFormat }) {
  const [width, setWidth] = useState(0);
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const density = PixelRatio.get();
  const { kind, memberNumber } = card;
  const code = useMemo(() => encodeCardCode({ kind, memberNumber }, format), [kind, memberNumber, format]);
  const frame = useMemo(() => code.ok ? cardCodeFrame(code, width, density, maxHeight) : null, [code, width, density, maxHeight]);
  const uri = useMemo(() => {
    if (!code.ok || !frame || !width || frame.scroll) return null;
    try {
      // QR's square viewport is unchanged. Barcode needs a matching pixel viewBox:
      // Android's SVG decoder otherwise preserves the encoder's narrow intrinsic ratio.
      const svg = format === 'code128' ? code128DisplaySvg(code, frame, density)
        : code.svg.replace(`width="${code.width}" height="${code.height}"`,
          `width="${Math.round(frame.width * density)}" height="${Math.round(frame.height * density)}"`);
      return cardCodeDataUri(svg);
    } catch { return null; }
  }, [code, density, format, frame, width]);
  const error = !code.ok ? code.message : width > 0 && frame?.scroll
    ? 'This code is too wide for this screen. Rotate your phone or choose QR Code. No partial code is shown.'
    : code.ok && width > 0 && frame && !frame.scroll && !uri ? 'Unable to prepare this code for display. The stored value is unchanged.'
    : uri && failedUri === uri ? 'Unable to display this code. Close and reopen the card to try again.' : '';
  return <View style={styles.area} onLayout={event => setWidth(event.nativeEvent.layout.width)}>
    {error ? <Text accessibilityRole="alert" style={[styles.message, format === 'qr' && { maxWidth: 176 }]}>{error}</Text> : uri && frame
      ? <Image source={{ uri, width: Math.round(frame.width * density), height: Math.round(frame.height * density) }}
        accessibilityLabel={format === 'qr' ? 'Membership QR Code' : 'Membership Code 128 barcode'}
        cachePolicy="none" contentFit="contain" transition={0} onError={() => setFailedUri(uri)}
        style={{ width: frame.width, height: frame.height, backgroundColor: '#ffffff' }} />
      : <Text style={[styles.message, format === 'qr' && { maxWidth: 176 }]}>Preparing code...</Text>}
  </View>;
}
const styles = StyleSheet.create({
  area: { width: '100%', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff' },
  message: { color: '#000000', fontFamily: lagoonFonts.latin, fontSize: 12, lineHeight: 18, textAlign: 'center' },
});
