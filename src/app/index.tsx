import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, BackHandler, Keyboard, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CanvasActions } from '@/components/bemem/CanvasActions';
import { HomeHeader } from '@/components/bemem/HomeHeader';
import { MembershipCard } from '@/components/bemem/MembershipCard';
import { SearchField } from '@/components/bemem/SearchField';
import { UnsavedChangesDialog } from '@/components/bemem/UnsavedChangesDialog';
import { WalletCanvas } from '@/components/bemem/WalletCanvas';
import { bemem } from '@/constants/bemem-theme';
import { PREVIEW_CARDS } from '@/data/wallet-preview';
import { useWalletCanvas } from '@/hooks/use-wallet-canvas';
import { backAction, primaryHeaderAction } from '@/lib/phase1-navigation';
import type { PreviewCard } from '@/types/wallet-ui';

export default function HomeScreen() {
  const wallet = useWalletCanvas();
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [openedCard, setOpenedCard] = useState<PreviewCard | null>(null);
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
  const cards = PREVIEW_CARDS.filter(card => card.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));

  return <SafeAreaView style={styles.safe}>
    <View style={styles.screen}>
      <HomeHeader editing={editing} searchOpen={searchOpen} disabled={disabled} onBack={handleBack}
        onSearch={() => { if (searchOpen) { setQuery(''); Keyboard.dismiss(); } setSearchOpen(!searchOpen); }}
        onCreate={openCreate} onLogo={() => { if (editing) handleBack(); }} />
      {searchOpen && <SearchField value={query} onChange={setQuery} />}
      <View style={styles.statusRow}>
        <Text style={styles.status}>{editing ? 'Create · ลากบัตรเพื่อจัดวาง' : 'บัตรตัวอย่าง · Phase 1'}</Text>
        {editing && <Text style={styles.status}>{wallet.dirty ? 'ยังไม่ได้บันทึก' : 'ไม่มีการเปลี่ยนแปลง'}</Text>}
      </View>
      {!!wallet.error && <Text accessibilityRole="alert" accessibilityLiveRegion="assertive" style={styles.error}>{wallet.error}</Text>}
      {!wallet.ready ? <View style={styles.loading}><ActivityIndicator color={bemem.muted} /><Text style={styles.loadingText}>กำลังอ่านผังในเครื่อง…</Text></View>
        : <WalletCanvas cards={cards} allCards={PREVIEW_CARDS} layout={editing ? wallet.draft : wallet.saved}
            editing={editing} disabled={wallet.saving || wallet.blocked} onMove={wallet.move}
            onOpen={setOpenedCard} onDragging={handleDragging} />}
      {wallet.ready && <CanvasActions editing={editing} empty={PREVIEW_CARDS.length === 0} dirty={wallet.dirty}
        disabled={disabled || wallet.blocked} saving={wallet.saving}
        onAdd={() => Alert.alert('Add Card · Phase 1', 'ยังไม่เปิดระบบเพิ่มบัตรจริง ปุ่มนี้เตรียมไว้สำหรับระยะที่ 2 และไม่ได้เพิ่มหรือบันทึกบัตรใด ๆ')}
        onSave={() => { void wallet.save(); }} />}
      <UnsavedChangesDialog visible={wallet.exitPrompt} saving={wallet.saving}
        onSave={() => { void wallet.save(); }} onDiscard={wallet.discard} onCancel={wallet.cancel} />
      <Modal transparent animationType="slide" visible={proOpen} onRequestClose={() => { handleBack(); }}>
        <View style={styles.modalBackdrop}><View accessibilityViewIsModal style={styles.sheet}>
          <ScrollView contentContainerStyle={styles.sheetContent}>
            <Text accessibilityRole="header" style={styles.sheetTitle}>Create PRO</Text>
            <Text style={styles.description}>ฟีเจอร์ตกแต่งในอนาคต ยังไม่เปิดใช้งานใน Phase 1 ไม่มีการซื้อหรือเปิดสิทธิ์ PRO</Text>
            {['Stickers', 'Icons', 'Emojis', 'Card Frames'].map(category =>
              <Text key={category} style={styles.description}>{category} · เร็ว ๆ นี้</Text>)}
            <Pressable accessibilityRole="button" onPress={() => setProOpen(false)} style={styles.close}>
              <Text style={styles.closeText}>กลับสู่ Create</Text>
            </Pressable>
          </ScrollView>
        </View></View>
      </Modal>
      <Modal transparent animationType="slide" visible={openedCard !== null} onRequestClose={() => setOpenedCard(null)}>
        <View style={styles.modalBackdrop}><View accessibilityViewIsModal style={styles.sheet}>
          <ScrollView contentContainerStyle={styles.sheetContent}>
          {openedCard && <>
            <Text accessibilityRole="header" style={styles.sheetTitle}>{openedCard.name}</Text>
            <View style={{ width: '100%', aspectRatio: openedCard.orientation === 'portrait' ? 2 / 3 : 1.5, maxHeight: 320 }}>
              <MembershipCard card={openedCard} />
            </View>
            <Text style={styles.description}>บัตรสมมติสำหรับทดสอบหน้าตาเท่านั้น ยังไม่มี QR Code หรือ Code 128 และใช้สแกนไม่ได้ใน Phase 1</Text>
          </>}
          <Pressable accessibilityRole="button" onPress={() => setOpenedCard(null)} style={styles.close}><Text style={styles.closeText}>Close</Text></Pressable>
          </ScrollView>
        </View></View>
      </Modal>
    </View>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: bemem.background },
  screen: { flex: 1, width: '100%', maxWidth: 600, alignSelf: 'center', backgroundColor: bemem.background },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', paddingHorizontal: 20, paddingTop: 12 },
  status: { fontSize: 11, color: bemem.muted, lineHeight: 18 },
  error: { paddingHorizontal: 20, paddingTop: 8, fontSize: 12, lineHeight: 19, color: bemem.error },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: bemem.muted, fontSize: 14 },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15,23,42,0.4)' },
  sheet: { backgroundColor: bemem.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden', maxHeight: '92%', width: '100%', maxWidth: 600, alignSelf: 'center' },
  sheetContent: { padding: 24, paddingBottom: 40, gap: 16 },
  sheetTitle: { fontSize: 20, fontWeight: '800', color: bemem.foreground },
  description: { fontSize: 14, lineHeight: 22, color: bemem.muted },
  close: { minHeight: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: bemem.primary },
  closeText: { color: bemem.white, fontSize: 14, fontWeight: '600' },
});
