"""Original, code-authored Lagoon Glass artwork. Uses existing Inkscape/Pillow only."""
from pathlib import Path
import os,re,json,shutil,subprocess,hashlib
from PIL import Image,ImageOps,ImageDraw,ImageFont

ROOT=Path(__file__).resolve().parents[1]
APP=ROOT.parents[1]
INK=APP/'.artwork-tools/inkscape-1.4.2/bin/inkscape.com'
COLORS=[
 ('blush-pink','Blush Pink','#8C284E','#CE547C','#EF91AA','#FFD6DB'),
 ('warm-brown','Warm Brown','#603B2C','#9C6243','#CC9968','#F3D9B0'),
 ('fresh-green','Fresh Green','#20583F','#469060','#8CC477','#E0ECAF'),
 ('golden-yellow','Golden Yellow','#99651D','#D59B32','#F2CB62','#FFF0AF'),
 ('sky-blue','Sky Blue','#194D84','#287FB5','#70C7DB','#C8F1F2'),
 ('dream-purple','Dream Purple','#463477','#7857AF','#B098DB','#E4D9FF'),
 ('coral-orange','Coral Orange','#9A3E2B','#D47547','#F5B077','#FFE0BD'),
]

def artwork(p):
 id,name,deep,body,light,glint=p
 return f'''<svg xmlns="http://www.w3.org/2000/svg" width="1536" height="1536" viewBox="0 0 1536 1536">
<title>{name} — original Lagoon Glass abstract card artwork</title>
<defs>
 <linearGradient id="base" x1=".12" y1="1" x2=".88" y2="0" gradientUnits="objectBoundingBox"><stop stop-color="{deep}"/><stop offset=".48" stop-color="{body}"/><stop offset="1" stop-color="{light}"/></linearGradient>
 <radialGradient id="light" cx=".8" cy=".12" r=".88"><stop stop-color="{glint}" stop-opacity=".4"/><stop offset=".57" stop-color="{light}" stop-opacity=".04"/><stop offset="1" stop-color="{deep}" stop-opacity=".3"/></radialGradient>
 <linearGradient id="lens" x1=".2" y1="0" x2=".8" y2="1"><stop stop-color="{glint}" stop-opacity=".08"/><stop offset=".38" stop-color="{glint}" stop-opacity=".32"/><stop offset=".66" stop-color="{body}" stop-opacity=".05"/><stop offset="1" stop-color="{deep}" stop-opacity=".36"/></linearGradient>
 <linearGradient id="rim" x1="0" y1="0" x2="1" y2="1"><stop stop-color="{glint}" stop-opacity=".06"/><stop offset=".37" stop-color="#fff" stop-opacity=".26"/><stop offset=".65" stop-color="{glint}" stop-opacity=".14"/><stop offset="1" stop-color="{deep}" stop-opacity=".12"/></linearGradient>
 <linearGradient id="ribbon" x1=".15" y1=".1" x2=".84" y2=".9"><stop stop-color="{glint}" stop-opacity=".5"/><stop offset=".31" stop-color="{light}" stop-opacity=".38"/><stop offset=".6" stop-color="{body}" stop-opacity=".16"/><stop offset="1" stop-color="{deep}" stop-opacity=".52"/></linearGradient>
 <linearGradient id="edge" x1=".1" y1="0" x2=".9" y2="1"><stop stop-color="{glint}" stop-opacity=".04"/><stop offset=".32" stop-color="#fff" stop-opacity=".30"/><stop offset=".68" stop-color="{glint}" stop-opacity=".2"/><stop offset="1" stop-color="{deep}" stop-opacity="0"/></linearGradient>
 <radialGradient id="bloom" cx=".48" cy=".45" r=".55"><stop stop-color="{glint}" stop-opacity=".3"/><stop offset="1" stop-color="{glint}" stop-opacity="0"/></radialGradient>
</defs>
<path fill="url(#base)" d="M0 0h1536v1536H0z"/><path fill="url(#light)" d="M0 0h1536v1536H0z"/>
<ellipse cx="981" cy="591" rx="663" ry="453" transform="rotate(-37 981 591)" fill="url(#lens)" stroke="url(#rim)" stroke-width="3"/>
<ellipse cx="1003" cy="552" rx="559" ry="354" transform="rotate(-37 1003 552)" fill="url(#bloom)"/>
<path d="M-160 1400C248 1250 379 1057 486 777C580 531 640 388 879 362C1113 337 1361 479 1700 612L1700 1050C1356 906 1176 714 950 733C729 750 722 1016 572 1262C438 1482 214 1610-160 1720Z" fill="url(#ribbon)"/>
<path d="M-160 1400C248 1250 379 1057 486 777C580 531 640 388 879 362C1113 337 1361 479 1700 612" fill="none" stroke="url(#edge)" stroke-width="14"/>
<path d="M-90 1425C280 1281 412 1054 517 789C615 541 658 426 884 401C1090 378 1332 499 1650 628" fill="none" stroke="{glint}" stroke-opacity=".1" stroke-width="24"/>
<path d="M-60 1531C354 1422 527 1249 637 1023C718 855 739 749 950 733C1176 714 1356 906 1700 1050" fill="none" stroke="{deep}" stroke-opacity=".09" stroke-width="8"/>
<ellipse cx="763" cy="489" rx="247" ry="80" transform="rotate(-32 763 489)" fill="url(#bloom)"/>
</svg>'''

