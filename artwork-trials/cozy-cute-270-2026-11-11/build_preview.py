"""Offline review only; reads manifests, never imports native application/storage."""
from pathlib import Path
import json,re
from PIL import Image,ImageDraw,ImageFont
ROOT=Path(__file__).resolve().parent;PROJECT=ROOT.parents[1]
old=json.loads((PROJECT/'artwork-trials/cozy-cute-240-2026-11-11/review/manifest.json').read_text())['assets']
new=json.loads((ROOT/'review/manifest.json').read_text())['assets']
all_by_id={a['id']:a for a in old+new}
text=(PROJECT/'src/lib/decoration-catalog.ts').read_text(encoding='utf-8')
symbols={'pets':'pet-paw','travel':'travel-suitcase','wellness':'wellness-flower','cafe':'cafe-coffee','shopping':'shopping-bag','savings':'savings-piggy'}
library=[]
for match in re.finditer(r'\{"id": "([^"]+)", "name": "([^"]+)", "assets": (\[[^\]]+\])\}',text):
 id,name,raw=match.groups();name=json.loads('"'+name+'"');items=[]
 for aid in json.loads(raw):
  a=all_by_id[aid]
  items.append({'id':aid,'label':a['label'],'png':a['png'] if a in new else '../../'+a['runtimePath'],'scale':a['paintScale']})
 library.append({'id':id,'name':name,'assets':items,'symbol':'../../'+all_by_id[symbols[id]]['runtimePath']})
