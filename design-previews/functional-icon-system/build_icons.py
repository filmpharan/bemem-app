"""Review-only original functional vectors. Does not import or write app code.
Render each direction as one transparent vector plate with local Inkscape, then
crop individual192px review rasters with Pillow. Editable24x24 SVGs are primary.
"""
from pathlib import Path
import hashlib,json,math,subprocess,xml.etree.ElementTree as ET
from PIL import Image,ImageDraw,ImageFont,ImageOps
ROOT=Path(__file__).resolve().parent;PROJECT=ROOT.parents[1]
INK=PROJECT/'.artwork-tools/inkscape-1.4.2/bin/inkscape.com'
T=json.loads((PROJECT/'design-system/bemem-lagoon-glass-rc2/TOKENS.json').read_text(encoding='utf-8'))
INK_COLOR=T['palettes']['pearl-gray']['colors']['text']['primary']
NAMES=['search','account','previous','next','close','home','add-card','edit','delete','share','camera','gallery','view-image','flip-front','flip-back','qr','barcode','decorate','undo','redo','rotate','save','policy','login','cloud-info','add-photo','journal','select','select-all','check','more','chevron-down','location','landscape','portrait','palette','calendar','zoom-in','zoom-out','crop','refresh','warning','info']
DIRECTIONS={'a':('Precision Rounded',1.85),'b':('Soft Organic',2.0),'c':('bemem Signature',1.9)}
ALIASES={'back':'previous','forward':'next','cancel':'close','remove-decoration':'delete','delete-selected':'delete','clear-history':'delete','discard':'delete','back-to-card':'previous','back-to-history':'previous','back-to-home':'home','use-image':'check','cancel-selection':'close','share-receipt':'share','reinspect':'refresh'}

def sha(file):return hashlib.sha256(file.read_bytes()).hexdigest()
def protect():
 files=sorted(list((PROJECT/'src').rglob('*'))+list((PROJECT/'assets').rglob('*'))+[PROJECT/n for n in ['package.json','package-lock.json','app.json','AGENTS.md']])
 baseline={str(f.relative_to(PROJECT)).replace('\\','/'):sha(f) for f in files if f.is_file()}
 file=ROOT/'production-baseline.json'
 if file.exists():assert json.loads(file.read_text())==baseline,'Production files changed during design-only work'
 else:file.write_text(json.dumps(baseline,indent=2),encoding='utf-8')
 return len(baseline)

def p(d):return f'<path d="{d}"/>'
def circle(x,y,r):return f'<circle cx="{x}" cy="{y}" r="{r}"/>'
def box(direction,x=3,y=4,w=18,h=16):
 if direction=='a':return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="2.4"/>'
 if direction=='b':
  return p(f'M{x+4} {y+.3}C{x+w*.45} {y-1} {x+w-1} {y} {x+w} {y+4}L{x+w-.2} {y+h-4}Q{x+w-.3} {y+h+1} {x+w-5} {y+h}L{x+4} {y+h-.2}Q{x-.8} {y+h-.5} {x} {y+h-5}L{x+.2} {y+4}Q{x+.3} {y+1} {x+4} {y+.3}Z')
 return p(f'M{x+4} {y}H{x+w-4}Q{x+w} {y} {x+w} {y+4}V{y+h-6}Q{x+w} {y+h} {x+w-6} {y+h}H{x+4}Q{x} {y+h} {x} {y+h-4}V{y+4}Q{x} {y} {x+4} {y}Z')

