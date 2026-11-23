import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { ExpirationWheel } from './ExpirationDatePicker';
import { AddCardIcon } from './AddCardIcon';
import { GlassButton } from './GlassButton';
import { ciColors, ciTypography } from '../../constants/ci-theme';
import { lagoon } from '../../constants/lagoon-theme';
import { EXPIRATION_MONTHS, fullExpiration, monthDays } from '../../lib/expiration-date';
import { localCalendarDate, quickReminderDate, reminderMonth, reminderMonthCells } from '../../lib/reminder-calendar';

const hours = Array.from({ length: 24 }, (_, value) => ({ value, text: String(value).padStart(2, '0') }));
const minutes = Array.from({ length: 60 }, (_, value) => ({ value, text: String(value).padStart(2, '0') }));
const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export function ReminderScheduleFields({ date, time, disabled, onDateChange, onTimeChange, onBusy }: {
  date: string; time: string; disabled: boolean; onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void; onBusy: (busy: boolean) => void;
}) {
  const [month, setMonth] = useState(() => localCalendarDate(new Date()));
  const moving = useRef(new Set<string>()), latestTime = useRef(time), alive = useRef(true);
  latestTime.current = time;
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const cells = useMemo(() => reminderMonthCells(month.year, month.month), [month.year, month.month]);
  const leading = cells.findIndex(Boolean), count = monthDays(month.year, month.month);
  const previousCount = month.month > 1 ? monthDays(month.year, month.month - 1) : 31;
  const today = fullExpiration(localCalendarDate(new Date()));
  const { fontScale } = useWindowDimensions();
  const rowHeight = Math.max(48, Math.ceil(40 * fontScale + 12));
  function wheelBusy(label: string, busy: boolean) {
    if (!alive.current) return;
    if (busy) moving.current.add(label); else moving.current.delete(label);
    onBusy(moving.current.size > 0);
  }
  function changeTime(part: number, value: number) {
    if (!alive.current || disabled) return;
    const parts = latestTime.current.split(':'); parts[part] = String(value).padStart(2, '0');
    latestTime.current = parts.join(':'); onTimeChange(latestTime.current);
  }
  return <View style={styles.content}>
    <View style={styles.calendar}>
      <View style={styles.monthHeader}>
        <Pressable accessibilityRole="button" accessibilityLabel="Previous reminder month" disabled={disabled || (month.year === 1 && month.month === 1)} onPress={() => setMonth(value => reminderMonth(value, -1))} style={styles.arrow}><Text style={styles.arrowText}>{'‹'}</Text></Pressable>
        <Text accessibilityRole="header" accessibilityLiveRegion="polite" style={styles.monthTitle}>{EXPIRATION_MONTHS[month.month - 1]} {month.year}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Next reminder month" disabled={disabled || (month.year === 9999 && month.month === 12)} onPress={() => setMonth(value => reminderMonth(value, 1))} style={styles.arrow}><Text style={styles.arrowText}>{'›'}</Text></Pressable>
      </View>
      <View style={styles.week}>{weekdays.map(day => <Text key={day} style={[styles.weekday, (day === 'Sat' || day === 'Sun') && styles.weekend]}>{day.toUpperCase()}</Text>)}</View>
      {Array.from({ length: cells.length / 7 }, (_, row) => <View key={row} style={styles.week}>
        {cells.slice(row * 7, row * 7 + 7).map((value, column) => value ? <Pressable key={value} accessibilityRole="button" accessibilityLabel={`Reminder date ${value}${value === today ? ', today' : ''}`} accessibilityState={{ selected: value === date, disabled: disabled || value < today }} disabled={disabled || value < today}
          onPress={() => { if (!disabled && alive.current) onDateChange(value); }} style={styles.day}>
          <View style={[styles.dateCircle, value === today && styles.today, value === date && styles.selected]}>
          <Text style={[styles.dayText, column >= 5 && styles.weekend, value < today && styles.past, value === date && styles.selectedText]}>{Number(value.slice(-2))}</Text></View>
        </Pressable> : <View key={`empty-${column}`} style={styles.day} accessible={false}><Text style={[styles.dayText,styles.past]}>{row*7+column < leading ? previousCount-leading+row*7+column+1 : row*7+column-leading-count+1}</Text></View>)}
      </View>)}
    </View>
    <View style={styles.shortcuts}>{(['day', 'week', 'month'] as const).map(unit => <GlassButton key={unit} accessibilityLabel={`+1 ${unit}`} disabled={disabled} onPress={() => {
      if (disabled || !alive.current) return;
      const selected = quickReminderDate(new Date(), unit), [year, month, day] = selected.split('-').map(Number);
      setMonth({ year, month, day }); onDateChange(selected);
    }} style={styles.shortcut}><AddCardIcon name="calendar" color={ciColors.action.primary} size={18}/><Text style={styles.shortcutText}>+1 {unit}</Text></GlassButton>)}</View>
    <View pointerEvents={disabled ? 'none' : 'auto'} accessibilityElementsHidden={disabled} importantForAccessibility={disabled ? 'no-hide-descendants' : 'auto'} style={styles.time} accessibilityLabel={`Selected reminder date and time ${date} ${time}`}>
      <View style={styles.timeLabel}><AddCardIcon name="clock" color={ciColors.action.primary} size={22}/><Text style={styles.sectionTitle}>Time</Text></View>
      <View style={[styles.wheelSurface,{height:rowHeight*3}]}>
      <ExpirationWheel appearance="reminder" label="Hour" values={hours} value={Number(time.split(':')[0])} rowHeight={rowHeight} onChange={value => changeTime(0, value)} onBusy={busy => wheelBusy('hour', busy)} /></View>
      <Text style={styles.colon}>:</Text><View style={[styles.wheelSurface,{height:rowHeight*3}]}>
      <ExpirationWheel appearance="reminder" label="Minute" values={minutes} value={Number(time.split(':')[1])} rowHeight={rowHeight} onChange={value => changeTime(1, value)} onBusy={busy => wheelBusy('minute', busy)} /></View>
    </View>
  </View>;
}
const styles = StyleSheet.create({
  content: { gap: 12 }, calendar: { borderRadius: 18, backgroundColor: ciColors.surface.elevated, overflow: 'hidden', borderWidth: 1, borderColor: lagoon.action.soft },
  monthHeader: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: lagoon.action.soft, paddingHorizontal: 4, paddingVertical: 4 },
  monthTitle: { ...ciTypography.section, color: ciColors.text.primary, textAlign: 'center', flex: 1 },
  arrow: { width: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' }, arrowText: { fontSize: 30, color: ciColors.action.primary },
  week: { flexDirection: 'row' }, weekday: { ...ciTypography.supporting, color: ciColors.text.supporting, flex: 1, textAlign: 'center', paddingVertical: 6 },
  day: { flex: 1, minWidth: 0, minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingVertical: 4 },
  dateCircle: { minWidth: 32, minHeight: 32, padding: 4, borderRadius: 999, borderWidth: 1, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center' }, weekend: { color: ciColors.action.primary },
  dayText: { ...ciTypography.body, color: ciColors.text.primary }, past: { color: ciColors.status.disabled },
  today: { borderColor: ciColors.action.primary }, selected: { backgroundColor: ciColors.action.primary }, selectedText: { color: ciColors.text.onAction, fontWeight: '700' },
  shortcuts: { flexDirection: 'row', gap: 8 }, shortcut: { flex: 1, minWidth: 0, minHeight: 48, paddingHorizontal: 4, paddingVertical: 10, borderRadius: 999, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  shortcutText: { ...ciTypography.button, color: ciColors.action.primary, textAlign: 'center', flexShrink: 1 },
  sectionTitle: { ...ciTypography.section, color: ciColors.text.primary, flexShrink: 1 },
  timeLabel: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 6 },
  wheelSurface: { flex: 1, minWidth: 0, backgroundColor: ciColors.surface.elevated, borderRadius: 14, overflow: 'hidden' },
  time: { flexDirection: 'row', alignItems: 'center', gap: 8, borderTopWidth: 1, borderTopColor: lagoon.action.soft, paddingTop: 12 },
  colon: { ...ciTypography.title, color: ciColors.action.primary, marginHorizontal: 2 },
});
