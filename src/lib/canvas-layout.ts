import type { CanvasLayout, Position, PreviewCard } from '../types/wallet-ui';

export const COLUMNS = 12;
export const MAX_ROWS = 240;
export const cardSize = (card: PreviewCard) => card.orientation === 'portrait'
  ? { cols: 4, rows: 6 } : { cols: 6, rows: 4 };

export function canPlace(card: PreviewCard, position: Position, cards: PreviewCard[], layout: CanvasLayout) {
  const size = cardSize(card);
  if (!Number.isInteger(position.col) || !Number.isInteger(position.row)
    || position.col < 0 || position.row < 0
    || position.col + size.cols > COLUMNS || position.row + size.rows > MAX_ROWS) return false;
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
export function canvasMetrics(width: number, minHeight: number, cards: PreviewCard[], layout: CanvasLayout, editing: boolean) {
  const unit = Math.max(1, width) / COLUMNS;
  const lastRow = Math.max(0, ...cards.map(c => (layout[c.id]?.row ?? 0) + cardSize(c).rows));
  const rows = Math.min(MAX_ROWS, Math.max(Math.ceil(minHeight / unit), lastRow + (editing ? 10 : 2)));
  return { unit, rows, height: rows * unit };
}

export function dropPosition(card: PreviewCard, start: Position, dx: number, dy: number, unit: number): Position {
  const size = cardSize(card);
  return {
    col: Math.max(0, Math.min(COLUMNS - size.cols, start.col + Math.round(dx / unit))),
    row: Math.max(0, Math.min(MAX_ROWS - size.rows, start.row + Math.round(dy / unit))),
  };
}
