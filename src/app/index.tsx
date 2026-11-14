import { ciColors,ciTypography } from '@/constants/ci-theme';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, BackHandler, Keyboard, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CanvasActions } from '@/components/bemem/CanvasActions';
import { CardPreview } from '@/components/bemem/CardPreview';
import { AddCardEditor } from '@/components/bemem/AddCardEditor';
import { WalletMigrationPanel } from '@/components/bemem/WalletMigrationPanel';
import { HomeHeader } from '@/components/bemem/HomeHeader';
import { SearchField } from '@/components/bemem/SearchField';
import { UnsavedChangesDialog } from '@/components/bemem/UnsavedChangesDialog';
import { ConfirmationDialog } from '@/components/bemem/ConfirmationDialog';
import { WalletCanvas } from '@/components/bemem/WalletCanvas';
import { DecorateMode } from '@/components/bemem/DecorateMode';
import { bemem } from '@/constants/bemem-theme';
import { lagoon } from '@/constants/lagoon-theme';
import { useWalletCanvas } from '@/hooks/use-wallet-canvas';
import { backAction } from '@/lib/phase1-navigation';
import { searchReflow } from '@/lib/search-reflow';
import type { PreviewCard } from '@/types/wallet-ui';
import { LockedCanvas } from '@/components/bemem/LockedCanvas';
import { CanvasPagePopoverHost,type CanvasPagePopoverHandle } from '@/components/bemem/CanvasPagePopoverHost';
import { GroupFolderSheet } from '@/components/bemem/GroupFolderSheet';
import { FolderNameSheet } from '@/components/bemem/FolderNameSheet';

