"""Seven-action refinement of the CURRENT production family, not the A/B/C study.
All output is review-only. No app asset, component, token or wallet writes.
"""
from pathlib import Path
import hashlib,importlib.util,json,re,shutil,tempfile,xml.etree.ElementTree as ET
from PIL import Image,ImageDraw,ImageFont
ROOT=Path(__file__).resolve().parent;PROJECT=ROOT.parents[1]
for folder in ['svg','png','references/svg','references/png','before/svg','before/png','sheets']:(ROOT/folder).mkdir(parents=True,exist_ok=True)
INKSCAPE=PROJECT/'.artwork-tools/inkscape-1.4.2/bin/inkscape.com'
T=json.loads((PROJECT/'design-system/bemem-lagoon-glass-rc2/TOKENS.json').read_text(encoding='utf-8'))
INK=T['palettes']['pearl-gray']['colors']['text']['primary'];BG=T['palettes']['pearl-gray']['colors']['canvas']['base']
spec=importlib.util.spec_from_file_location('illustrator_pipeline',PROJECT/'.agents/skills/bemem-illustrator/scripts/prepare_assets.py')
pipeline=importlib.util.module_from_spec(spec);spec.loader.exec_module(pipeline)

def protect():
 files=list((PROJECT/'src').rglob('*'))+list((PROJECT/'assets').rglob('*'))+[PROJECT/n for n in ['AGENTS.md','package.json','package-lock.json','app.json']]
 current={str(f.relative_to(PROJECT)).replace('\\','/'):hashlib.sha256(f.read_bytes()).hexdigest() for f in sorted(files) if f.is_file()}
 file=ROOT/'production-baseline.json'
 if file.exists():assert json.loads(file.read_text())==current,'Production changed during design preview'
 else:file.write_text(json.dumps(current,indent=2),encoding='utf-8')
 return len(current)

def path(d):return '<path d="'+d+'"/>'
def svg(body,view='0 0 24 24',stroke=2):
 w,h=view.split()[-2:]
 return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{view}" width="{w}" height="{h}" color="{INK}" fill="none" stroke="currentColor" stroke-width="{stroke}" stroke-linecap="round" stroke-linejoin="round">{body}</svg>'

TARGETS={
 'delete':path('M4 6H20M9 6V4Q9 3 10 3H14Q15 3 15 4V6M6 9L7 18Q7 21 10 21H14Q17 21 17 18L18 9M10 11V17M14 11V17'),
 'rotate':path('M19.5 8C18 4 13.5 2.5 9.5 4C5.5 5.5 3.5 9.5 4.2 13.5C5 18 9 21 13.5 20C16 19.5 18 18 19 16M19.5 3.5V8H15M9 14V10H13'),
 'edit':path('M11 4H6Q3 4 3 7V18Q3 21 6 21H17Q20 21 20 18V13M14.5 5.5L18.5 9.5M9 15L8 19L12 18L21 9Q22 8 21 7L18 4Q17 3 16 4L9 15Z'),
 'add-card':path('M10 6H6Q3 6 3 9V17Q3 20 6 20H18Q21 20 21 17V13M17 3V10M13.5 6.5H20.5M7 15H12'),
 'decorate':'<rect x="3" y="5" width="18" height="14" rx="2.5"/>'+path('M7 10H8M12 10H17M7 14.5H12M16 14.5H17')+'<circle cx="10" cy="10" r="2"/><circle cx="14" cy="14.5" r="2"/>',
 'policy':'<rect x="5" y="3" width="14" height="18" rx="2"/>'+path('M8 8.5L9.3 9.8L11.5 7.5M14 8.5H16M8 14.5L9.3 15.8L11.5 13.5M14 14.5H16'),
 'login':path('M13 3H18Q21 3 21 6V18Q21 21 18 21H13M3 12H15M11 8L15 12L11 16'),
}
NOTES={
 'delete':'A separated lid, tapered bin and two slots distinguish a trash can from a generic container. Keep destructive confirmation and action text.',
 'rotate':'A larger circular return and integrated arrowhead make the turn direction explicit; the inner right angle refers to the existing90-degree step, not Undo/Redo.',
 'edit':'A familiar pencil entering a partial page/card adds a clear object-being-modified cue, instead of relying on the isolated diagonal shape.',
 'add-card':'A wide rounded card plus a clear addition mark; the short identity line distinguishes it from Add Image. It does not change the existing Create/Add navigation.',
 'decorate':'Card-specific adjustment controls suggest styling/customization rather than drawing. Settings is still a possible interpretation, so retain the Decorate label.',
 'policy':'A document with two rule/check lines communicates policy information. The checks are a document metaphor, not acceptance or a new consent flow.',
 'login':'An inward arrow entering a rounded door is a conventional sign-in cue, clearly distinct from the Account portrait. Keep Login text and current Coming Soon behavior.',
}

