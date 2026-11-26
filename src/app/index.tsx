import { ciColors,ciTypography } from '@/constants/ci-theme';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, BackHandler, Keyboard, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { KeepsFeature } from '@/components/bemem/KeepsFeature';
import { KeepNotificationBridge } from '@/components/bemem/KeepNotificationBridge';
import { GlassButton } from '@/components/bemem/GlassButton';
import { CardPreview } from '@/components/bemem/CardPreview';
import { AddCardEditor,type AddCardEditorHandle } from '@/components/bemem/AddCardEditor';
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
import { ContextualFooter,type ContextualFooterHandle } from '@/components/bemem/ContextualFooter';
import { GroupFolderSheet } from '@/components/bemem/GroupFolderSheet';
import { FolderNameSheet } from '@/components/bemem/FolderNameSheet';

export default function HomeScreen() {
  const [keepsRecoveryOpen,setKeepsRecoveryOpen]=useState(false);
  const [notificationKeep,setNotificationKeep]=useState<{cardId:string;keepId:string;generation:number;source:string|null|undefined}|null>(null);
  const [notificationUnavailable,setNotificationUnavailable]=useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wallet = useWalletCanvas(searchOpen&&query.trim().length>0);
  const [openedPreview, setOpenedPreview] = useState<{ card: PreviewCard; fromCreate: boolean; membership: ReturnType<typeof wallet.getCard> } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [proOpen, setProOpen] = useState(false);
  const [shellWidth,setShellWidth]=useState<number|undefined>(undefined),decorateScroll=useRef(0);
  const [addOpen, setAddOpen] = useState(false);
  const addCard=useRef<AddCardEditorHandle>(null);
  const [migrationOpen, setMigrationOpen] = useState(false);
  const [openedFolder,setOpenedFolder]=useState<{id:string;ticket:string}|null>(null);
  const currentFolder=wallet.cards.find(c=>c.kind==='folder'&&c.id===openedFolder?.id);
  useEffect(()=>{if(openedFolder&&!currentFolder)setOpenedFolder(null);},[openedFolder,currentFolder]);
  const editing = wallet.mode === 'create';
  const scrollPositions=useRef<Record<string,number>>({});
  const pagePopover=useRef<ContextualFooterHandle>(null);
  const [footerExpanded,setFooterExpanded]=useState(false);
  useEffect(()=>{if(addOpen)pagePopover.current?.dismiss();},[addOpen]);
  const sheetBack=useRef<(()=>void)|null>(null);
  const registerSheetBack=useCallback((handler:(()=>void)|null)=>{sheetBack.current=handler;},[]);
  const [sheetBlocked,setSheetBlocked]=useState(false),[navigationClosing,setNavigationClosing]=useState(false);
  const pendingNavigation=useRef<{action:()=>void;generation:number;mode:string;page:number}|null>(null);
  // UI session invalidation only; never retain old artwork to finish an exit.
  const previewOwner=useRef<{request:typeof openedPreview;generation:number;source:string|null|undefined}|null>(null);
  const previewState=wallet.runtime.getSnapshot().state;
  const notificationCurrent=!notificationKeep||notificationKeep.generation===previewState.generation&&notificationKeep.source===previewState.source&&!!wallet.runtime.getSnapshot().session?.saved.cards.some(c=>c.kind==='membership'&&c.id===notificationKeep.cardId);
  useEffect(()=>{if(notificationKeep&&!notificationCurrent){setNotificationKeep(null);setNotificationUnavailable(true);}},[notificationKeep,notificationCurrent]);
  if(previewOwner.current?.request!==openedPreview)previewOwner.current={request:openedPreview,generation:previewState.generation,source:previewState.source};
  const previewCurrent=!openedPreview||previewOwner.current?.generation===previewState.generation&&previewOwner.current?.source===previewState.source;
  const previewLatest=useRef({openedPreview,openedFolder,wallet});previewLatest.current={openedPreview,openedFolder,wallet};
  function closeCardDetail(request:typeof openedPreview){
    const current=previewLatest.current;if(current.openedPreview!==request)return;
    setOpenedPreview(null);
    if(pendingNavigation.current)setOpenedFolder(null);
    else if(current.openedFolder)setOpenedFolder({...current.openedFolder,ticket:current.wallet.folderTicket()});
  }
  function cancelDetailDismissal(request:typeof openedPreview){
    if(previewLatest.current.openedPreview!==request)return;pendingNavigation.current=null;setNavigationClosing(false);
  }


  const page=wallet.page??1,pageEditable=wallet.pageEditable??true,pageReadable=wallet.pageReadable??true;
  useEffect(()=>{
    if(!openedPreview)return;
    if(previewCurrent&&pageReadable&&(!wallet.runtime.pages||wallet.getCard(openedPreview.card.id)))return;
    // Forced invalidation cancels visual navigation; no stale snapshot waits for animation.
    pendingNavigation.current=null;setNavigationClosing(false);setOpenedPreview(null);setOpenedFolder(null);
  },[openedPreview,previewCurrent,pageReadable,wallet]);
  const scrollKey=`${editing?'create':'home'}-${page}`;
  const handleDragging = useCallback((active: boolean) => setDragging(active), []);
  const disabled = !!notificationKeep || notificationUnavailable || keepsRecoveryOpen || !wallet.ready || wallet.saving || dragging || migrationOpen || proOpen || !!wallet.folderProposal || sheetBlocked || navigationClosing || wallet.exitPrompt || !!wallet.pageConfirmation;

  // Ordinary sheets unmount in one committed render before consuming a navigation intent.
  function navigate(action:()=>void){
    if(disabled||wallet.runtime.getSnapshot().state.saving||wallet.navigationPending?.()||pendingNavigation.current)return;
    if(!openedPreview&&!openedFolder&&!addOpen){action();return;}
    const request={action,generation:wallet.runtime.getSnapshot().state.generation,mode:wallet.mode,page};
    pendingNavigation.current=request;setNavigationClosing(true);
    if(addOpen){
      const cancel=()=>{if(pendingNavigation.current!==request)return;pendingNavigation.current=null;setNavigationClosing(false);};
      if(!addCard.current?.requestClose(cancel))cancel();
      return;
    }
    if(openedPreview&&sheetBack.current){sheetBack.current();return;}
    setOpenedPreview(null);setOpenedFolder(null);
  }
  useEffect(()=>{
    const pending=pendingNavigation.current;if(!pending||openedPreview||openedFolder||addOpen)return;
    pendingNavigation.current=null;setNavigationClosing(false);
    const current=wallet.runtime.getSnapshot();
    if(current.state.generation!==pending.generation||current.state.saving||wallet.mode!==pending.mode||page!==pending.page)return;
    pending.action();
  },[openedPreview,openedFolder,addOpen,navigationClosing,wallet,page]);
  useEffect(()=>()=>{pendingNavigation.current=null;},[]);
  function home(){Keyboard.dismiss();setSearchOpen(false);setQuery('');if(editing)wallet.leave();}

  const handleBack = useCallback(() => {
    // Same-window Decorate owns Back, including its dirty-session confirmation.
    if(proOpen)return false;
    if(addOpen){if(Keyboard.isVisible?.()){Keyboard.dismiss();return true;}addCard.current?.back();return true;}
    if(pendingNavigation.current)return true;
    if(pagePopover.current?.dismiss())return true;
    if(openedPreview){if(sheetBack.current){sheetBack.current();return true;}setOpenedPreview(null);if(openedFolder)setOpenedFolder({...openedFolder,ticket:wallet.folderTicket()});return true;}
    if(openedFolder){if(sheetBack.current)sheetBack.current();else setOpenedFolder(null);return true;}
    switch (backAction({ mode: wallet.mode, proOpen, searchOpen, blocked: wallet.saving || dragging })) {
      case 'blocked': return true;
      case 'close-pro': setProOpen(false); return true;
      case 'close-search': setSearchOpen(false); setQuery(''); Keyboard.dismiss(); return true;
      case 'leave-create': wallet.leave(); return true;
      case 'system-back': return false;
    }
  }, [wallet, proOpen, searchOpen, dragging,openedPreview,openedFolder,addOpen]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', handleBack);
    return () => subscription.remove();
  }, [handleBack]);

  function openCreate() {
    if(disabled)return;
    if(editing)return;
    Keyboard.dismiss(); setSearchOpen(false); setQuery('');
    wallet.enter();
  }
  function openDecorate() {
    if (disabled||proOpen) return;
    const current = wallet.runtime.getSnapshot();
    if (current.state.source !== 'v2' || !current.state.editsAllowed || current.state.saving || !current.session) {
      Alert.alert('Decorate is unavailable', 'Decorate requires an active, unlocked Wallet v2. Your wallet has not been changed.');
      return;
    }
    Keyboard.dismiss(); setSearchOpen(false); setQuery('');
    if (!editing && wallet.enter()===false) return;
    if(wallet.runtime.pages&&!wallet.runtime.pages.access()[wallet.runtime.pages.current()-1].editable)return;
    decorateScroll.current=scrollPositions.current[scrollKey]??0;
    if(editing)wallet.leave(()=>setProOpen(true));else setProOpen(true);
  }
  function openAddCard() {
    if(disabled)return;
    if(!pageEditable)return;
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
    <View style={styles.screen} onLayout={event=>setShellWidth(event.nativeEvent.layout.width)}>
    <View onTouchStart={()=>pagePopover.current?.dismiss()}>
      <HomeHeader editing={editing} searchOpen={searchOpen} disabled={disabled||wallet.blocked} cancelDisabled={disabled}
        saving={wallet.saving} saveDisabled={!pageEditable||!wallet.dirty||wallet.blocked||addOpen}
        onCancel={()=>navigate(home)} onSave={()=>navigate(()=>{void wallet.save();})}
        onSearch={() => navigate(()=>{ if (searchOpen) { setQuery(''); Keyboard.dismiss(); } setSearchOpen(!searchOpen); })} />
    </View>
    <View style={styles.content}>
    <View style={styles.content} accessibilityElementsHidden={footerExpanded||!!openedPreview||!!openedFolder||addOpen} importantForAccessibility={footerExpanded||openedPreview||openedFolder||addOpen?'no-hide-descendants':'auto'}>
      <View pointerEvents="none" accessible={false} style={styles.canvasLight} />
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
      {/* Retain access to global recovery even if the last parent card was deleted. No scan until opened. */}
      {!editing&&wallet.ready&&wallet.source==='v2'&&wallet.snapshot.session?.saved.cards?.some(card=>card.kind==='membership')===false&&<GlassButton accessibilityLabel="My Keeps recovery" disabled={disabled} onPress={()=>setKeepsRecoveryOpen(true)}><Text style={styles.searchStatus}>My Keeps recovery</Text></GlassButton>}
      {!!wallet.error && <Text accessibilityRole="alert" accessibilityLiveRegion="assertive" style={styles.error}>{wallet.error}</Text>}
      {!wallet.ready ? <View style={styles.loading}><ActivityIndicator color={bemem.muted} /><Text style={styles.loadingText}>Loading saved layout…</Text></View>
        : editing&&!pageEditable?<View style={styles.loading}/>:<WalletCanvas key={scrollKey} cards={editing ? wallet.cards : presentation.cards} allCards={wallet.cards} layout={editing ? wallet.draft : presentation.layout}
            maxRows={presentation.active?Infinity:undefined}
            initialScrollY={presentation.active?0:scrollPositions.current[scrollKey]??0} onScrollY={y=>{if(!presentation.active)scrollPositions.current[scrollKey]=y;}}
            presentationKey={presentation.key}
            editing={editing} disabled={wallet.saving || wallet.blocked || addOpen || migrationOpen || !!openedFolder || !!openedPreview || !!wallet.folderProposal} onMove={wallet.move}
            onFolderDrop={editing?wallet.groupDrop:undefined}
            onOpen={card => {if(!editing)wallet.focusCard?.(card.id);if(card.kind==='folder'){setOpenedFolder({id:card.id,ticket:wallet.folderTicket()});return;}setOpenedPreview({ card, fromCreate: editing, membership: wallet.getCard(card.id) });}} onDragging={handleDragging} />}
    </View>
      <UnsavedChangesDialog visible={wallet.exitPrompt} saving={wallet.saving}
        onSave={() => { void wallet.save({exitAfterSave:true}); }} onDiscard={wallet.discard} onCancel={wallet.cancel} />
      <ConfirmationDialog request={wallet.pageConfirmation??null} busy={wallet.pageConfirmationBusy}/>
      {addOpen&&<AddCardEditor ref={addCard} onNavigationBlockedChange={setSheetBlocked} commands={wallet.runtime.features} background={null}
        disabled={wallet.saving||wallet.blocked} v2Active={wallet.source==='v2'} onClose={()=>setAddOpen(false)} onAdded={()=>setAddOpen(false)}/>}
      <CardPreview sessionKey={openedPreview??undefined} onDismissCancelled={()=>cancelDetailDismissal(openedPreview)} onBackHandler={registerSheetBack} presentation="inline" onNavigationBlockedChange={setSheetBlocked} card={previewCurrent&&pageReadable&&(!wallet.runtime.pages||wallet.getCard(openedPreview?.card.id??''))?openedPreview?.card??null:null} fromCreate={openedPreview?.fromCreate ?? false}
        editCommands={wallet.runtime.features}
        membership={openedPreview ? wallet.getCard(openedPreview.card.id) ?? openedPreview.membership : null}
        onClose={() => closeCardDetail(openedPreview)} onHome={() => { setOpenedPreview(null);setOpenedFolder(null); if (editing) wallet.leave(); }} />
      {currentFolder&&!openedPreview&&<GroupFolderSheet presentation="inline" onBackHandler={registerSheetBack} onNavigationBlockedChange={setSheetBlocked} folder={currentFolder} editing={editing&&pageEditable&&!wallet.blocked&&!wallet.saving} error={wallet.error}
        onClose={()=>setOpenedFolder(null)} onOpen={card=>setOpenedPreview({card,fromCreate:editing,membership:wallet.getCard(card.id)})}
        onRename={name=>{const ok=wallet.renameFolder(currentFolder.id,name,openedFolder!.ticket);if(ok)setOpenedFolder({id:currentFolder.id,ticket:wallet.folderTicket()});return ok;}}
        onUngroup={()=>{const ok=wallet.ungroupFolder(currentFolder.id,openedFolder!.ticket);if(ok)setOpenedFolder(null);return ok;}}/>}
      {wallet.folderProposal&&<FolderNameSheet error={wallet.error} onCancel={wallet.cancelFolderProposal} onConfirm={wallet.confirmFolder}/>}
      {keepsRecoveryOpen&&<KeepsFeature onClose={()=>setKeepsRecoveryOpen(false)}/>}
      <KeepNotificationBridge blocked={disabled||editing||proOpen||addOpen||!!openedPreview||!!openedFolder||footerExpanded||wallet.dirty}
        onOpen={target=>{const card=wallet.runtime.getSnapshot().session?.saved.cards.find(c=>c.kind==='membership'&&c.id===target.cardId);if(card?.kind==='membership'){const owner=wallet.runtime.getSnapshot().state;setNotificationKeep({...target,generation:owner.generation,source:owner.source});}else setNotificationUnavailable(true);}}
        onUnavailable={()=>setNotificationUnavailable(true)}/>
      {notificationKeep&&notificationCurrent&&(()=>{const card=wallet.runtime.getSnapshot().session?.saved.cards.find(c=>c.kind==='membership'&&c.id===notificationKeep.cardId);return card?.kind==='membership'?<KeepsFeature key={`${card.id}:${notificationKeep.keepId}`} card={card} initialKeepId={notificationKeep.keepId} onClose={()=>setNotificationKeep(null)}/>:null;})()}
      <ConfirmationDialog request={notificationUnavailable?{id:'notification-target-unavailable',title:'Reminder unavailable',description:'This Keep could not be verified in the current wallet. No data was changed.',onDismiss:()=>setNotificationUnavailable(false),actions:[{label:'Back to Home',role:'primary',onPress:()=>setNotificationUnavailable(false)}]}:null}/>

      {migrationOpen && <WalletMigrationPanel onClose={() => setMigrationOpen(false)} />}
    {footerExpanded&&<Pressable accessibilityRole="button" accessibilityLabel="Close canvas selector" style={StyleSheet.absoluteFill} onPress={()=>pagePopover.current?.dismiss()}/>}
    </View>
    <View testID="shared-footer-host" pointerEvents={addOpen?'none':'auto'} accessibilityElementsHidden={addOpen} importantForAccessibility={addOpen?'no-hide-descendants':'auto'}>
    <ContextualFooter ref={pagePopover} mode={editing?'Create':'Home'} page={page} destinations={wallet.pageAccess} onPage={next=>navigate(()=>wallet.selectPage(next))}
      onExpandedChange={setFooterExpanded} disabled={disabled||addOpen} actionsBlocked={wallet.blocked} saving={wallet.saving}
      onCanvasRequest={()=>navigate(()=>pagePopover.current?.toggle())}
      onHome={()=>navigate(home)} onCreate={()=>navigate(openCreate)} onDecorate={()=>navigate(openDecorate)} onAdd={()=>{if(!addOpen)navigate(openAddCard);}}/>
    </View>
    </View>
  </SafeAreaView>;
  // A single same-window shell is mounted: no underlying Create Header/Footer.
  if(proOpen)return <DecorateMode presentation="screen" availableWidth={shellWidth} initialScrollY={decorateScroll.current} wallet={wallet} onClose={() => {setProOpen(false);wallet.finishDecorate();}}
        onSaved={() => { setProOpen(false); wallet.finishDecorate(); }}
        onNavigate={destination=>{setProOpen(false);wallet.finishDecorate(destination==='home'?'home':'create');if(destination==='add')setAddOpen(true);}} />;
  return screen;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: bemem.background },
  content:{flex:1},
  screen: { flex: 1, width: '100%', maxWidth: 600, alignSelf: 'center', backgroundColor: bemem.background },
  canvasLight: { ...StyleSheet.absoluteFill, backgroundColor: lagoon.canvas.base },
  error: { ...ciTypography.supporting, fontWeight:'400', paddingHorizontal:20, paddingTop:8, lineHeight:19, color:ciColors.status.error },
  searchStatus: { ...ciTypography.body, paddingHorizontal:20, paddingTop:8, color:ciColors.text.secondary },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { ...ciTypography.body, color:ciColors.text.secondary },
});
