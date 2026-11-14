import { useCallback, useEffect, useMemo, useRef, useState, type ComponentRef, type ReactNode } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { useFonts } from 'expo-font';
import { captureRef, releaseCapture } from 'react-native-view-shot';
import manrope from '../../../assets/fonts/lagoon/manrope.ttf';
import type { MembershipCard } from '../../types/membership-card';
import { DEFAULT_SHARE_OPTIONS, prepareCardShare, type CardShareOptions, type CardSharePlan } from '../../lib/card-share-plan';
import { createCardShareSession } from '../../lib/card-share-session';
import { cardShareNative } from '../../lib/card-share-native';
import { deviceArtworkStore } from '../../lib/card-artwork-store';
import { payloadCapabilities } from '../../lib/wallet-validation';
import { ciColors, ciTypography } from '../../constants/ci-theme';
import { sheetVisual } from '../../constants/sheet-visual';
import { AddCardSheet } from './AddCardSheet';
import { GlassButton } from './GlassButton';
import { CardShareSurface } from './CardShareSurface';
import { AddCardText } from './AddCardText';

export function ShareCardSheet({ card, onClose }: { card: Readonly<MembershipCard>; onClose: () => void }) {
  const [options, setOptions] = useState<CardShareOptions>(() => ({ ...DEFAULT_SHARE_OPTIONS }));
  const [retry, setRetry] = useState(0), [sharing, setSharing] = useState(false);
  const {width:windowWidth}=useWindowDimensions();
  const contentWidth=Math.max(1,windowWidth-40);
  const nativeBusy = useRef(false);
  const busy = useCallback((value: boolean) => { nativeBusy.current = value; setSharing(value); }, []);
  const close = () => { if (!nativeBusy.current) onClose(); };
  const selected = useMemo(() => {
    try { return { plan: prepareCardShare(card, options), error: '' }; }
    catch (error) { return { plan: null, error: error instanceof Error ? error.message : 'This card could not be prepared for sharing.' }; }
  }, [card, options]);
  const compatible128 = !!card.memberNumber && payloadCapabilities(card.memberNumber).code128.eligible;
  const choose = (next: Partial<CardShareOptions>) => { if (!nativeBusy.current) setOptions(previous => ({ ...previous, ...next })); };
  const controls=<View style={styles.group}>
    <View style={styles.choices}>{(['image','scan'] as const).map(mode=><GlassButton key={mode} disabled={sharing}
      accessibilityLabel={mode==='image'?'Image Only':'With Code'} selected={options.mode===mode} accessibilityState={{selected:options.mode===mode}}
      style={styles.choice} onPress={()=>choose({mode})}><AddCardText maxWidth={Math.max(1,(contentWidth-24)/2)} style={styles.text}>{mode==='image'?'Image Only':'With Code'}</AddCardText></GlassButton>)}</View>
    <View style={styles.choices}>{(['front','back'] as const).map(side=><GlassButton key={side} disabled={sharing||side==='back'&&!card.appearance.artwork?.back}
      accessibilityLabel={`Share ${side==='front'?'Front':'Back'}`} accessibilityHint={side==='back'&&!card.appearance.artwork?.back?'No Back artwork is saved':undefined}
      selected={options.side===side} accessibilityState={{selected:options.side===side}} style={styles.choice} onPress={()=>choose({side})}>
      <AddCardText maxWidth={Math.max(1,(contentWidth-24)/2)} style={styles.text}>{side==='front'?'Front':'Back'}</AddCardText></GlassButton>)}</View>
    {options.mode==='scan'&&<View style={styles.choices}>{(['qr','code128'] as const).map(format=><GlassButton key={format}
      disabled={sharing||format==='code128'&&!compatible128} selected={options.format===format} accessibilityState={{selected:options.format===format}}
      accessibilityLabel={`Share ${format==='qr'?'QR Code':'Code 128'}`} style={styles.choice} onPress={()=>choose({format})}>
      <AddCardText maxWidth={Math.max(1,(contentWidth-24)/2)} style={styles.text}>{format==='qr'?'QR Code':'Code 128'}</AddCardText></GlassButton>)}</View>}
    {options.mode==='scan'&&!compatible128&&<Text style={styles.hint}>Code 128 is unavailable for this Number.</Text>}
  </View>;
  return selected.error?<AddCardSheet modalOnly title="Share Card" onClose={close} closeDisabled={sharing} footer={null}>
    <Text accessibilityRole="alert" style={styles.error}>{selected.error}</Text>{controls}
  </AddCardSheet>:selected.plan&&<SharePreview key={`${JSON.stringify(options)}-${card.updatedAt}-${retry}`}
    plan={selected.plan} onBusy={busy} onClose={close} onRetry={()=>setRetry(v=>v+1)}>{controls}</SharePreview>;
}

