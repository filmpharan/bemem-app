import { cardSizePreset, type CardSizePresetId } from '../../lib/card-size-presets';
import { cardPaintSize } from '../../lib/card-geometry';

/** Approved original-parity draft geometry, independent of theme colors. */
export const addCardLayout = {
  padding: 20, gap: 12, previewGap: 16, toolSize: 36, iconSize: 16,
  inputHeight: 44, selectorHeight: 36, sheetRadius: 22, fieldRadius: 14, buttonRadius: 8,
} as const;
export function cardPreviewSize(contentWidth: number, id: CardSizePresetId) {
  const preset = cardSizePreset(id);
  const baseWidth = preset.orientation === 'portrait' ? Math.min(144, contentWidth) : contentWidth * 2 / 3;
  const width = baseWidth * preset.previewScale;
  const paint = cardPaintSize(preset.ratioWidth,preset.ratioHeight);
  return { width, height: width * paint.height / paint.width };
}
