"""Reconstruct only the last30 frame artworks, retaining their IDs and edge roles.
Original240 and the approved six-symbol selector are immutable inputs.
SVG illustration geometry, not a magnification of the rejected PNGs.
"""
from pathlib import Path
import hashlib,importlib.util,json,math,shutil
from PIL import Image
ROOT=Path(__file__).resolve().parent;PROJECT=ROOT.parents[1]
PREVIOUS=PROJECT/'artwork-trials/cozy-cute-270-2026-11-11'
spec=importlib.util.spec_from_file_location('frame_pipeline',PREVIOUS/'build_frames.py')
base=importlib.util.module_from_spec(spec);spec.loader.exec_module(base)
for directory in ['before/png','before/svg','review/png','artwork-source']:(ROOT/directory).mkdir(parents=True,exist_ok=True)
if not (ROOT/'before/manifest.json').exists():
 shutil.copyfile(PREVIOUS/'review/manifest.json',ROOT/'before/manifest.json')
 for a in json.loads((ROOT/'before/manifest.json').read_text())['assets']:
  for source,destination in [(PROJECT/'assets/decorations/cozy-cute-v3'/(a['id']+'.png'),ROOT/'before/png'/(a['id']+'.png')),
   (PREVIOUS/a['source'],ROOT/'before/svg'/(a['id']+'.svg'))]:shutil.copyfile(source,destination)
if not (ROOT/'review/manifest.json').exists():shutil.copyfile(ROOT/'before/manifest.json',ROOT/'review/manifest.json')

def digest(file):return hashlib.sha256(file.read_bytes()).hexdigest()
protected=['src/lib/decoration-catalog.ts','src/constants/decoration-images.ts','src/constants/decoration-paint.ts',
 'src/components/bemem/DecorationImage.tsx','src/components/bemem/WalletCanvas.tsx','src/lib/decorate-session.ts']
baseline=ROOT/'protected-files.json'
if not baseline.exists():baseline.write_text(json.dumps({p:digest(PROJECT/p) for p in protected},indent=2),encoding='utf-8')

O='#846757';CREAM='#f3ddae';SAGE='#a8c1b0';PINK='#e7b8ad';BLUE='#b3cbd4'

def stroke(d,color,width):return base.path(d,color,width)

def samples(d,step=16,offset=0):
 """Even arc-length samples with tangent; used for newly drawn braid/link geometry."""
 out=[]
 for points in base.sample_paths(d):
  distances=[0]
  for p,q in zip(points,points[1:]):distances.append(distances[-1]+math.dist(p,q))
  total=distances[-1];count=max(1,round(total/step));targets=[offset+j*total/count for j in range(count+1)]
  for distance in targets:
   if distance<0 or distance>total:continue
   for i in range(1,len(points)):
    if distances[i]<distance:continue
    p,q=points[i-1:i+1];length=distances[i]-distances[i-1];t=(distance-distances[i-1])/max(.0001,length)
    out.append((p[0]+(q[0]-p[0])*t,p[1]+(q[1]-p[1])*t,math.degrees(math.atan2(q[1]-p[1],q[0]-p[0]))));break
 return out

def braid(d,variation=0):
 # A filled24-unit rope with broad interlocking pastel strands and a round outline.
 result=stroke(d,O,25)+stroke(d,CREAM,21)
 mask='rope-'+hashlib.sha256(d.encode()).hexdigest()[:8]
 result+=f'<defs><mask id="{mask}" maskUnits="userSpaceOnUse" x="-30" y="-30" width="156" height="156"><rect width="96" height="96" fill="black"/>{stroke(d,"white",20)}</mask></defs><g mask="url(#{mask})">'
 for j,(x,y,angle) in enumerate(samples(d,17,7)):
  color=SAGE if (j+variation)%3 else PINK
  result+=f'<g transform="translate({x} {y}) rotate({angle})">'+stroke('M-7 -12C-6 -3 2 5 8 12',O,8.2)+stroke('M-7 -12C-6 -3 2 5 8 12',color,5.7)+'</g>'
 return result+'</g>'

