import type { CardCode } from './card-code';

/** Presentation only: map the existing encoder's bar runs to whole physical pixels.
 * expo-image Android derives intrinsic dimensions from viewBox, not width/height.
 * Giving all three the SAME pixel geometry avoids a second aspect-ratio fit.
 * No payload is read, encoded, normalized or written here; no transform is used.
 */
export function code128DisplaySvg(code: Extract<CardCode, { ok: true }>,
  frame: { width: number; height: number; pixelsPerModule: number; scroll: boolean }, density: number) {
  if (code.format !== 'code128' || frame.scroll || !Number.isFinite(density) || density <= 0
    || !Number.isSafeInteger(frame.pixelsPerModule) || frame.pixelsPerModule < 2) throw Error('Invalid barcode display frame');
  const width = Math.round(frame.width * density), height = Math.round(frame.height * density);
  if (width !== code.width * frame.pixelsPerModule || !Number.isSafeInteger(height) || height < 1) throw Error('Inconsistent barcode pixel frame');
  const match = /<path fill="#000000" d="([^"]*)"\/>/.exec(code.svg);
  if (!match || !match[1]) throw Error('Unsupported barcode geometry');
  const sourcePath = match[1];
  const pattern = /M(\d+) (\d+)h(\d+)v(\d+)h-(\d+)z/g;
  let consumed = '', path = '';
  for (const run of sourcePath.matchAll(pattern)) {
    const [, rawX, rawY, rawWidth, rawHeight, rawClose] = run;
    const x = Number(rawX), y = Number(rawY), w = Number(rawWidth), h = Number(rawHeight);
    if (w < 1 || h < 1 || w !== Number(rawClose) || x < 0 || x + w > code.width || y < 0 || y + h > code.height) throw Error('Invalid barcode run');
    const left = x * frame.pixelsPerModule, barWidth = w * frame.pixelsPerModule;
    // Extrude all bars to the chosen display height; horizontal modules remain exact.
    const top = Math.round(y * height / code.height), bottom = Math.round((y + h) * height / code.height);
    if (bottom <= top) throw Error('Invalid barcode bar height');
    path += `M${left} ${top}h${barWidth}v${bottom - top}h-${barWidth}z`;
    consumed += run[0];
  }
  if (consumed !== sourcePath || !path) throw Error('Unsupported barcode path');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet" shape-rendering="crispEdges"><rect width="${width}" height="${height}" fill="#ffffff"/><path fill="#000000" d="${path}"/></svg>`;
}
