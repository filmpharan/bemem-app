"""New collection production using the installed Illustrator pipeline functions unchanged."""
from pathlib import Path
import importlib.util, json, shutil, hashlib, struct, tempfile, sys
from PIL import Image, ImageDraw, ImageFont
ROOT=Path(__file__).resolve().parent
PROJECT=ROOT.parents[1]
OLD=PROJECT/'artwork-trials/illustrator-v2-first-trial-2026-11-09'
SOURCE=ROOT/'artwork-source'; ORIGINALS=ROOT/'artist-originals'; REVIEW=ROOT/'review'
for p in [SOURCE,ORIGINALS,REVIEW/'png']:p.mkdir(parents=True,exist_ok=True)
spec=importlib.util.spec_from_file_location('illustrator',PROJECT/'.agents/skills/bemem-illustrator/scripts/prepare_assets.py')
pipeline=importlib.util.module_from_spec(spec);spec.loader.exec_module(pipeline)
inkscape=str(PROJECT/'.artwork-tools/inkscape-1.4.2/bin/inkscape.com')
provenance=json.loads((ROOT/'provenance.json').read_text(encoding='utf-8'))
for source in provenance['sources']:
    dst=ORIGINALS/(source['id']+'.png')
    if not dst.exists():shutil.copyfile(source['path'],dst)
    with Image.open(dst) as image:
        assert image.format=='PNG' and image.mode=='RGBA' and image.getchannel('A').getextrema()==(0,255)
        bounds=image.getchannel('A').getbbox(); crop=image.crop(bounds)
        ratio=614/max(crop.size); size=tuple(round(x*ratio) for x in crop.size)
        normalized=Image.new('RGBA',(768,768))
        normalized.alpha_composite(crop.resize(size,Image.Resampling.LANCZOS),((768-size[0])//2,(768-size[1])//2))
        normalized.save(SOURCE/(source['id']+'.png'),optimize=True)
paths={'straight':'M0 48H12C26 48 25 45 40 46C57 47 57 50 73 49C80 48 80 48 84 48H96',
       'corner':'M0 48H12C31.88 48 48 64.12 48 84V96',
       'end':'M0 48H12C32 48 42 44 56 47C64 49 68 49 74 46'}
def bean(x,y):
    return f'<g transform="translate({x} {y}) rotate(25)"><ellipse rx="6" ry="9" fill="#c2a18a" stroke="#8a6653" stroke-width="1.7"/><path d="M0 -7Q-4 0 0 7" fill="none" stroke="#8a6653" stroke-width="1.3"/></g>'
def coin(x,y):
    return f'<circle cx="{x}" cy="{y}" r="6" fill="#ebcb91" stroke="#8a6653" stroke-width="1.7"/><path d="M{x-2} {y}h4" stroke="#b79565" stroke-width="1.4"/>'
def bow(x,y):
    return f'<g transform="translate({x} {y})"><path d="M0 0C-20 -20 -22 10 0 2C20 12 22 -20 0 0ZM-2 3L-7 13L0 10L6 13L3 3" fill="#e8b6ae" stroke="#8a6653" stroke-width="1.8" stroke-linejoin="round"/><ellipse rx="3" ry="4" fill="#ebcb91" stroke="#8a6653" stroke-width="1.5"/></g>'
family_names={'coffee':'Café Day','ribbon':'Shopping & Gifts','savings':'Little Savings'}
roster=[]
for family,name in family_names.items():
    for piece in ['straight','corner','end','accent']:
        asset=family+'-'+piece
        inner={'coffee':'#9fbaa7','ribbon':'#e8b6ae','savings':'#ebcb91'}[family]
        outer_width,inner_width=(6,4) if family=='ribbon' else (4,2)
        draw={'coffee':bean,'ribbon':bow,'savings':coin}[family]
        body=''
        if piece!='accent':
            path=paths[piece]
            body=f'<path d="{path}" fill="none" stroke="#8a6653" stroke-width="{outer_width}" stroke-linecap="butt"/><path d="{path}" fill="none" stroke="{inner}" stroke-width="{inner_width}" stroke-linecap="butt"/>'
            body+=draw(34,36)
            if piece=='straight':body+=draw(67,60)
            if piece=='end':body+=draw(74,46)
        else:
            body=f'<g transform="translate(-24 -24) scale(1.5)">{draw(48,48)}</g>'
        (SOURCE/(asset+'.svg')).write_text(f'<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><title>bemem original {asset}</title>{body}</svg>',encoding='utf-8')
        roster.append((asset,name,True,{'straight':('W','E'),'corner':('W','S'),'end':('W',),'accent':()}[piece]))
for source in provenance['sources']:
    family='coffee' if source['id'].startswith('cafe') else 'ribbon' if source['id'].startswith('shopping') else 'savings'
    roster.append((source['id'],family_names[family],True,()))
entries=[];images={}
with tempfile.TemporaryDirectory(prefix='bemem-expansion-') as tmp:
    for asset,name,rotate,edges in roster:
        src=SOURCE/(asset+('.svg' if asset.split('-')[-1] in ['straight','corner','end','accent'] else '.png'))
        image=pipeline.read_and_normalize(src,inkscape,Path(tmp))
        for side in edges:assert pipeline.edge_anchor_alpha(image,side)>=128
        target=REVIEW/'png'/(asset+'.png');image.save(target,optimize=True,compress_level=9)
        images[asset]=image
        entries.append({'id':asset,'collection':name,'source':str(src.relative_to(ROOT)),'png':str(target.relative_to(ROOT)).replace('\\','/'),
            'format':'PNG','size':[192,192],'mode':'RGBA','connectors':edges,'rotatable':rotate,'bytes':target.stat().st_size,
            'sha256':hashlib.sha256(target.read_bytes()).hexdigest()})
# Same seam/alpha tests as the approved trial, applied to each independent new family.
turn={'N':'E','E':'S','S':'W','W':'N'}
def rot(im,k):
    for _ in range(k):im=im.transpose(Image.Transpose.ROTATE_270)
    return im
def edge(im,side):
    return [im.getpixel({'N':(i,0),'S':(i,191),'W':(0,i),'E':(191,i)}[side]) for i in range(192)]
seams=[]
for family in family_names:
    variants=[]
    for piece,sides in [('straight',{'W','E'}),('corner',{'W','S'}),('end',{'W'})]:
        for k in range(4):
            sides_k=sides.copy()
            for _ in range(k):sides_k={turn[s] for s in sides_k}
            im=rot(images[family+'-'+piece],k)
            for side in turn:
                coverage=[i for i,p in enumerate(edge(im,side)) if p[3]]
                assert (len(coverage)>0)==(side in sides_k),(family,piece,k,side,coverage)
            variants.append((piece,k,im,sides_k))
    for side,opposite in [('E','W'),('S','N')]:
        for p,k,im,ss in variants:
            if side not in ss:continue
            for p2,k2,im2,ss2 in variants:
                if opposite not in ss2:continue
                a,b=edge(im,side),edge(im2,opposite)
                alpha=max(abs(x[3]-y[3]) for x,y in zip(a,b))
                rgb=max(abs(x[c]-y[c]) for x,y in zip(a,b) for c in range(3))
                assert alpha==0 and rgb<=2,(family,p,k,p2,k2,alpha,rgb)
                seams.append({'family':family,'from':[p,k*90,side],'to':[p2,k2*90,opposite],'alphaDifference':alpha,'rgbDifference':rgb})
assert len(seams)==150
assets_dir=PROJECT/'assets/decorations/cozy-cute-v1';assets_dir.mkdir(parents=True,exist_ok=True)
approved=json.loads((OLD/'review/asset-manifest.json').read_text(encoding='utf-8'))['assets']
for asset in approved:
    src=OLD/'review'/asset['png']
    assert hashlib.sha256(src.read_bytes()).hexdigest()==asset['sha256']
    shutil.copyfile(src,assets_dir/src.name)
for asset in entries:shutil.copyfile(ROOT/asset['png'],assets_dir/(asset['id']+'.png'))
font=lambda n:ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf',n)
ordered=sorted(entries,key=lambda a:(list(family_names.values()).index(a['collection']),a['id']))
sheet=Image.new('RGBA',(1120,1690),'#f7f3ed');d=ImageDraw.Draw(sheet)
d.text((24,18),'bemem / Cozy Cute / new collections',font=font(28),fill='#725a50')
d.text((24,60),'21 trial assets: 9 AI illustrations + 12 original SVG frame pieces. Awaiting visual approval.',font=font(16),fill='#725a50')
for i,a in enumerate(ordered):
    x=22+(i%4)*278;y=110+(i//4)*255
    d.rounded_rectangle((x,y,x+260,y+237),18,fill='white')
    sheet.alpha_composite(images[a['id']].resize((140,140),Image.Resampling.LANCZOS),(x+60,y+4))
    d.text((x+10,y+149),a['id'],font=font(17),fill='#725a50')
    for j,size in enumerate([24,28,32]):sheet.alpha_composite(images[a['id']].resize((size,size),Image.Resampling.LANCZOS),(x+20+j*46,y+189))
    d.rounded_rectangle((x+176,y+182,x+246,y+228),8,fill='#303833')
    sheet.alpha_composite(images[a['id']].resize((28,28),Image.Resampling.LANCZOS),(x+196,y+191))
sheet.convert('RGB').save(REVIEW/'contact-sheet.png',optimize=True)
actual=Image.new('RGBA',(950,2180),'#f7f3ed');d=ImageDraw.Draw(actual)
d.text((24,18),'1 x 1 samples / 24, 28, 32 px and 28px at 3x',font=font(25),fill='#725a50')
d.text((24,60),'Simulation from the existing 12-column grid; native Samsung scale is not verified.',font=font(16),fill='#725a50')
for i,a in enumerate(ordered):
    y=110+i*96;d.text((24,y+18),a['id'],font=font(17),fill='#725a50')
    for x,size in [(310,24),(400,28),(490,32)]:actual.alpha_composite(images[a['id']].resize((size,size),Image.Resampling.LANCZOS),(x,y+15))
    small=images[a['id']].resize((28,28),Image.Resampling.LANCZOS)
    actual.alpha_composite(small.resize((84,84),Image.Resampling.NEAREST),(720,y))
actual.convert('RGB').save(REVIEW/'actual-size-preview.png',optimize=True)
frames=Image.new('RGBA',(1080,1180),'#f7f3ed');d=ImageDraw.Draw(frames)
d.text((24,18),'New frame families / closed frames, L paths, end caps',font=font(24),fill='#725a50')
for index,family in enumerate(family_names):
    y=80+index*360;d.text((24,y),family_names[family],font=font(21),fill='#725a50')
    configs=[(4,3,[(0,0,'corner',3),(3,0,'corner',0),(3,2,'corner',1),(0,2,'corner',2)]+[(x,r,'straight',0) for x in [1,2] for r in [0,2]]+[(x,1,'straight',1) for x in [0,3]]),
      (3,2,[(0,0,'end',2),(1,0,'straight',0),(2,0,'corner',0),(2,1,'corner',1),(1,1,'end',2)]),
      (3,1,[(0,0,'end',2),(1,0,'straight',0),(2,0,'end',0)])]
    for col,(w,h,cells) in enumerate(configs):
        full=Image.new('RGBA',(w*192,h*192))
        for x,r,p,k in cells:full.alpha_composite(rot(images[family+'-'+p],k),(x*192,r*192))
        frames.alpha_composite(full.resize((w*62,h*62),Image.Resampling.LANCZOS),(24+col*350,y+45))
        frames.alpha_composite(full.resize((w*28,h*28),Image.Resampling.LANCZOS),(24+col*350,y+245))
frames.convert('RGB').save(REVIEW/'frame-connections.png',optimize=True)
for file in assets_dir.glob('*.png'):
    raw=file.read_bytes();assert struct.unpack('>IIBB',raw[16:26])==(192,192,8,6)
    with Image.open(file) as im:im.load();assert im.mode=='RGBA' and im.getchannel('A').getextrema()==(0,255)
(REVIEW/'asset-manifest.json').write_text(json.dumps({'status':'Trial assets integrated for user testing; not commercially finalized','assets':entries},indent=2,ensure_ascii=False),encoding='utf-8')
(REVIEW/'validation.json').write_text(json.dumps({'passed':True,'newAssets':21,'allAssets':34,'newFrameSeamChecks':150,'seams':seams,
    'approved13HashesUnchanged':True,'pngBytes':sum(p.stat().st_size for p in assets_dir.glob('*.png')),'samsungVerified':False},indent=2),encoding='utf-8')
cards=''.join(f'<article><img width="120" height="120" src="{a["png"]}"><p>{a["id"]}</p><a href="{a["source"]}">Source</a></article>' for a in ordered)
(ROOT/'index.html').write_text('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>bemem new artwork trial</title><style>body{background:#f7f3ed;color:#725a50;font:16px system-ui;margin:24px}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:16px}article{background:white;border-radius:18px;padding:16px}img{object-fit:contain}.board{max-width:100%;height:auto}</style><h1>bemem Cozy Cute / 21 new trial assets</h1><p>AI raster illustrations and code-authored SVG frames. Not human hand painted. New art awaits visual approval.</p><main>'+cards+'</main><h2>24–32px size review</h2><img class="board" src="review/actual-size-preview.png"><h2>Joined frames</h2><img class="board" src="review/frame-connections.png">',encoding='utf-8')
registry="import type { DecorationAssetId } from '../lib/decoration-catalog';\n/** Metro requires are explicit literals, offline and stable. */\nexport const decorationImages: Record<DecorationAssetId, number> = {\n"
for file in sorted(assets_dir.glob('*.png')):registry+=f"  '{file.stem}': require('../../assets/decorations/cozy-cute-v1/{file.name}'),\n"
registry+='};\n'
(PROJECT/'src/constants/decoration-images.ts').write_text(registry,encoding='utf-8')
print(json.dumps({'newAssets':len(entries),'seams':len(seams),'pngBytes':sum(p.stat().st_size for p in assets_dir.glob('*.png'))}))
