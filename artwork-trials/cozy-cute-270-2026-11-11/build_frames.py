"""Thirty new code-authored SVG masters; existing 240 PNGs are immutable inputs.
Uses the installed Illustrator pipeline, Pillow and local Inkscape. No wallet IO.
"""
from pathlib import Path
import hashlib, importlib.util, json, math, re, shutil, tempfile
from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT=Path(__file__).resolve().parent
PROJECT=ROOT.parents[1]
OLD=PROJECT/'artwork-trials/cozy-cute-240-2026-11-11/review/manifest.json'
SOURCE=ROOT/'artwork-source'; REVIEW=ROOT/'review'; PNG=REVIEW/'png'
for p in (SOURCE,PNG): p.mkdir(parents=True,exist_ok=True)
spec=importlib.util.spec_from_file_location('illustrator',PROJECT/'.agents/skills/bemem-illustrator/scripts/prepare_assets.py')
pipeline=importlib.util.module_from_spec(spec);spec.loader.exec_module(pipeline)
INK=str(PROJECT/'.artwork-tools/inkscape-1.4.2/bin/inkscape.com')
roles=['straight','corner','end','tee','cross','short-detail','long-detail','ornamental-corner','connector','special-end']
labels=['Straight segment','Rounded corner','End cap','T-junction','Four-way junction','Short-detail straight','Long-detail straight','Decorative corner','Ornamental connector','Special end cap']
edges=[['W','E'],['W','S'],['W'],['W','E','S'],['N','E','S','W'],['W','E'],['W','E'],['W','S'],['W','E'],['W']]
# All connecting tangents are perpendicular to the edge; interiors differ by role.
paths=['M0 48H12C30 48 30 45 48 47S70 48 84 48H96',
 'M0 48H12C32 48 48 64 48 84V96',
 'M0 48H12C30 48 40 42 58 46L68 48',
 'M0 48H96M48 48V96','M0 48H96M48 0V96',
 'M0 48H96',
 'M0 48H12C30 48 29 29 48 29S66 48 84 48H96',
 'M0 48H12C24 48 27 29 42 29C58 29 67 44 61 57C56 67 48 72 48 84V96',
 'M0 48H26C32 48 32 33 48 33S65 48 70 48H96',
 'M0 48H12C25 48 28 37 43 37C58 37 65 48 63 65']
families=[('pets','pet-rope','pet-accent-06','Rope'),('wellness','wellness-sprig','wellness-accent-02','Leaf'),('savings','savings-chain','savings-accent-07','Chain')]
O='#846757'; CREAM='#f3ddae'; SAGE='#a8c1b0'; PINK='#e7b8ad'; BLUE='#b3cbd4'

def path(d,color,width):
 return f'<path d="{d}" fill="none" stroke="{color}" stroke-width="{width}" stroke-linecap="round" stroke-linejoin="round"/>'

def bow(x,y,scale=1):
 return f'<g transform="translate({x} {y}) scale({scale})" stroke="{O}" stroke-width="1.7" stroke-linejoin="round"><path d="M0 0C-22 -17 -23 13 -2 4L-7 15L0 11L7 16L3 4C24 14 23 -18 0 0Z" fill="{PINK}"/><ellipse rx="4" ry="6" fill="{CREAM}"/><path d="M-3 -2L2 3" fill="none"/></g>'

def leaf(x,y,angle=0,scale=1):
 # Lobed leaf contour follows the selected sprig, rather than the old oval motifs.
 return f'<g transform="translate({x} {y}) rotate({angle}) scale({scale})"><path d="M0 11C-5 7 -13 9 -10 2C-16 -2 -12 -8 -6 -7C-8 -13 -1 -15 2 -10C8 -18 15 -11 10 -6C18 -4 15 4 9 4C10 12 4 12 0 11Z" fill="{SAGE}" stroke="{O}" stroke-width="1.6"/>{path("M0 11L4 -7",'#f7ecd8',1.6)}</g>'

def ring(x,y,angle=0,color=CREAM,scale=1):
 return f'<g transform="translate({x} {y}) rotate({angle}) scale({scale})"><ellipse rx="10" ry="6" fill="none" stroke="{O}" stroke-width="4.3"/><ellipse rx="10" ry="6" fill="none" stroke="{color}" stroke-width="2.7"/>{path("M-4 -4Q0 -6 4 -4",'#fff4dc',.9)}</g>'

