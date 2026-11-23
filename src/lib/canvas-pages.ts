import type { WalletDocument } from '../types/wallet-document';
export type CanvasPage = 1|2|3|4|5;
export type MembershipAccess = 'free'|'active'|'expired';
export type CanvasPageMetadata = {version:1;assignments:Record<string,CanvasPage>;selectedCount?:2|3|4|5};
export const CANVAS_PAGES:readonly CanvasPage[]=[1,2,3,4,5];
type Document = {readonly cards:readonly {readonly id:string}[];readonly canvas:{readonly pages?:{readonly version:1;readonly assignments:Readonly<Record<string,CanvasPage>>;readonly selectedCount?:2|3|4|5}}};
export function itemCanvasPage(doc:Document,id:string):CanvasPage {return doc.canvas.pages?.assignments[id]??1;}
/** All five pages are available for the current functional-testing phase.
 * This is app availability, not a fabricated login or Premium entitlement.
 * Existing selectedCount metadata is retained without restricting page access. */
export function canvasAccess(_doc:Document|undefined,_status:MembershipAccess='free') {
  return CANVAS_PAGES.map(page=>({page,visible:true,preview:false,readable:true,editable:true,editorDestination:true}));
}
export function assignCanvasItem(doc:WalletDocument,id:string,page:CanvasPage) {
  if(page===1&&!doc.canvas.pages)return;
  doc.canvas.pages??={version:1,assignments:{}};doc.canvas.pages.assignments[id]=page;
}
export function forgetCanvasItem(doc:WalletDocument,id:string){if(doc.canvas.pages)delete doc.canvas.pages.assignments[id];}
/** Detached projection for collision/placement helpers. Never installed as a whole-wallet draft. */
export function projectCanvasPage(doc:WalletDocument,page:CanvasPage):WalletDocument {
  const cards=doc.cards.filter(c=>itemCanvasPage(doc,c.id)===page),items=doc.canvas.decorations?.items.filter(c=>itemCanvasPage(doc,c.id)===page);
  const folders=doc.canvas.folders?.items.filter(f=>itemCanvasPage(doc,f.id)===page);
  const ids=new Set([...cards.map(c=>c.id),...(items??[]).map(c=>c.id),...(folders??[]).map(f=>f.id)]);
  return {...doc,cards,canvas:{...doc.canvas,layout:Object.fromEntries(cards.map(c=>[c.id,{...doc.canvas.layout[c.id]}])),
    ...(items?{decorations:{version:1,items}}:{}),...(folders?{folders:{version:1,items:folders}}:{}),...(doc.canvas.pages?{pages:{...doc.canvas.pages,assignments:Object.fromEntries(Object.entries(doc.canvas.pages.assignments).filter(([id])=>ids.has(id)))}}:{})}};
}
const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
/** Fail closed at owner/writer boundaries; no cross-page move API exists. */
export function pageMutationAllowed(before:WalletDocument,after:WalletDocument,status:MembershipAccess,page:CanvasPage) {
  const access=canvasAccess(before,status),a=new Map<string,unknown>(),b=new Map<string,unknown>();
  for(const [doc,map]of [[before,a],[after,b]] as const){for(const card of doc.cards)map.set(card.id,[card,doc.canvas.layout[card.id],itemCanvasPage(doc,card.id)]);
    for(const item of doc.canvas.decorations?.items??[])map.set(item.id,[item,itemCanvasPage(doc,item.id)]);
    for(const item of doc.canvas.folders?.items??[])map.set(item.id,[item,itemCanvasPage(doc,item.id)]);}
  for(const id of new Set([...a.keys(),...b.keys()]))if(!same(a.get(id),b.get(id))){
    const oldPage=itemCanvasPage(before,id),newPage=itemCanvasPage(after,id);
    if(a.has(id)&&b.has(id)&&oldPage!==newPage)return false;
    if(a.has(id)&&(oldPage!==page||!access[oldPage-1].editable)||b.has(id)&&(newPage!==page||!access[newPage-1].editable))return false;
  }
  if(before.canvas.pages?.selectedCount!==after.canvas.pages?.selectedCount&&status!=='active')return false;
  const oldIds=new Set(before.cards.map(c=>c.id)),newIds=new Set(after.cards.map(c=>c.id));
  if(!same(before.cards.filter(c=>newIds.has(c.id)).map(c=>c.id),after.cards.filter(c=>oldIds.has(c.id)).map(c=>c.id)))return false;
  for(const other of CANVAS_PAGES)if(other!==page){
    if(!same(before.cards.filter(c=>itemCanvasPage(before,c.id)===other),after.cards.filter(c=>itemCanvasPage(after,c.id)===other)))return false;
    if(!same((before.canvas.decorations?.items??[]).filter(c=>itemCanvasPage(before,c.id)===other),(after.canvas.decorations?.items??[]).filter(c=>itemCanvasPage(after,c.id)===other)))return false;
  }
  return true;
}
