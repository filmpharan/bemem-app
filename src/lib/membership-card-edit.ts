import type { MembershipCard } from '../types/membership-card';
import { expiryMonthError } from './card-presentation';
import { payloadCapabilities, validateWalletCard } from './wallet-validation';

export type MembershipEditValues = { name: string; memberNumber: string; expiryMonth: string };
export type MembershipEditErrors = Partial<Record<keyof MembershipEditValues, string>>;
export function membershipEditValues(card: Readonly<MembershipCard>): MembershipEditValues {
  return { name: card.name, memberNumber: card.memberNumber ?? '', expiryMonth: card.expiryMonth ?? '' };
}
/** Patch only explicitly changed fields. Legacy optional fields remain absent. */
export function prepareMembershipEdit(card: Readonly<MembershipCard>, values: MembershipEditValues, updatedAt: string) {
  const errors: MembershipEditErrors = {};
  if (typeof values.name !== 'string' || !values.name.trim()) errors.name = 'Enter a card name.';
  const initial = membershipEditValues(card), numberChanged = values.memberNumber !== initial.memberNumber;
  if (typeof values.memberNumber !== 'string' || numberChanged && !values.memberNumber.trim()) errors.memberNumber = 'Enter a membership number.';
  else if (numberChanged) {
    try { const capabilities = payloadCapabilities(values.memberNumber);
      // QR remains available for valid text even when Code 128 cannot encode it.
      void capabilities;
    } catch { errors.memberNumber = 'This membership number cannot be encoded. The original value is unchanged.'; }
  }
  if (typeof values.expiryMonth !== 'string') errors.expiryMonth = 'Choose a valid expiration date or clear it.';
  else errors.expiryMonth = expiryMonthError(values.expiryMonth);
  if (Object.values(errors).some(Boolean)) return { ok: false as const, errors };
  let changed = values.name !== initial.name || numberChanged || values.expiryMonth !== initial.expiryMonth;
  const next = { ...card, ...(changed ? { updatedAt } : {}) };
  if (values.name !== initial.name) next.name = values.name;
  if (numberChanged) next.memberNumber = values.memberNumber;
  if (values.memberNumber.length) next.payload = values.memberNumber;
  next.preferredDisplayFormat = 'qr';
  if (values.expiryMonth !== initial.expiryMonth) next.expiryMonth = values.expiryMonth;
  changed = changed || next.payload !== card.payload || next.preferredDisplayFormat !== card.preferredDisplayFormat;
  if (changed) next.updatedAt = updatedAt;
  try { const validated = validateWalletCard(next);
    if (validated.kind !== 'membership') throw Error('Not a membership card');
    return { ok: true as const, card: validated, changed };
  } catch { return { ok: false as const, errors: { name: 'These changes are not valid for this card. Nothing was saved.' } }; }
}
