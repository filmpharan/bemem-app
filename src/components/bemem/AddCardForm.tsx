import { ciColors,ciTypography } from '../../constants/ci-theme';
import { useEffect, useRef, useState, type Ref } from 'react';
import { Alert, Keyboard, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextInputInstance } from 'react-native';
import { alpha, lagoon, lagoonFonts } from '../../constants/lagoon-theme';
import { changeMembershipNumber,
  type CardFormErrors, type CardFormField, type CardFormValues } from '../../lib/card-form';
import { expiryMonthError, type CardPresentationDraft } from '../../lib/card-presentation';
import { cardSizePreset, cardSizePresetsFor, selectCardSize, sizePresetForOrientation, type CardSizePresetId } from '../../lib/card-size-presets';
import type { MembershipCard } from '../../types/membership-card';
import { GlassButton } from './GlassButton';
import { CardAppearancePreview } from './CardAppearancePreview';
import { AddCardIcon } from './AddCardIcon';
import { AddCardText } from './AddCardText';
import { CardArtworkControls } from './CardArtworkControls';
import { ExpirationDatePicker } from './ExpirationDatePicker';
import { MembershipNumberScanner } from './MembershipNumberScanner';
import { addCardLayout as layout, cardPreviewSize } from './add-card-layout';

type Props = { values: CardFormValues; errors: CardFormErrors; onChange: (values: CardFormValues) => void; onBlur?: (field: CardFormField) => void;
  presentation: CardPresentationDraft; onPresentationChange: (draft: CardPresentationDraft) => void; disabled?: boolean;
  expiryError?: string; fullEditing?: boolean; onImageBusy?: (busy: boolean) => void;artworkSources?:Readonly<Record<string,string>> } & ({ mode?: 'create'; editCard?: never } | { mode: 'edit'; editCard: MembershipCard });
