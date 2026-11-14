import { ciColors,ciTypography } from '../../constants/ci-theme';
import { useEffect, useRef, useState } from 'react';
import { Alert, Keyboard, Pressable, StyleSheet, Text, View } from 'react-native';
import type { createWalletFeatureCommands, MembershipEditSession } from '../../lib/wallet-feature-commands';
import type { MembershipEditErrors, MembershipEditValues } from '../../lib/membership-card-edit';
import { lagoon, lagoonFonts } from '../../constants/lagoon-theme';
import { AddCardSheet } from './AddCardSheet';
import { GlassButton } from './GlassButton';
import { AddCardForm } from './AddCardForm';
import { AddCardText } from './AddCardText';
import { addCardLayout as layout } from './add-card-layout';
import { editorChanged, membershipEditorState } from '../../lib/card-editor-state';
import type { Position } from '../../types/wallet-ui';
import type { MembershipCard } from '../../types/membership-card';
import { ConfirmationDialog,type ConfirmationRequest } from './ConfirmationDialog';

/** Shared Add Card UI; only the existing owner's explicit Save can persist it. */
export function EditMembershipCardEditor({ commands, session, card, onClose, onSaved, onDeleted }: {
  commands: ReturnType<typeof createWalletFeatureCommands>; session: MembershipEditSession; card: MembershipCard;
  onClose: (requiresReinspection: boolean) => void; onSaved: () => void; onDeleted?: () => void;
}) {
  const [form, setForm] = useState(() => membershipEditorState(card));
  const values: MembershipEditValues = { name: form.values.name, memberNumber: form.values.memberNumber, expiryMonth: form.presentation.expiryMonth };
  const [errors, setErrors] = useState<MembershipEditErrors>({}), [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false), [requiresReview, setRequiresReview] = useState(false);
  const saving = useRef(false), mounted = useRef(true), confirmation = useRef(false);
  const deleteToken = useRef<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmation,setDeleteConfirmation]=useState<ConfirmationRequest|null>(null);
  // Keep display metadata from the opening snapshot stable during Save/readback.
  const [original] = useState(() => card);
  const [imageBusy, setImageBusy] = useState(false);
  const imageActive = useRef(false);
  function imageActivity(active: boolean) { imageActive.current = active; setImageBusy(active); }
  const [actionWidth, setActionWidth] = useState(240);
  const formValues = form.values, presentation = form.presentation;
  useEffect(() => { mounted.current = true; return () => {
    mounted.current = false; commands.cancelEdit(session.token);
    if (deleteToken.current) commands.cancelDelete(deleteToken.current);
  }; }, [commands, session.token]);
  const dirty = editorChanged(membershipEditorState(original), form);
  function finishClose() { if (saving.current) return; Keyboard.dismiss(); commands.cancelEdit(session.token); onClose(requiresReview); }
  function close() {
    if (saving.current || imageActive.current || confirmation.current) return;
    if (!dirty) { finishClose(); return; }
    confirmation.current = true;
    Alert.alert(requiresReview ? 'Check wallet status' : 'Discard changes?',
      requiresReview ? 'Saving was not confirmed. Closing does not retry or restore files. Use Reinspect wallet before continuing.' : 'Your unsaved form changes will be discarded. Nothing will be saved.',
      [{ text: requiresReview ? 'Keep form open' : 'Keep editing', style: 'cancel', onPress: () => { confirmation.current = false; } },
        { text: requiresReview ? 'Close without retry' : 'Discard changes', style: 'destructive', onPress: () => { confirmation.current = false; finishClose(); } }],
      { cancelable: true, onDismiss: () => { confirmation.current = false; } });
  }
  function requestDelete() {
    if (!onDeleted || original.kind !== 'membership' || saving.current || imageActive.current || confirmation.current || requiresReview) return;
    const result = commands.openDelete(original.id);
    if (!result.ok) { setNotice(result.message); return; }
    Keyboard.dismiss();
    const { token, name } = result.session;
    deleteToken.current = token; confirmation.current = true;
    const cancel = () => {
      if (saving.current || deleteToken.current !== token) return;
      commands.cancelDelete(token); deleteToken.current = null; confirmation.current = false;setDeleteConfirmation(null);
    };
    const showConfirmation = (history: { records: number; receipts: number }) => {
    const includesHistory = history.records > 0 || history.receipts > 0;
    setDeleteConfirmation({id:token,title:'Delete this card?',description:`"${name}"\n${includesHistory
      ? `${history.records} history records and ${history.receipts} receipt attachments will be permanently removed with this card.`
      : 'This card will be permanently removed from your wallet.'}${dirty ? '\nUnsaved form changes will not be saved. Cancel keeps your changes.' : ''}`,onDismiss:cancel,actions:[
      {label:'Cancel',role:'primary',onPress:cancel},
      {label:includesHistory ? 'Delete Card & History' : 'Delete Card',role:'destructive',onPress:()=>{
        if (!mounted.current || deleteToken.current !== token || saving.current) return;
        confirmation.current = false; saving.current = true; setBusy(true); setDeleting(true); setNotice(''); Keyboard.dismiss();
        return (async () => {
          try {
            const deleted = await commands.confirmDelete(token);
            if (!mounted.current) return;
            if (deleted.ok) {
              if ('warning' in deleted && typeof deleted.warning === 'string' && deleted.warning) Alert.alert('Receipt cleanup needs review', deleted.warning);
              onDeleted(); return;
            }
            setNotice(deleted.message); setRequiresReview(deleted.requiresReinspection);
          } catch {
            if (mounted.current) { setNotice('Deletion was not confirmed. Close and use Reinspect wallet before continuing.'); setRequiresReview(true); }
          } finally {
            commands.cancelDelete(token); deleteToken.current = null; saving.current = false;
            if (mounted.current) { setBusy(false); setDeleting(false); setDeleteConfirmation(null); }
          }
        })();
      } },
    ]});
    };
    if (!commands.deleteReviewRequired) { showConfirmation({ records: 0, receipts: 0 }); return; }
    saving.current = true; setBusy(true);
    void commands.reviewDelete(token).then(review => {
      if (!mounted.current || deleteToken.current !== token) return;
      saving.current = false; setBusy(false); showConfirmation(review);
    }).catch(() => {
      commands.cancelDelete(token); deleteToken.current = null; confirmation.current = false; saving.current = false;
      if (mounted.current) { setBusy(false); setNotice('Deletion review could not be completed. Open History & Receipts to check interrupted operations, then review wallet status. Nothing was deleted.'); }
    });
  }
  async function save(acceptedPosition?: Position) {
    if (saving.current || imageActive.current || confirmation.current || requiresReview || !dirty) return;
    const review = commands.reviewEdit(session.token, form);
    if (!review.ok) { setNotice(review.message); return; }
    if (review.moved && (!acceptedPosition || acceptedPosition.col !== review.position.col || acceptedPosition.row !== review.position.row)) {
      if (confirmation.current) return;
      confirmation.current = true;
      Alert.alert('Move resized card?', `The new size cannot fit here. Move this card to column ${review.position.col + 1}, row ${review.position.row + 1}? Other cards will stay in place.`, [
        { text: 'Cancel', style: 'cancel', onPress: () => { confirmation.current = false; } },
        { text: 'Move and Save', onPress: () => { confirmation.current = false; void save(review.position); } },
      ], { cancelable: true, onDismiss: () => { confirmation.current = false; } });
      return;
    }
    saving.current = true; setBusy(true); setNotice(''); Keyboard.dismiss();
    let completed = false;
    try {
      const result = await commands.saveEdit(session.token, values, { ...form, acceptedPosition });
      completed = result.ok;
      if (mounted.current && !result.ok) { setErrors(result.errors); setNotice(result.message); setRequiresReview(result.requiresReinspection); }
    } catch { if (mounted.current) { setNotice('Save was not confirmed. Close and check wallet status before continuing.'); setRequiresReview(true); } }
    finally { saving.current = false; if (mounted.current) setBusy(false); }
    if (completed && mounted.current) onSaved();
  }
  return <AddCardSheet modalOnly title="Edit Card" closeDisabled={busy || imageBusy} onClose={close}
   confirmation={deleteConfirmation?{content:<ConfirmationDialog presentation="inline" request={deleteConfirmation} busy={busy}/>,onRequestClose:deleteConfirmation.onDismiss}:undefined} footer={<>
    <View style={styles.actionRow}>
    <GlassButton accessibilityLabel="Cancel editing card" disabled={busy || imageBusy} onPress={close} style={styles.action}>
      <AddCardText maxWidth={Math.max(1, actionWidth - 34)} style={[styles.actionText, styles.cancelText]}>Cancel</AddCardText>
    </GlassButton>
    <GlassButton accessibilityLabel="Save membership changes" kind="action" busy={busy && !deleting} disabled={busy || requiresReview || imageBusy || !dirty} onPress={() => { void save(); }}
      onLayout={event => setActionWidth(event.nativeEvent.layout.width)} style={styles.action}>
      <AddCardText maxWidth={Math.max(1, actionWidth - 34)} style={styles.actionText}>{busy && !deleting ? 'Saving...' : 'Save Changes'}</AddCardText>
    </GlassButton>
    </View>
    {!!onDeleted && original.kind === 'membership' && <Pressable accessibilityRole="button" accessibilityLabel="Delete Card"
      accessibilityHint="Requires confirmation. Unsaved form changes will not be saved."
      accessibilityState={{ disabled: busy || imageBusy || requiresReview, busy: deleting }} disabled={busy || imageBusy || requiresReview}
      style={styles.delete} onPress={requestDelete}>
      <Text style={styles.deleteText}>{deleting ? 'Deleting...' : 'Delete Card'}</Text>
    </Pressable>}
    {!!notice && <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.notice}>{notice}</Text>}
  </>}>
    <AddCardForm mode="edit" fullEditing onImageBusy={imageActivity} editCard={original} disabled={busy || requiresReview} values={formValues}
      presentation={presentation} errors={errors} expiryError={errors.expiryMonth}
      onChange={next => {
        if (saving.current || requiresReview) return;
        setForm(previous => ({ ...previous, values: next })); setErrors({}); setNotice('');
      }}
      onPresentationChange={next => {
        if (saving.current || requiresReview) return;
        setForm(previous => ({ ...previous, presentation: next })); setErrors({}); setNotice('');
      }} />
  </AddCardSheet>;
}
const styles = StyleSheet.create({
  actionRow: { flexDirection: 'row', gap: 12, alignItems: 'stretch' },
  action: { flex: 1, minHeight: Math.max(48, layout.inputHeight), minWidth: 0, borderRadius: layout.buttonRadius, paddingVertical: 8, paddingHorizontal: 16 },
  actionText: { ...ciTypography.button, lineHeight:20, fontWeight:'700', color:ciColors.text.onAction, flexShrink:1 },
  cancelText: { color: ciColors.action.neutral },
  delete: { minHeight: 48, marginTop: 12, padding: 12, justifyContent: 'center', alignItems: 'center' },
  deleteText: { ...ciTypography.button, lineHeight:20, color:ciColors.action.destructive, textAlign:'center' },
  notice: { fontFamily: lagoonFonts.latin, fontSize: 10, lineHeight: 15, color: lagoon.text.secondary, textAlign: 'center' },
});
