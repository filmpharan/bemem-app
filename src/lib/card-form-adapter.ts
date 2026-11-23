import type { NewMembershipCard } from '../types/membership-card';
import { prepareCardForm, type CardFormValues, type CardFormErrors } from './card-form';
import { WEB_BRANDS, expiryMonthError, type CardPresentationDraft } from './card-presentation';
import { cardSizePreset } from './card-size-presets';
import { validateNewMembershipCard } from './wallet-validation';

export type AddCardAdapterResult = { ok: true; card: NewMembershipCard }
  | { ok: false; errors: CardFormErrors; message: string };

/** Lossless form mapping. Metadata belongs to the caller; this function performs no I/O. */
export function adaptCardForm(values: CardFormValues, presentation: CardPresentationDraft,
  metadata: Pick<NewMembershipCard, 'id' | 'createdAt' | 'updatedAt'>): AddCardAdapterResult {
  const valueKeys = ['name', 'memberNumber', 'payload', 'payloadEdited', 'preferredDisplayFormat', 'orientation', 'colorId'];
  const presentationKeys = ['country', 'brandQuery', 'brandId', 'expiryMonth', 'side', 'sizePresetId', 'gradientPresetId', 'artwork', 'sheetDisplayMode'];
  if (!values || !presentation || Object.keys(values).some(key => !valueKeys.includes(key))
    || Object.keys(presentation).some(key => !presentationKeys.includes(key))
    || valueKeys.filter(key => key !== 'payloadEdited').some(key => typeof values[key as keyof CardFormValues] !== 'string')
    || typeof values.payloadEdited !== 'boolean'
    || (Object.hasOwn(presentation, 'sheetDisplayMode') && presentation.sheetDisplayMode !== 'cardcode' && presentation.sheetDisplayMode !== 'frontback')
    || presentation.country !== 'TH'
    || (presentation.brandId !== null && !WEB_BRANDS.some(brand => brand.id === presentation.brandId))
    || ['country', 'brandQuery', 'expiryMonth', 'sizePresetId'].some(key => typeof presentation[key as keyof CardPresentationDraft] !== 'string')
    || (presentation.brandId !== null && typeof presentation.brandId !== 'string')
    || !['front', 'back'].includes(presentation.side)) {
    return { ok: false, errors: {}, message: 'Unsupported form data.' };
  }
  const base = prepareCardForm(values, metadata);
  if (!base.ok) return { ...base, message: 'Check the highlighted fields.' };
  const expiration = expiryMonthError(presentation.expiryMonth);
  if (expiration) return { ok: false, errors: {}, message: expiration };
  try {
    const preset = cardSizePreset(presentation.sizePresetId);
    const gradientPresetId = presentation.gradientPresetId ?? null;
    const card = validateNewMembershipCard({ ...base.card,
      sheetDisplayMode: presentation.sheetDisplayMode ?? 'cardcode',
      sizePresetId: preset.id, widthBlocks: preset.ratioWidth, heightBlocks: preset.ratioHeight,
      expiryMonth: presentation.expiryMonth, appearance: { ...base.card.appearance, gradientPresetId,
        // Existing gradient previews use white text; keep newly persisted Home cards consistent.
        textColor: gradientPresetId ? '#ffffff' : base.card.appearance.textColor,
        ...(presentation.artwork !== undefined ? { artwork: presentation.artwork } : {}) } });
    return { ok: true, card };
  } catch {
    return { ok: false, errors: {}, message: 'Check the card size, orientation, appearance choices.' };
  }
}
