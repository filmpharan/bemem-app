import { useEffect, useRef, useState } from 'react';
import { AppState, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { CameraView, useCameraPermissions, type BarcodeScanningResult, type BarcodeType } from 'expo-camera';
import { SafeAreaView } from 'react-native-safe-area-context';
import { lagoonFonts } from '../../constants/lagoon-theme';
import { AddCardIcon } from './AddCardIcon';

// SDK 58 identifiers. Android maps itf14 to ML Kit FORMAT_ITF (Interleaved 2 of 5).
export const NUMBER_SCAN_TYPES: BarcodeType[] = ['qr', 'code128', 'ean13', 'ean8', 'upc_a', 'upc_e',
  'code39', 'itf14', 'code93', 'codabar', 'pdf417', 'datamatrix', 'aztec'];
const settings = { barcodeTypes: NUMBER_SCAN_TYPES };

/** Camera-only modal: emits one exact string; never creates a file or saves a card. */
export function MembershipNumberScanner({ onClose, onResult }: { onClose: () => void; onResult: (text: string) => void }) {
  const [permission, requestPermission, refreshPermission] = useCameraPermissions({ get: false });
  const [foreground, setForeground] = useState(AppState.currentState === 'active');
  const [ready, setReady] = useState(false), [finished, setFinished] = useState(false);
  const [error, setError] = useState(''), [feedback, setFeedback] = useState('');
  const [requesting, setRequesting] = useState(false), [torch, setTorch] = useState(false);
  const [cameraEpoch, setCameraEpoch] = useState(0);
  const [aimSize, setAimSize] = useState<{ width: number; height: number } | null>(null);
  const mounted = useRef(true), consumed = useRef(false), readyNow = useRef(false);
  const foregroundNow = useRef(foreground), epoch = useRef(0), permissionBusy = useRef(false);
  const { width, height } = useWindowDimensions();
  const windowWidth = Math.max(1, Math.min((aimSize?.width ?? width) - 40, 520));
  const windowHeight = Math.max(1, Math.min(windowWidth * 0.7, 240, height * 0.38, aimSize ? aimSize.height - 24 : Infinity));
  function close() {
    if (consumed.current) return;
    consumed.current = true; readyNow.current = false; setFinished(true); setTorch(false); onClose();
  }
  function fail(message: string) {
    readyNow.current = false; setReady(false); setTorch(false); setError(message);
  }
  useEffect(() => {
    mounted.current = true;
    void refreshPermission().catch(() => {
      if (mounted.current && !consumed.current) fail('Camera permission could not be checked. Return to manual entry and try again.');
    });
    const subscription = AppState.addEventListener('change', state => {
      readyNow.current = false; foregroundNow.current = false; setReady(false); setTorch(false); setForeground(false);
      epoch.current++; setCameraEpoch(epoch.current);
      if (state === 'active') {
        const current = epoch.current;
        void refreshPermission().then(() => {
          if (mounted.current && !consumed.current && epoch.current === current) {
            foregroundNow.current = true; setForeground(true);
          }
        }).catch(() => { if (mounted.current) fail('Camera permission could not be checked. Return to manual entry and try again.'); });
      }
    });
    return () => { mounted.current = false; readyNow.current = false; subscription.remove(); };
  }, [refreshPermission]);
  const cameraVisible = !!permission?.granted && foreground && !error && !finished;
  useEffect(() => {
    if (!cameraVisible) return;
    const timeout = setTimeout(() => {
      if (mounted.current && !consumed.current && !readyNow.current) fail('Camera could not start. It may be unavailable or in use by another app.');
    }, 12000);
    return () => clearTimeout(timeout);
  }, [cameraVisible, cameraEpoch]);
  async function allowCamera() {
    if (permissionBusy.current) return;
    permissionBusy.current = true; setRequesting(true); setFeedback('');
    try { await requestPermission(); }
    catch { if (mounted.current) setFeedback('Camera permission could not be requested. You can return to manual entry.'); }
    finally { permissionBusy.current = false; if (mounted.current) setRequesting(false); }
  }
  async function retryCamera() {
    if (permissionBusy.current) return;
    permissionBusy.current = true; setRequesting(true);
    epoch.current++; setCameraEpoch(epoch.current); readyNow.current = false;
    foregroundNow.current = false; setForeground(false); setReady(false); setError(''); setFeedback('');
    try {
      await refreshPermission();
      if (mounted.current && !consumed.current && AppState.currentState === 'active') { foregroundNow.current = true; setForeground(true); }
    } catch { if (mounted.current && !consumed.current) fail('Camera permission could not be checked. Return to manual entry and try again.'); }
    finally { permissionBusy.current = false; if (mounted.current) setRequesting(false); }
  }
  function scanned(result: BarcodeScanningResult) {
    if (!mounted.current || consumed.current || !foregroundNow.current || !readyNow.current || epoch.current !== cameraEpoch || !permission?.granted || error) return;
    // SDK 58 Android exposes both ML Kit displayValue (`data`) and rawValue.
    // Prefer raw text so structured QR/URL values are not replaced by display text.
    const text = Platform.OS === 'android' && typeof result.raw === 'string' ? result.raw : result.data;
    if (typeof text !== 'string' || text.length === 0) { setFeedback('This code has no text. Try another code.'); return; }
    // Lock synchronously: repeated native frame events cannot submit a second value.
    consumed.current = true; readyNow.current = false; setFinished(true); setTorch(false);
    onResult(text);
  }
  return <Modal visible presentationStyle="fullScreen" animationType="none" onRequestClose={close} statusBarTranslucent navigationBarTranslucent>
    <View style={styles.screen}>
      {cameraVisible && <CameraView key={cameraEpoch} style={StyleSheet.absoluteFill} facing="back" mode="picture"
        barcodeScannerSettings={settings} enableTorch={torch} onBarcodeScanned={scanned}
        onCameraReady={() => {
          if (mounted.current && !consumed.current && foregroundNow.current && epoch.current === cameraEpoch) { readyNow.current = true; setReady(true); }
        }}
        onMountError={() => { if (mounted.current && !consumed.current && epoch.current === cameraEpoch) fail('Camera is unavailable. Check camera access or close other camera apps, then try again.'); }} />}
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Text accessibilityRole="header" style={styles.title}>Scan code</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Close scanner" onPress={close}
            style={({ pressed }) => [styles.iconButton, { opacity: pressed ? 0.65 : 1 }]}>
            <AddCardIcon name="close" color="#ffffff" size={22} />
          </Pressable>
        </View>
        {cameraVisible ? <View style={styles.aimArea} onLayout={event => {
          const { width, height } = event.nativeEvent.layout;
          setAimSize(previous => previous?.width === width && previous.height === height ? previous : { width, height });
        }}>
          <View pointerEvents="none" accessible={false} style={styles.mask}>
            <View style={styles.shadeGrow} />
            <View style={styles.windowRow}>
              <View style={styles.shadeGrow} />
              <View testID="scan-window" style={{ width: windowWidth, height: windowHeight }}>
                <View style={[styles.corner, styles.topLeft]} /><View style={[styles.corner, styles.topRight]} />
                <View style={[styles.corner, styles.bottomLeft]} /><View style={[styles.corner, styles.bottomRight]} />
                <View testID="scan-aim-line" style={styles.redLine} />
              </View>
              <View style={styles.shadeGrow} />
            </View>
            <View style={styles.shadeGrow} />
          </View>
        </View> : <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.fallback}>
          <Text accessibilityLiveRegion="polite" style={styles.message}>{error || (!foreground ? 'Scanning paused while the app is in the background.'
            : !permission ? 'Checking camera permission...'
            : permission.canAskAgain ? 'Allow camera access to scan a QR Code or barcode.' : 'Camera access is disabled. Enable it in system settings or enter the number manually.')}</Text>
          {!error && foreground && permission && !permission.granted && (permission.canAskAgain
            ? <Pressable accessibilityRole="button" accessibilityLabel="Allow camera" disabled={requesting} onPress={() => { void allowCamera(); }} style={styles.button}>
              <Text style={styles.buttonText}>{requesting ? 'Requesting...' : 'Allow Camera'}</Text>
            </Pressable>
            : <Pressable accessibilityRole="button" accessibilityLabel="Open camera settings" onPress={() => { void Linking.openSettings().catch(() => { if (mounted.current) setFeedback('Settings could not be opened. Enable camera access in your device settings.'); }); }} style={styles.button}>
              <Text style={styles.buttonText}>Open Settings</Text>
            </Pressable>)}
          {!!error && <Pressable accessibilityRole="button" accessibilityLabel="Try camera again" disabled={requesting} style={styles.button}
            onPress={() => { void retryCamera(); }}><Text style={styles.buttonText}>Try Again</Text></Pressable>}
          <Pressable accessibilityRole="button" accessibilityLabel="Return to manual entry" onPress={close} style={styles.button}><Text style={styles.buttonText}>Enter Manually</Text></Pressable>
        </ScrollView>}
        <View style={styles.footer}>
          <Text accessibilityLiveRegion="polite" style={styles.instruction}>{feedback || (cameraVisible ? ready ? 'Align code within the frame' : 'Starting camera...' : 'You can enter the number manually.')}</Text>
          {cameraVisible && ready && Platform.OS !== 'web' && <Pressable accessibilityRole="button" accessibilityLabel={torch ? 'Turn torch off' : 'Turn torch on'}
            accessibilityState={{ selected: torch }} onPress={() => setTorch(!torch)} style={styles.button}><Text style={styles.buttonText}>{torch ? 'Torch On' : 'Torch Off'}</Text></Pressable>}
        </View>
      </SafeAreaView>
    </View>
  </Modal>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0b1218' }, safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: 20, backgroundColor: '#0b1218b3' },
  title: { flex: 1, fontFamily: lagoonFonts.latin, fontSize: 20, lineHeight: 28, fontWeight: '700', color: '#ffffff' },
  iconButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  aimArea: { flex: 1 }, mask: { flex: 1 }, shadeGrow: { flex: 1, backgroundColor: '#0b1218b3' }, windowRow: { flexDirection: 'row' },
  corner: { position: 'absolute', width: 24, height: 24, borderColor: '#ffffff' },
  topLeft: { left: 0, top: 0, borderLeftWidth: 2, borderTopWidth: 2, borderTopLeftRadius: 8 },
  topRight: { right: 0, top: 0, borderRightWidth: 2, borderTopWidth: 2, borderTopRightRadius: 8 },
  bottomLeft: { left: 0, bottom: 0, borderLeftWidth: 2, borderBottomWidth: 2, borderBottomLeftRadius: 8 },
  bottomRight: { right: 0, bottom: 0, borderRightWidth: 2, borderBottomWidth: 2, borderBottomRightRadius: 8 },
  redLine: { position: 'absolute', left: 8, right: 8, top: '50%', height: 2, backgroundColor: '#f04747' },
  fallback: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 16 },
  message: { fontFamily: lagoonFonts.latin, fontSize: 16, lineHeight: 24, color: '#ffffff', textAlign: 'center' },
  footer: { padding: 20, gap: 12, alignItems: 'center', backgroundColor: '#0b1218b3' },
  instruction: { fontFamily: lagoonFonts.latin, fontSize: 14, lineHeight: 22, color: '#ffffff', textAlign: 'center' },
  button: { minHeight: 48, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, backgroundColor: '#ffffff18', justifyContent: 'center' },
  buttonText: { fontFamily: lagoonFonts.latin, fontSize: 15, lineHeight: 24, color: '#ffffff', textAlign: 'center' },
});
