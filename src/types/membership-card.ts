import type { Orientation } from './wallet-ui';
import type { CardSizePresetId } from '../lib/card-size-presets';
import type { CardPresentationDraft, WEB_BRANDS } from '../lib/card-presentation';

export type DisplayFormat = 'qr' | 'code128';
export type CardSheetDisplayMode = 'cardcode' | 'frontback';
export type CardArtwork = {
  assetId: string; width: number; height: number; byteLength: number; md5: string;
  crop: { x: number; y: number; zoom: number };
};
export type CardArtworkPair = { front?: CardArtwork | null; back?: CardArtwork | null };
export type BrandId = typeof WEB_BRANDS[number]['id'];
export type GradientPresetId = Extract<typeof WEB_BRANDS[number], { gradient: readonly string[] }>['id'];
export type MembershipCardDetails = {
  sizePresetId: CardSizePresetId;
  widthBlocks: number;
  heightBlocks: number;
  country: CardPresentationDraft['country'];
  brandId: BrandId | null;
  /** Exact form text; may be empty or a custom brand. */
  brandQuery: string;
  /** Calendar string: YYYY-MM-DD, legacy YYYY-MM, or empty. No timestamp conversion. */
  expiryMonth: string;
};

export type DemoCard = {
  kind: 'demo';
  id: string;
  name: string;
  orientation: Orientation;
  colors: readonly [string, string];
};

/** Legacy-compatible read shape. Runtime validation requires the size triple
 * to be either completely absent or complete and consistent. */
export type MembershipCard = Partial<MembershipCardDetails> & {
  kind: 'membership';
  id: string;
  name: string;
  memberNumber: string | null;
  /** Exact source text for BOTH renderers. Never trim, normalize, or parse as a number. */
  payload: string;
  preferredDisplayFormat: DisplayFormat;
  /** Absent legacy records use cardcode without backfilling persisted data. */
  sheetDisplayMode?: CardSheetDisplayMode;
  orientation: Orientation;
  appearance: {
    backgroundColor: string;
    textColor: string;
    /** Future local asset ID, never a remote URL or absolute filesystem path. */
    imageAssetId: string | null;
    gradientPresetId?: GradientPresetId | null;
    artwork?: CardArtworkPair;
  };
  createdAt: string;
  updatedAt: string;
};

/** Strict creation contract for a future Add Card adapter; not mounted in runtime. */
export type NewMembershipCard = MembershipCard & Pick<MembershipCardDetails, 'sizePresetId' | 'widthBlocks' | 'heightBlocks' | 'expiryMonth'> & {
  appearance: MembershipCard['appearance'] & { gradientPresetId: GradientPresetId | null };
};

export type WalletCard = DemoCard | MembershipCard;
