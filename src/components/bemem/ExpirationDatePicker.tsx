import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { lagoon, lagoonFonts } from '../../constants/lagoon-theme';
import { ciColors, ciTypography } from '../../constants/ci-theme';
import { sheetVisual } from '../../constants/sheet-visual';
import { clampCalendarDate, expirationYears, EXPIRATION_MONTHS, fullExpiration, initialExpiration, monthDays, parseExpiration } from '../../lib/expiration-date';
import { GlassButton } from './GlassButton';

/** Three real native scroll views; native snapping plus a JS idle fallback for slow Android drags. */
export function ExpirationWheel({ label, values, value, rowHeight, onChange, onBusy, appearance }: {
  label: string; values: { value: number; text: string }[]; value: number; rowHeight: number;
  onChange: (value: number) => void; onBusy: (busy: boolean) => void; appearance?: 'reminder';
}) {
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null), offset = useRef(0), dragging = useRef(false);
  const working = useRef(false), alive = useRef(true);
  const idle = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef({ values, rowHeight, onChange, onBusy }); latest.current = { values, rowHeight, onChange, onBusy };
  const index = Math.max(0, values.findIndex(v => v.value === value));
  function stopTimer() { if (idle.current) clearTimeout(idle.current); idle.current = null; }
  function reportBusy(active: boolean) {
    if (working.current !== active) { working.current = active; latest.current.onBusy(active); }
  }
  function settle() {
    if (!alive.current) return;
    stopTimer(); dragging.current = false;
    const current = latest.current, at = Math.max(0, Math.min(current.values.length - 1, Math.round(offset.current / current.rowHeight)));
    offset.current = at * current.rowHeight;
    scroll.current?.scrollTo({ y: offset.current, animated: false });
    current.onChange(current.values[at].value); reportBusy(false);
  }
  useEffect(() => {
    stopTimer(); offset.current = index * rowHeight;
    dragging.current = false; reportBusy(false);
    scroll.current?.scrollTo({ y: offset.current, animated: false });
  }, [index, rowHeight, values.length]);
  useEffect(() => { alive.current = true; return () => { alive.current = false; stopTimer(); }; }, []);
  function idleSettle() { stopTimer(); idle.current = setTimeout(settle, 180); }
  return <View style={styles.column}>
    {appearance !== 'reminder' && <Text style={styles.columnLabel}>{label}</Text>}
    <View style={{ height: rowHeight * 3 }}>
      <View pointerEvents="none" style={[styles.selection, { top: rowHeight, height: rowHeight }]} />
      <ScrollView ref={scroll} testID={`expiration-wheel-${label.toLowerCase()}`} nestedScrollEnabled
        showsVerticalScrollIndicator={false} bounces={false} overScrollMode="never"
        snapToInterval={rowHeight} decelerationRate="fast" scrollEventThrottle={16}
        contentOffset={{ x: 0, y: index * rowHeight }} contentContainerStyle={{ paddingVertical: rowHeight }}
        onLayout={() => scroll.current?.scrollTo({ y: index * rowHeight, animated: false })}
        onContentSizeChange={() => { if (!working.current) scroll.current?.scrollTo({ y: index * rowHeight, animated: false }); }}
        onScrollBeginDrag={() => { stopTimer(); dragging.current = true; reportBusy(true); }}
        onScroll={event => { offset.current = event.nativeEvent.contentOffset.y; if (!dragging.current) idleSettle(); }}
        onScrollEndDrag={event => { offset.current = event.nativeEvent.contentOffset.y; dragging.current = false; idleSettle(); }}
        onMomentumScrollBegin={() => { stopTimer(); reportBusy(true); }}
        onMomentumScrollEnd={event => { offset.current = event.nativeEvent.contentOffset.y; settle(); }}>
        {values.map((item, at) => <Pressable key={item.value} accessibilityRole="button"
          accessibilityLabel={`${label}: ${item.text}`} accessibilityState={{ selected: item.value === value }}
          onPress={() => { offset.current = at * rowHeight; settle(); }} style={[styles.wheelItem, { height: rowHeight }]}>
          <Text style={[styles.wheelText, appearance === 'reminder' && styles.reminderWheelText, label === 'Month' && styles.monthText, item.value === value ? styles.selectedText : styles.neighborText, appearance === 'reminder' && item.value === value && styles.reminderSelectedText]}>{item.text}</Text>
        </Pressable>)}
      </ScrollView>
    </View>
  </View>;
}

