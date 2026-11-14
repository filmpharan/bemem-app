import type { WalletDocument } from '../types/wallet-document';
import type { GroupFolder } from '../types/group-folder';
import type { Orientation, Position, PreviewCard } from '../types/wallet-ui';
import { validateWalletDocument } from './wallet-validation';
import { walletCanvasPresentation } from './wallet-preparation';
import { canPlace, firstFreePosition, MAX_ROWS, cardSize } from './canvas-layout';
import { assignCanvasItem, forgetCanvasItem, itemCanvasPage, type CanvasPage } from './canvas-pages';

export function folderPreviewRegions(orientation:Orientation,count:number){
  if(!Number.isInteger(count)||count<2||count>6)throw Error('A folder needs two to six cards.');
  const n=Math.min(count,4),columns=n===4?2:orientation==='landscape'?n:1,rows=n===4?2:orientation==='landscape'?1:n;
  return Array.from({length:n},(_,i)=>({left:(i%columns)/columns,top:Math.floor(i/columns)/rows,width:1/columns,height:1/rows}));
}
export function folderContaining(doc:WalletDocument,id:string){return doc.canvas.folders?.items.find(f=>f.memberCardIds.includes(id));}
function atPage(doc:WalletDocument,ids:string[],page:CanvasPage){if(ids.some(id=>itemCanvasPage(doc,id)!==page))throw Error('Cards must be on the same canvas.');}
function nameCheck(name:string){if(typeof name!=='string'||!name.trim()||name.length>120)throw Error('Enter a folder name up to 120 characters.');}
function place(card:PreviewCard,hint:Position,cards:PreviewCard[],layout:Record<string,Position>,nearby=false){
  let p:Position|null=canPlace(card,hint,cards,layout,MAX_ROWS)?hint:null;
  if(!p&&nearby){
    const size=cardSize(card),origin={col:Math.min(12-size.cols,hint.col),row:Math.min(MAX_ROWS-size.rows,hint.row)};
    for(let distance=0;distance<=MAX_ROWS+12&&!p;distance++)for(let col=0;col<=12-size.cols&&!p;col++){
      const dy=distance-Math.abs(col-origin.col);if(dy<0)continue;
      for(const row of new Set([origin.row-dy,origin.row+dy]))if(canPlace(card,{col,row},cards,layout,MAX_ROWS)){p={col,row};break;}
    }
  }else if(!p)p=firstFreePosition(card,cards,layout,MAX_ROWS);
  if(!p)throw Error('More canvas space is required. Your folder and cards are unchanged.');
  layout[card.id]={...p};cards.push(card);return {...p};
}
export function createGroupFolder(input:WalletDocument,id:string,name:string,orientation:Orientation,memberIds:string[],page:CanvasPage){
  nameCheck(name);const doc=validateWalletDocument(input);
  if(memberIds.length!==2||new Set(memberIds).size!==2)throw Error('Choose two different membership cards.');
  if(doc.cards.some(c=>c.id===id)||doc.canvas.folders?.items.some(f=>f.id===id)||doc.canvas.decorations?.items.some(c=>c.id===id))throw Error('Folder identity is already in use.');
  if(memberIds.some(id=>!doc.cards.some(c=>c.id===id&&c.kind==='membership')||folderContaining(doc,id)))throw Error('Only separate membership cards can start a folder.');
  atPage(doc,memberIds,page);
  const view=walletCanvasPresentation(doc,page),cards=view.cards.filter(c=>!memberIds.includes(c.id));
  const tile:PreviewCard={id,name,orientation,kind:'folder',colors:['#167e8a','#075164']};
  const position=place(tile,doc.canvas.layout[memberIds[1]],cards,view.layout);
  const folder:GroupFolder={id,name,orientation,position,memberCardIds:[...memberIds]};
  doc.canvas.folders={version:1,items:[...(doc.canvas.folders?.items??[]),folder]};assignCanvasItem(doc,id,page);
  return validateWalletDocument(doc);
}
export function addFolderMember(input:WalletDocument,folderId:string,cardId:string,page:CanvasPage){
  const doc=validateWalletDocument(input),folder=doc.canvas.folders?.items.find(f=>f.id===folderId);
  if(!folder||!doc.cards.some(c=>c.id===cardId&&c.kind==='membership')||folderContaining(doc,cardId))throw Error('Only a separate membership card can be added.');
  if(folder.memberCardIds.length>=6)throw Error('This folder is full. It can hold up to six cards.');
  atPage(doc,[folderId,cardId],page);folder.memberCardIds.push(cardId);return validateWalletDocument(doc);
}
export function renameGroupFolder(input:WalletDocument,id:string,name:string,page:CanvasPage){
  nameCheck(name);const doc=validateWalletDocument(input),folder=doc.canvas.folders?.items.find(f=>f.id===id);
  if(!folder)throw Error('This folder is no longer available.');atPage(doc,[id],page);folder.name=name;return validateWalletDocument(doc);
}
export function ungroupFolder(input:WalletDocument,id:string,page:CanvasPage){
  const doc=validateWalletDocument(input),folder=doc.canvas.folders?.items.find(f=>f.id===id);if(!folder)throw Error('This folder is no longer available.');atPage(doc,[id],page);
  const view=walletCanvasPresentation(doc,page),all=walletCanvasPresentation(doc,page,true),cards=view.cards.filter(c=>c.id!==id),layout={...view.layout};delete layout[id];
  for(const memberId of folder.memberCardIds){const card=all.cards.find(c=>c.id===memberId)!;doc.canvas.layout[memberId]=place(card,doc.canvas.layout[memberId],cards,layout);}
  doc.canvas.folders!.items=doc.canvas.folders!.items.filter(f=>f.id!==id);forgetCanvasItem(doc,id);return validateWalletDocument(doc);
}
/** Preflight the entire wallet deletion BEFORE history removal or writer admission. */
export function prepareFolderAwareCardDeletion(input:WalletDocument,id:string){
  const doc=validateWalletDocument(input),folder=folderContaining(doc,id);
  if(!doc.cards.some(card=>card.id===id&&card.kind==='membership'))throw Error('Only an existing membership card can be deleted.');
  if(folder){
    const remaining=folder.memberCardIds.filter(member=>member!==id);
    if(remaining.length===1){
      const page=itemCanvasPage(doc,folder.id),view=walletCanvasPresentation(doc,page),all=walletCanvasPresentation(doc,page,true);
      const cards=view.cards.filter(c=>c.id!==folder.id),layout={...view.layout};delete layout[folder.id];
      const last=all.cards.find(c=>c.id===remaining[0])!;
      doc.canvas.layout[last.id]=place(last,folder.position,cards,layout,true);
      doc.canvas.folders!.items=doc.canvas.folders!.items.filter(f=>f.id!==folder.id);forgetCanvasItem(doc,folder.id);
    }else folder.memberCardIds=remaining;
  }
  doc.cards=doc.cards.filter(c=>c.id!==id);delete doc.canvas.layout[id];forgetCanvasItem(doc,id);return validateWalletDocument(doc);
}
/** Drop-only target resolution; called after the existing hold/drag interaction releases. */
export function folderDropTarget(card:PreviewCard,position:Position,cards:PreviewCard[],layout:Record<string,Position>){
  if(card.kind!=='membership')return null;const size=cardSize(card),x=position.col+size.cols/2,y=position.row+size.rows/2;
  const targets=cards.filter(c=>c.id!==card.id&&(c.kind==='membership'||c.kind==='folder')).filter(c=>{
    const p=layout[c.id],s=cardSize(c);return p&&x>=p.col+.2&&x<=p.col+s.cols-.2&&y>=p.row+.2&&y<=p.row+s.rows-.2;
  });return targets.length===1?targets[0]:null;
}
/** Deterministic, display-only packing. Shared unit, full footprints, no caption rows. */
export function packFolderContents(cards:PreviewCard[],columns=12){
  if(!Number.isInteger(columns)||columns<8||columns>12)throw Error('Unsupported contents width.');
  const layout:Record<string,Position>={},placed:PreviewCard[]=[];
  for(const card of cards){
    const height=placed.reduce((n,c)=>Math.max(n,layout[c.id].row+cardSize(c).rows),0),size=cardSize(card);let position:Position|null=null;
    for(let row=0;row<=height&&!position;row++)for(let col=0;col<=columns-size.cols;col++)if(canPlace(card,{col,row},placed,layout,Infinity)){position={col,row};break;}
    if(!position)throw Error('Unable to arrange folder contents.');layout[card.id]=position;placed.push(card);
  }
  const used=cards.reduce((n,c)=>Math.max(n,layout[c.id].col+cardSize(c).cols),0),offset=Math.floor((columns-used)/2);
  for(const p of Object.values(layout))p.col+=offset;
  return {layout,rows:cards.reduce((n,c)=>Math.max(n,layout[c.id].row+cardSize(c).rows),0)};
}
