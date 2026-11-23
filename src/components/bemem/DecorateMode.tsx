import { ciColors,ciTypography,ciStates } from '../../constants/ci-theme';
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import { ActivityIndicator, BackHandler, Modal, PanResponder, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { useWalletCanvas } from '../../hooks/use-wallet-canvas';
import { bemem } from '../../constants/bemem-theme';
import { DECORATION_ASSETS, DECORATION_COLLECTIONS, type DecorationAssetId } from '../../lib/decoration-catalog';
import { createDecorateSession, decorationDropCell, decorationGhostFrame, decorationTouchOffset, type DecorationDropGeometry, type DecorateResult } from '../../lib/decorate-session';
import { createCardInteraction } from '../../lib/card-interaction';
import { canPlace } from '../../lib/canvas-layout';
import { walletCanvasPresentation } from '../../lib/wallet-preparation';
import type { Position } from '../../types/wallet-ui';
import { WalletCanvas } from './WalletCanvas';
import { NavigationHeader } from './NavigationHeader';
import { ContextualFooter,type ContextualFooterHandle } from './ContextualFooter';
import { DecorationImage } from './DecorationImage';
import { BememIcon } from './BememIcon';
import { AddCardIcon } from './AddCardIcon';


import type { CanvasPage } from '../../lib/canvas-pages';
import { ConfirmationDialog,type ConfirmationRequest } from './ConfirmationDialog';
import { decorationPages, decorationPickerGeometry, DRAWER_COLUMNS, DRAWER_ROWS } from '../../lib/decoration-pagination';

type Point = { x: number; y: number };
const saveInk = ciColors.action.positiveSave;
// Reuse artwork; these controls never enter the decoration document or drag handler.
const collectionSymbols: Record<string, DecorationAssetId> = {
  pets:'pet-paw', travel:'travel-suitcase', wellness:'wellness-flower',
  cafe:'cafe-coffee', shopping:'shopping-bag', savings:'savings-piggy',
};
type AssetProps = { assetId: DecorationAssetId; unit: number; cellSize?: number; cellHeight?:number; disabled: boolean; selected: boolean;
  onSelect: (id: DecorationAssetId) => void; onDrag: (id: DecorationAssetId, point: Point) => void;
  onDrop: (id: DecorationAssetId, point: Point) => void; onEnd: () => void };
function DrawerAsset(props: AssetProps) {
  const current = useRef(props); current.current = props;
  const point = useRef<Point>({ x: 0, y: 0 });
  const target=useRef<ComponentRef<typeof View>>(null),touchOffset=useRef<Point|null>(null),gestureEpoch=useRef(0);
  const windowPoint=()=>touchOffset.current?{x:point.current.x+touchOffset.current.x,y:point.current.y+touchOffset.current.y}:null;
  function publish(){const value=windowPoint();if(value)current.current.onDrag(current.current.assetId,value);}
  const interaction = useMemo(() => createCardInteraction({
    onTap: () => current.current.onSelect(current.current.assetId),
    onDragStart: publish,
    onDragMove: publish,
    onDrop: () => {const value=windowPoint();if(value)current.current.onDrop(current.current.assetId,value);}, onDragEnd: () => current.current.onEnd(),
  }), []);
  useEffect(() => () => {++gestureEpoch.current;interaction.cancel();}, [interaction]);
  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: (_, g) => !current.current.disabled && g.numberActiveTouches === 1,
    onMoveShouldSetPanResponder: () => false,
    onPanResponderGrant: (event, g) => {
      const epoch=++gestureEpoch.current;point.current={x:g.x0,y:g.y0};touchOffset.current=null;
      const touch=event?.nativeEvent;
      interaction.start();
      // Null events exist only in the headless responder tests. Native touches
      // require a real measurement; an unmeasured drag never writes a position.
      if(!touch)touchOffset.current={x:0,y:0};
      else target.current?.measureInWindow((x,y)=>{if(epoch!==gestureEpoch.current)return;touchOffset.current=decorationTouchOffset({x,y},touch);if(interaction.isDragging())publish();});
    },
    onPanResponderMove: (_, g) => { point.current = { x: g.x0+g.dx, y: g.y0+g.dy }; interaction.move(g.dx, g.dy, g.numberActiveTouches); },
    onPanResponderRelease: (_, g) => { point.current = { x: g.x0+g.dx, y: g.y0+g.dy };++gestureEpoch.current;interaction.release(g.dx, g.dy); },
    onPanResponderTerminate: () => {++gestureEpoch.current;interaction.cancel();},
    onPanResponderTerminationRequest: () => !interaction.isDragging(), onShouldBlockNativeResponder: () => interaction.isDragging(),
  }), [interaction]);
  const label = DECORATION_ASSETS.find(a => a.id === props.assetId)?.label ?? props.assetId;
  return <View ref={target} collapsable={false} {...responder.panHandlers} accessible accessibilityRole="button" accessibilityState={{ disabled: props.disabled, selected: props.selected }}
    accessibilityLabel={`${label}. Hold to drag, or activate then tap an empty cell.`}
    accessibilityActions={[{ name: 'activate', label: `Select ${label} for placement` }]}
    onAccessibilityAction={() => { if (!props.disabled) props.onSelect(props.assetId); }}
    style={[styles.assetTarget, { width:props.cellSize ?? 48,height:props.cellHeight ?? props.cellSize ?? 48, opacity: props.disabled ? 0.45 : 1, borderColor: props.selected ? bemem.primary : 'transparent' }]}>
    <View pointerEvents="none" style={{ width: props.unit, height: props.unit }}><DecorationImage assetId={props.assetId} /></View>
  </View>;
}

