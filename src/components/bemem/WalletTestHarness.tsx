/* global __DEV__ */
import { useEffect, useRef, useState } from 'react';
import { Alert, BackHandler, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { uuid } from 'expo';
import { bemem } from '../../constants/bemem-theme';
import { createWalletTestSandbox } from '../../lib/dev-wallet-sandbox';
import { runWalletDeviceChecks, verifyWalletTestRestart, walletTestError, type DeviceTestResult } from '../../lib/dev-wallet-checks';

let session: string | undefined;
let operating = false;
function sessionId() { session ??= uuid.v4(); return session; }

export function WalletTestHarness() {
  const [results, setResults] = useState<DeviceTestResult[]>([]);
  const [busy, setBusy] = useState(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => operating);
    return () => subscription.remove();
  }, []);
  if (!__DEV__) return null;
  const sandbox = createWalletTestSandbox();
  async function action(kind: 'run' | 'restart' | 'clear') {
    if (operating) return;
    operating = true; setBusy(true);
    if (kind === 'run') setResults([]);
    const report = (result: DeviceTestResult) => { if (mounted.current) setResults(previous => [...previous, result]); };
    try {
      if (kind === 'run') await runWalletDeviceChecks(sandbox, () => uuid.v4(), sessionId(), report);
      else if (kind === 'restart') report(await verifyWalletTestRestart(sandbox, () => uuid.v4(), sessionId()));
      else {
        await sandbox.clear();
        if (mounted.current) setResults([{ label: 'Sandbox cleanup', status: 'Passed', detail: 'Only recognized test files were removed. The empty test root is retained.' }]);
      }
    } catch (error) { report({ label: kind === 'restart' ? 'Restart verification' : kind, status: 'Failed', detail: walletTestError(error) }); }
    finally { operating = false; if (mounted.current) setBusy(false); }
  }
  return <SafeAreaView style={styles.screen}><ScrollView contentContainerStyle={styles.content}>
    <Text accessibilityRole="header" style={styles.title}>Wallet v2 · Device FileSystem Tests</Text>
    <Text style={styles.body}>Development only. Synthetic data only. Nothing runs until you press a test button. Results here are device runs, separate from Node/mock tests.</Text>
    <Text selectable style={styles.path}>{sandbox.path()}</Text>
    <Text style={styles.body}>Every file operation is confined to this test root. Production wallet folders are never read or checksummed.</Text>
    <Pressable accessibilityRole="button" disabled={busy} onPress={() => { void action('run'); }} style={styles.button}><Text style={styles.buttonText}>{busy ? 'Working…' : 'Run Test'}</Text></Pressable>
    <Text style={styles.body}>After Run Test: fully close Expo Go, reopen this route, and press Verify After Restart BEFORE running tests again. Fast Refresh is not proof of a native process restart.</Text>
    <Pressable accessibilityRole="button" disabled={busy} onPress={() => { void action('restart'); }} style={styles.button}><Text style={styles.buttonText}>Verify After Restart</Text></Pressable>
    <Pressable accessibilityRole="button" disabled={busy} onPress={() => Alert.alert('Clear test sandbox?', 'Remove only recognized files inside bemem-wallet-v2-test. Keep results/screenshots first.', [
      { text: 'Cancel', style: 'cancel' }, { text: 'Clear Test Files', style: 'destructive', onPress: () => { void action('clear'); } },
    ])} style={styles.button}><Text style={styles.buttonText}>Clear Test Files</Text></Pressable>
    <Pressable accessibilityRole="button" disabled={busy} onPress={() => router.replace('/')} style={styles.button}><Text style={styles.buttonText}>Back to Home</Text></Pressable>
    {!results.length && <Text style={styles.body}>Not Verified — no device results in this session.</Text>}
    {results.map((result, index) => <View key={index} style={styles.result}>
      <Text accessibilityRole="header" style={styles.resultTitle}>{result.status} · {result.label}</Text>
      <Text selectable style={styles.body}>{result.detail}</Text>
    </View>)}
  </ScrollView></SafeAreaView>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: bemem.background },
  content: { padding: 20, gap: 14, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: '700', color: bemem.foreground },
  body: { fontSize: 14, lineHeight: 22, color: bemem.muted },
  path: { fontSize: 12, lineHeight: 18, color: bemem.foreground },
  button: { minHeight: 48, backgroundColor: bemem.primary, borderRadius: 14, padding: 12, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: bemem.white, fontSize: 14, fontWeight: '600' },
  result: { padding: 14, borderWidth: 1, borderColor: bemem.border, borderRadius: 14, gap: 8 },
  resultTitle: { color: bemem.foreground, fontWeight: '700', fontSize: 14 },
});
