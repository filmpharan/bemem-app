import type { MembershipCard } from '../types/membership-card';
import { resolveWalletCardFootprint } from './wallet-validation';
import { cardPaintSize } from './card-geometry';

/** Fit the actual painted card (the existing 0.1-block inset on each side). No saved resize. */
export function fullCardFit(card: Readonly<MembershipCard>, width: number, height: number) {
  const size = resolveWalletCardFootprint(card);
  const { width:w,height:h } = cardPaintSize(size.widthBlocks,size.heightBlocks);
  const scale = Math.max(0, Math.min(width / w, height / h));
  return { width: w * scale, height: h * scale, portrait: size.heightBlocks > size.widthBlocks };
}
