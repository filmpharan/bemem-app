import type { BrandId, CardArtworkPair, DemoCard, GradientPresetId, MembershipCard, MembershipCardDetails, NewMembershipCard, WalletCard } from '../types/membership-card';
import { ARTWORK_ID, MAX_IMAGE_BYTES, MAX_IMAGE_PIXELS } from './card-artwork';
import type { WalletDocument } from '../types/wallet-document';
import type { CanvasLayout } from '../types/wallet-ui';
import { cardSizePreset, type CardSizePresetId } from './card-size-presets';
import { expiryMonthError, WEB_BRANDS } from './card-presentation';
import { isDecorationAssetId } from './decoration-catalog';
import type { CanvasDecorations } from '../types/decoration';
import type { CanvasPageMetadata, CanvasPage } from './canvas-pages';

export class WalletValidationError extends Error {
  constructor(public readonly code: string, public readonly path: string) {
    // Fixed codes/structural paths only. Never include card names, payloads or raw JSON.
    super(`${code} at ${path}`);
    this.name = 'WalletValidationError';
  }
}
function fail(code: string, path: string): never { throw new WalletValidationError(code, path); }
function object(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) fail('invalid_object', path);
  return value as Record<string, unknown>;
}
function fields(value: Record<string, unknown>, names: string[], path: string, optional: string[] = []) {
  if (names.some(name => !Object.hasOwn(value, name))
    || Object.keys(value).some(name => !names.includes(name) && !optional.includes(name))) fail('invalid_fields', path);
}
function text(value: unknown, path: string, allowEmpty = false): string {
  if (typeof value !== 'string' || (!allowEmpty && value.length === 0)) fail('invalid_text', path);
  // Reject lone UTF-16 surrogates rather than letting a future encoder replace them.
  for (let i = 0; i < value.length; i++) {
    const c = value.charCodeAt(i);
    if (c >= 0xd800 && c <= 0xdbff) {
      const next = value.charCodeAt(++i);
      if (!(next >= 0xdc00 && next <= 0xdfff)) fail('invalid_unicode', path);
    } else if (c >= 0xdc00 && c <= 0xdfff) fail('invalid_unicode', path);
  }
  return value;
}
function identifier(value: unknown, path: string) {
  const id = text(value, path);
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/.test(id)
    || ['__proto__', 'constructor', 'prototype'].includes(id)) fail('invalid_id', path);
  return id;
}
function color(value: unknown, path: string) {
  const hex = text(value, path);
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) fail('invalid_color', path);
  return hex;
}
function date(value: unknown, path: string) {
  const result = text(value, path);
  if (!Number.isFinite(Date.parse(result))) fail('invalid_timestamp', path);
  return result;
}

/** Character eligibility only. QR size, encoding and scanner support need Step 3 verification. */
export function payloadCapabilities(value: unknown) {
  const payload = text(value, 'payload');
  const code128 = /^[\x20-\x7e]+$/.test(payload);
  return {
    qr: { eligible: true as const, encoderValidationRequired: true as const },
    code128: { eligible: code128, reason: code128 ? null : 'Code 128 supports printable ASCII only in this version.' },
  };
}

const sizeNames = ['sizePresetId', 'widthBlocks', 'heightBlocks'] as const;
const detailNames = [...sizeNames, 'country', 'brandId', 'brandQuery', 'expiryMonth'];
function readSize(card: Record<string, unknown>, path: string) {
  const present = sizeNames.filter(name => Object.hasOwn(card, name));
  if (!present.length) return undefined;
  if (present.length !== sizeNames.length) fail('incomplete_card_size', path);
  let preset;
  try { preset = cardSizePreset(card.sizePresetId as CardSizePresetId); }
  catch { fail('invalid_size_preset', `${path}.sizePresetId`); }
  if (!Number.isSafeInteger(card.widthBlocks) || !Number.isSafeInteger(card.heightBlocks)
    || (card.widthBlocks as number) <= 0 || (card.heightBlocks as number) <= 0
    || (card.widthBlocks as number) > 12) fail('invalid_card_dimensions', path);
  if (card.widthBlocks !== preset.ratioWidth || card.heightBlocks !== preset.ratioHeight) fail('preset_dimension_mismatch', path);
  if (card.orientation !== preset.orientation) fail('preset_orientation_mismatch', `${path}.orientation`);
  return { sizePresetId: preset.id, widthBlocks: preset.ratioWidth, heightBlocks: preset.ratioHeight };
}

