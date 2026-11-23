import { Asset } from 'expo-asset';

// Existing installed Expo Asset module; literal requires ensure legacy and new versioned PNGs bundle.
const bundled: Record<string,number> = {
  'art-bemem-lg2-front-blush-pink.png': require('../../assets/card-faces/art-bemem-lg2-front-blush-pink.png'),
  'art-bemem-lg2-front-warm-brown.png': require('../../assets/card-faces/art-bemem-lg2-front-warm-brown.png'),
  'art-bemem-lg2-front-fresh-green.png': require('../../assets/card-faces/art-bemem-lg2-front-fresh-green.png'),
  'art-bemem-lg2-front-golden-yellow.png': require('../../assets/card-faces/art-bemem-lg2-front-golden-yellow.png'),
  'art-bemem-lg2-front-sky-blue.png': require('../../assets/card-faces/art-bemem-lg2-front-sky-blue.png'),
  'art-bemem-lg2-front-dream-purple.png': require('../../assets/card-faces/art-bemem-lg2-front-dream-purple.png'),
  'art-bemem-lg2-front-coral-orange.png': require('../../assets/card-faces/art-bemem-lg2-front-coral-orange.png'),
  'art-bemem-spm1-back-pink.png': require('../../assets/card-faces/art-bemem-spm1-back-pink.png'),
  'art-bemem-spm1-back-brown.png': require('../../assets/card-faces/art-bemem-spm1-back-brown.png'),
  'art-bemem-spm1-back-green.png': require('../../assets/card-faces/art-bemem-spm1-back-green.png'),
  'art-bemem-spm1-back-yellow.png': require('../../assets/card-faces/art-bemem-spm1-back-yellow.png'),
  'art-bemem-spm1-back-blue.png': require('../../assets/card-faces/art-bemem-spm1-back-blue.png'),
  'art-bemem-spm1-back-purple.png': require('../../assets/card-faces/art-bemem-spm1-back-purple.png'),
  'art-bemem-spm1-back-orange.png': require('../../assets/card-faces/art-bemem-spm1-back-orange.png'),
  'art-bemem-vl1-front-gray.png': require('../../assets/card-faces/vivid-lagoon-v1/art-bemem-vl1-front-gray.png'),
  'art-bemem-vl1-back-gray.png': require('../../assets/card-faces/vivid-lagoon-v1/art-bemem-vl1-back-gray.png'),
  'art-bemem-vl1-front-brown.png': require('../../assets/card-faces/vivid-lagoon-v1/art-bemem-vl1-front-brown.png'),
  'art-bemem-vl1-back-brown.png': require('../../assets/card-faces/vivid-lagoon-v1/art-bemem-vl1-back-brown.png'),
  'art-bemem-vl1-front-red.png': require('../../assets/card-faces/vivid-lagoon-v1/art-bemem-vl1-front-red.png'),
  'art-bemem-vl1-back-red.png': require('../../assets/card-faces/vivid-lagoon-v1/art-bemem-vl1-back-red.png'),
  'art-bemem-vl1-front-green.png': require('../../assets/card-faces/vivid-lagoon-v1/art-bemem-vl1-front-green.png'),
  'art-bemem-vl1-back-green.png': require('../../assets/card-faces/vivid-lagoon-v1/art-bemem-vl1-back-green.png'),
  'art-bemem-vl1-front-blue.png': require('../../assets/card-faces/vivid-lagoon-v1/art-bemem-vl1-front-blue.png'),
  'art-bemem-vl1-back-blue.png': require('../../assets/card-faces/vivid-lagoon-v1/art-bemem-vl1-back-blue.png'),
  'art-bemem-vl1-front-purple.png': require('../../assets/card-faces/vivid-lagoon-v1/art-bemem-vl1-front-purple.png'),
  'art-bemem-vl1-back-purple.png': require('../../assets/card-faces/vivid-lagoon-v1/art-bemem-vl1-back-purple.png'),
  'art-bemem-vl1-front-pink.png': require('../../assets/card-faces/vivid-lagoon-v1/art-bemem-vl1-front-pink.png'),
  'art-bemem-vl1-back-pink.png': require('../../assets/card-faces/vivid-lagoon-v1/art-bemem-vl1-back-pink.png'),
  'art-bemem-vl1-front-orange.png': require('../../assets/card-faces/vivid-lagoon-v1/art-bemem-vl1-front-orange.png'),
  'art-bemem-vl1-back-orange.png': require('../../assets/card-faces/vivid-lagoon-v1/art-bemem-vl1-back-orange.png'),
};
export function bundledCardArtworkUri(id:string): string | undefined {
  if(bundled[id]===undefined)return undefined;
  const asset=Asset.fromModule(bundled[id]);return asset.localUri??asset.uri;
}
export async function loadBundledCardArtwork(id:string): Promise<string> {
  if(bundled[id]===undefined)throw Error('Unknown default artwork.');
  const asset=await Asset.fromModule(bundled[id]).downloadAsync();
  if(!asset.localUri)throw Error('Default artwork is not available locally.');
  return asset.localUri;
}
