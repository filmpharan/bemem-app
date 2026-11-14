"""Dedicated reference/before/after sheets and offline fixed-drawer preview."""
from pathlib import Path
import json,re
from PIL import Image,ImageDraw,ImageFont
ROOT=Path(__file__).resolve().parent;PROJECT=ROOT.parents[1]
PREVIOUS=PROJECT/'artwork-trials/cozy-cute-270-2026-11-11'
# Reuse the existing review generator with this trial root; leave its old files intact.
exec(compile((PREVIOUS/'build_preview.py').read_text(encoding='utf-8'),str(ROOT/'inherited-preview.py'),'exec'),{'__file__':str(ROOT/'inherited-preview.py'),'__name__':'__review__'})
assets=json.loads((ROOT/'review/manifest.json').read_text())['assets']
font=ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf',14)
title=ImageFont.truetype('C:/Windows/Fonts/segoeuib.ttf',21)
families=[('pets','pet-accent-06','Rope'),('wellness','wellness-accent-02','Leaf'),('savings','savings-accent-07','Chain')]
stats=[];comparisons=[]
for family,reference,label in families:
 group=[a for a in assets if a['collection']==family]
 proof_path=ROOT/'review'/(family+'-connections.png')
 previous=Image.open(proof_path).convert('RGB').crop((0,0,1100,480))
 extended=Image.new('RGB',(1100,730),'#f3f1ec');extended.paste(previous,(0,0));ed=ImageDraw.Draw(extended)
 ed.text((20,480),'Continuous border: end / straight / short-detail / long-detail / end',font=font,fill='#725a50')
 sequence=[(2,180),(0,0),(5,0),(6,0),(2,0)]
 for col,(index,angle) in enumerate(sequence):
  im=Image.open(ROOT/group[index]['png']).rotate(-angle).resize((144,144),Image.Resampling.LANCZOS)
  extended.paste(im,(20+col*144,510),im)
  tiny=Image.open(ROOT/group[index]['png']).rotate(-angle).resize((28,28),Image.Resampling.LANCZOS)
  extended.paste(tiny,(20+col*28,680),tiny)
 extended.save(proof_path)
 sheet=Image.new('RGB',(1100,850),'#f6f3ed');d=ImageDraw.Draw(sheet)
 ref=Image.open(PROJECT/'assets/decorations/cozy-cute-v2'/(reference+'.png')).convert('RGBA')
 sheet.paste(ref,(15,25),ref)
 d.text((220,30),label+' / original reference + 10 replacement pieces',font=title,fill='#725a50')
 d.text((220,70),reference+' (original unchanged)',font=font,fill='#725a50')
 d.text((220,105),'Before and after use the SAME tile size. No runtime paint enlargement.',font=font,fill='#725a50')
 d.text((220,140),'Editable SVG geometry; rendered with Inkscape and Pillow.',font=font,fill='#725a50')
 for i,a in enumerate([a for a in assets if a['collection']==family]):
  x=10+(i%5)*218;y=235+(i//5)*292
  before=Image.open(ROOT/'before/png'/(a['id']+'.png')).convert('RGBA')
  after=Image.open(ROOT/a['png']).convert('RGBA')
  for image,xx,text in [(before,x,'Before'),(after,x+107,'After')]:
   im=image.resize((96,96),Image.Resampling.LANCZOS);sheet.paste(im,(xx,y),im)
   d.text((xx,y+98),text,font=font,fill='#725a50')
  # Dark miniature after; alongside exact24/28/32px samples.
  d.rectangle((x,y+132,x+202,y+225),fill='#26313a')
  for j,size in enumerate([24,28,32]):
   im=after.resize((size,size),Image.Resampling.LANCZOS);xx=x+12+j*61
   sheet.paste(im,(xx,y+151),im);d.text((xx,y+195),str(size)+'px',font=font,fill='#f4eadb')
  d.text((x,y+235),a['id'].split('-',2)[-1],font=font,fill='#725a50')
  def coverage(im):return sum(n for alpha,n in enumerate(im.getchannel('A').histogram()) if alpha>32)
  old,new=coverage(before),coverage(after)
  stats.append({'id':a['id'],'beforePaintPixels':old,'afterPaintPixels':new,'paintAreaRatio':round(new/old,3)})
 file=ROOT/'review'/(family+'-comparison.png');sheet.save(file);comparisons.append(sheet)
combined=Image.new('RGB',(1100,2550),'#f6f3ed')
for i,sheet in enumerate(comparisons):combined.paste(sheet,(0,i*850))
combined.save(ROOT/'review/before-after.png')
proofs=[Image.open(ROOT/'review'/(id+'-connections.png')).convert('RGB') for id,_,_ in families]
joined=Image.new('RGB',(1100,2190),'#f3f1ec')
for i,proof in enumerate(proofs):joined.paste(proof,(0,i*730))
joined.save(ROOT/'review/frame-connections.png')
(ROOT/'review/visual-weight.json').write_text(json.dumps(stats,indent=2),encoding='utf-8')

html=(ROOT/'index.html').read_text(encoding='utf-8')
html=html.replace('bemem · 270 artwork review','bemem · chunky frame review').replace('bemem · 270 Cozy Cute assets','bemem · chunky frame refinement')
html=html.replace('30 new modular frames + icon-only collection selector.','30 replacement modular frames + fixed decoration drawer. Approved selector unchanged.')
html=html.replace('<div class="status" id="status" aria-live="polite"></div>','')
html=re.sub(r"document.getElementById\('status'\).textContent=.*?;measure\(\)","grid.setAttribute('aria-label',group.name+' page '+(page+1)+' of '+all.length);measure()",html)
links=''.join('<p><a href="review/'+id+'-comparison.png">'+label+' · original reference / before / after / actual-size</a></p><img class="proof" src="review/'+id+'-comparison.png" alt="'+label+' reference and before-after comparison">' for id,_,label in families)
html=html.replace('<div id="reviews"></div>','<section><h2>Reference parity and visual weight</h2>'+links+'</section><div id="reviews"></div>')
(ROOT/'index.html').write_text(html,encoding='utf-8')
print(json.dumps({'replacementImages':len(stats),'minPaintAreaRatio':min(a['paintAreaRatio'] for a in stats),'maxPaintAreaRatio':max(a['paintAreaRatio'] for a in stats)}))
