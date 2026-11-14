import { expirationDateError } from './expiration-date';
import type { MembershipCard } from '../types/membership-card';
import type { WalletDocument } from '../types/wallet-document';
import { DEFAULT_CARD_SIZE_PRESET, type CardSizePresetId } from './card-size-presets';
import type { CardArtworkPair, GradientPresetId } from '../types/membership-card';

/** Controlled editor fields; the existing adapter persists supported metadata without temporary URIs. */
export type CardPresentationDraft = {
  country: 'TH'; brandQuery: string; brandId: string | null; expiryMonth: string; side: 'front' | 'back';
  sizePresetId: CardSizePresetId;
  gradientPresetId?: GradientPresetId | null;
  artwork?: CardArtworkPair;
};
export const WEB_BRANDS = [
  { id: 'seven', name: 'All Member (7-Eleven)', gradient: ['#499641', '#e48e25', '#dd2926'] },
  { id: 'the1', name: 'The 1', gradient: ['#1d222d', '#9d2343'] },
  { id: 'ptt', name: 'PTT Blue Card', gradient: ['#1549a2', '#329bc5'] },
  { id: 'mcard', name: 'M Card', gradient: null },
  { id: 'lotus', name: "Lotus's", gradient: ['#13847e', '#49bda0'] },
  { id: 'bigc', name: 'Big Point (Big C)', gradient: null },
] as const;
export function emptyCardPresentation(): CardPresentationDraft {
  // Preserve the approved default artwork independently of the removed brand workflow.
  return { country: 'TH', brandQuery: '', brandId: null, gradientPresetId: 'ptt', expiryMonth: '', side: 'front', sizePresetId: DEFAULT_CARD_SIZE_PRESET };
}
export function expiryMonthError(value: string): string | undefined {
  return expirationDateError(value);
}

/** Only active snapshot metadata is removed; immutable earlier revisions are retained for recovery.
 * The caller must submit through the existing guarded Save, never write during form opening. */
export function withoutObsoleteBrands(wallet: WalletDocument,page:CanvasPage=1): WalletDocument {
  return { ...wallet, cards: wallet.cards.map(card => {
    if (itemCanvasPage(wallet,card.id)!==page||card.kind !== 'membership' || (!('brandId' in card) && !('brandQuery' in card))) return card;
    return withoutObsoleteCardBrand(card);
  }) };
}

export function withoutObsoleteCardBrand(card: MembershipCard): MembershipCard {
  const { brandId: _brandId, brandQuery: _brandQuery, ...preserved } = card;
  return preserved;
}

/** Existing supported gradients; sampled once per new form and persisted on Add/Save. */
export function newCardPresentation(random: () => number = Math.random): CardPresentationDraft {
  const choices = [null, null, 'seven', 'the1', 'ptt', 'lotus'] as const;
  const at = Math.min(choices.length - 1, Math.max(0, Math.floor(random() * choices.length)));
  return { ...emptyCardPresentation(), gradientPresetId: choices[at] };
}
import { itemCanvasPage,type CanvasPage } from './canvas-pages';
