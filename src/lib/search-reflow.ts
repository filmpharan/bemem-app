import { firstFreePosition, MAX_ROWS } from './canvas-layout';
import type { CanvasLayout, PreviewCard } from '../types/wallet-ui';

/** Temporary card-only presentation; never mutates Saved/Draft or writes storage. */
export function searchReflow<T extends PreviewCard>(cards: T[], saved: CanvasLayout, query: string, searchOpen: boolean, maxRows = MAX_ROWS) {
  const term = query.trim().toLocaleLowerCase();
  if (!searchOpen || !term) return { cards, layout: saved, active: false, matchCount: 0, key: '' };
  const matches = cards.filter(card => card.kind !== 'decoration' && card.name.toLocaleLowerCase().includes(term));
  const layout: CanvasLayout = {};
  const placed: T[] = [];
  for (const card of matches) {
    const position = firstFreePosition(card, placed, layout, maxRows);
    if (!position) throw new Error('Search presentation exceeds the supported grid');
    layout[card.id] = position;
    placed.push(card);
  }
  return { cards: matches, layout, active: true, matchCount: matches.length, key: term };
}