import { ciTypography } from '../../constants/ci-theme';
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import { PanResponder, Pressable, ScrollView, StyleSheet, Text, View, type ScrollViewInstance } from 'react-native';
import { bemem } from '../../constants/bemem-theme';
import { CARD_CORNER_RADIUS } from '../../constants/card-appearance';
import { canPlace, canvasMetrics, canvasItemFrame, dropPosition, MAX_ROWS } from '../../lib/canvas-layout';
import { createCardInteraction } from '../../lib/card-interaction';
import { createCanvasEdgeScroll } from '../../lib/canvas-drag-scroll';
import type { CanvasLayout, Position, PreviewCard } from '../../types/wallet-ui';
import { MembershipCard } from './MembershipCard';
import { WalletEmptyState } from './WalletEmptyState';
import { DecorationImage } from './DecorationImage';
import { GlassButton } from './GlassButton';
import { DecorateIcon } from './DecorateIcon';
import type { DecorationDropGeometry } from '../../lib/decorate-session';

type Props = {
  cards: PreviewCard[]; allCards: PreviewCard[]; layout: CanvasLayout; editing: boolean; disabled: boolean;
  presentationKey?: string;
  /** Already measured by the same-window shell; native onLayout remains authoritative. */
  initialViewportWidth?:number;
  initialScrollY?:number;onScrollY?:(y:number)=>void;
  maxRows?: number;
  decorating?: boolean;
  selectedDecoration?: string | null;
  externalDragging?: boolean;
  dropTarget?: { position: Position; valid: boolean } | null;
  onGeometry?: (geometry: DecorationDropGeometry) => void;
  onCanvasPress?: (position: Position) => void;
  onRotateDecoration?: (id: string) => void;
  onDeleteDecoration?: (id: string) => void;
  onMove: (id: string, position: Position) => void; onOpen: (card: PreviewCard) => void; onDragging: (active: boolean) => void;
  onFolderDrop?: (id:string,position:Position)=>boolean;
};

