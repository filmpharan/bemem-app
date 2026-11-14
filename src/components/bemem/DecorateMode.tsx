import { ciColors,ciTypography,ciStates } from '../../constants/ci-theme';
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import { ActivityIndicator, Alert, Modal, PanResponder, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { useWalletCanvas } from '../../hooks/use-wallet-canvas';
import { bemem } from '../../constants/bemem-theme';
import { DECORATION_ASSETS, DECORATION_COLLECTIONS, type DecorationAssetId } from '../../lib/decoration-catalog';
import { createDecorateSession, decorationDropCell, type DecorationDropGeometry, type DecorateResult } from '../../lib/decorate-session';
import { createCardInteraction } from '../../lib/card-interaction';
import { canPlace } from '../../lib/canvas-layout';
import { walletCanvasPresentation } from '../../lib/wallet-preparation';
import type { Position } from '../../types/wallet-ui';
import { WalletCanvas } from './WalletCanvas';
import { EightSlotHeader,compactHeaderStyles } from './EightSlotHeader';
import { DecorationImage } from './DecorationImage';
import { BememIcon } from './BememIcon';
import { AddCardIcon } from './AddCardIcon';
import { CanvasPageSelector } from './CanvasPageSelector';
import { CanvasPagePopoverHost,type CanvasPagePopoverHandle } from './CanvasPagePopoverHost';
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
  const interaction = useMemo(() => createCardInteraction({
    onTap: () => current.current.onSelect(current.current.assetId),
    onDragStart: () => current.current.onDrag(current.current.assetId, point.current),
    onDragMove: () => current.current.onDrag(current.current.assetId, point.current),
    onDrop: () => current.current.onDrop(current.current.assetId, point.current), onDragEnd: () => current.current.onEnd(),
  }), []);
  useEffect(() => () => interaction.cancel(), [interaction]);
  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: (_, g) => !current.current.disabled && g.numberActiveTouches === 1,
    onMoveShouldSetPanResponder: () => false,
    onPanResponderGrant: (_, g) => { point.current = { x: g.x0, y: g.y0 }; interaction.start(); },
    onPanResponderMove: (_, g) => { point.current = { x: g.moveX, y: g.moveY }; interaction.move(g.dx, g.dy, g.numberActiveTouches); },
    onPanResponderRelease: (_, g) => { point.current = { x: g.moveX || g.x0, y: g.moveY || g.y0 }; interaction.release(g.dx, g.dy); },
    onPanResponderTerminate: interaction.cancel,
    onPanResponderTerminationRequest: () => !interaction.isDragging(), onShouldBlockNativeResponder: () => interaction.isDragging(),
  }), [interaction]);
  const label = DECORATION_ASSETS.find(a => a.id === props.assetId)?.label ?? props.assetId;
  return <View {...responder.panHandlers} accessible accessibilityRole="button" accessibilityState={{ disabled: props.disabled, selected: props.selected }}
    accessibilityLabel={`${label}. Hold to drag, or activate then tap an empty cell.`}
    accessibilityActions={[{ name: 'activate', label: `Select ${label} for placement` }]}
    onAccessibilityAction={() => { if (!props.disabled) props.onSelect(props.assetId); }}
    style={[styles.assetTarget, { width:props.cellSize ?? 48,height:props.cellHeight ?? props.cellSize ?? 48, opacity: props.disabled ? 0.45 : 1, borderColor: props.selected ? bemem.primary : 'transparent' }]}>
    <View pointerEvents="none" style={{ width: props.unit, height: props.unit }}><DecorationImage assetId={props.assetId} /></View>
  </View>;
}

