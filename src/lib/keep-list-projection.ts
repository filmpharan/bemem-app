import type { HistoryDocument, HistoryRecord } from './card-history';

export type KeepGroup = 'Needs review' | 'Overdue' | 'Upcoming' | 'Saved';
export type KeepSection = { title: KeepGroup; data: HistoryRecord[] };

/** Persisted identity is authoritative. Native queue availability is deliberately not an input. */
export function projectKeepList(document: HistoryDocument | null, cardId: string, reviewIds: readonly string[], now: number): KeepSection[] {
  const review = new Set(reviewIds);
  const sections: KeepSection[] = ['Needs review', 'Overdue', 'Upcoming', 'Saved'].map(title => ({ title: title as KeepGroup, data: [] }));
  for (const record of document?.records ?? []) {
    if (record.cardId !== cardId) continue;
    const reminder = record.keep?.reminder;
    const index = review.has(record.id) ? 0 : reminder?.state === 'pending' ? (Date.parse(reminder.at) <= now ? 1 : 2) : 3;
    sections[index].data.push(record);
  }
  const newest = (a: HistoryRecord, b: HistoryRecord) => b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id);
  sections.forEach(section => section.data.sort(section.title === 'Overdue' || section.title === 'Upcoming'
    ? (a, b) => a.keep!.reminder!.at.localeCompare(b.keep!.reminder!.at) || a.id.localeCompare(b.id) : newest));
  return sections;
}

export function keepListSummary(record: HistoryRecord) {
  const note = record.notes.trim() || record.description.trim();
  return note.replace(/\s+/g, ' ').slice(0, 180) || (record.receipts.length ? `${record.receipts.length} ${record.receipts.length === 1 ? 'photo' : 'photos'}` : record.keep?.reminder ? 'Reminder' : 'Saved Keep');
}

export function keepListNotification(record: HistoryRecord) {
  const reminder = record.keep?.reminder;
  if (!reminder) return '';
  if (reminder.state === 'completed') return 'Completed';
  switch (reminder.notification.status) {
    case 'scheduled': return 'Notification scheduled';
    case 'denied': return 'Saved · Notifications not permitted';
    case 'failed': return 'Saved · Notification not confirmed';
    case 'not_scheduled': return 'Saved · Notification not confirmed';
  }
}

export function keepListLocation(sections: readonly KeepSection[], id: string) {
  for (let sectionIndex = 0; sectionIndex < sections.length; sectionIndex++) {
    const itemIndex = sections[sectionIndex].data.findIndex(record => record.id === id);
    if (itemIndex >= 0) return { sectionIndex, itemIndex };
  }
  return null;
}

/** One timer for the next classification boundary; no polling or background work. */
export function nextKeepDeadline(document: HistoryDocument | null, cardId: string, now: number) {
  let next: number | null = null;
  for (const record of document?.records ?? []) {
    const reminder = record.keep?.reminder;
    if (record.cardId !== cardId || reminder?.state !== 'pending') continue;
    const at = Date.parse(reminder.at);
    if (at > now && (next === null || at < next)) next = at;
  }
  return next;
}
