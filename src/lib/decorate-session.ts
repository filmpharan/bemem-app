import type { createPreparedWalletRuntime } from './wallet-cutover-runtime';
import type { WalletDocument } from '../types/wallet-document';
import type { Position, PreviewCard } from '../types/wallet-ui';
import { isDecorationAssetId, type DecorationAssetId } from './decoration-catalog';
import { validateWalletDocument } from './wallet-validation';
import { canPlace, MAX_ROWS } from './canvas-layout';
import { walletCanvasPresentation } from './wallet-preparation';
import { assignCanvasItem,forgetCanvasItem,itemCanvasPage } from './canvas-pages';

type Owner = Pick<ReturnType<typeof createPreparedWalletRuntime>, 'getSnapshot' | 'commands'> & Partial<Pick<ReturnType<typeof createPreparedWalletRuntime>,'pages'>>;
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
export type DecorateAction = { type: 'add'; assetId: DecorationAssetId; position: Position }
  | { type: 'move'; id: string; position: Position } | { type: 'rotate' | 'delete'; id: string };
export type DecorateResult = { ok: true } | { ok: false; message: string };
const yes = { ok: true } as const;

/** Single-owner draft edits only. No filesystem, additional writer or persistent undo journal. */
export function createDecorateSession(owner: Owner) {
  const initial = owner.getSnapshot();
  const page=owner.pages?.current()??1,pageEpoch=owner.pages?.generation()??0;
  if(owner.pages&&!owner.pages.access()[page-1].editable)throw Error('This canvas is read-only.');
  if (!initial.session || initial.state.source !== 'v2' || !initial.state.editsAllowed) throw Error('Decorate requires an active, unlocked Wallet v2.');
  const generation = initial.state.generation, revision = initial.session.revision;
  const entry = validateWalletDocument(initial.session.draft);
  let document = validateWalletDocument(entry);
  let busy = false, closed = false, uncertain = false, sequence = 0;
  const prefix = `decor-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,10)}`;
  const fail = (message: string): DecorateResult => ({ ok: false, message });
  function admitted() {
    const latest = owner.getSnapshot();
    return (owner.pages?.generation()??0)===pageEpoch&&(!owner.pages||owner.pages.access()[page-1].editable)&&!busy && !closed && !uncertain && latest.state.editsAllowed && latest.state.source === 'v2'
      && latest.state.generation === generation && latest.session?.revision === revision && same(latest.session.draft, document);
  }
  function install(next: WalletDocument) {
    if (!admitted()) return fail('The wallet changed or is locked. Your draft is retained. Close Decorate and check wallet status.');
    const result = owner.commands.updateDraft(generation, next);
    if (!result.ok) return fail('This change was not accepted. Your saved wallet is unchanged.');
    document = validateWalletDocument(next); return yes;
  }
  return {
    snapshot: () => ({ document: validateWalletDocument(document), dirty: !same(document, entry),
      busy, closed, uncertain }),
    apply(action: DecorateAction): DecorateResult {
      if (!admitted()) return fail('The wallet changed or is locked. Close Decorate and check wallet status.');
      const next = validateWalletDocument(document), items = next.canvas.decorations?.items ?? [];
      const view = walletCanvasPresentation(next,page);
      if (action.type === 'add') {
        if (!isDecorationAssetId(action.assetId)) return fail('This artwork is unavailable.');
        let id: string;
        do { id = `${prefix}-${++sequence}`; } while (view.cards.some(c => c.id === id));
        const tile: PreviewCard = { id, name: action.assetId, kind: 'decoration', orientation: 'landscape', colors: ['#ffffff','#ffffff'] };
        if (!canPlace(tile, action.position, view.cards, view.layout, MAX_ROWS)) return fail('Choose an empty cell inside the canvas. Nothing was moved.');
        next.canvas.decorations = { version: 1, items: [...items, { id, assetId: action.assetId, position: { ...action.position }, rotation: 0 }] };
        assignCanvasItem(next,id,page);
      } else if (action.type === 'move') {
        const target = view.cards.find(c => c.id === action.id);
        if (!target || !canPlace(target, action.position, view.cards, view.layout, MAX_ROWS)) return fail('That position is occupied or outside the canvas. The item stays in its previous position.');
        if (same(view.layout[action.id], action.position)) return yes;
        if (target.kind === 'decoration') next.canvas.decorations = { version: 1, items: items.map(item => item.id === action.id ? { ...item, position: { ...action.position } } : item) };
        else if(target.kind==='folder') next.canvas.folders={version:1,items:next.canvas.folders!.items.map(folder=>folder.id===action.id?{...folder,position:{...action.position}}:folder)};
        else next.canvas.layout[action.id] = { ...action.position };
      } else {
        if (!items.some(item => item.id === action.id&&itemCanvasPage(next,item.id)===page)) return fail('Select a decoration. Membership cards cannot be rotated or deleted here.');
        next.canvas.decorations = { version: 1, items: action.type === 'delete' ? items.filter(item => item.id !== action.id)
          : items.map(item => item.id === action.id ? { ...item, rotation: ((item.rotation + 90) % 360) as 0 | 90 | 180 | 270 } : item) };
        if(action.type==='delete')forgetCanvasItem(next,action.id);
      }
      let validated: WalletDocument;
      try { validated = validateWalletDocument(next); } catch { return fail('This placement is not valid. Nothing was moved.'); }
      return install(validated);
    },
    cancel(): DecorateResult {
      if (busy) return fail('Wait for saving to finish.');
      // After an uncertain save, only close the editor; never write an old draft over a possibly committed result.
      if (uncertain) { closed = true; return yes; }
      const result = install(entry);
      if (result.ok) { closed = true; }
      return result;
    },
    async save(): Promise<DecorateResult> {
      if (!admitted()) return fail('Saving is locked. Close Decorate and check wallet status. No retry was made.');
      const expected = validateWalletDocument(document);
      busy = true; // synchronous double-submit barrier
      try {
        const result = await owner.commands.save(generation), latest = owner.getSnapshot();
        if (!result.ok || latest.state.phase !== 'ready_v2' || latest.state.source !== 'v2'
          || latest.session?.revision !== revision + 1 || !same(latest.session.saved.cards, expected.cards)
          || !same(latest.session.saved.canvas, expected.canvas)) {
          uncertain = true; return fail('Saving was not confirmed. Your draft is retained. Close Decorate and use Reinspect wallet. No automatic retry was made.');
        }
        closed = true; return yes;
      } catch {
        uncertain = true; return fail('Saving was not confirmed. Close Decorate and check wallet status. No automatic retry was made.');
      } finally { busy = false; }
    },
  };
}