function SharePreview({ plan, onBusy, onRetry, onClose, children:controls }: { plan: CardSharePlan; onBusy: (busy: boolean) => void; onRetry: () => void; onClose:()=>void; children:ReactNode }) {
  const {height:screenHeight}=useWindowDimensions();
  const [fontsLoaded, fontError] = useFonts({ BememManrope: manrope });
  const [initialSession] = useState(() => createCardShareSession(cardShareNative));
  const sessionRef = useRef<ReturnType<typeof createCardShareSession> | null>(initialSession);
  const [artifact, setArtifact] = useState<{ uri: string; width: number; height: number } | null>(null);
  const [visible, setVisible] = useState(false), [sharing, setSharing] = useState(false), [message, setMessage] = useState('');
  const [failure, setFailure] = useState('');
  const [contentWidth, setContentWidth] = useState(320);
  const mounted = useRef(true), started = useRef(false), shareBusy = useRef(false);
  useEffect(() => {
    // A fresh scope after effect replay keeps cancelled work closed (including Strict Mode).
    const active = sessionRef.current ?? createCardShareSession(cardShareNative);
    sessionRef.current = active; mounted.current = true; started.current = false;
    return () => {
      mounted.current = false;
      if (sessionRef.current === active) sessionRef.current = null;
      void active.close();
    };
  }, [initialSession]);
  const fail = useCallback(() => { if (mounted.current) setFailure('Unable to prepare this image. Your card is unchanged. Check its artwork or try again.'); }, []);
  const ready = useCallback((view: ComponentRef<typeof View>) => {
    const session = sessionRef.current;
    if (!mounted.current || started.current || !session) return;
    started.current = true;
    void (async () => {
      let raw: string | null = null;
      try {
        const art = plan.appearance.artwork?.[plan.side];
        if (art) deviceArtworkStore.verifyArtwork(art);
        // Deliberately omit width/height options: capture native pixels without resampling code modules.
        raw = await captureRef(view, { format: 'png', result: 'tmpfile' });
        const prepared = await cardShareNative.adoptCapture(raw, plan.width);
        if (!session.track(prepared.uri, prepared.md5)) return;
        if (art) deviceArtworkStore.verifyArtwork(art);
        if (mounted.current) setArtifact(prepared); else await session.discard(prepared.uri);
      } catch { fail(); }
      finally { if (raw) releaseCapture(raw); }
    })();
  }, [plan, fail]);
  async function share() {
    const session = sessionRef.current;
    if (!artifact || !visible || failure || shareBusy.current || !mounted.current || !session) return;
    shareBusy.current = true; setSharing(true); onBusy(true); setMessage('');
    try {
      const result = await session.share(artifact.uri);
      if (mounted.current) {
        setMessage(result.message);
        if (!result.ok && 'needsPreparation' in result && result.needsPreparation) setFailure('The reviewed image is unavailable or changed. Prepare it again. Your card is unchanged.');
      }
    }
    finally { shareBusy.current = false; if (mounted.current) setSharing(false); onBusy(false); }
  }
  const error = failure || (fontError ? 'The local share font could not be loaded. Nothing was shared.' : '');
  return <AddCardSheet modalOnly fixedFooter title="Share Card" onClose={onClose} closeDisabled={sharing} footer={
    <GlassButton kind="action" style={styles.action} accessibilityLabel="Share prepared image" busy={sharing} disabled={!artifact || !visible || !!error}
      onPress={() => { void share(); }}><AddCardText maxWidth={Math.max(1, contentWidth - 30)} style={[styles.text, styles.onAction]}>{sharing ? 'Opening sharing...' : 'Share'}</AddCardText></GlassButton>}>
    <View style={styles.group} onLayout={event => setContentWidth(event.nativeEvent.layout.width)}>
    {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : artifact
      ? <Image source={{ uri: artifact.uri }} accessibilityLabel="Exact image prepared for sharing" contentFit="contain" transition={0}
          onDisplay={() => setVisible(true)} onError={fail} style={{ width:Math.min(contentWidth,screenHeight*.44*artifact.width/artifact.height),height:Math.min(contentWidth*artifact.height/artifact.width,screenHeight*.44),alignSelf:'center',backgroundColor:'#ffffff',borderRadius:14 }} />
      : <View style={styles.preparing}>
          <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.captureHost}>
            <ScrollView horizontal removeClippedSubviews={false} scrollEnabled={false}>
              {fontsLoaded && <CardShareSurface plan={plan} onReady={ready} onFailure={fail} />}
            </ScrollView>
          </View>
          <View style={styles.progress}><ActivityIndicator color={ciColors.text.primary} /><Text accessibilityLiveRegion="polite" style={styles.text}>Preparing image...</Text></View>
        </View>}
    {!visible && artifact && !error && <Text accessibilityLiveRegion="polite" style={styles.hint}>Loading exact preview...</Text>}
    {controls}
    {!!message && <Text accessibilityLiveRegion="polite" style={styles.hint}>{message}</Text>}
    {error && <GlassButton style={styles.action} accessibilityLabel="Prepare share preview again" onPress={onRetry}><AddCardText maxWidth={Math.max(1, contentWidth - 30)} style={styles.text}>Prepare again</AddCardText></GlassButton>}
  </View></AddCardSheet>;
}
const styles = StyleSheet.create({
  group: { gap: 12 }, choices: { flexDirection:'row',gap:4,padding:3,borderRadius:15,backgroundColor:sheetVisual.surface },
  action: { minHeight: 48, paddingVertical: 10, paddingHorizontal: 14 }, choice: { flex:1,minHeight:48,padding:8,minWidth:48,borderRadius:12 },
  text: { ...ciTypography.body, color: ciColors.text.primary, lineHeight: 21, flexShrink: 1 },
  hint: { ...ciTypography.supporting, fontWeight: '400', color: ciColors.text.supporting },
  value: { fontFamily: 'monospace', color: ciColors.text.primary, fontSize: 14, lineHeight: 21 },
  error: { ...ciTypography.supporting, color: ciColors.status.error, fontSize: 13, lineHeight: 20, fontWeight: '400' }, onAction: { color: ciColors.text.onAction },
  preparing: { height: 240, overflow: 'hidden', position: 'relative' }, captureHost: { position: 'absolute', left: 0, top: 0 },
  progress: { ...StyleSheet.absoluteFill, backgroundColor: sheetVisual.elevated, alignItems: 'center', justifyContent: 'center', gap: 12 },
});
