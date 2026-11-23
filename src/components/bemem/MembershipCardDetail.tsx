import type { ReactElement, ReactNode } from 'react';
import type { ViewProps } from 'react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Keyboard, Modal, PanResponder, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { DisplayFormat, MembershipCard } from '../../types/membership-card';
import { payloadCapabilities } from '../../lib/wallet-validation';
import { cardDetailControls } from '../../lib/card-detail-controls';
import { cardDetailGeometry } from '../../lib/card-detail-layout';
import { createCardDetailSwipe } from '../../lib/card-detail-interaction';
import { emptyCardForm } from '../../lib/card-form';
import { emptyCardPresentation } from '../../lib/card-presentation';
import { lagoon, lagoonFonts } from '../../constants/lagoon-theme';
import { ciColors, ciTypography, ciButtons } from '../../constants/ci-theme';
import { sheetVisual } from '../../constants/sheet-visual';
import { CardAppearancePreview } from './CardAppearancePreview';
import { AddCardIcon } from './AddCardIcon';
import { CardFrontBackArtwork } from './CardFrontBackArtwork';
import { GlassButton } from './GlassButton';
import { ConfirmationDialog,type ConfirmationRequest } from './ConfirmationDialog';
import { CardCodeView } from './CardCodeView';
import { EditMembershipCardEditor } from './EditMembershipCardEditor';
import { ShareCardSheet } from './ShareCardSheet';
import { FullScreenCardView } from './FullScreenCardView';
import { KeepsSheet } from './KeepsSheet';
import type { createWalletFeatureCommands, MembershipEditSession } from '../../lib/wallet-feature-commands';

export type CardDetailMotionPresentation={
  closing:boolean;isClosing:()=>boolean;close:()=>void;
  renderSheet:(element:ReactElement<ViewProps>)=>ReactNode;backdrop:ReactNode;
};

// Approved Option B: only interface chrome adopts Pearl Gray; card/code rendering stays independent.

