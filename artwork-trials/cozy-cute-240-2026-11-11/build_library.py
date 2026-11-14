"""Artwork library compiler. Uses existing Pillow/Inkscape; never accesses wallet files.
--frames builds60 new SVG masters. --export exports available artwork for review.
--finalize requires all240 validated originals, then generates the existing app registries.
"""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont,ImageOps,ImageChops
import argparse,hashlib,importlib.util,json,math,shutil,tempfile
ROOT=Path(__file__).resolve().parent;PROJECT=ROOT.parents[1]
SOURCE=ROOT/'artwork-source';REVIEW=ROOT/'review';PNGS=REVIEW/'png'
for p in [SOURCE,PNGS,ROOT/'artist-originals']:p.mkdir(parents=True,exist_ok=True)
plan=json.loads((ROOT/'inventory-plan.json').read_text(encoding='utf-8'))
legacy=json.loads((ROOT/'legacy-assets.json').read_text(encoding='utf-8'))
legacy_by_id={a['id']:a for a in legacy}
spec=importlib.util.spec_from_file_location('illustrator',PROJECT/'.agents/skills/bemem-illustrator/scripts/prepare_assets.py')
pipeline=importlib.util.module_from_spec(spec);spec.loader.exec_module(pipeline)
INKSCAPE=str(PROJECT/'.artwork-tools/inkscape-1.4.2/bin/inkscape.com')
O='#8a6653';CREAM='#f9f3ea';BLUSH='#e8b6ae';SAGE='#9fbaa7';BUTTER='#ebcb91';SKY='#afc8d8'
base_frames={'wellness':['vine-straight','vine-corner','vine-end'],'cafe':['coffee-straight','coffee-corner','coffee-end'],
 'shopping':['ribbon-straight','ribbon-corner','ribbon-end'],'savings':['savings-straight','savings-corner','savings-end']}
base_accents={'wellness':'vine-flower-accent','cafe':'coffee-accent','shopping':'ribbon-accent','savings':'savings-accent'}
shapes=[
 ('Straight trail','M0 48H12C26 48 25 45 40 46C57 47 57 50 73 49C80 48 80 48 84 48H96',('W','E')),
 ('Soft corner','M0 48H12C31.88 48 48 64.12 48 84V96',('W','S')),
 ('Rounded end','M0 48H12C32 48 40 42 54 46C63 49 67 49 74 46',('W',)),
 ('Three way branch','M0 48H96M48 48C48 64 48 72 48 84V96',('W','E','S')),
 ('Four way crossing','M0 48H96M48 0V96',('N','E','S','W')),
 ('Keepsake arch','M0 48H12C28 48 28 22 48 22S68 48 84 48H96',('W','E')),
 ('Wandering S trail','M0 48H12C26 48 26 22 41 28C55 33 45 69 62 69C76 69 73 48 84 48H96',('W','E')),
 ('Round loop junction','M0 48H30M66 48H96M30 48C30 24 66 24 66 48C66 72 30 72 30 48Z',('W','E')),
 ('Curled corner','M0 48H12C28 48 34 30 48 32C69 35 65 62 49 58C37 55 46 45 54 48M48 58V96',('W','S')),
 ('Hanging end','M0 48H12C25 48 28 39 42 40C61 41 61 60 60 69',('W',)),
 ('Stepped corner','M0 48H12C24 48 24 29 38 29C53 29 66 42 66 55C66 69 48 70 48 84V96',('W','S')),
 ('Braided bridge','M0 48H12C30 48 30 31 48 38C65 45 68 48 84 48H96M12 48C30 48 30 65 48 58C65 51 68 48 84 48',('W','E')),
]
anchors=[[(30,33),(65,62)],[(29,34),(64,68)],[(58,38)],[(29,32),(65,67)],[(27,27),(68,68)],[(48,23)],
 [(28,27),(66,68)],[(48,48)],[(65,34)],[(60,70),(39,60)],[(31,26),(67,63)],[(47,25),(50,70)]]