type DragScroll={getY:()=>number;start:(y:number,refresh:()=>void)=>void;move:(y:number)=>void;stop:()=>void};
function DraggableCard({ card, position, unit, layout, allCards, onMove, onOpen, onDragging, maxRows, decorating,onFolderDrop,dragScroll }: {
  card: PreviewCard; position: Position; unit: number; layout: CanvasLayout; allCards: PreviewCard[];
  maxRows: number;
  decorating?: boolean;
  onFolderDrop?:Props['onFolderDrop'];
  dragScroll?:DragScroll;
  onMove: Props['onMove']; onOpen: Props['onOpen']; onDragging: Props['onDragging'];
}) {
  const [offset, setOffset] = useState<Position | null>(null);
  const current = useRef({ position, unit, layout, allCards, onMove, onOpen, onDragging, maxRows, decorating,onFolderDrop,dragScroll });
  current.current = { position, unit, layout, allCards, onMove, onOpen, onDragging, maxRows, decorating,onFolderDrop,dragScroll };
  const start = useRef(position);
  const originScroll=useRef(0),anchorY=useRef(0),delta=useRef({x:0,y:0});
  const candidate = (dx: number, dy: number) => {
    const contentDy=dy+(current.current.dragScroll?.getY()??originScroll.current)-originScroll.current;
    return current.current.decorating
      ? { col: start.current.col + Math.round(dx/current.current.unit), row: start.current.row + Math.round(contentDy/current.current.unit) }
      : dropPosition(card, start.current, dx, contentDy, current.current.unit, current.current.maxRows);
  };
  const interaction = useMemo(() => createCardInteraction({
    onTap: () => { if(current.current.decorating&&card.kind==='folder')return;current.current.onOpen(card); },
    onDragStart: () => {
      current.current.onDragging(true); setOffset(start.current);
      current.current.dragScroll?.start(anchorY.current,()=>setOffset(candidate(delta.current.x,delta.current.y)));
    },
    onDragMove: (dx, dy) => {
      delta.current={x:dx,y:dy};current.current.dragScroll?.move(anchorY.current+dy);
      setOffset(candidate(dx,dy));
    },
    onDrop: (dx, dy) => {
      const next = candidate(dx,dy);
      if(!current.current.decorating&&current.current.onFolderDrop?.(card.id,next))return;
      if ((next.col !== start.current.col || next.row !== start.current.row)
        && canPlace(card, next, current.current.allCards, current.current.layout, current.current.maxRows)) current.current.onMove(card.id, next);
    },
    onDragEnd: () => { current.current.dragScroll?.stop();setOffset(null); current.current.onDragging(false); },
  }), [card]);
  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: (_, gesture) => gesture.numberActiveTouches === 1,
    // Never take over a scroll already in progress.
    onMoveShouldSetPanResponder: () => false,
    onPanResponderGrant: event => {
      start.current = { ...current.current.position };originScroll.current=current.current.dragScroll?.getY()??0;delta.current={x:0,y:0};
      const frame=canvasItemFrame(card,start.current,current.current.unit);
      anchorY.current=frame.top+(event?.nativeEvent.locationY??frame.height/2)-originScroll.current;
      interaction.start();
    },
    onPanResponderStart: (_, gesture) => { if (gesture.numberActiveTouches > 1) interaction.cancel(); },
    onPanResponderMove: (_, gesture) => interaction.move(gesture.dx, gesture.dy, gesture.numberActiveTouches),
    onPanResponderRelease: (_, gesture) => interaction.release(gesture.dx, gesture.dy),
    onPanResponderTerminate: interaction.cancel,
    // ScrollView may take the touch before the hold threshold; a held card owns it afterwards.
    onPanResponderTerminationRequest: () => !interaction.isDragging(),
    onShouldBlockNativeResponder: () => interaction.isDragging(),
  }), [interaction]);
  useEffect(() => () => { interaction.cancel(); }, [interaction]);
  const p = offset ?? position;
  const frame = canvasItemFrame(card, p, unit);
  const invalid = !!offset && !canPlace(card, p, allCards, layout, maxRows);
  return <View {...responder.panHandlers} accessible accessibilityRole="adjustable"
    accessibilityLabel={`${card.name}. ${decorating ? card.kind === 'decoration' ? 'Tap to select. Hold to drag.' : card.kind==='folder'?'Hold to move folder.':'Hold to move card.' : 'Tap to preview. Hold to drag.'}`}
    accessibilityActions={[
      ...(!(decorating&&card.kind==='folder')?[{ name: 'activate', label: decorating ? 'Select item' : 'Preview card' }]:[]),
      { name: 'left', label: 'Move left' }, { name: 'right', label: 'Move right' },
      { name: 'up', label: 'Move up' }, { name: 'down', label: 'Move down' },
    ]}
    onAccessibilityAction={event => {
      if (event.nativeEvent.actionName === 'activate') { if(!(decorating&&card.kind==='folder'))onOpen(card);return; }
      const direction: Record<string, Position> = { left: { col: -1, row: 0 }, right: { col: 1, row: 0 }, up: { col: 0, row: -1 }, down: { col: 0, row: 1 } };
      const delta = direction[event.nativeEvent.actionName];
      if (delta) onMove(card.id, { col: position.col + delta.col, row: position.row + delta.row });
    }}
    style={[styles.card, {
      ...frame,
      borderRadius: card.kind === 'decoration' ? 0 : CARD_CORNER_RADIUS,
      zIndex: offset ? 10 : 1, opacity: invalid ? 0.45 : 1,
      borderWidth: offset ? 2 : 0, borderColor: invalid ? bemem.error : bemem.muted,
    }]}><View pointerEvents="none" style={{flex:1}}>{card.decoration ? <DecorationImage {...card.decoration} /> : <MembershipCard card={card} />}</View></View>;
}

