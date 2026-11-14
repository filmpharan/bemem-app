#!/usr/bin/env python3
"""Prepare and QA 13 original bemem Decorate trial illustrations.

Inputs: 96x96 SVG masters or square transparent PNG/WebP artist exports.
Outputs: transparent RGBA PNGs (192x192), contact sheet, and asset manifest.
Never modifies the master sources, never installs tools or project packages.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError as exc:
    raise SystemExit(
        'Pillow is required for artwork preparation. Request approval before '
        'installing it into your Python environment (package name: Pillow).'
    ) from exc


# IDs are stable and intentionally shared with the SKILL.md art contract.
ROSTER = [
    ('pet-cat', 'Pet & Care', False, ()),
    ('pet-dog', 'Pet & Care', False, ()),
    ('pet-paw', 'Pet & Care', False, ()),
    ('travel-suitcase', 'Travel Diary', False, ()),
    ('travel-plane', 'Travel Diary', False, ()),
    ('travel-cloud', 'Travel Diary', False, ()),
    ('wellness-flower', 'Wellness', False, ()),
    ('wellness-leaf', 'Wellness', False, ()),
    ('wellness-teacup', 'Wellness', False, ()),
    ('vine-straight', 'Botanical Frame', True, ('W', 'E')),
    ('vine-corner', 'Botanical Frame', True, ('W', 'S')),
    ('vine-end', 'Botanical Frame', True, ('W',)),
    ('vine-flower-accent', 'Botanical Frame', False, ()),
]
SUFFIXES = ('.svg', '.png', '.webp')
RENDER_PX = 192


def resolve_inkscape(requested: str | None) -> str | None:
    if requested:
        p = Path(requested)
        if p.is_file():
            return str(p.resolve())
        found = shutil.which(requested)
        return found
    found = shutil.which('inkscape') or shutil.which('inkscape.exe')
    if found:
        return found
    if sys.platform == 'win32':
        for p in (
            Path(r'C:\Program Files\Inkscape\bin\inkscape.exe'),
            Path(r'C:\Program Files\Inkscape\inkscape.exe'),
        ):
            if p.is_file():
                return str(p)
    return None


def render_svg(source: Path, target: Path, inkscape: str | None) -> None:
    if inkscape is None:
        raise ValueError('Inkscape is required to render SVG files; install it only with approval or pass --inkscape PATH.')
    # Page area, not drawing bounding box: modular frame edges MUST remain at x=0 and x=192.
    cmd = [
        inkscape, str(source),
        '--export-area-page',
        '--export-type=png',
        '--export-background-opacity=0',
        f'--export-width={RENDER_PX}',
        f'--export-height={RENDER_PX}',
        f'--export-filename={target}',
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=45)
    if result.returncode != 0 or not target.is_file():
        raise ValueError(f'Inkscape failed for {source.name}: {(result.stderr or result.stdout).strip()}')


def read_and_normalize(source: Path, inkscape: str | None, tempdir: Path) -> Image.Image:
    actual_source = source
    if source.suffix.lower() == '.svg':
        # Refuse obviously non-square source pages rather than stretching coordinates.
        from xml.etree import ElementTree as ET
        root = ET.parse(source).getroot()
        vb = root.attrib.get('viewBox', '').replace(',', ' ').split()
        if len(vb) != 4 or [float(v) for v in vb] != [0.0, 0.0, 96.0, 96.0]:
            raise ValueError(f'{source.name}: SVG master requires viewBox="0 0 96 96"')
        if any(tag.endswith('}image') or tag == 'image' for tag in (el.tag for el in root.iter())):
            raise ValueError(f'{source.name}: SVG master contains embedded raster <image>; use clean vector artwork.')
        actual_source = tempdir / f'{source.stem}.png'
        render_svg(source, actual_source, inkscape)
    with Image.open(actual_source) as opened:
        opened.load()
        if opened.format != 'PNG' and source.suffix.lower() == '.png':
            raise ValueError(f'{source.name}: content is {opened.format}, not a genuine PNG file')
        if opened.format != 'WEBP' and source.suffix.lower() == '.webp':
            raise ValueError(f'{source.name}: content is {opened.format}, not genuine WebP')
        if opened.width != opened.height:
            raise ValueError(f'{source.name}: expected square master, got {opened.size}; no automatic crop/stretch')
        if opened.width < 96:
            raise ValueError(f'{source.name}: source too small ({opened.size}) for clean 1x1 artwork')
        img = opened.convert('RGBA')
    if img.size != (RENDER_PX, RENDER_PX):
        img = img.resize((RENDER_PX, RENDER_PX), Image.Resampling.LANCZOS)
    extrema = img.getchannel('A').getextrema()
    if extrema == (0, 0):
        raise ValueError(f'{source.name}: completely invisible/transparent artwork')
    if extrema[0] == 255:
        raise ValueError(f'{source.name}: fully opaque artwork; fix the background in the original drawing. Do not auto-remove white.')
    return img


def edge_anchor_alpha(image: Image.Image, side: str) -> int:
    w, h = image.size
    alpha = image.getchannel('A')
    if side in ('W', 'E'):
        x = 0 if side == 'W' else w - 1
        return max(alpha.getpixel((x, y)) for y in range(h // 2 - 3, h // 2 + 4))
    y = 0 if side == 'N' else h - 1
    return max(alpha.getpixel((x, y)) for x in range(w // 2 - 3, w // 2 + 4))


def checkerboard(size: tuple[int, int], tile: int = 12) -> Image.Image:
    out = Image.new('RGBA', size, (255, 255, 255, 255))
    d = ImageDraw.Draw(out)
    for y in range(0, size[1], tile):
        for x in range(0, size[0], tile):
            if (x // tile + y // tile) % 2:
                d.rectangle((x, y, min(size[0], x + tile) - 1, min(size[1], y + tile) - 1), fill=(232, 230, 226, 255))
    return out


def render_sheet(art: dict[str, Image.Image], output: Path) -> None:
    cols, cell_w, cell_h, top = 4, 196, 182, 50
    rows = (len(ROSTER) + cols - 1) // cols
    footer_h = 250
    sheet = Image.new('RGB', (cols * cell_w, top + rows * cell_h + footer_h), '#F7F3EE')
    d = ImageDraw.Draw(sheet)
    font = ImageFont.load_default()
    d.text((20, 18), 'bemem  |  Decorate  |  Cozy Cute asset QA', fill='#725A50', font=font)
    for idx, (id_, category, _, _) in enumerate(ROSTER):
        x = (idx % cols) * cell_w + 11
        y = top + (idx // cols) * cell_h + 5
        tile = checkerboard((115, 115))
        tile.alpha_composite(art[id_].resize((115, 115), Image.Resampling.LANCZOS))
        sheet.paste(tile.convert('RGB'), (x, y))
        small = checkerboard((36, 36), tile=6)
        small.alpha_composite(art[id_].resize((36, 36), Image.Resampling.LANCZOS))
        sheet.paste(small.convert('RGB'), (x + 124, y + 38))
        d.text((x, y + 120), id_, fill='#725A50', font=font)
        d.text((x, y + 135), category, fill='#7D8E80', font=font)
    section_y = top + rows * cell_h + 15
    d.text((18, section_y), 'FRAME JOIN PREVIEW (checkerboard is for QA only)', fill='#725A50', font=font)

    def tile(name: str, turn: int = 0, sz: int = 62) -> Image.Image:
        im = art[name]
        if turn:
            im = im.rotate(-turn, resample=Image.Resampling.BICUBIC, expand=False)
        return im.resize((sz, sz), Image.Resampling.LANCZOS)

    # 1. Straight run: end pointing E, straight W-E, end pointing W.
    sx, sy, step = 25, section_y + 28, 62
    preview = checkerboard((step * 3, step), tile=8)
    for col, (name, deg) in enumerate((('vine-end', 180), ('vine-straight', 0), ('vine-end', 0))):
        preview.alpha_composite(tile(name, deg), dest=(col * step, 0))
    sheet.paste(preview.convert('RGB'), (sx, sy))
    d.text((sx, sy + step + 5), 'straight | cap - straight - cap', fill='#725A50', font=font)

    # 2. L-shaped path: cap -> straight -> corner -> corner -> cap.
    lx, ly = 395, sy
    preview = checkerboard((step * 3, step * 2), tile=8)
    turns = [(0, 0, 'vine-end', 180), (1, 0, 'vine-straight', 0),
             (2, 0, 'vine-corner', 0), (2, 1, 'vine-corner', 90),
             (1, 1, 'vine-end', 180)]
    for col, row, name, deg in turns:
        preview.alpha_composite(tile(name, deg), dest=(col * step, row * step))
    sheet.paste(preview.convert('RGB'), (lx, ly))
    d.text((lx, ly + step * 2 + 5), 'L-frame | connection + clockwise rotation', fill='#725A50', font=font)
    sheet.save(output, format='PNG', optimize=True)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--input', type=Path, required=True, help='Directory containing 13 originals as SVG, transparent PNG, or WebP')
    ap.add_argument('--output', type=Path, required=True, help='Review-only destination (must not be input folder)')
    ap.add_argument('--inkscape', default=None, help='Optional Inkscape executable path')
    args = ap.parse_args()
    src = args.input.expanduser().resolve()
    out = args.output.expanduser().resolve()
    if not src.is_dir():
        ap.error(f'Input directory does not exist: {src}')
    if out == src or src in out.parents:
        ap.error('Output must be a separate directory OUTSIDE the source directory')
    if src == out or out in src.parents:
        ap.error('Input may not be inside the output directory')
    selected: dict[str, Path] = {}
    errors: list[str] = []
    for id_, _, _, _ in ROSTER:
        matches = [p for p in src.iterdir() if p.is_file() and p.stem.casefold() == id_ and p.suffix.lower() in SUFFIXES]
        if len(matches) != 1:
            errors.append(f'{id_}: expected exactly one matching .svg/.png/.webp master; found {len(matches)}')
        else:
            selected[id_] = matches[0]
    if errors:
        print('Asset input check FAILED:\n' + '\n'.join(' - ' + e for e in errors), file=sys.stderr)
        return 1

    inkscape = resolve_inkscape(args.inkscape)
    if any(p.suffix.lower() == '.svg' for p in selected.values()) and not inkscape:
        print('SVG master found, but Inkscape is unavailable. Supply --inkscape path. No software was installed.', file=sys.stderr)
        return 1
    art: dict[str, Image.Image] = {}
    manifest_items: list[dict] = []
    with tempfile.TemporaryDirectory(prefix='bemem-illustrator-') as td:
        temp = Path(td)
        for id_, category, rotatable, edges in ROSTER:
            source = selected[id_]
            try:
                im = read_and_normalize(source, inkscape, temp)
                if edges:
                    for side in edges:
                        alpha = edge_anchor_alpha(im, side)
                        if alpha < 128:
                            raise ValueError(f'{source.name}: connection anchor {side} is missing/transparent (alpha={alpha})')
                art[id_] = im
                alpha = im.getchannel('A')
                manifest_items.append({
                    'id': id_, 'collection': category, 'source': source.name,
                    'png': f'png/{id_}.png', 'footprint': {'cols': 1, 'rows': 1},
                    'rotatable': rotatable, 'connectors': list(edges),
                    'size_px': [RENDER_PX, RENDER_PX], 'mode': 'RGBA',
                    'alpha_min_max': list(alpha.getextrema()),
                })
            except (ValueError, OSError, RuntimeError, subprocess.TimeoutExpired) as exc:
                errors.append(str(exc))
    if errors:
        print('Asset QA FAILED (no output files were written):\n' + '\n'.join(' - ' + e for e in errors), file=sys.stderr)
        return 1

    png_dir = out / 'png'
    png_dir.mkdir(parents=True, exist_ok=True)
    for entry in manifest_items:
        p = png_dir / f"{entry['id']}.png"
        art[entry['id']].save(p, format='PNG', compress_level=9, optimize=True)
        with Image.open(p) as verify:
            verify.load()
            if verify.format != 'PNG' or verify.mode != 'RGBA' or verify.size != (RENDER_PX, RENDER_PX):
                raise RuntimeError(f'Invalid output format: {p}')
        entry['bytes'] = p.stat().st_size
        entry['sha256'] = hashlib.sha256(p.read_bytes()).hexdigest()
    render_sheet(art, out / 'contact-sheet.png')
    (out / 'asset-manifest.json').write_text(
        json.dumps({'version': 1, 'status': 'ART REVIEW ONLY - NOT APPROVED FOR APP',
                    'png_format': 'RGBA transparent 192x192', 'assets': manifest_items}, indent=2, ensure_ascii=False),
        encoding='utf-8',
    )
    print(f'PASS: {len(manifest_items)} RGBA PNGs exported to {png_dir}')
    print(f'Contact sheet: {out / "contact-sheet.png"}')
    print(f'Manifest: {out / "asset-manifest.json"}')
    print(f'PNG payload total: {sum(e["bytes"] for e in manifest_items):,} bytes')
    print('NOTE: Visual art quality, exact real Samsung scale, and frame seam appearance still require human review.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
