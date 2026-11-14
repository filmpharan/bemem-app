/** Narrow declaration for the installed pure encoder entry, without Node/canvas renderers. */
declare module 'qrcode/lib/core/qrcode' {
  export function create(segments: { data: Uint8Array; mode: 'byte' }[], options: { errorCorrectionLevel: 'M' }): {
    modules: { size: number; data: Uint8Array };
  };
}
