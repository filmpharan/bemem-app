import { prepareKeep, reminderInstant, type KeepForm } from './keeps';
import type { HistoryDocument } from './card-history';
import type { CardArtwork } from '../types/membership-card';
import type { KeepMediaInput } from './keep-media-files';

export type KeepSaveOutcome =
  | { kind: 'saved'; document: HistoryDocument; recordId: string; message: string; needsReview?: boolean }
  | { kind: 'not-started'; message: string }
  | { kind: 'uncertain'; message: string };
export type KeepDraftAccess = { canPick: () => boolean; canRetain: () => boolean; canWrite: () => boolean };
export type KeepDraftSnapshot = {
  note: string; images: KeepForm['images']; staged: KeepMediaInput | null;
  date: string; time: string; reminderSelected: boolean; busy: boolean;
  needsReview: boolean; saved: boolean; historyConfirmed: boolean; dirty: boolean; canSave: boolean; canPick: boolean; canRemove: boolean;
  validation: string; message: string; noteWarning: string;
};
type Media = {
  retain: (input: KeepMediaInput, admit: () => boolean) => Promise<CardArtwork>;
  release: (image: CardArtwork) => Promise<void>; saved: (images: readonly CardArtwork[]) => void;
  isBusy: () => boolean; hasIssues: () => boolean;
};
export type KeepDraftPorts = {
  cardId: string; access: KeepDraftAccess; now: () => Date; nextId: () => string; media: Media;
  acquirePicker: () => (() => void) | null;
  select: (camera: boolean, active: () => boolean) => Promise<KeepMediaInput | null>;
  save: (form: KeepForm, onHistoryConfirmed: () => void) => Promise<KeepSaveOutcome>;
};
export const KEEP_NOTE_LIMIT = 10000;
/** Read only on first Reminder interaction; display defaults never select a date. */
export function defaultKeepReminderTime(now: Date): string {
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}
function exceedsNoteLimit(value: string) {
  let count = 0;
  for (const point of value) { if (point && ++count > KEEP_NOTE_LIMIT) return true; }
  return false;
}
/** Owns one draft's picker/retain/save protocol, including late results after close. No History authority. */
export function createKeepDraftSession(ports: KeepDraftPorts) {
  let active = true, busy = false, uncertain = false, saved = false, submitted = false;
  let historyConfirmed = false;
  let note = '', images: KeepForm['images'] = [], staged: KeepMediaInput | null = null;
  let selected = false, date = '', time = '', clockInitialized = false, message = '', noteWarning = '';
  const removing = new Map<string, CardArtwork>();
  let retainAttempted = false, cleanupStarted = false;
  const listeners = new Set<() => void>();
  let snapshot: KeepDraftSnapshot;
  function validation() {
    if (!selected) return '';
    try {
      const at = reminderInstant(date, time);
      const lead = Date.parse(at) - ports.now().getTime();
      if (lead <= 0) return 'Choose a reminder time in the future.';
      return '';
    } catch { return 'Choose a valid local date and time.'; }
  }
  function publish() {
    const invalid = validation(), dirty = !!note.trim() || images.length > 0 || !!staged || selected || removing.size > 0;
    snapshot = { note, images: [...images], staged, date, time, reminderSelected: selected, busy,
      needsReview: uncertain || ports.media.hasIssues(), saved, historyConfirmed, dirty, validation: invalid, message, noteWarning,
      canPick: active && !busy && !uncertain && !saved && !staged && images.length < 4 && ports.access.canPick() && !ports.media.isBusy() && !ports.media.hasIssues(),
      canRemove: active && !busy && !uncertain && !saved && !submitted && ports.access.canRetain() && !ports.media.isBusy() && !ports.media.hasIssues(),
      canSave: active && !busy && !uncertain && !saved && !staged && dirty && !invalid && ports.access.canWrite() && !ports.media.isBusy() && !ports.media.hasIssues() };
    for (const listener of listeners) listener();
  }
  const editable = () => active && !busy && !uncertain && !saved;
  const artwork = (receipts: KeepForm['images']) => receipts.map(receipt => { const image = { ...receipt }; Reflect.deleteProperty(image, 'id'); return image; });
  async function cleanup() {
    if (cleanupStarted || busy || uncertain || submitted || saved) return;
    cleanupStarted = true;
    for (const image of artwork(images)) {
      try { await ports.media.release(image); }
      catch { uncertain = true; message = 'Temporary photo cleanup needs review. No deletion will be retried.'; }
    }
    if (!uncertain) images = [];
    publish();
  }
  async function retainStaged() {
    if (!active || busy || !staged || retainAttempted || uncertain || !ports.access.canRetain() || ports.media.isBusy() || ports.media.hasIssues()) return;
    const input = staged; retainAttempted = true; busy = true; publish();
    try {
      const image = await ports.media.retain(input, () => active && staged === input && ports.access.canPick() && ports.access.canRetain());
      if (!active || staged !== input || !ports.access.canPick() || !ports.access.canRetain()) {
        await ports.media.release(image);
      } else { images = [...images, { ...image, id: ports.nextId() }]; message = ''; }
      staged = null;
    } catch (error) {
      message = error instanceof Error ? error.message : 'Photo storage was not confirmed.';
      uncertain = ports.media.hasIssues() || !!(error && typeof error === 'object' && 'needsReview' in error && error.needsReview);
      // A failed retain is never retried implicitly; the SDK selection remains visible evidence.
    } finally { busy = false; publish(); if (!active) await cleanup(); }
  }
  publish();
  return {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    refresh() { publish(); void retainStaged(); },
    setNote(value: string) {
      if (!editable()) return;
      if (exceedsNoteLimit(value)) noteWarning = 'Keep notes within 10,000 characters. Your previous text is unchanged.';
      else { note = value; noteWarning = ''; }
      publish();
    },
    openReminder() { if (editable() && !clockInitialized) { time = defaultKeepReminderTime(ports.now()); clockInitialized = true; publish(); } },
    selectDate(value: string) { if (editable()) { date = value; selected = true; if (!clockInitialized) { time = defaultKeepReminderTime(ports.now()); clockInitialized = true; } publish(); } },
    setTime(value: string) { if (editable()) { time = value; clockInitialized = true; publish(); } },
    removeReminder() { if (editable()) { selected = false; date = ''; publish(); } },
    async removePhoto(id: string) {
      if (!editable() || submitted || !ports.access.canRetain() || ports.media.isBusy() || ports.media.hasIssues()) return;
      const image = images.find(item => item.id === id);
      if (!image) return;
      const owned = artwork([image])[0];
      removing.set(id, owned); images = images.filter(item => item.id !== id);
      busy = true; publish();
      try {
        // The existing media authority verifies exact ownership and durable references.
        // Keep evidence until release is confirmed, even after this draft closes.
        await ports.media.release(owned); removing.delete(id);
      } catch {
        uncertain = true; message = 'Photo cleanup needs review. The file evidence is preserved; no removal will be retried.';
      } finally { busy = false; publish(); if (!active) await cleanup(); }
    },
    async pick(camera: boolean) {
      publish(); if (!snapshot.canPick) return;
      const release = ports.acquirePicker(); if (!release) { message = 'Another photo picker is still open.'; publish(); return; }
      busy = true; message = ''; publish();
      try { const input = await ports.select(camera, () => active && ports.access.canPick());
        if (input && active && ports.access.canPick()) { staged = input; retainAttempted = false; }
      } catch (error) { message = error instanceof Error ? error.message : 'Photo selection failed.'; }
      finally { release(); busy = false; publish(); }
      if (active) await retainStaged(); else await cleanup();
    },
    async save(): Promise<KeepSaveOutcome> {
      publish();
      if (!snapshot.canSave) return { kind: 'not-started', message: snapshot.validation || 'Saving is not ready. Your draft is unchanged.' };
      const form: KeepForm = { kind: 'full', note, images: [...images], ...(selected ? { reminder: { title: 'You have a reminder.', at: reminderInstant(date, time) } } : {}) };
      try { prepareKeep(form, ports.cardId, 'validation-only', ports.now().toISOString()); }
      catch (error) { message = error instanceof Error ? error.message : 'Check your Keep.'; publish(); return { kind: 'not-started', message }; }
      busy = true; submitted = true; message = ''; publish();
      let custodyTransferred = false;
      const confirmed = () => { if (!custodyTransferred) { custodyTransferred = true; historyConfirmed = true; ports.media.saved(artwork(form.images)); publish(); } };
      try {
        const outcome = await ports.save(form, confirmed);
        message = outcome.message;
        if (outcome.kind === 'saved') { confirmed(); saved = true; }
        else if (outcome.kind === 'uncertain' || custodyTransferred) uncertain = true;
        else submitted = false;
        if (custodyTransferred && outcome.kind === 'not-started') return { kind: 'uncertain', message: 'History was saved, but follow-up status needs review.' };
        return outcome;
      } catch { uncertain = true; message = 'Save was not confirmed. Review My Keeps before continuing.'; return { kind: 'uncertain', message }; }
      finally { busy = false; publish(); if (!active) await cleanup(); }
    },
    async discard() { if (busy) return false; active = false; staged = null; await cleanup(); publish(); return true; },
    close() { active = false; publish(); if (!busy) void cleanup(); },
  };
}
export type KeepDraftSession = ReturnType<typeof createKeepDraftSession>;
