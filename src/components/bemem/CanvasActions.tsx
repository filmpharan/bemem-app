import { StyleSheet, Text, View } from 'react-native';
import { core, lagoon, lagoonFonts } from '../../constants/lagoon-theme';
import { GlassButton } from './GlassButton';
import { BememIcon } from './BememIcon';

export function CanvasActions({ editing, empty, dirty, disabled, saving, onAdd, onSave }: {
  editing: boolean; empty: boolean; dirty: boolean; disabled: boolean; saving: boolean; onAdd: () => void; onSave: () => void;
}) {
  return <View pointerEvents="box-none" style={styles.actions}>
    {(editing || empty) && <GlassButton kind="gel" accessibilityLabel="Add Card (ยังไม่เปิดใช้งานใน Phase 1)"
      disabled={disabled} onPress={onAdd}
      style={[styles.fab, editing ? styles.left : styles.right]}>
      <BememIcon name="plus" color={lagoon.text.primary} />
    </GlassButton>}
    {editing && dirty && <GlassButton kind="action" disabled={disabled} busy={saving} onPress={onSave}
      style={styles.save}>
      <Text style={styles.saveText}>{saving ? 'Saving…' : 'Save'}</Text>
    </GlassButton>}
  </View>;
}
const styles = StyleSheet.create({
  actions: { position: 'absolute', left: core.geometry.actionRail.horizontalInset, right: core.geometry.actionRail.horizontalInset, bottom: 24, height: 56 },
  fab: { position: 'absolute', ...core.geometry.fab },
  left: { left: 0 }, right: { right: 0 },
  save: { position: 'absolute', right: 0, bottom: 0, ...core.geometry.save, paddingVertical: 12 },
  saveText: { color: lagoon.text.onAction, fontSize: 14, fontWeight: '700', fontFamily: lagoonFonts.latin },
});
