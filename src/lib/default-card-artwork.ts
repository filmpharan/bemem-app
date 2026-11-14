import { DEFAULT_CARD_ARTWORK,DEFAULT_CARD_FACES } from '../constants/default-card-artwork';
import type { CardArtwork } from '../types/membership-card';
import { emptyCardForm,type CardFormValues } from './card-form';
import { emptyCardPresentation,type CardPresentationDraft } from './card-presentation';

export function defaultArtworkReference(id:keyof typeof DEFAULT_CARD_ARTWORK):CardArtwork {
  return {...DEFAULT_CARD_ARTWORK[id],crop:{x:.5,y:.5,zoom:1}};
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
/** Only the six registered soft backs need an ink override. Photos/legacy images are untouched. */
export function defaultBackTextColor(assetId:string|undefined){
  return assetId&&DEFAULT_CARD_FACES.some(face=>face.back===assetId)?'#263943':undefined;
}
