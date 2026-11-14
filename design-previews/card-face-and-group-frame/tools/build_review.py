"""Preview-only original vector study. No app imports, writes or dependencies.
Run with the existing .artwork-tools/.venv/Scripts/python.exe -B.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps
import json, math, os, re, subprocess, xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT.parents[1]
INK = APP / '.artwork-tools/inkscape-1.4.2/bin/inkscape.com'
SIZE = 1536
PALETTES = [
    ('pink', 'Pink pastel', '#f4dee2', '#e4b8c3', '#a76e80'),
    ('brown', 'Brown pastel', '#e8dfd5', '#cbb39f', '#8b725e'),
    ('green', 'Light green pastel', '#e5edd9', '#bdd1ad', '#789574'),
    ('yellow', 'Soft yellow pastel', '#f4edd1', '#e2d091', '#a19355'),
    ('blue', 'Soft blue pastel', '#deeaf0', '#b3cbdc', '#748eaa'),
    ('purple', 'Soft lavender pastel', '#eae2ef', '#cdbbdb', '#9380ab'),
]
DIRECTIONS = {
    'A': {'name': 'Soft Pastel Minimal', 'subtitle': 'Quiet contours / open space', 'frame': 'Pocket Stack'},
    'B': {'name': 'Cozy Cute', 'subtitle': 'Paper warmth / a little botanical charm', 'frame': 'Keepsake Pocket'},
    'C': {'name': 'Pearl Gray × Lagoon Glass', 'subtitle': 'Soft light / a quieter glass fold', 'frame': 'Pearl Sleeve'},
}
source = (APP/'src/lib/card-size-presets.ts').read_text(encoding='utf-8')
PRESETS = [{'id':m[0], 'w':int(m[1]), 'h':int(m[2])} for m in re.findall(r"id: '([^']+)'.*?ratioWidth: (\d+), ratioHeight: (\d+)", source)]
assert len(PRESETS) == 7
POSITIONS = {'card-landscape':(0,0), 'card-portrait':(8,0), 'mini-landscape':(0,6), 'mini-portrait':(4,6),
             'voucher-landscape':(0,10), 'boarding-pass-landscape':(0,15), 'vaccine-passport-portrait':(7,7)}
FRAME_SIZES = {'compact':(960,720), 'wide':(1152,560), 'tall':(800,1152)}

def mix(a,b,t):
    x=tuple(int(a[i:i+2],16) for i in (1,3,5)); y=tuple(int(b[i:i+2],16) for i in (1,3,5))
    return '#'+''.join(f'{round(p+(q-p)*t):02x}' for p,q in zip(x,y))

def svg(body,w=SIZE,h=SIZE):
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}">{body}</svg>'

def face(direction,p):
    _,_,base,tone,ink=p
    if direction=='A':
        return svg(f'''<rect width="1536" height="1536" fill="{base}"/>
        <path d="M-160 1290C270 1190 460 810 970 760C1370 720 1500 990 1750 880L1750 1700H-160Z" fill="{mix(base,tone,.5)}"/>
        <path d="M-120 1490C520 1450 470 950 1030 900C1390 865 1490 1080 1670 1000L1670 1700H-120Z" fill="{tone}" opacity=".48"/>
        <path d="M-160 1285C270 1185 460 805 970 755C1370 715 1500 985 1750 875" fill="none" stroke="#fffdf9" stroke-opacity=".64" stroke-width="6"/>
        <path d="M690 -70C580 300 775 430 1100 395C1400 365 1480 540 1610 460" fill="none" stroke="#fffdf9" stroke-width="3" opacity=".55"/>
        <ellipse cx="1080" cy="900" rx="180" ry="115" fill="{mix(base,'#ffffff',.2)}" opacity=".32"/>''')
    if direction=='B':
        # Original flat paper illustration; deliberate curves, no stock icons/emoji or texture filters.
        paper=mix(base,'#fff4de',.2)
        return svg(f'''<rect width="1536" height="1536" fill="{paper}"/>
        <path d="M-40 1110C320 1040 495 1260 870 1170C1110 1110 1430 1190 1600 1080V1560H-40Z" fill="{mix(paper,tone,.35)}"/>
        <path d="M-70 420C400 335 495 520 900 440C1150 390 1350 460 1610 350" fill="none" stroke="{ink}" opacity=".18" stroke-width="4" stroke-linecap="round" stroke-dasharray="14 23"/>
        <g fill="none" stroke="{ink}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" opacity=".87">
         <path d="M964 1050C1006 965 1055 910 1050 831"/>
         <path d="M1000 975C950 981 924 947 929 918C971 917 997 941 1000 975Z" fill="{mix(tone,'#97b6a0',.5)}"/>
         <path d="M1025 921C1061 930 1102 906 1107 872C1061 865 1035 888 1025 921Z" fill="{mix(paper,'#97b6a0',.4)}"/>
         <path d="M1050 830C999 824 977 786 1000 761C1020 744 1040 763 1050 786C1053 739 1085 728 1103 751C1118 775 1087 795 1075 804C1119 790 1147 813 1131 836C1117 859 1084 840 1072 833C1093 873 1076 900 1054 891C1029 881 1040 848 1050 830Z" fill="{mix(paper,'#fffdf6',.65)}"/>
         <ellipse cx="1057" cy="815" rx="20" ry="18" fill="{mix(tone,'#e8c98c',.55)}"/>
        </g>
        <g fill="{ink}" opacity=".20"><ellipse cx="370" cy="625" rx="8" ry="6"/><ellipse cx="400" cy="605" rx="5" ry="7"/><ellipse cx="1200" cy="1025" rx="5" ry="7"/></g>''')
    base=mix(base,'#eceff1',.28)
    return svg(f'''<defs>
       <linearGradient id="base" x2=".8" y2="1"><stop stop-color="{mix(base,'#ffffff',.35)}"/><stop offset="1" stop-color="{base}"/></linearGradient>
       <linearGradient id="fold" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ffffff" stop-opacity=".65"/><stop offset=".46" stop-color="{tone}" stop-opacity=".46"/><stop offset="1" stop-color="{ink}" stop-opacity=".12"/></linearGradient>
       <linearGradient id="light" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#ffffff" stop-opacity=".65"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></linearGradient>
      </defs><rect width="1536" height="1536" fill="url(#base)"/>
      <path d="M680 1600C705 1070 895 665 1360 630C1470 620 1580 655 1690 720L1690 1600Z" fill="url(#fold)"/>
      <path d="M890 1640C914 1210 1090 950 1580 960" fill="none" stroke="{tone}" stroke-width="220" opacity=".22"/>
      <path d="M680 1590C705 1060 895 655 1360 620C1470 610 1580 645 1690 710" fill="none" stroke="#ffffff" stroke-width="6" opacity=".68"/>
      <path d="M935 1250C1090 980 1240 970 1600 1010" fill="none" stroke="#ffffff" stroke-width="3" opacity=".45"/>
      <path d="M-70 300C340 360 500 500 820 410C1140 320 1320 290 1630 390V-60H-70Z" fill="url(#light)" opacity=".6"/>''')

def frame(direction,w,h):
    ink={'A':'#a1a599','B':'#a58c7b','C':'#8299a6'}[direction]
    paper={'A':'#f5f2ea','B':'#f4e6d4','C':'#eceff1'}[direction]
    # Offset rear outlines and a label tab communicate a pocket/set, not a decoration around one card.
    body=f'<g fill="none" stroke="{ink}" stroke-linecap="round" stroke-linejoin="round">'
    body+=f'<rect x="56" y="22" width="{w-100}" height="{h-76}" rx="32" stroke-width="2" opacity=".25"/>'
    body+=f'<rect x="45" y="32" width="{w-90}" height="{h-76}" rx="32" stroke-width="2" opacity=".42"/>'
    if direction=='B':
        body+=f'<path d="M68 48H{w-70}Q{w-34} 46 {w-35} 84L{w-36} {h-68}Q{w-38} {h-34} {w-72} {h-36}H69Q32 {h-36} 35 {h-74}V85Q33 49 68 48Z" stroke-width="4"/>'
        body+=f'<rect x="48" y="61" width="{w-96}" height="{h-110}" rx="23" stroke-width="2" stroke-dasharray="7 11" opacity=".5"/>'
        body+=f'<path d="M{w-110} 48V103L{w-92} 91L{w-74} 104V48" fill="#c2d1b5" stroke-width="3"/>'
    else:
        body+=f'<rect x="36" y="46" width="{w-72}" height="{h-82}" rx="32" stroke-width="{3 if direction=="A" else 6}" opacity=".65"/>'
        if direction=='C':body+=f'<rect x="42" y="52" width="{w-84}" height="{h-94}" rx="27" stroke="#ffffff" stroke-width="2" opacity=".9"/>'
    body+=f'</g><rect x="62" y="27" width="230" height="48" rx="18" fill="{paper}" stroke="{ink}" stroke-width="2"/>'
    body+=f'<path d="M80 42H269" stroke="#ffffff" stroke-width="2" opacity=".7"/>'
    return svg(body,w,h)

def export_svg(path,png,w=None):
    env=os.environ.copy();env['INKSCAPE_PROFILE_DIR']=str(ROOT/'.tools/inkscape-profile')
    command=[str(INK),str(path),'--export-area-page','--export-background-opacity=0',f'--export-filename={png}']
    if w:command.append(f'--export-width={w}')
    r=subprocess.run(command,env=env,capture_output=True,text=True,encoding='utf-8',errors='replace')
    if r.returncode:raise RuntimeError(r.stderr)

def font(size):return ImageFont.truetype(str(APP/'assets/fonts/lagoon/manrope.ttf'),size)
def canvas(w,h,title,sub):
    im=Image.new('RGB',(w,h),'#eceff1');d=ImageDraw.Draw(im)
    d.text((60,42),'bemem. / FACE & GROUP STUDY',font=font(22),fill='#4c606c')
    d.text((60,83),title,font=font(45),fill='#263943');d.text((60,145),sub,font=font(22),fill='#4c606c');return im
def label(im,xy,text,size=23,color='#263943'):ImageDraw.Draw(im).text(xy,text,font=font(size),fill=color)
def paste_card(im,master,box,label_text=None,radius=28):
    x,y,w,h=map(round,box);pic=ImageOps.fit(Image.open(master).convert('RGB'),(w,h),centering=(.5,.5))
    mask=Image.new('L',(w,h));ImageDraw.Draw(mask).rounded_rectangle((0,0,w-1,h-1),radius=radius,fill=255)
    im.paste(pic,(x,y),mask)
    if label_text:label(im,(x+12,y+12),label_text,min(25,max(13,w//12)))

def mock_group(direction,variant):
    w,h=FRAME_SIZES[variant];im=Image.new('RGBA',(w,h),'#eceff1')
    if variant=='wide': boxes=[(85,130,450,300),(585,130,450,300)]
    elif variant=='tall':boxes=[(210,130,380,570),(170,770,450,300)]
    else:boxes=[(85,170,480,320),(650,170,180,270)]
    for i,box in enumerate(boxes):paste_card(im,ROOT/f'masters/{direction}-{PALETTES[(i+2)%6][0]}.png',box,'Everyday' if i==0 else 'Travel')
    im.alpha_composite(Image.open(ROOT/f'frames/{direction}-{variant}.png').convert('RGBA'))
    label(im,(80,40),'Everyday / 2 cards',18)
    return im

def build():
    for p in ['masters','frames','sheets','gallery','.tools/inkscape-profile']: (ROOT/p).mkdir(parents=True,exist_ok=True)
    records=[]
    for direction in DIRECTIONS:
        for p in PALETTES:
            stem=f'{direction}-{p[0]}';s=ROOT/f'masters/{stem}.svg';out=s.with_suffix('.png');s.write_text(face(direction,p),encoding='utf-8');export_svg(s,out)
            records.append({'id':stem,'direction':direction,'color':p[0],'label':p[1],'svg':f'masters/{stem}.svg','png':f'masters/{stem}.png','width':SIZE,'height':SIZE,'opaque':True})
        for variant,(w,h) in FRAME_SIZES.items():
            s=ROOT/f'frames/{direction}-{variant}.svg';s.write_text(frame(direction,w,h),encoding='utf-8');export_svg(s,s.with_suffix('.png'))
        print('Exported direction',direction,flush=True)
    for direction,info in DIRECTIONS.items():
        im=canvas(1800,1160,f'{direction} / {info["name"]}',info['subtitle']+' — six colorways, one composition')
        for i,p in enumerate(PALETTES):
            x=60+(i%3)*570;y=215+(i//3)*435
            paste_card(im,ROOT/f'masters/{direction}-{p[0]}.png',(x,y,540,350));label(im,(x,y+366),p[1])
        im.save(ROOT/f'sheets/{direction}-colorways.png',optimize=True)
        im=canvas(1600,1580,f'{direction} / Crop behavior','One square master. Seven footprints. One shared block scale. No per-size artwork.')
        label(im,(60,235),'6×4 / 4×6 / 5×7 / 2×3',25);label(im,(60,284),'plus Mini, Voucher, Boarding Pass',21)
        label(im,(60,355),'Centered cover crop',25);label(im,(60,400),'Paint inset: 0.1 block per side',21)
        label(im,(60,445),'Preview labels are not in artwork',21)
        for p in PRESETS:
            col,row=POSITIONS[p['id']];u=68;x=650+(col+.1)*u;y=215+(row+.1)*u
            paste_card(im,ROOT/f'masters/{direction}-blue.png',(x,y,(p['w']-.2)*u,(p['h']-.2)*u),f"{p['w']}×{p['h']}")
        im.save(ROOT/f'sheets/{direction}-crops.png',optimize=True)
        im=canvas(1800,1400,f'{direction} / {info["frame"]}','A grouped pocket: shared perimeter + rear-card edges + a set label. Concept only.')
        for variant,xy,display_w in [('compact',(60,230),800),('wide',(60,900),950),('tall',(1150,230),570)]:
            group=mock_group(direction,variant);group=group.resize((display_w,round(group.height*display_w/group.width)),Image.Resampling.LANCZOS)
            label(im,(xy[0],xy[1]-40),variant.title()+' group',23);im.paste(group,xy)
        im.save(ROOT/f'sheets/{direction}-frames.png',optimize=True)
    im=canvas(2000,1210,'Three directions / one calm palette','Same six colorways and same 6×4 crop for a fair comparison. Editable original SVG sources retained.')
    for row,(direction,info) in enumerate(DIRECTIONS.items()):
        y=255+row*300;label(im,(60,y+30),direction,55);label(im,(60,y+105),info['name'].split(' × ')[0][:20],19)
        for i,p in enumerate(PALETTES):
            x=285+i*277;paste_card(im,ROOT/f'masters/{direction}-{p[0]}.png',(x,y,255,170));label(im,(x,y+185),p[1],18)
    im.save(ROOT/'sheets/comparison.png',optimize=True)
    # Common safe intersection after applying the actual .1-block paint inset.
    ratios=[(p['w']-.2)/(p['h']-.2) for p in PRESETS]
    safe={'x':SIZE*(1-min(ratios))/2,'y':SIZE*(1-1/max(ratios))/2,'width':SIZE*min(ratios),'height':SIZE/max(ratios)}
    manifest={'status':'design-preview-only / awaiting visual approval','masterSize':SIZE,'directions':DIRECTIONS,'colorways':[{'id':p[0],'label':p[1],'base':p[2]} for p in PALETTES],
              'presets':[{**p,'col':POSITIONS[p['id']][0],'row':POSITIONS[p['id']][1]} for p in PRESETS],'paintInset':.1,'commonSafeRect':safe,'assets':records,'frameVariants':FRAME_SIZES}
    (ROOT/'manifest.json').write_text(json.dumps(manifest,indent=2,ensure_ascii=False),encoding='utf-8')
    (ROOT/'gallery/data.js').write_text('window.BEMEM_FACE_REVIEW = '+json.dumps(manifest,ensure_ascii=False)+';',encoding='utf-8')
    validate(manifest)

def validate(manifest):
    report={'status':'passed','faces':[],'frames':[],'limitations':['Visual acceptance pending. Vector artwork is authored programmatically, not claimed to be human hand-painted.','Group frames are transparent full-container concepts, not 1×1 Decorate tiles or implemented group logic.']}
    for a in manifest['assets']:
        ET.parse(ROOT/a['svg']);p=ROOT/a['png'];im=Image.open(p);im.verify();im=Image.open(p).convert('RGBA')
        assert im.size==(SIZE,SIZE) and im.getchannel('A').getextrema()==(255,255)
        report['faces'].append({'id':a['id'],'size':list(im.size),'bytes':p.stat().st_size,'alpha':'opaque by design','decoded':True})
    assert len(report['faces'])==18 and all(sum(a['direction']==d for a in manifest['assets'])==6 for d in DIRECTIONS)
    for p in sorted((ROOT/'frames').glob('*.png')):
        im=Image.open(p).convert('RGBA');ET.parse(p.with_suffix('.svg'));alpha=im.getchannel('A');assert alpha.getextrema()==(0,255);assert im.getpixel((im.width//2,im.height//2))[3]==0
        report['frames'].append({'id':p.stem,'size':list(im.size),'bytes':p.stat().st_size,'transparentCenter':True,'decoded':True})
    for p in (ROOT/'sheets').glob('*.png'):Image.open(p).verify()
    report['comparisonSheets']=10;report['totalPngBytes']=sum(p.stat().st_size for p in ROOT.rglob('*.png'))
    (ROOT/'VALIDATION.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
    print('Validated18 face masters,9 transparent frames,10 comparison PNGs.',flush=True)

if __name__=='__main__':build()
