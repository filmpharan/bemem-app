import { CARD_COLORS, emptyCardForm, type CardFormValues } from './card-form';
import { emptyCardPresentation, expiryMonthError, type CardPresentationDraft } from './card-presentation';
import type { MembershipCard } from '../types/membership-card';
import { cardSizePreset } from './card-size-presets';
import { validateWalletCard } from './wallet-validation';
import type { WalletDocument } from '../types/wallet-document';
import { walletCanvasPresentation } from './wallet-preparation';
import { itemCanvasPage } from './canvas-pages';
import { canPlace, firstFreePosition, MAX_ROWS } from './canvas-layout';

export type CardEditorState = { values: CardFormValues; presentation: CardPresentationDraft };
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
export function membershipEditorState(card: Readonly<MembershipCard>): CardEditorState {
  const color = CARD_COLORS.find(c => c.background === card.appearance.backgroundColor && c.text === card.appearance.textColor);
  return { values: { ...emptyCardForm(), name: card.name, memberNumber: card.memberNumber ?? '', payload: card.memberNumber ?? '',
    payloadEdited: false, preferredDisplayFormat: 'qr',
    orientation: card.orientation, colorId: color?.id ?? 'saved' },
  presentation: { ...emptyCardPresentation(), brandId: card.brandId ?? null, brandQuery: card.brandQuery ?? '',
    expiryMonth: card.expiryMonth ?? '', sizePresetId: card.sizePresetId ?? (card.orientation === 'portrait' ? 'card-portrait' : 'card-landscape'),
    gradientPresetId: card.appearance.gradientPresetId ?? null,
    ...(card.appearance.artwork !== undefined ? { artwork: card.appearance.artwork } : {}) } };
}
export function editorChanged(a: CardEditorState, b: CardEditorState) {
  const content = (s: CardEditorState) => ({ values: { ...s.values, payloadEdited: false }, presentation: { ...s.presentation, side: 'front' } });
  return !same(content(a), content(b));
}
/** Patch only changed controls. Legacy fields stay absent unless the user actually changes them. */
export function prepareFullMembershipEdit(card: Readonly<MembershipCard>, form: CardEditorState, time: string) {
  const initial = membershipEditorState(card), { values: v, presentation: p } = form;
  if (!v.name.trim() || (v.memberNumber !== initial.values.memberNumber && !v.memberNumber.trim())) throw Error('Enter a card name, membership number and code value.');
  const expiration = expiryMonthError(p.expiryMonth); if (expiration) throw Error(expiration);
  const next: MembershipCard = { ...card, appearance: { ...card.appearance } };
  if (v.name !== initial.values.name) next.name = v.name;
  if (v.memberNumber !== initial.values.memberNumber) next.memberNumber = v.memberNumber;
  // Required compatibility fields are derived, never independent user settings.
  if (v.memberNumber.length) next.payload = v.memberNumber;
  next.preferredDisplayFormat = 'qr';
  if (p.expiryMonth !== initial.presentation.expiryMonth) next.expiryMonth = p.expiryMonth;
  if (p.sizePresetId !== initial.presentation.sizePresetId || v.orientation !== initial.values.orientation) {
    const preset = cardSizePreset(p.sizePresetId);
    if (v.orientation !== preset.orientation) throw Error('Choose a matching size and orientation.');
    Object.assign(next, { sizePresetId: preset.id, widthBlocks: preset.ratioWidth, heightBlocks: preset.ratioHeight, orientation: preset.orientation });
  }
  // Brand selection is retired. Keep country and all unrelated legacy fields untouched.
  delete next.brandId; delete next.brandQuery;
  if (!same(p.artwork, initial.presentation.artwork)) next.appearance.artwork = p.artwork;
  const changed = !same(next, card);
  if (changed) next.updatedAt = time;
  const validated = validateWalletCard(next); if (validated.kind !== 'membership') throw Error('Only membership cards can be edited.');
  return { ok: true as const, card: validated, changed };
}
export function membershipResizePlan(wallet: WalletDocument, card: MembershipCard) {
  if(wallet.canvas.folders?.items.some(f=>f.memberCardIds.includes(card.id))){
    const size=cardSizePreset(card.sizePresetId??(card.orientation==='portrait'?'card-portrait':'card-landscape')),old=wallet.canvas.layout[card.id];
    const position={col:Math.min(old.col,12-size.ratioWidth),row:Math.min(old.row,MAX_ROWS-size.ratioHeight)};
    return {position,moved:!same(position,old)};
  }
  const view = walletCanvasPresentation(wallet,itemCanvasPage(wallet,card.id));
  const target = { ...view.cards.find(c => c.id === card.id)!, orientation: card.orientation, sizePresetId: card.sizePresetId };
  view.cards = view.cards.map(c => c.id === card.id ? target : c);
  const original = wallet.canvas.layout[card.id];
  if (canPlace(target, original, view.cards, view.layout, MAX_ROWS)) return { position: original, moved: false };
  const position = firstFreePosition(target, view.cards, view.layout, MAX_ROWS);
  if (!position) throw Error('There is no space for this size. Choose another size; no cards were moved.');
  return { position, moved: true };
}