/** Approved reference layout; membership actions use the existing guarded owner commands. */
export function MembershipCardDetail({ card, fromCreate, onClose, editCommands, onHome = onClose, presentation:sheetPresentation = 'modal', onNavigationBlockedChange, onBackHandler, motion }: {
  motion?:CardDetailMotionPresentation; card: Readonly<MembershipCard>; fromCreate: boolean; onClose: () => void;
  editCommands?: ReturnType<typeof createWalletFeatureCommands>; onHome?: () => void;
  presentation?: 'modal'|'inline'; onNavigationBlockedChange?: (blocked:boolean)=>void; onBackHandler?:(handler:(()=>void)|null)=>void;
}) {
  const [busy,setBusy]=useState(false),[requiresReview,setRequiresReview]=useState(false);
  const [confirmationRequest,setConfirmationRequest]=useState<ConfirmationRequest|null>(null);
  const mounted=useRef(true),saving=useRef(false),confirmation=useRef(false),deleteToken=useRef<string|null>(null),arrangeEditToken=useRef<string|null>(null);
  const [actionsWidth,setActionsWidth]=useState(320);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;if(deleteToken.current)editCommands?.cancelDelete(deleteToken.current);deleteToken.current=null;if(arrangeEditToken.current)editCommands?.cancelArrangeEdit(arrangeEditToken.current);arrangeEditToken.current=null;confirmation.current=false;};},[editCommands,card.id]);
  function dismiss(){if(!mounted.current||saving.current)return;if(confirmationRequest){confirmationRequest.onDismiss();return;}if(motion)motion.close();else onClose();}
  useEffect(()=>{onBackHandler?.(motion||busy||confirmationRequest?dismiss:null);return()=>onBackHandler?.(null);},[busy,confirmationRequest,onBackHandler,motion]);
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
  const [keepsOpen,setKeepsOpen]=useState<'list'|'add'|null>(null);
  const controls = cardDetailControls(format, Math.max(0, codeWidth - 24), fontScale ?? 1,
    labelMeasurement.key === labelKey ? labelMeasurement.height : 0);
  const frontback = card.sheetDisplayMode === 'frontback';
  const homeFrontBack=frontback&&!fromCreate;
  const [expiryMeasurements,setExpiryMeasurements]=useState({row:0,text:0});
  // Entry context controls actions, never artwork geometry. Home and Arrange share the measured adaptive layout.
  const [areaHeight,setAreaHeight]=useState(0),[headerHeight,setHeaderHeight]=useState(0),[detailsHeight,setDetailsHeight]=useState(0);
  // Budget comes from the safe-area content host, not from the preview's intrinsic height.
  // The extra touch-target height scrolls with metadata; it must not shrink approved artwork.
  const artworkDetailsHeight=detailsHeight-(homeFrontBack&&expiryMeasurements.row>0&&expiryMeasurements.text>0?Math.max(0,expiryMeasurements.row-expiryMeasurements.text):0);
  const previewHeight=areaHeight>0&&headerHeight>0&&detailsHeight>0?Math.max(1,areaHeight*.92-headerHeight-styles.sheet.paddingTop-styles.header.marginBottom-styles.content.paddingBottom-styles.content.gap-artworkDetailsHeight):0;
  const code128 = !frontback && !!card.memberNumber && payloadCapabilities(card.memberNumber).code128.eligible;
  const geometry = useMemo(() => !frontback && sheetWidth > 32 && slotWidth > 0 ? cardDetailGeometry(card, sheetWidth, slotWidth) : null,
    [card, frontback, sheetWidth, slotWidth]);
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
  useEffect(()=>{onNavigationBlockedChange?.(!!editing||shareOpen||!!keepsOpen||fullOpen||busy||!!confirmationRequest||!!motion?.closing);return()=>onNavigationBlockedChange?.(false);},[!!editing,shareOpen,!!keepsOpen,fullOpen,busy,confirmationRequest,onNavigationBlockedChange,motion?.closing]);
  const nextFormat: DisplayFormat = format === 'qr' ? 'code128' : 'qr';
  const cannotToggle = nextFormat === 'code128' && !code128;
  const values = { ...emptyCardForm(), name: card.name, memberNumber: card.memberNumber ?? '', payload: card.memberNumber ?? '',
    orientation: card.orientation, preferredDisplayFormat: 'qr' as const };
  const presentation = { ...emptyCardPresentation(), side, sizePresetId: card.sizePresetId
    ?? (card.orientation === 'portrait' ? 'card-portrait' as const : 'card-landscape' as const) };
  if (fullOpen) return <FullScreenCardView displayPreview={homeFrontBack} card={card} side={side} onSide={setSide} onHome={onHome}
    onBack={() => { fullActive.current = false; setFullOpen(false); }} />;
  if (fromCreate && editing && editCommands) return <EditMembershipCardEditor commands={editCommands} session={editing} card={card}
    onClose={requiresReview => { setEditing(null); if (requiresReview) onClose(); }}
    onSaved={() => { setEditing(null); setFormat('qr'); setNotice(''); }} />;
  if (!fromCreate && shareOpen) return <ShareCardSheet card={card} onClose={() => setShareOpen(false)} />;
  if (!fromCreate&&keepsOpen) return <KeepsSheet card={card} initialAdd={keepsOpen==='add'} onClose={()=>setKeepsOpen(null)}/>;
  function requestEdit(){
    if(!mounted.current||motion?.isClosing()||!editCommands||saving.current||confirmation.current||requiresReview)return;
    const result=editCommands.openEdit(card.id);
    if(result.ok){setNotice('');setEditing(result.session);return;}
    if(!('arrangeToken' in result)||!result.arrangeToken){setNotice(result.message);return;}
    const token=result.arrangeToken;arrangeEditToken.current=token;confirmation.current=true;Keyboard.dismiss();
    const cancel=()=>{
      if(!mounted.current||saving.current||arrangeEditToken.current!==token)return;
      editCommands.cancelArrangeEdit(token);arrangeEditToken.current=null;confirmation.current=false;setConfirmationRequest(null);
    };
    const proceed=async(action:'save'|'discard')=>{
      if(!mounted.current||saving.current||arrangeEditToken.current!==token)return;
      saving.current=true;setBusy(true);setNotice('');
      try{
        const opened=await editCommands.resolveArrangeEdit(token,action);
        if(!mounted.current){if(opened.ok)editCommands.cancelEdit(opened.session.token);return;}
        if(opened.ok)setEditing(opened.session);else{setNotice(opened.message);setRequiresReview(opened.requiresReinspection);}
      }catch{if(mounted.current){setNotice('Arrange changes were not confirmed. Reinspect the wallet before continuing.');setRequiresReview(true);}}
      finally{
        editCommands.cancelArrangeEdit(token);arrangeEditToken.current=null;saving.current=false;confirmation.current=false;
        if(mounted.current){setBusy(false);setConfirmationRequest(null);}
      }
    };
    setConfirmationRequest({id:token,title:'Edit this card?',description:'Save or discard your Arrange changes before editing this saved card.',onDismiss:cancel,actions:[
      {label:'Save and Edit',role:'primary',onPress:()=>proceed('save')},
      {label:'Discard and Edit',role:'destructive',onPress:()=>proceed('discard')},
      {label:'Keep Arranging',role:'neutral',onPress:cancel},
    ]});
  }
  function requestDelete() {
    if(motion?.isClosing())return;
    if (!mounted.current || !fromCreate || !editCommands || card.kind !== 'membership' || saving.current || confirmation.current || requiresReview) return;
    const result = editCommands.openDelete(card.id);
    if (!result.ok) { setNotice(result.message); return; }
    Keyboard.dismiss();
    const { token, name } = result.session;
    deleteToken.current = token; confirmation.current = true;
    const cancel = () => {
      if (!mounted.current || saving.current || deleteToken.current !== token) return;
      editCommands.cancelDelete(token); deleteToken.current = null; confirmation.current = false;setConfirmationRequest(null);
    };
    const showConfirmation = (history: { records: number; receipts: number }) => {
    const includesHistory = history.records > 0 || history.receipts > 0;
    setConfirmationRequest({id:token,title:'Delete this card?',description:`"${name}"\n${includesHistory
      ? `${history.records} history records and ${history.receipts} receipt attachments will be permanently removed with this card.`
      : 'This card will be permanently removed from your wallet.'}`,onDismiss:cancel,actions:[
      {label:'Cancel',role:'primary',onPress:cancel},
      {label:includesHistory ? 'Delete Card & History' : 'Delete Card',role:'destructive',onPress:()=>{
        if (!mounted.current || deleteToken.current !== token || saving.current) return;
        confirmation.current = false; saving.current = true; setBusy(true);  setNotice(''); Keyboard.dismiss();
        return (async () => {
          try {
            const deleted = await editCommands.confirmDelete(token);
            if (!mounted.current) return;
            if (deleted.ok) {
              if ('warning' in deleted && typeof deleted.warning === 'string' && deleted.warning) Alert.alert('Receipt cleanup needs review', deleted.warning);
              onClose(); return;
            }
            setNotice(deleted.message); setRequiresReview(deleted.requiresReinspection);
          } catch {
            if (mounted.current) { setNotice('Deletion was not confirmed. Close and use Reinspect wallet before continuing.'); setRequiresReview(true); }
          } finally {
            editCommands.cancelDelete(token); deleteToken.current = null; saving.current = false;
            if (mounted.current) { setBusy(false);  setConfirmationRequest(null); }
          }
        })();
      } },
    ]});
    };
    if (!editCommands.deleteReviewRequired) { showConfirmation({ records: 0, receipts: 0 }); return; }
    saving.current = true; setBusy(true);
    void editCommands.reviewDelete(token).then(review => {
      if (!mounted.current || deleteToken.current !== token) return;
      saving.current = false; setBusy(false); showConfirmation(review);
    }).catch(() => {
      editCommands.cancelDelete(token); deleteToken.current = null; confirmation.current = false; saving.current = false;
      if (mounted.current) { setBusy(false); setNotice('Deletion review could not be completed. Open History & Receipts to check interrupted operations, then review wallet status. Nothing was deleted.'); }
    });
  }
  const Container=sheetPresentation==='inline'?View:SafeAreaView;
  const expiration=<Text style={homeFrontBack?[styles.muted,styles.expiryText]:styles.muted} onLayout={homeFrontBack?event=>{const text=event.nativeEvent.layout.height;setExpiryMeasurements(previous=>previous.text===text?previous:{...previous,text});}:undefined}>{card.expiryMonth ? `Expires ${card.expiryMonth}` : 'No expiry'}</Text>;
  const number=<Text selectable style={styles.number}>{card.memberNumber}</Text>;
  const memory=!fromCreate&&<View testID="card-keeps-actions" style={styles.keepsRow}>
    <GlassButton accessibilityLabel="My Keeps" onPress={()=>!motion?.isClosing()&&setKeepsOpen('list')} style={styles.myKeeps}><AddCardIcon name="keep" color={ciColors.action.primary} size={20}/><Text style={styles.keepSecondary}>My Keeps</Text></GlassButton>
    <GlassButton accessibilityLabel="Add Keep" kind="action" onPress={()=>!motion?.isClosing()&&setKeepsOpen('add')} style={styles.keepPrimary}><AddCardIcon name="plus" color={ciColors.text.onAction} size={20}/><Text style={styles.keepPrimaryText}>Add Keep</Text></GlassButton>
  </View>;
  const sheetBody=<View pointerEvents={confirmationRequest?'none':'auto'} accessibilityElementsHidden={!!confirmationRequest} importantForAccessibility={confirmationRequest?'no-hide-descendants':'auto'} accessibilityViewIsModal={sheetPresentation!=='inline'} style={styles.sheet} onLayout={event => setSheetWidth(event.nativeEvent.layout.width)} testID="card-detail-sheet">
        <View style={styles.header} onLayout={frontback?event=>setHeaderHeight(event.nativeEvent.layout.height):undefined}>
          <View style={styles.identity}>
            <Text accessibilityRole="header" style={styles.title}>{card.name}</Text>
            {!fromCreate&&<Pressable accessibilityRole="button" accessibilityLabel="Share card" onPress={() => !motion?.isClosing()&&setShareOpen(true)} style={styles.hit}>
              <AddCardIcon name="share" />
            </Pressable>}
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Close" disabled={busy} onPress={dismiss} style={styles.hit}>
            {({ pressed }) => <View style={[styles.surface, styles.round, pressed && styles.pressed]}><AddCardIcon name="close" /></View>}
          </Pressable>
        </View>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {frontback ? <>{!!notice&&<Text accessibilityRole="alert" style={styles.muted}>{notice}</Text>}<CardFrontBackArtwork card={card} availableHeight={previewHeight}/></> : <>
          <View testID="card-detail-code-panel" onLayout={event => setCodeWidth(event.nativeEvent.layout.width)} style={styles.code}>
            {/* Only the code region observes swipes; the toggle is a separate sibling hit target. */}
            <View {...responder.panHandlers} testID="card-detail-swipe-area" style={{ paddingTop: controls.codeTop, paddingBottom: controls.codeBottom }}>
              <CardCodeView card={card} format={format} maxHeight={format==='qr'?224:Math.max(176, windowHeight * 0.34)} />
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
                onPress={() => { if (fullActive.current||motion?.isClosing()) return; fullActive.current = true; setFullOpen(true); }}>
                <AddCardIcon name="fullscreen" size={20} />
              </Pressable>
            </View>
          </View>
          </>}
          {frontback&&<View testID="frontback-details" style={styles.details} onLayout={event=>setDetailsHeight(event.nativeEvent.layout.height)}>{homeFrontBack?<View testID="frontback-expiry-row" style={styles.expiryRow} onLayout={event=>{const row=event.nativeEvent.layout.height;setExpiryMeasurements(previous=>previous.row===row?previous:{...previous,row});}}>
            {expiration}
            <Pressable accessibilityRole="button" accessibilityLabel="View card full screen" style={styles.hit} onPress={()=>{if(fullActive.current||motion?.isClosing())return;fullActive.current=true;if(!card.appearance.artwork?.front&&card.appearance.artwork?.back)setSide('back');setFullOpen(true);}}>
              <AddCardIcon name="fullscreen" size={20}/>
            </Pressable>
          </View>:expiration}{number}{memory}</View>}
          {!frontback&&number}
          {!frontback&&memory}
          {fromCreate&&editCommands&&<View testID="card-detail-actions" onLayout={event=>setActionsWidth(event.nativeEvent.layout.width)} style={[styles.actionRow,actionsWidth<272*(fontScale??1)+12&&styles.stackedActions]}>
            <Pressable accessibilityRole="button" accessibilityLabel="Delete Card" accessibilityHint="Requires confirmation" disabled={busy||requiresReview} accessibilityState={{disabled:busy||requiresReview,busy}} onPress={requestDelete} style={styles.deleteAction}>
              <AddCardIcon name="delete" color={ciColors.action.destructive} size={20}/><Text style={styles.deleteText}>Delete Card</Text>
            </Pressable>
            <GlassButton kind="action" accessibilityLabel="Edit Card" disabled={busy||requiresReview} style={styles.editAction} onPress={requestEdit}>
              <Text style={styles.editText}>Edit Card</Text>
            </GlassButton>
          </View>}
        </ScrollView>
      </View>;
  const sheetContent=<>{motion?.backdrop}<Pressable accessibilityRole="button" accessibilityLabel="Close card preview" disabled={busy||!!confirmationRequest} onPress={dismiss} style={StyleSheet.absoluteFill}/>{motion?motion.renderSheet(sheetBody):sheetBody}</>;
  const surface=<Container style={sheetPresentation==='inline'?[styles.backdrop,styles.inline,motion&&{backgroundColor:'transparent'}]:styles.backdrop}>
    <ConfirmationDialog presentation="inline" request={confirmationRequest} busy={busy}/>
    {frontback?<View testID="frontback-safe-host" style={styles.safeHost} onLayout={event=>setAreaHeight(event.nativeEvent.layout.height)}>{sheetContent}</View>:sheetContent}
  </Container>;
  return sheetPresentation==='inline'?surface:<Modal visible transparent animationType="none" onRequestClose={dismiss} statusBarTranslucent navigationBarTranslucent>{surface}</Modal>;
}
const styles = StyleSheet.create({
  keepsRow:{flexDirection:'row',gap:10},myKeeps:{flex:1,minHeight:48,padding:10,borderRadius:18,borderColor:ciColors.action.primary},keepPrimary:{flex:1,minHeight:48,padding:10,borderRadius:18},keepSecondary:{...ciTypography.button,color:ciColors.text.primary,flexShrink:1,textAlign:'center'},keepPrimaryText:{...ciTypography.button,color:ciColors.text.onAction,flexShrink:1,textAlign:'center'},
  expiryRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},expiryText:{flex:1,minWidth:0},
  actionRow:{flexDirection:'row',alignItems:'stretch',gap:12,marginTop:8},stackedActions:{flexDirection:'column'},
  deleteAction:{minWidth:48,minHeight:48,flexDirection:'row',gap:8,alignItems:'center',paddingVertical:8,paddingHorizontal:4},
  deleteText:{...ciTypography.button,color:ciColors.action.destructive,flexShrink:1},
  editAction:{flex:1,minWidth:48,minHeight:48,borderRadius:16,paddingHorizontal:16,paddingVertical:10},
  editText:{...ciTypography.button,color:ciColors.text.onAction,textAlign:'center',flexShrink:1},
  inline:{...StyleSheet.absoluteFill,zIndex:5},
  safeHost:{flex:1,justifyContent:'flex-end'},details:{gap:8},
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: sheetVisual.scrim },
  sheet: { maxHeight: '92%', width: '100%', maxWidth: 600, alignSelf: 'center', flexShrink: 1,
    backgroundColor: sheetVisual.surface, boxShadow: sheetVisual.shadow, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden', paddingTop: 20 },
  header: { flexDirection: 'row', gap: 8, alignItems: 'center', paddingHorizontal: 20, marginBottom: 16 },
  identity: { flex: 1, minWidth: 0, flexDirection: 'row', gap: 4, alignItems: 'center' },
  title: { flexShrink: 1, ...ciTypography.title, color: ciColors.text.primary },
  scroll: { flexShrink: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 20, gap: 8 },
  hit: { width: 48, height: 48, minWidth: 48, minHeight: 48, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  surface: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center',
    borderWidth: 0 },
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
    backgroundColor: ciButtons.secondary },
  historyText: { flexShrink: 1, alignItems: 'center' },
  text: { fontFamily: lagoonFonts.latin, color: ciColors.text.primary, fontSize: 14, lineHeight: 20, textAlign: 'center' },
});