def oak(x,y,angle,scale=.75):
 # Long, lobed full leaves, modeled on the selected illustrated oak-like sprig.
 d='M0 15C-8 10 -15 12 -11 4C-21 0 -17 -8 -10 -8C-16 -17 -5 -20 0 -15C6 -29 18 -23 12 -14C23 -17 25 -4 15 -2C24 5 15 13 7 10C9 17 4 19 0 15Z'
 return f'<g transform="translate({x} {y}) rotate({angle}) scale({scale})"><path d="{d}" fill="{SAGE}" stroke="{O}" stroke-width="2.3" stroke-linejoin="round"/>{stroke("M0 15L6 -15",'#f7ecd8',2.7)}</g>'

def foliage(d,variation):
 result=stroke(d,O,8)+stroke(d,'#d9c4a3',4.5)
 points=samples(d,28,17)
 for j,(px,py,tangent) in enumerate(points):
  if not (12<px<84 and 12<py<84):continue
  direction=tangent+(-60 if (j+variation)%2 else 60);angle=direction+90;s=.79 if j%2 else .72
  cx=px+math.sin(math.radians(angle))*15*s;cy=py-math.cos(math.radians(angle))*15*s
  cx=max(25,min(71,cx));cy=max(26,min(70,cy))
  ax=cx-math.sin(math.radians(angle))*15*s;ay=cy+math.cos(math.radians(angle))*15*s
  result+=stroke(f'M{px} {py}L{ax} {ay}',O,4)+stroke(f'M{px} {py}L{ax} {ay}','#dac6a6',2)+oak(cx,cy,angle,s)
 return result

def link(x,y,angle,color=CREAM):
 # Large rounded oval links: outer36x27, substantial7-unit material, open center.
 return f'<g transform="translate({x} {y}) rotate({angle})"><ellipse rx="14" ry="9" fill="none" stroke="{O}" stroke-width="9"/><ellipse rx="14" ry="9" fill="none" stroke="{color}" stroke-width="6.2"/>'+stroke('M-6 -7Q0 -10 6 -7','#fff2d7',1.6)+'</g>'

def chain(d,variation):
 result=''
 for j,(x,y,tangent) in enumerate(samples(d,24)):
  if not (15<x<81 and 15<y<81):continue
  result+=link(x,y,tangent+(-24 if (j+variation)%2 else 24),(BLUE,CREAM,SAGE)[j%3])
 return result

def master(family,i):
 d=base.paths[i]
 if family=='pets':
  body=braid(d,i)
  if i in (2,5,8,9):
   x,y=(65,48) if i==2 else (49,48) if i==5 else (48,34) if i==8 else (62,64)
   body+=base.bow(x,y,.95)
 elif family=='wellness':
  body=foliage(d,i)
  if i in (2,9):body+=oak(65 if i==2 else 61,41 if i==2 else 59,30 if i==2 else 80,.82)
 else:
  body=chain(d,i)
  if i==2:body+=link(65,46,-30,SAGE)
  if i==5:body+=link(48,48,74,CREAM)
  if i==8:body+=link(48,38,85,SAGE)
  if i==9:body+=link(62,63,70,SAGE)
 # One interior window plus repeated edge modules; all families remain full1x1 tiles.
 svg=f'<defs><clipPath id="interior"><rect x="8" y="8" width="80" height="80"/></clipPath></defs><g clip-path="url(#interior)">{body}</g>'
 for side in base.edges[i]:
  turn={'W':0,'N':90,'E':180,'S':270}[side]
  if family=='pets':stub=braid('M-24 48H20')
  elif family=='wellness':stub=stroke('M-24 48H16',O,8)+stroke('M-24 48H16','#d9c4a3',4.5)
  else:stub=link(0,48,0,CREAM)
  # Prevent the identical edge module from painting over too much of the unique interior.
  svg+=f'<g transform="rotate({turn} 48 48)">{stub}</g>'
 return f'<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">{svg}</svg>'

base.ROOT=ROOT;base.SOURCE=ROOT/'artwork-source';base.REVIEW=ROOT/'review';base.PNG=ROOT/'review/png';base.master=master

if __name__=='__main__':
 base.main()
 expected=json.loads(baseline.read_text())
 for p,sha in expected.items():assert digest(PROJECT/p)==sha,('Protected code changed',p)
 previous=json.loads((ROOT/'before/manifest.json').read_text())['assets']
 current=json.loads((ROOT/'review/manifest.json').read_text())['assets']
 assert [a['id'] for a in previous]==[a['id'] for a in current]
 assert all(a['sha256']!=b['sha256'] for a,b in zip(previous,current))
 print('Exactly30 replacements; all270 IDs, registry order and protected renderer/session files unchanged.')