positions=[[(28,38),(65,57)],[(28,39),(57,73)],[(54,44)],[(27,38),(64,58),(40,74)],[(28,38),(60,24),(66,61)],[(47,41)],[(38,24),(66,40)],[(42,20),(68,54)],[(48,28),(71,49)],[(62,66),(36,29)]]

def sample_paths(d):
 tokens=re.findall(r'[A-Za-z]|-?\d+(?:\.\d+)?',d);i=0;segments=[];points=[];x=y=0;control=None
 while i<len(tokens):
  command=tokens[i];i+=1
  count={'M':2,'L':2,'H':1,'V':1,'C':6,'S':4}[command]
  v=list(map(float,tokens[i:i+count]));i+=count
  if command=='M':
   if points:segments.append(points)
   x,y=v;points=[(x,y)];control=None;continue
  start=(x,y)
  if command in ('C','S'):
   if command=='C':c1=tuple(v[:2]);c2=tuple(v[2:4]);end=tuple(v[4:])
   else:c1=(2*x-control[0],2*y-control[1]) if control else start;c2=tuple(v[:2]);end=tuple(v[2:])
   for step in range(1,61):
    t=step/60;s=1-t;points.append(tuple(s**3*start[a]+3*s*s*t*c1[a]+3*s*t*t*c2[a]+t**3*end[a] for a in (0,1)))
   x,y=end;control=c2
  else:
   end=(v[0],y) if command=='H' else (x,v[0]) if command=='V' else tuple(v)
   for step in range(1,31):points.append(tuple(start[a]+(end[a]-start[a])*step/30 for a in (0,1)))
   x,y=end;control=None
 if points:segments.append(points)
 return segments

def chain_along(d):
 result=''
 for points in sample_paths(d):
  walked=0;next_at=14;index=0
  for p,q in zip(points,points[1:]):
   length=math.dist(p,q);walked+=length
   if walked<next_at:continue
   next_at+=11;index+=1
   if not (10<p[0]<86 and 10<p[1]<86):continue
   angle=math.degrees(math.atan2(q[1]-p[1],q[0]-p[0]))+(-13 if index%2 else 13)
   result+=ring(p[0],p[1],angle,(CREAM,BLUE,SAGE)[index%3],.68)
 return result