export default function HomeScreen() {
  const wallet = useWalletCanvas();
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [openedPreview, setOpenedPreview] = useState<{ card: PreviewCard; fromCreate: boolean; membership: ReturnType<typeof wallet.getCard> } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [proOpen, setProOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [migrationOpen, setMigrationOpen] = useState(false);
  const [openedFolder,setOpenedFolder]=useState<{id:string;ticket:string}|null>(null);
  const currentFolder=wallet.cards.find(c=>c.kind==='folder'&&c.id===openedFolder?.id);
  useEffect(()=>{if(openedFolder&&!currentFolder)setOpenedFolder(null);},[openedFolder,currentFolder]);
  const editing = wallet.mode === 'create';
  const scrollPositions=useRef<Record<string,number>>({});
  const pagePopover=useRef<CanvasPagePopoverHandle>(null);
  const page=wallet.page??1,pageEditable=wallet.pageEditable??true,pageReadable=wallet.pageReadable??true;
  const scrollKey=`${editing?'create':'home'}-${page}`;
  const handleDragging = useCallback((active: boolean) => setDragging(active), []);
  const disabled = !wallet.ready || wallet.saving || dragging || addOpen || migrationOpen || proOpen || !!openedFolder || !!wallet.folderProposal;

  const handleBack = useCallback(() => {
    if(pagePopover.current?.dismiss())return true;
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
    if(disabled||editing)return;
    Keyboard.dismiss(); setSearchOpen(false); setQuery('');
    wallet.enter();
  }
  function openDecorate() {
    if (disabled||editing) return;
    const current = wallet.runtime.getSnapshot();
    if (current.state.source !== 'v2' || !current.state.editsAllowed || current.state.saving || !current.session) {
      Alert.alert('Decorate is unavailable', 'Decorate requires an active, unlocked Wallet v2. Your wallet has not been changed.');
      return;
    }
    Keyboard.dismiss(); setSearchOpen(false); setQuery('');
    if (!editing && wallet.enter()===false) return;
    if(wallet.runtime.pages&&!wallet.runtime.pages.access()[wallet.runtime.pages.current()-1].editable)return;
    setProOpen(true);
  }
  function openAddCard() {
    if(disabled||!pageEditable)return;
    if (!editing && wallet.enter()===false) return;
    setAddOpen(true);
  }
  const presentation = useMemo(() => {
    try { const crossPage=searchOpen&&!editing&&query.trim().length>0;
      return { ...searchReflow(crossPage?wallet.searchCards??wallet.savedCards:wallet.savedCards,crossPage?wallet.searchLayout??wallet.saved:wallet.saved, query, searchOpen && !editing,crossPage?Infinity:undefined), error: '' }; }
    catch { return { cards: wallet.savedCards, layout: wallet.saved, active: false, matchCount: 0, key: '',
      error: 'Search results could not fit the current canvas. Showing the saved layout; no cards were moved.' }; }
  },
    [wallet.savedCards, wallet.saved,wallet.searchCards,wallet.searchLayout, query, searchOpen, editing]);

  const screen = <SafeAreaView style={styles.safe}>
    <CanvasPagePopoverHost ref={pagePopover}>
    <View style={styles.screen}>
      <View pointerEvents="none" accessible={false} style={styles.canvasLight} />
      <HomeHeader editing={editing} searchOpen={searchOpen} disabled={disabled} onBack={handleBack}
        page={page} pageDestinations={wallet.pageAccess} onPage={wallet.selectPage}
        saveRequired={editing&&wallet.dirty&&pageEditable} saveDisabled={wallet.blocked||!pageEditable} saving={wallet.saving} onSave={()=>{void wallet.save();}}
        onSearch={() => { if (searchOpen) { setQuery(''); Keyboard.dismiss(); } setSearchOpen(!searchOpen); }}
        onCreate={openCreate} onDecorate={openDecorate} onAdd={openAddCard} addDisabled={wallet.blocked||!pageEditable} onLogo={() => { if (editing) handleBack(); }} />
      {searchOpen && <SearchField value={query} onChange={setQuery} />}
      {editing && wallet.source === 'v1' && <Pressable accessibilityRole="button" disabled={disabled || wallet.blocked} onPress={() => setMigrationOpen(true)}>
        <Text style={styles.searchStatus}>Wallet v1 · Review Wallet v2</Text>
      </Pressable>}
      {wallet.blocked && <Pressable accessibilityRole="button"
        disabled={wallet.snapshot.state.phase === 'activation_incomplete' && !wallet.runtime.cutoverApproved} onPress={() => { void wallet.reinspect(); }}>
        <Text style={styles.searchStatus}>{wallet.snapshot.state.phase === 'activation_incomplete'
          ? wallet.runtime.cutoverApproved ? 'Retry activation' : 'Awaiting Wallet v2 approval' : 'Reinspect wallet'}</Text>
      </Pressable>}
      {presentation.active && presentation.matchCount === 0 && <Text accessibilityLiveRegion="polite" style={styles.searchStatus}>No matching cards</Text>}
      {!!presentation.error && <Text accessibilityRole="alert" style={styles.error}>{presentation.error}</Text>}
      {!!wallet.error && <Text accessibilityRole="alert" accessibilityLiveRegion="assertive" style={styles.error}>{wallet.error}</Text>}
      {!wallet.ready ? <View style={styles.loading}><ActivityIndicator color={bemem.muted} /><Text style={styles.loadingText}>Loading saved layout…</Text></View>
        : editing&&!pageEditable?<View style={styles.loading}/>:!pageReadable?<LockedCanvas/>:<WalletCanvas key={scrollKey} cards={editing ? wallet.cards : presentation.cards} allCards={wallet.cards} layout={editing ? wallet.draft : presentation.layout}
            maxRows={presentation.active?Infinity:undefined}
            initialScrollY={presentation.active?0:scrollPositions.current[scrollKey]??0} onScrollY={y=>{if(!presentation.active)scrollPositions.current[scrollKey]=y;}}
            presentationKey={presentation.key}
            editing={editing} disabled={wallet.saving || wallet.blocked || addOpen || migrationOpen || !!openedFolder || !!wallet.folderProposal} onMove={wallet.move}
            onFolderDrop={editing?wallet.groupDrop:undefined}
            onOpen={card => {if(!editing)wallet.focusCard?.(card.id);if(card.kind==='folder'){setOpenedFolder({id:card.id,ticket:wallet.folderTicket()});return;}setOpenedPreview({ card, fromCreate: editing, membership: wallet.getCard(card.id) });}} onDragging={handleDragging} />}
      {wallet.ready&&pageEditable && <CanvasActions editing={editing} empty={wallet.cards.every(card => card.kind === 'decoration')}
        disabled={disabled || wallet.blocked} onAdd={openAddCard} />}
      <UnsavedChangesDialog visible={wallet.exitPrompt} saving={wallet.saving}
        onSave={() => { void wallet.save(); }} onDiscard={wallet.discard} onCancel={wallet.cancel} />
      <ConfirmationDialog request={wallet.pageConfirmation??null} busy={wallet.pageConfirmationBusy}/>
      {proOpen && <DecorateMode wallet={wallet} onClose={() => {setProOpen(false);wallet.finishDecorate();}}
        onSaved={() => { setProOpen(false); wallet.finishDecorate(); }} />}
      <CardPreview card={pageReadable&&(!wallet.runtime.pages||wallet.getCard(openedPreview?.card.id??''))?openedPreview?.card??null:null} fromCreate={openedPreview?.fromCreate ?? false}
        editCommands={wallet.runtime.features}
        membership={openedPreview ? wallet.getCard(openedPreview.card.id) ?? openedPreview.membership : null}
        onClose={() => {setOpenedPreview(null);if(openedFolder)setOpenedFolder({...openedFolder,ticket:wallet.folderTicket()});}} onHome={() => { setOpenedPreview(null);setOpenedFolder(null); if (editing) wallet.leave(); }} />
      {currentFolder&&!openedPreview&&<GroupFolderSheet folder={currentFolder} editing={editing&&pageEditable&&!wallet.blocked&&!wallet.saving} error={wallet.error}
        onClose={()=>setOpenedFolder(null)} onOpen={card=>setOpenedPreview({card,fromCreate:editing,membership:wallet.getCard(card.id)})}
        onRename={name=>{const ok=wallet.renameFolder(currentFolder.id,name,openedFolder!.ticket);if(ok)setOpenedFolder({id:currentFolder.id,ticket:wallet.folderTicket()});return ok;}}
        onUngroup={()=>{const ok=wallet.ungroupFolder(currentFolder.id,openedFolder!.ticket);if(ok)setOpenedFolder(null);return ok;}}/>}
      {wallet.folderProposal&&<FolderNameSheet error={wallet.error} onCancel={wallet.cancelFolderProposal} onConfirm={wallet.confirmFolder}/>}
      {migrationOpen && <WalletMigrationPanel onClose={() => setMigrationOpen(false)} />}
    </View></CanvasPagePopoverHost>
  </SafeAreaView>;
  return addOpen ? <AddCardEditor commands={wallet.runtime.features} background={screen} disabled={wallet.saving || wallet.blocked}
    v2Active={wallet.source === 'v2'} onClose={() => setAddOpen(false)} onAdded={() => setAddOpen(false)} /> : screen;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: bemem.background },
  screen: { flex: 1, width: '100%', maxWidth: 600, alignSelf: 'center', backgroundColor: bemem.background },
  canvasLight: { ...StyleSheet.absoluteFill, backgroundImage: `radial-gradient(ellipse at 0% 10%, ${lagoon.canvas.high}, transparent 65%), linear-gradient(120deg, ${lagoon.canvas.base}, ${lagoon.canvas.low})` },
  error: { ...ciTypography.supporting, fontWeight:'400', paddingHorizontal:20, paddingTop:8, lineHeight:19, color:ciColors.status.error },
  searchStatus: { ...ciTypography.body, paddingHorizontal:20, paddingTop:8, color:ciColors.text.secondary },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { ...ciTypography.body, color:ciColors.text.secondary },
});
