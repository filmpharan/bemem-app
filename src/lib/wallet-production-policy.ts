import type { WalletDocument } from '../types/wallet-document';
import type { NewMembershipCard } from '../types/membership-card';
import { WalletCoordinatorFailure } from './wallet-coordinator';
import { validateNewMembershipCard, validateWalletDocument, resolveWalletCardFootprint } from './wallet-validation';
import { MAX_ROWS, firstFreePosition } from './canvas-layout';
import { walletCanvasPresentation, type SavedWallet } from './wallet-preparation';
import { searchReflow } from './search-reflow';
import { assignCanvasItem,type CanvasPage } from './canvas-pages';

/** Compatibility policy, NOT a change to the persisted v2 schema or the live v1 writer. */
export function validateProductionWallet(input: unknown): WalletDocument {
  const wallet = validateWalletDocument(input);
  if (wallet.cards.some(card => wallet.canvas.layout[card.id].row + resolveWalletCardFootprint(card).heightBlocks > MAX_ROWS)) {
    throw new WalletCoordinatorFailure('blocked', 'canvas_240_row_limit');
  }
  if (wallet.canvas.decorations?.items.some(item => item.position.row >= MAX_ROWS)) throw new WalletCoordinatorFailure('blocked', 'canvas_240_row_limit');
  if(wallet.canvas.folders?.items.some(f=>f.position.row+(f.orientation==='landscape'?4:6)>MAX_ROWS))throw new WalletCoordinatorFailure('blocked','canvas_240_row_limit');
  return wallet;
}

/** Future form integration: fail explicitly at capacity; do not move existing cards. */
export function prepareProductionCardDraft(input: WalletDocument | SavedWallet, value: NewMembershipCard,page:CanvasPage=1) {
  const wallet = validateProductionWallet(input), card = validateNewMembershipCard(value);
  if (wallet.cards.some(existing => existing.id === card.id)) throw new WalletCoordinatorFailure('blocked', 'duplicate_card_id');
  const view = walletCanvasPresentation(wallet,page);
  const added = walletCanvasPresentation({ ...wallet, cards: [card], canvas: { columns: 12, layout: { [card.id]: { col: 0, row: 0 } } } }).cards[0];
  const position = firstFreePosition(added, view.cards, view.layout, MAX_ROWS);
  if (!position) throw new WalletCoordinatorFailure('blocked', 'canvas_capacity_reached');
  const next={ ...wallet, cards: [...wallet.cards, card],canvas: { ...wallet.canvas, layout: { ...wallet.canvas.layout, [card.id]: position } } };
  assignCanvasItem(next,card.id,page);
  return validateProductionWallet(next);
}

/** Read-only DTO adapter for future Home/Create binding. No save/edit capability is exposed. */
export function productionCanvasPresentation(session: { saved: WalletDocument | SavedWallet; draft: WalletDocument | SavedWallet },
  mode: 'home' | 'create', query = '', searchOpen = false) {
  const selected = validateProductionWallet(mode === 'home' ? session.saved : session.draft);
  const view = walletCanvasPresentation(selected);
  try { return searchReflow(view.cards, view.layout, query, mode === 'home' && searchOpen, MAX_ROWS); }
  catch { throw new WalletCoordinatorFailure('blocked', 'search_presentation_capacity'); }
}
