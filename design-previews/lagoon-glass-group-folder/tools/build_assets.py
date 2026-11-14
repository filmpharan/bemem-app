"""Original preview-only Lagoon folder shells and synthetic card fixtures. No production writes."""
from pathlib import Path
from PIL import Image
import json, os, subprocess, xml.etree.ElementTree as ET

ROOT=Path(__file__).resolve().parents[1]
APP=ROOT.parents[1]
INK=APP/'.artwork-tools/inkscape-1.4.2/bin/inkscape.com'
CONCEPTS={'A':{'name':'Lagoon Folder','note':'A clear tab and four orderly windows.'},'B':{'name':'Lagoon Stack','note':'Layered cards, held inside a structured shell.'},'C':{'name':'Lagoon Pocket','note':'A translucent sleeve with a folded glass lip.'}}
ORIENTATIONS={'landscape':{'w':6,'h':4},'portrait':{'w':4,'h':6}}

def svg(w,h,body):return f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}">{body}</svg>'
def shell(concept,orientation,front=False):
    w,h=(580,380) if orientation=='landscape' else (380,580)
    colors={'A':('#57c0b7','#16898b','#07586b'),'B':('#368eaa','#13677f','#073b57'),'C':('#67bfc4','#218a9a','#07556e')}[concept]
    top,mid,dark=colors
    defs=f'''<defs><linearGradient id="body" x1="0" y1="0" x2=".65" y2="1"><stop stop-color="{top}"/><stop offset=".46" stop-color="{mid}"/><stop offset="1" stop-color="{dark}"/></linearGradient>
    <linearGradient id="rim" x2=".6" y2="1"><stop stop-color="#f3fffc" stop-opacity=".95"/><stop offset=".45" stop-color="#b5eee2" stop-opacity=".28"/><stop offset="1" stop-color="#0c4e66" stop-opacity=".7"/></linearGradient>
    <linearGradient id="lip" x1="0" y1="0" x2=".2" y2="1"><stop stop-color="{top}" stop-opacity=".56"/><stop offset=".55" stop-color="{mid}" stop-opacity=".85"/><stop offset="1" stop-color="{dark}"/></linearGradient>
    <linearGradient id="shine"><stop stop-color="#ffffff" stop-opacity=".55"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></linearGradient></defs>'''
    tab=min(200,w*.5)
    outline=f'M28 16H{tab}Q{tab+12} 16 {tab+24} 31L{tab+42} 51H{w-30}Q{w-12} 51 {w-12} 73V{h-32}Q{w-12} {h-12} {w-32} {h-12}H32Q12 {h-12} 12 {h-32}V35Q12 16 28 16Z'
    if concept=='A':
        well=f'<rect x="32" y="87" width="{w-64}" height="{h-192}" rx="17" fill="#073e57" fill-opacity=".3" stroke="#d8ffef" stroke-opacity=".28" stroke-width="2"/>'
        body=f'<path d="{outline}" fill="url(#body)" stroke="url(#rim)" stroke-width="3"/>{well}<path d="M26 69H{w-36}" stroke="#e8fff7" stroke-width="4" opacity=".5"/><path d="M28 28H{tab-10}" stroke="#ffffff" stroke-width="4" opacity=".45" stroke-linecap="round"/>'
    elif concept=='B':
        body=f'<path d="{outline}" fill="{dark}" stroke="url(#rim)" stroke-width="3"/><rect x="22" y="70" width="{w-44}" height="{h-92}" rx="20" fill="url(#body)"/><path d="M30 82H{w-36}" stroke="#b6f1ed" stroke-width="5" opacity=".4"/><path d="M{w-25} 104V{h-48}" stroke="#001e37" stroke-width="6" opacity=".25"/>'
    else:
        body=f'<path d="{outline}" fill="url(#body)" stroke="url(#rim)" stroke-width="3"/><path d="M28 26H{tab-12}" stroke="#edfffa" stroke-width="4" opacity=".6" stroke-linecap="round"/><path d="M25 75H{w-30}" stroke="#d8fff3" stroke-width="2" opacity=".45"/>'
    # Separate pocket front draws over card miniatures; it never deforms their image rectangles.
    start=h*(.64 if concept=='C' else .77)
    if front:
        if concept=='A':body=f'<path d="M22 {h-86}H{w-22}V{h-34}Q{w-22} {h-22} {w-34} {h-22}H34Q22 {h-22} 22 {h-34}Z" fill="{dark}" fill-opacity=".16"/>'
        else:body=f'<path d="M20 {start+18}Q{w*.5} {start-9} {w-20} {start+18}V{h-32}Q{w-20} {h-20} {w-32} {h-20}H32Q20 {h-20} 20 {h-32}Z" fill="url(#lip)"/><path d="M24 {start+18}Q{w*.5} {start-7} {w-24} {start+18}" stroke="#edfffa" stroke-opacity=".8" stroke-width="3" fill="none"/><path d="M30 {h-28}H{w-34}" stroke="#1c4965" stroke-opacity=".28" stroke-width="3"/>'
    else:
        body+=f'<path d="M28 89Q{w*.5} 30 {w-25} 81V116Q{w*.6} 65 28 118Z" fill="url(#shine)" opacity=".12"/>'
    return svg(w,h,defs+body)