/** Only Confirm or Clear emit a value. Back, backdrop and Cancel never touch the form. */
export function ExpirationDatePicker({ value, onCancel, onConfirm, purpose = 'expiration' }: {
  value: string; onCancel: () => void; onConfirm: (value: string) => void; purpose?: 'expiration' | 'reminder';
}) {
  const [today] = useState(() => { const now = new Date(); return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() }; });
  const [years] = useState(() => expirationYears(today.year, initialExpiration(value, today).year));
  const [selected, setSelected] = useState(() => initialExpiration(value, today));
  const [busy, setBusy] = useState<string[]>([]), [outerEnabled, setOuterEnabled] = useState(true);
  const current = useRef(selected); current.current = selected;
  const moving = useRef(new Set<string>()), finished = useRef(false);
  const { fontScale } = useWindowDimensions();
  const rowHeight = Math.max(48, Math.ceil(40 * fontScale + 12));
  function wheelBusy(label: string, active: boolean) {
    if (active) moving.current.add(label); else moving.current.delete(label);
    setBusy([...moving.current]); setOuterEnabled(moving.current.size === 0);
  }
  function change(patch: Partial<typeof selected>) {
    if (finished.current) return;
    const next = clampCalendarDate({ ...current.current, ...patch }); current.current = next; setSelected(next);
  }
  function cancel() { if (finished.current) return; finished.current = true; onCancel(); }
  function confirm(clear = false) {
    if (finished.current || (!clear && moving.current.size)) return;
    finished.current = true; onConfirm(clear ? '' : fullExpiration(current.current));
  }
  return <Modal visible transparent animationType="none" statusBarTranslucent navigationBarTranslucent onRequestClose={cancel}>
    <SafeAreaView style={styles.overlay}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Cancel ${purpose} selection`} onPress={cancel} style={StyleSheet.absoluteFill} />
      <View accessibilityViewIsModal style={styles.sheet}>
        <ScrollView nestedScrollEnabled scrollEnabled={outerEnabled} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text accessibilityRole="header" style={styles.title}>{purpose === 'reminder' ? 'Reminder date' : 'Expiration date'}</Text>
          <View style={styles.wheels}>
            <ExpirationWheel label="Day" values={Array.from({ length: monthDays(selected.year, selected.month) }, (_, i) => ({ value: i + 1, text: String(i + 1).padStart(2, '0') }))}
              value={selected.day} rowHeight={rowHeight} onChange={day => change({ day })} onBusy={active => wheelBusy('Day', active)} />
            <ExpirationWheel label="Month" values={EXPIRATION_MONTHS.map((text, i) => ({ value: i + 1, text }))}
              value={selected.month} rowHeight={rowHeight} onChange={month => change({ month })} onBusy={active => wheelBusy('Month', active)} />
            <ExpirationWheel label="Year" values={years.map(year => ({ value: year, text: String(year).padStart(4, '0') }))}
              value={selected.year} rowHeight={rowHeight} onChange={year => change({ year })} onBusy={active => wheelBusy('Year', active)} />
          </View>
          {parseExpiration(value)?.day === null && <Text style={styles.legacy}>Month-only date. Confirm to set a day.</Text>}
          <View style={styles.actions}>
            <GlassButton accessibilityLabel={`Cancel ${purpose} date`} onPress={cancel} style={styles.action}><Text style={styles.actionText}>Cancel</Text></GlassButton>
            <GlassButton accessibilityLabel={`Clear ${purpose} date`} onPress={() => confirm(true)} style={styles.action}><Text style={styles.actionText}>Clear</Text></GlassButton>
            <GlassButton accessibilityLabel={`Confirm ${purpose} date`} disabled={busy.length > 0} onPress={() => confirm()} kind="action" style={styles.action}><Text style={[styles.actionText, styles.onAction]}>Confirm</Text></GlassButton>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  </Modal>;
}
const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: sheetVisual.scrim },
  sheet: { maxHeight: '96%', width: '100%', maxWidth: 600, alignSelf: 'center', backgroundColor: sheetVisual.surface, boxShadow: sheetVisual.shadow, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },
  content: { padding: 16, gap: 12 }, title: { ...ciTypography.title, lineHeight: 28, fontWeight: '700', color: ciColors.text.primary },
  wheels: { flexDirection: 'row', gap: 4 }, column: { flex: 1, minWidth: 0 },
  columnLabel: { fontFamily: lagoonFonts.latin, fontSize: 12, lineHeight: 20, color: lagoon.text.secondary, textAlign: 'center' },
  selection: { position: 'absolute', left: 0, right: 0, borderRadius: 12, backgroundColor: lagoon.action.soft, borderTopWidth: 1, borderBottomWidth: 1, borderColor: lagoon.rim.boundary },
  wheelItem: { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 2 },
  wheelText: { fontFamily: lagoonFonts.latin, fontSize: 16, lineHeight: 24, color: lagoon.text.primary, textAlign: 'center' },
  reminderWheelText: { fontSize: 22, lineHeight: 30, fontWeight: '600' }, reminderSelectedText: { color: ciColors.action.primary },
  monthText: { fontSize: 13, lineHeight: 18 }, selectedText: { fontWeight: '700' }, neighborText: { color: lagoon.text.secondary },
  actions: { flexDirection: 'row', gap: 8 }, action: { flex: 1, minWidth: 0, minHeight: 48, paddingHorizontal: 8, paddingVertical: 12 },
  actionText: { ...ciTypography.button, fontWeight: '700', color: ciColors.action.neutral, textAlign: 'center', flexShrink: 1 },
  onAction: { color: ciColors.text.onAction }, legacy: { ...ciTypography.supporting, fontWeight: '400', color: ciColors.text.supporting },
});