def anchors():
 source=(PROJECT/'src/components/bemem/AddCardIcon.tsx').read_text(encoding='utf-8')
 paths=dict(re.findall(r"^  (\w+): '([^']+)'",source,re.M))
 refs={n:svg(paths[n]) for n in ['camera','flip','share','close']}
 refs['search']=svg('<circle cx="7.5" cy="7.5" r="5.6" stroke-width="1.8"/><rect x="11" y="14" width="8" height="1.8" rx=".9" fill="currentColor" stroke="none" transform="rotate(45 15 14.9)"/>','0 0 20 20',1.8)
 # Border centers reconstructed from Native View metrics, not redesigned paths.
 refs['account']=svg('<rect x="7.9" y="2.9" width="8.2" height="8.2" rx="4.1" stroke-width="1.8"/>'+path('M9.25 15.9H14.75Q22.1 15.9 22.1 23.25Q22.1 25.1 20.25 25.1H3.75Q1.9 25.1 1.9 23.25Q1.9 15.9 9.25 15.9Z'),'0 -1 24 28',1.8)
 before={'edit':svg(paths['edit']),
  'delete':svg('<rect x="5.9" y="7.9" width="10.2" height="11.2" rx="2.1" stroke-width="1.8"/>'+path('M3 5H19')+'<rect x="8.8" y="1.8" width="4.4" height="2.4" rx="1.2" stroke-width="1.6"/>','0 0 22 22'),
  'rotate':svg(path('M15.1 6.9A6.5 6.5 0 1 0 15.1 16.1')+'<path d="M20 1V7H14" transform="rotate(20 17.5 4.5)"/>','-1 -1 24 24')}
 return refs,before

