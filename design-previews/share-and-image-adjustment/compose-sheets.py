"""Compose existing browser captures with installed Pillow. Review files only."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import json, shutil
here = Path(__file__).resolve().parent
captures = here.parent.parent / 'output' / 'playwright'
dest = here / 'screenshots'
dest.mkdir(exist_ok=True)
names = ['share-a','share-b','share-a-qr','share-b-reviewed','share-a-back-barcode',
         'adjust-a','adjust-b','adjust-a-portrait','adjust-b-large','adjust-a-confirmed','adjust-b-confirmed',
         'share-a-large-text','share-b-large-text','adjust-a-large-text','adjust-b-large-text','crop-proof-seven']
for name in names:
    shutil.copyfile(captures / (name+'.png'), dest / (name+'.png'))
font_path = Path('C:/Windows/Fonts/segoeui.ttf')
def font(size):
    return ImageFont.truetype(str(font_path), size) if font_path.exists() else ImageFont.load_default()
def compose(name, title, left, right, labels):
    a,b = (Image.open(dest / (n+'.png')).convert('RGB') for n in [left,right])
    assert a.size == b.size, (a.size,b.size)
    w,h = a.size
    out = Image.new('RGB',(w*2+96,h+155),'#eef1f4'); d=ImageDraw.Draw(out)
    d.text((28,16),'bemem.  /  DESIGN REVIEW',font=font(16),fill='#53636c')
    d.text((28,43),title,font=font(28),fill='#263943')
    for x,image,label in [(32,a,labels[0]),(w+64,b,labels[1])]:
        d.text((x,97),label,font=font(18),fill='#263943');out.paste(image,(x,132))
    out.save(dest / (name+'.png'),optimize=True)
compose('share-comparison','Share Card: two ways to choose','share-a','share-b',['A / Preview First','B / Simple Steps'])
compose('adjust-comparison','Adjust image: one crop contract','adjust-a','adjust-b',['A / Direct Card Crop','B / Guided Controls'])
manifest=[]
for p in sorted(dest.glob('*.png')):
    with Image.open(p) as im:
        im.verify()
    with Image.open(p) as im:
        manifest.append({'file':p.name,'width':im.width,'height':im.height,'bytes':p.stat().st_size,'format':im.format})
(here/'screenshot-manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
print(f'Validated {len(manifest)} PNG review images; production assets unchanged.')
