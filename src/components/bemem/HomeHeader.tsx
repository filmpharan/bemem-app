import { Pressable, StyleSheet, Text, View } from 'react-native';
import { bemem } from '../../constants/bemem-theme';
import { core, lagoon, lagoonFonts } from '../../constants/lagoon-theme';
import { GlassButton } from './GlassButton';
import { BememIcon } from './BememIcon';

type Props = { editing: boolean; searchOpen: boolean; disabled: boolean; onBack: () => void; onSearch: () => void; onCreate: () => void; onLogo: () => void };
export function HomeHeader({ editing, searchOpen, disabled, onBack, onSearch, onCreate, onLogo }: Props) {
  return <View style={styles.header}>
    <Pressable accessibilityRole="button" accessibilityLabel="bemem. กลับ Home" onPress={onLogo} disabled={disabled} style={styles.logoButton}>
      <Text maxFontSizeMultiplier={1.25} style={styles.logo}>bemem<Text style={styles.dot}>.</Text></Text>
    </Pressable>
    <View style={styles.actions}>
      <GlassButton accessibilityLabel={editing ? 'กลับ Home' : searchOpen ? 'ปิดการค้นหา' : 'ค้นหาบัตร'}
        accessibilityState={editing ? { disabled } : { expanded: searchOpen, disabled }} onPress={editing ? onBack : onSearch} disabled={disabled}
        selected={!editing && searchOpen} style={styles.search}>
        <BememIcon name={editing ? 'chevron-left' : searchOpen ? 'close' : 'search'} color={lagoon.text.primary} />
      </GlassButton>
      <GlassButton accessibilityLabel={editing ? 'Create PRO' : 'Create'} disabled={disabled} onPress={onCreate}
        kind={editing ? 'action' : 'utility'} style={styles.create}>
        <Text maxFontSizeMultiplier={1.25} style={[styles.createText, { color: editing ? lagoon.text.onAction : lagoon.text.primary }]}>{editing ? 'Create PRO' : 'Create'}</Text>
      </GlassButton>
    </View>
  </View>;
}
const styles = StyleSheet.create({
  header: { paddingHorizontal: core.geometry.header.paddingHorizontal, paddingTop: 14, paddingBottom: 8, minHeight: 70, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  logoButton: { minHeight: 44, justifyContent: 'center', flexShrink: 1 },
  logo: { fontSize: 30, lineHeight: 38, fontWeight: '800', letterSpacing: -1.2, fontFamily: lagoonFonts.latin, color: bemem.foreground },
  dot: { color: lagoon.action.primary },
  actions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  search: { width: 48, height: 48, borderRadius: core.radius.utility },
  searchActive: { backgroundColor: bemem.border },
  create: { minHeight: 48, paddingHorizontal: 15, paddingVertical: 8, borderRadius: core.radius.utility },
  createText: { fontSize: 14, lineHeight: 20, fontWeight: '700', fontFamily: lagoonFonts.latin, color: lagoon.text.primary },
  pressed: { opacity: 0.75 }, disabled: { opacity: 0.45 },
});
