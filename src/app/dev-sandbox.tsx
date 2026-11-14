/* global __DEV__ */
import { useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect, router } from 'expo-router';
import { CardPreview } from '@/components/bemem/CardPreview';
import { GlassButton } from '@/components/bemem/GlassButton';
import { WalletCanvas } from '@/components/bemem/WalletCanvas';
import { lagoon, lagoonFonts } from '@/constants/lagoon-theme';
import { appendSandboxSamples, initialSandboxPreview, moveSandboxSample } from '@/lib/sandbox-preview';
import { searchReflow } from '@/lib/search-reflow';
import type { PreviewCard } from '@/types/wallet-ui';

export default function DevSandboxScreen() {
  if (!__DEV__) return <Redirect href="/" />;
  return <SandboxPreviewScreen />;
}
function SandboxPreviewScreen() {
  const [sandbox, setSandbox] = useState(initialSandboxPreview);
  const [editing, setEditing] = useState(true);
  const [dragging, setDragging] = useState(false);
  const [query, setQuery] = useState('');
  const [opened, setOpened] = useState<PreviewCard | null>(null);
  const presentation = useMemo(() => searchReflow(sandbox.cards, sandbox.layout, query, !editing, Infinity), [sandbox, query, editing]);
  return <SafeAreaView style={styles.screen}>
    <View style={styles.header}>
      <Text accessibilityRole="header" style={styles.title}>Sandbox</Text>
      <GlassButton disabled={dragging} style={styles.button} onPress={() => router.replace('/')}><Text style={styles.text}>Back</Text></GlassButton>
    </View>
    <View style={styles.controls}>
      <GlassButton disabled={dragging} selected={!editing} style={styles.button} onPress={() => { setEditing(false); setQuery(''); }}><Text style={styles.text}>View</Text></GlassButton>
      <GlassButton disabled={dragging} selected={editing} style={styles.button} onPress={() => { setEditing(true); setQuery(''); }}><Text style={styles.text}>Arrange</Text></GlassButton>
      <GlassButton disabled={dragging} style={styles.button} onPress={() => setSandbox(current => appendSandboxSamples(current))}><Text style={styles.text}>Add 7 samples</Text></GlassButton>
    </View>
    <Text style={styles.notice}>{sandbox.cards.length} samples · Memory only · No wallet files</Text>
    {!editing && <TextInput accessibilityLabel="Search sample cards" placeholder="Search sample cards" value={query} onChangeText={setQuery}
      placeholderTextColor={lagoon.text.secondary} style={styles.input} />}
    {presentation.active && !presentation.matchCount && <Text style={styles.notice}>No matching cards</Text>}
    <WalletCanvas cards={presentation.cards} allCards={sandbox.cards} layout={presentation.layout} editing={editing} disabled={false}
      maxRows={Infinity} presentationKey={presentation.key} onDragging={setDragging} onOpen={setOpened}
      onMove={(id, position) => setSandbox(current => moveSandboxSample(current, id, position))} />
    <CardPreview card={opened} fromCreate={editing} onClose={() => setOpened(null)} />
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: lagoon.canvas.base },
  header: { padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontFamily: lagoonFonts.latin, color: lagoon.text.primary, fontSize: 20, fontWeight: '700' },
  controls: { paddingHorizontal: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  button: { paddingHorizontal: 12, paddingVertical: 8 },
  text: { fontFamily: lagoonFonts.latin, color: lagoon.text.primary, fontSize: 14, lineHeight: 20 },
  notice: { fontFamily: lagoonFonts.latin, color: lagoon.text.secondary, paddingHorizontal: 16, paddingTop: 8, fontSize: 12 },
  input: { margin: 16, padding: 12, borderRadius: 14, backgroundColor: lagoon.surface.base,
    color: lagoon.text.primary, fontFamily: lagoonFonts.latin, fontSize: 14 },
});
