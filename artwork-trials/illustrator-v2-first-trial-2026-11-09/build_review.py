"""Supplementary artwork-only QA and review boards; no application imports or I/O."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import hashlib
import html
import json
import struct

ROOT = Path(__file__).resolve().parent
OUT = ROOT / 'review'
manifest = json.loads((OUT / 'asset-manifest.json').read_text(encoding='utf-8'))
assets = manifest['assets']
images = {a['id']: Image.open(OUT / a['png']).convert('RGBA') for a in assets}
FONT = Path('C:/Windows/Fonts/segoeui.ttf')
def font(size):
    return ImageFont.truetype(str(FONT), size) if FONT.exists() else ImageFont.load_default(size=size)
def label(canvas, xy, text, size=16, fill='#65574f'):
    ImageDraw.Draw(canvas).text(xy, text, font=font(size), fill=fill)
def place(canvas, image, xy, size):
    canvas.alpha_composite(image.resize((size, size), Image.Resampling.LANCZOS), xy)
def board(size, color='#f7f3ed'):
    return Image.new('RGBA', size, color)
def save(im, name):
    im.convert('RGB').save(OUT / name, optimize=True)

checks = []
for a in assets:
    file = OUT / a['png']
    raw = file.read_bytes()
    assert raw[:8] == b'\x89PNG\r\n\x1a\n'
    width, height, depth, color = struct.unpack('>IIBB', raw[16:26])
    with Image.open(file) as original:
        original.load()
        assert original.format == 'PNG' and original.mode == 'RGBA'
        assert original.size == (192, 192) and original.n_frames == 1
    assert (width, height, depth, color) == (192, 192, 8, 6)
    im = images[a['id']]
    alpha = im.getchannel('A')
    assert alpha.getextrema() == (0, 255)
    assert all(alpha.getpixel(p) == 0 for p in [(0,0),(191,0),(0,191),(191,191)])
    if not a['id'].startswith('vine-'):
        assert all(alpha.getpixel((x,y)) == 0 for x in range(192) for y in [0,191])
        assert all(alpha.getpixel((x,y)) == 0 for y in range(192) for x in [0,191])
    checks.append({'id': a['id'], 'format': 'PNG', 'size': [192,192], 'mode': 'RGBA',
                   'bitDepth': depth, 'animated': False, 'alphaExtrema': [0,255],
                   'transparentPixels': alpha.histogram()[0], 'visibleBounds': alpha.getbbox(),
                   'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()})

connectors = {'vine-straight': {'W','E'}, 'vine-corner': {'W','S'}, 'vine-end': {'W'}}
turn = {'N':'E','E':'S','S':'W','W':'N'}
variants = []
def rotated(name, clockwise):
    im = images[name]
    for _ in range(clockwise % 4):
        im = im.transpose(Image.Transpose.ROTATE_270)
    return im
def edge(im, side):
    return [im.getpixel({'W':(0,i),'E':(191,i),'N':(i,0),'S':(i,191)}[side]) for i in range(192)]
for name, sides in connectors.items():
    for k in range(4):
        im = rotated(name,k)
        expected = sides.copy()
        for _ in range(k): expected = {turn[s] for s in expected}
        for side in turn:
            indices = [i for i,p in enumerate(edge(im,side)) if p[3]]
            assert indices == (list(range(92,100)) if side in expected else []), (name,k,side,indices)
        variants.append((name,k,im,expected))
seams = []
for side, other in [('E','W'),('S','N')]:
    for n,k,im,sides in variants:
        if side not in sides: continue
        for n2,k2,im2,sides2 in variants:
            if other not in sides2: continue
            e1,e2 = edge(im,side),edge(im2,other)
            alpha_diff = max(abs(p[3]-q[3]) for p,q in zip(e1,e2))
            color_diff = max(abs(p[c]-q[c]) for p,q in zip(e1,e2) for c in range(3))
            assert alpha_diff == 0 and color_diff <= 2
            seams.append({'from': [n,k*90,side], 'to': [n2,k2*90,other],
                          'maxAlphaDifference': alpha_diff, 'maxRgbDifference': color_diff})
assert len(seams) == 50

# Every image uses the full square tile. No individual orientation copies exported.
def composite(cols, rows, cells):
    im = Image.new('RGBA',(cols*192,rows*192))
    for x,y,name,k in cells: im.alpha_composite(rotated(name,k),(x*192,y*192))
    return im
def frame(cols,rows):
    cells=[(0,0,'vine-corner',3),(cols-1,0,'vine-corner',0),
           (cols-1,rows-1,'vine-corner',1),(0,rows-1,'vine-corner',2)]
    for x in range(1,cols-1): cells += [(x,0,'vine-straight',0),(x,rows-1,'vine-straight',0)]
    for y in range(1,rows-1): cells += [(0,y,'vine-straight',1),(cols-1,y,'vine-straight',1)]
    return composite(cols,rows,cells)
layouts = [
    ('3 x 3 closed frame',3,3,frame(3,3)),
    ('5 x 4 closed frame',5,4,frame(5,4)),
    ('2 x 2 corner-to-corner',2,2,frame(2,2)),
    ('End - straight - end',3,1,composite(3,1,[(0,0,'vine-end',2),(1,0,'vine-straight',0),(2,0,'vine-end',0)])),
    ('Vertical end caps',1,3,composite(1,3,[(0,0,'vine-end',3),(0,1,'vine-straight',1),(0,2,'vine-end',1)])),
]
sheet=board((1060,1470))
label(sheet,(26,20),'bemem / Cozy Cute / first artwork trial',27)
label(sheet,(26,60),'9 AI illustrations + 4 original code-authored SVG pieces. Visual approval pending.',16)
for i,a in enumerate(assets):
    x=26+(i%4)*258;y=110+(i//4)*290
    ImageDraw.Draw(sheet).rounded_rectangle((x,y,x+240,y+250),18,fill='#ffffff')
    place(sheet,images[a['id']],(x+45,y+10),150)
    label(sheet,(x+10,y+165),a['id'],17)
    label(sheet,(x+10,y+190),a['collection'],14)
    ImageDraw.Draw(sheet).rounded_rectangle((x+126,y+204,x+228,y+244),8,fill='#303833')
    place(sheet,images[a['id']],(x+37,y+211),28)
    place(sheet,images[a['id']],(x+164,y+211),28)
label(sheet,(26,1290),'Alpha checked on light and dark backgrounds. Small samples: 28 px tiles.',17)
label(sheet,(26,1322),'Stickers retain soft AI tonal variation; frame vectors use flat fills.',17)
label(sheet,(26,1354),'Not human brush-painted; no Krita masters. Not integrated into the app.',17)
save(sheet,'collection-review.png')

actual=board((1050,1530))
label(actual,(24,18),'1 x 1 block-size simulation',27)
label(actual,(24,58),'Create: unit = (viewport width - 32 dp) / 12. No decoration inset.',16)
label(actual,(24,85),'24 / 28 / 32 px samples shown at 100%; browser and image viewer may scale them.',15)
for x,text in [(24,'Asset'),(290,'24 px'),(390,'28 px'),(490,'32 px'),(640,'28 px on dark'),(830,'28 px at 3x')]:
    label(actual,(x,130),text,16)
for i,a in enumerate(assets):
    y=171+i*96
    label(actual,(24,y+13),a['id'],17)
    for x,size in [(295,24),(395,28),(495,32)]:place(actual,images[a['id']],(x,y+12),size)
    ImageDraw.Draw(actual).rounded_rectangle((640,y+3,774,y+51),8,fill='#303833')
    place(actual,images[a['id']],(690,y+12),28)
    # This is a magnification of the downsampled tile, not a second detailed artwork.
    small=images[a['id']].resize((28,28),Image.Resampling.LANCZOS)
    actual.alpha_composite(small.resize((84,84),Image.Resampling.NEAREST),(850,y-10))
label(actual,(24,1486),'Simulation only. Samsung physical display, DPR, and visual charm remain for user review.',15)
save(actual,'actual-size-preview.png')

connections=board((1140,1510))
label(connections,(24,20),'Modular botanical frame / connection review',27)
label(connections,(24,60),'Full 192 px tiles composed edge-to-edge. 90-degree rotations use exact pixel transpose.',16)
for index,(title,cols,rows,im) in enumerate(layouts):
    x=28+(index%2)*555;y=112+(index//2)*390
    label(connections,(x,y),title,19)
    connections.alpha_composite(im.resize((cols*68,rows*68),Image.Resampling.LANCZOS),(x,y+37))
    small=im.resize((cols*28,rows*28),Image.Resampling.LANCZOS)
    ImageDraw.Draw(connections).rounded_rectangle((x+365,y+37,x+525,y+37+max(125,rows*28+12)),10,fill='#303833')
    connections.alpha_composite(small,(x+373,y+43))
    label(connections,(x+365,y+max(175,rows*28+65)),'28 px / tile',14)
label(connections,(28,1300),'All 12 orientations: straight / corner / end cap, each 0 / 90 / 180 / 270 degrees.',17)
for row,name in enumerate(connectors):
    label(connections,(28,1340+row*48),name,16)
    for k in range(4):place(connections,rotated(name,k),(225+k*205,1334+row*48),42)
save(connections,'frame-connections.png')

validation={'status':'TECHNICAL QA PASS / HUMAN VISUAL APPROVAL PENDING','assets':checks,
 'totalPngBytes':sum(a['bytes'] for a in checks), 'rotatedVariants':len(variants),'seamChecks':seams,
 'seamSummary':{'horizontalPairs':25,'verticalPairs':25,'maxAlphaDifference':0,
 'maxRgbDifference':max(s['maxRgbDifference'] for s in seams),
 'note':'At the corner south edge, SVG antialias rounding differs by at most 2/255 in RGB; alpha coverage, occupied pixels and centerline match exactly.'},
 'sourceUnit':'96 x 96 SVG viewBox; connectors N(48,0), E(96,48), S(48,96), W(0,48)',
 'deviceVerification':'NOT VERIFIED: no Samsung measurement/device access',
 'simulatedViewportDp':{str(w): (w-32)/12 for w in [320,360,390,412]},
 'productionIntegration':False}
(OUT/'validation.json').write_text(json.dumps(validation,indent=2)+'\n',encoding='utf-8')

# Offline review only: no service, external fonts, scripts, analytics, or runtime imports.
cards=''.join(f'''<article><div class="art"><img src="review/{html.escape(a['png'])}" alt="{a['id']}"></div><h3>{a['id']}</h3><p>{a['collection']}</p><div class="tiny"><img src="review/{a['png']}" alt=""><span><img src="review/{a['png']}" alt=""></span></div><p><a href="review/{a['png']}">192px PNG</a> · <a href="artwork-source/{a['source']}">Source</a></p></article>''' for a in assets)
document='''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>bemem Cozy Cute — artwork trial</title><style>
*{box-sizing:border-box}body{margin:0;background:#f7f3ed;color:#564b43;font:16px/1.5 system-ui,sans-serif}main{max-width:1100px;margin:auto;padding:24px 16px}h1{font-size:clamp(24px,5vw,36px);line-height:1.2}a{color:#46695a}nav{display:flex;flex-wrap:wrap;gap:12px}p{max-width:78ch}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:18px}article{background:white;padding:18px;border-radius:18px}h3{font-size:17px;margin:12px 0 0;overflow-wrap:anywhere}article p{margin:4px 0;font-size:14px}.art{display:flex;justify-content:center;height:180px;background:repeating-conic-gradient(#f1efea 0% 25%,#fff 0% 50%) 0/20px 20px;border-radius:10px}.art img{width:180px;height:180px}.tiny{display:flex;align-items:center;gap:30px;padding:10px 0}.tiny img{width:var(--unit,28px);height:var(--unit,28px);object-fit:contain;display:block}.tiny span{padding:9px;background:#303833;border-radius:9px}.board{max-width:100%;height:auto;border-radius:12px}.note{padding:12px 16px;border-left:4px solid #9fbaa7;background:#fff}section{margin:32px 0}small{display:block}button{font:inherit;min-height:48px;padding:8px 16px;border:1px solid #9fbaa7;border-radius:12px;background:white;color:inherit;cursor:pointer}button:focus-visible,a:focus-visible{outline:3px solid #725a50;outline-offset:4px}@media(max-width:460px){.grid{grid-template-columns:1fr 1fr;gap:10px}article{padding:10px}.art{height:130px}.art img{width:130px;height:130px}h3{font-size:14px}}
</style><main><h1>bemem / Cozy Cute</h1><p>First artwork trial — 13 original assets. Artwork review only; not Decorate Mode and not installed in the application.</p><p class="note">Nine AI-generated raster illustrations and four code-authored SVG botanical pieces. No claim of human hand drawing. Human visual approval is pending.</p><nav><a href="#assets">All 13 assets</a><a href="#sizes">1×1 size</a><a href="#frames">Connected frames</a><a href="VALIDATION.md">Validation report</a><a href="review/asset-manifest.json">Manifest</a></nav><section id="assets"><h2>Collection review</h2><p id="measurement"></p><button id="sizeMode" type="button">Use fixed 28px sample</button><div class="grid">CARDS</div></section><section id="sizes"><h2>Actual-size simulation</h2><p>Source rule: 12 columns, 16dp canvas margin on each side, no decoration inset. Tiny samples above use (browser viewport − 32) ÷ 12, capped at the app's 600dp width. CSS pixels only approximate native dp at 100% zoom. Samsung physical size/DPR is not verified. Image viewers may resize the PNG below.</p><a href="review/actual-size-preview.png"><img class="board" src="review/actual-size-preview.png" alt="All 13 assets at 24, 28, 32px and enlarged three times"></a></section><section id="frames"><h2>Precise tile connections</h2><p>Base vectors preserve exact edge midpoint anchors and tangents. No tile cropping. All 90-degree rotations, horizontal/vertical pairings, end caps, corner-to-corner and closed frames are checked.</p><a href="review/frame-connections.png"><img class="board" src="review/frame-connections.png" alt="Several joined botanical frames and all rotated tile variants"></a></section><section><h2>Contact sheet</h2><a href="review/collection-review.png"><img class="board" src="review/collection-review.png" alt="Labeled contact sheet with light and dark tiny samples"></a></section><footer>Offline local review. No fonts, assets or card information fetched from the network. Not approved for app integration.</footer></main><script>
let fixed=false;function measure(){const width=Math.min(600,innerWidth),unit=fixed?28:(width-32)/12;document.documentElement.style.setProperty('--unit',unit+'px');document.getElementById('measurement').textContent=`Tiny samples: ${unit.toFixed(2)} CSS px per block (${fixed?'fixed reference':'simulated '+width+'dp viewport'}).`;document.getElementById('sizeMode').textContent=fixed?'Use responsive grid sample':'Use fixed 28px sample'}document.getElementById('sizeMode').onclick=()=>{fixed=!fixed;measure()};addEventListener('resize',measure);measure();
</script></html>'''.replace('CARDS',cards)
(ROOT/'index.html').write_text(document,encoding='utf-8')
print(json.dumps({'assets':len(checks),'pngBytes':validation['totalPngBytes'],'seamPairs':len(seams),'maxRgbDifference':validation['seamSummary']['maxRgbDifference'],'preview':'index.html'}))
