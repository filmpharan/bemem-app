import { create as createQR } from 'qrcode/lib/core/qrcode';
import JsBarcode from 'jsbarcode';
import type { DisplayFormat, MembershipCard } from '../types/membership-card';
import { payloadCapabilities } from './wallet-validation';

export type CardCode = { ok: true; format: DisplayFormat; svg: string; width: number; height: number }
  | { ok: false; code: 'demo_card' | 'invalid_payload' | 'unsupported_code128' | 'encoding_failed'; message: string };

/** Explicit UTF-8 bytes avoid a global TextEncoder/Buffer polyfill on Hermes.
 * Called only after the model's Unicode validation; no replacement, trim or normalization.
 */
function utf8(value: string) {
  const bytes: number[] = [];
  for (const character of value) {
    const c = character.codePointAt(0)!;
    if (c < 0x80) bytes.push(c);
    else if (c < 0x800) bytes.push(0xc0 | c >> 6, 0x80 | c & 63);
    else if (c < 0x10000) bytes.push(0xe0 | c >> 12, 0x80 | c >> 6 & 63, 0x80 | c & 63);
    else bytes.push(0xf0 | c >> 18, 0x80 | c >> 12 & 63, 0x80 | c >> 6 & 63, 0x80 | c & 63);
  }
  return new Uint8Array(bytes);
}
function svg(width: number, height: number, path: string) {
  // Contains geometry only: no raw payload in XML, accessibility or file/URL metadata.
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" shape-rendering="crispEdges"><rect width="${width}" height="${height}" fill="#ffffff"/><path fill="#000000" d="${path}"/></svg>`;
}
function qr(value: string): Extract<CardCode, { ok: true }> {
  const { modules } = createQR([{ data: utf8(value), mode: 'byte' }], { errorCorrectionLevel: 'M' });
  const quiet = 4, width = modules.size + quiet * 2;
  let path = '';
  for (let row = 0; row < modules.size; row++) {
    for (let col = 0; col < modules.size;) {
      if (!modules.data[row * modules.size + col]) { col++; continue; }
      const start = col;
      while (col < modules.size && modules.data[row * modules.size + col]) col++;
      const length = col - start;
      path += `M${start + quiet} ${row + quiet}h${length}v1h-${length}z`;
    }
  }
  return { ok: true, format: 'qr', width, height: width, svg: svg(width, width, path) };
}
function code128(value: string): Extract<CardCode, { ok: true }> {
  const target: { encodings?: { data: string }[] } = {};
  // Object renderer yields modules only, never creates a DOM, canvas or native view.
  JsBarcode(target, value, { format: 'CODE128', displayValue: false, margin: 0 });
  const bits = target.encodings?.map(segment => segment.data).join('');
  if (!bits || !/^[01]+$/.test(bits)) throw Error('invalid_encoding');
  const quiet = 10, top = 8, bars = 110, width = bits.length + quiet * 2, height = bars + top * 2;
  let path = '';
  for (let index = 0; index < bits.length;) {
    if (bits[index] !== '1') { index++; continue; }
    const start = index;
    while (bits[index] === '1') index++;
    const length = index - start;
    path += `M${quiet + start} ${top}h${length}v${bars}h-${length}z`;
  }
  return { ok: true, format: 'code128', width, height, svg: svg(width, height, path) };
}

/** Encoding reads the membership Number for both formats; obsolete payload is ignored for both formats. No storage/network/logging. */
export function encodeCardCode(card: Pick<MembershipCard, 'kind' | 'memberNumber'> | { kind: 'demo' }, format: DisplayFormat): CardCode {
  if (card.kind !== 'membership') return { ok: false, code: 'demo_card', message: 'Demo cards do not have scannable codes.' };
  if (typeof card.memberNumber !== 'string' || !card.memberNumber.length) return { ok: false, code: 'invalid_payload', message: 'This card has no Number. Add one in Create to display a code.' };
  let eligible: boolean;
  try { eligible = payloadCapabilities(card.memberNumber).code128.eligible; }
  catch { return { ok: false, code: 'invalid_payload', message: 'This code value is invalid. The stored value has not been changed.' }; }
  if (format === 'code128' && !eligible) return { ok: false, code: 'unsupported_code128', message: 'Code 128 supports printable ASCII only. Choose QR Code; the original value is unchanged.' };
  if (format === 'code128' && card.memberNumber.length > 4096) return { ok: false, code: 'encoding_failed', message: 'This code value is too long to render safely. The stored value is unchanged.' };
  try { return format === 'qr' ? qr(card.memberNumber) : code128(card.memberNumber); }
  catch { return { ok: false, code: 'encoding_failed', message: 'Unable to generate this code. It may exceed the supported capacity. The stored value is unchanged.' }; }
}

/** SVG is ASCII geometry; use Base64 for the installed Android expo-image loader. */
export function cardCodeDataUri(ascii: string) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let encoded = '';
  for (let index = 0; index < ascii.length; index += 3) {
    const word = ascii.charCodeAt(index) << 16 | (ascii.charCodeAt(index + 1) || 0) << 8 | (ascii.charCodeAt(index + 2) || 0);
    encoded += alphabet[word >>> 18 & 63] + alphabet[word >>> 12 & 63]
      + (index + 1 < ascii.length ? alphabet[word >>> 6 & 63] : '=') + (index + 2 < ascii.length ? alphabet[word & 63] : '=');
  }
  return `data:image/svg+xml;base64,${encoded}`;
}

/** Whole physical pixels per module. Too-wide codes are marked unavailable,
 * rather than clipped or squeezed below the minimum. No effect on Canvas geometry.
 */
export function cardCodeFrame(code: Extract<CardCode, { ok: true }>, availableDp: number, density: number, maxHeight = Infinity) {
  const scale = Math.max(1, density), budget = Math.max(1, availableDp);
  const pixels = Math.max(2, Math.floor((code.format === 'qr' ? Math.min(maxHeight, budget) : budget) * scale / code.width));
  const width = code.width * pixels / scale;
  const height = code.format === 'qr' ? width : Math.min(maxHeight, Math.max(140, Math.min(180, budget * 0.55)));
  return { width, height, scroll: width > (code.format === 'qr' ? Math.min(maxHeight, budget) : budget), pixelsPerModule: pixels };
}
