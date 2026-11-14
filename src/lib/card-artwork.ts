import type { CardArtwork } from '../types/membership-card';

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_IMAGE_PIXELS = 24_000_000;
export const ARTWORK_ID = /^art-[a-zA-Z0-9-]{1,80}\.(jpg|png|webp)$/;
export function validateImageSelection(value: { uri: string; width: number; height: number; fileSize?: number; mimeType?: string | null; type?: string | null }) {
  if (!value || typeof value.uri !== 'string' || !/^(file|content):\/\//.test(value.uri)
    || value.type && value.type !== 'image' || !Number.isSafeInteger(value.width) || !Number.isSafeInteger(value.height)
    || value.width < 1 || value.height < 1) throw Error('Choose a valid local image.');
  if (value.width * value.height > MAX_IMAGE_PIXELS || (value.fileSize ?? 0) > MAX_IMAGE_BYTES) throw Error('Choose an image up to 10 MB and 24 megapixels.');
  if (value.mimeType && !['image/jpeg', 'image/png', 'image/webp'].includes(value.mimeType)) throw Error('Choose a JPEG, PNG or WebP image.');
  const extension = value.mimeType === 'image/png' ? 'png' : value.mimeType === 'image/webp' ? 'webp'
    : value.mimeType === 'image/jpeg' ? 'jpg' : /\.(jpg|jpeg)(\?|$)/i.test(value.uri) ? 'jpg'
      : /\.(png|webp)(\?|$)/i.exec(value.uri)?.[1]?.toLowerCase();
  if (!extension) throw Error('Choose a JPEG, PNG or WebP image.');
  return extension;
}
/** Cover with one uniform scale; normalized offsets are portable across all seven card ratios. */
export function artworkFrame(image: Pick<CardArtwork, 'width' | 'height' | 'crop'>, width: number, height: number) {
  const scale = Math.max(width / image.width, height / image.height) * image.crop.zoom;
  const w = image.width * scale, h = image.height * scale;
  return { width: w, height: h, left: -(w - width) * image.crop.x, top: -(h - height) * image.crop.y };
}
