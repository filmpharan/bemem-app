import { ciColors,ciTypography } from '../../constants/ci-theme';
import { useEffect, useRef, useState } from 'react';
import { Keyboard, StyleSheet, Text, View } from 'react-native';
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
export function EditMembershipCardEditor({ commands, session, card, onClose, onSaved }: {
  commands: ReturnType<typeof createWalletFeatureCommands>; session: MembershipEditSession; card: MembershipCard;
  onClose: (requiresReinspection: boolean) => void; onSaved: () => void;
}) {
  const [form, setForm] = useState(() => membershipEditorState(card));
  const values: MembershipEditValues = { name: form.values.name, memberNumber: form.values.memberNumber, expiryMonth: form.presentation.expiryMonth };
  const [errors, setErrors] = useState<MembershipEditErrors>({}), [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false), [requiresReview, setRequiresReview] = useState(false);
  const saving = useRef(false), mounted = useRef(true), confirmation = useRef(false);
  const dialogSequence = useRef(0), activeDialog = useRef<string|null>(null);
  const [confirmationRequest,setConfirmationRequest]=useState<ConfirmationRequest|null>(null);
  // Keep display metadata from the opening snapshot stable during Save/readback.
  const [original] = useState(() => card);
  const [imageBusy, setImageBusy] = useState(false);
  const imageActive = useRef(false);
  function imageActivity(active: boolean) { imageActive.current = active; setImageBusy(active); }
  const [actionWidth, setActionWidth] = useState(240);
  const formValues = form.values, presentation = form.presentation;
  useEffect(() => { mounted.current = true; return () => {
    mounted.current = false; activeDialog.current = null; commands.cancelEdit(session.token);
  }; }, [commands, session.token]);
  const dirty = editorChanged(membershipEditorState(original), form);
  function finishClose() { if (!mounted.current || saving.current) return; Keyboard.dismiss(); commands.cancelEdit(session.token); onClose(requiresReview); }
  // Present inside the existing sheet Modal, exactly like Add Card's approved confirmation.
  function showConfirmation(title:string,description:string,actions:ConfirmationRequest['actions']) {
    if (!mounted.current || saving.current || confirmation.current) return;
    const id=`edit-card-confirmation-${++dialogSequence.current}`;
    activeDialog.current=id;confirmation.current=true;Keyboard.dismiss();
    const release=()=>{
      if(!mounted.current||activeDialog.current!==id||saving.current)return false;
      activeDialog.current=null;confirmation.current=false;setConfirmationRequest(null);return true;
    };
    setConfirmationRequest({id,title,description,onDismiss:()=>{release();},actions:actions.map(action=>({...action,onPress:()=>{if(release())return action.onPress();}}))});
  }
  function close() {
    if (!mounted.current || saving.current || imageActive.current || confirmation.current) return;
    if (!dirty) { finishClose(); return; }
    showConfirmation(requiresReview ? 'Check wallet status' : 'Discard changes?',
      requiresReview ? 'Saving was not confirmed. Closing does not retry or restore files. Use Reinspect wallet before continuing.' : 'Your unsaved card changes will be discarded.',
      [{ label: requiresReview ? 'Keep form open' : 'Keep Editing', role: 'primary', onPress: () => {} },
        { label: requiresReview ? 'Close without retry' : 'Discard Changes', role: 'destructive', onPress: finishClose }]);
  }
  async function save(acceptedPosition?: Position) {
    if (!mounted.current || saving.current || imageActive.current || confirmation.current || requiresReview || !dirty) return;
    const review = commands.reviewEdit(session.token, form);
    if (!review.ok) { setNotice(review.message); return; }
    if (review.moved && (!acceptedPosition || acceptedPosition.col !== review.position.col || acceptedPosition.row !== review.position.row)) {
      showConfirmation('Move resized card?', `The new size cannot fit here. Move this card to column ${review.position.col + 1}, row ${review.position.row + 1}? Other cards will stay in place.`, [
        { label: 'Cancel', role: 'neutral', onPress: () => {} },
        { label: 'Move and Save', role: 'primary', onPress: () => save(review.position) },
      ]);
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
   face={{side:presentation.side,disabled:busy||imageBusy||requiresReview,onToggle:()=>{if(!saving.current&&!imageActive.current&&!confirmation.current&&!requiresReview)setForm(previous=>({...previous,presentation:{...previous.presentation,side:previous.presentation.side==='front'?'back':'front'}}));}}}
   confirmation={confirmationRequest?{content:<ConfirmationDialog presentation="inline" request={confirmationRequest} busy={busy}/>,onRequestClose:confirmationRequest.onDismiss}:undefined} footer={<>
    <View style={styles.actionRow}>
    <GlassButton accessibilityLabel="Cancel editing card" disabled={busy || imageBusy} onPress={close} style={styles.action}>
      <AddCardText maxWidth={Math.max(1, actionWidth - 34)} style={[styles.actionText, styles.cancelText]}>Cancel</AddCardText>
    </GlassButton>
    <GlassButton accessibilityLabel="Save membership changes" kind="action" busy={busy} disabled={busy || requiresReview || imageBusy || !dirty} onPress={() => { void save(); }}
      onLayout={event => setActionWidth(event.nativeEvent.layout.width)} style={styles.action}>
      <AddCardText maxWidth={Math.max(1, actionWidth - 34)} style={styles.actionText}>{busy ? 'Saving...' : 'Save Changes'}</AddCardText>
    </GlassButton>
    </View>
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
  notice: { fontFamily: lagoonFonts.latin, fontSize: 10, lineHeight: 15, color: lagoon.text.secondary, textAlign: 'center' },
});
