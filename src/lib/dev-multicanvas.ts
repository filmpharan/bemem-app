/** Synthetic, process-local fixture only. Never imports device storage or changes App Root entitlement. */
import { createWalletRepository } from './wallet-repository';
import { createWalletStorageAdapters } from './wallet-storage-adapters';
import { createWalletOwnerScope } from './wallet-runtime-owner';
import { createWalletFeatureCommands } from './wallet-feature-commands';
import { createDecorateSession } from './decorate-session';
import { validateWalletDocument } from './wallet-validation';
import type { MembershipAccess } from './canvas-pages';
import type { WalletDocument } from '../types/wallet-document';
export function createMultiCanvasFixture(){
 let status:MembershipAccess='free',serial=0,fail=false,onPending:(()=>void)|undefined;
 const time='2026-01-01T00:00:00.000Z',cards=Array.from({length:5},(_,i)=>({kind:'membership' as const,id:`fixture-card-${i+1}`,name:`Sample Canvas ${i+1}`,memberNumber:'00123456',payload:'00123456',preferredDisplayFormat:'qr' as const,orientation:'landscape' as const,
  appearance:{backgroundColor:'#405764',textColor:'#ffffff',imageAssetId:null},createdAt:time,updatedAt:time}));
 const initial:WalletDocument=validateWalletDocument({schemaVersion:2,dataset:'bemem-wallet',revision:1,savedAt:time,cards,canvas:{columns:12,
  layout:Object.fromEntries(cards.map(c=>[c.id,{col:0,row:0}])),pages:{version:1,selectedCount:5,assignments:Object.fromEntries(cards.map((c,i)=>[c.id,i+1]))}}});
 const files=new Map([['wallet-0000000000000001.json',JSON.stringify(initial)]]),events:string[]=[];
 const repository=createWalletRepository({scope:{},list:async()=>[...files.keys()],read:async n=>{const value=files.get(n);if(!value)throw Error('Missing fixture file');return value;},
  async writeExclusive(n,raw){if(fail)throw Error('Simulated write failure');if(files.has(n))throw Error('Exists');events.push(n);files.set(n,raw);onPending?.();},
  async promoteExclusive(p,c){if(files.has(c))throw Error('Exists');files.set(c,files.get(p)!);files.delete(p);}}, {token:()=>`fixture-${++serial}`,now:()=>time});
 const owner=createWalletOwnerScope(()=>createWalletStorageAdapters({v1:{load:async()=>null,save:async()=>{throw Error('No v1 fixture writes');}},v2:repository,demoCards:[]}),undefined,()=>status).getOwner();
 return {owner,features:createWalletFeatureCommands(owner),repository,files,events,initial,
  status(next:MembershipAccess){status=next;owner.pages.refresh();},failWrites(value:boolean){fail=value;},onPending(fn:()=>void){onPending=fn;},
  decorate:()=>createDecorateSession(owner)};
}
