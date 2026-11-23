import { ciColors,ciTypography } from '../../constants/ci-theme';
import { sheetVisual } from '../../constants/sheet-visual';
﻿import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, FlatList, Keyboard, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { uuid } from 'expo';
import { Image } from 'expo-image';
import type { MembershipCard } from '../../types/membership-card';
import { amountInput, cardHistory, HistoryError, localHistoryTimestamp, preparePhotoEntry,
  type HistoryDocument, type HistoryRecord, type PhotoEntryForm, type Receipt } from '../../lib/card-history';
import { createHistoryCommands } from '../../lib/card-history-commands';
import { deviceHistoryRepository, receiptUri, removeRetiredReceipts, prepareRetiredReminders } from '../../lib/card-history-native';
import type { HistoryDeleteIntent } from '../../lib/card-history-deletion';
import { lagoon, lagoonFonts } from '../../constants/lagoon-theme';
import { useWalletRuntime } from './WalletRuntimeProvider';
import { AddCardSheet } from './AddCardSheet';
import { GlassButton } from './GlassButton';
import { ReceiptAttachments } from './ReceiptAttachments';
import { artworkFrame } from '../../lib/card-artwork';
import { ConfirmationDialog,type ConfirmationRequest } from './ConfirmationDialog';

type Commands = ReturnType<typeof createHistoryCommands>;
export function CardHistorySheet({ card, fromCreate, onClose }: { card: Readonly<MembershipCard>; fromCreate: boolean; onClose: () => void }) {
  const { runtime, snapshot } = useWalletRuntime();
  const command = useRef<Commands | null>(null), active = useRef(true), submitting = useRef(false), confirming = useRef(false);
  const list = useRef<FlatList<HistoryRecord>>(null), scrollOnReturn = useRef(false);
  const [doc, setDoc] = useState<HistoryDocument | null>(null), [notice, setNotice] = useState(''), [busy, setBusy] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null), [adding, setAdding] = useState(false);
  const [listContentWidth, setListContentWidth] = useState(280);
  const [selecting, setSelecting] = useState(false), [selection, setSelection] = useState<Set<string>>(() => new Set());
  const [review, setReview] = useState(false), [recoveries, setRecoveries] = useState<HistoryDeleteIntent[]>([]);
  const [deleteConfirmation,setDeleteConfirmation]=useState<ConfirmationRequest|null>(null);
  const historyRequest=useRef<ConfirmationRequest|null>(null);
  const confirmationSequence=useRef(0);
  const ready = (runtime.pages?.canEditCard(card.id)??true)&&snapshot.state.source === 'v2' && snapshot.state.editsAllowed && !snapshot.state.dirty && !snapshot.state.saving;
  const rows = useMemo(() => doc ? cardHistory(doc, card.id) : [], [doc, card.id]);
  const historyLocked = recoveries.some(item => item.cardId === card.id);
  const enabled = ready && !!doc && !busy && !review && !historyLocked;
  const reload = useCallback(async (commands: Commands | null = command.current) => {
    if (!commands || submitting.current) return;
    submitting.current = true; setBusy(true); setNotice('');
    try {
      const recovery = await runtime.historyDeletion.list();
      if (active.current && command.current === commands) setRecoveries(recovery);
      const loaded = await commands.load();
      if (active.current && command.current === commands) {
        setDoc(loaded); setDetailId(null); setReview(false); setSelecting(false); setSelection(new Set());
      }
    } catch (error) {
      if (active.current && command.current === commands) { setDoc(null); setReview(true); setNotice(historyMessage(error)); }
    } finally { submitting.current = false; if (active.current && command.current === commands) setBusy(false); }
  }, [runtime.historyDeletion]);
  useEffect(() => {
    active.current = true;
    const commands = createHistoryCommands(deviceHistoryRepository, {
      cardId: card.id, now: () => new Date().toISOString(), nextId: () => uuid.v4(), beforeCommit: prepareRetiredReminders, afterCommit: removeRetiredReceipts,
      admission() {
        const state = runtime.getSnapshot();
        return { generation: state.state.generation, revision: state.session?.revision ?? -1, context: fromCreate ? 'create' : 'home',
          cardExists: state.state.source === 'v2' && !!state.session?.saved.cards.some(item => item.kind === 'membership' && item.id === card.id),
          canManage: (runtime.pages?.canEditCard(card.id)??true)&&state.state.editsAllowed && !state.state.saving && !state.state.dirty && runtime.historyDeletion.allowed(card.id) };
      },
    });
    command.current = commands;
    void Promise.resolve().then(() => { if (command.current === commands) void reload(commands); });
    return () => { active.current = false; commands.close(); if (command.current === commands) command.current = null; };
  }, [runtime, card.id, fromCreate, reload]);
  useEffect(() => {
    if (!adding && scrollOnReturn.current) { list.current?.scrollToOffset({ offset: 0, animated: false }); scrollOnReturn.current = false; }
  }, [adding, doc?.revision]);
  function cancelSelection() { setSelecting(false); setSelection(new Set()); }
  function close() {
    if (submitting.current || confirming.current) return;
    if (detailId) setDetailId(null); else if (selecting) cancelSelection(); else onClose();
  }
  async function recover(id: string) {
    if (submitting.current || !fromCreate) return;
    submitting.current = true; setBusy(true);
    try {
      const message = await runtime.historyDeletion.recover(id);
      if (active.current) { setNotice(message); setRecoveries(await runtime.historyDeletion.list()); }
    } catch { if (active.current) setNotice('Recovery was not confirmed. No automatic retry was made. Reinspect wallet and history before continuing.'); }
    finally { submitting.current = false; if (active.current) setBusy(false); }
  }
  function requestDelete() {
    if (!fromCreate || !enabled || !selecting || !selection.size || submitting.current || confirming.current) return;
    const ids = [...selection], chosen = rows.filter(item => selection.has(item.id));
    if (chosen.length !== ids.length) { setReview(true); setNotice('The selection changed. Reload history before deleting.'); return; }
    const photos = chosen.reduce((count, item) => count + item.receipts.length, 0);
    confirming.current = true;
    const cancel=()=>{if(submitting.current||!confirming.current||historyRequest.current!==request)return;confirming.current=false;historyRequest.current=null;setDeleteConfirmation(null);};
    const request:ConfirmationRequest={id:`history-delete-${++confirmationSequence.current}`,title:`Delete ${ids.length} selected ${ids.length === 1 ? 'entry' : 'entries'}?`,
      description:`${ids.length} history ${ids.length === 1 ? 'entry' : 'entries'} and ${photos} associated ${photos === 1 ? 'photo' : 'photos'} will be permanently removed. Your membership card is unchanged.`,onDismiss:cancel,
      actions:[{label:'Cancel',role:'primary',onPress:cancel},
        {label:`Delete ${ids.length} ${ids.length === 1 ? 'Entry' : 'Entries'}`,role:'destructive',onPress:()=>{
          if(!confirming.current||submitting.current||historyRequest.current!==request)return;
          confirming.current=false;return deleteEntries(ids).finally(()=>{if(historyRequest.current===request){historyRequest.current=null;if(active.current)setDeleteConfirmation(null);}});
        }}]};
    historyRequest.current=request;setDeleteConfirmation(request);
  }
  async function deleteEntries(ids: string[]) {
    if (submitting.current || !command.current || !fromCreate) return;
    submitting.current = true; setBusy(true); setNotice('');
    try {
      const result = await command.current.deleteSelected(ids);
      if (active.current) {
        setDoc(result.document); cancelSelection();
        setNotice(result.cleanupPending ? 'Entries deleted. Some unused photo files could not be removed.' : 'Selected entries deleted.');
      }
    } catch (error) { if (active.current) { setNotice(historyMessage(error)); setReview(true); } }
    finally { submitting.current = false; if (active.current) setBusy(false); }
  }
  const record = doc?.records.find(item => item.id === detailId && item.cardId === card.id);
  if (adding && command.current && !fromCreate) return <PhotoEntryEditor cardId={card.id} commands={command.current}
    onClose={requiresReview => { setAdding(false); if (requiresReview) setReview(true); }}
    onSaved={result => {
      scrollOnReturn.current = true; setDoc(result.document); setDetailId(null); setAdding(false);
      setNotice(result.cleanupPending ? 'Photo saved. Unused file cleanup could not be completed.' : 'Photo saved.');
    }} />;
  const status = <View style={styles.status}>
    <Text style={styles.heading}>{card.name}</Text>
    {!ready && <Text style={styles.helper}>Resolve canvas changes and check wallet status before changing history.</Text>}
    {busy && <Text accessibilityLiveRegion="polite" style={styles.text}>Loading or saving…</Text>}
    {!!notice && <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.text}>{notice}</Text>}
    {(review || recoveries.length > 0) && <HistoryButton label="Reload History" disabled={busy} onPress={() => { void reload(); }} />}
    {!!recoveries.length && <Text style={styles.heading}>Interrupted card deletion</Text>}
    {recoveries.map(intent => {
      const exists = snapshot.session?.saved.cards.some(item => item.id === intent.cardId);
      return <View key={intent.id} style={styles.content}>
        <Text style={styles.text}>{intent.cardName}: {intent.records.length} preserved entries, {intent.records.reduce((sum, item) => sum + item.receipts.length, 0)} photos. No deletion is retried automatically.</Text>
        {fromCreate && <HistoryButton label={exists ? 'Restore Preserved History' : 'Finish Receipt Cleanup'} disabled={busy || !ready}
          onPress={() => Alert.alert('Review interrupted deletion', exists ? 'Restore the preserved entries to the existing card?' : 'The card is gone. Remove only its unused photo files and finish recovery?', [
            { text: 'Cancel', style: 'cancel' }, { text: exists ? 'Restore History' : 'Finish Cleanup', onPress: () => { void recover(intent.id); } },
          ])} />}
      </View>;
    })}
  </View>;
  return <AddCardSheet modalOnly virtualized={!record} title={record ? 'History Entry' : 'History & Receipts'} closeDisabled={busy}
    confirmation={deleteConfirmation?{content:<ConfirmationDialog presentation="inline" request={deleteConfirmation} busy={busy}/>,onRequestClose:deleteConfirmation.onDismiss}:undefined}
    onClose={close} footer={!record && !fromCreate ? <View style={styles.homeActions} testID="history-home-actions">
      <View style={styles.actionColumn}><HistoryButton label="Back to Card" disabled={busy} onPress={close} /></View>
      <View style={styles.actionColumn}><HistoryButton label="Add Photo" primary disabled={!enabled} onPress={() => { if (enabled) setAdding(true); }} /></View>
    </View> : <View style={styles.content}>
      {!record && fromCreate && rows.length > 0 && !selecting && <HistoryButton label="Select" disabled={!enabled} onPress={() => { if (enabled) setSelecting(true); }} />}
      {!record && fromCreate && selecting && <>
        <Text accessibilityLiveRegion="polite" style={styles.text}>{selection.size} selected</Text>
        <View style={styles.options}>
          <HistoryButton label="Select All" disabled={!enabled} onPress={() => setSelection(new Set(rows.map(item => item.id)))} />
          <HistoryButton label="Cancel Selection" disabled={busy} onPress={cancelSelection} />
        </View>
        <HistoryButton label="Delete Selected" destructive disabled={!enabled || !selection.size} onPress={requestDelete} />
      </>}
      <HistoryButton label={record ? 'Back to History' : 'Back to Card'} disabled={busy} onPress={close} />
    </View>}>
    {record ? <View style={styles.content}>{status}
      <Text selectable style={styles.text}>{localHistoryTimestamp(record)}</Text>
      {record.entryKind !== 'photo' && <>
        <Text style={styles.heading}>{record.type[0].toUpperCase() + record.type.slice(1)}</Text>
        <Text selectable style={styles.text}>{record.date}{record.time ? ` · ${record.time}` : ''}</Text>
        {!!record.description && <Text selectable style={styles.text}>{record.description}</Text>}
        {!!record.money && <Text selectable style={styles.text}>{record.money.currency} {amountInput(record.money)}</Text>}
      </>}
      {!!record.notes && <Text selectable style={styles.text}>{record.notes}</Text>}
      <ReceiptAttachments receipts={record.receipts} journal={record.entryKind === 'photo'} horizontalPhotos disabled={busy} />
    </View> : <FlatList ref={list} style={{ flex: 1 }} data={rows} extraData={{ selection, selecting, busy }}
      keyExtractor={item => item.id} initialNumToRender={6} maxToRenderPerBatch={6} windowSize={5}
      onLayout={event => setListContentWidth(Math.max(48, event.nativeEvent.layout.width - 40))}
      ListHeaderComponent={status} contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled"
      ListEmptyComponent={doc ? <View style={styles.empty}><Text style={styles.heading}>No photos yet</Text>
        <Text style={styles.text}>{fromCreate ? 'Saved entries will appear here.' : 'Add a photo and an optional note.'}</Text></View> : undefined}
      renderItem={({ item }) => <Pressable accessibilityRole={selecting ? 'checkbox' : 'button'}
        accessibilityState={{ checked: selecting ? selection.has(item.id) : undefined, disabled: busy }}
        accessibilityLabel={`${selecting ? 'Select' : 'Open'} entry ${localHistoryTimestamp(item)}${item.notes ? `, ${item.notes.slice(0, 120)}` : ''}`}
        disabled={busy} style={[styles.row, selecting && selection.has(item.id) && styles.checkedRow]}
        onPress={() => {
          if (selecting) setSelection(previous => { const next = new Set(previous); if (next.has(item.id)) next.delete(item.id); else next.add(item.id); return next; });
          else { setDetailId(item.id); setNotice(''); }
        }}>
        {selecting && <View accessible={false} style={[styles.checkbox, selection.has(item.id) && styles.checkedBox]}>
          {selection.has(item.id) && <View accessible={false} style={styles.check} />}
        </View>}
        <HistoryThumbnails record={item} width={Math.max(48, (listContentWidth - 26 - (selecting ? 34 : 0)) * 0.64)} />
        <View style={styles.rowText}><Text style={styles.helper}>{localHistoryTimestamp(item)}</Text>
          {!!(item.notes || item.description) && <Text numberOfLines={2} style={styles.text}>{item.notes || item.description}</Text>}
          {item.receipts.length > 0 && <Text style={styles.helper}>{item.receipts.length}{item.receipts.length === 1 ? ' photo' : ' photos'}</Text>}
        </View>
      </Pressable>} />}
  </AddCardSheet>;
}
function HistoryThumbnails({ record, width }: { record: HistoryRecord; width: number }) {
  const images = record.receipts.slice(0, 4), slot = Math.max(1, Math.min(64, (width - 12) / 4));
  return <View style={styles.thumbnailStrip} testID="history-row-thumbnails">
    {images.length ? images.map(image => <HistoryThumbnail key={image.id} image={image} slot={slot} />) : <View style={styles.thumbnail}><Text style={styles.helper}>Entry</Text></View>}
  </View>;
}
function HistoryThumbnail({ image, slot }: { image: Receipt; slot: number }) {
  const [failed, setFailed] = useState(false);
  const ratio = image.cropRatio ?? image.width / image.height;
  const width = Math.min(slot, 80 * ratio);
  return <View style={{ width: slot, height: 80, alignItems: 'center' }}>
    {image && !failed ? <View style={{ width, height: width / ratio, overflow: 'hidden' }}>
      <Image source={{ uri: receiptUri(image.assetId) }} contentFit="contain" allowDownscaling recyclingKey={`${image.assetId}-${JSON.stringify(image.crop)}`}
        transition={0} cachePolicy="memory" onError={() => setFailed(true)} style={{ position: 'absolute', ...artworkFrame(image, width, width / ratio) }} />
    </View>
      : failed ? <Text style={styles.helper}>Photo unavailable</Text>
      : <Text style={styles.helper}>Entry</Text>}
  </View>;
}
function PhotoEntryEditor({ cardId, commands, onClose, onSaved }: {
  cardId: string; commands: Commands; onClose: (requiresReview?: boolean) => void;
  onSaved: (result: Awaited<ReturnType<Commands['savePhoto']>>) => void;
}) {
  const [form, setForm] = useState<PhotoEntryForm>({ images: [], note: '' });
  const currentForm = useRef(form);
  const [selectionFailed, setSelectionFailed] = useState(false);
  const selectionError = useRef(false);
  const [busy, setBusy] = useState(false), [notice, setNotice] = useState(''), [needsReview, setNeedsReview] = useState(false);
  const inspectionRequired = useRef(false);
  const working = useRef(false), imageBusy = useRef(false), mounted = useRef(true), confirming = useRef(false);
  const [picking, setPicking] = useState(false);
  function updateForm(patch: Partial<PhotoEntryForm>) {
    if (working.current) return;
    currentForm.current = { ...currentForm.current, ...patch }; setForm(currentForm.current);
  }
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  function close() {
    if (working.current || imageBusy.current || confirming.current) return;
    const draft = currentForm.current, inspect = inspectionRequired.current;
    Keyboard.dismiss(); if (!draft.images.length && !draft.note && !inspect) { onClose(); return; }
    confirming.current = true;
    Alert.alert(inspect ? 'Close without retry?' : 'Discard this entry?',
      inspect ? 'The save was not confirmed. Close without retrying, then reload history.' : 'Your unsaved photos and note will not be added to history.', [
        { text: 'Keep editing', style: 'cancel', onPress: () => { confirming.current = false; } },
        { text: inspect ? 'Close without retry' : 'Discard Entry', style: 'destructive', onPress: () => { confirming.current = false; if (!working.current && !imageBusy.current) onClose(inspectionRequired.current); } },
      ], { cancelable: true, onDismiss: () => { confirming.current = false; } });
  }
  async function save() {
    if (working.current || imageBusy.current || selectionError.current || inspectionRequired.current || confirming.current) return;
    const submitted = currentForm.current;
    try { preparePhotoEntry(submitted, cardId, 'validation-only', new Date().toISOString()); }
    catch (error) { setNotice(historyMessage(error)); return; }
    working.current = true; setBusy(true); setNotice(''); Keyboard.dismiss();
    try { const result = await commands.savePhoto(submitted); if (mounted.current) onSaved(result); }
    catch (error) { inspectionRequired.current = true; if (mounted.current) { setNotice(historyMessage(error)); setNeedsReview(true); } }
    finally { working.current = false; if (mounted.current) setBusy(false); }
  }
  return <AddCardSheet modalOnly title="Add Photo" onClose={close} closeDisabled={busy || picking}
    footer={<View style={styles.content}>
      {!!notice && <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.text}>{notice}</Text>}
      <HistoryButton label={busy ? 'Saving…' : 'Save'} primary disabled={busy || picking || selectionFailed || needsReview || !form.images.length} onPress={() => { void save(); }} />
      <HistoryButton label="Cancel" disabled={busy || picking} onPress={close} />
    </View>}>
    <View style={styles.content}>
      <ReceiptAttachments journal receipts={form.images} disabled={busy || needsReview}
        onSelectionError={failed => { selectionError.current = failed; setSelectionFailed(failed); }}
        onChange={images => updateForm({ images })}
        onBusy={value => { imageBusy.current = value; setPicking(value); }} />
      <View style={styles.content}><Text style={styles.text}>Note (optional)</Text>
        <TextInput accessibilityLabel="Note (optional)" value={form.note} multiline numberOfLines={2} scrollEnabled maxLength={100000}
          editable={!busy && !needsReview && !picking} style={styles.input} onChangeText={note => updateForm({ note })} />
      </View>
    </View>
  </AddCardSheet>;
}
export function HistoryButton({ label, onPress, disabled = false, primary = false, destructive = false }: {
  label: string; onPress: () => void; disabled?: boolean; primary?: boolean; destructive?: boolean;
}) {
  return <GlassButton accessibilityLabel={label} kind={primary ? 'action' : 'utility'} disabled={disabled} onPress={onPress} style={styles.button}>
    <Text style={[styles.text, styles.buttonLabel, primary && { color: lagoon.text.onAction }, destructive && { color: ciColors.action.destructive }]}>{label}</Text>
  </GlassButton>;
}
function historyMessage(error: unknown) { return error instanceof HistoryError ? error.message : 'History could not be confirmed. Your data was preserved. Close the form and reload before continuing.'; }
const styles = StyleSheet.create({
  content: { gap: 12 }, status: { gap: 8, paddingBottom: 12 }, list: { paddingHorizontal: 20, paddingBottom: 12 },
  heading: { ...ciTypography.section, color: ciColors.text.primary },
  text: { ...ciTypography.body, color: ciColors.text.primary },
  helper: { ...ciTypography.supporting, lineHeight:19, fontWeight:'400', color:ciColors.text.supporting },
  input: { minHeight: 68, maxHeight: 180, borderRadius: 12, borderWidth: 1, borderColor: '#bac5cc', backgroundColor: '#ffffff', padding: 12,
    fontFamily: lagoonFonts.latin, fontSize: 16, lineHeight: 24, color: lagoon.text.primary, textAlignVertical: 'top' },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, button: { minHeight: 48, minWidth: 48, padding: 12 },
  homeActions: { flexDirection: 'row', gap: 12, alignItems: 'stretch' }, actionColumn: { flex: 1, minWidth: 0, justifyContent: 'flex-end' },
  buttonLabel: { ...ciTypography.button, flexShrink: 1, textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 88, paddingVertical: 10, paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: sheetVisual.border, borderRadius: 8 },
  checkedRow: { backgroundColor: lagoon.action.soft }, rowText: { flex: 1, minWidth: 0, gap: 4 },
  thumbnail: { width: 64, height: 80, justifyContent: 'center', alignItems: 'center' },
  thumbnailStrip: { flexDirection: 'row', gap: 4, alignItems: 'flex-start' },
  checkbox: { width: 24, height: 24, borderWidth: 2, borderColor: lagoon.action.deep, borderRadius: 5, justifyContent: 'center', alignItems: 'center' },
  checkedBox: { backgroundColor: lagoon.action.deep }, check: { width: 7, height: 12, borderRightWidth: 2, borderBottomWidth: 2, borderColor: '#ffffff', transform: [{ rotate: '45deg' }], marginTop: -3 },
  empty: { paddingVertical: 20, gap: 8 },
});
