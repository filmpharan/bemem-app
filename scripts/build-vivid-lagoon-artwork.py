"""Original flat vector compositions, exported with installed Inkscape; no screenshot crops.

Run with .artwork-tools/.venv/Scripts/python.exe scripts/build-vivid-lagoon-artwork.py.
Immutable versioned production PNGs: changing a published design requires a new ID.
Pillow checks decoding/crops and builds review sheets, not runtime artwork.
"""
from pathlib import Path
import hashlib
import json
import subprocess
import sys
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'design-system/bemem-vivid-lagoon/artwork'
DEST = ROOT / 'assets/card-faces/vivid-lagoon-v1'
REVIEW = ROOT / 'design-previews/vivid-lagoon'
INKSCAPE = ROOT / '.artwork-tools/inkscape-1.4.2/bin/inkscape.com'
# Base / middle / focal: solid sRGB fills; no gradients, shading or lighting.
PALETTE = {
    'gray': ['#E1DEDF', '#C8C4C6', '#B7B4B8'],
    'brown': ['#EED2C2', '#D9AE98', '#CD9E86'],
    'red': ['#F7CDCF', '#ECA5AA', '#DF9197'],
    'green': ['#DBE7D5', '#B3CDB1', '#9ABD9A'],
    'blue': ['#D3DDF4', '#B3C5EA', '#A0B8E3'],
    'purple': ['#E1D7EE', '#C7B4DD', '#B7A1D4'],
    'pink': ['#F7D7E1', '#F0B7CB', '#E9A7BF'],
    'orange': ['#FFE0C5', '#FFC392', '#F6AF7B'],
}
PATTERNS = {
    'gray': 'Large cropped circles and a separate circular accent',
    'brown': 'Two diagonal rounded capsule bands',
    'red': 'Overlapping arches and semicircles',
    'green': 'Interlocking soft-corner blocks',
    'blue': 'Tilted ellipses with a central oval',
    'purple': 'Offset concentric circular focus',
    'pink': 'Rounded triangles with a soft circular intersection',
    'orange': 'Four curved petal modules',
}
# Same 12-column square grid, same 0.1-block inset per side as cardPaintSize.
SIZES = [(3, 2), (6, 4), (7, 3), (8, 4), (2, 3), (4, 6), (5, 7)]


def composition(color, side):
    a, b, c = PALETTE[color]
    if side == 'back':
        # Distinct subdued echoes, leaving the centre available for future information.
        motifs = {
            'gray': f'<circle cx="1480" cy="1300" r="760" fill="{b}"/>',
            'brown': f'<path d="M1000 1700L1700 1000" stroke="{b}" stroke-width="480" stroke-linecap="round"/>',
            'red': f'<path d="M800 1536V1250a550 550 0 0 1 1100 0v286Z" fill="{b}"/>',
            'green': f'<path d="M1000 1536V1040q0-210 210-210h120q206 0 206-206v682Z" fill="{b}"/>',
            'blue': f'<ellipse cx="1440" cy="1180" rx="620" ry="310" transform="rotate(-33 1440 1180)" fill="{b}"/>',
            'purple': f'<circle cx="1630" cy="1310" r="780" fill="{b}"/><circle cx="1630" cy="1310" r="470" fill="{a}"/>',
            'pink': f'<path d="M750 1536l390-610q95-125 190 0l390 610Z" fill="{b}"/>',
            'orange': f'<path d="M900 1536q0-820 636-820v650Z" fill="{b}"/>',
        }
        # Light neutral-tinted base, exact shade recorded in manifest.
        a = tuple(int(a[i:i+2], 16) for i in (1, 3, 5))
        base = '#' + ''.join(f'{round(v*.68+255*.32):02X}' for v in a)
        return base, motifs[color]
    motifs = {
        'gray': f'<circle cx="1160" cy="390" r="440" fill="{c}"/><circle cx="350" cy="1250" r="490" fill="{b}"/><circle cx="1280" cy="1150" r="155" fill="{b}"/>',
        'brown': f'<path d="M220 970L1200 -10M600 1560L1580 580" stroke="{c}" stroke-width="370" stroke-linecap="round"/>',
        'red': f'<path d="M610 1536V750a440 440 0 0 1 880 0v786Z" fill="{c}"/><circle cx="60" cy="1300" r="680" fill="{b}"/><path d="M100 1536v-310a570 570 0 0 1 1140 0v310Z" fill="{b}"/>',
        'green': f'<path d="M600 0h936v1536H990V940q0-230-230-230H500q-220 0-220-220V0Z" fill="{c}"/><path d="M0 850h450q340 0 340 340v346H0Z" fill="{b}"/>',
        'blue': f'<ellipse cx="820" cy="810" rx="670" ry="345" transform="rotate(-33 820 810)" fill="{c}"/><ellipse cx="-60" cy="100" rx="640" ry="310" transform="rotate(-33 -60 100)" fill="{b}"/><ellipse cx="1620" cy="1450" rx="600" ry="320" transform="rotate(-33 1620 1450)" fill="{b}"/>',
        'purple': f'<circle cx="1100" cy="820" r="1000" fill="{b}"/><circle cx="1100" cy="820" r="690" fill="{a}"/><circle cx="1100" cy="820" r="420" fill="{c}"/><circle cx="1100" cy="820" r="195" fill="{b}"/>',
        'pink': f'<path d="M90 1390L620 520q100-165 200 0l530 870q65 110-65 110H155q-130 0-65-110Z" fill="{b}"/><path d="M1110 260h290q95 0 40 85l-145 230q-40 60-80 0l-145-230q-55-85 40-85Z" fill="{c}"/><circle cx="320" cy="1580" r="520" fill="{c}"/>',
        'orange': f'<path d="M160 80q610 0 610 610-610 0-610-610ZM1376 80q0 610-526 610 0-610 526-610ZM160 1456q0-686 610-686 0 686-610 686ZM1376 1456q-526 0-526-686 526 0 526 686Z" fill="{c}"/>',
    }
    return a, motifs[color]