export function WalletCanvas({ cards, allCards, layout, editing, disabled, presentationKey, onMove, onOpen, onDragging, maxRows = MAX_ROWS,
  decorating, selectedDecoration, externalDragging, dropTarget, onGeometry, onCanvasPress, onRotateDecoration, onDeleteDecoration,initialScrollY,onScrollY,onFolderDrop,initialViewportWidth }: Props) {
  const scroll = useRef<ScrollViewInstance>(null);
  const viewport = useRef<ComponentRef<typeof View>>(null);
  const scrollY = useRef(initialScrollY??0);
  useEffect(() => { scrollY.current=initialScrollY??0;scroll.current?.scrollTo({ y: scrollY.current, animated: false }); }, [presentationKey]);
  const [width, setWidth] = useState(initialViewportWidth??0);
  const [height, setHeight] = useState(400);
  const [dragging, setDragging] = useState(false);
  const [scrollRow, setScrollRow] = useState(0);
  const setDrag = useCallback((active: boolean) => { setDragging(active); onDragging(active); }, [onDragging]);
  const metrics = canvasMetrics(width, height - 110, cards, layout, editing, maxRows);
  const live=useRef({height,metrics});live.current={height,metrics};
  const [edgeScroll]=useState(()=>createCanvasEdgeScroll(
    ()=>({scrollY:scrollY.current,viewportHeight:live.current.height,contentHeight:live.current.metrics.height}),
    y=>{scroll.current?.scrollTo({y,animated:false});}));
  const dragScroll=useMemo<DragScroll>(()=>({getY:()=>scrollY.current,start:edgeScroll.start,move:edgeScroll.move,stop:edgeScroll.stop}),[edgeScroll]);
  useEffect(()=>{if(disabled||!editing)edgeScroll.stop();return()=>edgeScroll.stop();},[disabled,editing,edgeScroll]);
  const geometryCallback = useRef(onGeometry); geometryCallback.current = onGeometry;
  const geometryEpoch=useRef(0);
  const publishGeometry = useCallback(() => {
    const ticket=++geometryEpoch.current;
    viewport.current?.measureInWindow((pageX, pageY, measuredWidth, measuredHeight) => {if(ticket!==geometryEpoch.current)return;geometryCallback.current?.({
      pageX, pageY, width: measuredWidth, height: measuredHeight, unit: measuredWidth / 12, scrollY: scrollY.current,
    });});
  }, []);
  useEffect(()=>()=>{++geometryEpoch.current;},[]);
  useEffect(() => { publishGeometry(); }, [width, height, publishGeometry]);
  const firstGridRow = Math.max(0, scrollRow - 2);
  const lastGridRow = Math.min(metrics.rows, scrollRow + Math.ceil(height / metrics.unit) + 2);
  return <View ref={viewport} collapsable={false} style={styles.viewport} onLayout={event => {
    setWidth(event.nativeEvent.layout.width); setHeight(event.nativeEvent.layout.height);
    publishGeometry();
  }}>
    {width > 0 && <ScrollView ref={scroll} scrollEnabled={!dragging && !externalDragging} keyboardShouldPersistTaps="handled" contentContainerStyle={decorating ? { paddingBottom: 32 } : styles.scrollContent}
      onContentSizeChange={()=>scroll.current?.scrollTo({y:scrollY.current,animated:false})}
      scrollEventThrottle={16} onScroll={event => { scrollY.current = event.nativeEvent.contentOffset.y;
        onScrollY?.(scrollY.current);
        setScrollRow(Math.floor(scrollY.current / metrics.unit)); publishGeometry();edgeScroll.sync(); }}>
      <View style={{ height: metrics.height, width }}>
        {decorating && <Pressable accessibilityRole="button" accessibilityLabel="Canvas. Tap an empty cell to place selected artwork or dismiss tools."
          disabled={disabled || externalDragging} style={StyleSheet.absoluteFill}
          onPress={event => onCanvasPress?.({ col: Math.floor(event.nativeEvent.locationX / metrics.unit), row: Math.floor(event.nativeEvent.locationY / metrics.unit) })} />}
        {editing && <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          {Array.from({ length: Math.max(0, lastGridRow - firstGridRow + 1) }, (_, index) => {
            const row = firstGridRow + index;
            return Array.from({ length: 13 }, (_, col) =>
              <View key={`${row}-${col}`} style={[styles.cross, { top: row * metrics.unit - 4, left: col * metrics.unit - 4 }]}>
                <View style={styles.crossHorizontal} /><View style={styles.crossVertical} />
              </View>);
          })}
        </View>}
        {cards.map(card => {
          const position = layout[card.id];
          if (!position) return null;
          const frame = canvasItemFrame(card, position, metrics.unit);
          if (card.decoration && (!decorating || disabled)) return <View key={card.id} pointerEvents="none" accessible={false}
            style={[styles.decoration, frame]}><DecorationImage {...card.decoration} /></View>;
          return editing && !disabled
            ? <DraggableCard key={`${card.id}-${width}`} card={card} position={position} unit={metrics.unit}
                layout={layout} allCards={allCards} onMove={onMove} onOpen={onOpen} onDragging={setDrag} maxRows={maxRows} decorating={decorating} onFolderDrop={onFolderDrop} dragScroll={dragScroll} />
            : <Pressable key={card.id} accessibilityRole="button" accessibilityLabel={`${card.name}. Preview card.`}
                disabled={disabled} onPress={() => onOpen(card)}
                style={({ pressed }) => [styles.card, {
                  ...frame, opacity: pressed ? 0.8 : 1,
                }]}><MembershipCard card={card} /></Pressable>;
        })}
        {dropTarget && <View pointerEvents="none" style={{ position: 'absolute', ...canvasItemFrame({ id: 'target', kind: 'decoration', name: '', colors: ['#ffffff','#ffffff'], orientation: 'landscape' }, dropTarget.position, metrics.unit),
          borderWidth: 2, borderColor: dropTarget.valid ? bemem.primary : bemem.error, backgroundColor: dropTarget.valid ? 'rgba(151,182,160,0.2)' : 'rgba(180,60,60,0.15)', zIndex: 15 }} />}
        {decorating && !disabled && !dragging && !externalDragging && selectedDecoration && layout[selectedDecoration] && <View
          style={{ position: 'absolute', zIndex: 20, flexDirection: 'row', gap: 8,
            left: Math.max(0, Math.min(width - 104, (layout[selectedDecoration].col + 0.5) * metrics.unit - 52)),
            top: layout[selectedDecoration].row * metrics.unit >= scrollY.current + 54 ? layout[selectedDecoration].row * metrics.unit - 54 : (layout[selectedDecoration].row + 1) * metrics.unit + 6 }}>
          <GlassButton accessibilityLabel="Delete selected decoration" tone="tertiary" style={{ width: 48, height: 48 }} onPress={() => onDeleteDecoration?.(selectedDecoration)}><DecorateIcon name="trash" /></GlassButton>
          <GlassButton accessibilityLabel="Rotate selected decoration clockwise" tone="tertiary" style={{ width: 48, height: 48 }} onPress={() => onRotateDecoration?.(selectedDecoration)}><DecorateIcon name="rotate" /></GlassButton>
        </View>}
        {!cards.length && !decorating && <WalletEmptyState emptyWallet={allCards.length === 0} />}
      </View>
      {editing && !decorating && <Text style={styles.scrollHint}>Tap to preview. Hold to drag. Scroll to see more cards.</Text>}
    </ScrollView>}
  </View>;
}
const styles = StyleSheet.create({
  viewport: { flex: 1, marginHorizontal: 16, marginTop: 0, overflow: 'hidden' },
  scrollContent: { paddingBottom: 120 },
  card: { position: 'absolute', borderRadius: CARD_CORNER_RADIUS },
  decoration: { position: 'absolute' },
  cross: { position: 'absolute', width: 8, height: 8, opacity: 1 },
  crossHorizontal: { position: 'absolute', left: 3, top: 3, width: 2, height: 2, backgroundColor: bemem.grid, borderRadius: 1 },
  crossVertical: { display: 'none' },
  scrollHint: { color: bemem.muted, fontSize: 12, textAlign: 'center', paddingVertical: 16, fontFamily: ciTypography.supporting.fontFamily },
});
