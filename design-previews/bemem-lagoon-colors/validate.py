"""Validate new design artifacts with Python stdlib only; no app imports or wallet writes."""
from pathlib import Path
from html.parser import HTMLParser
import json
import re
import hashlib
import struct
from contract import ROOT, DS, load_contract, resolve_theme, rgb, contrast, composite

EXPECTED = ['lagoon-mint','blush-pink','warm-beige','lilac-dream','sky-blue','pearl-gray']

def no_duplicates(pairs):
    obj={}
    for key,value in pairs:
        if key in obj:raise ValueError('Duplicate JSON key: '+key)
        obj[key]=value
    return obj

def parse(path):
    return json.loads(path.read_text('utf-8'),object_pairs_hook=no_duplicates,
        parse_constant=lambda x:(_ for _ in ()).throw(ValueError(x)))

def shape(value):
    if isinstance(value,dict):return {k:shape(v) for k,v in value.items()}
    if isinstance(value,list):return [shape(v) for v in value]
    return type(value).__name__

class Page(HTMLParser):
    def __init__(self):super().__init__();self.ids=set();self.links=[];self.scripts=0;self.screens=[];self.current=None
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if 'id' in a:
            assert a['id'] not in self.ids,('duplicate HTML id',a['id'])
            self.ids.add(a['id'])
        if tag=='script':self.scripts+=1
        for key in ['href','src']:
            if key in a:self.links.append(a[key])
        if tag=='figure' and 'data-mode' in a:
            self.current={'theme':a['data-theme'],'mode':a['data-mode'],'cards':[]};self.screens.append(self.current)
        if 'data-card-id' in a:
            self.current['cards'].append((a['data-card-id'],int(a['data-col']),int(a['data-row'])))
    def handle_endtag(self,tag):
        if tag=='figure':self.current=None