/** Mounted only while editing decorations. Home never mounts the drawer or session history. */
type Props={wallet:ReturnType<typeof useWalletCanvas>;onClose:()=>void;onSaved:()=>void;presentation?:'modal'|'screen';availableWidth?:number;initialScrollY?:number;onNavigate?:(destination:'home'|'create'|'add')=>void};
export function DecorateMode(props:Props){
 const owner=props.wallet.runtime?.pages;
 const forbidden=props.wallet.pageEditable===false||!!owner&&!owner.access()[owner.current()-1].editable;
 useEffect(()=>{if(forbidden)props.onClose();},[forbidden,props.onClose]);
 // No writable session (or locked editor surface) is mounted on a stale route.
 // The owner retains any draft; expiry never silently invokes session.cancel().
 if(forbidden)return null;
 return <EditableDecorateMode key={props.wallet.page??1} {...props}/>;
}
export function EditableDecorateMode({ wallet, onClose, onSaved,onNavigate,presentation='modal',availableWidth,initialScrollY }: Props) {
  const alive=useRef(true);useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
  const pagePopover=useRef<ContextualFooterHandle>(null);
  const [session] = useState(() => createDecorateSession(wallet.runtime));
  const [footerExpanded,setFooterExpanded]=useState(false);
  const [state, setState] = useState(session.snapshot);
  const { width:windowWidth } = useWindowDimensions();
  const [collection, setCollection] = useState(DECORATION_COLLECTIONS[0]);
  const [page,setPage] = useState(0);
  const [pickerWidth,setPickerWidth] = useState((availableWidth??Math.min(600,windowWidth))-2);
  const picker=decorationPickerGeometry(pickerWidth);
  const pages=useMemo(()=>decorationPages(collection.assets),[collection]);
  const pageCells=pages[Math.min(page,pages.length-1)];
  const [selected, setSelected] = useState<string | null>(null);
  const [armed, setArmed] = useState<DecorationAssetId | null>(null);
  const [drag, setDrag] = useState<{ assetId: DecorationAssetId; point: Point } | null>(null);
  const [canvasDragging, setCanvasDragging] = useState(false);
  const dragActive=useRef(false),canvasDragActive=useRef(false);
  const [error, setError] = useState('');
  const [unit, setUnit] = useState(28);
  const geometry = useRef<DecorationDropGeometry | null>(null);
  const root = useRef<ComponentRef<typeof View>>(null), rootPoint = useRef<Point|null>(null);
  const [exitDialog,setExitDialog]=useState<ConfirmationRequest|null>(null);
  const exitRequest=useRef<ConfirmationRequest|null>(null),exitSequence=useRef(0);
  const view = useMemo(() => walletCanvasPresentation(state.document,wallet.page??1), [state.document,wallet.page]);
  const refresh = (result?: DecorateResult) => { setState(session.snapshot()); if (result && !result.ok) setError(result.message); else setError(''); };
  function apply(action: Parameters<typeof session.apply>[0]) { refresh(session.apply(action)); }
  function close() {
    const result = session.cancel(); refresh(result);exitRequest.current=null;setExitDialog(null); if (result.ok) onClose();
  }
  function requestClose() {
    if(exitRequest.current){exitRequest.current.onDismiss();return;}
    const latest = session.snapshot(); if (latest.busy || canvasDragging || drag) return;
    if (latest.uncertain) { close(); return; }
    if (!latest.dirty) { close(); return; }
    pagePopover.current?.dismiss();
    const dismiss=()=>{if(exitRequest.current!==request)return;exitRequest.current=null;setExitDialog(null);};
    const request:ConfirmationRequest={id:`decorate-exit-${++exitSequence.current}`,title:'Discard decoration changes?',
      description:'Your saved wallet is unchanged. Return to Home without the changes made in Decorate?',onDismiss:dismiss,
      actions:[{label:'Keep Decorating',role:'primary',onPress:dismiss},{label:'Discard Changes',role:'destructive',onPress:()=>{if(exitRequest.current===request)close();}}]};
    exitRequest.current=request;setExitDialog(request);
  }
  const locked = state.busy || state.uncertain || !wallet.snapshot.state.editsAllowed;
  const interactionLocked = locked || canvasDragging || !!drag || !!exitDialog;
  const measured = useCallback((value: DecorationDropGeometry) => { geometry.current = value; setUnit(previous => Math.abs(previous-value.unit)>0.01 ? value.unit : previous); }, []);
  const dropPosition = drag && geometry.current ? decorationDropCell(drag.point, geometry.current) : null;
  const target = dropPosition && drag ? { position: dropPosition, valid: canPlace({ id: 'new-decoration-target', name: '', orientation: 'landscape', kind: 'decoration', colors: ['#ffffff','#ffffff'] }, dropPosition, view.cards, view.layout) } : null;
  function selectAsset(id: DecorationAssetId) { setSelected(null); setArmed(id); setError(''); }
  function navigationAllowed() {return !dragActive.current && !canvasDragActive.current && !session.snapshot().busy
    && !session.snapshot().uncertain && wallet.runtime.getSnapshot().state.editsAllowed;}
  function changePage(delta:number) {
    if(!navigationAllowed())return;
    setPage(p=>Math.max(0,Math.min(pages.length-1,p+delta)));setArmed(null);setSelected(null);
  }
  function canvasTap(position: Position) {
    if (armed) { apply({ type: 'add', assetId: armed, position }); setArmed(null); }
    setSelected(null);
  }
  function save(){
    if(session.snapshot().busy||canvasDragActive.current||dragActive.current||exitRequest.current)return;
    const work=session.save();refresh();void work.then(result=>{refresh(result);if(result.ok&&alive.current)onSaved();});
  }
  function requestDestination(destination:'home'|'create'|'add'|CanvasPage){
    if(!navigationAllowed()||exitRequest.current||session.snapshot().closed)return;
    const initial=wallet.runtime.getSnapshot(),sourcePage=wallet.runtime.pages?.current()??wallet.page??1,epoch=wallet.runtime.pages?.generation()??0;
    const targetAccess=typeof destination==='number'?wallet.runtime.pages?.access()[destination-1]:undefined;
    if(typeof destination==='number'&&(destination===sourcePage||wallet.runtime.pages&&!targetAccess?.editable))return;
    pagePopover.current?.dismiss();
    const valid=(saved=false,settled=false)=>{
      const current=wallet.runtime.getSnapshot();return alive.current&&current.state.generation===initial.state.generation
        &&(wallet.runtime.pages?.current()??wallet.page??1)===sourcePage&&(wallet.runtime.pages?.generation()??0)===epoch
        &&current.session?.revision===(initial.session?.revision??0)+(saved?1:0)
        &&(saved||settled||JSON.stringify(current.session?.draft)===JSON.stringify(initial.session?.draft))
        &&(typeof destination!=='number'||!wallet.runtime.pages||!!wallet.runtime.pages.access()[destination-1]?.visible&&wallet.runtime.pages.access()[destination-1]?.editable===targetAccess?.editable);
    };
    const finish=()=>{
      exitRequest.current=null;setExitDialog(null);
      if(typeof destination==='number'){
        // Normally entry is clean; retain earlier Create drafts through its existing page guard.
        if(wallet.runtime.getSnapshot().state.dirty){if(onNavigate)onNavigate('create');else onClose();}
        wallet.selectPage(destination);
      }else if(onNavigate)onNavigate(destination);else onClose();
    };
    const settle=async(choice:'save'|'discard')=>{
      if(exitRequest.current!==request||session.snapshot().busy)return;
      if(!valid()){exitRequest.current=null;setExitDialog(null);setError('The editing session changed. Review it before navigating.');return;}
      const work=choice==='save'?session.save():session.cancel();refresh();const result=await work;refresh(result);
      if(!alive.current)return;
      if(result.ok&&valid(choice==='save',true))finish();else{exitRequest.current=null;setExitDialog(null);if(result.ok)setError('The editing session changed. Review it before navigating.');}
    };
    const dismiss=()=>{if(exitRequest.current!==request||session.snapshot().busy)return;exitRequest.current=null;setExitDialog(null);};
    const request:ConfirmationRequest={id:`decorate-navigation-${++exitSequence.current}`,title:'Unsaved changes',
      description:'Save or discard your decoration changes before continuing.',onDismiss:dismiss,
      actions:[{label:'Save',role:'primary',onPress:()=>{void settle('save');}},
        {label:'Discard',role:'destructive',onPress:()=>{void settle('discard');}},
        {label:'Stay',role:'neutral',onPress:dismiss}]};
    exitRequest.current=request;
    if(wallet.runtime.getSnapshot().state.dirty){setExitDialog(request);return;}
    void settle('discard');
  }
  function changeCanvas(next:CanvasPage){requestDestination(next);}
  const requestBack=()=>{if(!pagePopover.current?.dismiss())requestClose();};
  const latestBack=useRef(requestBack);latestBack.current=requestBack;
  useEffect(()=>{if(presentation!=='screen')return;const subscription=BackHandler.addEventListener('hardwareBackPress',()=>{latestBack.current();return true;});return()=>subscription.remove();},[presentation]);
  const content=<SafeAreaView style={styles.safe}><View style={{flex:1}}><View accessibilityElementsHidden={!!exitDialog} importantForAccessibility={exitDialog?'no-hide-descendants':'auto'} style={styles.root}>
      <View onTouchStart={()=>pagePopover.current?.dismiss()}><NavigationHeader mode="Decorate" disabled={interactionLocked} saving={state.busy}
        cancelDisabled={state.busy||canvasDragging||!!drag||!!exitDialog} onCancel={requestClose} onSave={save}/></View>
      <View style={styles.content}>
      <View ref={root} collapsable={false} style={styles.content} accessibilityElementsHidden={footerExpanded} importantForAccessibility={footerExpanded?'no-hide-descendants':'auto'} onLayout={()=>{
        root.current?.measureInWindow((x,y)=>{rootPoint.current={x,y};});
      }}>
      <WalletCanvas initialViewportWidth={availableWidth?Math.max(1,availableWidth-32):undefined} initialScrollY={initialScrollY} cards={view.cards} allCards={view.cards} layout={view.layout} editing decorating
        disabled={locked || !!drag} selectedDecoration={selected} externalDragging={!!drag} dropTarget={target}
        onGeometry={measured} onCanvasPress={canvasTap} onDragging={active=>{canvasDragActive.current=active;setCanvasDragging(active);}}
        onOpen={card => { setArmed(null); setSelected(card.kind === 'decoration' ? card.id : null); }}
        onMove={(id,position) => { setSelected(null); apply({ type: 'move', id, position }); }}
        onDeleteDecoration={id => { apply({ type:'delete',id }); setSelected(null); }}
        onRotateDecoration={id => apply({ type:'rotate',id })} />
      <View accessibilityLabel="Decoration drawer" style={styles.drawer}>
        {!!error && <Text accessibilityRole="alert" accessibilityLiveRegion="assertive" style={styles.error}>{error}</Text>}
        <View accessibilityLabel="Artwork collections" style={styles.collections}>
          {DECORATION_COLLECTIONS.map(item => <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={item.name}
            accessibilityState={{ selected: collection.id===item.id, disabled:interactionLocked }} disabled={interactionLocked}
            onPress={() => { if(!navigationAllowed())return;setCollection(item); setPage(0); setArmed(null);setSelected(null); }}
            style={[styles.collection,{opacity:collection.id===item.id?1:0.48}]}>
            <View pointerEvents="none" style={{width:Math.max(1,Math.min(56,(pickerWidth-16)/6-4)),height:Math.max(1,Math.min(56,(pickerWidth-16)/6-4))}}>
              <DecorationImage assetId={collectionSymbols[item.id]} />
            </View>
          </Pressable>)}
        </View>
        <View accessibilityLabel="Decoration grid. Eight columns, three rows." onLayout={event=>setPickerWidth(event.nativeEvent.layout.width)}
          style={{paddingHorizontal:picker.padding,paddingTop:8,gap:picker.gap}}>
          {Array.from({length:DRAWER_ROWS},(_,row)=><View key={row} style={{flexDirection:'row',gap:picker.gap}}>
          {pageCells.slice(row*DRAWER_COLUMNS,(row+1)*DRAWER_COLUMNS).map((cell,column)=>cell.type==='empty'
            ? <View key={`empty-${column}`} accessible={false} pointerEvents="none" style={{width:picker.cell,height:picker.rowHeight}} />
            : cell.type!=='asset'
            ? <Pressable key={cell.type} accessibilityRole="button" accessibilityLabel={cell.type==='next'?'Next page':'Previous page'}
                accessibilityState={{disabled:interactionLocked}}
                disabled={interactionLocked} onPress={()=>changePage(cell.type==='next'?1:-1)}
                style={({pressed})=>[styles.pageTarget,{width:picker.cell,height:picker.rowHeight,opacity:interactionLocked?0.4:pressed?0.65:1}]}>
                <View pointerEvents="none" style={[styles.pageCircle,{width:Math.max(20,Math.min(28,picker.cell-4,picker.rowHeight-4)),height:Math.max(20,Math.min(28,picker.cell-4,picker.rowHeight-4))}]}>
                  <View style={{transform:[{rotate:cell.type==='next'?'180deg':'0deg'}]}}><BememIcon name="chevron-left" color={bemem.foreground} /></View>
                </View>
              </Pressable>
            : <DrawerAsset key={cell.assetId} assetId={cell.assetId} unit={Math.max(1,Math.min(unit,picker.cell-4,picker.rowHeight-2))} cellSize={picker.cell} cellHeight={picker.rowHeight} disabled={interactionLocked}
            selected={armed===cell.assetId} onSelect={selectAsset}
            onDrag={(id,point) => { dragActive.current=true;setSelected(null); setArmed(null); setDrag({assetId:id,point}); }}
            onDrop={(id,point) => {
              const position=geometry.current ? decorationDropCell(point,geometry.current) : null;
              if (position) apply({type:'add',assetId:id,position}); else setError('Drop inside an empty canvas cell. Nothing was added.');
            }} onEnd={() => {dragActive.current=false;setDrag(null);}} />)}
          </View>)}
        </View>
      </View>
      {drag && geometry.current && rootPoint.current && <View testID="decoration-drag-ghost" pointerEvents="none" style={{ position:'absolute', zIndex:50,
        ...decorationGhostFrame(drag.point,geometry.current,rootPoint.current),opacity:0.8 }}><DecorationImage assetId={drag.assetId} /></View>}
      </View>
      {footerExpanded&&<Pressable accessibilityRole="button" accessibilityLabel="Close canvas selector" style={StyleSheet.absoluteFill} onPress={()=>pagePopover.current?.dismiss()}/>}
      </View>
      <ContextualFooter ref={pagePopover} mode="Decorate" page={wallet.page??1} destinations={wallet.pageAccess??[]} onPage={changeCanvas}
        onExpandedChange={setFooterExpanded} disabled={state.busy||canvasDragging||!!drag||!!exitDialog} actionsBlocked={locked} saving={state.busy}
        onHome={()=>requestDestination('home')} onCreate={()=>requestDestination('create')} onAdd={()=>requestDestination('add')} onDecorate={()=>{pagePopover.current?.dismiss();}}/>

    </View><ConfirmationDialog presentation="inline" request={exitDialog} busy={state.busy}/></View></SafeAreaView>;
  return presentation==='screen'?content:<Modal visible animationType="none" statusBarTranslucent navigationBarTranslucent onRequestClose={requestBack}>{content}</Modal>;
}
const styles=StyleSheet.create({
  content:{flex:1},safe:{flex:1,backgroundColor:bemem.background},root:{flex:1,width:'100%',maxWidth:600,alignSelf:'center'},
  drawer:{flexShrink:0,paddingVertical:8,borderTopLeftRadius:24,borderTopRightRadius:24,borderWidth:1,borderColor:bemem.border,backgroundColor:ciColors.surface.sheet,overflow:'hidden'},
  inactive:{opacity:ciStates.decoratorDisabled},
  pageTarget:{alignItems:'center',justifyContent:'center'},
  pageCircle:{borderRadius:14,borderWidth:1,borderColor:'#d5dce0',backgroundColor:'#f8fafb',alignItems:'center',justifyContent:'center'},
  collections:{flexDirection:'row',paddingHorizontal:8,flexShrink:0},
  collection:{flex:1,aspectRatio:1,alignItems:'center',justifyContent:'center'},
  assetTarget:{width:48,height:48,borderRadius:10,borderWidth:1,alignItems:'center',justifyContent:'center'},
  error:{...ciTypography.supporting,fontWeight:'400',width:'100%',lineHeight:19,color:ciColors.status.error,paddingHorizontal:12,paddingBottom:8},
});
