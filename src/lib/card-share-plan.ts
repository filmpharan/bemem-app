import type { DisplayFormat, WalletCard } from '../types/membership-card';
import { resolveWalletCardFootprint, validateWalletCard } from './wallet-validation';
import { encodeCardCode } from './card-code';
import { code128DisplaySvg } from './code128-display';
import { cardCodeDataUri } from './card-code';
import { cardPaintSize } from './card-geometry';

export type CardShareOptions = { mode: 'image' | 'scan'; side: 'front' | 'back'; format: DisplayFormat };
export const DEFAULT_SHARE_OPTIONS: CardShareOptions = { mode: 'image', side: 'front', format: 'qr' };
export function prepareCardShare(input: WalletCard, options: CardShareOptions) {
  let card: ReturnType<typeof validateWalletCard>;
  try { card = validateWalletCard(input); }
  catch { throw Error('This card data cannot be prepared for sharing. The saved card is unchanged.'); }
  if (card.kind !== 'membership') throw Error('Sharing is available for membership cards only. Demo codes are not generated.');
  if (!['image', 'scan'].includes(options.mode) || !['front', 'back'].includes(options.side) || !['qr', 'code128'].includes(options.format)) throw Error('Choose a supported sharing option.');
  if (options.side === 'back' && !card.appearance.artwork?.back) throw Error('This card has no Back artwork to share.');
  if (options.side === 'front' && card.appearance.imageAssetId && !Object.hasOwn(card.appearance.artwork ?? {}, 'front')) {
    throw Error('This legacy artwork reference is unavailable for export. The original card is unchanged.');
  }
  const size = resolveWalletCardFootprint(card);
  const paint = cardPaintSize(size.widthBlocks,size.heightBlocks);
  // Five-pixel block units make the .1-per-edge inset integral, retaining exact painted aspect.
  const unit = Math.max(5,5*Math.floor(960 / Math.max(paint.width,paint.height) / 5));
  const cardWidth = Math.round(paint.width * unit), cardHeight = Math.round(paint.height * unit);
  let code: { uri: string; svg: string; width: number; height: number } | null = null;
  if (options.mode === 'scan') {
    const encoded = encodeCardCode(card, options.format);
    if (!encoded.ok) throw Error(encoded.message);
    if (options.format === 'qr') {
      const width = encoded.width * Math.max(4, Math.floor(480 / encoded.width));
      const svg = encoded.svg.replace(`width="${encoded.width}" height="${encoded.height}"`, `width="${width}" height="${width}"`);
      code = { uri: cardCodeDataUri(svg), svg, width, height: width };
    } else {
      if (encoded.width * 3 > 1984) throw Error('Code 128 is too wide to export safely. Choose QR Code instead.');
      const pixelsPerModule = Math.max(3, Math.floor(960 / encoded.width));
      const width = encoded.width * pixelsPerModule, height = encoded.height * 2;
      const svg = code128DisplaySvg(encoded, { width, height, pixelsPerModule, scroll: false }, 1);
      code = { uri: cardCodeDataUri(svg), svg, width, height };
    }
  }
  // Whitelist only visible content and rendering inputs. No ID, revision, timestamp or wallet metadata.
  return { mode: options.mode, side: options.side, format: options.format, name: card.name,
    memberNumber: options.mode === 'scan' ? card.memberNumber : null,
    encodedValue: options.mode === 'scan' ? card.memberNumber : null,
    appearance: card.appearance, orientation: card.orientation, sizePresetId: card.sizePresetId,
    widthBlocks: size.widthBlocks, heightBlocks: size.heightBlocks, cardWidth, cardHeight, code,
    width: code ? Math.max(cardWidth + 64, code.width + 64, 960) : cardWidth };
}
export type CardSharePlan = ReturnType<typeof prepareCardShare>;

export function inspectSharePng(bytes: Uint8Array, expectedWidth?: number) {
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  if (bytes.length < 24 || signature.some((v, i) => bytes[i] !== v)
    || String.fromCharCode(...bytes.slice(12, 16)) !== 'IHDR') throw Error('The generated image is not a valid PNG.');
  const data = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const width = data.getUint32(16), height = data.getUint32(20);
  if (width < 1 || height < 1 || width > 2048 || height > 4096 || width * height > 8_000_000
    || expectedWidth !== undefined && width !== expectedWidth) throw Error('The generated image dimensions could not be verified.');
  return { width, height };
}
