import { useEffect, useRef, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@expo/ui/community/datetime-picker';
import { GlassButton } from './GlassButton';
import { ciColors, ciTypography } from '../../constants/ci-theme';
import { sheetVisual } from '../../constants/sheet-visual';

/** Native inline control inside one RN window; selection stays provisional until Confirm. */
export function ReminderTimePicker({ value, onCancel, onConfirm }: {
  value: string; onCancel: () => void; onConfirm: (value: string) => void;
}) {
  const [initial] = useState(() => {
    const date = new Date();
    if (/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) {
      const [hours, minutes] = value.split(':').map(Number);
      date.setHours(hours, minutes, 0, 0);
    }
    return date;
  });
  const selected = useRef(initial), finished = useRef(false), alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  function cancel() {
    if (!alive.current || finished.current) return;
    finished.current = true; onCancel();
  }
  function confirm() {
    if (!alive.current || finished.current) return;
    finished.current = true;
    const date = selected.current;
    onConfirm(`${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`);
  }
  return <Modal visible transparent animationType="none" statusBarTranslucent navigationBarTranslucent onRequestClose={cancel}>
    <SafeAreaView style={styles.overlay}>
      <Pressable accessibilityRole="button" accessibilityLabel="Cancel reminder time selection" onPress={cancel} style={StyleSheet.absoluteFill} />
      <View accessibilityViewIsModal style={styles.sheet}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text accessibilityRole="header" style={styles.title}>Reminder time</Text>
          <DateTimePicker value={initial} mode="time" is24Hour locale="en-GB" presentation="inline"
            display={Platform.OS === 'android' ? 'default' : 'spinner'} themeVariant="light" style={styles.picker}
            onChange={(event, date) => {
              if (alive.current && !finished.current && event.type === 'set' && date && Number.isFinite(date.getTime())) selected.current = date;
            }} />
          <View style={styles.actions}>
            <GlassButton accessibilityLabel="Cancel reminder time" onPress={cancel} style={styles.action}><Text style={styles.text}>Cancel</Text></GlassButton>
            <GlassButton accessibilityLabel="Confirm reminder time" kind="action" onPress={confirm} style={styles.action}><Text style={[styles.text, styles.onAction]}>Confirm</Text></GlassButton>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  </Modal>;
}
const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: sheetVisual.scrim },
  sheet: { width: '100%', maxWidth: 600, maxHeight: '96%', alignSelf: 'center', backgroundColor: sheetVisual.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },
  content: { padding: 16, gap: 12 }, title: { ...ciTypography.title, color: ciColors.text.primary },
  picker: { width: '100%' }, actions: { flexDirection: 'row', gap: 8 },
  action: { flex: 1, minWidth: 0, minHeight: 48, padding: 12 },
  text: { ...ciTypography.button, color: ciColors.text.primary, textAlign: 'center', flexShrink: 1 },
  onAction: { color: ciColors.text.onAction },
});
