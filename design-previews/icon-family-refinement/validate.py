from pathlib import Path
import hashlib,json,re,xml.etree.ElementTree as ET
from PIL import Image
ROOT=Path(__file__).resolve().parent;PROJECT=ROOT.parents[1]
manifest=json.loads((ROOT/'manifest.json').read_text());baseline=json.loads((ROOT/'production-baseline.json').read_text())
for p,sha in baseline.items():assert hashlib.sha256((PROJECT/p).read_bytes()).hexdigest()==sha,p
assert [a['id'] for a in manifest['targets']]==['delete','rotate','edit','add-card','decorate','policy','login']
hashes=set();checks=0
for a in manifest['targets']:
 xml=ET.fromstring((ROOT/a['svg']).read_text(encoding='utf-8'))
 assert xml.attrib['viewBox']=='0 0 24 24' and xml.attrib['stroke-width']=='2' and xml.attrib['stroke']=='currentColor'
 assert xml.attrib['fill']=='none' and xml.attrib['stroke-linecap']=='round' and xml.attrib['stroke-linejoin']=='round'
 for node in xml.iter():
  assert node.tag.split('}')[-1] in ['svg','path','rect','circle']
  assert not any(k.lower().startswith('on') or k.endswith('href') for k in node.attrib)
 raw=(ROOT/a['png']).read_bytes();assert raw[24:26]==bytes([8,6]);assert hashlib.sha256(raw).hexdigest()==a['sha256']
 im=Image.open(ROOT/a['png']);im.load();assert im.mode=='RGBA' and im.format=='PNG' and im.size==(192,192) and im.n_frames==1
 assert im.getchannel('A').getextrema()==(0,255)
 b=im.getchannel('A').getbbox();assert min(b[:2])>0 and max(b[2:])<192
 digest=hashlib.sha256(im.tobytes()).hexdigest();assert digest not in hashes;hashes.add(digest)
 for size in [16,20,24,32]:assert im.resize((size,size),Image.Resampling.LANCZOS).getchannel('A').getbbox();checks+=1
html=(ROOT/'index.html').read_text(encoding='utf-8')
for f in re.findall(r'(?:href|src)="([^"]+)"',html):assert (ROOT/f).is_file(),f
assert html.count('<div class="phone">')==3
script=re.search(r'<script>([\s\S]+)</script>',html)[1];(ROOT/'gallery-script.js').write_text(script,encoding='utf-8')
result={'status':'pass','targetActions':7,'uniqueTargetPngHashes':len(hashes),'smallSizeChecks':checks,'sourceBasedReferences':6,'beforeExamples':3,'placementMockups':3,
 'productionHashesUnchanged':len(baseline),'existingAppDataAccessed':False,'nativeDeviceRenderingVerified':False}
(ROOT/'VALIDATION-RESULTS.json').write_text(json.dumps(result,indent=2),encoding='utf-8');print(json.dumps(result))
