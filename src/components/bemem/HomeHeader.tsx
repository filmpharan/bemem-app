import { Pressable, StyleSheet, Text, View } from 'react-native';
import { bemem } from '../../constants/bemem-theme';
import { BememIcon } from './BememIcon';

type Props = { editing: boolean; searchOpen: boolean; disabled: boolean; onBack: () => void; onSearch: () => void; onCreate: () => void; onLogo: () => void };
export function HomeHeader({ editing, searchOpen, disabled, onBack, onSearch, onCreate, onLogo }: Props) {
  return <View style={styles.header}>
    <Pressable accessibilityRole="button" accessibilityLabel="bemem. กลับ Home" onPress={onLogo} disabled={disabled} style={styles.logoButton}>
      <Text maxFontSizeMultiplier={1.25} style={styles.logo}>bemem<Text style={styles.dot}>.</Text></Text>
    </Pressable>
    <View style={styles.actions}>
      <Pressable accessibilityRole="button" accessibilityLabel={editing ? 'กลับ Home' : searchOpen ? 'ปิดการค้นหา' : 'ค้นหาบัตร'}
        accessibilityState={editing ? { disabled } : { expanded: searchOpen, disabled }} onPress={editing ? onBack : onSearch} disabled={disabled}
        style={({ pressed }) => [styles.search, searchOpen && styles.searchActive, pressed && styles.pressed]}>
        <BememIcon name={editing ? 'chevron-left' : searchOpen ? 'close' : 'search'} />
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={editing ? 'Create PRO' : 'Create'} disabled={disabled} onPress={onCreate}
        style={({ pressed }) => [styles.create, disabled && styles.disabled, pressed && styles.pressed]}>
        <Text maxFontSizeMultiplier={1.25} style={styles.createText}>{editing ? 'Create PRO' : 'Create'}</Text>
      </Pressable>
    </View>
  </View>;
}
const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingTop: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  logoButton: { minHeight: 44, justifyContent: 'center', flexShrink: 1 },
  logo: { fontSize: 30, lineHeight: 38, fontWeight: '800', letterSpacing: -1.2, color: bemem.foreground },
  dot: { color: bemem.muted },
  actions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  search: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  searchActive: { backgroundColor: bemem.border },
  create: { minHeight: 36, paddingHorizontal: 24, paddingVertical: 8, borderRadius: 99, backgroundColor: bemem.primary },
  createText: { fontSize: 14, lineHeight: 20, fontWeight: '500', color: '#f8fafc' },
  pressed: { opacity: 0.75 }, disabled: { opacity: 0.45 },
});
