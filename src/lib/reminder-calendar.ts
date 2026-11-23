import { fullExpiration, monthDays, type CalendarDate } from './expiration-date';

export function localCalendarDate(now: Date): CalendarDate {
  return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
}
export function reminderMonth(date: CalendarDate, delta: number): CalendarDate {
  const index = date.year * 12 + date.month - 1 + delta;
  const year = Math.floor(index / 12), month = ((index % 12) + 12) % 12 + 1;
  return { year, month, day: Math.min(date.day, monthDays(year, month)) };
}
/** Local noon avoids midnight DST boundaries; calendar arithmetic never parses a UTC date string. */
export function quickReminderDate(now: Date, shortcut: 'day' | 'week' | 'month') {
  const today = localCalendarDate(now);
  if (shortcut === 'month') return fullExpiration(reminderMonth(today, 1));
  const next = new Date(now.getTime());
  next.setHours(12, 0, 0, 0); next.setDate(next.getDate() + (shortcut === 'day' ? 1 : 7));
  return fullExpiration(localCalendarDate(next));
}
export function reminderMonthCells(year: number, month: number): (string | null)[] {
  const first = new Date(2000, 0, 1, 12);
  first.setFullYear(year, month - 1, 1);
  const offset = (first.getDay() + 6) % 7, count = monthDays(year, month);
  return Array.from({ length: Math.ceil((offset + count) / 7) * 7 }, (_, index) => {
    const day = index - offset + 1;
    return day < 1 || day > count ? null : fullExpiration({ year, month, day });
  });
}
export function initialReminderSelection(now: Date) {
  const later = new Date(now.getTime() + 60 * 60 * 1000);
  return { date: fullExpiration(localCalendarDate(later)), time: `${String(later.getHours()).padStart(2, '0')}:${String(later.getMinutes()).padStart(2, '0')}` };
}
