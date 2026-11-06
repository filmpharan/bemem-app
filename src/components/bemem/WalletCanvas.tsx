import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, ScrollView, StyleSheet, Text, View, type ScrollViewInstance } from 'react-native';
import { bemem } from '../../constants/bemem-theme';
import { core, lagoonFonts } from '../../constants/lagoon-theme';
import { canPlace, canvasMetrics, cardSize, dropPosition } from '../../lib/canvas-layout';
import { createCardInteraction } from '../../lib/card-interaction';
import type { CanvasLayout, Position, PreviewCard } from '../../types/wallet-ui';
import { MembershipCard } from './MembershipCard';
import { WalletEmptyState } from './WalletEmptyState';

type Props = {
  cards: PreviewCard[]; allCards: PreviewCard[]; layout: CanvasLayout; editing: boolean; disabled: boolean;
  presentationKey?: string;
  onMove: (id: string, position: Position) => void; onOpen: (card: PreviewCard) => void; onDragging: (active: boolean) => void;
};

function DraggableCard({ card, position, unit, layout, allCards, onMove, onOpen, onDragging }: {
  card: PreviewCard; position: Position; unit: number; layout: CanvasLayout; allCards: PreviewCard[];
  onMove: Props['onMove']; onOpen: Props['onOpen']; onDragging: Props['onDragging'];
}) {
  const [offset, setOffset] = useState<Position | null>(null);
  const current = useRef({ position, unit, layout, allCards, onMove, onOpen, onDragging });
  useEffect(() => { current.current = { position, unit, layout, allCards, onMove, onOpen, onDragging }; });
  const start = useRef(position);
  const interaction = useMemo(() => createCardInteraction({
    onTap: () => current.current.onOpen(card),
    onDragStart: () => {
      current.current.onDragging(true); setOffset(start.current);
    },
    onDragMove: (dx, dy) => {
      setOffset(dropPosition(card, start.current, dx, dy, current.current.unit));
    },
    onDrop: (dx, dy) => {
      const next = dropPosition(card, start.current, dx, dy, current.current.unit);
      if ((next.col !== start.current.col || next.row !== start.current.row)
        && canPlace(card, next, current.current.allCards, current.current.layout)) current.current.onMove(card.id, next);
    },
    onDragEnd: () => { setOffset(null); current.current.onDragging(false); },
  }), [card]);
  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: (_, gesture) => gesture.numberActiveTouches === 1,
    // Never take over a scroll already in progress.
    onMoveShouldSetPanResponder: () => false,
    onPanResponderGrant: () => { start.current = { ...current.current.position }; interaction.start(); },
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
  const size = cardSize(card);
  const invalid = !!offset && !canPlace(card, p, allCards, layout);
  return <View {...responder.panHandlers} accessible accessibilityRole="adjustable"
    accessibilityLabel={`${card.name}. Tap to preview. Hold to drag.`}
    accessibilityActions={[
      { name: 'activate', label: 'Preview card' },
      { name: 'left', label: 'Move left' }, { name: 'right', label: 'Move right' },
      { name: 'up', label: 'Move up' }, { name: 'down', label: 'Move down' },
    ]}
    onAccessibilityAction={event => {
      if (event.nativeEvent.actionName === 'activate') { onOpen(card); return; }
      const direction: Record<string, Position> = { left: { col: -1, row: 0 }, right: { col: 1, row: 0 }, up: { col: 0, row: -1 }, down: { col: 0, row: 1 } };
      const delta = direction[event.nativeEvent.actionName];
      if (delta) onMove(card.id, { col: position.col + delta.col, row: position.row + delta.row });
    }}
    style={[styles.card, {
      left: p.col * unit + 3, top: p.row * unit + 3,
      width: size.cols * unit - 6, height: size.rows * unit - 6,
      zIndex: offset ? 10 : 1, opacity: invalid ? 0.45 : 1,
      borderWidth: offset ? 2 : 0, borderColor: invalid ? bemem.error : bemem.muted,
    }]}><MembershipCard card={card} /></View>;
}

export function WalletCanvas({ cards, allCards, layout, editing, disabled, presentationKey, onMove, onOpen, onDragging }: Props) {
  const scroll = useRef<ScrollViewInstance>(null);
  useEffect(() => { scroll.current?.scrollTo({ y: 0, animated: false }); }, [presentationKey]);
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(400);
  const [dragging, setDragging] = useState(false);
  const [scrollRow, setScrollRow] = useState(0);
  const setDrag = useCallback((active: boolean) => { setDragging(active); onDragging(active); }, [onDragging]);
  const metrics = canvasMetrics(width, height - 110, allCards, layout, editing);
  const firstGridRow = Math.max(0, scrollRow - 2);
  const lastGridRow = Math.min(metrics.rows, scrollRow + Math.ceil(height / metrics.unit) + 2);
  return <View style={styles.viewport} onLayout={event => {
    setWidth(event.nativeEvent.layout.width); setHeight(event.nativeEvent.layout.height);
  }}>
    {width > 0 && <ScrollView ref={scroll} scrollEnabled={!dragging} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scrollContent}
      scrollEventThrottle={32} onScroll={event => setScrollRow(Math.floor(event.nativeEvent.contentOffset.y / metrics.unit))}>
      <View style={{ height: metrics.height, width }}>
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
          const size = cardSize(card);
          return editing && !disabled
            ? <DraggableCard key={`${card.id}-${width}`} card={card} position={position} unit={metrics.unit}
                layout={layout} allCards={allCards} onMove={onMove} onOpen={onOpen} onDragging={setDrag} />
            : <Pressable key={card.id} accessibilityRole="button" accessibilityLabel={`${card.name}. Preview card.`}
                disabled={disabled} onPress={() => onOpen(card)}
                style={({ pressed }) => [styles.card, {
                  left: position.col * metrics.unit + 3, top: position.row * metrics.unit + 3,
                  width: size.cols * metrics.unit - 6, height: size.rows * metrics.unit - 6, opacity: pressed ? 0.8 : 1,
                }]}><MembershipCard card={card} /></Pressable>;
        })}
        {!cards.length && <WalletEmptyState emptyWallet={allCards.length === 0} />}
      </View>
      {editing && <Text style={styles.scrollHint}>Tap to preview. Hold to drag. Scroll to see more cards.</Text>}
    </ScrollView>}
  </View>;
}
const styles = StyleSheet.create({
  viewport: { flex: 1, marginHorizontal: 16, marginTop: 12, overflow: 'hidden' },
  scrollContent: { paddingBottom: 120 },
  card: { position: 'absolute', borderRadius: core.radius.card },
  cross: { position: 'absolute', width: 8, height: 8, opacity: 0.3 },
  crossHorizontal: { position: 'absolute', left: 3, top: 3, width: 2, height: 2, backgroundColor: bemem.grid, borderRadius: 1 },
  crossVertical: { display: 'none' },
  scrollHint: { color: bemem.muted, fontSize: 12, textAlign: 'center', paddingVertical: 16, fontFamily: lagoonFonts.thai },
});