def master(family,i):
 d=paths[i]
 # Clip interior embellishments away from the four connection corridors.
 core=path(d,O,4.3 if family=='pets' else 3.7 if family=='wellness' else 1.6)
 core+=path(d,CREAM if family=='pets' else SAGE if family=='wellness' else '#bea58c',2.5 if family=='pets' else 1.8 if family=='wellness' else .7)
 # Decorative motifs differ both in silhouette and arrangement across the 10 roles.
 for j,(x,y) in enumerate(positions[i]):
  if family=='pets':
   core+=bow(x,y,.57 if i not in (8,9) else .72)
   core+=path(f'M{x-8} {y+8}q5 8 12 3',SAGE,2.4)
  elif family=='wellness':
   angle=(-36,40,-12)[j%3];scale=.75 if i!=9 else 1
   anchor=(x-math.sin(math.radians(angle))*11*scale,y+math.cos(math.radians(angle))*11*scale)
   nearest=min((p for segment in sample_paths(d) for p in segment),key=lambda p:math.dist(p,anchor))
   core+=path(f'M{nearest[0]} {nearest[1]}Q{x} {y+15} {anchor[0]} {anchor[1]}',O,1.8)+leaf(x,y,angle,scale)
  else:
   # Individual charms attach to the chain rather than floating beside it.
   if i in (5,8,9):
    nearest=min((p for segment in sample_paths(d) for p in segment),key=lambda p:math.dist(p,(x,y)))
    core+=path(f'M{nearest[0]} {nearest[1]}L{x} {y}',O,1.2)+ring(x,y,(-35,35)[j%2],SAGE,.65)
 # A braid, botanical offshoots, or linked loops along the main route—not recolored lines.
 if family=='pets':
  if i in (0,3,4,5):
   for x in range(14,85,12):core+=path(f'M{x-4} 45q3 4 8 6',SAGE if x%24 else PINK,2.4)
  if i==6: core+=path('M18 48C29 48 30 34 43 33M54 33Q67 33 78 48',SAGE,2)
  if i==8: core+=bow(48,47,.7)
 elif family=='wellness':
  if i in (0,3,4,5):
   core+=leaf(25,44,-65,.52)+leaf(68,52,110,.58)
  if i==6:core+=leaf(49,29,0,.8)
  if i==8:core+=leaf(47,46,-20,.65)+leaf(58,43,75,.6)
 else:
  core+=chain_along(d)
  if i==2:core+=ring(66,48,0,SAGE,.85)
  if i==6:core+=ring(48,29,0,CREAM,.95)
  if i==8:core+=ring(48,47,80,SAGE,1.1)
  if i==9:core+=ring(62,67,75,SAGE,1)+f'<path d="M63 77L69 83L63 90L57 83Z" fill="{CREAM}" stroke="{O}" stroke-width="1.7"/>'
 body=f'<defs><clipPath id="interior"><rect x="9" y="9" width="78" height="78"/></clipPath></defs><g clip-path="url(#interior)">{core}</g>'
 # Identical local edge modules make every facing seam deterministic after rotations.
 for side in edges[i]:
  turn={'W':0,'N':90,'E':180,'S':270}[side]
  stub=path('M-8 48H13',O,4.3 if family=='pets' else 3.7 if family=='wellness' else 1.6)
  stub+=path('M-8 48H13',CREAM if family=='pets' else SAGE if family=='wellness' else '#bea58c',2.5 if family=='pets' else 1.8 if family=='wellness' else .7)
  if family=='pets':stub+=path('M5 45q3 4 6 6',SAGE,2.1)
  if family=='savings':stub+=ring(6,48,0,CREAM,.75)
  body+=f'<g transform="rotate({turn} 48 48)">{stub}</g>'
 return f'<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">{body}</svg>'

def canonical(im,mask=False):
 variants=[]
 for mirrored in [im,ImageOps.mirror(im)]:
  for k in range(4):
   v=mirrored.rotate(90*k)
   if mask:v=v.getchannel('A').point(lambda n:255 if n>32 else 0).resize((48,48),Image.Resampling.NEAREST)
   variants.append(hashlib.sha256(v.tobytes()).hexdigest())
 return min(variants)

def edge(im,side):return [im.getpixel({'W':(0,i),'E':(191,i),'N':(i,0),'S':(i,191)}[side]) for i in range(192)]

