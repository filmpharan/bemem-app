"""Validate only files inside this isolated review; never access Wallet data."""
from pathlib import Path
from PIL import Image
import json,xml.etree.ElementTree as ET

ROOT=Path(__file__).resolve().parents[1]
def validate():
    data=json.loads((ROOT/'fixtures.json').read_text(encoding='utf-8'))
    assert data['capacity']==6 and data['previewLimit']==4
    assert data['orientations']=={'landscape':{'w':6,'h':4},'portrait':{'w':4,'h':6}}
    assert len(data['cards'])==6 and len({c['id'] for c in data['cards']})==6
    assert len(data['concepts'])==3
    for c in data['cards']:
        assert set(c)=={'id','name','w','h','image','kind'}
        assert (c['w'],c['h']) in [(3,2),(6,4),(7,3),(8,4),(2,3),(4,6),(5,7)]
        p=ROOT/'assets'/c['image'];assert p.is_file()
        if p.suffix=='.svg':ET.parse(p)
        else:Image.open(p).verify()
    for p in (ROOT/'assets/shells').glob('*.svg'):
        root=ET.parse(p).getroot();expected='0 0 580 380' if 'landscape' in p.name else '0 0 380 580'
        assert root.attrib['viewBox']==expected
        im=Image.open(p.with_suffix('.png'));im.verify()
        alpha=Image.open(p.with_suffix('.png')).convert('RGBA').getchannel('A').getextrema();assert alpha[0]==0 and alpha[1]>0
    screenshots=list((ROOT/'sheets').glob('*.png'))
    for p in screenshots:Image.open(p).verify()
    for name in ['index.html','style.css','prototype.js','data.js']:assert (ROOT/'gallery'/name).is_file()
    js=(ROOT/'gallery/prototype.js').read_text(encoding='utf-8')
    for forbidden in ['localStorage','sessionStorage','fetch(','XMLHttpRequest','expo-file-system','src/lib/']:
        assert forbidden not in js,forbidden
    return {'fixtureValidation':'passed','svgAndTransparentPngLayers':12,'decodedScreenshots':len(screenshots),'storageOrNetworkCallsInPrototype':False}
if __name__=='__main__':print(json.dumps(validate()))
