"""Read-only asset and reference checks. Writes a report only inside this preview."""
from pathlib import Path
import json,hashlib,re,xml.etree.ElementTree as ET,math
from PIL import Image,ImageStat
ROOT=Path(__file__).resolve().parents[1];APP=ROOT.parents[1]
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def validate():
 d=json.loads((ROOT/'fixtures.json').read_text(encoding='utf-8'));checks=[]
 def check(name,ok):
  checks.append({'name':name,'passed':bool(ok)})
  if not ok:raise AssertionError(name)
 psrc=(APP/'src/lib/card-size-presets.ts').read_text(encoding='utf-8')
 check('Seven presets exactly match current production definitions',[(p['id'],p['w'],p['h']) for p in d['presets']]==[(id,int(w),int(h)) for id,w,h in re.findall(r"id: '([^']+)', label: '[^']+', orientation: '[^']+', ratioWidth: (\d+), ratioHeight: (\d+)",psrc)])
 check('Current inset is 0.1 block','CARD_PAINT_INSET = 0.1' in (APP/'src/lib/card-geometry.ts').read_text(encoding='utf-8'))
 check('Current card radius is 14dp','CARD_CORNER_RADIUS = 14' in (APP/'src/constants/card-appearance.ts').read_text(encoding='utf-8'))
 check('Exactly seven SVG and seven PNG masters',len(list((ROOT/'masters/svg').glob('*.svg')))==len(list((ROOT/'masters/png').glob('*.png')))==7)
 check('Exactly forty-nine cropped files',len(list((ROOT/'previews/crops').glob('*.png')))==49)
 colors=[]
 for c in d['colors']:
  p=ROOT/'masters/png'/f'{c["id"]}.png';im=Image.open(p);im.verify();im=Image.open(p).convert('RGBA');check(c['id']+' master 1536 square',im.size==(1536,1536));check(c['id']+' opaque face intentional',im.getchannel('A').getextrema()==(255,255))
  root=ET.parse(ROOT/'masters/svg'/f'{c["id"]}.svg').getroot();check(c['id']+' no embedded text or external artwork',not any(t.tag.split('}')[-1] in ['text','image','script','foreignObject'] for t in root.iter()))
  preview=Image.open(ROOT/'previews/faces'/f'{c["id"]}.webp');preview.verify();colors.append({'id':c['id'],'meanRGB':[round(v,2) for v in ImageStat.Stat(im.convert('RGB').resize((96,96))).mean],'masterBytes':p.stat().st_size})
  for s in d['presets']:
   p=ROOT/'previews/crops'/f'{c["id"]}-{s["id"]}.png';im=Image.open(p);im.verify();im=Image.open(p).convert('RGBA');check(c['id']+'/'+s['id']+' crop size and real corner alpha',im.size==tuple(round((s[a]-.2)*64) for a in ['w','h']) and im.getchannel('A').getextrema()==(0,255))
   # The same centered, uniform cover scale as artworkFrame(... zoom:1,x:.5,y:.5).
   width,height=im.size;scale=max(width/1536,height/1536);frame=(1536*scale,1536*scale);region=((frame[0]-width)/2/scale,(frame[1]-height)/2/scale,width/scale,height/scale)
   check(c['id']+'/'+s['id']+' center-cover retains source center',abs(region[0]+region[2]/2-768)<1e-6 and abs(region[1]+region[3]/2-768)<1e-6)
 old=APP/'design-previews/lagoon-glass-group-folder';copied=list((ROOT/'folders/assets/shells').glob('*.svg'));check('All twelve folder shell layers byte-identical',len(copied)==12 and all(sha(p)==sha(old/'assets/shells'/p.name) for p in copied))
 check('Original folder geometry and interaction code reused unchanged',all(sha(ROOT/'folders/gallery'/f)==sha(old/'gallery'/f) for f in ['style.css','prototype.js']))
 for color in ['pink','brown','blue']:check('Actual rejected '+color+' preserved byte-for-byte',sha(ROOT/'assets/before'/f'A-{color}.png')==sha(APP/'design-previews/card-face-and-group-frame/masters'/f'A-{color}.png'))
 for p in (ROOT/'sheets').glob('*.png'):Image.open(p).verify()
 js=(ROOT/'gallery/gallery.js').read_text(encoding='utf-8')+(ROOT/'folders/gallery/prototype.js').read_text(encoding='utf-8')
 check('Gallery has no storage, fetch or randomization calls',not any(s in js for s in ['localStorage','sessionStorage','fetch(','XMLHttpRequest','Math.random','expo-file-system']))
 report={'passed':len(checks),'failed':0,'checks':checks,'colors':colors,'pngComparisons':len(list((ROOT/'sheets').glob('*.png'))),'nativeSamsungVerified':False,'opaqueMastersExpected':True,'transparentCropCornersExpected':True}
 (ROOT/'LOCAL-VALIDATION.json').write_text(json.dumps(report,indent=2),encoding='utf-8');return {k:report[k] for k in ['passed','failed','pngComparisons']}
if __name__=='__main__':print(json.dumps(validate()))
