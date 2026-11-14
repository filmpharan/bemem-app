import type { DecorationAssetId } from './decoration-catalog';
export const DRAWER_COLUMNS = 8;
export const DRAWER_ROWS = 3;
export const DRAWER_CELLS = DRAWER_COLUMNS * DRAWER_ROWS;
export type DecorationCell = { type: 'asset'; assetId: DecorationAssetId }
  | { type: 'previous' | 'next' | 'empty' };
/** 23 first-page assets,22 middle, up to23 last; no catalog item used for navigation. */
export function decorationPages(assets: readonly DecorationAssetId[]): DecorationCell[][] {
  const pages: DecorationCell[][] = [];
  let offset = 0;
  do {
    const previous = pages.length > 0;
    const available = DRAWER_CELLS - (previous ? 1 : 0);
    const next = assets.length - offset > available;
    const count = Math.min(assets.length - offset, available - (next ? 1 : 0));
    const cells: DecorationCell[] = previous ? [{ type: 'previous' }] : [];
    for (const assetId of assets.slice(offset,offset+count)) cells.push({ type: 'asset', assetId });
    if (next) cells.push({ type: 'next' });
    while (cells.length < DRAWER_CELLS) cells.push({ type: 'empty' });
    pages.push(cells); offset += count;
  } while (offset < assets.length);
  return pages;
}
/** Separate paint size from hit area and from the12-column canvas footprint. */
export function decorationPickerGeometry(width: number) {
  const gap = 2, padding = 8;
  const cell = Math.max(1,(width - 2*padding - gap*(DRAWER_COLUMNS-1))/DRAWER_COLUMNS);
  // A rectangular gesture cell leaves room for three rows at roughly40% drawer height.
  // Its art still uses the measured square canvas unit; this does not resize logical tiles.
  const rowHeight=Math.max(32,Math.min(cell,(width-30)/12+4));
  return { cell, rowHeight, gap, padding, height: DRAWER_ROWS*rowHeight + (DRAWER_ROWS-1)*gap };
}
