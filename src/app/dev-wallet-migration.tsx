/* global __DEV__ */
import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect, router } from 'expo-router';
import { bemem } from '@/constants/bemem-theme';
import { createDeviceMigrationPreview } from '@/lib/dev-migration-preview';
import type { MigrationPreview } from '@/lib/wallet-migration-consent';

export default function DevWalletMigrationScreen() {
  const flow = useRef<ReturnType<typeof createDeviceMigrationPreview> | null>(null);
  const working = useRef(false);
  const [preview, setPreview] = useState<MigrationPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [consent, setConsent] = useState(false);
  const [notice, setNotice] = useState('Not Verified — press Preview to inspect.');
  if (!__DEV__) return <Redirect href="/" />;
  async function inspect() {
    if (working.current) return;
    working.current = true; setBusy(true); setConsent(false);
    try {
      flow.current = createDeviceMigrationPreview();
      setPreview(await flow.current.preview()); setNotice('Read-only preview complete. Device Import remains locked.');
    } catch { setPreview(null); setNotice('Preview unavailable. No raw wallet details are shown.'); }
    finally { working.current = false; setBusy(false); }
  }
  return <SafeAreaView style={styles.screen}><ScrollView contentContainerStyle={styles.content}>
    <Text accessibilityRole="header" style={styles.title}>Wallet Migration Preview</Text>
    <Text style={styles.body}>DEV review only. A future confirmed import will create a new v2 snapshot and retain Wallet v1 unchanged. No automatic import. Home/Create still use Phase 1.</Text>
    <Pressable accessibilityRole="button" disabled={busy} style={styles.button} onPress={() => { void inspect(); }}><Text style={styles.buttonText}>{busy ? 'Inspecting…' : 'Preview Migration'}</Text></Pressable>
    {preview && <Text selectable style={styles.body}>Source: {preview.source}{'\n'}Cards: {preview.cardCount ?? 'Not verified'}{'\n'}Revision: {preview.revision ?? 'Not verified'}{'\n'}Canvas: {preview.canvas}{'\n'}Pending: {preview.pendingCount ?? 'Not verified'}{'\n'}Migration readiness: {preview.status}{preview.reason ? ` (${preview.reason})` : ''}</Text>}
    <Pressable accessibilityRole="button" disabled={busy || preview?.status !== 'ready'} style={styles.button} onPress={() => {
      if (flow.current?.requestConsent()) setConsent(true);
    }}><Text style={styles.buttonText}>Review Consent</Text></Pressable>
    {consent && <>
      <Text accessibilityRole="header" style={styles.title}>Confirm migration — review only</Text>
      <Text style={styles.body}>The future Import will copy demo IDs, colors, shapes and positions into v2. Demo cards remain demo cards. Source revision and savedAt are preserved; confirmation/verification times are separate metadata. Status and source data must be checked again after confirmation. No automatic retry.</Text>
      <Pressable accessibilityRole="button" accessibilityState={{ disabled: true }} disabled style={styles.locked}><Text style={styles.body}>Import locked · awaiting approval</Text></Pressable>
      <Pressable accessibilityRole="button" style={styles.button} onPress={() => {
        flow.current?.cancel(); setConsent(false); setPreview(null); setNotice('Cancelled. No files were written. Preview again to continue.');
      }}><Text style={styles.buttonText}>Cancel</Text></Pressable>
    </>}
    <Text style={styles.body}>{notice}</Text>
    <Text style={styles.body}>No membership numbers or code payloads are displayed or logged. Preview readiness is not permission to import. There is no device write handler in this review screen.</Text>
    <Pressable accessibilityRole="button" disabled={busy} style={styles.button} onPress={() => router.replace('/')}><Text style={styles.buttonText}>Back to Home</Text></Pressable>
  </ScrollView></SafeAreaView>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: bemem.background }, content: { padding: 20, gap: 16, paddingBottom: 40 },
  title: { color: bemem.foreground, fontSize: 21, fontWeight: '700' }, body: { color: bemem.muted, fontSize: 14, lineHeight: 22 },
  button: { minHeight: 48, borderRadius: 14, padding: 12, backgroundColor: bemem.primary, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: bemem.white, fontSize: 14, fontWeight: '600' },
  locked: { minHeight: 48, padding: 12, borderWidth: 1, borderColor: bemem.border, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
