import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { bemem } from '../../constants/bemem-theme';
import { core, lagoon, lagoonFonts } from '../../constants/lagoon-theme';
import { BememIcon } from './BememIcon';

export function SearchField({ value, onChange }: { value: string; onChange: (text: string) => void }) {
  return <View style={styles.container}>
    <BememIcon name="search" />
    <TextInput autoFocus accessibilityLabel="ค้นหาบัตร" placeholder="Search cards & folders"
      placeholderTextColor={bemem.muted} value={value} onChangeText={onChange}
      autoCorrect={false} returnKeyType="search" style={styles.input} />
    {!!value && <Pressable onPress={() => onChange('')} accessibilityRole="button" accessibilityLabel="ล้างคำค้นหา" style={styles.clear}>
      <BememIcon name="close" />
    </Pressable>}
  </View>;
}
const styles = StyleSheet.create({
  container: { marginTop: 16, marginHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: lagoon.surface.base, borderRadius: core.radius.utility, paddingLeft: 12, paddingRight: 4, minHeight: 48,
    boxShadow: '0 4px 12px -8px rgba(15,23,42,0.25)' },
  input: { flex: 1, paddingVertical: 10, fontSize: 14, color: bemem.foreground, fontFamily: lagoonFonts.latin },
  clear: { width: 40, height: 44, justifyContent: 'center', alignItems: 'center' },
});
