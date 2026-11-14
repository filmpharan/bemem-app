/* global __DEV__ */
import { useEffect, useRef, useState } from 'react';
import { Alert, BackHandler, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { lagoon, lagoonFonts } from '../../constants/lagoon-theme';
import { createWalletTestSandbox, CUTOVER_TEST_DIRECTORY } from '../../lib/dev-wallet-sandbox';
import { runCutoverFileChecks, verifyCutoverRestart, inspectCutoverFiles } from '../../lib/dev-cutover-checks';
import type { DeviceTestResult } from '../../lib/dev-wallet-checks';

// One manual harness operation at a time, including across route remounts in this JS module.
let operating = false;
const session = `cutover-${Date.now()}-${Math.random().toString(36).slice(2)}`;
export function CutoverTestHarness() {
  const [results, setResults] = useState<DeviceTestResult[]>([]);
  const [busy, setBusy] = useState(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => operating);
    return () => subscription.remove();
  }, []);
  if (!__DEV__) return null;
  const sandbox = createWalletTestSandbox(CUTOVER_TEST_DIRECTORY);
  async function action(kind: 'run' | 'restart' | 'inspect' | 'clear') {
    if (operating) return;
    operating = true; setBusy(true);
    const report = (result: DeviceTestResult) => { if (mounted.current) setResults(previous => [...previous, result]); };
    if (kind === 'run') setResults([]);
    try {
      if (kind === 'run') await runCutoverFileChecks(sandbox, session, report);
      else if (kind === 'restart') report(await verifyCutoverRestart(sandbox, session));
      else if (kind === 'inspect') report(await inspectCutoverFiles(sandbox));
      else {
        await sandbox.clear();
        report({ label: 'Dedicated test cleanup', status: 'Passed', detail: 'Only recognized files in bemem-wallet-cutover-test were removed. Production folders were never accessed.' });
      }
    } catch { report({ label: 'Test operation', status: 'Failed', detail: 'Operation stopped. No automatic retry. Preserve the test files and inspect status.' }); }
    finally { operating = false; if (mounted.current) setBusy(false); }
  }
  return <SafeAreaView style={styles.screen}><ScrollView contentContainerStyle={styles.content}>
    <Text accessibilityRole="header" style={styles.title}>DEV · Cutover preparation</Text>
    <Text style={styles.body}>Synthetic fixtures only. FileSystem tests start only when you press Run Test. Production import remains locked.</Text>
    <Text selectable style={styles.body}>{sandbox.path()}</Text>
    <Text style={styles.body}>No v1 or production v2 files are read, copied or written. Use an empty test directory for each new run.</Text>
    <Pressable disabled={busy} accessibilityRole="button" onPress={() => void action('run')} style={styles.button}><Text style={styles.text}>{busy ? 'Working...' : 'Run Test'}</Text></Pressable>
    <Text style={styles.body}>After a successful run, fully close Expo Go and reopen this route. Press Verify After Restart before running again. Fast Refresh is not proof of a native restart.</Text>
    <Pressable disabled={busy} accessibilityRole="button" onPress={() => void action('restart')} style={styles.button}><Text style={styles.text}>Verify After Restart</Text></Pressable>
    <Pressable disabled={busy} accessibilityRole="button" onPress={() => void action('inspect')} style={styles.button}><Text style={styles.text}>Reinspect · Read only</Text></Pressable>
    <Pressable disabled={busy} accessibilityRole="button" onPress={() => Alert.alert('Clear dedicated test files?',
      'Delete recognized synthetic files only inside bemem-wallet-cutover-test. Keep your test results first.', [
        { text: 'Cancel', style: 'cancel' }, { text: 'Clear Test Files', style: 'destructive', onPress: () => void action('clear') },
      ])} style={styles.button}><Text style={styles.text}>Clear Test Files</Text></Pressable>
    <Pressable disabled={busy} accessibilityRole="button" onPress={() => { if (!operating) router.replace('/'); }} style={styles.button}><Text style={styles.text}>Back to Home</Text></Pressable>
    {!results.length && <Text style={styles.body}>Not Verified · No device test has run.</Text>}
    {results.map((result, index) => <View key={index} style={styles.result}>
      <Text accessibilityRole="header" style={styles.text}>{result.status} · {result.label}</Text>
      <Text selectable style={styles.body}>{result.detail}</Text>
    </View>)}
  </ScrollView></SafeAreaView>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: lagoon.canvas.base },
  content: { padding: 20, gap: 14, paddingBottom: 40 },
  title: { fontSize: 20, lineHeight: 28, color: lagoon.text.primary, fontFamily: lagoonFonts.latin, fontWeight: '700' },
  body: { fontSize: 14, lineHeight: 22, color: lagoon.text.secondary, fontFamily: lagoonFonts.latin },
  button: { minHeight: 48, padding: 12, justifyContent: 'center', backgroundColor: lagoon.surface.base, borderRadius: 12 },
  text: { fontSize: 14, lineHeight: 22, color: lagoon.text.primary, fontFamily: lagoonFonts.latin, fontWeight: '600' },
  result: { paddingVertical: 8, gap: 4 },
});
