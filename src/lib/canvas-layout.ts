import type { CanvasLayout, Position, PreviewCard } from '../types/wallet-ui';
import { cardSizePreset } from './card-size-presets';
import { cardPaintSize } from './card-geometry';

export const COLUMNS = 12;
// Compatibility boundary of the unchanged Phase 1 reader/writer, not a Sandbox data limit.
export const MAX_ROWS = 240;
export const cardSize = (card: PreviewCard) => {
  if (card.kind === 'decoration') return { cols: 1, rows: 1 };
  if (card.sizePresetId) {
    const preset = cardSizePreset(card.sizePresetId);
    return { cols: preset.ratioWidth, rows: preset.ratioHeight };
  }
  // Existing Demo IDs have no size ID. Their full footprint must remain unchanged.
  return card.orientation === 'portrait' ? { cols: 4, rows: 6 } : { cols: 6, rows: 4 };
};

export function canPlace(card: PreviewCard, position: Position, cards: PreviewCard[], layout: CanvasLayout, maxRows = MAX_ROWS) {
  const size = cardSize(card);
  if (!Number.isSafeInteger(position.col) || !Number.isSafeInteger(position.row)
    || position.col < 0 || position.row < 0
    || position.col + size.cols > COLUMNS || !Number.isSafeInteger(position.row + size.rows)
    || position.row + size.rows > maxRows) return false;
  return cards.every(other => {
    const p = layout[other.id];
    if (other.id === card.id || !p) return true;
    const s = cardSize(other);
    return position.col + size.cols <= p.col || p.col + s.cols <= position.col
      || position.row + size.rows <= p.row || p.row + s.rows <= position.row;
  });
}

export function sameLayout(a: CanvasLayout, b: CanvasLayout) {
  const ids = Object.keys(a);
  return ids.length === Object.keys(b).length
    && ids.every(id => a[id].col === b[id]?.col && a[id].row === b[id]?.row);
}

export function cloneLayout(layout: CanvasLayout): CanvasLayout {
  return Object.fromEntries(Object.entries(layout).map(([id, p]) => [id, { ...p }]));
}

export function validateLayout(value: unknown, cards: PreviewCard[]): CanvasLayout {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid layout');
  const layout = value as CanvasLayout;
  const ids = Object.keys(layout);
  if (ids.length !== cards.length || cards.some(c => !Object.hasOwn(layout, c.id))) {
    throw new Error('Layout does not match the demo cards');
  }
  for (const card of cards) {
    const p = layout[card.id];
    if (!p || typeof p !== 'object' || !canPlace(card, p, cards, layout)) {
      throw new Error('Invalid or overlapping card position');
    }
  }
  return cloneLayout(layout);
}

// The persistent grid never contains device pixels. Both axes use the same unit.
export function canvasMetrics(width: number, minHeight: number, cards: PreviewCard[], layout: CanvasLayout, editing: boolean, maxRows = MAX_ROWS) {
  const unit = Math.max(1, width) / COLUMNS;
  const lastRow = cards.reduce((last, card) => Math.max(last, (layout[card.id]?.row ?? 0) + cardSize(card).rows), 0);
  const rows = Math.min(maxRows, Math.max(Math.ceil(minHeight / unit), lastRow + (editing ? 10 : 2)));
  return { unit, gap: 0, rows, height: rows * unit };
}

export function dropPosition(card: PreviewCard, start: Position, dx: number, dy: number, unit: number, maxRows = MAX_ROWS): Position {
  const size = cardSize(card);
  return {
    col: Math.max(0, Math.min(COLUMNS - size.cols, start.col + Math.round(dx / unit))),
    row: Math.max(0, Math.min(maxRows - size.rows, start.row + Math.round(dy / unit))),
  };
}

/** First free full footprint, row-major. Resize ignores only the same item's old slot. */
export function firstFreePosition(card: PreviewCard, cards: PreviewCard[], layout: CanvasLayout, maxRows = Infinity): Position | null {
  const size = cardSize(card);
  if (size.cols > COLUMNS) return null;
  const lastOccupied = cards.reduce((last, other) => other.id === card.id || !layout[other.id] ? last
    : Math.max(last, layout[other.id].row + cardSize(other).rows), 0);
  const lastCandidate = Math.min(lastOccupied, maxRows - size.rows);
  for (let row = 0; row <= lastCandidate; row++) {
    for (let col = 0; col <= COLUMNS - size.cols; col++) {
      if (canPlace(card, { col, row }, cards, layout, maxRows)) return { col, row };
    }
  }
  return null;
}

/** The Grid reserves the whole rectangle; spacing is ONLY a card paint inset. */
export function canvasItemFrame(card: PreviewCard, position: Position, unit: number) {
  const size = cardSize(card);
  const paint = card.kind === 'decoration' ? { width:size.cols*unit,height:size.rows*unit,inset:0 } : cardPaintSize(size.cols,size.rows,unit);
  const inset = paint.inset;
  return { left: position.col * unit + inset, top: position.row * unit + inset,
    width: paint.width, height: paint.height };
}
