import {validateImageSelection} from './card-artwork';
import type { CardArtwork } from '../types/membership-card';
import type { Receipt } from './card-history';

type Input = Parameters<typeof validateImageSelection>[0];
type PickerPorts = {
  cameraPermission: () => Promise<boolean>;
  pick: (camera: boolean, limit: number) => Promise<{ canceled: boolean; assets?: Input[] | null }>;
  retain: (input: Input) => Promise<CardArtwork>; nextId: () => string; active: () => boolean;
};
export class ReceiptSelectionError extends Error {}
/** Stage the whole selection before publishing it to the form. Never returns a partial batch. */
export async function pickReceipts(camera: boolean, remaining: number, ports: PickerPorts): Promise<Receipt[] | null> {
  if (!Number.isInteger(remaining) || remaining < 1 || remaining > 4) throw new ReceiptSelectionError('Maximum of 4 photos reached.');
  if (!ports.active()) return null;
  if (camera && !await ports.cameraPermission()) throw Error('Camera access was denied. You can choose a photo from Gallery instead.');
  if (!ports.active()) return null;
  const selected = await ports.pick(camera, camera ? 1 : remaining);
  if (selected.canceled || !ports.active()) return null;
  const inputs = selected.assets; if (!inputs?.length) throw new ReceiptSelectionError('No photo was selected.');
  if (inputs.length > (camera ? 1 : remaining)) throw new ReceiptSelectionError(camera
    ? 'The camera must return one photo. No photos were added.'
    : `Only ${remaining} photo ${remaining === 1 ? 'slot remains' : 'slots remain'}. You selected ${inputs.length}; no photos were added.`);
  const images: Receipt[] = [];
  for (const input of inputs) {
    if (!ports.active()) return null;
    const image = await ports.retain(input);
    if (!ports.active()) return null;
    images.push({ ...image, id: ports.nextId() });
  }
  return images;
}
export async function pickReceipt(camera: boolean, ports: PickerPorts): Promise<Receipt | null> {
  return (await pickReceipts(camera, 1, ports))?.[0] ?? null;
}

/** Selection-only path for Keeps. SDK cache remains temporary; no application retain is performed. */
export async function selectKeepReceipt(camera:boolean,ports:Pick<PickerPorts,'active'|'cameraPermission'|'pick'>):Promise<Input|null>{
 if(!ports.active())return null;
 if(camera&&!await ports.cameraPermission())throw Error('Camera access was denied. You can choose a photo from Gallery instead.');
 if(!ports.active())return null;
 const result=await ports.pick(camera,1);
 if(result.canceled||!ports.active())return null;
 if(result.assets?.length!==1)throw new ReceiptSelectionError('Choose one photo.');
 const input=result.assets[0];validateImageSelection(input);return input;
}
