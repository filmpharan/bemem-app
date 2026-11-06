import { StyleSheet, Text, View } from 'react-native';
import type { PreviewCard } from '../../types/wallet-ui';

export function MembershipCard({ card }: { card: PreviewCard }) {
  return <View style={[styles.card, { backgroundColor: card.colors[0],
    backgroundImage: `linear-gradient(135deg, ${card.colors[0]}, ${card.colors[1]})` }]}>
    <View style={styles.shade} />
    <Text numberOfLines={3} style={styles.name}>{card.name}</Text>
  </View>;
}
const styles = StyleSheet.create({
  card: { flex: 1, overflow: 'hidden', borderRadius: 12, padding: 8,
    boxShadow: '0 8px 20px -10px rgba(21,29,46,0.35)' },
  shade: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0,
    backgroundImage: 'linear-gradient(180deg, rgba(15,23,42,0.4), rgba(15,23,42,0) 50%, rgba(15,23,42,0.5))' },
  name: { fontSize: 14, fontWeight: '800', color: '#f8fafc', textShadowColor: 'rgba(0,0,0,0.25)', textShadowRadius: 2, textShadowOffset: { width: 0, height: 1 } },
});
