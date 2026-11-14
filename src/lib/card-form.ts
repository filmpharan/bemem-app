import type { DisplayFormat, MembershipCard } from '../types/membership-card';
import type { Orientation } from '../types/wallet-ui';
import { validateWalletCard, WalletValidationError } from './wallet-validation';

// Card artwork choices, independent of the app theme palette.
export const CARD_COLORS = [
  { id: 'slate', name: 'Slate', background: '#405764', text: '#ffffff' },
  { id: 'lagoon', name: 'Lagoon', background: '#186b64', text: '#ffffff' },
  { id: 'leaf', name: 'Leaf', background: '#b5d88c', text: '#143f3c' },
  { id: 'sky', name: 'Sky', background: '#8bbccf', text: '#143f3c' },
  { id: 'lilac', name: 'Lilac', background: '#b5a4d6', text: '#143f3c' },
  { id: 'clay', name: 'Clay', background: '#d69d83', text: '#143f3c' },
] as const;
export type CardFormValues = {
  name: string; memberNumber: string; payload: string; payloadEdited: boolean;
  preferredDisplayFormat: DisplayFormat; orientation: Orientation; colorId: string;
};
export type CardFormField = 'name' | 'memberNumber' | 'payload' | 'preferredDisplayFormat' | 'orientation' | 'colorId';
export type CardFormErrors = Partial<Record<CardFormField, string>>;
export function emptyCardForm(): CardFormValues {
  return { name: '', memberNumber: '', payload: '', payloadEdited: false, preferredDisplayFormat: 'qr', orientation: 'landscape', colorId: 'slate' };
}
export function changeMembershipNumber(values: CardFormValues, text: string): CardFormValues {
  return { ...values, memberNumber: text, payload: text, payloadEdited: false };
}
/** Assign once in the Add editor initializer, never in a card renderer. */
export function newCardForm(random: () => number = Math.random): CardFormValues {
  const at = Math.min(CARD_COLORS.length - 1, Math.max(0, Math.floor(random() * CARD_COLORS.length)));
  return { ...emptyCardForm(), colorId: CARD_COLORS[at].id };
}

/** Future callers supply real local metadata; this helper NEVER writes or creates IDs. */
export function prepareCardForm(values: CardFormValues, metadata: Pick<MembershipCard, 'id' | 'createdAt' | 'updatedAt'>):
  { ok: true; card: MembershipCard } | { ok: false; errors: CardFormErrors } {
  const errors: CardFormErrors = {};
  if (!values.name.trim()) errors.name = 'Enter a card name.';
  if (!values.memberNumber.trim()) errors.memberNumber = 'Enter a membership number.';
  const color = CARD_COLORS.find(c => c.id === values.colorId);
  if (!color) errors.colorId = 'Choose a card color.';
  if (Object.keys(errors).length) return { ok: false, errors };
  try {
    const card = validateWalletCard({ kind: 'membership', ...metadata, name: values.name, memberNumber: values.memberNumber,
      payload: values.memberNumber, preferredDisplayFormat: 'qr', orientation: values.orientation,
      appearance: { backgroundColor: color!.background, textColor: color!.text, imageAssetId: null } });
    return { ok: true, card: card as MembershipCard };
  } catch (error) {
    if (error instanceof WalletValidationError) {
      const field: CardFormField = error.path.endsWith('.memberNumber') ? 'memberNumber' : error.path.endsWith('.payload') ? 'memberNumber'
        : error.path.endsWith('.preferredDisplayFormat') ? 'preferredDisplayFormat' : error.path.endsWith('.orientation') ? 'orientation' : 'name';
      errors[field] = error.code === 'unsupported_code128_payload'
        ? 'Code 128 supports printable ASCII only. Choose QR Code or change the code value.'
        : error.code === 'invalid_unicode' ? 'This field contains an incomplete character. Re-enter it.' : 'Check this field.';
    } else errors.name = 'Unable to validate this card. Check the fields.';
    return { ok: false, errors };
  }
}
