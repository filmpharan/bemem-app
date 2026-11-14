"""Copy the fourteen registered PNGs; never overwrite a different asset or edit previews."""
from pathlib import Path
import hashlib,json,shutil
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
COLORS=['blush-pink','warm-brown','fresh-green','golden-yellow','sky-blue','dream-purple','coral-orange']
BACKS=['pink','brown','green','yellow','blue','purple','orange']
PAIR=['pink','brown','green','yellow','blue','purple','orange']

def main():
 dest=ROOT/'assets/card-faces';dest.mkdir(parents=True,exist_ok=True)
 rows=[]
 for side,names in [('front',COLORS),('back',BACKS)]:
  for name in names:
   source=ROOT/(f'design-previews/lagoon-glass-card-face-v2/masters/png/{name}.png' if side=='front' else f'design-previews/card-face-and-group-frame/masters/A-{name}.png')
   if side=='back' and name=='orange':source=ROOT/'design-previews/soft-pastel-minimal-orange-back/masters/A-orange.png'
   id=f'art-bemem-{ "lg2" if side=="front" else "spm1" }-{side}-{name}.png';target=dest/id
   if target.exists() and target.read_bytes()!=source.read_bytes():raise RuntimeError('Refusing to overwrite a different production artwork: '+id)
   if not target.exists():shutil.copy2(source,target)
   im=Image.open(target);im.verify();im=Image.open(target);assert im.size==(1536,1536)
   raw=target.read_bytes();rows.append({'assetId':id,'side':side,'color':name,'width':im.width,'height':im.height,'byteLength':len(raw),'md5':hashlib.md5(raw).hexdigest(),'sha256':hashlib.sha256(raw).hexdigest(),'source':str(source.relative_to(ROOT)).replace('\\','/')})
  print('Verified '+side+' masters',flush=True)
 manifest={'artworks':rows,'frontToBack':dict(zip(COLORS,PAIR)),'totalBundledBytes':sum(r['byteLength'] for r in rows)}
 (dest/'MANIFEST.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
 ts='// Generated from the approved PNG bytes by scripts/prepare-default-card-artwork.py.\n// Versioned IDs are immutable; future artwork changes require new IDs.\nexport const DEFAULT_CARD_ARTWORK = '+json.dumps({r['assetId']:{k:r[k] for k in ['assetId','width','height','byteLength','md5']} for r in rows},indent=2)+' as const;\n'
 ts+='export const DEFAULT_CARD_FACES = '+json.dumps([{'id':name,'front':f'art-bemem-lg2-front-{name}.png','back':f'art-bemem-spm1-back-{back}.png','formColorId':'leaf' if name=='golden-yellow' else 'slate'} for name,back in zip(COLORS,PAIR)],indent=2)+' as const;\n'
 (ROOT/'src/constants/default-card-artwork.ts').write_text(ts,encoding='utf-8')
 # Preserve loader logic; generate only the literal static asset table.
 import re
 asset_file=ROOT/'src/lib/default-card-artwork-assets.ts';native=asset_file.read_text(encoding='utf-8')
 table="const bundled: Record<string,number> = {\n"+''.join(f"  '{r['assetId']}': require('../../assets/card-faces/{r['assetId']}'),\n" for r in rows)+"};"
 native=re.sub(r'const bundled: Record<string,number> = \{.*?\};',lambda _:table,native,flags=re.S).replace('all thirteen PNGs','all fourteen PNGs')
 asset_file.write_text(native,encoding='utf-8')
 print(json.dumps({'front':7,'back':7,'totalBundledBytes':manifest['totalBundledBytes']}))
if __name__=='__main__':main()
