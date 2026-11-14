import type { MembershipCard } from '../types/membership-card';
import { CARD_SIZE_PRESETS } from './card-size-presets';
import { canvasMetrics } from './canvas-layout';
import { resolveWalletCardFootprint } from './wallet-validation';
import { CARD_CORNER_RADIUS } from '../constants/card-appearance';
import { cardPaintSize } from './card-geometry';

/** Read-only Detail projection. Width is the same capped screen used by Create;
 * its Canvas has 16-unit margins. One fit scale covers ALL supported presets.
 */
export function cardDetailGeometry(card: Readonly<MembershipCard>, screenWidth: number, slotWidth: number) {
  if (!Number.isFinite(screenWidth) || screenWidth <= 32 || !Number.isFinite(slotWidth) || slotWidth <= 0) throw Error('Invalid detail geometry');
  const footprint = resolveWalletCardFootprint(card);
  const widthBlocks = card.widthBlocks ?? footprint.widthBlocks;
  const heightBlocks = card.heightBlocks ?? footprint.heightBlocks;
  const blockUnit = canvasMetrics(Math.min(screenWidth, 600) - 32, 0, [], {}, false).unit;
  const maxWidth = Math.max(...CARD_SIZE_PRESETS.map(size => size.ratioWidth));
  const maxHeight = Math.max(...CARD_SIZE_PRESETS.map(size => size.ratioHeight));
  const scale = Math.min(1, slotWidth / (maxWidth * blockUnit));
  const unit = blockUnit * scale, paint = cardPaintSize(widthBlocks,heightBlocks,unit), inset = paint.inset;
  return { widthBlocks, heightBlocks, blockUnit, scale, displayUnit: unit,
    footprintWidth: widthBlocks * unit, footprintHeight: heightBlocks * unit,
    paintWidth: paint.width, paintHeight: paint.height,
    inset, stageHeight: maxHeight * unit, radius: CARD_CORNER_RADIUS };
}
