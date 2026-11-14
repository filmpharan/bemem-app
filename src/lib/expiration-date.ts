export type CalendarDate = { year: number; month: number; day: number };
export const EXPIRATION_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'] as const;
export function monthDays(year: number, month: number) {
  if (!Number.isInteger(year) || year < 1 || year > 9999 || !Number.isInteger(month) || month < 1 || month > 12) throw Error('Invalid calendar month');
  return month === 2 ? (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 29 : 28)
    : [4, 6, 9, 11].includes(month) ? 30 : 31;
}
/** Exact calendar strings only; no timestamp parsing, trimming, UTC or timezone conversion. */
export function parseExpiration(value: string): (Omit<CalendarDate, 'day'> & { day: number | null }) | null {
  const match = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]), month = Number(match[2]), day = match[3] === undefined ? null : Number(match[3]);
  try { const max = monthDays(year, month); if (day !== null && (day < 1 || day > max)) return null; }
  catch { return null; }
  return { year, month, day };
}
export function expirationDateError(value: string): string | undefined {
  return value === '' || parseExpiration(value) ? undefined : 'Choose a valid expiration date or clear it. Saved YYYY-MM dates are also supported.';
}
export function clampCalendarDate(date: CalendarDate): CalendarDate {
  return { ...date, day: Math.max(1, Math.min(monthDays(date.year, date.month), date.day)) };
}
export function fullExpiration(date: CalendarDate) {
  if (!Number.isInteger(date.day) || date.day < 1 || date.day > monthDays(date.year, date.month)) throw Error('Invalid calendar day');
  return `${String(date.year).padStart(4, '0')}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`;
}
/** A legacy date's provisional day is local picker state until explicit Confirm. */
export function initialExpiration(value: string, today: CalendarDate): CalendarDate {
  const parsed = parseExpiration(value);
  return parsed ? { ...parsed, day: parsed.day ?? 1 } : { ...today };
}
export function expirationYears(currentYear: number, selectedYear: number) {
  const first = Math.max(1, currentYear - 10), last = Math.min(9999, currentYear + 50);
  return [...new Set([...Array.from({ length: last - first + 1 }, (_, i) => first + i), selectedYear])].sort((a, b) => a - b);
}
