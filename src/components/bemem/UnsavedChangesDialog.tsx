import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { bemem } from '../../constants/bemem-theme';

export function UnsavedChangesDialog({ visible, saving, onSave, onDiscard, onCancel }: {
  visible: boolean; saving: boolean; onSave: () => void; onDiscard: () => void; onCancel: () => void;
}) {
  return <Modal transparent animationType="fade" visible={visible} onRequestClose={onCancel}>
    <View style={styles.backdrop}><View accessibilityViewIsModal style={styles.dialog}>
      <Text accessibilityRole="header" style={styles.title}>Save your layout?</Text>
      <Text style={styles.body}>You have unsaved changes. Choose Save to keep this layout, or Discard to restore the last saved layout.</Text>
      <Pressable accessibilityRole="button" disabled={saving} onPress={onSave} style={styles.primary}>
        <Text style={styles.primaryText}>{saving ? 'Saving…' : 'Save'}</Text>
      </Pressable>
      <Pressable accessibilityRole="button" disabled={saving} onPress={onDiscard} style={styles.button}><Text style={styles.discard}>Discard</Text></Pressable>
      <Pressable accessibilityRole="button" disabled={saving} onPress={onCancel} style={styles.button}><Text style={styles.cancel}>Cancel</Text></Pressable>
    </View></View>
  </Modal>;
}
const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  dialog: { backgroundColor: bemem.background, borderRadius: 20, padding: 20, width: '100%', maxWidth: 400 },
  title: { color: bemem.foreground, fontSize: 20, fontWeight: '800' },
  body: { color: bemem.muted, fontSize: 14, lineHeight: 22, marginTop: 12, marginBottom: 20 },
  primary: { minHeight: 48, borderRadius: 12, backgroundColor: bemem.primary, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: bemem.white, fontSize: 14, fontWeight: '600' },
  button: { minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  discard: { color: bemem.error, fontSize: 14, fontWeight: '600' }, cancel: { color: bemem.foreground, fontSize: 14, fontWeight: '600' },
});
