"""Synthetic-only independent raster check using the installed isolated Pillow."""
from pathlib import Path
import json
from PIL import Image, ImageDraw, ImageChops
root=Path(__file__).resolve().parent.parent
fixtures=json.loads((root/'output/artwork-wysiwyg-fixtures.json').read_text())
dest=root/'output/artwork-wysiwyg-raster'
dest.mkdir(exist_ok=True)
sources={}
results=[]
for index,f in enumerate(fixtures):
    w,h=f['source']['width'],f['source']['height']
    if (w,h) not in sources:
        source=Image.new('RGB',(w,h),'#eee6d2')
        d=ImageDraw.Draw(source)
        for x in range(0,w,max(1,w//17)):
            d.line((x,0,x,h),fill=(x%256,70,150),width=max(1,w//170))
        for y in range(0,h,max(1,h//13)):
            d.line((0,y,w,y),fill=(70,y%256,60),width=max(1,h//160))
        d.polygon([(w*.05,h*.08),(w*.32,h*.1),(w*.12,h*.4)],fill='#b42318')
        d.ellipse((w*.57,h*.15,w*.86,h*.44),fill='#337aab')
        d.rectangle((w*.68,h*.7,w*.96,h*.93),fill='#44794d')
        d.line((w*.1,h*.75,w*.6,h*.5),fill='#263943',width=max(1,w//70))
        sources[(w,h)]=source
    source=sources[(w,h)]
    out=(f['output']['width'],f['output']['height'])
    frame=f['previewFrame'];scale=frame['width']/w
    preview=source.transform(out,Image.Transform.AFFINE,(1/scale,0,-frame['left']/scale,0,1/scale,-frame['top']/scale),resample=Image.Resampling.NEAREST)
    r=f['confirmedRegion']
    confirmed=source.transform(out,Image.Transform.EXTENT,(r['x'],r['y'],r['x']+r['width'],r['y']+r['height']),resample=Image.Resampling.NEAREST)
    diff=ImageChops.difference(preview,confirmed)
    mismatches=sum(1 for p in diff.getdata() if any(p))
    fraction=mismatches/(out[0]*out[1])
    # Equivalent paths may choose adjacent source pixels on exact nearest-neighbor boundaries.
    assert fraction<=.01,(f['preset'],index,fraction)
    results.append({'preset':f['preset'],'source':[w,h],'crop':f['crop'],'output':out,'differentPixels':mismatches,'fraction':fraction})
    if index%12==1:
        sheet=Image.new('RGB',(out[0]*2+24,out[1]+44),'#eef1f4');sheet.paste(preview,(0,30));sheet.paste(confirmed,(out[0]+24,30));d=ImageDraw.Draw(sheet);d.text((2,8),'PREVIEW',fill='#263943');d.text((out[0]+26,8),'CONFIRMED',fill='#263943');sheet.save(dest/(f['preset']+'.png'))
(dest/'results.json').write_text(json.dumps({'cases':len(results),'maxDifferentFraction':max(r['fraction'] for r in results),'results':results},indent=2))
print(f"PASS: {len(results)} independent raster cases; max different-pixel fraction {max(r['fraction'] for r in results):.6f}")