assert len(library)==6 and sum(len(g['assets']) for g in library)==270
html='''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>bemem · 270 artwork review</title>
<style>*{box-sizing:border-box}body{margin:0;background:#eeeff1;color:#34444e;font:15px system-ui}main{max-width:1100px;margin:auto;padding:18px}a{color:inherit}h1{font-size:23px}.phone{width:min(100%,390px);margin:20px auto;background:#f7f7fa;border-radius:24px;overflow:hidden;border:1px solid #d5dadf}.canvas{height:130px;padding:20px;background-image:radial-gradient(#c8ced4 .8px,transparent .8px);background-size:28px 28px}.mock-card{background:#aac3b5;color:#344a42;border-radius:14px;width:150px;height:90px;padding:15px}.toolbar{display:flex;gap:4px;padding:8px 12px}.toolbar span{flex:1;text-align:center;border-radius:14px;background:#fff;padding:10px 2px;border:1px solid #ccd1d8}.toolbar span:last-child{background:#405764;color:#fff}.selector{display:flex;padding:0 8px}.selector button{flex:1;aspect-ratio:1;padding:0;border:0;background:transparent;min-width:0;display:grid;place-items:center;cursor:pointer;opacity:.48}.selector button[aria-pressed=true]{opacity:1}.selector img{width:calc(100% - 4px);max-width:56px;aspect-ratio:1;object-fit:contain;transform:scale(1.2)}button:focus-visible{outline:2px solid #405764;outline-offset:-3px}.grid{display:grid;grid-template-columns:repeat(8,minmax(0,1fr));gap:2px;padding:8px}.cell{min-width:0;height:var(--row);border-radius:10px;border:1px solid #d8dce2;background:transparent;padding:0;display:grid;place-items:center;cursor:pointer}.paint{width:var(--unit);height:var(--unit);overflow:hidden}.paint img{width:100%;height:100%;object-fit:contain;transform:scale(var(--paint))}.nav{border:2px solid #7d8d98;font-size:22px;font-weight:700}.blank{pointer-events:none}.status{font-size:12px;padding:4px 12px 10px;min-height:38px}.review{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px}.review figure{margin:0;padding:10px;background:#faf9f6;border-radius:12px;overflow-wrap:anywhere}.review img{width:100%;aspect-ratio:1;object-fit:contain}.review figcaption{font-size:12px}.proof{width:100%;height:auto}.links{display:flex;gap:18px;flex-wrap:wrap}section{padding-top:12px;border-top:1px solid #d4d9de;margin-top:24px}p{line-height:1.5}button{color:inherit}</style>
<main><h1>bemem · 270 Cozy Cute assets</h1><p>30 new modular frames + icon-only collection selector. Offline visual review; native drag, Save and touch behavior require Samsung testing. No wallet data is used here.</p><div class="links"><a href="review/validation.json">Validation data</a><a href="VALIDATION.md">Review notes</a><a href="../cozy-cute-240-2026-11-11/index.html">Original 240 gallery</a></div>
<div class="phone"><div class="canvas"><div class="mock-card">Test Member</div></div><div class="toolbar"><span>Cancel</span><span>Undo</span><span>Redo</span><span>Save</span></div><nav class="selector" aria-label="Artwork collections" id="selector"></nav><div class="grid" id="grid"></div><div class="status" id="status" aria-live="polite"></div></div><p id="selection" aria-live="polite">Select a thumbnail to inspect its stable ID. This preview does not place or save artwork.</p><div id="reviews"></div></main>
<script>const library=LIBRARY;let collection=0,page=0;
function pages(assets){const result=[];let cursor=0;do{const previous=result.length>0;const capacity=24-(previous?1:0),next=assets.length-cursor>capacity,count=capacity-(next?1:0),cells=previous?[{nav:'previous'}]:[];cells.push(...assets.slice(cursor,cursor+count));cursor+=count;if(next)cells.push({nav:'next'});while(cells.length<24)cells.push({empty:true});result.push(cells)}while(cursor<assets.length);return result}
const grid=document.getElementById('grid'),selector=document.getElementById('selector');
library.forEach((group,i)=>{const b=document.createElement('button');b.setAttribute('aria-label',group.name);b.setAttribute('title',group.name);const img=document.createElement('img');img.src=group.symbol;img.alt='';b.append(img);b.onclick=()=>{collection=i;page=0;render()};selector.append(b)});
function measure(){const width=grid.getBoundingClientRect().width,unit=(width-32)/12;grid.style.setProperty('--unit',unit+'px');grid.style.setProperty('--row',Math.max(32,Math.min((width-30)/8,unit+4))+'px')}
function render(){grid.replaceChildren();const group=library[collection],all=pages(group.assets);[...selector.children].forEach((b,i)=>b.setAttribute('aria-pressed',i===collection?'true':'false'));for(const cell of all[page]){const b=document.createElement(cell.empty?'div':'button');b.className='cell';if(cell.nav){b.classList.add('nav');b.textContent=cell.nav==='next'?'›':'‹';b.setAttribute('aria-label',cell.nav==='next'?'Next artwork page':'Previous artwork page');b.onclick=()=>{page+=cell.nav==='next'?1:-1;render()}}else if(cell.empty){b.classList.add('blank');b.setAttribute('aria-hidden','true')}else{b.setAttribute('aria-label',cell.label);const paint=document.createElement('div');paint.className='paint';const img=document.createElement('img');img.src=cell.png;img.alt='';img.style.setProperty('--paint',cell.scale);paint.append(img);b.append(paint);b.onclick=()=>document.getElementById('selection').textContent=cell.id}grid.append(b)}document.getElementById('status').textContent=group.name+' · '+(page+1)+'/'+all.length+' · '+group.assets.length+' assets';measure()}
const newAssets=ADDITIONS;for(const id of ['pets','wellness','savings']){const section=document.createElement('section');const heading=document.createElement('h2');heading.textContent=library.find(g=>g.id===id).name+' · 10 new pieces';section.append(heading);const gallery=document.createElement('div');gallery.className='review';for(const a of newAssets.filter(a=>a.collection===id)){const figure=document.createElement('figure'),img=document.createElement('img'),caption=document.createElement('figcaption');img.src=a.png;img.alt=a.label;caption.textContent=a.id+' · '+a.connectors.join(' / ');figure.append(img,caption);gallery.append(figure)}section.append(gallery);for(const suffix of ['contact','actual-size','connections']){const a=document.createElement('a');a.href='review/'+id+'-'+suffix+'.png';const img=document.createElement('img');img.className='proof';img.src=a.href;img.alt=id+' '+suffix;a.append(img);section.append(a)}document.getElementById('reviews').append(section)}addEventListener('resize',measure);render();</script></html>'''
html=html.replace('LIBRARY',json.dumps(library,ensure_ascii=False)).replace('ADDITIONS',json.dumps(new))
(ROOT/'index.html').write_text(html,encoding='utf-8')
(ROOT/'preview-library.json').write_text(json.dumps(library,indent=2),encoding='utf-8')
for suffix,name in [('contact','contact-sheet'),('actual-size','actual-size'),('connections','frame-connections')]:
 sheets=[Image.open(ROOT/'review'/(id+'-'+suffix+'.png')).convert('RGB') for id in ['pets','wellness','savings']]
 combined=Image.new('RGB',(max(im.width for im in sheets),sum(im.height for im in sheets)),'#f3f1ec');y=0
 for im in sheets:combined.paste(im,(0,y));y+=im.height
 combined.save(ROOT/'review'/(name+'.png'))
# Check artwork contrast visually against dark as well as light surfaces.
font=ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf',14)
dark=Image.new('RGB',(1000,1050),'#26313a');draw=ImageDraw.Draw(dark)
for i,a in enumerate(new):
 x=10+(i%5)*198;y=10+(i//5)*172
 im=Image.open(ROOT/a['png']).resize((144,144),Image.Resampling.LANCZOS)
 dark.paste(im,(x,y),im);draw.text((x,y+144),a['label'],fill='#f3e8d8',font=font)
dark.save(ROOT/'review/contact-dark.png')
print('Offline gallery built: 6 collections, 270 assets, 30 new pieces')
