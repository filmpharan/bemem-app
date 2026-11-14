from pathlib import Path
import json,shutil
from PIL import Image
ROOT=Path('artwork-trials/illustrator-v2-first-trial-2026-11-09')
originals=ROOT/'artist-originals';sources=ROOT/'artwork-source'
originals.mkdir(exist_ok=False);sources.mkdir(exist_ok=False)
provenance=json.loads((ROOT/'provenance.json').read_text(encoding='utf-8'))
normalizations=[]
for item in provenance['sources']:
 source=Path(item['generatedPath']);destination=originals/(item['id']+'.png')
 if destination.exists():raise RuntimeError('Refusing to overwrite an original')
 shutil.copyfile(source,destination)
 with Image.open(source) as im:
  im.load()
  if im.format!='PNG' or im.mode!='RGBA' or im.getchannel('A').getextrema()[0]!=0:raise RuntimeError('Invalid transparent AI source '+item['id'])
  bbox=im.getchannel('A').getbbox();cropped=im.crop(bbox)
  scale=614/max(cropped.size);size=tuple(max(1,round(x*scale)) for x in cropped.size)
  canvas=Image.new('RGBA',(768,768),(0,0,0,0));canvas.alpha_composite(cropped.resize(size,Image.Resampling.LANCZOS),dest=((768-size[0])//2,(768-size[1])//2))
  canvas.save(sources/(item['id']+'.png'),optimize=True)
  normalizations.append({'id':item['id'],'originalSize':list(im.size),'alphaBounds':list(bbox),'normalizedSize':[768,768],'visibleBoundsSize':list(size),'method':'Uniform alpha-bounds fit to 80% canvas; no background removal; source preserved'})
(ROOT/'normalization.json').write_text(json.dumps(normalizations,indent=2),encoding='utf-8')
OUTLINE='#8A6653';SAGE='#9FBAA7';BLUSH='#E8B6AE';BUTTER='#EBCB91';CREAM='#F7EDE1'
def leaf(x,y,angle=0):
 return f'<g transform="translate({x} {y}) rotate({angle})"><path d="M0 0C-3 -11 5 -17 14 -20C17 -8 10 -1 0 0Z" fill="{SAGE}" stroke="{OUTLINE}" stroke-width="1.8" stroke-linejoin="round"/><path d="M0 0Q5 -8 10 -14" fill="none" stroke="{OUTLINE}" stroke-width="1.3" stroke-linecap="round"/></g>'
def stem(path,cap='butt'):
 return f'<path d="{path}" fill="none" stroke="{OUTLINE}" stroke-width="3.8" stroke-linecap="{cap}" stroke-linejoin="round"/><path d="{path}" fill="none" stroke="{SAGE}" stroke-width="2.1" stroke-linecap="{cap}" stroke-linejoin="round"/>'
def svg(name,body):
 p=sources/(name+'.svg')
 p.write_text(f'<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><title>bemem original {name}</title>{body}</svg>',encoding='utf-8')
svg('vine-straight',stem('M0 48H12C26 48 25 45 40 46C57 47 57 50 73 49C80 48 80 48 84 48H96')+leaf(30,47,-15)+leaf(64,49,165))
svg('vine-corner',stem('M0 48H12C31.88 48 48 64.12 48 84V96')+leaf(28,52,-10)+leaf(43,65,110))
svg('vine-end',stem('M0 48H12C32 48 40 42 54 46C63 49 67 49 74 46','round')+leaf(44,45,-10)+leaf(62,47,165)+f'<path d="M71 44C75 38 82 40 81 46C80 52 73 52 71 48Z" fill="{BLUSH}" stroke="{OUTLINE}" stroke-width="1.8" stroke-linejoin="round"/>')
svg('vine-flower-accent',stem('M48 56C45 67 50 74 46 82','round')+leaf(48,73,-12)+f'<path d="M39 34C30 13 56 11 57 33C75 20 86 43 65 49C80 66 55 80 48 59C39 80 16 63 33 49C10 48 19 22 39 34Z" fill="{BLUSH}" stroke="{OUTLINE}" stroke-width="2.5" stroke-linejoin="round"/><path d="M47 33C58 31 63 45 53 50C42 56 34 43 41 36Z" fill="{BUTTER}" stroke="{OUTLINE}" stroke-width="2.2"/>')
print('Created',len(list(sources.iterdir())),'review source assets; originals preserved.')
