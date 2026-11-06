import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, BackHandler, Keyboard, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CanvasActions } from '@/components/bemem/CanvasActions';
import { CardPreview } from '@/components/bemem/CardPreview';
import { HomeHeader } from '@/components/bemem/HomeHeader';
import { SearchField } from '@/components/bemem/SearchField';
import { UnsavedChangesDialog } from '@/components/bemem/UnsavedChangesDialog';
import { WalletCanvas } from '@/components/bemem/WalletCanvas';
import { bemem } from '@/constants/bemem-theme';
import { lagoon, lagoonFonts } from '@/constants/lagoon-theme';
import { PREVIEW_CARDS } from '@/data/wallet-preview';
import { useWalletCanvas } from '@/hooks/use-wallet-canvas';
import { backAction, primaryHeaderAction } from '@/lib/phase1-navigation';
import { searchReflow } from '@/lib/search-reflow';
import type { PreviewCard } from '@/types/wallet-ui';

export default function HomeScreen() {
  const wallet = useWalletCanvas();
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [openedPreview, setOpenedPreview] = useState<{ card: PreviewCard; fromCreate: boolean } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [proOpen, setProOpen] = useState(false);
  const editing = wallet.mode === 'create';
  const handleDragging = useCallback((active: boolean) => setDragging(active), []);
  const disabled = !wallet.ready || wallet.saving || dragging;

  const handleBack = useCallback(() => {
    switch (backAction({ mode: wallet.mode, proOpen, searchOpen, blocked: wallet.saving || dragging })) {
      case 'blocked': return true;
      case 'close-pro': setProOpen(false); return true;
      case 'close-search': setSearchOpen(false); setQuery(''); Keyboard.dismiss(); return true;
      case 'leave-create': wallet.leave(); return true;
      case 'system-back': return false;
    }
  }, [wallet, proOpen, searchOpen, dragging]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', handleBack);
    return () => subscription.remove();
  }, [handleBack]);

  function openCreate() {
    Keyboard.dismiss(); setSearchOpen(false); setQuery('');
    if (primaryHeaderAction(wallet.mode) === 'open-pro') setProOpen(true);
    else wallet.enter();
  }
  const presentation = useMemo(() => searchReflow(PREVIEW_CARDS, wallet.saved, query, searchOpen && !editing),
    [wallet.saved, query, searchOpen, editing]);

  return <SafeAreaView style={styles.safe}>
    <View style={styles.screen}>
      <View pointerEvents="none" accessible={false} style={styles.canvasLight} />
      <HomeHeader editing={editing} searchOpen={searchOpen} disabled={disabled} onBack={handleBack}
        onSearch={() => { if (searchOpen) { setQuery(''); Keyboard.dismiss(); } setSearchOpen(!searchOpen); }}
        onCreate={openCreate} onLogo={() => { if (editing) handleBack(); }} />
      {searchOpen && <SearchField value={query} onChange={setQuery} />}
      {presentation.active && presentation.matchCount === 0 && <Text accessibilityLiveRegion="polite" style={styles.searchStatus}>No matching cards</Text>}
      {!!wallet.error && <Text accessibilityRole="alert" accessibilityLiveRegion="assertive" style={styles.error}>{wallet.error}</Text>}
      {!wallet.ready ? <View style={styles.loading}><ActivityIndicator color={bemem.muted} /><Text style={styles.loadingText}>Loading saved layout…</Text></View>
        : <WalletCanvas cards={presentation.cards} allCards={PREVIEW_CARDS} layout={editing ? wallet.draft : presentation.layout}
            presentationKey={presentation.key}
            editing={editing} disabled={wallet.saving || wallet.blocked} onMove={wallet.move}
            onOpen={card => setOpenedPreview({ card, fromCreate: editing })} onDragging={handleDragging} />}
      {wallet.ready && <CanvasActions editing={editing} empty={PREVIEW_CARDS.length === 0} dirty={wallet.dirty}
        disabled={disabled || wallet.blocked} saving={wallet.saving}
        onAdd={() => Alert.alert('Add Card · Phase 1', 'Coming soon in Phase 2. Adding real cards is not available yet. No card has been added or saved.')}
        onSave={() => { void wallet.save(); }} />}
      <UnsavedChangesDialog visible={wallet.exitPrompt} saving={wallet.saving}
        onSave={() => { void wallet.save(); }} onDiscard={wallet.discard} onCancel={wallet.cancel} />
      <Modal transparent animationType="slide" visible={proOpen} onRequestClose={() => { handleBack(); }}>
        <View style={styles.modalBackdrop}><View accessibilityViewIsModal style={styles.sheet}>
          <ScrollView contentContainerStyle={styles.sheetContent}>
            <Text accessibilityRole="header" style={styles.sheetTitle}>Create PRO</Text>
            <Text style={styles.description}>Future decoration features. Not available in Phase 1. No purchase or PRO access has been activated.</Text>
            {['Stickers', 'Icons', 'Emojis', 'Card Frames'].map(category =>
              <Text key={category} style={styles.description}>{category} · Coming soon</Text>)}
            <Pressable accessibilityRole="button" onPress={() => setProOpen(false)} style={styles.close}>
              <Text style={styles.closeText}>Back to Create</Text>
            </Pressable>
          </ScrollView>
        </View></View>
      </Modal>
      <CardPreview card={openedPreview?.card ?? null} fromCreate={openedPreview?.fromCreate ?? false}
        onClose={() => setOpenedPreview(null)} />
    </View>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: bemem.background },
  screen: { flex: 1, width: '100%', maxWidth: 600, alignSelf: 'center', backgroundColor: bemem.background },
  canvasLight: { ...StyleSheet.absoluteFill, backgroundImage: `radial-gradient(ellipse at 0% 10%, ${lagoon.canvas.high}, transparent 65%), linear-gradient(120deg, ${lagoon.canvas.base}, ${lagoon.canvas.low})` },
  error: { paddingHorizontal: 20, paddingTop: 8, fontSize: 12, lineHeight: 19, color: bemem.error },
  searchStatus: { paddingHorizontal: 20, paddingTop: 8, fontSize: 14, lineHeight: 22, color: bemem.muted, fontFamily: lagoonFonts.latin },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: bemem.muted, fontSize: 14 },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15,23,42,0.4)' },
  sheet: { backgroundColor: bemem.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden', maxHeight: '92%', width: '100%', maxWidth: 600, alignSelf: 'center' },
  sheetContent: { padding: 24, paddingBottom: 40, gap: 16 },
  sheetTitle: { fontSize: 20, fontWeight: '800', color: bemem.foreground, fontFamily: lagoonFonts.latin },
  description: { fontSize: 14, lineHeight: 22, color: bemem.muted, fontFamily: lagoonFonts.latin },
  close: { minHeight: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: bemem.primary },
  closeText: { color: bemem.white, fontSize: 14, fontWeight: '600' },
});