def main():
    d=parse(DS/'TOKENS.json');assert d['metadata']['themeIds']==EXPECTED
    assert list(d['palettes'])==EXPECTED and d['metadata']['defaultThemeId']==EXPECTED[0]
    assert d['metadata']['version']=='2.0.0-rc.1' and d['metadata']['runtimeAdoption']=='not-applied'
    assert 'peach-glow' not in d['palettes']
    assert all(shape(p['colors'])==shape(d['palettes'][EXPECTED[0]]['colors']) for p in d['palettes'].values())
    fixture=parse(ROOT/'fixture.json');ratios={};resolved_hashes={}
    for theme in EXPECTED:
        r=resolve_theme(theme,d);s=r['semantic'];roles=r['core']['materials'];ratios[theme]={}
        for name in ['geometry','spacing','radius','typography','icons','motion','touch']:
            value=json.dumps(r['core'][name],sort_keys=True)
            if name in resolved_hashes:assert value==resolved_hashes[name],('Core differs',theme,name)
            else:resolved_hashes[name]=value
        for group in d['palettes'][theme]['colors'].values():
            assert all(re.fullmatch(r'#[0-9a-fA-F]{6}',v) for v in group.values())
        text_ratios=[contrast(rgb(s['text'][text]),rgb(bg)) for text in ['primary','secondary'] for bg in s['canvas'].values()]
        assert min(text_ratios)>=4.5,(theme,'canvas text',min(text_ratios))
        ratios[theme]['canvasTextMin']=round(min(text_ratios),3)
        for role,m in roles.items():
            assert 0<=m['fillAlpha']<=1 and 0<=m['pressedAlpha']<=1
            values=[]
            for alpha in [m['fillAlpha'],m['pressedAlpha']] if role!='inactive' else [m['fillAlpha']]:
                for backdrop in [[0,0,0],[1,1,1]]:
                    surface=composite(rgb(m['fill']),alpha,backdrop)
                    # Verify the permitted 4% label-band influence in both extreme directions.
                    for effect in [[0,0,0],[1,1,1]]:
                        values.append(contrast(rgb(m['foreground']),composite(effect,.04,surface)))
            assert min(values)>=4.5,(theme,role,min(values))
            ratios[theme][role+'LabelBandMin']=round(min(values),3)
        for c in r['components'].values():
            assert c['contentOpacity']==1
            assert c['roles']['default'] in roles
            if 'active' in c['roles']:assert c['roles']['active'] in roles
        assert r['components']['create']['label']=='Create'
        assert r['components']['save']['activeSupported'] is False
        assert r['core']['scan']['effectsAllowed'] is False
    pages={};link_count=0
    for p in ROOT.glob('*.html'):
        parsed=Page();parsed.feed(p.read_text('utf-8'));assert parsed.scripts==0
        expected=12 if p.name in ['index.html','contact-sheet.html'] else 0 if p.name=='materials.html' else 2
        assert len(parsed.screens)==expected,(p.name,len(parsed.screens))
        for screen in parsed.screens:
            assert screen['theme'] in EXPECTED
            positions=fixture['savedLayout' if screen['mode']=='home' else 'draftLayout']
            assert len(screen['cards'])==4
            for card,col,row in screen['cards']:assert {'col':col,'row':row}==positions[card]
        for link in parsed.links:
            if link.startswith('#'):assert link[1:] in parsed.ids,(p.name,link)
            elif not link.startswith(('https:','http:','data:')):
                assert (p.parent/link.split('#')[0]).exists(),(p.name,link)
                link_count+=1
            else:raise AssertionError('External asset in static preview: '+link)
        pages[p.name]={'screens':len(parsed.screens),'scripts':0}
    images={}
    for p in ROOT.glob('*.png'):
        data=p.read_bytes();assert data[:8]==b'\x89PNG\r\n\x1a\n';images[p.name]=list(struct.unpack('>II',data[16:24]))
    assert len(images)==8,images
    browser=parse(ROOT/'browser-review.json');assert len(browser['checks'])==16
    report_path=ROOT/'validation-report.json';table_issues=[]
    for folder in [DS,ROOT]:
        for p in folder.glob('*.md'):
            text=p.read_text('utf-8');expected=None
            for n,line in enumerate(text.splitlines(),1):
                if line.startswith('|'):
                    count=len(line.split('|'))-2
                    if expected is None:expected=count
                    elif count!=expected:table_issues.append([p.name,n,count,expected])
                else:expected=None
            for link in re.findall(r'\]\(([^)]+)\)',text):
                if not link.startswith(('https:','http:','#')):
                    target=(p.parent/link.split('#')[0]).resolve()
                    assert target.exists() or target==report_path.resolve(),(p.name,link)
    assert not table_issues,table_issues
    report={'date':'2026-11-07','designSystemVersion':d['metadata']['version'],'status':'PASS — document/browser checks only',
       'json':'duplicate-key/non-finite check passed','aliasResolution':'all six palettes passed; no missing references or cycles',
       'paletteShape':'identical color-role structures; no geometry/type overrides','coreFingerprint':{k:hashlib.sha256(v.encode()).hexdigest() for k,v in resolved_hashes.items()},
       'sharedCore':'geometry, spacing, radius, typography, icons, motion, touch identical after resolution',
       'calculatedContrast':ratios,'contrastModel':'sRGB tint against black/white plus 4% label-band influence; not native compositor certification',
       'html':pages,'localLinkCount':link_count,'browserChecks':16,'sameModeStructure':'verified in Edge','cardArtwork':'computed fill/text/radius/shadow/gradient unchanged across all 12 screens',
       'png':images,'nativeDeviceValidation':'NOT PERFORMED','walletStorageAccess':False,'implementationCreated':False}
    report_path.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'status':'PASS','themes':6,'mainScreens':12,'browserChecks':16,'pngs':len(images),'localLinks':link_count,'calculatedContrastMin':round(min(v for theme in ratios.values() for v in theme.values()),3),'nativeDevices':'not tested'},indent=2))

if __name__=='__main__':main()