def motif(family,x,y,index):
 # Small family-specific drawings; no text, font glyphs, stock icons or cross-family recoloring.
 if family=='pets':
  bodies=[f'<path d="M-6 6C-9 0 -2 -4 0 0C2 -4 9 0 6 6Q0 11 -6 6Z" fill="{BLUSH}"/><ellipse cx="-7" cy="-4" rx="2.6" ry="3.2" fill="{CREAM}"/><ellipse cx="0" cy="-7" rx="2.6" ry="3.2" fill="{CREAM}"/><ellipse cx="7" cy="-4" rx="2.6" ry="3.2" fill="{CREAM}"/>',
   f'<path d="M-7 -3C-14 -9 -15 6 -7 3L7 3C15 9 16 -7 8 -3Z" fill="{CREAM}"/>',
   f'<path d="M-9 -3Q0 -13 8 -3L12 -7V6L8 3Q0 12 -9 3Z" fill="{SKY}"/><circle cx="-4" cy="-1" r="1" fill="{O}"/>',
   f'<path d="M0 9C-19 -3 -4 -15 0 -6C5 -15 20 -2 0 9Z" fill="{BLUSH}"/><path d="M-2 -3L3 3M-3 2L2 -3" fill="none"/>']
 elif family=='travel':
  bodies=[f'<path d="M-11 4C-17 -4 -6 -9 -4 -3C-3 -15 10 -12 10 -4C21 -5 17 8 9 7H-6Z" fill="{CREAM}"/>',
   f'<path d="M-11 -7L7 -10L11 7L-7 10Z" fill="{BUTTER}"/><path d="M-5 -5L2 -6M-3 3L5 2" fill="none"/>',
   f'<path d="M-10 5L-2 -2L4 -10L7 -8L4 0L12 5L10 8L1 4L-4 10Z" fill="{SKY}"/>',
   f'<path d="M-11 -7L10 -6L9 8L-10 7Z" fill="{BLUSH}"/><path d="M-7 4L-2 -2L2 2L6 -3" fill="none"/>']
 elif family=='wellness':
  bodies=[f'<path d="M0 8C-13 -4 -4 -15 7 -10C12 -1 6 4 0 8Z" fill="{SAGE}"/><path d="M0 8L3 -5" fill="none"/>',
   f'<path d="M-3 -3C-13 -14 1 -18 3 -6C14 -13 20 1 7 3C17 14 0 17 -2 6C-15 15 -19 0 -3 -3Z" fill="{BLUSH}"/><circle r="3" fill="{BUTTER}"/>',
   f'<path d="M0 9V-10M0 1C-13 3 -12 -8 -2 -4M1 -3C13 -3 12 -14 2 -9" fill="{SAGE}"/>',
   f'<path d="M-7 7C-12 -3 -4 -11 1 -13C6 -5 12 6 3 9Z" fill="{SKY}"/>']
 elif family=='cafe':
  bodies=[f'<ellipse rx="6" ry="9" fill="#c2a18a"/><path d="M0 -7Q-4 0 0 7" fill="none"/>',
   f'<path d="M-9 5C-13 -8 9 -12 11 0Q7 13 -5 10Z" fill="{BUTTER}"/><path d="M-4 2L-2 1M4 3L6 3M1 -4L2 -3" fill="none"/>',
   f'<path d="M-5 10C8 2 -12 -1 0 -11M3 9C13 3 2 0 8 -5" fill="none"/>',
   f'<path d="M-11 3Q-7 -14 -1 -5Q5 -17 12 3L6 9Q0 1 -6 9Z" fill="{BUTTER}"/>']
 elif family=='shopping':
  bodies=[f'<path d="M0 0C-21 -22 -23 12 -1 3C22 14 23 -21 0 0ZM-2 3L-8 14L0 10L7 14L3 3" fill="{BLUSH}"/><ellipse rx="3" ry="4" fill="{BUTTER}"/>',
   f'<path d="M-9 -5L-4 -11L10 -2L2 10L-11 1Z" fill="{CREAM}"/><circle cx="-5" cy="-5" r="1.4" fill="{O}"/>',
   f'<path d="M-9 -8L8 -9L10 8L-8 9Z" fill="{SAGE}"/><path d="M0 -9V9M-8 -1H9" fill="none"/>',
   f'<path d="M-10 5C-17 -7 -3 -14 0 -5C6 -14 19 -3 9 6Q2 13 -10 5Z" fill="{BLUSH}"/>']
 else:
  bodies=[f'<circle r="7" fill="{BUTTER}"/><path d="M-3 0H3" fill="none"/>',
   f'<path d="M-10 -4Q0 -10 11 -3L9 8L-9 8Z" fill="{SAGE}"/><path d="M3 -1L12 -2V4H4Z" fill="{BLUSH}"/>',
   f'<path d="M0 9V-3C-12 1 -15 -12 -2 -8C0 -19 16 -14 10 -3Q7 3 0 -3" fill="{SAGE}"/>',
   f'<path d="M-10 -6H9V8H-10Z" fill="{CREAM}"/><path d="M-10 -6L0 2L9 -6" fill="none"/>']
 return f'<g transform="translate({x} {y}) rotate({(-12,18,-5,12)[index%4]}) scale(.68)" stroke="{O}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">{bodies[index%4]}</g>'

