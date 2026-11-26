import { useEffect, useRef, useState, useSyncExternalStore, type ComponentRef } from 'react';
import { AccessibilityInfo, Keyboard, KeyboardAvoidingView, LayoutAnimation, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, UIManager, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { ciColors, ciTypography } from '../../constants/ci-theme';
import { sheetVisual } from '../../constants/sheet-visual';
import type { KeepDraftSession, KeepSaveOutcome } from '../../lib/keep-draft-session';
import { keepMediaFiles, receiptUri } from '../../lib/card-history-native';
import { subscribeKeepPicker } from './keeps-lifecycle';
import { AddCardIcon } from './AddCardIcon';
import { CardArtworkImage } from './CardArtworkImage';
import { ConfirmationDialog, type ConfirmationRequest } from './ConfirmationDialog';
import { ReminderScheduleFields } from './ReminderScheduleFields';

type Target = 'note' | 'calendar' | 'time';
type Box = { y: number; height: number };
export function AddKeepSheet({ draft, cardName, onClose, onSaved, onReview }: {
  draft: KeepDraftSession; cardName: string; onClose: () => void;
  onSaved: (outcome: Extract<KeepSaveOutcome, { kind: 'saved' }>) => void; onReview?: () => void;
}) {
  const state = useSyncExternalStore(draft.subscribe, draft.getSnapshot, draft.getSnapshot);
  const currentDraft = useRef(draft); currentDraft.current = draft;
  const [expanded, setExpanded] = useState({ note: false, reminder: false });
  const [sheetHeight, setSheetHeight] = useState<number | undefined>(undefined);
  const [request, setRequest] = useState<ConfirmationRequest | null>(null);
  const [wheelBusy, setWheelBusy] = useState(false);
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null), input = useRef<ComponentRef<typeof TextInput>>(null);
  const live = useRef(true), epoch = useRef(0), reduced = useRef(true), shown = useRef(false), motionEpoch = useRef(0), userScrolling = useRef(false), interaction = useRef<Target | null>(null);
  const motionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const focusPending = useRef(false), pending = useRef<Target | null>(null), moving = useRef(false), animating = useRef(false);
  const latest = useRef({ onClose, onSaved, expanded, request }); latest.current = { onClose, onSaved, expanded, request };
  const geometry = useRef({ available: 0, header: 0, footer: 0, height: 0, viewport: 0, content: 0, offset: 0, reminderY: 0, scheduleY: 0, boxes: {} as Partial<Record<Target, Box>> });
  function flush() {
    if (!live.current || currentDraft.current !== draft || !shown.current || animating.current || moving.current || userScrolling.current) return;
    const target = pending.current, g = geometry.current;
    if (!target || !g.viewport || !g.content || !g.boxes[target]) return;
    if (target === 'note' && !latest.current.expanded.note || target !== 'note' && !latest.current.expanded.reminder) return;
    if (g.height && Math.abs(g.viewport - Math.max(0, g.height - g.header - g.footer)) > 2) return;
    let box = g.boxes[target]!;
    const calendar = g.boxes.calendar, time = g.boxes.time;
    if (target !== 'note') {
      if (!calendar || !time) return;
      const height = time.y + time.height - calendar.y;
      if (height <= g.viewport) box = { y: calendar.y, height };
    }
    const top = target === 'note' ? box.y : g.reminderY + g.scheduleY + box.y;
    const bottom = top + box.height;
    // Child layout can precede ScrollView's new content-size event on Android.
    if (bottom > g.content) return;
    const desired = box.height > g.viewport || top < g.offset ? top : bottom > g.offset + g.viewport ? bottom - g.viewport : g.offset;
    const bounded = Math.max(0, Math.min(desired, Math.max(0, g.content - g.viewport)));
    scroll.current?.scrollTo({ y: bounded, animated: !reduced.current });
    g.offset = bounded; pending.current = null;
    if (target === 'note' && focusPending.current) { focusPending.current = false; input.current?.focus(); }
  }
  function queue(target: Target) {
    pending.current = target; const ticket = epoch.current;
    requestAnimationFrame(() => { if (live.current && ticket === epoch.current) flush(); });
  }
  const layoutActions = useRef({ queue, flush }); layoutActions.current = { queue, flush };
  useEffect(() => {
    const sequence = epoch, visualTimer = motionTimer;
    live.current = true;
    if (Platform.OS === 'android') UIManager.setLayoutAnimationEnabledExperimental?.(true);
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (mounted) reduced.current = value; });
    const motion = AccessibilityInfo.addEventListener('reduceMotionChanged', value => { reduced.current = value; if (value) { if (visualTimer.current) clearTimeout(visualTimer.current); visualTimer.current = null; animating.current = false; layoutActions.current.flush(); } });
    const keyboardShow = Keyboard.addListener('keyboardDidShow', () => { if (latest.current.expanded.note && interaction.current === 'note') layoutActions.current.queue('note'); });
    const keyboardHide = Keyboard.addListener('keyboardDidHide', () => layoutActions.current.flush());
    const unfile = keepMediaFiles.subscribe(() => draft.refresh()), unpick = subscribeKeepPicker(() => draft.refresh());
    const timer = setInterval(() => draft.refresh(), 15000);
    draft.refresh();
    return () => { mounted = false; live.current = false; sequence.current++; if (visualTimer.current) clearTimeout(visualTimer.current); visualTimer.current = null; draft.close(); motion.remove(); keyboardShow.remove(); keyboardHide.remove(); unfile(); unpick(); clearInterval(timer); };
  }, [draft]);
  function animateLayout(duration: number) {
    if (motionTimer.current) clearTimeout(motionTimer.current); motionTimer.current = null;
    if (reduced.current) { animating.current = false; return; }
    animating.current = true;
    const ticket = epoch.current, motion = ++motionEpoch.current;
    const finish = () => { if (live.current && ticket === epoch.current && motion === motionEpoch.current) { if (motionTimer.current) clearTimeout(motionTimer.current); motionTimer.current = null; animating.current = false; flush(); } };
    // Visual fallback only: disabled native animations may omit their completion callback.
    motionTimer.current = setTimeout(finish, duration + 34);
    LayoutAnimation.configureNext({ duration, update: { type: 'easeInEaseOut' }, create: { type: 'easeInEaseOut', property: 'opacity' }, delete: { type: 'easeInEaseOut', property: 'opacity' } }, finish, finish);
  }
  function resize() {
    if (!live.current || currentDraft.current !== draft) return;
    const g = geometry.current;
    if (!g.available || !g.header || !g.footer || !g.content) return;
    const height = Math.min(g.available, g.header + g.content + g.footer);
    if (Math.abs(height - g.height) < 1) return;
    if (g.height) animateLayout(height > g.height ? 220 : 160);
    g.height = height; setSheetHeight(height);
  }
  function focusNote() {
    if (!live.current || currentDraft.current !== draft || !focusPending.current || !latest.current.expanded.note) return;
    focusPending.current = false; input.current?.focus();
  }
  function expand(section: 'note' | 'reminder') {
    if (state.busy || state.needsReview || request) return;
    epoch.current++; pending.current = null; focusPending.current = false;
    const opening = !expanded[section];
    interaction.current = opening ? section === 'note' ? 'note' : 'calendar' : null;
    if (opening && section === 'note') delete geometry.current.boxes.note;
    if (opening && section === 'reminder') { delete geometry.current.boxes.calendar; delete geometry.current.boxes.time; draft.openReminder(); }
    Keyboard.dismiss(); moving.current = false; userScrolling.current = false; setWheelBusy(false);
    animateLayout(opening ? 220 : 160);
    setExpanded(value => ({ ...value, [section]: opening }));
    if (opening) {
      focusPending.current = section === 'note'; queue(section === 'note' ? 'note' : 'calendar');
      if (section === 'note') { const ticket = epoch.current; requestAnimationFrame(() => { if (live.current && ticket === epoch.current) focusNote(); }); }
    }
  }
  function close() {
    if (request) { request.onDismiss(); return; }
    if (Keyboard.isVisible()) { Keyboard.dismiss(); return; }
    if (state.historyConfirmed) { draft.close(); latest.current.onClose(); return; }
    if (state.busy) return;
    if (!state.dirty && !state.needsReview) { void draft.discard().then(ok => { if (ok && live.current && currentDraft.current === draft) latest.current.onClose(); }); return; }
    const ticket = ++epoch.current;
    const dismiss = () => { if (live.current && epoch.current === ticket) setRequest(null); };
    setRequest({ id: `draft-discard-${ticket}`, title: state.needsReview ? 'Close without retry?' : 'Discard this Keep?',
      description: state.needsReview ? 'The outcome needs review. Closing preserves uncertain photos and never retries saving.' : 'Your unsaved note, photos and reminder will be discarded.', onDismiss: dismiss,
      actions: [{ label: 'Keep Editing', role: 'primary', onPress: dismiss },
        { label: state.needsReview ? 'Close without retry' : 'Discard Changes', role: 'destructive', onPress: async () => {
          if (!live.current || epoch.current !== ticket || currentDraft.current !== draft) return;
          const ok = await draft.discard(); if (ok && live.current && epoch.current === ticket && currentDraft.current === draft) latest.current.onClose();
        } }],
    });
  }
  async function save() {
    if (request || wheelBusy) return;
    Keyboard.dismiss(); const outcome = await draft.save();
    if (live.current && currentDraft.current === draft && outcome.kind === 'saved') latest.current.onSaved(outcome);
  }
  const locked = state.busy || state.needsReview || state.saved || !!request;
  function action(label: string, icon: 'note' | 'camera' | 'image' | 'bell', onPress: () => void, options?: { expanded?: boolean; summary?: string; disabled?: boolean }) {
    return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: locked || options?.disabled, ...(options?.expanded !== undefined ? { expanded: options.expanded } : {}) }} disabled={locked || options?.disabled} onPress={onPress} style={({ pressed }) => [styles.action, pressed && styles.pressed, (locked || options?.disabled) && styles.disabled]}>
      <View style={styles.icon}><AddCardIcon name={icon} size={24} color={ciColors.action.primary}/></View>
      <View style={styles.actionText}><Text style={styles.label}>{label}</Text>{!!options?.summary && <Text numberOfLines={2} style={styles.summary}>{options.summary}</Text>}</View>
      {options?.expanded !== undefined && <View style={{ transform: [{ rotate: options.expanded ? '180deg' : '0deg' }] }}><AddCardIcon name="chevron" size={20}/></View>}
    </Pressable>;
  }
  return <Modal visible transparent animationType="none" statusBarTranslucent navigationBarTranslucent onRequestClose={close} onShow={() => { shown.current = true; flush(); }}>
    <SafeAreaView style={styles.overlay} edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboard} onLayout={event => { geometry.current.available = event.nativeEvent.layout.height; resize(); }}>
        <View style={[styles.sheet, sheetHeight !== undefined && { height: sheetHeight }]} accessibilityViewIsModal>
          <View style={styles.header} onLayout={event => { geometry.current.header = event.nativeEvent.layout.height; resize(); }}><Text accessibilityRole="header" style={styles.title}>Add Keep</Text><Text numberOfLines={2} style={styles.summary}>{cardName}</Text></View>
          <ScrollView ref={scroll} style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" scrollEnabled={!wheelBusy && !request}
            accessibilityElementsHidden={!!request} importantForAccessibility={request ? 'no-hide-descendants' : 'auto'}
            onLayout={event => { geometry.current.viewport = event.nativeEvent.layout.height; flush(); }} onContentSizeChange={(_w, h) => { geometry.current.content = h; resize(); flush(); }}
            onScrollBeginDrag={() => { userScrolling.current = true; pending.current = null; focusPending.current = false; }} onScrollEndDrag={() => { userScrolling.current = false; }}
            onScroll={event => { geometry.current.offset = event.nativeEvent.contentOffset.y; }} scrollEventThrottle={16}>
            {action('TAKE PHOTO', 'camera', () => { Keyboard.dismiss(); void draft.pick(true); }, { disabled: !state.canPick })}
            {action('GALLERY', 'image', () => { Keyboard.dismiss(); void draft.pick(false); }, { disabled: !state.canPick })}
            {(state.images.length > 0 || state.staged) && <View style={styles.photos} accessibilityLabel={`${state.images.length} of 4 photos attached`}>
              {state.images.map((image, index) => <View key={image.id} style={styles.photo}>
                <View style={styles.photoClip}><CardArtworkImage image={image} sourceUri={receiptUri(image.assetId)} displayPreview="editor"/></View>
                <Pressable accessibilityRole="button" accessibilityLabel={`Remove draft photo ${index + 1}`} accessibilityState={{ disabled: locked || !state.canRemove }} disabled={locked || !state.canRemove} onPress={() => { Keyboard.dismiss(); void draft.removePhoto(image.id); }} style={styles.photoRemove}><View style={styles.photoRemoveCircle}><AddCardIcon name="close" size={16} color={ciColors.text.primary}/></View></Pressable>
              </View>)}
              {state.staged && <View style={styles.photo}><Image source={{ uri: state.staged.uri }} style={StyleSheet.absoluteFill} contentFit="contain" transition={0}/></View>}
              <Text style={styles.summary}>{state.images.length}/4 photos{state.staged ? ' · Photo selected temporarily; safe storage is required.' : ''}</Text>
            </View>}
            {action('NOTE', 'note', () => expand('note'), { expanded: expanded.note, summary: !expanded.note ? state.note.trim().replace(/\s+/g, ' ') : undefined })}
            {expanded.note && <View onLayout={event => { geometry.current.boxes.note = event.nativeEvent.layout; focusNote(); queue('note'); }}><TextInput ref={input} accessibilityLabel="Keep note" placeholder="Write a note" multiline onFocus={() => { interaction.current = 'note'; queue('note'); }} value={state.note} editable={!locked} onChangeText={draft.setNote} style={styles.input}/>{!!state.noteWarning && <Text accessibilityRole="alert" style={styles.error}>{state.noteWarning}</Text>}</View>}
            <View onLayout={event => { geometry.current.reminderY = event.nativeEvent.layout.y; flush(); }}>
              {action('REMINDER', 'bell', () => expand('reminder'), { expanded: expanded.reminder, summary: state.reminderSelected && !expanded.reminder ? `${state.date} · ${state.time}` : undefined })}
              {expanded.reminder && <View style={styles.reminder} onLayout={event => { geometry.current.scheduleY = event.nativeEvent.layout.y; flush(); }}>
                <ReminderScheduleFields date={state.date} time={state.time} disabled={locked} onBusy={value => { moving.current = value; setWheelBusy(value); if (!value) flush(); }}
                  onDateChange={value => { draft.selectDate(value); queue('time'); }} onTimeChange={draft.setTime}
                  onCalendarLayout={event => { geometry.current.boxes.calendar = event.nativeEvent.layout; flush(); }} onTimeLayout={event => { geometry.current.boxes.time = event.nativeEvent.layout; flush(); }}/>
                {state.reminderSelected && <><Text style={styles.summary}>{state.date} · {state.time} (24-hour local time)</Text><Pressable accessibilityRole="button" disabled={locked} onPress={draft.removeReminder} style={styles.remove}><Text style={styles.summary}>Clear reminder</Text></Pressable></>}
              </View>}
            </View>
          </ScrollView>
          <View style={styles.footer} onLayout={event => { geometry.current.footer = event.nativeEvent.layout.height; resize(); }} accessibilityElementsHidden={!!request} importantForAccessibility={request ? 'no-hide-descendants' : 'auto'}>
            {!!(state.validation || state.message) && <Text accessibilityRole="alert" style={styles.error}>{state.validation || state.message}</Text>}
            {state.needsReview && <Text style={styles.error}>Needs Review. Saving is locked; no operation will be retried.</Text>}
            {state.busy && state.historyConfirmed && <Text style={styles.summary}>Keep saved. Notification status is pending; you can close this sheet safely.</Text>}
            {state.needsReview && onReview && <Pressable accessibilityRole="button" onPress={() => { if (!state.busy) onReview(); }} disabled={state.busy} style={styles.remove}><Text style={styles.label}>Review status</Text></Pressable>}
            <View style={styles.buttons}><Pressable accessibilityRole="button" accessibilityLabel={state.historyConfirmed ? 'Close saved Keep' : 'Cancel Keep'} disabled={state.busy && !state.historyConfirmed || !!request} onPress={close} style={[styles.button, styles.cancel, state.busy && !state.historyConfirmed && styles.disabled]}><Text style={styles.label}>CANCEL</Text></Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="Save Keep" accessibilityState={{ disabled: !state.canSave || wheelBusy || !!request, busy: state.busy }} disabled={!state.canSave || wheelBusy || !!request} onPress={() => { void save(); }} style={[styles.button, styles.save, (!state.canSave || wheelBusy) && styles.disabled]}><Text style={styles.saveText}>SAVE KEEP</Text></Pressable></View>
          </View>
          <ConfirmationDialog presentation="inline" request={request}/>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  </Modal>;
}
const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: sheetVisual.scrim }, keyboard: { flex: 1, justifyContent: 'flex-end' },
  sheet: { maxHeight: '100%', width: '100%', backgroundColor: ciColors.surface.sheet, borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden' },
  header: { padding: 20, gap: 4 }, title: { ...ciTypography.title, color: ciColors.text.primary }, scroll: { flexGrow: 0, flexShrink: 1 }, content: { paddingHorizontal: 20, paddingBottom: 20, gap: 10 },
  action: { minHeight: 64, padding: 12, gap: 12, flexDirection: 'row', alignItems: 'center', borderRadius: 18, backgroundColor: ciColors.surface.elevated }, icon: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' }, actionText: { flex: 1, gap: 4 },
  label: { ...ciTypography.button, color: ciColors.text.primary }, summary: { ...ciTypography.supporting, color: ciColors.text.secondary }, input: { ...ciTypography.body, color: ciColors.text.primary, minHeight: 128, maxHeight: 200, textAlignVertical: 'top', padding: 14, borderRadius: 16, backgroundColor: ciColors.surface.elevated, borderWidth: 1, borderColor: ciColors.action.primary },
  reminder: { paddingTop: 12, gap: 10 }, photos: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, photo: { width: 100, height: 100 }, photoClip: { flex: 1, borderRadius: 14, overflow: 'hidden' }, photoRemove: { position: 'absolute', top: 0, right: 0, width: 48, height: 48, alignItems: 'flex-end', padding: 4 }, photoRemoveCircle: { width: 28, height: 28, borderRadius: 14, backgroundColor: ciColors.surface.elevated, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: ciColors.status.disabled },
  footer: { padding: 20, paddingTop: 12, gap: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: ciColors.status.disabled }, buttons: { flexDirection: 'row', gap: 12 }, button: { flex: 1, minHeight: 52, padding: 12, justifyContent: 'center', alignItems: 'center', borderRadius: 16 }, cancel: { backgroundColor: ciColors.surface.elevated }, save: { backgroundColor: ciColors.action.primary }, saveText: { ...ciTypography.button, color: ciColors.text.onAction }, error: { ...ciTypography.supporting, color: ciColors.status.error }, remove: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 8 }, disabled: { opacity: 0.45 }, pressed: { opacity: 0.75 },
});
