import { ciColors,ciTypography } from '../../constants/ci-theme';
import { useEffect,useRef, useState, type ReactNode } from 'react';
import { Keyboard, StyleSheet, Text, View } from 'react-native';
import { type CardFormErrors } from '../../lib/card-form';
import { createDefaultCardArtworkSession } from '../../lib/default-card-artwork';
import { defaultCardArtworkSources,defaultCardArtworksReady,defaultArtworkReferencesReady,prepareDefaultCardArtworks } from '../../lib/default-card-artwork-native';
import type { CardArtwork } from '../../types/membership-card';
import type { createWalletFeatureCommands } from '../../lib/wallet-feature-commands';
import { lagoon, lagoonFonts } from '../../constants/lagoon-theme';
import { AddCardSheet } from './AddCardSheet';
import { AddCardForm } from './AddCardForm';
import { AddCardText } from './AddCardText';
import { GlassButton } from './GlassButton';
import { addCardLayout as layout } from './add-card-layout';
import { editorChanged } from '../../lib/card-editor-state';
import { ConfirmationDialog, type ConfirmationRequest } from './ConfirmationDialog';

/** Approved sheet/form geometry; production draft submission only, never a Save. */
export function AddCardEditor({ commands, background, onClose, onAdded, disabled, v2Active }: {
  commands: ReturnType<typeof createWalletFeatureCommands>; background: ReactNode;
  onClose: () => void; onAdded: () => void; disabled: boolean; v2Active: boolean;
}) {
  const [defaults]=useState(createDefaultCardArtworkSession);
  const [values, setValues] = useState(()=>defaults.values);
  const [presentation, setPresentation] = useState(()=>defaults.presentation);
  const [initial] = useState(() => ({ values, presentation }));
  const [errors, setErrors] = useState<CardFormErrors>({});
  const [notice, setNotice] = useState('');
  const [token] = useState(commands.begin);
  const [width, setWidth] = useState(320);
  const [imageBusy, setImageBusy] = useState(false);
  const [defaultsReady,setDefaultsReady]=useState(()=>defaultCardArtworksReady(defaults));
  const [defaultsError,setDefaultsError]=useState('');
  const [sources]=useState(()=>defaultCardArtworkSources(defaults,defaultsReady));
  useEffect(()=>{let active=true;
    if(defaultsReady)return;
    void prepareDefaultCardArtworks(defaults).then(()=>{if(active)setDefaultsReady(true);},()=>{if(active)setDefaultsError('Default artwork could not be prepared. Reopen Add Card, or replace both sides with photos.');});
    return()=>{active=false;};
  },[defaults]);
  const usedDefaults=Object.values(presentation.artwork??{}).filter((image):image is CardArtwork=>!!image&&(image.assetId===defaults.front.assetId||image.assetId===defaults.back.assetId));
  const currentDefaultsReady=defaultsReady||usedDefaults.length===0||!!defaultsError&&defaultArtworkReferencesReady(usedDefaults);
  const preparingDefaults=!currentDefaultsReady;
  const imageActive = useRef(false);
  function imageActivity(active: boolean) { imageActive.current = active; setImageBusy(active); }
  const submitting = useRef(false), confirming = useRef<string | null>(null);
  const confirmationSequence = useRef(0);
  const [confirmation, setConfirmation] = useState<ConfirmationRequest | null>(null);
  function finishClose() { Keyboard.dismiss(); commands.cancel(token); onClose(); }
  function close() {
    if (submitting.current || imageActive.current || confirming.current) return;
    if (!editorChanged(initial, { values, presentation })) { finishClose(); return; }
    const id = `add-card-discard-${++confirmationSequence.current}`;
    confirming.current = id;
    const keepEditing = () => {
      if (confirming.current !== id) return;
      confirming.current = null; setConfirmation(null);
    };
    setConfirmation({ id, title: 'Discard changes?', description: 'Your unsaved card changes will be discarded.',
      onDismiss: keepEditing, actions: [
        { label: 'Keep Editing', role: 'primary', onPress: keepEditing },
        { label: 'Discard Changes', role: 'destructive', onPress: () => {
          if (confirming.current !== id) return;
          confirming.current = null; setConfirmation(null); finishClose();
        } },
      ] });
  }
  return <AddCardSheet background={background} onClose={close} closeDisabled={imageBusy}
    confirmation={confirmation ? { content: <ConfirmationDialog presentation="inline" request={confirmation} />, onRequestClose: confirmation.onDismiss } : undefined} footer={<>
    <View style={styles.actionRow}>
    <GlassButton disabled={imageBusy} style={styles.action} accessibilityLabel="Cancel adding card" onLayout={event => setWidth(event.nativeEvent.layout.width)} onPress={close}>
      <AddCardText maxWidth={Math.max(1, width - 34)} style={[styles.actionText, { color: lagoon.text.primary }]}>Cancel</AddCardText>
    </GlassButton>
    <GlassButton kind="action" disabled={disabled || imageBusy || preparingDefaults} style={styles.action} accessibilityLabel="Add Card to Create draft"
      onLayout={event => setWidth(event.nativeEvent.layout.width)} onPress={() => {
        if (disabled || preparingDefaults || imageActive.current || submitting.current || confirming.current) return;
        submitting.current = true;
        Keyboard.dismiss(); const result = commands.add(token, values, presentation);
        if (result.ok) onAdded(); else { submitting.current = false; setErrors(result.errors); setNotice(result.message); }
      }}><AddCardText maxWidth={Math.max(1, width - 34)} style={styles.actionText}>Add Card</AddCardText></GlassButton>
    </View>
    {!!notice && <Text accessibilityLiveRegion="polite" style={styles.notice}>{notice}</Text>}
    {preparingDefaults&&!defaultsError&&<Text accessibilityLiveRegion="polite" style={styles.notice}>Preparing artwork...</Text>}
    {!!defaultsError&&preparingDefaults&&<Text accessibilityRole="alert" style={styles.notice}>{defaultsError}</Text>}
  </>}>
    <AddCardForm values={values} presentation={presentation} artworkSources={sources} errors={errors} onImageBusy={imageActivity}
      onChange={next => { setValues(next); setErrors({}); setNotice(''); }}
      onPresentationChange={next => { setPresentation(next); setNotice(''); }} />
  </AddCardSheet>;
}
const styles = StyleSheet.create({
  actionRow: { flexDirection: 'row', gap: 12, alignItems: 'stretch' },
  action: { flex: 1, minHeight: Math.max(48, layout.inputHeight), minWidth: 0, borderRadius: layout.buttonRadius, paddingVertical: 8, paddingHorizontal: 16 },
  actionText: { ...ciTypography.button, lineHeight:20, fontWeight:'700', color:ciColors.text.onAction, flexShrink:1 },
  notice: { fontFamily: lagoonFonts.latin, fontSize: 10, lineHeight: 15, color: lagoon.text.secondary, textAlign: 'center' },
});
