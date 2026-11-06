import { cardSize, COLUMNS, MAX_ROWS } from './canvas-layout';
import type { CanvasLayout, PreviewCard } from '../types/wallet-ui';

/** Home-only presentation. No session actions, persistence, or input mutation. */
export function searchReflow(cards: PreviewCard[], saved: CanvasLayout, query: string, searchOpen: boolean) {
  const term = query.trim().toLocaleLowerCase();
  if (!searchOpen || !term) return { cards, layout: saved, active: false, matchCount: 0, key: '' };
  // Binary name match retains the previous search rule; explicit index breaks ties.
  const ranked = cards.map((card, index) => ({ card, index, match: card.name.toLocaleLowerCase().includes(term) }))
    .sort((a, b) => Number(b.match) - Number(a.match) || a.index - b.index);
  const ordered = ranked.map(item => item.card);
  const layout: CanvasLayout = {};
  let col = 0, row = 0, rowHeight = 0;
  for (const card of ordered) {
    const size = cardSize(card);
    // Stable shelves keep ALL matching cards visually ahead of nonmatches.
    // Do not backfill earlier holes with later cards of a different orientation.
    if (col + size.cols > COLUMNS) { row += rowHeight; col = 0; rowHeight = 0; }
    if (row + size.rows > MAX_ROWS) throw new Error('Search presentation exceeds the supported grid');
    layout[card.id] = { col, row };
    col += size.cols;
    rowHeight = Math.max(rowHeight, size.rows);
  }
  return { cards: ordered, layout, active: true, matchCount: ranked.filter(item => item.match).length, key: term };
}