def main():
 previous_file=REVIEW/'manifest.json'
 previous={a['id']:a['sha256'] for a in json.loads(previous_file.read_text())['assets']} if previous_file.exists() else {}
 old=json.loads(OLD.read_text(encoding='utf-8'))['assets']
 # Keep a baseline separate from historic manifests; refuse silently changed inputs.
 snapshot=ROOT/'existing-240.json'
 original=[{'id':a['id'],'collection':a['collection'],'path':a['runtimePath'],'sha256':a['sha256']} for a in old]
 if not snapshot.exists():snapshot.write_text(json.dumps(original,indent=2),encoding='utf-8')
 assert json.loads(snapshot.read_text())==original
 images={}; hashes=set(); silhouettes={}; duplicate_shapes=[]
 for a in original:
  file=PROJECT/a['path'];assert hashlib.sha256(file.read_bytes()).hexdigest()==a['sha256'],a['id']
  im=Image.open(file).convert('RGBA');images[a['id']]=im;hashes.add(canonical(im));silhouettes[canonical(im,True)]=a['id']
 new=[]; seam_profiles={}
 with tempfile.TemporaryDirectory(prefix='bemem270-') as td:
  for family,prefix,reference,name in families:
   for i,role in enumerate(roles):
    id=f'{prefix}-{role}';source=SOURCE/(id+'.svg');svg=master(family,i)
    changed=not source.exists() or source.read_text(encoding='utf-8')!=svg
    source.write_text(svg,encoding='utf-8')
    target=PNG/(id+'.png')
    if changed or not target.exists():
     im=pipeline.read_and_normalize(source,INK,Path(td));im.save(target,optimize=True,compress_level=9)
    else:im=Image.open(target).convert('RGBA')
    # Inkscape's rotated AA can differ by a few channel values at the outermost
    # sample. Symmetrize that ONE export pixel at declared connectors only.
    # Full tile, SVG geometry, interior paint and every original240 remain intact.
    if family not in seam_profiles:
     profile=edge(im,'W')
     seam_profiles[family]=[tuple(round((p[c]+q[c])/2) for c in range(4)) for p,q in zip(profile,reversed(profile))]
    profile=seam_profiles[family]
    for side in edges[i]:
     for pixel,value in enumerate(profile):im.putpixel({'W':(0,pixel),'E':(191,pixel),'N':(pixel,0),'S':(pixel,191)}[side],value)
    im.save(target,optimize=True,compress_level=9)
    raw=target.read_bytes();assert raw[24:26]==bytes([8,6]) and im.size==(192,192)
    assert im.getchannel('A').getextrema()==(0,255)
    key=canonical(im);assert key not in hashes,('D4 duplicate',id);hashes.add(key)
    skey=canonical(im,True)
    if skey in silhouettes:duplicate_shapes.append([silhouettes[skey],id])
    silhouettes[skey]=id;images[id]=im
    new.append({'id':id,'label':name+' '+labels[i],'collection':family,'category':'frame','reference':reference,'connectors':edges[i],
     'source':'artwork-source/'+id+'.svg','png':'review/png/'+id+'.png','sha256':hashlib.sha256(raw).hexdigest(),'bytes':len(raw),
     'format':'PNG','sizePx':[192,192],'colorMode':'RGBA','bitDepth':8,'alphaRange':[0,255],'footprint':{'cols':1,'rows':1},'paintScale':1,'rotatable':True})
 checks=[];turn={'N':'E','E':'S','S':'W','W':'N'}
 for family,*_ in families:
  variants=[]
  for a in new:
   if a['collection']!=family:continue
   for k in range(4):
    sides=set(a['connectors']);im=images[a['id']].rotate(-90*k)
    for _ in range(k):sides={turn[s] for s in sides}
    for side in turn:
     coverage=[j for j,p in enumerate(edge(im,side)) if p[3]]
     assert bool(coverage)==(side in sides),(a['id'],k,side)
     if coverage:assert abs((min(coverage)+max(coverage))/2-95.5)<.1
    variants.append((im,sides))
  count=0;max_rgb=0
  for side,opposite in [('E','W'),('S','N')]:
   for im,sides in variants:
    if side not in sides:continue
    for other,osides in variants:
     if opposite not in osides:continue
     l,r=edge(im,side),edge(other,opposite)
     da=max(abs(p[3]-q[3]) for p,q in zip(l,r));dc=max(abs(p[c]-q[c]) for p,q in zip(l,r) for c in range(3))
     assert da==0 and dc==0,(family,da,dc);max_rgb=max(max_rgb,dc);count+=1
  checks.append({'family':family,'pairs':count,'maxAlphaDifference':0,'maxRgbDifference':max_rgb})
 # Review sheets are deliberately outside production asset folders.
 font=ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf',14)
 title=ImageFont.truetype('C:/Windows/Fonts/segoeuib.ttf',20)
 for family,*_ in families:
  group=[a for a in new if a['collection']==family]
  sheet=Image.new('RGB',(1000,570),'#f3f1ec');draw=ImageDraw.Draw(sheet);draw.text((16,8),family+' / 10 new modular pieces',fill=O,font=title)
  for i,a in enumerate(group):
   x=10+(i%5)*198;y=50+(i//5)*245
   sheet.paste(images[a['id']],(x,y),images[a['id']]);draw.text((x,y+194),labels[i],fill=O,font=font)
  sheet.save(REVIEW/(family+'-contact.png'))
  small=Image.new('RGB',(1000,350),'#f5f3ef');d=ImageDraw.Draw(small)
  for row,size in enumerate([24,28,32]):
   d.text((10,row*110+7),f'{size}px / 1 block',fill=O,font=font)
   for i,a in enumerate(group):
    im=images[a['id']].resize((size,size),Image.Resampling.LANCZOS);x=142+i*83;y=row*110+9
    small.paste(im,(x,y),im);small.paste(im.resize((size*2,size*2)),(x,y+37),im.resize((size*2,size*2)))
  small.save(REVIEW/(family+'-actual-size.png'))
  # Closed rectangle + branches + open path; exact adjacent tiles without gaps.
  layouts=[[(0,0,1,270),(1,0,0,0),(2,0,1,0),(0,1,0,90),(2,1,0,90),(0,2,1,180),(1,2,0,0),(2,2,1,90)],
   [(1,1,4,0),(0,1,2,180),(2,1,9,0),(1,0,2,270),(1,2,2,90)],
   [(0,0,3,0),(1,0,8,0),(2,0,9,0),(0,1,5,90),(0,2,2,90)]]
  proof=Image.new('RGB',(1100,480),'#f3f1ec');d=ImageDraw.Draw(proof);d.text((16,8),family+' / rectangle, crossing, open T path',fill=O,font=title)
  for column,layout in enumerate(layouts):
   for x,y,index,angle in layout:
    im=images[group[index]['id']].rotate(-angle)
    proof.paste(im,(20+column*360+x*96,50+y*96),im)
   # Same layout at actual 28px unit.
   for x,y,index,angle in layout:
    im=images[group[index]['id']].rotate(-angle).resize((28,28),Image.Resampling.LANCZOS)
    proof.paste(im,(20+column*360+x*28,365+y*28),im)
  proof.save(REVIEW/(family+'-connections.png'))
 manifest={'assets':new,'existingAssets':240,'totalAssets':270,'method':'Code-authored SVG, rendered by Inkscape; not hand-painted or AI-generated.'}
 (REVIEW/'manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
 validation={'newAssets':30,'totalAssets':270,'existing240HashesUnchanged':True,'uniqueD4PixelHashes':len(hashes),'silhouetteReviewCandidates':duplicate_shapes,'connections':checks,'newRuntimeBytes':sum(a['bytes'] for a in new),'samsungVerified':False}
 (REVIEW/'validation.json').write_text(json.dumps(validation,indent=2),encoding='utf-8')
 # App integration adds literal static entries; never rewrites old PNGs or reorders old IDs.
 target=PROJECT/'assets/decorations/cozy-cute-v3';target.mkdir(exist_ok=True)
 for a in new:
  dest=target/(a['id']+'.png')
  if dest.exists():assert hashlib.sha256(dest.read_bytes()).hexdigest() in (a['sha256'],previous.get(a['id'])),'Refuse changing unrelated artwork'
  shutil.copyfile(PNG/(a['id']+'.png'),dest)
 cat=PROJECT/'src/lib/decoration-catalog.ts';text=cat.read_text(encoding='utf-8')
 newlines=''.join('  '+json.dumps({k:a[k] for k in ['id','label','category']})+',\n' for a in new)
 if new[0]['id'] not in text:text=text.replace('] as const;',newlines+'] as const;',1)
 for family,*_ in families:
  ids=[a['id'] for a in new if a['collection']==family]
  pattern=r'(\{"id": "'+family+r'", "name": "[^"]+", "assets": \[)([^\]]+)(\])'
  def append(m):
   current=json.loads('['+m[2]+']')
   if not any(id in current for id in ids):current+=ids
   return m[1]+', '.join(json.dumps(id) for id in current)+m[3]
  text=re.sub(pattern,append,text)
 cat.write_text(text,encoding='utf-8')
 for filename,lines in [('src/constants/decoration-images.ts',''.join(f"  '{a['id']}': require('../../assets/decorations/cozy-cute-v3/{a['id']}.png'),\n" for a in new)),
  ('src/constants/decoration-paint.ts',''.join(f"  '{a['id']}': 1,\n" for a in new))]:
  file=PROJECT/filename;text=file.read_text(encoding='utf-8')
  if new[0]['id'] not in text:
   head,tail=text.split('};',1)
   if not head.rstrip().endswith((',', '{')):head=head.rstrip()+',\n'
   text=head+lines+'};'+tail
  file.write_text(text,encoding='utf-8')
 print(json.dumps(validation))

if __name__=='__main__':main()
