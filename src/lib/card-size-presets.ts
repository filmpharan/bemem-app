import type { Orientation } from '../types/wallet-ui';

/** Dimension source of truth. Sandbox now uses these integer dimensions as full
 * block footprints by explicit owner approval; previewScale is presentation only. */
export const CARD_SIZE_PRESETS = [
  { id: 'mini-landscape', label: 'Mini 3×2', orientation: 'landscape', ratioWidth: 3, ratioHeight: 2, previewScale: 0.5, family: 'mini' },
  { id: 'photo-landscape', label: 'Photo 4×3', orientation: 'landscape', ratioWidth: 4, ratioHeight: 3, previewScale: 1, family: 'photo' },
  { id: 'card-landscape', label: 'Card 6×4', orientation: 'landscape', ratioWidth: 6, ratioHeight: 4, previewScale: 1, family: 'card' },
  { id: 'voucher-landscape', label: 'Voucher 7×3', orientation: 'landscape', ratioWidth: 7, ratioHeight: 3, previewScale: 1, family: 'special' },
  { id: 'boarding-pass-landscape', label: 'Boarding Pass 8×4', orientation: 'landscape', ratioWidth: 8, ratioHeight: 4, previewScale: 1, family: 'special' },
  { id: 'mini-portrait', label: 'Mini 2×3', orientation: 'portrait', ratioWidth: 2, ratioHeight: 3, previewScale: 0.5, family: 'mini' },
  { id: 'photo-portrait', label: 'Photo 3×4', orientation: 'portrait', ratioWidth: 3, ratioHeight: 4, previewScale: 1, family: 'photo' },
  { id: 'card-portrait', label: 'Card 4×6', orientation: 'portrait', ratioWidth: 4, ratioHeight: 6, previewScale: 1, family: 'card' },
  { id: 'vaccine-passport-portrait', label: 'Vaccine Passport 5×7', orientation: 'portrait', ratioWidth: 5, ratioHeight: 7, previewScale: 1, family: 'special' },
] as const;
export type CardSizePresetId = typeof CARD_SIZE_PRESETS[number]['id'];
export const DEFAULT_CARD_SIZE_PRESET: CardSizePresetId = 'card-landscape';
export function cardSizePreset(id: CardSizePresetId) {
  const preset = CARD_SIZE_PRESETS.find(candidate => candidate.id === id);
  if (!preset) throw new Error('Unknown card size preset.');
  return preset;
}
export function cardSizePresetsFor(orientation: Orientation) {
  return CARD_SIZE_PRESETS.filter(preset => preset.orientation === orientation);
}
export function sizePresetForOrientation(id: CardSizePresetId, orientation: Orientation): CardSizePresetId {
  const current = cardSizePreset(id);
  if (current.orientation === orientation) return current.id;
  // Mini, Photo and Card retain their family; special shapes have no direct counterpart.
  return `${current.family === 'mini' || current.family === 'photo' ? current.family : 'card'}-${orientation}` as CardSizePresetId;
}

/** Copy only these two presentation properties; never reset or serialize form values. */
export function selectCardSize<V extends { orientation: Orientation }, P extends { sizePresetId: CardSizePresetId }>(
  values: V, presentation: P, id: CardSizePresetId,
) {
  const preset = cardSizePreset(id);
  return { values: { ...values, orientation: preset.orientation }, presentation: { ...presentation, sizePresetId: preset.id } };
}
