import { useEffect, useState, useSyncExternalStore } from 'react';
import { Keyboard, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { core, lagoon, lagoonFonts } from '../../constants/lagoon-theme';
import { emptyCardForm, type CardFormErrors } from '../../lib/card-form';
import { emptyCardPresentation } from '../../lib/card-presentation';
import { createDevAddCardRuntime } from '../../lib/dev-add-card-runtime';
import { walletCanvasPresentation } from '../../lib/wallet-preparation';
import type { PreviewCard } from '../../types/wallet-ui';
import { AddCardForm } from './AddCardForm';
import { AddCardSheet } from './AddCardSheet';
import { AddCardText } from './AddCardText';
import { CardPreview } from './CardPreview';
import { GlassButton } from './GlassButton';
import { WalletCanvas } from './WalletCanvas';
import { addCardLayout as layout } from './add-card-layout';

/** Mounted only by the DEV route. All repository bytes belong to this screen's memory. */
export function DevAddCardRuntime() {
  const [runtime] = useState(createDevAddCardRuntime);
  const snapshot = useSyncExternalStore(runtime.subscribe, runtime.getSnapshot, runtime.getSnapshot);
  const [values, setValues] = useState(emptyCardForm);
  const [presentation, setPresentation] = useState(emptyCardPresentation);
  const [errors, setErrors] = useState<CardFormErrors>({});
  const [notice, setNotice] = useState('');
  const [open, setOpen] = useState(true);
  const [token, setToken] = useState(() => runtime.beginSubmission());
  const [actionWidth, setActionWidth] = useState(320);
  const [dragging, setDragging] = useState(false);
  const [opened, setOpened] = useState<PreviewCard | null>(null);
  useEffect(() => { void runtime.initialize(); }, [runtime]);
  const { state, session } = snapshot;
  const view = session ? walletCanvasPresentation(session.draft) : { cards: [], layout: {} };
  const disabled = !state.editsAllowed || dragging;
  const close = () => { Keyboard.dismiss(); runtime.cancelSubmission(token); setOpen(false); setNotice('Cancelled. No card added.'); };
  const resetForm = () => {
    setValues(emptyCardForm()); setPresentation(emptyCardPresentation()); setErrors({}); setNotice('');
    setToken(runtime.beginSubmission()); setOpen(true);
  };
  async function run(operation: () => Promise<{ ok: boolean; code: string }>, success: string) {
    setNotice('Working in memory...');
    try { const result = await operation(); setNotice(result.ok ? success : `Not completed: ${result.code}. No automatic retry.`); }
    catch { setNotice('Test operation failed. Reinspect before continuing.'); }
  }
  const screen = <SafeAreaView style={styles.screen}>
    <View style={styles.header}><Text accessibilityRole="header" style={styles.title}>DEV wallet test</Text>
      <GlassButton disabled={state.saving || dragging} onPress={() => router.replace('/')} style={styles.control}><Text style={styles.text}>Back</Text></GlassButton></View>
    <Text style={styles.status}>Memory only. Use fictitious cards. Nothing is saved on your phone.</Text>
    <View style={styles.controls}>
      <GlassButton disabled={disabled} onPress={resetForm} style={styles.control}><Text style={styles.text}>Add Card</Text></GlassButton>
      <GlassButton disabled={disabled || !state.dirty} onPress={() => void run(runtime.save, 'Saved to test memory. Readback verified.')} style={styles.control}><Text style={styles.text}>Test Save</Text></GlassButton>
      <GlassButton disabled={disabled || !state.dirty} onPress={() => { const result = runtime.discard(); setNotice(result.ok ? 'Draft discarded. Saved test wallet restored.' : 'Discard not admitted.'); }} style={styles.control}><Text style={styles.text}>Discard Draft</Text></GlassButton>
      <GlassButton disabled={disabled || state.dirty} onPress={() => void run(runtime.reload, 'Repository readback verified. No disk files.')} style={styles.control}><Text style={styles.text}>Verify readback</Text></GlassButton>
      <GlassButton disabled={!['blocked', 'error'].includes(state.phase)} onPress={() => void run(runtime.reinspect, 'Reinspection completed. No write retried.')} style={styles.control}><Text style={styles.text}>Reinspect</Text></GlassButton>
    </View>
    <Text style={styles.status}>{state.phase} · Revision {state.revision ?? 0} · {view.cards.length} cards · {state.dirty ? 'Unsaved draft' : 'Clean test state'}</Text>
    <Text accessibilityLiveRegion="polite" style={styles.status}>{notice || state.reason || 'Close this route to discard all test memory.'}</Text>
    <WalletCanvas cards={view.cards} allCards={view.cards} layout={view.layout} editing disabled={disabled || open}
      maxRows={Infinity} onMove={runtime.move} onOpen={setOpened} onDragging={setDragging} />
    <CardPreview card={opened} fromCreate membership={session?.draft.cards.find(card => card.id === opened?.id) ?? null} onClose={() => setOpened(null)} />
  </SafeAreaView>;
  if (!open) return screen;
  return <AddCardSheet onClose={close} background={screen} footer={<>
    <GlassButton kind="action" disabled={disabled} style={styles.action}
      onLayout={event => setActionWidth(event.nativeEvent.layout.width)} accessibilityLabel="Add Card to test draft only"
      onPress={() => {
        Keyboard.dismiss(); const result = runtime.add(token, values, presentation);
        if (result.ok) { setOpen(false); setNotice('Added to test draft. Not saved.'); }
        else { setErrors(result.errors); setNotice(result.message); }
      }}><AddCardText maxWidth={Math.max(1, actionWidth - 34)} style={styles.actionText}>Add Card</AddCardText></GlassButton>
    <Text accessibilityLiveRegion="polite" style={styles.status}>{notice || 'DEV · Test draft only · Not saved'}</Text>
  </>}>
    <AddCardForm values={values} errors={errors} presentation={presentation}
      onChange={next => { setValues(next); setErrors({}); setNotice(''); }}
      onPresentationChange={next => { setPresentation(next); setNotice(''); }} />
  </AddCardSheet>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: lagoon.canvas.base },
  header: { padding: 16, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  title: { fontFamily: lagoonFonts.latin, color: lagoon.text.primary, fontSize: 20, fontWeight: '700' },
  controls: { paddingHorizontal: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  control: { paddingHorizontal: 12, paddingVertical: 8 },
  text: { fontFamily: lagoonFonts.latin, color: lagoon.text.primary, fontSize: 14, lineHeight: 20 },
  status: { fontFamily: lagoonFonts.latin, fontSize: 10, lineHeight: 15, color: lagoon.text.secondary, textAlign: 'center' },
  action: { minHeight: layout.inputHeight, minWidth: 0, borderRadius: layout.buttonRadius, paddingVertical: 8, paddingHorizontal: 16 },
  actionText: { ...core.typography.styles.button, fontWeight: '700', color: lagoon.text.onAction, fontFamily: lagoonFonts.latin, flexShrink: 1 },
});
