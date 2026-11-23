import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { Modal, PixelRatio, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { captureRef, releaseCapture } from 'react-native-view-shot';
import type { Receipt } from '../../lib/card-history';
import { deviceReceiptStore, receiptUri } from '../../lib/card-history-native';
import { cardShareNative } from '../../lib/card-share-native';
import { createCardShareSession } from '../../lib/card-share-session';
import { lagoon, lagoonFonts } from '../../constants/lagoon-theme';
import { CardArtworkImage } from './CardArtworkImage';
import { GlassButton } from './GlassButton';

/** Only the displayed receipt bitmap is exported; never the surrounding record or Wallet metadata. */
export function ReceiptViewer({ receipt, onClose, context = 'receipt' }: { receipt: Receipt; onClose: () => void; context?: 'receipt'|'photo' }) {
  const photo = context === 'photo';
  const { width } = useWindowDimensions();
  const ratio = receipt.cropRatio ?? receipt.width / receipt.height;
  const imageWidth = Math.max(1, width - 40);
  const imageHeight = imageWidth / ratio;
  const view = useRef<ComponentRef<typeof View>>(null), mounted = useRef(true), sharing = useRef(false);
  const delivery = useRef<ReturnType<typeof createCardShareSession> | null>(null);
  const [ready, setReady] = useState(false), [busy, setBusy] = useState(false), [notice, setNotice] = useState('');
  const [valid, setValid] = useState(false);
  useEffect(() => {
    mounted.current = true;
    try { deviceReceiptStore.verifyArtwork(receipt); setValid(true); }
    catch { setNotice('This receipt image is missing or damaged. Its record has not been changed.'); }
    return () => { mounted.current = false; void delivery.current?.close(); };
  }, [receipt]);
  async function share() {
    if (sharing.current || !ready || !view.current) return;
    sharing.current = true; setBusy(true); setNotice('');
    const session = createCardShareSession(cardShareNative);
    delivery.current = session;
    let raw: string | undefined;
    try {
      deviceReceiptStore.verifyArtwork(receipt);
      await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      if (!mounted.current || !view.current) return;
      const factor = Math.min(PixelRatio.get(), 960 / imageWidth, 3500 / imageHeight);
      const exportWidth = Math.max(1, Math.round(imageWidth * factor)), exportHeight = Math.max(1, Math.round(imageHeight * factor));
      // Receipt-only uniform downsampling; the original file and aspect ratio are preserved.
      raw = await captureRef(view.current, { format: 'png', result: 'tmpfile', width: exportWidth, height: exportHeight });
      const adopted = await cardShareNative.adoptCapture(raw, exportWidth);
      session.track(adopted.uri, adopted.md5);
      if (!mounted.current) return;
      deviceReceiptStore.verifyArtwork(receipt);
      const result = await session.share(adopted.uri);
      if (mounted.current) setNotice(result.message);
    } catch { if (mounted.current) setNotice('Receipt sharing could not be opened. No record was changed. Try again only when ready.'); }
    finally {
      if (raw) releaseCapture(raw);
      await session.close(); sharing.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  const close = () => { if (!sharing.current) onClose(); };
  return <Modal visible animationType="none" onRequestClose={close}>
    <SafeAreaView style={styles.screen} accessibilityViewIsModal>
      <ScrollView contentContainerStyle={styles.content}>
        <Text accessibilityRole="header" style={styles.title}>{photo?'Photo':'Receipt'}</Text>
        <View ref={view} collapsable={false} style={{ width: imageWidth, height: imageHeight, backgroundColor: '#ffffff', alignSelf: 'center' }}>
          {valid && <CardArtworkImage image={receipt} sourceUri={receiptUri(receipt.assetId)} cornerRadius={0}
            onReady={() => setReady(true)} onFailure={() => { setReady(false); setNotice('This image cannot be decoded. Sharing is unavailable.'); }} />}
        </View>
        {!!notice && <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.text}>{notice}</Text>}
        <GlassButton accessibilityLabel={photo?'Share Photo':'Share receipt'} disabled={!ready || busy} onPress={() => { void share(); }} style={styles.button}>
          <Text style={styles.text}>{busy ? 'Opening share sheet…' : photo?'Share Photo':'Share Receipt'}</Text>
        </GlassButton>
        <GlassButton accessibilityLabel={photo?'Close photo':'Close receipt'} disabled={busy} onPress={close} style={styles.button}><Text style={styles.text}>Close</Text></GlassButton>
      </ScrollView>
    </SafeAreaView>
  </Modal>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: lagoon.canvas.base }, content: { padding: 20, gap: 16, flexGrow: 1 },
  title: { fontFamily: lagoonFonts.latin, fontSize: 20, color: lagoon.text.primary, fontWeight: '700' },
  text: { fontFamily: lagoonFonts.latin, fontSize: 14, lineHeight: 22, color: lagoon.text.primary },
  button: { minHeight: 48, padding: 12, minWidth: 48 },
});
