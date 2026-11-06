import { StyleSheet, Text, View } from 'react-native';
import { bemem } from '../../constants/bemem-theme';

export function WalletEmptyState({ emptyWallet }: { emptyWallet: boolean }) {
  return <View style={styles.container}>
    <Text style={styles.text}>{emptyWallet ? 'ยังไม่มีบัตรในกระเป๋า' : 'No cards found'}</Text>
    {emptyWallet && <Text style={styles.hint}>Phase 1 ใช้ข้อมูลสมมติเท่านั้น ระบบเพิ่มบัตรจะมาในระยะถัดไป</Text>}
  </View>;
}
const styles = StyleSheet.create({
  container: { paddingTop: 64, paddingHorizontal: 24, alignItems: 'center' },
  text: { color: bemem.muted, fontSize: 14, textAlign: 'center' },
  hint: { marginTop: 8, color: bemem.muted, fontSize: 12, lineHeight: 19, textAlign: 'center' },
});
