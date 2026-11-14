import { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, PanResponder, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { DisplayFormat, MembershipCard } from '../../types/membership-card';
import { payloadCapabilities } from '../../lib/wallet-validation';
import { cardDetailControls } from '../../lib/card-detail-controls';
import { cardDetailGeometry } from '../../lib/card-detail-layout';
import { createCardDetailSwipe } from '../../lib/card-detail-interaction';
import { emptyCardForm } from '../../lib/card-form';
import { emptyCardPresentation } from '../../lib/card-presentation';
import { lagoon, lagoonFonts } from '../../constants/lagoon-theme';
import { ciColors, ciTypography } from '../../constants/ci-theme';
import { sheetVisual } from '../../constants/sheet-visual';
import { CardAppearancePreview } from './CardAppearancePreview';
import { AddCardIcon } from './AddCardIcon';
import { CardCodeView } from './CardCodeView';
import { EditMembershipCardEditor } from './EditMembershipCardEditor';
import { ShareCardSheet } from './ShareCardSheet';
import { FullScreenCardView } from './FullScreenCardView';
import { CardHistorySheet } from './CardHistorySheet';
import type { createWalletFeatureCommands, MembershipEditSession } from '../../lib/wallet-feature-commands';

// Approved Option B: only interface chrome adopts Pearl Gray; card/code rendering stays independent.

/** Approved reference layout; membership actions use the existing guarded owner commands. */
export function MembershipCardDetail({ card, fromCreate, onClose, editCommands, onHome = onClose }: {
  card: Readonly<MembershipCard>; fromCreate: boolean; onClose: () => void;
  editCommands?: ReturnType<typeof createWalletFeatureCommands>; onHome?: () => void;
}) {
  const [side, setSide] = useState<'front' | 'back'>('front');
  const [format, setFormat] = useState<DisplayFormat>('qr');
  const [fullOpen, setFullOpen] = useState(false);
  const fullActive = useRef(false);
  const [sheetWidth, setSheetWidth] = useState(0), [slotWidth, setSlotWidth] = useState(0);
  const [notice, setNotice] = useState('');
  const [editing, setEditing] = useState<MembershipEditSession | null>(null);
  const { width: windowWidth, height: windowHeight, fontScale } = useWindowDimensions();
  const [codeWidth, setCodeWidth] = useState(0);
  const labelKey = `${format}-${codeWidth}-${fontScale ?? 1}`;
  const [labelMeasurement, setLabelMeasurement] = useState({ key: '', height: 0 });
  const [shareOpen, setShareOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const controls = cardDetailControls(format, Math.max(0, codeWidth - 24), fontScale ?? 1,
    labelMeasurement.key === labelKey ? labelMeasurement.height : 0);
  const code128 = !!card.memberNumber && payloadCapabilities(card.memberNumber).code128.eligible;
  const geometry = useMemo(() => sheetWidth > 32 && slotWidth > 0 ? cardDetailGeometry(card, sheetWidth, slotWidth) : null,
    [card, sheetWidth, slotWidth]);
  const swipe = useMemo(() => createCardDetailSwipe(next => {
    if (next === 'code128' && !code128) {
      setNotice('Code 128 cannot represent this code value. QR Code remains selected. The original value is unchanged.'); return;
    }
    setFormat(next); setNotice('');
  }), [code128]);
  useEffect(() => () => swipe.cancel(), [swipe]);
  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: (event, gesture) => {
      swipe.begin(event.nativeEvent.pageX, windowWidth, gesture.numberActiveTouches); return false;
    },
    onMoveShouldSetPanResponder: (_, gesture) => swipe.shouldClaim(gesture.dx, gesture.dy, gesture.numberActiveTouches),
    onPanResponderMove: (_, gesture) => swipe.move(gesture.dx, gesture.dy, gesture.numberActiveTouches),
    onPanResponderRelease: (_, gesture) => swipe.release(gesture.dx, gesture.dy, gesture.numberActiveTouches),
    onPanResponderTerminate: swipe.cancel,
    onPanResponderTerminationRequest: () => true,
  }), [swipe, windowWidth]);
  const nextFormat: DisplayFormat = format === 'qr' ? 'code128' : 'qr';
  const cannotToggle = nextFormat === 'code128' && !code128;
  const values = { ...emptyCardForm(), name: card.name, memberNumber: card.memberNumber ?? '', payload: card.memberNumber ?? '',
    orientation: card.orientation, preferredDisplayFormat: 'qr' as const };
  const presentation = { ...emptyCardPresentation(), side, sizePresetId: card.sizePresetId
    ?? (card.orientation === 'portrait' ? 'card-portrait' as const : 'card-landscape' as const) };
  if (fullOpen) return <FullScreenCardView card={card} side={side} onSide={setSide} onHome={onHome}
    onBack={() => { fullActive.current = false; setFullOpen(false); }} />;
  if (fromCreate && editing && editCommands) return <EditMembershipCardEditor commands={editCommands} session={editing} card={card}
    onClose={requiresReview => { setEditing(null); if (requiresReview) onClose(); }}
    onDeleted={() => { setEditing(null); onClose(); }}
    onSaved={() => { setEditing(null); setFormat('qr'); setNotice(''); }} />;
  if (!fromCreate && shareOpen) return <ShareCardSheet card={card} onClose={() => setShareOpen(false)} />;
  if (historyOpen) return <CardHistorySheet card={card} fromCreate={fromCreate} onClose={() => setHistoryOpen(false)} />;
  return <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
    <SafeAreaView style={styles.backdrop}>
      <Pressable accessibilityRole="button" accessibilityLabel="Close card preview" onPress={onClose} style={StyleSheet.absoluteFill} />
      <View accessibilityViewIsModal style={styles.sheet} onLayout={event => setSheetWidth(event.nativeEvent.layout.width)} testID="card-detail-sheet">
        <View style={styles.header}>
          <View style={styles.identity}>
            <Text accessibilityRole="header" style={styles.title}>{card.name}</Text>
            {fromCreate ? editCommands && <Pressable accessibilityRole="button" accessibilityLabel="Edit Card" style={styles.hit}
              onPress={() => { const result = editCommands.openEdit(card.id); if (result.ok) { setNotice(''); setEditing(result.session); } else setNotice(result.message); }}>
              <AddCardIcon name="edit" />
            </Pressable> : <Pressable accessibilityRole="button" accessibilityLabel="Share card" onPress={() => setShareOpen(true)} style={styles.hit}>
              <AddCardIcon name="share" />
            </Pressable>}
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} style={styles.hit}>
            {({ pressed }) => <View style={[styles.surface, styles.round, pressed && styles.pressed]}><AddCardIcon name="close" /></View>}
          </Pressable>
        </View>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View testID="card-detail-code-panel" onLayout={event => setCodeWidth(event.nativeEvent.layout.width)} style={styles.code}>
            {/* Only the code region observes swipes; the toggle is a separate sibling hit target. */}
            <View {...responder.panHandlers} testID="card-detail-swipe-area" style={{ paddingTop: controls.codeTop, paddingBottom: controls.codeBottom }}>
              <CardCodeView card={card} format={format} maxHeight={Math.max(176, windowHeight * 0.34)} />
            </View>
            <View pointerEvents="box-none" testID="card-detail-code-tools" style={[styles.codeTools, { bottom: 4, height: controls.headerHeight }]}>
              <Text accessibilityLiveRegion="polite" style={[styles.codeLabel, { maxWidth: controls.labelWidth }]}
                onTextLayout={event => {
                  const height = event.nativeEvent.lines.reduce((sum, line) => sum + line.height, 0);
                  setLabelMeasurement(previous => previous.key === labelKey && previous.height === height ? previous : { key: labelKey, height });
                }}>{format === 'qr' ? 'QR Code' : 'Code 128'}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel={`Show ${nextFormat === 'qr' ? 'QR Code' : 'Code 128'}`}
                disabled={cannotToggle} accessibilityState={{ disabled: cannotToggle }}
                onPress={() => { if (cannotToggle) return; swipe.cancel(); setFormat(nextFormat); setNotice(''); }} style={styles.hit}>
                {({ pressed }) => <View style={[styles.surface, pressed && styles.pressed, cannotToggle && styles.inactive]}>
                  <AddCardIcon name={nextFormat === 'qr' ? 'qr' : 'barcode'} />
                </View>}
              </Pressable>
            </View>
          </View>
          {!code128 && <Text accessibilityRole="text" style={styles.muted}>Code 128 cannot represent this code value. The original value is unchanged.</Text>}
          {!!notice && <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.muted}>{notice}</Text>}
          <View style={styles.previewRow}>
            <Text style={styles.expiry}>{card.expiryMonth ? `Expires\n${card.expiryMonth}` : 'EXP: No\nExpiry'}</Text>
            <View style={[styles.cardSlot, geometry && { height: geometry.footprintHeight }]} testID="card-detail-slot"
              onLayout={event => setSlotWidth(event.nativeEvent.layout.width)}>
              {geometry && <View testID="card-detail-footprint" accessible
                accessibilityLabel={`${card.name}. ${side}. ${geometry.widthBlocks} by ${geometry.heightBlocks} blocks.`}
                style={{ width: geometry.footprintWidth, height: geometry.footprintHeight }}>
                <View style={{ position: 'absolute', left: geometry.inset, top: geometry.inset }}>
                  <CardAppearancePreview values={values} presentation={presentation} appearance={card.appearance}
                    width={geometry.paintWidth} height={geometry.paintHeight} />
                </View>
              </View>}
            </View>
            <View style={styles.tools}>
              <Text style={styles.side}>{side === 'front' ? 'Front' : 'Back'}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Switch card front and back"
                accessibilityState={{ selected: side === 'back' }}
                onPress={() => setSide(side === 'front' ? 'back' : 'front')} style={styles.hit}>
                {({ pressed }) => <View style={[styles.surface, pressed && styles.pressed]}><AddCardIcon name="flip" /></View>}
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="View card full screen" style={styles.hit}
                onPress={() => { if (fullActive.current) return; fullActive.current = true; setFullOpen(true); }}>
                <AddCardIcon name="fullscreen" size={20} />
              </Pressable>
            </View>
          </View>
          <Text selectable style={styles.number}>{card.memberNumber}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="View Card History and Receipts" onPress={() => setHistoryOpen(true)} style={styles.history}>
            <AddCardIcon name="history" /><View style={styles.historyText}>
              <Text style={styles.text}>View Card History &amp; Receipts</Text>
            </View>
          </Pressable>
        </ScrollView>
      </View>
    </SafeAreaView>
  </Modal>;
}
const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: sheetVisual.scrim },
  sheet: { maxHeight: '92%', width: '100%', maxWidth: 600, alignSelf: 'center', flexShrink: 1,
    backgroundColor: sheetVisual.surface, boxShadow: sheetVisual.shadow, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden', paddingTop: 20 },
  header: { flexDirection: 'row', gap: 8, alignItems: 'center', paddingHorizontal: 20, marginBottom: 16 },
  identity: { flex: 1, minWidth: 0, flexDirection: 'row', gap: 4, alignItems: 'center' },
  title: { flexShrink: 1, ...ciTypography.title, color: ciColors.text.primary },
  scroll: { flexShrink: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 20, gap: 8 },
  hit: { width: 48, height: 48, minWidth: 48, minHeight: 48, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  surface: { width: 36, height: 36, borderRadius: 10, backgroundColor: sheetVisual.elevated, justifyContent: 'center', alignItems: 'center',
    boxShadow: sheetVisual.controlShadow, borderTopWidth: 1, borderTopColor: lagoon.rim.outer },
  round: { borderRadius: 18 }, pressed: { backgroundColor: lagoon.action.soft }, inactive: { opacity: 0.5 },
  code: { backgroundColor: '#ffffff', borderRadius: 20, minHeight: 48, paddingHorizontal: 4,
    boxShadow: '0 8px 14px #11182715' },
  codeTools: { position: 'absolute', left: 12, right: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  codeLabel: { flex: 1, color: '#000000', fontFamily: lagoonFonts.latin, fontSize: 11, lineHeight: 17, includeFontPadding: false },
  previewRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  expiry: { width: 64, fontFamily: lagoonFonts.latin, fontSize: 11, lineHeight: 16, fontWeight: '800', color: ciColors.text.secondary },
  cardSlot: { flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'center' },
  tools: { width: 48, gap: 4, alignItems: 'center' },
  side: { fontFamily: lagoonFonts.latin, color: ciColors.text.secondary, fontSize: 11, lineHeight: 17 },
  muted: { color: ciColors.text.secondary, fontFamily: lagoonFonts.latin, fontSize: 11, lineHeight: 17 },
  number: { color: ciColors.text.primary, fontFamily: 'monospace', fontSize: 22, lineHeight: 32, fontWeight: '700', letterSpacing: 2, textAlign: 'center' },
  history: { minHeight: 48, minWidth: 48, padding: 8, borderRadius: 10, flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center',
    backgroundColor: sheetVisual.elevated, boxShadow: sheetVisual.controlShadow },
  historyText: { flexShrink: 1, alignItems: 'center' },
  text: { fontFamily: lagoonFonts.latin, color: ciColors.text.primary, fontSize: 14, lineHeight: 20, textAlign: 'center' },
});