/** Window coordinates measured from the same native canvas viewport; scroll is presentation only. */
export type DecorationDropGeometry = { pageX: number; pageY: number; width: number; height: number; unit: number; scrollY: number };

/** Calibrate RN touch-root coordinates to measureInWindow, using the actual hit view. */
export function decorationTouchOffset(windowOrigin:{x:number;y:number},touch:{pageX:number;pageY:number;locationX:number;locationY:number}) {
  return {x:windowOrigin.x+touch.locationX-touch.pageX,y:windowOrigin.y+touch.locationY-touch.pageY};
}

/** The ghost uses the same snapped cell as commit, relative to its actual parent. */
export function decorationGhostFrame(point:{x:number;y:number},geometry:DecorationDropGeometry,layer:{x:number;y:number}) {
  const cell=decorationDropCell(point,geometry),unit=geometry.unit;
  return {width:unit,height:unit,left:(cell?geometry.pageX+cell.col*unit:point.x-unit/2)-layer.x,
    top:(cell?geometry.pageY+cell.row*unit-geometry.scrollY:point.y-unit/2)-layer.y};
}
export function decorationDropCell(point: { x: number; y: number }, geometry: DecorationDropGeometry): Position | null {
  const { pageX, pageY, width, height, unit, scrollY } = geometry;
  if (![point.x,point.y,pageX,pageY,width,height,unit,scrollY].every(Number.isFinite) || unit <= 0
    || point.x < pageX || point.x >= pageX+width || point.y < pageY || point.y >= pageY+height) return null;
  return { col: Math.floor((point.x-pageX)/unit), row: Math.floor((point.y-pageY+scrollY)/unit) };
}