/** Resolve in memory only; never inserts dimensions into legacy cards or files. */
export function resolveWalletCardFootprint(card: WalletCard) {
  const size = card.kind === 'membership' ? readSize(card as unknown as Record<string, unknown>, 'card') : undefined;
  if (size) return { widthBlocks: size.widthBlocks, heightBlocks: size.heightBlocks, source: 'preset' as const };
  return card.orientation === 'portrait' ? { widthBlocks: 4, heightBlocks: 6, source: 'legacy' as const }
    : { widthBlocks: 6, heightBlocks: 4, source: 'legacy' as const };
}

export function validateWalletCard(value: unknown, path = 'card'): WalletCard {
  const card = object(value, path);
  const id = identifier(card.id, `${path}.id`);
  const name = text(card.name, `${path}.name`);
  if (!name.trim()) fail('blank_name', `${path}.name`);
  const orientation = card.orientation;
  if (orientation !== 'landscape' && orientation !== 'portrait') fail('invalid_orientation', `${path}.orientation`);
  if (card.kind === 'demo') {
    fields(card, ['kind', 'id', 'name', 'orientation', 'colors'], path);
    if (!Array.isArray(card.colors) || card.colors.length !== 2) fail('invalid_colors', `${path}.colors`);
    return { kind: 'demo', id, name, orientation,
      colors: [color(card.colors[0], `${path}.colors[0]`), color(card.colors[1], `${path}.colors[1]`)] } satisfies DemoCard;
  }
  if (card.kind !== 'membership') fail('unsupported_card_kind', path);
  fields(card, ['kind', 'id', 'name', 'memberNumber', 'payload', 'preferredDisplayFormat', 'orientation', 'appearance', 'createdAt', 'updatedAt'], path, detailNames);
  const details: Partial<MembershipCardDetails> = { ...readSize(card, path) };
  if (Object.hasOwn(card, 'country')) {
    if (card.country !== 'TH') fail('invalid_country', `${path}.country`);
    details.country = card.country;
  }
  if (Object.hasOwn(card, 'brandId')) {
    if (card.brandId !== null && !WEB_BRANDS.some(brand => brand.id === card.brandId)) fail('invalid_brand', `${path}.brandId`);
    details.brandId = card.brandId as BrandId | null;
  }
  if (Object.hasOwn(card, 'brandQuery')) details.brandQuery = text(card.brandQuery, `${path}.brandQuery`, true);
  if (Object.hasOwn(card, 'expiryMonth')) {
    const month = text(card.expiryMonth, `${path}.expiryMonth`, true);
    if (expiryMonthError(month)) fail('invalid_expiry_month', `${path}.expiryMonth`);
    details.expiryMonth = month;
  }
  const memberNumber = card.memberNumber === null ? null : text(card.memberNumber, `${path}.memberNumber`, true);
  const payload = text(card.payload, `${path}.payload`);
  if (card.preferredDisplayFormat !== 'qr' && card.preferredDisplayFormat !== 'code128') fail('invalid_display_format', `${path}.preferredDisplayFormat`);
  if (card.preferredDisplayFormat === 'code128' && !payloadCapabilities(payload).code128.eligible) fail('unsupported_code128_payload', `${path}.payload`);
  const appearance = object(card.appearance, `${path}.appearance`);
  fields(appearance, ['backgroundColor', 'textColor', 'imageAssetId'], `${path}.appearance`, ['gradientPresetId', 'artwork']);
  const artwork: { artwork?: CardArtworkPair } = {};
  if (Object.hasOwn(appearance, 'artwork')) {
    const pair = object(appearance.artwork, `${path}.appearance.artwork`);
    fields(pair, [], `${path}.appearance.artwork`, ['front', 'back']);
    artwork.artwork = {};
    for (const side of ['front', 'back'] as const) {
      if (!Object.hasOwn(pair, side)) continue;
      if (pair[side] === null) { artwork.artwork[side] = null; continue; }
      const image = object(pair[side], `${path}.appearance.artwork.${side}`);
      fields(image, ['assetId', 'width', 'height', 'byteLength', 'md5', 'crop'], `${path}.appearance.artwork.${side}`);
      if (typeof image.assetId !== 'string' || !ARTWORK_ID.test(image.assetId)
        || !Number.isSafeInteger(image.width) || !Number.isSafeInteger(image.height) || (image.width as number) < 1 || (image.height as number) < 1
        || (image.width as number) * (image.height as number) > MAX_IMAGE_PIXELS
        || !Number.isSafeInteger(image.byteLength) || (image.byteLength as number) < 1 || (image.byteLength as number) > MAX_IMAGE_BYTES
        || typeof image.md5 !== 'string' || !/^[a-f0-9]{32}$/.test(image.md5)) fail('invalid_artwork', path);
      const crop = object(image.crop, `${path}.appearance.artwork.${side}.crop`);
      fields(crop, ['x', 'y', 'zoom'], path);
      if (['x', 'y', 'zoom'].some(key => typeof crop[key] !== 'number' || !Number.isFinite(crop[key]))
        || (crop.x as number) < 0 || (crop.x as number) > 1 || (crop.y as number) < 0 || (crop.y as number) > 1
        || (crop.zoom as number) < 1 || (crop.zoom as number) > 3) fail('invalid_artwork_crop', path);
      artwork.artwork[side] = { assetId: image.assetId, width: image.width as number, height: image.height as number,
        byteLength: image.byteLength as number, md5: image.md5, crop: { x: crop.x as number, y: crop.y as number, zoom: crop.zoom as number } };
    }
  }
  const gradient: { gradientPresetId?: GradientPresetId | null } = {};
  if (Object.hasOwn(appearance, 'gradientPresetId')) {
    if (appearance.gradientPresetId !== null
      && !WEB_BRANDS.some(brand => brand.id === appearance.gradientPresetId && brand.gradient !== null)) fail('invalid_gradient_preset', `${path}.appearance.gradientPresetId`);
    gradient.gradientPresetId = appearance.gradientPresetId as GradientPresetId | null;
  }
  const createdAt = date(card.createdAt, `${path}.createdAt`);
  const updatedAt = date(card.updatedAt, `${path}.updatedAt`);
  if (Date.parse(updatedAt) < Date.parse(createdAt)) fail('invalid_timestamp_order', path);
  return {
    kind: 'membership', id, name, memberNumber, payload, preferredDisplayFormat: card.preferredDisplayFormat, orientation, ...details,
    appearance: { backgroundColor: color(appearance.backgroundColor, `${path}.appearance.backgroundColor`),
      textColor: color(appearance.textColor, `${path}.appearance.textColor`),
      imageAssetId: appearance.imageAssetId === null ? null : identifier(appearance.imageAssetId, `${path}.appearance.imageAssetId`), ...gradient, ...artwork },
    createdAt, updatedAt,
  } satisfies MembershipCard;
}

