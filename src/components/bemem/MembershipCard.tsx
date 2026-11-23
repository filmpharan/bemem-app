import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { lagoonFonts } from '../../constants/lagoon-theme';
import { CARD_CORNER_RADIUS } from '../../constants/card-appearance';
import type { PreviewCard } from '../../types/wallet-ui';
import { CardArtworkImage } from './CardArtworkImage';
import { WEB_BRANDS } from '../../lib/card-presentation';
import { GroupFolderCard } from './GroupFolderCard';

// Fixed DEMO artwork only: never derived from the app's chosen color palette.
const demoArt: Record<string, { fill: string; light: string; ink: string; mark: string }> = {
  'demo-coffee': { fill: '#186b64', light: '#45958a', ink: '#f7fffb', mark: 'C' },
  'demo-everyday': { fill: '#b5d88c', light: '#d7eea4', ink: '#143f3c', mark: 'e' },
  'demo-travel': { fill: '#8bbccf', light: '#c7e5ea', ink: '#143f3c', mark: 't' },
  'demo-weekend': { fill: '#d69d83', light: '#f6c8ab', ink: '#143f3c', mark: 'w' },
};

export const MembershipCard = memo(function MembershipCard({ card }: { card: PreviewCard }) {
  if(card.kind==='folder')return <GroupFolderCard card={card}/>;
  const art = demoArt[card.id];
  const image = card.appearance?.artwork?.front;
  const gradient = WEB_BRANDS.find(brand => brand.id === card.appearance?.gradientPresetId)?.gradient;
  return <View style={[styles.card, { backgroundColor: art?.fill ?? card.colors[0],
    backgroundImage: art ? undefined : `linear-gradient(135deg, ${(gradient ?? card.colors).join(', ')})` }, image && styles.imageCard]}>
    {image && <CardArtworkImage key={image.assetId} image={image} displayPreview="canvas" />}
    {art && <>
      <View pointerEvents="none" style={[styles.orb, card.orientation === 'portrait' && styles.portraitOrb, {
        backgroundColor: art.light,
        backgroundImage: `linear-gradient(135deg, ${art.light}, ${art.fill})`,
      }]} />
      <Text accessible={false} style={[styles.mark, { color: art.ink }]}>{art.mark}</Text>
    </>}
    {!image && <View pointerEvents="none" style={styles.rim} />}
    <Text numberOfLines={3} style={[styles.name, { color: art?.ink ?? card.appearance?.textColor ?? '#ffffff' }]}>{card.name}</Text>
  </View>;
});

const styles = StyleSheet.create({
  card: { flex: 1, overflow: 'hidden', borderRadius: CARD_CORNER_RADIUS, padding: 10, justifyContent: 'space-between',
    borderWidth: 1, borderColor: '#ffffff5e', boxShadow: '0 10px 16px -9px #1a6c635c' },
  imageCard: { borderWidth: 0, backgroundColor: 'transparent', backgroundImage: 'none', boxShadow: '0 10px 16px -9px #2639432b' },
  orb: { position: 'absolute', width: 100, height: 86, right: -34, top: -18, borderRadius: 50, boxShadow: 'inset 5px 7px 12px #ffffff35' },
  portraitOrb: { width: 110, height: 125, right: -38, top: 30, transform: [{ rotate: '30deg' }] },
  rim: { ...StyleSheet.absoluteFill, borderRadius: CARD_CORNER_RADIUS, backgroundImage: 'linear-gradient(135deg, #ffffff22, transparent 38%, transparent 70%, #ffffff12)' },
  mark: { fontSize: 30, lineHeight: 36, fontWeight: '700', fontFamily: lagoonFonts.latin },
  name: { fontSize: 13, lineHeight: 18, fontWeight: '700', fontFamily: lagoonFonts.latin, marginTop: 'auto' },
});