def font(size):
    return ImageFont.truetype(str(ROOT / 'assets/fonts/lagoon/manrope.ttf'), size)


def crop(image, w, h):
    # Exact existing cover/crop calculation at crop=.5,.5 zoom=1, no stretching.
    factor = max(w / image.width, h / image.height)
    scaled = image.resize((round(image.width*factor), round(image.height*factor)), Image.Resampling.LANCZOS)
    x, y = (scaled.width-w)//2, (scaled.height-h)//2
    return scaled.crop((x, y, x+w, y+h))


def main():
    for directory in (SOURCE, DEST, REVIEW):
        directory.mkdir(parents=True, exist_ok=True)
    rows, faces = [], []
    for color in PALETTE:
        for side in ('front', 'back'):
            base, shapes = composition(color, side)
            svg = f'<svg xmlns="http://www.w3.org/2000/svg" width="1536" height="1536" viewBox="0 0 1536 1536"><rect width="1536" height="1536" fill="{base}"/>{shapes}</svg>\n'
            source = SOURCE / f'{color}-{side}.svg'
            source.write_text(svg, encoding='utf-8')
            name = f'art-bemem-vl1-{side}-{color}.png'
            target = DEST / name
            temporary = REVIEW / f'export-{color}-{side}.png'
            subprocess.run([str(INKSCAPE), str(source), '--export-area-page', '--export-width=1536', '--export-height=1536', f'--export-filename={temporary}'], check=True, capture_output=True)
            with Image.open(temporary) as image:
                image.load()
                assert image.size == (1536, 1536)
                image.convert('RGB').save(temporary, format='PNG', optimize=True)
            data = temporary.read_bytes()
            if target.exists() and target.read_bytes() != data:
                if '--refine-unreviewed' not in sys.argv or target.relative_to(ROOT).as_posix() in json.loads((ROOT/'output/vivid-lagoon-validation/before-hashes.json').read_text(encoding='utf-8')):
                    raise RuntimeError('Refusing to replace immutable published asset: ' + name)
                target.write_bytes(data)
            if not target.exists():
                target.write_bytes(data)
            temporary.unlink()  # Only this explicit generated export, never user files.
            rows.append(dict(assetId=name, color=color, side=side, width=1536, height=1536,
                             byteLength=len(data), md5=hashlib.md5(data).hexdigest(),
                             sha256=hashlib.sha256(data).hexdigest(), source=source.relative_to(ROOT).as_posix(),
                             runtime=target.relative_to(ROOT).as_posix(), base=base))
        faces.append(dict(id='matte-'+color, front=f'art-bemem-vl1-front-{color}.png',
                          back=f'art-bemem-vl1-back-{color}.png', formColorId='sky'))
    manifest = dict(collection='Vivid Lagoon Matte v1', status='awaiting Samsung acceptance',
                    production='Original programmatically authored SVG geometry, Inkscape raster export; not hand-painted or screenshot crops',
                    palette=PALETTE, patterns=PATTERNS, artworks=rows, totalBytes=sum(r['byteLength'] for r in rows))
    (DEST / 'MANIFEST.json').write_text(json.dumps(manifest, indent=2)+'\n', encoding='utf-8')
    metadata = {r['assetId']: {k:r[k] for k in ('assetId','width','height','byteLength','md5')} for r in rows}
    (ROOT / 'src/constants/matte-card-artwork.ts').write_text('// Generated by scripts/build-vivid-lagoon-artwork.py. Versioned IDs are immutable.\nexport const MATTE_CARD_ARTWORK = '+json.dumps(metadata, indent=2)+' as const;\nexport const MATTE_CARD_FACES = '+json.dumps(faces, indent=2)+' as const;\n', encoding='utf-8')
    # One sheet: actual production PNGs, all seven footprints + front/back for each colour.
    sheet = Image.new('RGB', (1520, 1320), '#FFFFFF')
    d = ImageDraw.Draw(sheet)
    d.text((24, 14), 'bemem. / Vivid Lagoon Matte / actual production artwork', font=font(26), fill='#073F3C')
    for i, color in enumerate(PALETTE):
        x, y = (i%4)*380, 68+(i//4)*620
        front = Image.open(DEST/f'art-bemem-vl1-front-{color}.png')
        back = Image.open(DEST/f'art-bemem-vl1-back-{color}.png')
        d.rounded_rectangle((x+10,y,x+370,y+604), radius=18, fill='#F5F8F8')
        d.text((x+24,y+12), color.title(), font=font(22), fill='#263943')
        sheet.paste(crop(front,324,210),(x+28,y+48))
        for j,(w,h) in enumerate(SIZES):
            unit=10
            cw,ch=round((w-.2)*unit),round((h-.2)*unit)
            col=j if j<4 else j-4
            px=x+28+col*82;py=y+282 if j<4 else y+366
            sheet.paste(crop(front,cw,ch),(px,py))
            d.text((px,py+ch+3),f'{w} x {h}',font=font(12),fill='#263943')
        sheet.paste(crop(back,324,92),(x+28,y+486))
        d.text((x+28,y+580),'Matching back',font=font(12),fill='#4C606C')
    sheet.save(REVIEW/'collection-and-footprints.png', optimize=True)
    (REVIEW/'asset-validation.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(dict(fronts=8, backs=8, footprints=56, bytes=manifest['totalBytes'])))


if __name__ == '__main__':
    main()
