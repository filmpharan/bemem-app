import { cardSizePreset, cardSizePresetsFor, type CardSizePresetId } from '../../lib/card-size-presets';
import { cardPaintSize } from '../../lib/card-geometry';

/** Approved original-parity draft geometry, independent of theme colors. */
export const addCardLayout = {
  padding: 20, gap: 12, previewGap: 16, toolSize: 36, iconSize: 16,
  inputHeight: 44, selectorHeight: 36, sheetRadius: 22, fieldRadius: 14, buttonRadius: 8,
} as const;
/** One painted-block unit per orientation, constrained by its largest footprint.
 * Inset is inherited from cardPaintSize (0.1 block per side), never saved geometry. */
export function cardCarouselLayout(contentWidth: number, id: CardSizePresetId) {
  const selected = cardSizePreset(id), presets = cardSizePresetsFor(selected.orientation);
  const viewport = Math.max(1, contentWidth);
  const paints = presets.map(p => cardPaintSize(p.ratioWidth, p.ratioHeight));
  const maxWidth = Math.max(...paints.map(p => p.width));
  const maxHeight = Math.max(...paints.map(p => p.height));
  const unit = Math.min(viewport * .84 / maxWidth, (selected.orientation === 'portrait' ? 240 : 180) / maxHeight);
  const sizes = paints.map(p => ({ width: p.width * unit, height: p.height * unit }));
  const gap = 20;
  let center = sizes[0].width / 2;
  const offsets = sizes.map((size, index) => {
    if (index) center += sizes[index - 1].width / 2 + gap + size.width / 2;
    return center - sizes[0].width / 2;
  });
  return { presets, sizes, offsets, unit, gap, viewport, height: maxHeight * unit + 16,
    leading: (viewport - sizes[0].width) / 2, trailing: (viewport - sizes[sizes.length - 1].width) / 2 };
}
export function cardPreviewSize(contentWidth: number, id: CardSizePresetId) {
  const model = cardCarouselLayout(contentWidth, id);
  return model.sizes[model.presets.findIndex(p => p.id === id)];
}
export function nearestCarouselIndex(offsets: readonly number[], x: number) {
  return offsets.reduce((best, offset, index) => Math.abs(offset - x) < Math.abs(offsets[best] - x) ? index : best, 0);
}
