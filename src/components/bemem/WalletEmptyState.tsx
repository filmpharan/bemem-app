import { ciColors,ciTypography } from '../../constants/ci-theme';
import { StyleSheet, Text, View } from 'react-native';

export function WalletEmptyState({ emptyWallet }: { emptyWallet: boolean }) {
  return <View style={styles.container}>
    <Text style={styles.text}>{emptyWallet ? 'No cards in your wallet yet' : 'No cards found'}</Text>
    {emptyWallet && <Text style={styles.hint}>Phase 1 uses demo cards only. Adding real cards is coming in a future phase.</Text>}
  </View>;
}
const styles = StyleSheet.create({
  container: { paddingTop: 64, paddingHorizontal: 24, alignItems: 'center' },
  text: { fontFamily:ciTypography.body.fontFamily, color:ciColors.text.secondary, fontSize:14, textAlign: 'center' },
  hint: { ...ciTypography.supporting, fontWeight:'400', marginTop:8, color:ciColors.text.supporting, lineHeight:19, textAlign: 'center' },
});