def mirror(body):return '<g transform="translate(24 0) scale(-1 1)">'+body+'</g>'
def glyph(v,n):
 b=lambda *args:box(v,*args)
 if n=='search':return {'a':circle(10.3,10.3,6)+p('M14.8 14.8L20.5 20.5'),
  'b':p('M16.6 10.5C16.8 14.4 13.8 17 10 16.5C6.1 16.2 3.8 13.6 4.1 9.8C4.4 5.8 7.3 3.9 11 4.3C14.5 4.5 16.7 6.8 16.6 10.5ZM14.5 15.1Q17.5 18.7 20.5 20'),
  'c':p('M9 4H12Q17 4 17 9V11Q17 17 11 17H9Q4 17 4 12V9Q4 4 9 4ZM15.5 15.5L20.5 20.5')}[v]
 if n=='account':
  return ({'a':circle(12,7,3.5)+p('M4 20V18Q4 13 12 13Q20 13 20 18V20'),
   'b':p('M15.6 7.3Q15.4 11 11.8 10.8Q8 10.5 8.4 6.7Q8.8 3.2 12.3 3.4Q16 3.8 15.6 7.3ZM4 20Q2.8 15 8.1 13.9Q13 12.3 17.6 14.6Q21 16.2 20 20'),
   'c':p('M15.5 6.5V7.5Q15.5 11 12 11Q8.5 11 8.5 7.5V6.5Q8.5 3 12 3Q15.5 3 15.5 6.5ZM4 20V17.8Q4 14 8 14H16Q20 14 20 17.8Q20 21 16 21H13')}[v])
 if n=='previous':return p({'a':'M14.5 5.5L8 12L14.5 18.5','b':'M15 5Q11.2 7.5 8 12Q11 16.8 15 19','c':'M14.5 5.5L9 10Q7 12 9 14L14.5 18.5'}[v])
 if n=='next':return mirror(glyph(v,'previous'))
 if n=='close':return p({'a':'M6 6L18 18M18 6L6 18','b':'M5.8 6.3Q11.6 11.3 18.2 17.7M18.1 5.9Q12.3 12.1 6 18','c':'M6 6L10.7 10.7Q12 12 13.3 13.3L18 18M18 6L6 18'}[v])
 if n=='home':return p({'a':'M3.5 11L12 3.5L20.5 11M5.5 9.5V20H10V14H14V20H18.5V9.5',
  'b':'M3 11.5Q7 6.2 12 3.6Q17.1 6.4 21 11.2M5.4 10V17.5Q5.2 20.4 8.5 20.1H10V14.4H14V20.1H16.2Q19 20 18.7 17V10',
  'c':'M3 11L10 4.5Q12 2.8 14 4.5L21 11M5 10V17Q5 21 9 21H10V14H15V21Q19 21 19 16V10'}[v])
 if n=='add-card':return b(3,5,16,14)+p({'a':'M14 5V12M10.5 8.5H17.5M6 15H11','b':'M13.5 5.5V12.5M10 9Q13.5 8.6 17 9M6.7 15.3Q9 14.8 11 15','c':'M14 5V12M10.5 8.5H17.5M6 15H10Q13 15 13 17'}[v])
 if n=='edit':return p({'a':'M5 15.5L16 4.5Q17 3.5 18 4.5L19.5 6Q20.5 7 19.5 8L8.5 19H4.5L5 15.5ZM14 6.5L17.5 10',
  'b':'M5.2 15.4L15.2 5.1Q17.1 2.9 19.2 5Q21 7 18.8 9L8.3 19.2L4.2 20L5.2 15.4ZM13.6 6.7L17.4 10.4',
  'c':'M5 15L15.5 4.5Q17 3 18.5 4.5L19.5 5.5Q21 7 19.5 8.5L9 19Q7 21 4 20L5 15ZM13.5 6.5L17.5 10.5'}[v])
 if n=='delete':return p({'a':'M4 6H20M9 6V3.5H15V6M6 6L7 20H17L18 6M10 10V16M14 10V16',
  'b':'M4 6.4Q12 5.4 20 6.3M9 5.9Q8 2.7 12 3Q15.8 3.1 15 5.9M6.2 6.2L7 17.5Q7.4 21 11 20.5H14Q17 20.5 17.2 17.4L18 6.2M10 10L10.3 16M14.2 10L14 16',
  'c':'M4 6H20M9 6V4Q9 3 10 3H14Q15 3 15 4V6M6 6V16Q6 21 11 21H13Q18 21 18 16V6M10 10V16M14 10V16'}[v])
 if n=='share':return (circle(6,12,2.5)+circle(18,5,2.5)+circle(18,19,2.5)+p({'a':'M8.2 10.7L15.8 6.3M8.2 13.3L15.8 17.7','b':'M8.1 10.6Q11.5 7.7 15.8 6.3M8.2 13.5Q11.8 16.1 15.8 17.7','c':'M8.3 10.7L13 8Q15 7 15.8 6.3M8.3 13.3L15.8 17.7'}[v]))
 if n=='camera':return b(3,7,18,13)+p({'a':'M7 7L9 4H15L17 7','b':'M7 7Q8 3.5 11 4H14Q16 4 17 7','c':'M7 7V6Q7 4 10 4H14Q17 4 17 7'}[v])+circle(12,13.5,3.3)
 if n=='gallery':return b()+circle(8,9,1.4)+p({'a':'M4 17L9 12L13 16L16 13L20 17','b':'M4 17Q7 10 10 13L13 16Q15 12 17 14L20 17','c':'M4 17L8 13Q9 12 10 13L13 16L16 13L20 17'}[v])
 if n=='view-image':return b(3,3,15,15)+p('M4 15L8 10L11 13')+circle(16.5,16.5,3.5)+p('M19 19L21.5 21.5')
 if n in ('flip-front','flip-back'):
  body=b(7,6,10,13)+p({'a':'M3.5 13Q3.5 3 12 3Q18 3 21 8M17 8H21V4','b':'M3.3 13Q1.8 4.6 9.2 3.5Q17 1.5 20.6 8M16.3 8.2L20.6 8L21 3.8','c':'M3 13V10Q3 3 10 3H12Q18 3 21 8M17 8H21V4'}[v])
  return body+(p('M10 11H14M10 14H12') if n=='flip-front' else p('M8 10H16M8 12H16'))
 if n=='qr':return '<g stroke-width="1.65">'+''.join(f'<rect x="{x}" y="{y}" width="5.5" height="5.5" rx="{dict(a=.65,b=.85,c=1.05)[v]}"/>' for x,y in [(3,3),(15.5,3),(3,15.5)])+p('M16 15H18V18H21V21H17M12 4V7M4 12H7M12 12H14M12 18V21')+'</g>'
 if n=='barcode':return p({'a':'M3 5V19M6 5V19M10 5V19M12 5V19M16 5V19M20 5V19','b':'M3 5.5V18.5M6.5 5V19M10.5 5.5V18.5M13 5V19M17 5.5V18.5M20.5 5V19','c':'M3 6V18M6 5V19M10 5V19M13 5V19M17 5V19M21 6V18'}[v])
 if n=='decorate':return p({'a':'M13 4L20 9L12 17L7 12L13 4ZM7 13Q3 13 3 20Q9 21 10 16',
  'b':'M13 4Q17 5 20 9L13 16Q10 17 7 12L13 4ZM7 13Q2 14 3 20Q9 22 11 16',
  'c':'M13 4L18 7Q21 9 19 11L13 17L7 12L13 4ZM7 13Q3 13 3 17V21Q10 21 10 16'}[v])
 if n=='undo':return p({'a':'M4 9H13Q20 9 20 16V19M4 9L8 5M4 9L8 13','b':'M4 9Q9 7 14 9Q21 11 20 19M4 9L8 4.5M4 9L8.5 13','c':'M4 9H12Q20 9 20 17V19M4 9L8 5M4 9L8 13'}[v])
 if n=='redo':return mirror(glyph(v,'undo'))
 if n=='rotate':return p({'a':'M19 9A8 8 0 1 0 19 17M19 9V4M19 9H14M9 10H14V15H9Z',
  'b':'M19.5 9Q17 2 10 4Q2 5 4 14Q5.5 22 13.3 20.2Q17 19.8 19 17M19.5 9L20 4M19.5 9L14.5 8.8M9 10H14V15H9Z',
  'c':'M20 9Q18 3 12 3Q4 3 4 11V13Q4 21 12 21Q17 21 20 16M20 9V4M20 9H15M9 10H14V15H9Z'}[v])
 if n=='save':return b(4,3,16,18)+p({'a':'M8 3V9H16V3M8 21V14H16V21','b':'M8 3.5L8.1 9Q12 10 16 9L15.8 3.5M8 20.5V16Q8 13 11 13H13Q16 13 16 16V20.5','c':'M8 3V9H16V3M8 21V16Q8 14 10 14H16V19'}[v])
 if n=='policy':return b(5,3,14,18)+p({'a':'M8 8H16M8 12H16M8 16H12','b':'M8 8Q12 7.5 16 8M8 12Q12 11.5 16 12M8 16H12','c':'M8 8H16M8 12H16M8 16H11Q14 16 14 18'}[v])
 if n=='login':return p({'a':'M13 4H20V20H13M3 12H15M11 8L15 12L11 16','b':'M13 4Q17 3 20 4V20Q17 21 13 20M3 12Q9 11.5 15 12M10.5 8L15 12L11 16.5','c':'M13 3H16Q21 3 21 8V16Q21 21 16 21H13M3 12H15M11 8L15 12L11 16'}[v])
 if n=='cloud-info':return p({'a':'M7 18H18Q22 18 21 13Q20 10 17 11Q18 4 12 4Q6 4 6 10Q2 10 3 15Q3 18 7 18Z','b':'M7 18.5Q1.5 18 3 12.5Q4 9 7 10Q6.5 3 13 4Q18 4.5 17.5 10.5Q22 10 21.2 15Q20.5 19 16.5 18.5Z','c':'M7 18H16Q21 18 21 14Q21 10 17 10Q17 4 11 4Q6 4 6 10Q3 10 3 14Q3 18 7 18Z'}[v])
 if n=='add-photo':return b(3,4,15,16)+p('M4 16L8 12L12 16M18 3V9M15 6H21')+circle(8,9,1.2)
 if n=='journal':return b(5,4,15,17)+p({'a':'M8 4V21M3 8H6M3 12H6M3 16H6M12 9H17M12 13H16','b':'M8 4.2Q7.5 12 8 20.8M3 8H6M3 12H6M3 16H6M12 9Q15 8.6 17 9M12 13H16','c':'M8 4V21M3 8H6M3 12H6M3 16H6M12 9H17M12 13H14Q17 13 17 16'}[v])
 if n=='select':return b(4,4,16,16)+p('M8 12L11 15L16 9')
 if n=='select-all':return b(7,7,14,14)+p('M3 16V6Q3 3 6 3H16M10 14L13 17L18 11')
 if n=='check':return p({'a':'M5 12L10 17L19 7','b':'M4.5 12Q7 14 10 17Q15 12 19.5 6.5','c':'M5 12L8.5 15.5Q10 17 11.5 15.5L19 7'}[v])
 if n=='more':return circle(5,12,1)+circle(12,12,1)+circle(19,12,1)
 if n=='chevron-down':return '<g transform="rotate(-90 12 12)">'+glyph(v,'previous')+'</g>'
 if n=='location':return p({'a':'M19 10Q19 15 12 21Q5 15 5 10A7 7 0 0 1 19 10Z','b':'M19 10Q18.5 16 12 21Q4.5 15.5 5 9Q5.5 2.5 12.5 3Q19.5 3.5 19 10Z','c':'M19 10Q19 15 14 19.5Q12 22 10 19.5Q5 15 5 10Q5 3 12 3Q19 3 19 10Z'}[v])+circle(12,10,2.2)
 if n=='landscape':return b(3,6,18,12)
 if n=='portrait':return b(6,3,12,18)
 if n=='palette':return p({'a':'M20 12Q22 5 14 3Q5 1 3 10Q1 19 10 21Q15 22 14 17Q13 14 17 14Q20 15 20 12Z','b':'M20.5 11Q21.5 5 14 3.2Q6 1 3.5 9Q.5 17.5 8.5 20.5Q14.5 23 14 17Q12.5 13 17 14Q20.5 15 20.5 11Z','c':'M21 11Q21 3 12 3Q3 3 3 12Q3 21 11 21Q15 21 14 17Q13 14 17 14Q21 14 21 11Z'}[v])+circle(8,8,1)+circle(13,6,1)+circle(6,13,1)
 if n=='calendar':return b(3,5,18,16)+p('M7 3V7M17 3V7M3 10H21M8 14H10M14 14H16M8 17H10')
 if n in ('zoom-in','zoom-out'):return glyph(v,'search')+p('M7 10.3H13.6'+('M10.3 7V13.6' if n=='zoom-in' else ''))
 if n=='crop':return p({'a':'M7 3V15Q7 17 9 17H21M3 7H15Q17 7 17 9V21','b':'M7 3L6.5 14Q6.2 17.5 10 17H21M3 7Q9 6.5 14 7Q17.5 7 17 11V21','c':'M7 3V14Q7 17 10 17H21M3 7H14Q17 7 17 10V21'}[v])
 if n=='refresh':return p({'a':'M20 9A8 8 0 0 0 5 6L3 9M3 9H8M3 9V4M4 15A8 8 0 0 0 19 18L21 15M21 15H16M21 15V20','b':'M20 9Q17 2 10 4Q5 5 3 9M3 9L8 8.7M3 9V4M4 15Q7 22 14 20Q19 19 21 15M21 15L16 15.3M21 15V20','c':'M20 9Q18 3 12 3Q6 3 3 9M3 9H8M3 9V4M4 15Q6 21 12 21Q18 21 21 15M21 15H16M21 15V20'}[v])
 if n=='warning':return p('M10.5 4Q12 1.8 13.5 4L21 18Q22 20 19.5 20H4.5Q2 20 3 18L10.5 4ZM12 8V13M12 16V16.2')
 if n=='info':return circle(12,12,9)+p('M12 11V17M12 7V7.2')
 raise ValueError(n)