/** Explicit strict path for NEW cards, distinct from backward-compatible document reads. */
export function validateNewMembershipCard(value: unknown, path = 'card'): NewMembershipCard {
  const card = validateWalletCard(value, path);
  if (card.kind !== 'membership') fail('unsupported_card_kind', path);
  if ([...sizeNames, 'expiryMonth'].some(name => !Object.hasOwn(card, name)) || !Object.hasOwn(card.appearance, 'gradientPresetId')) fail('missing_new_card_details', path);
  return card as NewMembershipCard;
}

export function validateWalletDocument(value: unknown): WalletDocument {
  const doc = object(value, 'wallet');
  if (doc.schemaVersion !== 2) fail('unsupported_schema', 'wallet.schemaVersion');
  fields(doc, ['schemaVersion', 'dataset', 'revision', 'savedAt', 'cards', 'canvas'], 'wallet');
  if (doc.dataset !== 'bemem-wallet') fail('invalid_dataset', 'wallet.dataset');
  if (!Number.isSafeInteger(doc.revision) || (doc.revision as number) < 0) fail('invalid_revision', 'wallet.revision');
  const savedAt = date(doc.savedAt, 'wallet.savedAt');
  if (!Array.isArray(doc.cards)) fail('invalid_cards', 'wallet.cards');
  const cards = doc.cards.map((card, i) => validateWalletCard(card, `cards[${i}]`));
  if (new Set(cards.map(card => card.id)).size !== cards.length) fail('duplicate_card_id', 'wallet.cards');
  const canvas = object(doc.canvas, 'canvas');
  fields(canvas, ['columns', 'layout'], 'canvas', ['decorations','pages','folders']);
  let pages:CanvasPageMetadata|undefined;
  if(Object.hasOwn(canvas,'pages')){
    const p=object(canvas.pages,'canvas.pages');fields(p,['version','assignments'],'canvas.pages',['selectedCount']);
    if(p.version!==1)fail('unsupported_page_version','canvas.pages');
    const assignments=object(p.assignments,'canvas.pages.assignments');pages={version:1,assignments:{}};
    for(const [id,page] of Object.entries(assignments)){identifier(id,'canvas.pages.assignments');if(![1,2,3,4,5].includes(page as number))fail('invalid_canvas_page','canvas.pages.assignments');pages.assignments[id]=page as CanvasPage;}
    if(Object.hasOwn(p,'selectedCount')){if(![2,3,4,5].includes(p.selectedCount as number))fail('invalid_page_count','canvas.pages.selectedCount');pages.selectedCount=p.selectedCount as 2|3|4|5;}
  }
  const pageOf=(id:string)=>pages?.assignments[id]??1;
  let folders: import('../types/group-folder').CanvasFolders | undefined;
  const grouped = new Set<string>(), folderIds = new Set<string>();
  if (Object.hasOwn(canvas,'folders')) {
    const extension=object(canvas.folders,'canvas.folders');fields(extension,['version','items'],'canvas.folders');
    if(extension.version!==1)fail('unsupported_folder_version','canvas.folders.version');
    if(!Array.isArray(extension.items))fail('invalid_folders','canvas.folders.items');
    folders={version:1,items:extension.items.map((value,index)=>{
      const path=`canvas.folders.items[${index}]`,f=object(value,path);fields(f,['id','name','orientation','position','memberCardIds'],path);
      const id=identifier(f.id,path+'.id'),name=text(f.name,path+'.name');
      if(!name.trim()||name.length>120)fail('invalid_folder_name',path+'.name');
      if(cards.some(c=>c.id===id)||folderIds.has(id))fail('duplicate_folder_id',path+'.id');folderIds.add(id);
      const orientation=f.orientation;if(orientation!=='landscape'&&orientation!=='portrait')fail('invalid_folder_orientation',path);
      if(!Array.isArray(f.memberCardIds)||f.memberCardIds.length<2||f.memberCardIds.length>6)fail('invalid_folder_capacity',path);
      const memberCardIds=f.memberCardIds.map((value)=>{
        const member=identifier(value,path+'.memberCardIds'),card=cards.find(c=>c.id===member);
        if(!card||card.kind!=='membership')fail('invalid_folder_member',path);
        if(grouped.has(member))fail('duplicate_folder_membership',path);grouped.add(member);
        if(pageOf(member)!==pageOf(id))fail('cross_page_folder',path);return member;
      });
      const p=object(f.position,path+'.position');fields(p,['col','row'],path+'.position');
      const width=orientation==='landscape'?6:4,height=orientation==='landscape'?4:6;
      if(!Number.isSafeInteger(p.col)||!Number.isSafeInteger(p.row)||(p.col as number)<0||(p.col as number)+width>12||(p.row as number)<0||(p.row as number)>Number.MAX_SAFE_INTEGER-height)fail('invalid_folder_position',path);
      return {id,name,orientation,position:{col:p.col as number,row:p.row as number},memberCardIds};
    })};
  }
  if (canvas.columns !== 12) fail('invalid_columns', 'canvas.columns');
  const source = object(canvas.layout, 'canvas.layout');
  if (Object.keys(source).length !== cards.length || cards.some(card => !Object.hasOwn(source, card.id))) fail('layout_card_mismatch', 'canvas.layout');
  const layout: CanvasLayout = {};
  const rectangles: { col: number; row: number; width: number; height: number;page:CanvasPage }[] = [];
  for (const card of cards) {
    const p = object(source[card.id], 'canvas.layout.position');
    fields(p, ['col', 'row'], 'canvas.layout.position');
    const footprint = resolveWalletCardFootprint(card);
    const width = footprint.widthBlocks;
    const height = footprint.heightBlocks;
    if (!Number.isSafeInteger(p.col) || !Number.isSafeInteger(p.row)) fail('invalid_position', 'canvas.layout.position');
    const col = p.col as number, row = p.row as number;
    // Numeric safety is not a screen/card-count capacity limit.
    if (col < 0 || col + width > 12 || row < 0 || row > Number.MAX_SAFE_INTEGER - height) fail('invalid_position', 'canvas.layout.position');
    if (!grouped.has(card.id)) {
      if (rectangles.some(r => r.page===pageOf(card.id)&&col < r.col + r.width && col + width > r.col && row < r.row + r.height && row + height > r.row)) fail('overlapping_cards', 'canvas.layout');
      rectangles.push({ col, row, width, height,page:pageOf(card.id) });
    }
    layout[card.id] = { col, row };
  }
  for(const f of folders?.items??[]){
    const {col,row}=f.position,width=f.orientation==='landscape'?6:4,height=f.orientation==='landscape'?4:6;
    if(rectangles.some(r=>r.page===pageOf(f.id)&&col<r.col+r.width&&col+width>r.col&&row<r.row+r.height&&row+height>r.row))fail('overlapping_folders','canvas.folders');
    rectangles.push({col,row,width,height,page:pageOf(f.id)});
  }
  const extension: { decorations?: CanvasDecorations;pages?:CanvasPageMetadata;folders?:import('../types/group-folder').CanvasFolders } = {...(pages?{pages}:{}),...(folders?{folders}:{})};
  if (Object.hasOwn(canvas, 'decorations')) {
    const decoration = object(canvas.decorations, 'canvas.decorations');
    fields(decoration, ['version', 'items'], 'canvas.decorations');
    if (decoration.version !== 1) fail('unsupported_decoration_version', 'canvas.decorations.version');
    if (!Array.isArray(decoration.items)) fail('invalid_decorations', 'canvas.decorations.items');
    const ids = new Set([...cards.map(card => card.id),...folderIds]);
    extension.decorations = { version: 1, items: decoration.items.map((value, index) => {
      const path = `canvas.decorations.items[${index}]`, item = object(value, path);
      fields(item, ['id', 'assetId', 'position', 'rotation'], path);
      const id = identifier(item.id, `${path}.id`);
      if (ids.has(id)) fail('duplicate_decoration_id', path);
      ids.add(id);
      if (!isDecorationAssetId(item.assetId)) fail('unknown_decoration_asset', `${path}.assetId`);
      if (![0, 90, 180, 270].includes(item.rotation as number)) fail('invalid_decoration_rotation', path);
      const position = object(item.position, `${path}.position`);
      fields(position, ['col', 'row'], `${path}.position`);
      if (!Number.isSafeInteger(position.col) || !Number.isSafeInteger(position.row)) fail('invalid_position', path);
      const col = position.col as number, row = position.row as number;
      if (col < 0 || col >= 12 || row < 0 || row >= Number.MAX_SAFE_INTEGER) fail('invalid_position', path);
      if (rectangles.some(r => r.page===pageOf(id)&&col < r.col + r.width && col + 1 > r.col && row < r.row + r.height && row + 1 > r.row)) fail('overlapping_decorations', path);
      rectangles.push({ col, row, width: 1, height: 1,page:pageOf(id) });
      return { id, assetId: item.assetId, position: { col, row }, rotation: item.rotation as 0 | 90 | 180 | 270 };
    }) };
  }
  const known=new Set([...cards.map(c=>c.id),...folderIds,...(extension.decorations?.items.map(i=>i.id)??[])]);
  if(pages&&Object.keys(pages.assignments).some(id=>!known.has(id)))fail('unknown_page_item','canvas.pages.assignments');
  return { schemaVersion: 2, dataset: 'bemem-wallet', revision: doc.revision as number, savedAt, cards, canvas: { columns: 12, layout, ...extension } };
}

export function decodeWalletDocument(text: string): WalletDocument {
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { fail('invalid_json', 'wallet'); }
  return validateWalletDocument(parsed);
}
