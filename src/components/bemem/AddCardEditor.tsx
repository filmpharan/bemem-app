import { ciColors,ciTypography } from '../../constants/ci-theme';
import { useEffect,useImperativeHandle,useRef, useState, type ReactNode,type Ref } from 'react';
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

export type AddCardEditorHandle={requestClose:(onStay?:()=>void)=>boolean;back:()=>void};

/** Approved sheet/form geometry; production draft submission only, never a Save. */
export function AddCardEditor({ commands, background, onClose, onAdded, disabled, v2Active,ref,onNavigationBlockedChange }: {
  commands: ReturnType<typeof createWalletFeatureCommands>; background: ReactNode;
  onClose: () => void; onAdded: () => void; disabled: boolean; v2Active: boolean;
  ref?:Ref<AddCardEditorHandle>;onNavigationBlockedChange?:(blocked:boolean)=>void;
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
  const closed=useRef(false),stayCallback=useRef<(()=>void)|undefined>(undefined),latestClose=useRef<()=>void>(()=>{});
  function finishClose() {if(closed.current)return;closed.current=true;Keyboard.dismiss();commands.cancel(token);onClose();}
  useImperativeHandle(ref,()=>({requestClose(onStay){if(submitting.current||imageActive.current||confirming.current||closed.current)return false;stayCallback.current=onStay;latestClose.current();return true;},back(){if(confirmation)confirmation.onDismiss();else latestClose.current();}}),[confirmation]);
  useEffect(()=>{onNavigationBlockedChange?.(imageBusy||!!confirmation||submitting.current);return()=>onNavigationBlockedChange?.(false);},[imageBusy,!!confirmation,onNavigationBlockedChange]);
  function close() {
    if (submitting.current || imageActive.current || confirming.current || closed.current) return;
    if (!editorChanged(initial, { values, presentation })) { finishClose(); return; }
    const id = `add-card-discard-${++confirmationSequence.current}`;
    confirming.current = id;
    const keepEditing = () => {
      if (confirming.current !== id) return;
      confirming.current = null; setConfirmation(null);const stay=stayCallback.current;stayCallback.current=undefined;stay?.();
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
  latestClose.current=close;
  return <AddCardSheet modalOnly background={background} onClose={close} closeDisabled={imageBusy}
    face={{side:presentation.side,disabled:imageBusy||disabled,onToggle:()=>{if(!imageActive.current&&!submitting.current&&!confirming.current)setPresentation(previous=>({...previous,side:previous.side==='front'?'back':'front'}));}}}
    confirmation={confirmation ? { content: <ConfirmationDialog presentation="inline" request={confirmation} />, onRequestClose: confirmation.onDismiss } : undefined} footer={<>
    <View style={styles.actionRow}>
    <GlassButton disabled={imageBusy} style={styles.action} accessibilityLabel="Cancel adding card" onLayout={event => setWidth(event.nativeEvent.layout.width)} onPress={close}>
      <AddCardText maxWidth={Math.max(1, width - 34)} style={[styles.actionText, { color: lagoon.text.primary }]}>Cancel</AddCardText>
    </GlassButton>
    <GlassButton kind="action" disabled={disabled || imageBusy || preparingDefaults} style={styles.action} accessibilityLabel="Add Card to Arrange draft"
      onLayout={event => setWidth(event.nativeEvent.layout.width)} onPress={() => {
        if (disabled || preparingDefaults || imageActive.current || submitting.current || confirming.current || closed.current) return;
        submitting.current = true;
        Keyboard.dismiss(); const result = commands.add(token, values, presentation);
        if (result.ok) onAdded(); else { submitting.current = false; setErrors(result.errors); setNotice(result.message); }
      }}><AddCardText maxWidth={Math.max(1, width - 34)} style={styles.actionText}>Add Card</AddCardText></GlassButton>
    </View>
    {!!notice && <Text accessibilityLiveRegion="polite" style={styles.notice}>{notice}</Text>}
    {preparingDefaults&&!defaultsError&&<Text accessibilityLiveRegion="polite" style={styles.notice}>Preparing artwork...</Text>}
    {!!defaultsError&&preparingDefaults&&<Text accessibilityRole="alert" style={styles.notice}>{defaultsError}</Text>}
  </>}>
    <AddCardForm values={values} presentation={presentation} fallbackArtwork={{front:defaults.front,back:defaults.back}} artworkSources={sources} errors={errors} onImageBusy={imageActivity}
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