def entries():
 result=[]
 for group in plan['groups']:
  family=group['id'];prefix=group['prefix']
  for id in group['existingFocal']:result.append({**legacy_by_id[id],'collection':family,'category':'focal','method':'retained'})
  for job in plan['jobs']:
   if job['collection']==family:result.append({**job,'label':job['subject'],'method':'AI raster'})
  for i,(label,path,edges) in enumerate(shapes):
   id=base_frames.get(family,[])[i] if i< len(base_frames.get(family,[])) else f'{prefix}-frame-{i+1:02}'
   result.append({**legacy_by_id.get(id,{}),'id':id,'label':label,'collection':family,'category':'frame','connectors':edges,'shapeIndex':i,
    'method':'retained' if id in legacy_by_id else 'code-authored SVG'})
  if family in base_accents:
   id=base_accents[family];result.append({**legacy_by_id[id],'collection':family,'category':'accent','method':'retained'})
 assert len(result)==240 and len({a['id'] for a in result})==240
 for g in plan['groups']:
  assert {k:sum(a['collection']==g['id'] and a['category']==k for a in result) for k in ['focal','mini','frame','accent']}=={'focal':10,'mini':10,'frame':12,'accent':8}
 order={'focal':0,'mini':1,'frame':2,'accent':3}
 for a in result:
  a['footprint']={'cols':1,'rows':1};a['rotatable']=True;a.setdefault('connectors',[])
  a['source']=('../../'+a['path']) if a['method']=='retained' else 'artwork-source/'+a['id']+('.svg' if a['category']=='frame' else '.png')
 return sorted(result,key=lambda a:(next(i for i,g in enumerate(plan['groups']) if g['id']==a['collection']),order[a['category']],a['id']))

def build_frames(all_entries):
 for a in all_entries:
  if a['category']!='frame' or a['method']=='retained':continue
  family=a['collection'];i=a['shapeIndex'];path=shapes[i][1]
  outer,inner=(3.8,2.1) if family=='wellness' else (6,4) if family=='shopping' else (4,2)
  tint={'pets':BLUSH,'travel':SKY,'wellness':SAGE,'cafe':SAGE,'shopping':BLUSH,'savings':BUTTER}[family]
  body=f'<path d="{path}" stroke="{O}" stroke-width="{outer}" fill="none" stroke-linecap="butt" stroke-linejoin="round"/><path d="{path}" stroke="{tint}" stroke-width="{inner}" fill="none" stroke-linecap="butt" stroke-linejoin="round"/>'
  if family=='pets':body+=f'<defs><clipPath id="inside"><rect x="13" y="13" width="70" height="70"/></clipPath></defs><path d="{path}" clip-path="url(#inside)" stroke="{CREAM}" stroke-width=".65" stroke-dasharray="2 3" fill="none"/>'
  for j,(x,y) in enumerate(anchors[i]):body+=motif(family,x,y,i+j)
  source=f'<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><title>bemem original {a["id"]}</title>{body}</svg>'
  (SOURCE/(a['id']+'.svg')).write_text(source,encoding='utf-8')

