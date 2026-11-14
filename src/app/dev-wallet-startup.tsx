/* global __DEV__ */
import { useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect, router } from 'expo-router';
import { bemem } from '@/constants/bemem-theme';
import { inspectDeviceWalletStartup } from '@/lib/dev-startup-readers';
import type { StartupDiagnostics } from '@/lib/wallet-startup-diagnostics';

export default function DevWalletStartupScreen() {
  const busyRef = useRef(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<StartupDiagnostics | null>(null);
  if (!__DEV__) return <Redirect href="/" />;
  async function inspect() {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true); setResult(null);
    try { setResult(await inspectDeviceWalletStartup()); }
    catch { Alert.alert('Diagnostics unavailable', 'The read-only inspection could not complete. No raw wallet details are shown.'); }
    finally { busyRef.current = false; setBusy(false); }
  }
  return <SafeAreaView style={styles.screen}><ScrollView contentContainerStyle={styles.content}>
    <Text accessibilityRole="header" style={styles.title}>Wallet Startup Diagnostics</Text>
    <Text style={styles.body}>DEV only · Read-only real FileSystem inspection. Nothing runs automatically. No migration is written. No card names, membership numbers or code payloads are displayed or logged.</Text>
    <Pressable accessibilityRole="button" disabled={busy} style={styles.button} onPress={() => { void inspect(); }}>
      <Text style={styles.buttonText}>{busy ? 'Inspecting…' : 'Inspect Wallet Startup'}</Text>
    </Pressable>
    {!result && <Text style={styles.body}>Not Verified — press Inspect to read current wallet status.</Text>}
    {result && <>
      {result.states.map(state => <Text key={state} style={styles.body}>{state}</Text>)}
      <Text selectable style={styles.body}>Source: {result.source}{'\n'}Revision: {result.revision ?? 'Not verified'}{'\n'}Cards: {result.cardCount ?? 'Not verified'}{'\n'}Pending: {result.pendingCount ?? 'Not verified'}{'\n'}Canvas: {result.canvas}{'\n'}Selected snapshot readback: {result.readback}</Text>
      {result.errorCode && <Text selectable style={styles.body}>Error: {result.errorCode}</Text>}
    </>}
    <Text style={styles.body}>No write/move/delete actions exist on this screen. Readback compares the selected snapshot twice; it is not a checksum of all wallet folders. Nothing is sent into the real Canvas.</Text>
    <Pressable accessibilityRole="button" style={styles.button} disabled={busy} onPress={() => router.replace('/')}>
      <Text style={styles.buttonText}>Back to Home</Text>
    </Pressable>
  </ScrollView></SafeAreaView>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: bemem.background },
  content: { padding: 20, gap: 16, paddingBottom: 40 },
  title: { color: bemem.foreground, fontSize: 22, fontWeight: '700' },
  body: { color: bemem.muted, fontSize: 14, lineHeight: 22 },
  button: { minHeight: 48, padding: 12, backgroundColor: bemem.primary, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  buttonText: { color: bemem.white, fontSize: 14, fontWeight: '600' },
});
