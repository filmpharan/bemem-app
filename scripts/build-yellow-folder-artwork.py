"""Original yellow folder shell layers. Uses only the installed Inkscape/Pillow tools.

No card art, labels or user data are baked into these PNGs. Old shells are never touched.
"""
from pathlib import Path
import hashlib
import json
import subprocess
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'design-system/bemem-yellow-folder/artwork'
DEST = ROOT / 'assets/group-folders/yellow-top-flap-v1'
INKSCAPE = ROOT / '.artwork-tools/inkscape-1.4.2/bin/inkscape.com'
PALETTE = dict(bodyTop='#FFE4A8', body='#FFE09B', bodyBottom='#FFDA89',
               flapTop='#FFE09B', flap='#FFD17B', edge='#F2C45F', ink='#60451D')


def main():
    SOURCE.mkdir(parents=True, exist_ok=True)
    DEST.mkdir(parents=True, exist_ok=True)
    rows = []
    for orientation, width, body_height in [('landscape', 1200, 800), ('portrait', 800, 1200)]:
        for layer in ['back', 'front']:
            height = body_height if layer == 'back' else 150
            # Modest solid-to-solid yellow tonal change, no specular effects or metallic lid.
            if layer == 'back':
                shapes = f'<rect x="2" y="2" width="{width-4}" height="{height-4}" rx="72" fill="url(#tone)" stroke="{PALETTE["edge"]}" stroke-width="3"/>'
                top, bottom = PALETTE['bodyTop'], PALETTE['bodyBottom']
            else:
                shapes = f'<path d="M72 2H{width-72}Q{width-2} 2 {width-2} 72V128Q{width-2} 146 {width-20} 146H20Q2 146 2 128V72Q2 2 72 2Z" fill="url(#tone)"/><path d="M20 146H{width-20}" stroke="{PALETTE["edge"]}" stroke-width="4" stroke-linecap="round"/>'
                top, bottom = PALETTE['flapTop'], PALETTE['flap']
            svg = f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}"><defs><linearGradient id="tone" x1="0" y1="0" x2="0" y2="1"><stop stop-color="{top}"/><stop offset="1" stop-color="{bottom}"/></linearGradient></defs>{shapes}</svg>\n'
            source = SOURCE / f'{orientation}-{layer}.svg'
            source.write_text(svg, encoding='utf-8')
            target = DEST / f'{orientation}-{layer}.png'
            if target.exists():
                # Never silently replace an already produced shell under the same version.
                raise RuntimeError('Asset already exists; use a new version for revisions: '+str(target))
            subprocess.run([str(INKSCAPE), str(source), '--export-area-page', '--export-background-opacity=0', f'--export-filename={target}'], capture_output=True, check=True)
            with Image.open(target) as image:
                image.load()
                rgba = image.convert('RGBA')
                assert rgba.size == (width, height)
                assert rgba.getchannel('A').getextrema() == (0, 255)
                rgba.save(target, format='PNG', optimize=True)
            data = target.read_bytes()
            rows.append(dict(orientation=orientation, layer=layer, width=width, height=height,
                             runtime=target.relative_to(ROOT).as_posix(), source=source.relative_to(ROOT).as_posix(),
                             byteLength=len(data), sha256=hashlib.sha256(data).hexdigest(),
                             decoded=True, mode='RGBA', alphaRange=[0, 255]))
    manifest = dict(version='yellow-top-flap-v1', status='WAITING FOR SAMSUNG ACCEPTANCE',
                    method='Original programmatically authored vector masters; Inkscape transparent export',
                    palette=PALETTE, assets=rows, bytes=sum(r['byteLength'] for r in rows))
    (DEST / 'MANIFEST.json').write_text(json.dumps(manifest, indent=2)+'\n', encoding='utf-8')
    print(json.dumps(dict(assets=4, bytes=manifest['bytes'], realTransparency=True)))


if __name__ == '__main__':
    main()