def svg(v,n,color=None):
 # No background, embedded glyphs, external references, JS or baked button shapes.
 return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="{DIRECTIONS[v][1]}" stroke-linecap="round" stroke-linejoin="round"'+(f' color="{color}"' if color else '')+'>'+glyph(v,n)+'</svg>'

def main():
 protected=protect();manifest=[]
 for d in ['svg','renders','sheets']:(ROOT/d).mkdir(exist_ok=True)
 font=ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf',13);title=ImageFont.truetype('C:/Windows/Fonts/segoeuib.ttf',24)
 images={};unique={};blank=[];clipped=[]
 for v,(name,weight) in DIRECTIONS.items():
  (ROOT/'svg'/v).mkdir(exist_ok=True);(ROOT/'renders'/v).mkdir(exist_ok=True)
  rows=math.ceil(len(NAMES)/6);groups=[]
  for i,n in enumerate(NAMES):
   body=svg(v,n);ET.fromstring(body)
   file=ROOT/'svg'/v/(n+'.svg');file.write_text(body,encoding='utf-8')
   assert not any(token in body for token in ['<image','<script','<text','filter=','http://www.w3.org/1999/xlink'])
   groups.append(f'<g transform="translate({i%6*24} {i//6*24})">{glyph(v,n)}</g>')
   manifest.append({'direction':v,'name':n,'svg':f'svg/{v}/{n}.svg','viewBox':[0,0,24,24],'strokeWidth':weight,'color':'currentColor','method':'Original code-drawn geometry; familiar functional metaphors, no stock path imports'})
  plate=f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 144 {rows*24}" fill="none" stroke="{INK_COLOR}" stroke-width="{weight}" stroke-linecap="round" stroke-linejoin="round">'+''.join(groups)+'</svg>'
  (ROOT/'sheets'/(v+'-plate.svg')).write_text(plate,encoding='utf-8')
  output=ROOT/'sheets'/(v+'-plate.png')
  subprocess.run([str(INK),str(ROOT/'sheets'/(v+'-plate.svg')),'--export-area-page','--export-background-opacity=0','--export-width=1152',f'--export-height={rows*192}',f'--export-filename={output}'],check=True,capture_output=True)
  plate_im=Image.open(output).convert('RGBA')
  sheet=Image.new('RGB',(1080,rows*132+80),'#f4f5f7');draw=ImageDraw.Draw(sheet);draw.text((18,15),v.upper()+' / '+name,fill=INK_COLOR,font=title)
  for i,n in enumerate(NAMES):
   image=plate_im.crop((i%6*192,i//6*192,i%6*192+192,i//6*192+192));images[v,n]=image
   alpha=image.getchannel('A');bbox=alpha.getbbox();assert bbox and alpha.getextrema()==(0,255)
   if min(bbox[:2])<2 or max(bbox[2:])>190:clipped.append([v,n,bbox])
   digest=hashlib.sha256(image.tobytes()).hexdigest()
   # Conventional tiny invariant signs can be shared across directions; document, not hide.
   if digest in unique:blank.append([unique[digest],v+'/'+n])
   unique[digest]=v+'/'+n
   image.save(ROOT/'renders'/v/(n+'.png'),optimize=True)
   x=i%6*180;y=i//6*132+70
   sample=image.resize((56,56),Image.Resampling.LANCZOS);sheet.paste(sample,(x+62,y),sample)
   draw.text((x+12,y+69),n,fill=INK_COLOR,font=font)
  sheet.save(ROOT/'sheets'/(v+'-contact.png'))
 # Same actions, same row and icon sizes across directions.
 keys=['search','account','add-card','decorate','policy','login','previous','next','undo','redo','delete','close','save','edit','flip-front','flip-back']
 board=Image.new('RGB',(840,len(keys)*72+80),'#f4f5f7');draw=ImageDraw.Draw(board)
 for j,(v,(name,_)) in enumerate(DIRECTIONS.items()):draw.text((190+j*210,15),v.upper()+' / '+name,fill=INK_COLOR,font=font)
 for i,n in enumerate(keys):
  y=i*72+65;draw.text((15,y+12),'cancel → close' if n=='close' else n,fill=INK_COLOR,font=font)
  for j,v in enumerate(DIRECTIONS):
   im=images[v,n].resize((40,40),Image.Resampling.LANCZOS);board.paste(im,(250+j*210,y),im)
 board.save(ROOT/'sheets/comparison.png')
 # Real1x pixel samples; inverse color via alpha, no black box baked into icon.
 for v,(name,_) in DIRECTIONS.items():
  board=Image.new('RGB',(1000,len(NAMES)*52+90),'#f4f5f7');draw=ImageDraw.Draw(board)
  draw.rectangle((590,0,1000,board.height),fill=INK_COLOR);draw.text((15,12),v.upper()+' / actual CSS sizes16 /20 /24 /32',fill=INK_COLOR,font=font)
  draw.text((600,12),'Inverse: same alpha, white ink',fill='white',font=font)
  for i,n in enumerate(NAMES):
   y=65+i*52;draw.text((10,y+4),n,fill=INK_COLOR,font=font)
   for j,size in enumerate([16,20,24,32]):
    im=images[v,n].resize((size,size),Image.Resampling.LANCZOS);x=210+j*87;board.paste(im,(x,y),im)
    inverse=Image.new('RGBA',im.size,'white');inverse.putalpha(im.getchannel('A'));board.paste(inverse,(610+j*87,y),inverse)
  board.save(ROOT/'sheets'/(v+'-actual-size.png'))
 # Interaction state styling is separate from vector artwork.
 board=Image.new('RGB',(1000,310),'#f4f5f7');draw=ImageDraw.Draw(board)
 states=['Default','Pressed','Selected','Disabled','Destructive','Inverse']
 for i,state in enumerate(states):
  x=12+i*165;draw.text((x,12),state,fill=INK_COLOR,font=font)
  for row,v in enumerate(DIRECTIONS):
   y=52+row*80;bg=INK_COLOR if state=='Inverse' else '#e3e7eb' if state in ('Pressed','Selected') else '#ffffff'
   draw.rounded_rectangle((x,y,x+145,y+60),radius=16,fill=bg)
   n='delete' if state=='Destructive' else 'select' if state=='Selected' else 'save'
   im=images[v,n].resize((24,24),Image.Resampling.LANCZOS)
   if state in ('Inverse','Destructive'):
    ink=Image.new('RGBA',im.size,'white' if state=='Inverse' else '#b42318');ink.putalpha(im.getchannel('A'));im=ink
   if state in ('Disabled','Pressed'):im.putalpha(im.getchannel('A').point(lambda a:round(a*(.38 if state=='Disabled' else .72))))
   board.paste(im,(x+14,y+18),im);draw.text((x+50,y+18),v.upper(),fill='white' if state=='Inverse' else INK_COLOR,font=font)
 board.save(ROOT/'sheets/states.png')
 assert not clipped,clipped
 (ROOT/'manifest.json').write_text(json.dumps({'icons':manifest,'aliases':ALIASES,'ink':INK_COLOR,'directions':DIRECTIONS},indent=2),encoding='utf-8')
 (ROOT/'validation.json').write_text(json.dumps({'canonicalIconsPerDirection':len(NAMES),'svgFiles':len(manifest),'viewBox':[0,0,24,24],'transparentReviewRasters':len(images),'clipped':clipped,'crossDirectionInvariantPairs':blank,'protectedProductionFiles':protected,'productionUnchanged':True,'samsungVerified':False},indent=2),encoding='utf-8')
 protect();print(json.dumps({'svgFiles':len(manifest),'canonical':len(NAMES),'invariantPairs':len(blank),'protected':protected}))

if __name__=='__main__':main()
