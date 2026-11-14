import { Image } from 'expo-image';
import { lagoon } from '../../constants/lagoon-theme';
import { addCardLayout } from './add-card-layout';

// Existing Lucide paths (ISC) retain their reconstruction-folder license.
// Refined bemem sources: assets/icons/bemem-functional/ (24-unit grid).
const paths = {
  lock: '<rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/>',
  // Existing bemem Signature outlines; button surfaces remain outside the SVG.
  undo: '<path d="M4 9H12Q20 9 20 17V19M4 9L8 5M4 9L8 13"/>',
  redo: '<g transform="translate(24 0) scale(-1 1)"><path d="M4 9H12Q20 9 20 17V19M4 9L8 5M4 9L8 13"/></g>',
  check: '<path d="M5 12L8.5 15.5Q10 17 11.5 15.5L19 7"/>',
  fullscreen: '<path d="M8 3H5Q3 3 3 5V8M16 3H19Q21 3 21 5V8M21 16V19Q21 21 19 21H16M8 21H5Q3 21 3 19V16"/>',
  home: '<path d="M3 10L12 3L21 10M5 9V19Q5 21 7 21H10V14H14V21H17Q19 21 19 19V9"/>',
  delete: '<path d="M4 6H20M9 6V4Q9 3 10 3H14Q15 3 15 4V6M6 9L7 18Q7 21 10 21H14Q17 21 17 18L18 9M10 11V17M14 11V17"/>',
  rotate: '<path d="M19.5 8C18 4 13.5 2.5 9.5 4C5.5 5.5 3.5 9.5 4.2 13.5C5 18 9 21 13.5 20C16 19.5 18 18 19 16M19.5 3.5V8H15M9 14V10H13"/>',
  'add-card': '<path d="M10 6H6Q3 6 3 9V17Q3 20 6 20H18Q21 20 21 17V13M17 3V10M13.5 6.5H20.5M7 15H12"/>',
  decorate: '<path d="M20.5 12.5C22 8 18.5 3 12.5 3C7 3 3 7 3 12C3 17 6.5 21 11 21H12.5C14.5 21 15 19 13.8 17.5C12.7 16 13.6 14 15.5 14H18.5Q20 14 20.5 12.5Z"/><circle cx="7.5" cy="10" r="1"/><circle cx="11" cy="6.8" r="1"/><circle cx="16" cy="7.6" r="1"/>',
  policy: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 8H16M8 12H16M8 16H13"/>',
  edit: '<path d="m16 3 5 5-12 12-6 1 1-6L16 3Zm-1 1 5 5"/>',
  more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  close: '<path d="M18 6 6 18M6 6l12 12"/>',
  share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 10.5 6.8-4M8.6 13.5l6.8 4"/>',
  history: '<path d="M3 11a9 9 0 1 1 3 7M3 5v6h6m3-4v5l3 2"/>',
  qr: '<path d="M3 3h6v6H3zM15 3h6v6h-6zM3 15h6v6H3zM15 14h2v3h4v4h-3m-6-9h2m-2 8h3m6-8v2M3 12h4"/>',
  barcode: '<path d="M3 4v16M6 4v16m4-16v16m3-16v16m4-16v16m4-16v16"/>',
  flip: '<path d="m3 7 5 5-5 5V7m18 0-5 5 5 5V7M12 20v2m0-8v2m0-8v2m0-8v2"/>',
  image: '<path d="M16 5h6m-3-3v6m2 3.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7.5M21 15l-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/><circle cx="9" cy="9" r="2"/>',
  camera: '<path d="M13.997 4a2 2 0 0 1 1.76 1.05l.486.9A2 2 0 0 0 18.003 7H20a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1.997a2 2 0 0 0 1.759-1.048l.489-.904A2 2 0 0 1 10.004 4z"/><circle cx="12" cy="13" r="3"/>',
  chevron: '<path d="m6 9 6 6 6-6"/>',
  pin: '<path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
} as const;
// Android's installed expo-image Base64DataFetcher treats every data: source
// as Base64. Percent-encoded SVG therefore never reaches the SVG decoder.
function iconBase64(ascii: string) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';
  for (let index = 0; index < ascii.length; index += 3) {
    const word = (ascii.charCodeAt(index) << 16) | ((ascii.charCodeAt(index + 1) || 0) << 8) | (ascii.charCodeAt(index + 2) || 0);
    result += alphabet[(word >>> 18) & 63] + alphabet[(word >>> 12) & 63]
      + (index + 1 < ascii.length ? alphabet[(word >>> 6) & 63] : '=')
      + (index + 2 < ascii.length ? alphabet[word & 63] : '=');
  }
  return result;
}
export function AddCardIcon({ name, color = lagoon.text.primary, size = addCardLayout.iconSize }: {
  name: keyof typeof paths; color?: string; size?: number;
}) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths[name]}</svg>`;
  return <Image accessible={false} source={{ uri: `data:image/svg+xml;base64,${iconBase64(svg)}` }}
    cachePolicy="none" contentFit="contain" transition={0} style={{ width: size, height: size }} />;
}