/** Mounted only while editing decorations. Home never mounts the drawer or session history. */
type Props={wallet:ReturnType<typeof useWalletCanvas>;onClose:()=>void;onSaved:()=>void};
export function DecorateMode(props:Props){
 const owner=props.wallet.runtime?.pages;
 const forbidden=props.wallet.pageEditable===false||!!owner&&!owner.access()[owner.current()-1].editable;
 useEffect(()=>{if(forbidden)props.onClose();},[forbidden,props.onClose]);
 // No writable session (or locked editor surface) is mounted on a stale route.
 // The owner retains any draft; expiry never silently invokes session.cancel().
 if(forbidden)return null;
 return <EditableDecorateMode key={props.wallet.page??1} {...props}/>;
}
export function EditableDecorateMode({ wallet, onClose, onSaved }: Props) {
  const pagePopover=useRef<CanvasPagePopoverHandle>(null);
  const [session] = useState(() => createDecorateSession(wallet.runtime));
  const [entryHasCreateDraft] = useState(() => wallet.runtime.getSnapshot().state.dirty);
  const [state, setState] = useState(session.snapshot);
  const { width:windowWidth } = useWindowDimensions();
  const [collection, setCollection] = useState(DECORATION_COLLECTIONS[0]);
  const [page,setPage] = useState(0);
  const [pickerWidth,setPickerWidth] = useState(Math.min(600,windowWidth)-2);
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
  const root = useRef<ComponentRef<typeof View>>(null), rootPoint = useRef<Point>({ x: 0, y: 0 });
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
  function changeCanvas(next:CanvasPage){
    if(!navigationAllowed()||wallet.runtime.pages&&!wallet.runtime.pages.access()[next-1]?.editable)return;
    if(!wallet.runtime.getSnapshot().state.dirty){wallet.selectPage(next);return;}
    Alert.alert('Unsaved changes',entryHasCreateDraft
      ? 'Save all current changes to switch canvases. Discard removes only changes made in Decorate and returns to Create on this canvas, keeping your earlier Create draft.'
      : 'Save or discard changes made in Decorate before switching canvases.',[
      {text:'Stay',style:'cancel'},
      {text:'Discard',style:'destructive',onPress:()=>{if(!navigationAllowed())return;
        const result=session.cancel();refresh(result);if(!result.ok)return;
        // cancel restores the entry snapshot, including any earlier Create work.
        // The owner correctly refuses to switch while that earlier draft is dirty.
        if(wallet.runtime.getSnapshot().state.dirty)onClose();else wallet.selectPage(next);}},
      {text:'Save',onPress:()=>{const work=session.save();refresh();void work.then(result=>{refresh(result);if(result.ok)wallet.selectPage(next);});}},
    ]);
  }
  return <Modal visible animationType="none" statusBarTranslucent navigationBarTranslucent onRequestClose={()=>{if(!pagePopover.current?.dismiss())requestClose();}}>
    <SafeAreaView style={styles.safe}><CanvasPagePopoverHost ref={pagePopover}><View accessibilityElementsHidden={!!exitDialog} importantForAccessibility={exitDialog?'no-hide-descendants':'auto'} ref={root} collapsable={false} style={styles.root} onLayout={() => {
      root.current?.measureInWindow((x,y) => { rootPoint.current={x,y}; });
    }}>
      <EightSlotHeader mode="Decorate" slots={{
        8:<CanvasPageSelector compact page={wallet.page??1} destinations={wallet.pageAccess??[]} disabled={interactionLocked} onSelect={changeCanvas}/>,
        4:(<Pressable accessibilityRole="button" accessibilityLabel="Back" accessibilityState={{disabled:state.busy || canvasDragging || !!drag}} disabled={state.busy || canvasDragging || !!drag} onPress={requestClose}
            style={[compactHeaderStyles.target, (state.busy || canvasDragging || !!drag) && styles.inactive]}><BememIcon name="chevron-left" color={ciColors.action.back}/></Pressable>),
        5:(<Pressable accessibilityRole="button" accessibilityLabel="Undo" accessibilityState={{disabled:interactionLocked || !state.canUndo}} accessibilityHint="Undo last decoration or card move" disabled={interactionLocked || !state.canUndo}
            onPress={() => { setSelected(null); refresh(session.undo()); }} style={[compactHeaderStyles.target, (interactionLocked || !state.canUndo) && styles.inactive]}><AddCardIcon name="undo" size={22} color={bemem.foreground} /></Pressable>),
        6:(<Pressable accessibilityRole="button" accessibilityLabel="Redo" accessibilityState={{disabled:interactionLocked || !state.canRedo}} accessibilityHint="Redo last undone action" disabled={interactionLocked || !state.canRedo}
            onPress={() => { setSelected(null); refresh(session.redo()); }} style={[compactHeaderStyles.target, (interactionLocked || !state.canRedo) && styles.inactive]}><AddCardIcon name="redo" size={22} color={bemem.foreground} /></Pressable>),
        7:(<Pressable accessibilityRole="button" accessibilityLabel="Save" accessibilityHint={state.busy ? 'Saving decorations' : undefined} accessibilityState={{busy:state.busy,disabled:interactionLocked}} disabled={interactionLocked}
            style={[compactHeaderStyles.target, interactionLocked && !state.busy && styles.inactive]} onPress={() => {
            const work=session.save(); refresh(); void work.then(result => { refresh(result); if (result.ok) onSaved(); });
          }}>{state.busy ? <ActivityIndicator accessible={false} size="small" color={saveInk} /> : <AddCardIcon name="check" size={22} color={saveInk} />}</Pressable>),
      }}/>
      <WalletCanvas cards={view.cards} allCards={view.cards} layout={view.layout} editing decorating
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
      {drag && <View pointerEvents="none" style={{ position:'absolute', zIndex:50, width:unit,height:unit,
        left:drag.point.x-rootPoint.current.x-unit/2,top:drag.point.y-rootPoint.current.y-unit/2,opacity:0.8 }}><DecorationImage assetId={drag.assetId} /></View>}
    </View><ConfirmationDialog presentation="inline" request={exitDialog}/></CanvasPagePopoverHost></SafeAreaView>
  </Modal>;
}
const styles=StyleSheet.create({
  safe:{flex:1,backgroundColor:bemem.background},root:{flex:1,width:'100%',maxWidth:600,alignSelf:'center'},
  drawer:{flexShrink:0,paddingVertical:8,borderTopLeftRadius:24,borderTopRightRadius:24,borderWidth:1,borderColor:bemem.border,backgroundColor:bemem.background,overflow:'hidden'},
  inactive:{opacity:ciStates.decoratorDisabled},
  pageTarget:{alignItems:'center',justifyContent:'center'},
  pageCircle:{borderRadius:14,borderWidth:1,borderColor:'#d5dce0',backgroundColor:'#f8fafb',alignItems:'center',justifyContent:'center'},
  collections:{flexDirection:'row',paddingHorizontal:8,flexShrink:0},
  collection:{flex:1,aspectRatio:1,alignItems:'center',justifyContent:'center'},
  assetTarget:{width:48,height:48,borderRadius:10,borderWidth:1,alignItems:'center',justifyContent:'center'},
  error:{...ciTypography.supporting,fontWeight:'400',width:'100%',lineHeight:19,color:ciColors.status.error,paddingHorizontal:12,paddingBottom:8},
});
