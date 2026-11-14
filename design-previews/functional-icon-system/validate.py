"""Review artifact checks only. No phone/native storage or app mutations."""
from pathlib import Path
import hashlib,json,re,xml.etree.ElementTree as ET
from PIL import Image
ROOT=Path(__file__).resolve().parent;PROJECT=ROOT.parents[1]
manifest=json.loads((ROOT/'manifest.json').read_text());baseline=json.loads((ROOT/'production-baseline.json').read_text())
for relative,expected in baseline.items():assert hashlib.sha256((PROJECT/relative).read_bytes()).hexdigest()==expected,relative
seen={};transparent=0;max_bytes=0;total_bytes=0;size_checks=0
for a in manifest['icons']:
 file=ROOT/a['svg'];raw=file.read_bytes();svg=ET.fromstring(raw)
 assert svg.attrib['viewBox']=='0 0 24 24' and svg.attrib['stroke']=='currentColor' and svg.attrib['fill']=='none'
 assert svg.attrib['stroke-linecap']=='round' and svg.attrib['stroke-linejoin']=='round'
 for node in svg.iter():
  assert node.tag.split('}')[-1] in ['svg','g','path','rect','circle']
  assert not any(k.lower().startswith('on') or k.endswith('href') or k=='filter' for k in node.attrib)
 digest=hashlib.sha256(raw).hexdigest();assert digest not in seen,('Duplicate SVG',a,seen.get(digest));seen[digest]=a['svg']
 im=Image.open(ROOT/'renders'/a['direction']/(a['name']+'.png'));im.load()
 assert im.format=='PNG' and im.mode=='RGBA' and im.size==(192,192) and im.n_frames==1
 png=(ROOT/'renders'/a['direction']/(a['name']+'.png')).read_bytes();assert png[24:26]==bytes([8,6])
 alpha=im.getchannel('A');assert alpha.getextrema()==(0,255)
 b=alpha.getbbox();assert min(b[:2])>=2 and max(b[2:])<=190
 for size in [16,20,24,32]:
  small=im.resize((size,size),Image.Resampling.LANCZOS);assert small.getchannel('A').getbbox();size_checks+=1
 transparent+=1;max_bytes=max(max_bytes,len(raw));total_bytes+=len(raw)
inventory=json.loads((ROOT/'inventory.json').read_text())
for a in inventory:
 assert a['evidence'] in (PROJECT/a['source']).read_text(encoding='utf-8').splitlines()[a['line']-1]
html=(ROOT/'index.html').read_text(encoding='utf-8')
for relative in re.findall(r'(?:src|href)="([^"]+)"',html):
 if relative.startswith(('http:','https:','data:','#')):continue
 assert (ROOT/relative).is_file(),relative
assert len(re.findall('<article>',html))==6
assert all(marker in html for marker in ['data-direction="a"','data-direction="b"','data-direction="c"','Mockup only','not scannable'])
# Syntax is checked by Node against this extracted review script, not production.
(ROOT/'gallery-script.js').write_text(re.search(r'<script>([\s\S]+)</script>',html)[1],encoding='utf-8')
def luminance(hex):
 channels=[int(hex[i:i+2],16)/255 for i in [1,3,5]]
 channels=[c/12.92 if c<=.04045 else ((c+.055)/1.055)**2.4 for c in channels]
 return sum(c*w for c,w in zip(channels,[.2126,.7152,.0722]))
contrast=(luminance('#f4f5f7')+.05)/(luminance(manifest['ink'])+.05)
result={'status':'pass','sourceBackedActionGroups':len(inventory),'canonicalPerDirection':43,'editableSvgFiles':len(manifest['icons']),
 'uniqueSvgHashes':len(seen),'svgTotalBytes':total_bytes,'largestSvgBytes':max_bytes,'transparentRgbaRasters':transparent,'smallSizeDecodeChecks':size_checks,
 'clipped':0,'monochromeInk':manifest['ink'],'lightCanvasContrast':round(contrast,2),'mockupPanels':6,'productionProtectedHashesUnchanged':len(baseline),
 'realBrowserScreenshot':False,'nativeDeviceRenderingVerified':False,'comprehensionStudy':False}
(ROOT/'VALIDATION-RESULTS.json').write_text(json.dumps(result,indent=2),encoding='utf-8');print(json.dumps(result))
