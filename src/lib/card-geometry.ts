/** Existing Canvas paint contract, separate from the whole-block collision footprint. */
export const CARD_PAINT_INSET = 0.1;
export function cardPaintSize(widthBlocks: number, heightBlocks: number, unit = 1) {
  const inset = CARD_PAINT_INSET * unit;
  return { width: widthBlocks * unit - 2 * inset,
    height: heightBlocks * unit - 2 * inset, inset };
}
