import {ARTWORK_ID,MAX_IMAGE_BYTES,validateImageSelection} from './card-artwork';
import type {CardArtwork} from '../types/membership-card';
export type KeepMediaInput=Parameters<typeof validateImageSelection>[0];
export class KeepMediaFileError extends Error { constructor(message:string,readonly needsReview=false){super(message);} }
type Info={exists:boolean;size?:number|null;md5?:string|null};
type Ticket={id:string;owned:boolean;review:boolean;image?:CardArtwork};
/** Receipt-only file lifecycle. No Wallet/History writes, directory sweeps, or retry queue. */
export function createKeepMediaFiles(ports:{nextId:()=>string;uri:(id:string)=>string;info:(uri:string)=>Info;
 reserve:(id:string)=>void;copy:(source:string,id:string,admit:()=>boolean)=>Promise<void>;remove:(id:string)=>Promise<void>;referenced:(id:string)=>Promise<boolean>}){
 const tickets=new Map<string,Ticket>();let busy=false;
 const listeners=new Set<()=>void>();
 const settled=()=>{busy=false;for(const listener of listeners)listener();};
 const check=(admit:()=>boolean)=>{if(!admit())throw new KeepMediaFileError('The photo context changed. No image was attached.');};
 async function cleanup(ticket:Ticket){
  try{
   if(!ticket.owned)throw Error('File ownership is unverified.');
   if(await ports.referenced(ticket.id)){tickets.delete(ticket.id);return;}
   if(ports.info(ports.uri(ticket.id)).exists)await ports.remove(ticket.id);
   if(ports.info(ports.uri(ticket.id)).exists)throw Error('File removal was not confirmed.');
   tickets.delete(ticket.id);
  }catch{ticket.review=true;throw new KeepMediaFileError('Photo file cleanup is unconfirmed. The file was preserved for review. Do not retry.',true);}
 }
 return{
  subscribe(listener:()=>void){listeners.add(listener);return()=>{listeners.delete(listener);};},
  isBusy:()=>busy,hasIssues:()=>[...tickets.values()].some(t=>t.review),
  issues:()=>[...tickets.values()].filter(t=>t.review).map(t=>({assetId:t.id,ownershipVerified:t.owned})),
  async retain(input:KeepMediaInput,admit:()=>boolean):Promise<CardArtwork>{
   if(busy||[...tickets.values()].some(t=>t.review))throw new KeepMediaFileError('Photo storage is busy or needs review.',true);
   check(admit);const extension=validateImageSelection(input),original=ports.info(input.uri);
   if(!original.exists||!original.size||original.size>MAX_IMAGE_BYTES||!original.md5)throw new KeepMediaFileError('The selected temporary photo is unavailable or invalid. Please select it again.');
   const id=`art-${ports.nextId()}.${extension}`;
   if(!ARTWORK_ID.test(id)||ports.info(ports.uri(id)).exists)throw new KeepMediaFileError('A new photo destination could not be reserved.');
   check(admit);const ticket:Ticket={id,owned:false,review:false};tickets.set(id,ticket);busy=true;
   try{
    // Exclusive create establishes ownership before any copy can partially succeed.
    ports.reserve(id);ticket.owned=true;check(admit);
    await ports.copy(input.uri,id,admit);check(admit);
    const retained=ports.info(ports.uri(id));
    if(!retained.exists||retained.size!==original.size||retained.md5!==original.md5)throw Error('Photo integrity verification failed.');
    const image:CardArtwork={assetId:id,width:input.width,height:input.height,byteLength:original.size,md5:original.md5,crop:{x:.5,y:.5,zoom:1}};
    ticket.image=image;return image;
   }catch(error){await cleanup(ticket);throw error;}finally{settled();}
  },
  async release(image:CardArtwork){const ticket=tickets.get(image.assetId);
   if(!ticket?.owned||!ticket.image||JSON.stringify(ticket.image)!==JSON.stringify(image))throw new KeepMediaFileError('This photo is not owned by the current unsaved media operation.',true);
   if(ticket.review)throw new KeepMediaFileError('Photo cleanup needs review. No deletion will be retried.',true);
   if(busy){ticket.review=true;throw new KeepMediaFileError('A photo file operation is still pending.',true);}
   busy=true;try{await cleanup(ticket);}finally{settled();}
  },
  saved(images:readonly CardArtwork[]){for(const image of images){const t=tickets.get(image.assetId);if(t?.image&&JSON.stringify(t.image)===JSON.stringify(image))tickets.delete(image.assetId);}},
  async inspect(){if(busy)return;for(const t of [...tickets.values()])if(t.review){try{if(!ports.info(ports.uri(t.id)).exists||await ports.referenced(t.id))tickets.delete(t.id);}catch{/* Keep exact evidence; this is read-only and never retries copy/delete. */}}},
 };
}