def export(all_entries):
 errors=[];done=[]
 with tempfile.TemporaryDirectory(prefix='bemem240-') as td:
  for a in all_entries:
   target=PNGS/(a['id']+'.png')
   if a['method']=='retained':
    original=PROJECT/a['path'];assert hashlib.sha256(original.read_bytes()).hexdigest()==a['sha256']
    if not target.exists():shutil.copyfile(original,target)
   elif a['method']=='code-authored SVG':
    if not target.exists():pipeline.read_and_normalize(SOURCE/(a['id']+'.svg'),INKSCAPE,Path(td)).save(target,optimize=True,compress_level=9)
   else:
    metadata=ROOT/'generation'/(a['id']+'.json')
    if not metadata.exists():errors.append(a['id']);continue
    generation=json.loads(metadata.read_text(encoding='utf-8'))
    if generation['status']!='generated':errors.append(a['id']);continue
    original=ROOT/'artist-originals'/(a['id']+'.png')
    if not original.exists():shutil.copyfile(generation['generatedPath'],original)
    if not target.exists():
     with Image.open(original) as image:
      image.load();assert image.format=='PNG' and image.mode=='RGBA' and image.getchannel('A').getextrema()==(0,255),a['id']
      crop=image.crop(image.getchannel('A').getbbox());ratio=614/max(crop.size);size=tuple(round(n*ratio) for n in crop.size)
      normalized=Image.new('RGBA',(768,768));normalized.alpha_composite(crop.resize(size,Image.Resampling.LANCZOS),((768-size[0])//2,(768-size[1])//2))
      normalized.save(SOURCE/(a['id']+'.png'),optimize=True)
      pipeline.read_and_normalize(SOURCE/(a['id']+'.png'),INKSCAPE,Path(td)).save(target,optimize=True,compress_level=9)
   done.append(a)
 print(json.dumps({'exported':len(done),'notGeneratedYet':len(errors)}))
 return done

def rotate(image,k):
 for _ in range(k):image=image.transpose(Image.Transpose.ROTATE_270)
 return image
def edge(im,side):return [im.getpixel({'W':(0,i),'E':(191,i),'N':(i,0),'S':(i,191)}[side]) for i in range(192)]
def validate(all_entries):
 images={};seen={};scales={};canonical={};structural={};candidates=[]
 for a in all_entries:
  file=PNGS/(a['id']+'.png');raw=file.read_bytes();sha=hashlib.sha256(raw).hexdigest()
  assert sha not in seen,('Duplicate PNG bytes',a['id'],seen.get(sha));seen[sha]=a['id']
  with Image.open(file) as im:
   im.load();assert im.format=='PNG' and im.size==(192,192) and im.mode=='RGBA' and im.n_frames==1
   assert raw[24:26]==bytes([8,6]);image=im.copy()
  alpha=image.getchannel('A');assert alpha.getextrema()==(0,255)
  assert all(alpha.getpixel(p)==0 for p in [(0,0),(191,0),(0,191),(191,191)])
  images[a['id']]=image; l,t,r,b=alpha.getbbox();radius=max(96-l,96-t,r-96,b-96)
  scales[a['id']]=min(1.2,96/radius)
  if a['category']=='frame':scales[a['id']]=1.0
  if scales[a['id']]!=1:
   inverse=1/scales[a['id']]
   expanded=image.transform((384,384),Image.Transform.AFFINE,(inverse,0,96-192*inverse,0,inverse,96-192*inverse),Image.Resampling.BICUBIC)
   bounds=expanded.getchannel('A').getbbox()
   assert bounds[0]>=96 and bounds[1]>=96 and bounds[2]<=288 and bounds[3]<=288,('Paint would clip',a['id'],bounds)
  # Exact D4-pixel checks reject rotations/mirrors; silhouettes flag possible recolors for separate review.
  variants=[];masks=[]
  for mirror in [False,True]:
   im=ImageOps.mirror(image) if mirror else image
   for k in range(4):
    variant=rotate(im,k);variants.append(hashlib.sha256(variant.tobytes()).hexdigest())
    mask=variant.getchannel('A').point(lambda x:255 if x>32 else 0).resize((48,48),Image.Resampling.NEAREST)
    masks.append(hashlib.sha256(mask.tobytes()).hexdigest())
  key=min(variants);assert key not in canonical,('Rotated/mirrored duplicate',a['id'],canonical.get(key));canonical[key]=a['id']
  shape_key=min(masks)
  if shape_key in structural:candidates.append([structural[shape_key],a['id']])
  structural[shape_key]=a['id']
  a.update({'sha256':sha,'bytes':len(raw),'png':f'review/png/{a["id"]}.png','alphaBounds':[l,t,r,b],'paintScale':scales[a['id']],
   'format':'PNG','sizePx':[192,192],'bitDepth':8,'colorMode':'RGBA','alphaRange':list(alpha.getextrema()),'transparentPixels':alpha.histogram()[0]})
 # Cartesian seam checks for all variants in each family, including retained frame sources.
 seam=[];turn={'N':'E','E':'S','S':'W','W':'N'}
 for group in plan['groups']:
  variants=[]
  for a in all_entries:
   if a['collection']!=group['id'] or a['category']!='frame':continue
   for k in range(4):
    sides=set(a['connectors'])
    for _ in range(k):sides={turn[s] for s in sides}
    image=rotate(images[a['id']],k)
    for side in turn:
     coverage=[i for i,p in enumerate(edge(image,side)) if p[3]>0]
     assert bool(coverage)==(side in sides),(a['id'],k,side,coverage)
     if coverage:assert abs((min(coverage)+max(coverage))/2-95.5)<.1,(a['id'],k,side)
    variants.append((a['id'],k,image,sides))
  count=0;max_rgb=0;max_alpha=0
  for side,opp in [('E','W'),('S','N')]:
   lefts=[edge(im,side) for _,_,im,ss in variants if side in ss];rights=[edge(im,opp) for _,_,im,ss in variants if opp in ss]
   for left in lefts:
    for right in rights:
     da=max(abs(p[3]-q[3]) for p,q in zip(left,right));dc=max(abs(p[c]-q[c]) for p,q in zip(left,right) for c in range(3))
     assert da==0 and dc<=3,(group['id'],da,dc)
     count+=1;max_rgb=max(max_rgb,dc);max_alpha=max(max_alpha,da)
  seam.append({'collection':group['id'],'pairs':count,'maxAlphaDifference':max_alpha,'maxRgbDifference':max_rgb})
 return images,scales,{'assetCount':len(all_entries),'uniqueByteHashes':len(seen),'uniqueD4PixelHashes':len(canonical),
  'identicalSilhouetteReviewCandidates':candidates,'frameChecks':seam,'samsungVerified':False,'expandedPaintClippingFailures':0,
  'paintExceptions':[{'id':a['id'],'scale':scales[a['id']],'reason':'edge connector geometry' if a['category']=='frame' else 'maximum safe centered alpha bounds'} for a in all_entries if scales[a['id']]<1.2]}

def painted(image,scale):
 if scale==1:return image
 inverse=1/scale
 return image.transform((192,192),Image.Transform.AFFINE,(inverse,0,96-96*inverse,0,inverse,96-96*inverse),Image.Resampling.BICUBIC)

def review(all_entries,images,partial=False):
 font=lambda n:ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf',n)
 for group in plan['groups']:
  selected=[a for a in all_entries if a['collection']==group['id']]
  if len(selected)!=40:continue
  sheet=Image.new('RGBA',(1200,1180),'#f7f3ed');draw=ImageDraw.Draw(sheet)
  draw.text((24,16),f'bemem / {group["name"]} /40 original assets',font=font(26),fill=O)
  draw.text((24,55),'10 focal +10 mini +12 modular frames +8 accents | AI illustration / code-authored SVG',font=font(16),fill=O)
  actual=Image.new('RGBA',(1180,1170),'#f7f3ed');ad=ImageDraw.Draw(actual)
  ad.text((22,15),group['name']+' /24,28,32px tiles / enlarged28px at3x',font=font(24),fill=O)
  for i,a in enumerate(selected):
   x=20+(i%8)*148;y=100+(i//8)*212
   draw.rounded_rectangle((x,y,x+138,y+200),12,fill='white')
   image=images[a['id']];sheet.alpha_composite(image.resize((112,112),Image.Resampling.LANCZOS),(x+13,y+5))
   draw.text((x+7,y+122),a['id'].replace(group['prefix']+'-',''),font=font(11),fill=O)
   draw.text((x+7,y+140),a['category'],font=font(11),fill=O)
   sheet.alpha_composite(image.resize((28,28),Image.Resampling.LANCZOS),(x+17,y+162))
   draw.rounded_rectangle((x+76,y+157,x+129,y+194),6,fill='#303833');sheet.alpha_composite(image.resize((28,28),Image.Resampling.LANCZOS),(x+88,y+162))
   xx=20+(i%4)*292;yy=70+(i//4)*108
   ad.text((xx,yy),a['id'].replace(group['prefix']+'-',''),font=font(11),fill=O)
   paint=painted(image,a['paintScale'])
   for j,size in enumerate([24,28,32]):actual.alpha_composite(paint.resize((size,size),Image.Resampling.LANCZOS),(xx+j*44,yy+31))
   actual.alpha_composite(paint.resize((28,28),Image.Resampling.LANCZOS).resize((84,84),Image.Resampling.NEAREST),(xx+170,yy+15))
  sheet.convert('RGB').save(REVIEW/(group['id']+'-contact.png'),optimize=True)
  actual.convert('RGB').save(REVIEW/(group['id']+'-actual-size.png'),optimize=True)
  parts=[a for a in selected if a['category']=='frame'];by_index={a['shapeIndex']:a['id'] for a in parts}
  proof=Image.new('RGBA',(1160,960),'#f7f3ed');pd=ImageDraw.Draw(proof);pd.text((24,18),group['name']+' / tile connection review',font=font(25),fill=O)
  configs=[(4,4,[(0,0,1,3),(3,0,1,0),(3,3,1,1),(0,3,1,2)]+[(x,y,0,0) for x in [1,2] for y in [0,3]]+[(x,y,0,1) for x in [0,3] for y in [1,2]]),
   (4,3,[(0,0,2,2),(1,0,5,0),(2,0,1,0),(2,1,0,1),(2,2,1,1),(1,2,6,0),(0,2,2,2)]),
   (3,3,[(0,1,2,2),(1,1,4,0),(2,1,2,0),(1,0,2,3),(1,2,2,1)])]
  for ci,(cols,rows,cells) in enumerate(configs):
   full=Image.new('RGBA',(cols*192,rows*192))
   for x,y,p,k in cells:full.alpha_composite(rotate(images[by_index[p]],k),(x*192,y*192))
   proof.alpha_composite(full.resize((cols*74,rows*74),Image.Resampling.LANCZOS),(24+ci*380,85))
   proof.alpha_composite(full.resize((cols*28,rows*28),Image.Resampling.LANCZOS),(24+ci*380,420))
  for i,a in enumerate(parts):
   x=24+(i%6)*190;y=600+(i//6)*155
   pd.text((x,y),a['label'],font=font(12),fill=O)
   for k in range(4):proof.alpha_composite(rotate(images[a['id']],k).resize((38,38),Image.Resampling.LANCZOS),(x+k*42,y+29))
  proof.convert('RGB').save(REVIEW/(group['id']+'-frames.png'),optimize=True)
 if partial:return
 blocks=[]
 for group in plan['groups']:
  cards=''.join(f'<article><img loading="lazy" width="112" height="112" src="{a["png"]}" alt="{a["label"]}"><p>{a["id"]}</p><small>{a["category"]} · scale {a["paintScale"]:.2f}</small></article>' for a in all_entries if a['collection']==group['id'])
  blocks.append(f'<section id="{group["id"]}"><h2>{group["name"]} —40</h2><p><a href="review/{group["id"]}-contact.png">Contact sheet</a> · <a href="review/{group["id"]}-actual-size.png">Actual-size simulation</a> · <a href="review/{group["id"]}-frames.png">Connected frames</a></p><div class="grid">{cards}</div></section>')
 (ROOT/'index.html').write_text('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>bemem240 Cozy Cute gallery</title><style>body{background:#f7f3ed;color:#725a50;font:16px system-ui;margin:24px}nav{display:flex;gap:16px;flex-wrap:wrap}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:12px}article{background:white;border-radius:14px;padding:12px;overflow-wrap:anywhere}img{object-fit:contain}article p{font-size:12px}section{margin-top:40px}a{color:#46695a}</style><h1>bemem /240 original Cozy Cute assets</h1><p>Six collections.34 retained assets and206 new illustrations. AI raster / programmatic SVG, not human hand painting. Technical checks and visual approval are separate.</p><p><a href="drawer-preview.html">Interactive8×3 page preview</a> · <a href="review/validation.json">Validation</a></p><nav>'+''.join(f'<a href="#{g["id"]}">{g["name"]}</a>' for g in plan['groups'])+'</nav>'+''.join(blocks),encoding='utf-8')
 data=json.dumps([{'name':g['name'],'assets':[{'id':a['id'],'png':a['png'],'scale':a['paintScale'],'label':a['label']} for a in all_entries if a['collection']==g['id']]} for g in plan['groups']],ensure_ascii=False)
 preview='''<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>bemem — paginated artwork review</title><style>body{font:15px system-ui;background:#f3f2ef;color:#405764;margin:20px}.phone{max-width:390px;margin:auto;background:#f8f8fa;border-radius:22px;padding:16px 0}h1,p{padding:0 12px}h1{font-size:20px}nav{display:flex;gap:8px;overflow-x:auto;padding:8px}nav button{white-space:nowrap;min-height:48px}button{font:inherit;color:inherit;background:white;border:1px solid #bac5c8;border-radius:10px;cursor:pointer}button:focus-visible{outline:3px solid #725a50}.grid{display:grid;grid-template-columns:repeat(8,minmax(0,1fr));gap:2px;padding:8px}.cell{height:var(--row);min-width:0;display:flex;align-items:center;justify-content:center;border-radius:9px}.art{width:var(--unit);height:var(--unit);overflow:hidden}.art img{width:100%;height:100%;object-fit:contain;transform:scale(var(--paint))}small{display:block;padding:0 12px}.nav{font-weight:800;font-size:22px;background:#e0e8e9;border-width:2px}a{color:inherit}</style><div class="phone"><h1>bemem / artwork page review</h1><small>Visual paging preview only. Native drag and wallet persistence are tested in Expo Go.</small><nav id="collections"></nav><div class="grid" id="grid"></div><p id="status"></p><p id="selected" aria-live="polite"></p><a href="index.html">Full gallery</a></div><script>const library=DATA;let collection=0,page=0;const grid=document.getElementById('grid');function render(){const assets=library[collection].assets;grid.replaceChildren();const cells=page===0?[...assets.slice(0,23),{nav:'next'}]:[{nav:'previous'},...assets.slice(23)];while(cells.length<24)cells.push({empty:true});for(const cell of cells){const item=document.createElement(cell.empty?'div':'button');item.className='cell';if(cell.nav){item.classList.add('nav');item.textContent=cell.nav==='next'?'›':'‹';item.setAttribute('aria-label',cell.nav==='next'?'Next artwork page':'Previous artwork page');item.onclick=()=>{page=cell.nav==='next'?1:0;render()}}else if(!cell.empty){item.setAttribute('aria-label',cell.label);const frame=document.createElement('div');frame.className='art';const image=document.createElement('img');image.src=cell.png;image.alt='';image.style.setProperty('--paint',cell.scale);frame.append(image);item.append(frame);item.onclick=()=>document.getElementById('selected').textContent=cell.id}else{item.setAttribute('aria-hidden','true');item.style.pointerEvents='none'}grid.append(item)}document.getElementById('status').textContent=library[collection].name+' · Page '+(page+1)+'/2 · '+assets.length+' assets';measure()}function measure(){const width=grid.getBoundingClientRect().width,unit=(width-32)/12;grid.style.setProperty('--unit',unit+'px');grid.style.setProperty('--row',Math.max(32,unit+4)+'px')}library.forEach((group,i)=>{const b=document.createElement('button');b.textContent=group.name;b.onclick=()=>{collection=i;page=0;document.getElementById('selected').textContent='';render()};document.getElementById('collections').append(b)});addEventListener('resize',measure);render()</script>'''.replace('DATA',data)
 (ROOT/'drawer-preview.html').write_text(preview,encoding='utf-8')

def finalize(all_entries):
 images,scales,validation=validate(all_entries);review(all_entries,images)
 # All required outputs exist before the existing registries are updated. Retained bytes never replaced.
 destination=PROJECT/'assets/decorations/cozy-cute-v2';destination.mkdir(parents=True,exist_ok=True)
 for a in all_entries:
  if a['method']=='retained':a['runtimePath']=a['path'];continue
  target=destination/(a['id']+'.png');source=PNGS/(a['id']+'.png')
  if target.exists():assert target.read_bytes()==source.read_bytes(),('Refuse overwrite',target)
  else:shutil.copyfile(source,target)
  a['runtimePath']=str(target.relative_to(PROJECT)).replace('\\','/')
 catalog='/** Original240-asset library. Pure metadata: no images decoded here. */\nexport const DECORATION_ASSETS = [\n'
 for a in all_entries:catalog+=f'  {{ id: \'{a["id"]}\', label: {json.dumps(a["label"],ensure_ascii=False)}, category: \'{a["category"]}\' }},\n'
 catalog+="] as const;\nexport type DecorationAssetId = typeof DECORATION_ASSETS[number]['id'];\nexport const DECORATION_COLLECTIONS: readonly {id:string;name:string;assets:readonly DecorationAssetId[]}[] = [\n"
 for group in plan['groups']:
  ids=[a['id'] for a in all_entries if a['collection']==group['id']]
  catalog+='  '+json.dumps({'id':group['id'],'name':group['name'],'assets':ids},ensure_ascii=False)+',\n'
 catalog+='];\nconst assetIds: ReadonlySet<string> = new Set(DECORATION_ASSETS.map(a=>a.id));\nexport function isDecorationAssetId(value: unknown): value is DecorationAssetId {return typeof value===\'string\' && assetIds.has(value);}\n'
 registry="import type { DecorationAssetId } from '../lib/decoration-catalog';\n/** Explicit static Metro requires. Only displayed images are decoded. */\nexport const decorationImages: Record<DecorationAssetId,number> = {\n"
 for a in all_entries:registry+=f'  \'{a["id"]}\': require(\'../../{a["runtimePath"]}\'),\n'
 registry+='};\n'
 (PROJECT/'src/lib/decoration-catalog.ts').write_text(catalog,encoding='utf-8')
 (PROJECT/'src/constants/decoration-images.ts').write_text(registry,encoding='utf-8')
 (PROJECT/'src/constants/decoration-paint.ts').write_text('/** Safe paint scale only: tile geometry and original PNG bytes are unchanged. */\nexport const decorationPaint: Readonly<Record<string,number>> = '+json.dumps(scales,indent=2)+';\n',encoding='utf-8')
 (REVIEW/'manifest.json').write_text(json.dumps({'version':2,'collections':plan['groups'],'assets':all_entries},ensure_ascii=False,indent=2),encoding='utf-8')
 (REVIEW/'validation.json').write_text(json.dumps(validation,indent=2),encoding='utf-8')
 print(json.dumps({'finalized':len(all_entries),'seamPairs':sum(s['pairs'] for s in validation['frameChecks']),
  'structuralReviewCandidates':validation['identicalSilhouetteReviewCandidates'],'pngBytes':sum(a['bytes'] for a in all_entries)}))

if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--frames',action='store_true');parser.add_argument('--export',action='store_true');parser.add_argument('--finalize',action='store_true');parser.add_argument('--review-ready',action='store_true');args=parser.parse_args()
 assets=entries()
 if args.frames:build_frames(assets)
 if args.export:export(assets)
 if args.review_ready:
  ready=[a for a in assets if (PNGS/(a['id']+'.png')).exists()]
  images,_,validation=validate(ready);review(ready,images,partial=True)
  (REVIEW/'partial-validation.json').write_text(json.dumps(validation,indent=2),encoding='utf-8')
  print(json.dumps({'readyAssets':len(ready),'frameChecks':validation['frameChecks']}))
 if args.finalize:finalize(assets)
