import { Pressable, StyleSheet, Text, View } from 'react-native';
import { bemem } from '../../constants/bemem-theme';
import { BememIcon } from './BememIcon';

export function CanvasActions({ editing, empty, dirty, disabled, saving, onAdd, onSave }: {
  editing: boolean; empty: boolean; dirty: boolean; disabled: boolean; saving: boolean; onAdd: () => void; onSave: () => void;
}) {
  return <View pointerEvents="box-none" style={styles.actions}>
    {(editing || empty) && <Pressable accessibilityRole="button" accessibilityLabel="Add Card (ยังไม่เปิดใช้งานใน Phase 1)"
      disabled={disabled} onPress={onAdd}
      style={({ pressed }) => [styles.fab, editing ? styles.left : styles.right, pressed && styles.pressed, disabled && styles.disabled]}>
      <BememIcon name="plus" color={bemem.white} />
    </Pressable>}
    {editing && dirty && <Pressable accessibilityRole="button" disabled={disabled} onPress={onSave}
      style={({ pressed }) => [styles.save, pressed && styles.pressed, disabled && styles.disabled]}>
      <Text style={styles.saveText}>{saving ? 'Saving…' : 'Save'}</Text>
    </Pressable>}
  </View>;
}
const styles = StyleSheet.create({
  actions: { position: 'absolute', left: 16, right: 16, bottom: 24, height: 56 },
  fab: { position: 'absolute', width: 56, height: 56, borderRadius: 28, backgroundColor: bemem.primary,
    alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(15,23,42,0.2)' },
  left: { left: 0 }, right: { right: 0 },
  save: { position: 'absolute', left: 72, right: 0, minHeight: 56, borderRadius: 16, backgroundColor: '#525252',
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, boxShadow: '0 4px 12px rgba(15,23,42,0.15)' },
  saveText: { color: bemem.white, fontSize: 14, fontWeight: '600' }, pressed: { opacity: 0.75 }, disabled: { opacity: 0.45 },
});
