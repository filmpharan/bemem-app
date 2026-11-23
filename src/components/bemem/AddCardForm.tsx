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
import { CardSheetModeSelector } from './CardSheetModeSelector';
import { ExpirationDatePicker } from './ExpirationDatePicker';
import { MembershipNumberScanner } from './MembershipNumberScanner';
import { CardSizeCarousel } from './CardSizeCarousel';
import { photoFallbackArtwork } from '../../lib/default-card-artwork';
import { addCardLayout as layout, cardPreviewSize } from './add-card-layout';

type Props = { values: CardFormValues; errors: CardFormErrors; onChange: (values: CardFormValues) => void; onBlur?: (field: CardFormField) => void;
  presentation: CardPresentationDraft; onPresentationChange: (draft: CardPresentationDraft) => void; disabled?: boolean;
  expiryError?: string; fullEditing?: boolean; onImageBusy?: (busy: boolean) => void;fallbackArtwork?:CardPresentationDraft['artwork'];artworkSources?:Readonly<Record<string,string>> } & ({ mode?: 'create'; editCard?: never } | { mode: 'edit'; editCard: MembershipCard });
function Field({ label, value, error, inputRef, onChange, onBlur, onNext, last, hideLabel, placeholder, onFocus, readOnly = false, onScan }: {
  label: string; value: string; error?: string; inputRef?: Ref<TextInputInstance>; hideLabel?: boolean; placeholder?: string;
  onChange: (text: string) => void; onBlur: () => void; onNext: () => void; last?: boolean; onFocus?: () => void; readOnly?: boolean; onScan?: () => void;
}) {
  const [focused, setFocused] = useState(false);
  return <View style={styles.field}>
    {!hideLabel && <Text style={styles.label}>{label}</Text>}
    <View style={[styles.inputFrame, focused && styles.focused, !!error && styles.inputError]}>
    <View style={styles.inputContent}>
    <TextInput ref={inputRef} accessibilityLabel={label} accessibilityHint={error || (readOnly ? 'Read-only' : undefined)} editable={!readOnly}
      value={value} placeholder={placeholder} placeholderTextColor={lagoon.text.secondary} onChangeText={onChange}
      onFocus={() => { setFocused(true); onFocus?.(); }} onBlur={() => { setFocused(false); onBlur(); }} onSubmitEditing={onNext}
      autoCapitalize="none" autoCorrect={false} spellCheck={false} autoComplete="off" importantForAutofill="no"
      keyboardType="default" returnKeyType={last ? 'done' : 'next'} submitBehavior={last ? 'blurAndSubmit' : 'submit'}
      underlineColorAndroid="transparent" style={styles.input} />
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
  mode = 'create', editCard, disabled = false, expiryError, fullEditing = false, onImageBusy,artworkSources,fallbackArtwork }: Props) {
  const editing = mode === 'edit';
  const readOnlyEdit = editing && !fullEditing;
  // Even a stale callback cannot change size, appearance or code settings in edit mode.
  const onChange = (next: CardFormValues) => {
    if (!disabled) commitChange(readOnlyEdit ? { ...values, name: next.name, memberNumber: next.memberNumber } : next);
  };
  const onPresentationChange = (next: CardPresentationDraft) => {
    if (!disabled) commitPresentation(readOnlyEdit ? { ...presentation, side: next.side, expiryMonth: next.expiryMonth } : next);
  };
  const number = useRef<TextInputInstance>(null),nameInput=useRef<TextInputInstance>(null);
  const [formWidth, setFormWidth] = useState(320);
  const [sizeOpen, setSizeOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [expirationOpen, setExpirationOpen] = useState(false);
  const [photoBusy,setPhotoBusy]=useState(false);
  const locked = readOnlyEdit || disabled || photoBusy;
  const [menuOrientation,setMenuOrientation]=useState(values.orientation);
  const [photoFallbacks]=useState(()=>fallbackArtwork??photoFallbackArtwork(presentation.artwork,values.colorId));
  const expirationSession = useRef<object | null>(null);
  const scanSession = useRef<{ handled: boolean } | null>(null), mounted = useRef(true);
  const latest = useRef({ values, presentation, disabled, locked, commitChange, commitPresentation, onImageBusy });
  latest.current = { values, presentation, disabled, locked, commitChange, commitPresentation, onImageBusy };
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
  function choosePreset(id: CardSizePresetId) {
    if (latest.current.locked) return;
    const next = selectCardSize(latest.current.values, latest.current.presentation, id);
    latest.current.commitChange(next.values);
    latest.current.commitPresentation(next.presentation);
    setSizeOpen(false);
  }
  function chooseCarouselPreset(id:CardSizePresetId) {
    if(values.orientation!==latest.current.values.orientation||cardSizePreset(id).orientation!==latest.current.values.orientation)return;
    choosePreset(id);
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
    <View testID="add-card-preview-tools">
      <CardArtworkControls presentation={presentation} onChange={onPresentationChange} disabled={locked} fallbackArtwork={photoFallbacks}
        previewSize={cardPreviewSize(formWidth,activePreset.id)}
        onBusy={busy=>{setPhotoBusy(busy);onImageBusy?.(busy);}} simpleReplacement={editing}
        renderTrigger={photoAction=><CardSizeCarousel width={formWidth} selectedId={activePreset.id} disabled={locked} onSelect={chooseCarouselPreset}
          photoAction={photoAction} renderPreview={(id,width,height,renderArtwork)=><CardAppearancePreview displayPreview renderArtwork={renderArtwork} width={width} height={height} showText={height>=100} values={values}
            presentation={{...presentation,sizePresetId:id}} appearance={editAppearance} artworkSources={artworkSources}/>} />}/>
    </View>
    <View style={[styles.selectorArea, sizeOpen && styles.menuLayer]}>
      <View style={styles.orientation}>
        {(['landscape', 'portrait'] as const).map(orientation => {
          const selected = values.orientation === orientation;
          return <View key={orientation} style={styles.axis}>
            <GlassButton disabled={locked} accessibilityLabel={orientation === 'landscape' ? 'Landscape' : 'Portrait'}
              accessibilityValue={selected ? { text: activePreset.label } : undefined}
              accessibilityHint={readOnlyEdit ? 'Size and orientation are read-only while editing' : selected ? 'Choose a card size' : 'Open orientation and size choices'}
              accessibilityState={{ selected, expanded: sizeOpen && menuOrientation===orientation }} selected={selected}
              style={[styles.sizeButton, !selected && styles.inactiveAxis]}
              onPress={() => {
                if (locked) return;
                Keyboard.dismiss();
                setMenuOrientation(orientation);setSizeOpen(!(sizeOpen&&menuOrientation===orientation));
              }}>
              <View style={[styles.sizeContent, { width: sizeContentWidth }]}>
                <AddCardText maxWidth={sizeContentWidth - layout.iconSize - 4} style={styles.sizeText}>{selected ? activePreset.label : orientation === 'landscape' ? 'Landscape' : 'Portrait'}</AddCardText>
                <AddCardIcon name="chevron" />
              </View>
            </GlassButton>
          </View>;
        })}
      </View>
      {sizeOpen && <View style={styles.popup}>
        <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled" style={styles.sizeResults}>
          {menuOrientation!==values.orientation&&<Pressable accessibilityRole="button" accessibilityLabel={`Use ${menuOrientation==='portrait'?'Portrait':'Landscape'}`}
            onPress={()=>choosePreset(sizePresetForOrientation(activePreset.id,menuOrientation))} style={styles.sizeOption}>
            <AddCardText maxWidth={Math.max(1,formWidth-48)} style={styles.choiceText}>{menuOrientation==='portrait'?'Portrait':'Landscape'}</AddCardText>
          </Pressable>}
          {cardSizePresetsFor(menuOrientation).map(preset => <Pressable key={preset.id} accessibilityRole="button"
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
    <Field inputRef={nameInput} label="Name" hideLabel placeholder="Name" value={values.name} error={errors.name}
      readOnly={disabled}
      onFocus={closeMenus} onChange={name => onChange({ ...values, name })} onBlur={() => onBlur?.('name')} onNext={() => number.current?.focus()} />
    <Field label="Number" hideLabel placeholder="Number" value={values.memberNumber} error={errors.memberNumber} inputRef={number} onScan={openScanner}
      readOnly={disabled}
      onFocus={closeMenus} onChange={text => onChange(changeMembershipNumber(values, text))} onBlur={() => onBlur?.('memberNumber')} onNext={openExpiration} />
    <CardSheetModeSelector width={formWidth} mode={presentation.sheetDisplayMode??'cardcode'} expiration={presentation.expiryMonth}
      disabled={disabled||photoBusy||scanOpen||expirationOpen} onExpiration={openExpiration}
      onChange={sheetDisplayMode=>onPresentationChange({...presentation,sheetDisplayMode})}/>
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
  scanButton: { width: 48, minHeight: 48, flexShrink: 0, alignItems: 'center', justifyContent: 'center' },
  input: { minHeight: Math.max(48,layout.inputHeight), borderRadius: layout.fieldRadius,
    paddingHorizontal: 12, paddingVertical: 11, color: lagoon.text.primary, backgroundColor: lagoon.surface.base,
    fontFamily: lagoonFonts.latin, fontSize: 14, lineHeight: 20, includeFontPadding: false,
    boxShadow: `0 5px 14px -10px ${alpha(lagoon.shadow.tint, 0.24)}` },
  focused: { borderColor: lagoon.action.primary },
  inputError: { borderColor: ciColors.status.error },
  error: { ...ciTypography.supporting, fontWeight: '400', color: ciColors.status.error },

});