def card_art(name,colors):
    a,b=colors
    return svg(1200,800,f'''<defs><linearGradient id="bg" x2="1" y2="1"><stop stop-color="{a}"/><stop offset="1" stop-color="{b}"/></linearGradient><linearGradient id="halo"><stop stop-color="#ffffff" stop-opacity=".36"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></linearGradient></defs><rect width="1200" height="800" fill="url(#bg)"/><ellipse cx="1120" cy="180" rx="620" ry="590" fill="url(#halo)"/><path d="M220 900C500 700 570 260 1310 360" fill="none" stroke="#ffffff" stroke-opacity=".12" stroke-width="180"/><path d="M-20 35H1250" stroke="#ffffff" stroke-opacity=".36" stroke-width="5"/>''')

def build():
    for p in ['assets/shells','assets/cards','.tools/inkscape-profile','sheets','gallery']:(ROOT/p).mkdir(parents=True,exist_ok=True)
    env=os.environ.copy();env['INKSCAPE_PROFILE_DIR']=str(ROOT/'.tools/inkscape-profile')
    for c in CONCEPTS:
        for o in ORIENTATIONS:
            for layer in ['back','front']:
                p=ROOT/f'assets/shells/{c}-{o}-{layer}.svg';p.write_text(shell(c,o,layer=='front'),encoding='utf-8')
                # Transparent PNG exports are editable-source handoff companions, not runtime assets.
                r=subprocess.run([str(INK),str(p),'--export-area-page','--export-background-opacity=0',f'--export-filename={p.with_suffix(".png")}'],env=env,capture_output=True,text=True,encoding='utf-8',errors='replace')
                if r.returncode:raise RuntimeError(r.stderr)
        print('Exported shell family '+c,flush=True)
    for name,colors in [('teal',('#29a59f','#07566e')),('blue',('#3c8ccc','#163d77')),('amber',('#e5ae55','#a25a32')),('violet',('#977bc5','#4a467e'))]:
        (ROOT/f'assets/cards/{name}.svg').write_text(card_art(name,colors),encoding='utf-8')
    # Keep the original synthetic PNG master; load a lightweight local WebP in the gallery.
    photo=Image.open(ROOT/'assets/synthetic-still-life.png').convert('RGB')
    photo.thumbnail((960,960),Image.Resampling.LANCZOS)
    photo.save(ROOT/'assets/synthetic-still-life.webp',quality=85,method=6)
    fixtures=[
      {'id':'sample-everyday','name':'Everyday Club','w':6,'h':4,'image':'cards/teal.svg','kind':'default-artwork'},
      {'id':'sample-cafe','name':'Cafe Journal','w':4,'h':6,'image':'synthetic-still-life.webp','kind':'synthetic-photo'},
      {'id':'sample-weekend','name':'Weekend Pass','w':7,'h':3,'image':'cards/violet.svg','kind':'default-artwork'},
      {'id':'sample-mini','name':'Little Rewards','w':2,'h':3,'image':'cards/amber.svg','kind':'default-artwork'},
      {'id':'sample-wellness','name':'Wellness Notes','w':5,'h':7,'image':'synthetic-still-life.webp','kind':'synthetic-photo'},
      {'id':'sample-travel','name':'Travel Journal','w':8,'h':4,'image':'cards/blue.svg','kind':'default-artwork'},
    ]
    data={'status':'isolated design preview / not approved','capacity':6,'previewLimit':4,'orientations':ORIENTATIONS,'concepts':CONCEPTS,'cards':fixtures}
    (ROOT/'fixtures.json').write_text(json.dumps(data,indent=2),encoding='utf-8')
    (ROOT/'gallery/data.js').write_text('window.LAGOON_FOLDER_DATA='+json.dumps(data)+';',encoding='utf-8')
    report={'shellLayers':12,'folderFootprints':['6x4','4x6'],'maxMembers':6,'maxMiniatures':4,'countBadge':False,'assets':[]}
    for p in sorted((ROOT/'assets/shells').glob('*.png')):
        ET.parse(p.with_suffix('.svg'));im=Image.open(p);im.verify();im=Image.open(p).convert('RGBA');alpha=im.getchannel('A').getextrema();assert alpha[0]==0 and alpha[1]>0
        report['assets'].append({'id':p.stem,'size':list(im.size),'bytes':p.stat().st_size,'alphaRange':list(alpha),'realAlpha':True})
    Image.open(ROOT/'assets/synthetic-still-life.png').verify()
    (ROOT/'ASSET-VALIDATION.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
    print('Validated12 transparent shell layers and local synthetic fixtures.',flush=True)

if __name__=='__main__':build()
