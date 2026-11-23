import { DEFAULT_CARD_ARTWORK,DEFAULT_CARD_FACES,LEGACY_CARD_FACES } from '../constants/default-card-artwork';
import type { CardArtwork } from '../types/membership-card';
import { emptyCardForm,type CardFormValues } from './card-form';
import { emptyCardPresentation,type CardPresentationDraft } from './card-presentation';

export function defaultArtworkReference(id:keyof typeof DEFAULT_CARD_ARTWORK):CardArtwork {
  return {...DEFAULT_CARD_ARTWORK[id],crop:{x:.5,y:.5,zoom:1}};
}
export function isUserCardPhoto(image:CardArtwork|null|undefined) {
  return !!image && !Object.hasOwn(DEFAULT_CARD_ARTWORK,image.assetId);
}
/** Recover a known pair from either side; old photo-only records lack the original pair ID. */
export function photoFallbackArtwork(artwork:{front?:CardArtwork|null;back?:CardArtwork|null}|undefined,colorId:string) {
  const face=[...DEFAULT_CARD_FACES,...LEGACY_CARD_FACES].find(face=>face.front===artwork?.front?.assetId||face.back===artwork?.back?.assetId)
    ?? DEFAULT_CARD_FACES.find(face=>face.formColorId===colorId) ?? DEFAULT_CARD_FACES[0];
  return {front:artwork?.front&&!isUserCardPhoto(artwork.front)?{...artwork.front,crop:{...artwork.front.crop}}:defaultArtworkReference(face.front),
    back:artwork?.back&&!isUserCardPhoto(artwork.back)?{...artwork.back,crop:{...artwork.back.crop}}:defaultArtworkReference(face.back)};
}
/** Pure lazy Add-session initializer. Never called by Edit, Wallet loading or renderers. */
export function createDefaultCardArtworkSession(random:()=>number=Math.random){
  const value=random();if(!Number.isFinite(value)||value<0||value>=1)throw Error('Invalid artwork selection.');
  const face=DEFAULT_CARD_FACES[Math.floor(value*DEFAULT_CARD_FACES.length)];
  const front=defaultArtworkReference(face.front),back=defaultArtworkReference(face.back);
  const values:CardFormValues={...emptyCardForm(),colorId:face.formColorId};
  const presentation:CardPresentationDraft={...emptyCardPresentation(),gradientPresetId:null,artwork:{front,back}};
  return {id:face.id,front,back,values,presentation};
}
/** Preserve the original soft-back ink override as new default pairs are introduced. */
export function defaultBackTextColor(assetId:string|undefined){
  return assetId&&[...LEGACY_CARD_FACES,...DEFAULT_CARD_FACES].some(face=>face.back===assetId)?'#263943':undefined;
}
