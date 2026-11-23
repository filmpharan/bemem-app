import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { alpha, lagoon, lagoonFonts } from '../../constants/lagoon-theme';
import { CARD_CORNER_RADIUS } from '../../constants/card-appearance';
import { CARD_COLORS, type CardFormValues } from '../../lib/card-form';
import { WEB_BRANDS, type CardPresentationDraft } from '../../lib/card-presentation';
import { cardSizePreset } from '../../lib/card-size-presets';
import type { MembershipCard } from '../../types/membership-card';
import { CardArtworkImage } from './CardArtworkImage';
import { cardPaintSize } from '../../lib/card-geometry';
import { defaultBackTextColor } from '../../lib/default-card-artwork';

export function CardAppearancePreview({ values, presentation, width, height, appearance, showText = true, onArtworkReady, onArtworkFailure,artworkSources,renderScale,renderArtwork=true,displayPreview=false }: {
  values: CardFormValues; presentation?: CardPresentationDraft; width?: number; height?: number; appearance?: MembershipCard['appearance'];
  showText?: boolean; onArtworkReady?: () => void; onArtworkFailure?: () => void;
  artworkSources?:Readonly<Record<string,string>>;
  /** Share composition only; default app card rendering is unchanged. */
  renderScale?:number;
  /** Offscreen carousel cells keep their geometry without mounting native images. */
  renderArtwork?:boolean;
  displayPreview?:boolean;
}) {
  const color = appearance ? { background: appearance.backgroundColor, text: appearance.textColor }
    : CARD_COLORS.find(c => c.id === values.colorId) ?? CARD_COLORS[0];
  const [availableWidth, setAvailableWidth] = useState(200);
  const artWidth = width ?? availableWidth;
  const gradientId = appearance ? appearance.gradientPresetId : presentation?.gradientPresetId !== undefined ? presentation.gradientPresetId : presentation?.brandId;
  const gradient = WEB_BRANDS.find(b => b.id === gradientId)?.gradient;
  const back = presentation?.side === 'back';
  const image = (appearance?.artwork ?? presentation?.artwork)?.[back ? 'back' : 'front'];
  const sourceUri=image?artworkSources?.[image.assetId]:undefined;
  const preset = cardSizePreset(presentation?.sizePresetId ?? (values.orientation === 'portrait' ? 'card-portrait' : 'card-landscape'));
  // Text is an overlay: it must never change the image's crop boundary.
  const paint = cardPaintSize(preset.ratioWidth,preset.ratioHeight);
  const minHeight = artWidth * paint.height / paint.width;
  const shareRadius=renderScale===undefined?undefined:{borderRadius:CARD_CORNER_RADIUS*renderScale};
  return <View style={[styles.stage, width !== undefined && { width }, height !== undefined && { height }]} onLayout={event => setAvailableWidth(event.nativeEvent.layout.width)}>
    <View style={[styles.card, { minHeight, backgroundColor: color.background },shareRadius,renderScale!==undefined&&{boxShadow:'none'},height !== undefined && { height, minHeight: 0, overflow: 'hidden' }]}>
      <View pointerEvents="none" accessible={false} style={[styles.artwork, shareRadius, gradient && {
        backgroundImage: `linear-gradient(135deg, ${gradient.map((stop, index) => gradientId === 'seven' && index === 1 ? stop + ' 60%' : stop).join(', ')})`,
      }]} />
      <View pointerEvents="none" accessible={false} style={[styles.shade,shareRadius]} />
      {image && renderArtwork && <CardArtworkImage key={sourceUri?image.assetId+sourceUri:image.assetId} image={image} cornerRadius={shareRadius?.borderRadius} thumbnail={renderScale!==undefined} displayPreview={displayPreview?'editor':undefined} sourceUri={sourceUri} onReady={onArtworkReady} onFailure={onArtworkFailure} />}
      {showText && <Text numberOfLines={3}
        style={[back ? styles.number : styles.name, { color: defaultBackTextColor(image?.assetId)??(gradient ? lagoon.text.onAction : color.text) }]}>
        {back ? values.memberNumber || 'Membership number' : values.name || 'Card name'}
      </Text>}
    </View>
  </View>;
}
const styles = StyleSheet.create({
  stage: { width: '100%', flexShrink: 0 },
  card: { width: '100%', borderRadius: CARD_CORNER_RADIUS, justifyContent: 'space-between',overflow:'hidden',
    boxShadow: `0 8px 20px -10px ${alpha(lagoon.shadow.tint, 0.35)}` },
  artwork: { ...StyleSheet.absoluteFill, borderRadius: CARD_CORNER_RADIUS },
  shade: { ...StyleSheet.absoluteFill, borderRadius: CARD_CORNER_RADIUS,
    backgroundImage: `linear-gradient(180deg, ${alpha(lagoon.action.deep, 0.4)}, transparent 50%, ${alpha(lagoon.action.deep, 0.5)})` },
  name: { fontSize: 14, lineHeight: 20, fontWeight: '800', fontFamily: lagoonFonts.latin, margin: 8, flexShrink: 0 },
  number: { fontSize: 12, lineHeight: 16, fontFamily: 'monospace', marginHorizontal: 12, marginBottom: 12, marginTop: 'auto', flexShrink: 0 },
});
