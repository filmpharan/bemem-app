import type {WalletCard} from '../types/membership-card';
import {resolveWalletCardFootprint,validateWalletCard,payloadCapabilities} from './wallet-validation';
import {encodeCardCode,cardCodeDataUri} from './card-code';
import {code128DisplaySvg} from './code128-display';
import {cardPaintSize} from './card-geometry';

export const SHARE_FIELDS=['front','back','qr','barcode','name','number','expiry'] as const;
export type ShareField=typeof SHARE_FIELDS[number];
export type CardShareOptions=Record<ShareField,boolean>;
export const SHARE_LABELS:Record<ShareField,string>={front:'Front',back:'Back',qr:'QR',barcode:'Barcode',name:'Card Name',number:'Membership Number',expiry:'EXP Date'};
export const DEFAULT_SHARE_OPTIONS:CardShareOptions={front:true,back:false,qr:false,barcode:false,name:false,number:false,expiry:false};
export function cardShareAvailability(card:WalletCard):Record<ShareField,boolean>{
 if(card.kind!=='membership')return {front:false,back:false,qr:false,barcode:false,name:false,number:false,expiry:false};
 const capabilities=card.memberNumber?payloadCapabilities(card.memberNumber):null;
 return {front:!(card.appearance.imageAssetId&&!card.appearance.artwork?.front),back:!!card.appearance.artwork?.back,
 qr:!!capabilities?.qr.eligible,barcode:!!capabilities?.code128.eligible,name:!!card.name,number:!!card.memberNumber,expiry:!!card.expiryMonth};
}
export type ShareTextMetrics=Partial<Record<'name'|'number'|'expiry',number>>;
export function prepareCardShare(input:WalletCard,options:CardShareOptions,metrics:ShareTextMetrics={}){
 let card:ReturnType<typeof validateWalletCard>;
 try{card=validateWalletCard(input);}catch{throw Error('This card data cannot be prepared for sharing. The saved card is unchanged.');}
 if(card.kind!=='membership')throw Error('Sharing is available for membership cards only. Demo codes are not generated.');
 if(Object.keys(options).length!==SHARE_FIELDS.length||SHARE_FIELDS.some(k=>typeof options[k]!=='boolean'))throw Error('Choose supported sharing options.');
 if(options.qr&&options.barcode)throw Error('Choose QR or Barcode, not both.');
 const available=cardShareAvailability(card),fields=SHARE_FIELDS.filter(k=>options[k]);
 if(!fields.length)return null;
 for(const field of fields)if(!available[field])throw Error(`${SHARE_LABELS[field]} is unavailable for this card.`);
 const size=resolveWalletCardFootprint(card),paint=cardPaintSize(size.widthBlocks,size.heightBlocks);
 const unit=Math.max(5,5*Math.floor(900/Math.max(paint.width,paint.height)/5));
 const cardWidth=Math.round(paint.width*unit),cardHeight=Math.round(paint.height*unit);
 const codes:Partial<Record<'qr'|'barcode',{uri:string;svg:string;width:number;height:number}>>={};
 for(const field of ['qr','barcode'] as const){if(!options[field])continue;
  const encoded=encodeCardCode(card,field==='qr'?'qr':'code128');if(!encoded.ok)throw Error(encoded.message);
  if(field==='qr'){
   const width=encoded.width*Math.max(4,Math.floor(600/encoded.width));
   const svg=encoded.svg.replace(`width="${encoded.width}" height="${encoded.height}"`,`width="${width}" height="${width}"`);
   codes.qr={uri:cardCodeDataUri(svg),svg,width,height:width};
  }else{
   if(encoded.width*3>1984)throw Error('Barcode is too wide to export safely. Select QR instead.');
   const pixelsPerModule=Math.max(3,Math.floor(960/encoded.width)),width=encoded.width*pixelsPerModule,height=encoded.height*2;
   const svg=code128DisplaySvg(encoded,{width,height,pixelsPerModule,scroll:false},1);
   codes.barcode={uri:cardCodeDataUri(svg),svg,width,height};
  }
 }
 // No hidden text, membership ID or metadata. Artwork text already baked into pixels remains.
 const texts:Partial<Record<ShareField,string>>={};
 if(options.name)texts.name=card.name;if(options.number)texts.number=card.memberNumber!;if(options.expiry)texts.expiry=card.expiryMonth!;
 const padding=32,gap=24,portrait=size.heightBlocks>size.widthBlocks,both=options.front&&options.back;
 const centerWidth=both&&portrait?cardWidth*2+gap:options.front||options.back?cardWidth:0;
 const natural=(field:'name'|'number'|'expiry')=>metrics[field]??Array.from(texts[field]??'').length*(field==='name'?36:field==='number'?30:24);
 for(const field of ['name','number','expiry'] as const)if(options[field]&&/[\r\n]/.test(texts[field]!))throw Error(`${SHARE_LABELS[field]} contains a line break and cannot be shared on one line. Deselect that field to continue.`);
 const topNatural=(options.name?natural('name'):0)+(options.expiry?natural('expiry'):0)+(options.name&&options.expiry?gap:0);
 const width=Math.ceil(Math.max(centerWidth,codes.qr?.width??0,codes.barcode?.width??0,Object.keys(texts).length?Math.min(1984,Math.max(960,topNatural+16,options.number?natural('number')+16:0)):0)+padding*2);
 const inner=width-padding*2;
 type Item={field:ShareField;x:number;y:number;width:number;height:number;fontSize?:number;lineHeight?:number;letterSpacing?:number;align?:'left'|'right'|'center'};
 const items:Item[]=[],zones:('top'|'center'|'bottom')[]=[];let y=padding;
 function text(field:'name'|'number'|'expiry',x:number,w:number,align:'left'|'right'|'center'){
  const base=field==='name'?36:field==='number'?30:24,original=natural(field),count=Array.from(texts[field]!).length;
  const spacing=original>w-12?-.3:0,measured=Math.max(1,original+Math.max(0,count-1)*spacing);
  const fontSize=Math.min(base,base*(w-12)/measured);
  if(!Number.isFinite(fontSize)||fontSize<18)throw Error(`${SHARE_LABELS[field]} is too long to fit safely on one line. Deselect that field to continue.`);
  const lineHeight=Math.ceil(fontSize*1.6);return {field,x,y,width:w,height:lineHeight+8,fontSize,lineHeight,letterSpacing:spacing*fontSize/base,align} as Item;
 }
 function zone(name:'top'|'center'|'bottom'){if(zones.length)y+=gap;zones.push(name);}
 if(options.name||options.expiry){zone('top');
  const expiryWidth=options.name&&options.expiry?Math.min(inner*.35,natural('expiry')+12):inner;
  const row:Item[]=[];if(options.name)row.push(text('name',padding,options.expiry?inner-expiryWidth-gap:inner,'left'));
  if(options.expiry)row.push(text('expiry',options.name?width-padding-expiryWidth:padding,expiryWidth,'right'));
  items.push(...row);y+=Math.max(...row.map(i=>i.height));
 }
 if(options.front||options.back){zone('center');
  const left=(width-centerWidth)/2;
  if(options.front)items.push({field:'front',x:both&&portrait?left:(width-cardWidth)/2,y,width:cardWidth,height:cardHeight});
  if(options.back)items.push({field:'back',x:both&&portrait?left+cardWidth+gap:(width-cardWidth)/2,y:both&&!portrait?y+cardHeight+gap:y,width:cardWidth,height:cardHeight});
  y+=both&&!portrait?cardHeight*2+gap:cardHeight;
 }
 if(options.number||options.qr||options.barcode){zone('bottom');
  if(options.number){const item=text('number',padding,inner,'center');items.push(item);y+=item.height;}
  const field=options.qr?'qr':options.barcode?'barcode':null;
  if(field){if(options.number)y+=gap;const code=codes[field]!;items.push({field,x:(width-code.width)/2,y,width:code.width,height:code.height});y+=code.height;}
 }
 const height=Math.ceil(y+padding);
 if(width>2048||height>4096||width*height>8_000_000)throw Error('This composition exceeds the safe image size. Select fewer items.');
 return {fields,texts,codes,appearance:card.appearance,orientation:card.orientation,sizePresetId:card.sizePresetId,
  widthBlocks:size.widthBlocks,heightBlocks:size.heightBlocks,cardWidth,cardHeight,width,height,padding,gap,items,zones};
}
export type CardSharePlan=NonNullable<ReturnType<typeof prepareCardShare>>;

export function inspectSharePng(bytes: Uint8Array, expectedWidth?: number) {
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  if (bytes.length < 24 || signature.some((v, i) => bytes[i] !== v)
    || String.fromCharCode(...bytes.slice(12, 16)) !== 'IHDR') throw Error('The generated image is not a valid PNG.');
  const data = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const width = data.getUint32(16), height = data.getUint32(20);
  if (width < 1 || height < 1 || width > 2048 || height > 4096 || width * height > 8_000_000
    || expectedWidth !== undefined && width !== expectedWidth) throw Error('The generated image dimensions could not be verified.');
  return { width, height };
}
