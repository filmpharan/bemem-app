import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { bemem } from '../../constants/bemem-theme';
import { core, lagoonFonts } from '../../constants/lagoon-theme';
import { canPlace, canvasMetrics, cardSize, dropPosition } from '../../lib/canvas-layout';
import type { CanvasLayout, Position, PreviewCard } from '../../types/wallet-ui';
import { MembershipCard } from './MembershipCard';
import { WalletEmptyState } from './WalletEmptyState';

type Props = {
  cards: PreviewCard[]; allCards: PreviewCard[]; layout: CanvasLayout; editing: boolean; disabled: boolean;
  onMove: (id: string, position: Position) => void; onOpen: (card: PreviewCard) => void; onDragging: (active: boolean) => void;
};

function DraggableCard({ card, position, unit, layout, allCards, onMove, onDragging }: {
  card: PreviewCard; position: Position; unit: number; layout: CanvasLayout; allCards: PreviewCard[];
  onMove: Props['onMove']; onDragging: Props['onDragging'];
}) {
  const [offset, setOffset] = useState<Position | null>(null);
  const current = useRef({ position, unit, layout, allCards, onMove, onDragging });
  useEffect(() => { current.current = { position, unit, layout, allCards, onMove, onDragging }; });
  const start = useRef(position);
  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      start.current = { ...current.current.position };
      current.current.onDragging(true); setOffset(start.current);
    },
    onPanResponderMove: (_, gesture) => {
      setOffset(dropPosition(card, start.current, gesture.dx, gesture.dy, current.current.unit));
    },
    onPanResponderRelease: (_, gesture) => {
      const next = dropPosition(card, start.current, gesture.dx, gesture.dy, current.current.unit);
      if (canPlace(card, next, current.current.allCards, current.current.layout)) current.current.onMove(card.id, next);
      setOffset(null); current.current.onDragging(false);
    },
    onPanResponderTerminate: () => { setOffset(null); current.current.onDragging(false); },
    onPanResponderTerminationRequest: () => false,
  }), [card]);
  useEffect(() => () => { current.current.onDragging(false); }, []);
  const p = offset ?? position;
  const size = cardSize(card);
  const invalid = !!offset && !canPlace(card, p, allCards, layout);
  return <View {...responder.panHandlers} accessible accessibilityRole="adjustable"
    accessibilityLabel={`${card.name} ลากเพื่อจัดวาง`}
    accessibilityActions={[
      { name: 'left', label: 'ย้ายซ้าย' }, { name: 'right', label: 'ย้ายขวา' },
      { name: 'up', label: 'ย้ายขึ้น' }, { name: 'down', label: 'ย้ายลง' },
    ]}
    onAccessibilityAction={event => {
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

export function WalletCanvas({ cards, allCards, layout, editing, disabled, onMove, onOpen, onDragging }: Props) {
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
    {width > 0 && <ScrollView scrollEnabled={!dragging} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scrollContent}
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
                layout={layout} allCards={allCards} onMove={onMove} onDragging={setDrag} />
            : <Pressable key={card.id} accessibilityRole="button" accessibilityLabel={`${card.name} บัตรตัวอย่าง`}
                disabled={disabled} onPress={() => onOpen(card)}
                style={({ pressed }) => [styles.card, {
                  left: position.col * metrics.unit + 3, top: position.row * metrics.unit + 3,
                  width: size.cols * metrics.unit - 6, height: size.rows * metrics.unit - 6, opacity: pressed ? 0.8 : 1,
                }]}><MembershipCard card={card} /></Pressable>;
        })}
        {!cards.length && <WalletEmptyState emptyWallet={allCards.length === 0} />}
      </View>
      {editing && <Text style={styles.scrollHint}>เลื่อนพื้นที่ว่างเพื่อจัดบัตรด้านล่าง</Text>}
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
