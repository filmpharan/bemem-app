import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { core, lagoonFonts } from '../../constants/lagoon-theme';
import type { PreviewCard } from '../../types/wallet-ui';

// Fixed DEMO artwork only: never derived from the app's chosen color palette.
const demoArt: Record<string, { fill: string; light: string; ink: string; mark: string }> = {
  'demo-coffee': { fill: '#186b64', light: '#45958a', ink: '#f7fffb', mark: 'C' },
  'demo-everyday': { fill: '#b5d88c', light: '#d7eea4', ink: '#143f3c', mark: 'e' },
  'demo-travel': { fill: '#8bbccf', light: '#c7e5ea', ink: '#143f3c', mark: 't' },
  'demo-weekend': { fill: '#d69d83', light: '#f6c8ab', ink: '#143f3c', mark: 'w' },
};

export const MembershipCard = memo(function MembershipCard({ card }: { card: PreviewCard }) {
  const art = demoArt[card.id];
  return <View style={[styles.card, { backgroundColor: art?.fill ?? card.colors[0],
    backgroundImage: art ? undefined : `linear-gradient(135deg, ${card.colors[0]}, ${card.colors[1]})` }]}>
    {art && <>
      <View pointerEvents="none" style={[styles.orb, card.orientation === 'portrait' && styles.portraitOrb, {
        backgroundColor: art.light,
        backgroundImage: `linear-gradient(135deg, ${art.light}, ${art.fill})`,
      }]} />
      <Text accessible={false} style={[styles.mark, { color: art.ink }]}>{art.mark}</Text>
    </>}
    <View pointerEvents="none" style={styles.rim} />
    <Text numberOfLines={3} style={[styles.name, { color: art?.ink ?? '#ffffff' }]}>{card.name}</Text>
  </View>;
});

const styles = StyleSheet.create({
  card: { flex: 1, overflow: 'hidden', borderRadius: core.radius.card, padding: 10, justifyContent: 'space-between',
    borderWidth: 1, borderColor: '#ffffff5e', boxShadow: '0 10px 16px -9px #1a6c635c' },
  orb: { position: 'absolute', width: 100, height: 86, right: -34, top: -18, borderRadius: 50, boxShadow: 'inset 5px 7px 12px #ffffff35' },
  portraitOrb: { width: 110, height: 125, right: -38, top: 30, transform: [{ rotate: '30deg' }] },
  rim: { ...StyleSheet.absoluteFill, borderRadius: core.radius.card, backgroundImage: 'linear-gradient(135deg, #ffffff22, transparent 38%, transparent 70%, #ffffff12)' },
  mark: { fontSize: 30, lineHeight: 36, fontWeight: '700', fontFamily: lagoonFonts.latin },
  name: { fontSize: 13, lineHeight: 18, fontWeight: '700', fontFamily: lagoonFonts.latin, marginTop: 'auto' },
});