function Field({ label, value, error, inputRef, onChange, onBlur, onNext, last, hideLabel, inlineLabel = false, placeholder, onFocus, readOnly = false, onScan }: {
  label: string; value: string; error?: string; inputRef?: Ref<TextInputInstance>; hideLabel?: boolean; inlineLabel?: boolean; placeholder?: string;
  onChange: (text: string) => void; onBlur: () => void; onNext: () => void; last?: boolean; onFocus?: () => void; readOnly?: boolean; onScan?: () => void;
}) {
  const [focused, setFocused] = useState(false);
  return <View style={styles.field}>
    {!hideLabel && <Text style={styles.label}>{label}</Text>}
    <View style={[styles.inputFrame, focused && styles.focused, !!error && styles.inputError]}>
    <View style={styles.inputContent}>
    {inlineLabel && <Text accessible={false} style={styles.inlineLabel}>{label}</Text>}
    <TextInput ref={inputRef} accessibilityLabel={label} accessibilityHint={error || (readOnly ? 'Read-only' : undefined)} editable={!readOnly}
      value={value} placeholder={placeholder} placeholderTextColor={lagoon.text.secondary} onChangeText={onChange}
      onFocus={() => { setFocused(true); onFocus?.(); }} onBlur={() => { setFocused(false); onBlur(); }} onSubmitEditing={onNext}
      autoCapitalize="none" autoCorrect={false} spellCheck={false} autoComplete="off" importantForAutofill="no"
      keyboardType="default" returnKeyType={last ? 'done' : 'next'} submitBehavior={last ? 'blurAndSubmit' : 'submit'}
      underlineColorAndroid="transparent" style={[styles.input, inlineLabel && styles.labeledInput]} />
    </View>
    {onScan && <Pressable accessibilityRole="button" accessibilityLabel="Scan QR Code or barcode" disabled={readOnly}
      accessibilityState={{ disabled: readOnly }} onPress={onScan}
      style={({ pressed }) => [styles.scanButton, { opacity: readOnly ? 0.45 : pressed ? 0.65 : 1 }]}>
      <AddCardIcon name="qr" size={20} />
    </Pressable>}
    </View>
    {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
  </View>;
}

/** Presentation only: approved source proportions; all values remain controlled and memory-only. */
export function AddCardForm({ values, errors, onChange: commitChange, onBlur, presentation, onPresentationChange: commitPresentation,
  mode = 'create', editCard, disabled = false, expiryError, fullEditing = false, onImageBusy,artworkSources }: Props) {
  const editing = mode === 'edit';
  const readOnlyEdit = editing && !fullEditing;
  const locked = readOnlyEdit || disabled;
  // Even a stale callback cannot change size, appearance or code settings in edit mode.
  const onChange = (next: CardFormValues) => {
    if (!disabled) commitChange(readOnlyEdit ? { ...values, name: next.name, memberNumber: next.memberNumber } : next);
  };
  const onPresentationChange = (next: CardPresentationDraft) => {
    if (!disabled) commitPresentation(readOnlyEdit ? { ...presentation, side: next.side, expiryMonth: next.expiryMonth } : next);
  };
  const number = useRef<TextInputInstance>(null);
  const [formWidth, setFormWidth] = useState(320);
  const [sizeOpen, setSizeOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [expirationOpen, setExpirationOpen] = useState(false);
  const expirationSession = useRef<object | null>(null);
  const scanSession = useRef<{ handled: boolean } | null>(null), mounted = useRef(true);
  const latest = useRef({ values, presentation, disabled, commitChange, commitPresentation, onImageBusy });
  latest.current = { values, presentation, disabled, commitChange, commitPresentation, onImageBusy };
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; scanSession.current = null; expirationSession.current = null; };
  }, []);
  function finishScan(session: { handled: boolean }, text?: string) {
    if (!mounted.current || scanSession.current !== session) return;
    scanSession.current = null; setScanOpen(false);
    if (text !== undefined && !latest.current.disabled) latest.current.commitChange(changeMembershipNumber(latest.current.values, text));
    latest.current.onImageBusy?.(false);
  }
  function openScanner() {
    if (disabled || scanSession.current || expirationSession.current) return;
    Keyboard.dismiss(); setSizeOpen(false);
    scanSession.current = { handled: false }; onImageBusy?.(true); setScanOpen(true);
  }
  function scanned(session: { handled: boolean }, text: string) {
    if (scanSession.current !== session || session.handled || !mounted.current) return;
    session.handled = true;
    setScanOpen(false); // Unmount the camera before any replacement confirmation.
    const current = latest.current.values.memberNumber;
    if (current.length && current !== text) {
      Alert.alert('Replace number?', 'Use the scanned value instead of the current number?', [
        { text: 'Cancel', style: 'cancel', isPreferred: true, onPress: () => finishScan(session) },
        { text: 'Replace', onPress: () => finishScan(session, text) },
      ], { cancelable: true, onDismiss: () => finishScan(session) });
    } else finishScan(session, text);
  }
  function openExpiration() {
    if (disabled || scanSession.current || expirationSession.current) return;
    Keyboard.dismiss(); setSizeOpen(false); expirationSession.current = {}; onImageBusy?.(true); setExpirationOpen(true);
  }
  function finishExpiration(session: object, value?: string) {
    if (!mounted.current || expirationSession.current !== session) return;
    expirationSession.current = null; setExpirationOpen(false);
    if (value !== undefined && !latest.current.disabled) latest.current.commitPresentation({ ...latest.current.presentation, expiryMonth: value });
    latest.current.onImageBusy?.(false);
  }
  const currentExpirationSession = expirationSession.current;
  const currentScanSession = scanSession.current;
  const activePreset = cardSizePreset(presentation.sizePresetId);
  const preview = cardPreviewSize(formWidth, activePreset.id);
  function choosePreset(id: CardSizePresetId) {
    if (locked) return;
    const next = selectCardSize(values, presentation, id);
    onChange(next.values);
    onPresentationChange(next.presentation);
    setSizeOpen(false);
  }
  // Bound the row inside GlassButton's intrinsic content wrapper. A percentage
  // width here previously had no definite containing width on native layouts.
  const sizeContentWidth = Math.max(24, (formWidth - 16) / 2 - 18);
  const closeMenus = () => { setSizeOpen(false); };
  const editAppearance = editCard ? { ...editCard.appearance,
    ...(fullEditing && presentation.artwork !== undefined ? { artwork: presentation.artwork } : {}) } : undefined;
  return <View style={styles.form} onLayout={event => setFormWidth(event.nativeEvent.layout.width)}>
    {scanOpen && currentScanSession && <MembershipNumberScanner onClose={() => finishScan(currentScanSession)} onResult={text => scanned(currentScanSession, text)} />}
    {expirationOpen && currentExpirationSession && <ExpirationDatePicker value={presentation.expiryMonth}
      onCancel={() => finishExpiration(currentExpirationSession)} onConfirm={value => finishExpiration(currentExpirationSession, value)} />}
    <View style={styles.previewRow}>
      <CardAppearancePreview width={preview.width} values={values} presentation={presentation} appearance={editAppearance} artworkSources={artworkSources} />
      <View style={styles.tools}>
        <GlassButton disabled={disabled} accessibilityLabel="Switch card front and back" accessibilityState={{ selected: presentation.side === 'back' }} hitSlop={6}
          onPress={() => onPresentationChange({ ...presentation, side: presentation.side === 'front' ? 'back' : 'front' })} style={styles.tool}>
          <AddCardIcon name="flip" />
        </GlassButton>
        <AddCardText maxWidth={layout.toolSize} style={styles.sideLabel}>{presentation.side === 'front' ? 'Front' : 'Back'}</AddCardText>
        <CardArtworkControls presentation={presentation} onChange={onPresentationChange} disabled={locked} onBusy={onImageBusy} simpleReplacement={editing} />
      </View>
    </View>
    <View style={[styles.selectorArea, sizeOpen && styles.menuLayer]}>
      <View style={styles.orientation}>
        {(['landscape', 'portrait'] as const).map(orientation => {
          const selected = values.orientation === orientation;
          return <View key={orientation} style={styles.axis}>
            <GlassButton disabled={locked} accessibilityLabel={orientation === 'landscape' ? 'Landscape' : 'Portrait'}
              accessibilityValue={selected ? { text: activePreset.label } : undefined}
              accessibilityHint={readOnlyEdit ? 'Size and orientation are read-only while editing' : selected ? 'Choose a card size' : 'Switch card orientation'}
              accessibilityState={{ selected, expanded: selected && sizeOpen }} selected={selected}
              style={[styles.sizeButton, !selected && styles.inactiveAxis]}
              onPress={() => {
                if (locked) return;
                Keyboard.dismiss();
                if (selected) setSizeOpen(!sizeOpen);
                else choosePreset(sizePresetForOrientation(activePreset.id, orientation));
              }}>
              <View style={[styles.sizeContent, { width: sizeContentWidth }]}>
                <AddCardText maxWidth={sizeContentWidth - (selected ? layout.iconSize + 4 : 0)} style={styles.sizeText}>{selected ? activePreset.label : orientation === 'landscape' ? 'Landscape' : 'Portrait'}</AddCardText>
                {selected && <AddCardIcon name="chevron" />}
              </View>
            </GlassButton>
          </View>;
        })}
      </View>
      {sizeOpen && <View style={styles.popup}>
        <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled" style={styles.sizeResults}>
          {cardSizePresetsFor(values.orientation).map(preset => <Pressable key={preset.id} accessibilityRole="button"
            accessibilityLabel={preset.label} accessibilityState={{ selected: preset.id === activePreset.id }}
            onPress={() => choosePreset(preset.id)} style={({ pressed }) => [styles.sizeOption,
              (pressed || preset.id === activePreset.id) && styles.sizeOptionSelected]}>
            <AddCardText maxWidth={Math.max(1, formWidth - 48)} style={styles.choiceText}>{preset.label}</AddCardText>
          </Pressable>)}
        </ScrollView>
      </View>}
    </View>
    {errors.orientation && <Text style={styles.error}>{errors.orientation}</Text>}
    {readOnlyEdit && <Text style={styles.hint}>Size and artwork are read-only.</Text>}
    <Field label="Name" hideLabel inlineLabel={editing} placeholder="Name" value={values.name} error={errors.name}
      readOnly={disabled}
      onFocus={closeMenus} onChange={name => onChange({ ...values, name })} onBlur={() => onBlur?.('name')} onNext={() => number.current?.focus()} />
    <Field label="Number" hideLabel inlineLabel={editing} placeholder="Number" value={values.memberNumber} error={errors.memberNumber} inputRef={number} onScan={openScanner}
      readOnly={disabled}
      onFocus={closeMenus} onChange={text => onChange(changeMembershipNumber(values, text))} onBlur={() => onBlur?.('memberNumber')} onNext={openExpiration} />
    <Pressable accessibilityRole="button" accessibilityLabel="Expiration date" accessibilityValue={{ text: presentation.expiryMonth || 'No expiry' }}
      accessibilityHint="Opens Day, Month and Year wheels" accessibilityState={{ disabled }} disabled={disabled} onPress={openExpiration}
      style={({ pressed }) => [styles.expirationField, { opacity: disabled ? 0.45 : pressed ? 0.7 : 1 }]}>
      <Text style={[styles.expirationText, !presentation.expiryMonth && styles.emptyExpiration]}>{`EXP ${presentation.expiryMonth || 'YYYY-MM-DD'}`}</Text>
      <AddCardIcon name="chevron" />
    </Pressable>
    {!!(expiryError || expiryMonthError(presentation.expiryMonth)) && <Text accessibilityRole="alert" style={styles.error}>{expiryError || expiryMonthError(presentation.expiryMonth)}</Text>}
  </View>;
}
const styles = StyleSheet.create({
  form: { gap: layout.gap },
  previewRow: { flexDirection: 'row', flexWrap: 'wrap', gap: layout.previewGap, alignItems: 'center' },
  // Padding and cancelling margins let hitSlop fit inside the parent bounds
  // without moving or enlarging the approved 36-unit visual tool rail.
  tools: { gap: layout.gap, alignItems: 'center', flexShrink: 0, padding: 6, margin: -6 },
  tool: { width: layout.toolSize, height: layout.toolSize, minWidth: layout.toolSize, minHeight: layout.toolSize, borderRadius: layout.buttonRadius },
  unavailable: { opacity: 0.45 },
  sideLabel: { marginTop: -8, fontSize: 10, lineHeight: 15, color: lagoon.text.secondary, fontFamily: lagoonFonts.latin },
  selectorArea: { position: 'relative' }, menuLayer: { zIndex: 10 },
  orientation: { flexDirection: 'row', gap: 8, padding: 4, borderRadius: layout.fieldRadius, backgroundColor: alpha(lagoon.action.soft, 0.5) },
  axis: { flex: 1, minWidth: 0 },
  sizeButton: { minWidth: 0, minHeight: layout.selectorHeight, borderRadius: layout.buttonRadius, paddingHorizontal: 8, paddingVertical: 4 },
  inactiveAxis: { minHeight: 32, backgroundColor: 'transparent', borderColor: 'transparent', boxShadow: 'none' },
  sizeContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  sizeText: { fontFamily: lagoonFonts.latin, color: lagoon.text.primary, fontSize: 14, lineHeight: 20, flexShrink: 1 },
  choiceText: { fontFamily: lagoonFonts.latin, color: lagoon.text.primary, fontSize: 14, lineHeight: 20, fontWeight: '700' },
  popup: { position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: lagoon.surface.base,
    padding: 12, gap: 8, borderRadius: layout.fieldRadius, borderWidth: 1, borderColor: lagoon.rim.inner },
  sizeResults: { maxHeight: 240 },
  sizeOption: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 12, paddingVertical: 10,
    borderRadius: layout.buttonRadius, borderWidth: 1, borderColor: 'transparent' },
  sizeOptionSelected: { backgroundColor: lagoon.action.soft, borderColor: lagoon.action.primary },
  field: { gap: 4 },
  label: { ...ciTypography.supporting, lineHeight: 16, fontWeight: '600', color: ciColors.text.secondary },
  hint: { ...ciTypography.supporting, color: ciColors.text.supporting },
  inputFrame: { flexDirection: 'row', alignItems: 'center', borderRadius: layout.fieldRadius, borderWidth: 1, borderColor: alpha(lagoon.rim.boundary, 0.5), backgroundColor: lagoon.surface.base },
  inputContent: { flex: 1, minWidth: 0 },
  expirationField: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 48, paddingHorizontal: 12, paddingVertical: 10, borderRadius: layout.fieldRadius, borderWidth: 1, borderColor: alpha(lagoon.rim.boundary, 0.5), backgroundColor: lagoon.surface.base },
  expirationText: { ...ciTypography.body, flex: 1, color: ciColors.text.primary },
  emptyExpiration: { color: lagoon.text.secondary },
  scanButton: { width: 48, minHeight: 48, flexShrink: 0, alignItems: 'center', justifyContent: 'center' },
  inlineLabel: { paddingHorizontal: 12, paddingTop: 6, fontSize: 10, lineHeight: 15, fontFamily: lagoonFonts.latin, color: lagoon.text.secondary },
  labeledInput: { paddingTop: 2, minHeight: 36 },
  input: { minHeight: layout.inputHeight, borderRadius: layout.fieldRadius,
    paddingHorizontal: 12, paddingVertical: 11, color: lagoon.text.primary, backgroundColor: lagoon.surface.base,
    fontFamily: lagoonFonts.latin, fontSize: 14, lineHeight: 20, includeFontPadding: false,
    boxShadow: `0 5px 14px -10px ${alpha(lagoon.shadow.tint, 0.24)}` },
  focused: { borderColor: lagoon.action.primary },
  inputError: { borderColor: ciColors.status.error },
  error: { ...ciTypography.supporting, fontWeight: '400', color: ciColors.status.error },

});