def main():
 count=protect();refs,before=anchors();records=[];images={};hashes=set()
 for directory,items in [('references',refs),('before',before),('',{k:svg(v) for k,v in TARGETS.items()})]:
  for name,xml in items.items():
   folder=ROOT/directory;file=folder/'svg'/(name+'.svg');changed=not file.exists() or file.read_text(encoding='utf-8')!=xml
   file.write_text(xml,encoding='utf-8');ET.fromstring(xml)
   png=folder/'png'/(name+'.png')
   if changed or not png.exists():pipeline.render_svg(file,png,str(INKSCAPE))
   im=Image.open(png).convert('RGBA');im.save(png,optimize=True,compress_level=9);images[directory,name]=im
   assert im.size==(192,192) and im.getchannel('A').getextrema()==(0,255)
   bbox=im.getchannel('A').getbbox();assert bbox and min(bbox[:2])>0 and max(bbox[2:])<192,(directory,name,bbox)
   if directory=='':
    digest=hashlib.sha256(im.tobytes()).hexdigest();assert digest not in hashes;hashes.add(digest)
    records.append({'id':name,'svg':'svg/'+name+'.svg','png':'png/'+name+'.png','viewBox':[0,0,24,24],'strokeWidth':2,'ink':INK,'note':NOTES[name],'bytes':file.stat().st_size,'sha256':hashlib.sha256(png.read_bytes()).hexdigest()})
 shutil.copyfile(PROJECT/'design-previews/add-card-original-parity/LUCIDE-LICENSE.txt',ROOT/'references/LUCIDE-LICENSE.txt')
 font=ImageFont.truetype(str(PROJECT/'assets/fonts/lagoon/manrope.ttf'),15);small=ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf',13);title=ImageFont.truetype('C:/Windows/Fonts/segoeuib.ttf',23)
 def put(board,im,x,y,size):
  image=im.resize((size,size),Image.Resampling.LANCZOS);board.paste(image,(x,y),image)
 sheet=Image.new('RGB',(1260,820),BG);d=ImageDraw.Draw(sheet);d.text((20,14),'bemem / existing family / seven-action refinement',fill=INK,font=title)
 d.text((20,55),'REFERENCE ANCHORS / current production geometry, not new proposals',fill=INK,font=small)
 for i,name in enumerate(['search','account','camera','flip','share','close']):
  x=30+i*205;put(sheet,images['references',name],x+60,85,40);d.text((x+45,138),name,fill=INK,font=font)
 d.text((20,190),'REVISED / existing beside proposed, shown at equal review canvas size',fill=INK,font=small)
 for i,name in enumerate(['delete','rotate','edit']):
  x=20+i*413;d.rounded_rectangle((x,220,x+390,440),radius=16,fill='#ffffff')
  put(sheet,images['before',name],x+57,245,64);put(sheet,images['',name],x+253,245,64)
  d.text((x+50,333),'Existing',fill=INK,font=font);d.text((x+240,333),'Refined',fill=INK,font=font)
  d.text((x+158,389),name,fill=INK,font=font)
 d.text((20,479),'ADDITIONS / matched to the same2-unit rounded-outline family',fill=INK,font=small)
 for i,name in enumerate(['add-card','decorate','policy','login']):
  x=20+i*310;put(sheet,images['',name],x+115,525,56);d.text((x+105,602),name,fill=INK,font=font)
  for j,size in enumerate([16,20,24,32]):put(sheet,images['',name],x+40+j*58,660,size);d.text((x+40+j*58,704),str(size),fill=INK,font=small)
 d.text((20,778),'Preview only / no production icon replacement / charcoal used throughout for fair shape comparison',fill=INK,font=small)
 sheet.save(ROOT/'sheets/comparison.png')
 contact=Image.new('RGB',(1120,220),BG);d=ImageDraw.Draw(contact)
 for i,name in enumerate(TARGETS):put(contact,images['',name],i*160+55,40,48);d.text((i*160+30,113),name,fill=INK,font=font)
 d.text((20,182),'Only seven target proposals / sourceSVGs24x24 / labels for review',fill=INK,font=small);contact.save(ROOT/'sheets/seven-icons.png')
 board=Image.new('RGB',(1000,620),BG);d=ImageDraw.Draw(board);d.rectangle((570,0,1000,620),fill=INK)
 d.text((15,12),'Actual1x pixel samples16 /20 /24 /32',fill=INK,font=small);d.text((590,12),'Inverse / same vector alpha',fill='white',font=small)
 for i,name in enumerate(TARGETS):
  y=65+i*76;d.text((15,y+3),name,fill=INK,font=font)
  for j,size in enumerate([16,20,24,32]):
   im=images['',name].resize((size,size),Image.Resampling.LANCZOS);board.paste(im,(200+j*85,y),im)
   inverse=Image.new('RGBA',im.size,'white');inverse.putalpha(im.getchannel('A'));board.paste(inverse,(600+j*85,y),inverse)
 board.save(ROOT/'sheets/actual-size.png')
 result={'status':'pass','targetProposals':7,'references':6,'existingBeforeExamples':3,'editableTargetSVGs':7,'transparentTargetPngs':7,'uniqueTargetPixelHashes':7,'targetStroke':2,'targetViewBox':[0,0,24,24],'ink':INK,'protectedProductionHashesUnchanged':count,'nativeSamsungRenderingVerified':False}
 (ROOT/'manifest.json').write_text(json.dumps({'targets':records,'references':list(refs),'before':list(before)},indent=2),encoding='utf-8')
 (ROOT/'validation.json').write_text(json.dumps(result,indent=2),encoding='utf-8');protect();print(json.dumps(result))

if __name__=='__main__':main()