def font(size):
 f=ImageFont.truetype(str(ROOT/'assets/manrope.ttf'),size)
 try:f.set_variation_by_name('Medium')
 except ValueError:pass
 return f
def board(cards,columns,cell_w,cell_h,title,path):
 rows=(len(cards)+columns-1)//columns;out=Image.new('RGB',(columns*cell_w+64,rows*cell_h+120),'#eceff1');d=ImageDraw.Draw(out);d.text((32,24),title,font=font(26),fill='#263943')
 for i,(p,label) in enumerate(cards):
  x=32+(i%columns)*cell_w;y=91+(i//columns)*cell_h
  im=Image.open(p).convert('RGBA');im.thumbnail((cell_w-24,cell_h-52),Image.Resampling.LANCZOS)
  out.paste(im,(x+(cell_w-24-im.width)//2,y),im);d.text((x,y+cell_h-40),label,font=font(14),fill='#263943')
 out.save(path,optimize=True)

def review_sheets(presets):
 # One shared logical block unit; Mini must be physically smaller than Card.
 cw,ch,u=218,225,24;out=Image.new('RGB',(7*cw+64,7*ch+125),'#eceff1');draw=ImageDraw.Draw(out)
 draw.text((32,22),'Seven masters × seven footprints · shared 24px block unit',font=font(24),fill='#263943')
 for row,p in enumerate(COLORS):
  master=Image.open(ROOT/'masters/png'/f'{p[0]}.png').convert('RGB')
  for col,s in enumerate(presets):
   w,h=[round((s[a]-.2)*u) for a in ['w','h']];im=ImageOps.fit(master,(w,h),method=Image.Resampling.LANCZOS,centering=(.5,.5)).convert('RGBA')
   mask=Image.new('L',(w*4,h*4));ImageDraw.Draw(mask).rounded_rectangle((0,0,w*4-1,h*4-1),radius=56,fill=255);im.putalpha(mask.resize((w,h),Image.Resampling.LANCZOS))
   x=32+col*cw;y=93+row*ch;out.paste(im,(x+(cw-20-w)//2,y),im)
   draw.text((x,y+ch-49),p[1],font=font(12),fill='#263943');draw.text((x,y+ch-29),s['label'],font=font(12),fill='#4c606c')
 out.save(ROOT/'sheets/all-49-crops.png',optimize=True)
 out=Image.new('RGB',(1120,650),'#eceff1');draw=ImageDraw.Draw(out);draw.text((32,22),'Actual rejected artwork / new Lagoon Glass',font=font(25),fill='#263943')
 for i,(old,id,label) in enumerate([('pink','blush-pink','Blush Pink'),('brown','warm-brown','Warm Brown'),('blue','sky-blue','Sky Blue')]):
  x=32+i*366
  for j,path in enumerate([ROOT/'assets/before'/f'A-{old}.png',ROOT/'masters/png'/f'{id}.png']):
   im=ImageOps.fit(Image.open(path).convert('RGB'),(326,214),method=Image.Resampling.LANCZOS,centering=(.5,.5)).convert('RGBA');mask=Image.new('L',im.size);ImageDraw.Draw(mask).rounded_rectangle((0,0,325,213),radius=14,fill=255);im.putalpha(mask);y=105+j*260
   draw.text((x,y-24),'BEFORE · rejected A-series' if j==0 else 'AFTER · '+label,font=font(13),fill='#4c606c');out.paste(im,(x,y),im)
 out.save(ROOT/'sheets/before-after.png',optimize=True)

def build():
 for p in ['assets','masters/svg','masters/png','previews/faces','previews/crops','assets/before','sheets','gallery','folders/gallery','folders/assets/cards','folders/assets/shells','.tools/inkscape-profile']: (ROOT/p).mkdir(parents=True,exist_ok=True)
 for f in ['manrope.ttf','OFL-manrope.txt']:
  shutil.copy2(APP/'assets/fonts/lagoon'/f,ROOT/'assets'/f)
  shutil.copy2(APP/'assets/fonts/lagoon'/f,ROOT/'folders/assets'/f)
 # Resolve production definitions directly, without importing/mutating app modules.
 source=(APP/'src/lib/card-size-presets.ts').read_text(encoding='utf-8')
 presets=[{'id':id,'label':label,'w':int(w),'h':int(h)} for id,label,w,h in re.findall(r"id: '([^']+)', label: '([^']+)', orientation: '[^']+', ratioWidth: (\d+), ratioHeight: (\d+)",source)]
 assert len(presets)==7
 env=os.environ.copy();env['INKSCAPE_PROFILE_DIR']=str(ROOT/'.tools/inkscape-profile')
 colors=[];asset_report=[]
 for p in COLORS:
  id,name,deep,body,light,glint=p;svg=ROOT/'masters/svg'/f'{id}.svg';png=ROOT/'masters/png'/f'{id}.png';svg.write_text(artwork(p),encoding='utf-8')
  done=subprocess.run([str(INK),str(svg),'--export-area-page',f'--export-filename={png}'],capture_output=True,text=True,encoding='utf-8',errors='replace',env=env)
  if done.returncode:raise RuntimeError(done.stderr)
  im=Image.open(png).convert('RGBA');assert im.size==(1536,1536) and im.getchannel('A').getextrema()==(255,255)
  preview=im.convert('RGB');preview.thumbnail((640,640),Image.Resampling.LANCZOS);preview.save(ROOT/'previews/faces'/f'{id}.webp',lossless=True,method=6);shutil.copy2(ROOT/'previews/faces'/f'{id}.webp',ROOT/'folders/assets/cards'/f'{id}.webp')
  for preset in presets:
   size=tuple(round((preset[a]-.2)*64) for a in ['w','h']);crop=ImageOps.fit(im,size,method=Image.Resampling.LANCZOS,centering=(.5,.5))
   mask=Image.new('L',(size[0]*4,size[1]*4));ImageDraw.Draw(mask).rounded_rectangle((0,0,mask.width-1,mask.height-1),radius=112,fill=255);crop.putalpha(mask.resize(size,Image.Resampling.LANCZOS));crop.save(ROOT/'previews/crops'/f'{id}-{preset["id"]}.png',optimize=True)
  colors.append({'id':id,'name':name,'deep':deep,'body':body,'light':light,'glint':glint})
  asset_report.append({'id':id,'masterSize':[1536,1536],'opaqueBackgroundIntentional':True,'embeddedTextOrLogo':False,'masterBytes':png.stat().st_size,'sha256':hashlib.sha256(png.read_bytes()).hexdigest()});print('Exported '+name,flush=True)
 # Preserve the rejected source exactly as comparison evidence; never recreate a fake before.
 for color in ['pink','brown','blue']:shutil.copy2(APP/'design-previews/card-face-and-group-frame/masters'/f'A-{color}.png',ROOT/'assets/before'/f'A-{color}.png')
 old=APP/'design-previews/lagoon-glass-group-folder'
 for p in (old/'assets/shells').glob('*.svg'):shutil.copy2(p,ROOT/'folders/assets/shells'/p.name)
 for f in ['index.html','style.css','prototype.js']:shutil.copy2(old/'gallery'/f,ROOT/'folders/gallery'/f)
 index=ROOT/'folders/gallery/index.html';index.write_text(index.read_text(encoding='utf-8').replace('<script src="prototype.js"></script>','<script src="prototype.js"></script><script src="combined.js"></script>'),encoding='utf-8')
 # Existing shell layout/interaction reused without redesign. Only local sample art changes.
 data=json.loads((old/'fixtures.json').read_text(encoding='utf-8'));data['cards']=[]
 data['faceCollection']=colors
 (ROOT/'folders/gallery/data.js').write_text('window.LAGOON_FOLDER_DATA='+json.dumps(data)+';\n'+'''(()=>{const d=window.LAGOON_FOLDER_DATA;const start=Math.max(0,d.faceCollection.findIndex(c=>c.id===new URLSearchParams(location.search).get('face')));const sizes=[[6,4],[4,6],[7,3],[2,3],[5,7],[8,4]];d.cards=sizes.map(([w,h],i)=>{const c=d.faceCollection[(start+i)%7];return {id:'fictional-card-'+i,name:c.name+' Club',w,h,image:'cards/'+c.id+'.webp',kind:'default-artwork'};});})();''',encoding='utf-8')
 fixtures={'version':'design-review-0.1','colors':colors,'presets':presets,'inset':.1,'cornerRadiusDp':14,'masterSize':1536}
 (ROOT/'fixtures.json').write_text(json.dumps(fixtures,indent=2),encoding='utf-8');(ROOT/'gallery/data.js').write_text('window.CARD_FACE_REVIEW='+json.dumps(fixtures)+';',encoding='utf-8')
 board([(ROOT/'previews/crops'/f'{p[0]}-card-landscape.png',p[1]) for p in COLORS],4,280,220,'Lagoon Glass — seven color expressions',ROOT/'sheets/seven-color-overview.png')
 review_sheets(presets)
 (ROOT/'ASSET-VALIDATION.json').write_text(json.dumps({'productionPresetSource':'src/lib/card-size-presets.ts','masterCount':7,'cropCount':49,'crop':'centered uniform cover, zoom 1','rasterCropUnit':64,'displayUnit':32,'cornerRadiusRaster':28,'assets':asset_report},indent=2),encoding='utf-8')
 print('Completed seven masters and 49 cover crops.',flush=True)

if __name__=='__main__':build()
