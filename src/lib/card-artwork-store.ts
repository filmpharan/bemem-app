import { Directory, File, Paths } from 'expo-file-system';
import { uuid } from 'expo';
import { ARTWORK_ID, MAX_IMAGE_BYTES, validateImageSelection } from './card-artwork';
import type { CardArtwork } from '../types/membership-card';
import type { WalletDocument } from '../types/wallet-document';

export const ARTWORK_DIRECTORY = 'bemem-card-artwork';
export function artworkUri(id: string) {
  if (!ARTWORK_ID.test(id)) throw Error('Invalid artwork reference.');
  return new File(new Directory(Paths.document, ARTWORK_DIRECTORY), id).uri;
}
type ImageInput = Parameters<typeof validateImageSelection>[0];
export type ArtworkFiles = {
  info: (uri: string) => { exists: boolean; size?: number | null; md5?: string | null };
  copyExclusive: (source: string, id: string) => Promise<void>;
  uri: (id: string) => string; nextId: () => string;
};
/** Immutable, versioned image files. Never deletes previous artwork or retries Wallet transactions. */
export function createArtworkStore(files: ArtworkFiles) {
  const pendingDefaults=new Map<string,Promise<CardArtwork>>();
  function verify(image: CardArtwork,known?:ReturnType<ArtworkFiles['info']>) {
    if (!ARTWORK_ID.test(image.assetId)) throw Error('Invalid artwork reference.');
    const info = known??files.info(files.uri(image.assetId));
    if (!info.exists || info.size !== image.byteLength || info.md5 !== image.md5) throw Error('An artwork file is missing or damaged. Nothing has been confirmed.');
  }
  function retainDefault(expected:CardArtwork,loadSource:()=>Promise<string>):Promise<CardArtwork>{
    const existing=pendingDefaults.get(expected.assetId);
    if(existing)return existing.then(()=>{verify(expected);return {...expected,crop:{...expected.crop}};});
    const work=(async()=>{
      if(!ARTWORK_ID.test(expected.assetId))throw Error('Invalid artwork identifier.');
      const retained=files.info(files.uri(expected.assetId));
      if(retained.exists){verify(expected,retained);return {...expected,crop:{...expected.crop}};}
      const source=await loadSource(),info=files.info(source);
      if(!info.exists||info.size!==expected.byteLength||info.md5!==expected.md5)throw Error('Default artwork integrity check failed.');
      try{await files.copyExclusive(source,expected.assetId);}catch{
        // Another session may have retained the identical immutable asset. Never overwrite it.
        verify(expected);
      }
      verify(expected);return {...expected,crop:{...expected.crop}};
    })().finally(()=>{if(pendingDefaults.get(expected.assetId)===work)pendingDefaults.delete(expected.assetId);});
    pendingDefaults.set(expected.assetId,work);return work;
  }
  return {
    verifyArtwork: (image:CardArtwork)=>verify(image),
    /** Coalesce duplicate in-process preparation, without caching integrity across sessions. */
    retainDefault,
    async retain(input: ImageInput): Promise<CardArtwork> {
      const extension = validateImageSelection(input), original = files.info(input.uri);
      if (!original.exists || !original.size || original.size > MAX_IMAGE_BYTES || !original.md5) throw Error('The image is unreadable or larger than 10 MB.');
      const assetId = `art-${files.nextId()}.${extension}`;
      if (!ARTWORK_ID.test(assetId)) throw Error('Invalid artwork identifier.');
      await files.copyExclusive(input.uri, assetId);
      const image = { assetId, width: input.width, height: input.height, byteLength: original.size, md5: original.md5,
        crop: { x: 0.5, y: 0.5, zoom: 1 } };
      verify(image); return image;
    },
    verifyWallet(wallet: Pick<WalletDocument, 'cards'>) {
      for (const card of wallet.cards) if (card.kind === 'membership') {
        for (const side of ['front', 'back'] as const) { const image = card.appearance.artwork?.[side]; if (image) verify(image); }
      }
    },
  };
}
export const deviceArtworkStore = createArtworkStore({
  info: uri => new File(uri).info({ md5: true }), uri: artworkUri, nextId: () => uuid.v4(),
  async copyExclusive(source, id) {
    new Directory(Paths.document, ARTWORK_DIRECTORY).create({ idempotent: true, overwrite: false });
    await new File(source).copy(new File(artworkUri(id)), { overwrite: false });
  },
});
