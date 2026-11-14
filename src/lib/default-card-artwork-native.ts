import { deviceArtworkStore,artworkUri } from './card-artwork-store';
import { artworkClock,artworkTiming } from './artwork-performance';
import { bundledCardArtworkUri,loadBundledCardArtwork } from './default-card-artwork-assets';
import type { createDefaultCardArtworkSession } from './default-card-artwork';
import type { CardArtwork } from '../types/membership-card';

type Session=ReturnType<typeof createDefaultCardArtworkSession>;
/** Preview-only source overrides. Nothing except normal local artwork references enters Wallet. */
export function defaultCardArtworkSources(session:Session,retained=false){
  const start=artworkClock();
  const sources=Object.fromEntries([session.front,session.back].map(image=>[image.assetId,retained?artworkUri(image.assetId):bundledCardArtworkUri(image.assetId)!]));
  artworkTiming('asset-resolution',start);return sources;
}
export function defaultCardArtworksReady(session:Session){
  return defaultArtworkReferencesReady([session.front,session.back]);
}
export function defaultArtworkReferencesReady(images:readonly CardArtwork[]){
  try{images.forEach(image=>deviceArtworkStore.verifyArtwork(image));return true;}catch{return false;}
}
export async function prepareDefaultCardArtworks(session:Session){
  const start=artworkClock();
  try{await Promise.all([session.front,session.back].map(image=>deviceArtworkStore.retainDefault(image,()=>loadBundledCardArtwork(image.assetId))));}
  finally{artworkTiming('file-preparation',start);}
}
