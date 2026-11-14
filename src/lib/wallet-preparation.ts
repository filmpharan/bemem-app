import type { WalletDocument } from '../types/wallet-document';
import type { PreviewCard } from '../types/wallet-ui';
import { validateWalletDocument } from './wallet-validation';
import { searchReflow } from './search-reflow';
import { itemCanvasPage, type CanvasPage } from './canvas-pages';

type Immutable<T> = { readonly [K in keyof T]: T[K] extends object ? Immutable<T[K]> : T[K] };
export type SavedWallet = Immutable<WalletDocument>;
export type CanvasCardView = PreviewCard & {
  kind: 'demo' | 'membership' | 'decoration' | 'folder'; textColor: string | null; imageAssetId: string | null;
};
function freeze<T>(value: T): Immutable<T> {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(child => freeze(child)); Object.freeze(value);
  }
  return value as Immutable<T>;
}

/** New-memory state only. No reducer/storage/runtime adoption in Step 2C.1. */
export function prepareWalletState(document: WalletDocument) {
  const saved = freeze(validateWalletDocument(document));
  const draft = validateWalletDocument(document);
  return { mode: 'home' as const, saved, draft };
}

/** Detached display-only DTOs: no membership payload/number sent into the Canvas. */
export function walletCanvasPresentation(document: WalletDocument | SavedWallet, page:CanvasPage=1, includeGrouped=false) {
  const wallet = validateWalletDocument(document);
  const selected=wallet.cards.filter(card=>itemCanvasPage(wallet,card.id)===page);
  const memberViews: CanvasCardView[] = selected.map(card => card.kind === 'demo'
    ? { id: card.id, kind: card.kind, name: card.name, orientation: card.orientation,
      colors: [...card.colors], textColor: null, imageAssetId: null }
    : { id: card.id, kind: card.kind, name: card.name, orientation: card.orientation,
      ...(card.sizePresetId !== undefined ? { sizePresetId: card.sizePresetId } : {}),
      appearance: card.appearance,
      colors: [card.appearance.backgroundColor, card.appearance.backgroundColor],
      textColor: card.appearance.textColor, imageAssetId: card.appearance.imageAssetId });
  const grouped=new Set(wallet.canvas.folders?.items.flatMap(f=>f.memberCardIds)??[]);
  const cards=memberViews.filter(c=>includeGrouped||!grouped.has(c.id));
  const layout = Object.fromEntries(cards.map(card=>[card.id,{...wallet.canvas.layout[card.id]}]));
  for(const f of wallet.canvas.folders?.items??[]){
    if(itemCanvasPage(wallet,f.id)!==page)continue;
    cards.push({id:f.id,name:f.name,kind:'folder',orientation:f.orientation,colors:['#167e8a','#075164'],textColor:null,imageAssetId:null,
      folder:{members:f.memberCardIds.map(id=>memberViews.find(c=>c.id===id)!)} });
    layout[f.id]={...f.position};
  }
  for (const item of wallet.canvas.decorations?.items ?? []) {
    if(itemCanvasPage(wallet,item.id)!==page)continue;
    cards.push({ id: item.id, kind: 'decoration', name: item.assetId, orientation: 'landscape', colors: ['#ffffff', '#ffffff'],
      textColor: null, imageAssetId: null, decoration: { assetId: item.assetId, rotation: item.rotation } });
    layout[item.id] = { ...item.position };
  }
  return { cards, layout };
}

/** Pure v2 search preparation; doesn't impose the legacy UI's 240-row ceiling. */
export function walletSearchPresentation(document: WalletDocument | SavedWallet, query: string, open: boolean) {
  const view = walletCanvasPresentation(document);
  return searchReflow(view.cards, view.layout, query, open, Infinity);
}
