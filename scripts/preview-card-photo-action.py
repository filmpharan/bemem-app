"""Static UI mockup from exported production values. Never reads Wallet data."""
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[1]
DATA = json.loads((ROOT / 'output/minimal-photo-action-review.json').read_text(encoding='utf-8'))
FONT = ROOT / 'assets/fonts/lagoon/manrope.ttf'
INK = DATA['ink']
FACTOR = 1.4

def font(size):
    return ImageFont.truetype(str(FONT), round(size))

def synthetic_image(width, height):
    image = Image.new('RGB', (width, height))
    draw = ImageDraw.Draw(image)
    for y in range(height):
        t = y / max(1, height - 1)
        draw.line((0, y, width, y), fill=(round(82 + 126*t), round(116 + 96*t), round(122 + 66*t)))
    draw.rectangle((width*.06, height*.08, width*.42, height*.65), fill='#e6e9d7')
    draw.line((width*.24, height*.08, width*.24, height*.65), fill='#6c9291', width=5)
    draw.rectangle((0, height*.8, width, height), fill='#a47c62')
    draw.ellipse((width*.72, height*.16, width*.9, height*.7), fill='#4c7965')
    draw.rectangle((width*.78, height*.65, width*.91, height*.87), fill='#d7b2a0')
    return image

def card(case):
    width, height = round(case['width']*FACTOR), round(case['height']*FACTOR)
    if case['userPhoto']:
        image = synthetic_image(width, height).convert('RGBA')
    else:
        path = ROOT / f"assets/card-faces/vivid-lagoon-v1/art-bemem-vl1-front-{case['color']}.png"
        image = ImageOps.fit(Image.open(path).convert('RGBA'), (width, height), method=Image.Resampling.LANCZOS)
    draw = ImageDraw.Draw(image)
    # The existing Form only shows preview text when its painted height >=100dp.
    if case['height'] >= 100:
        draw.text((8*FACTOR, 8*FACTOR), 'Test Member', fill=INK, font=font(14*FACTOR))
    action, target = case['action'], case['targetStyle']
    icon_size = round(action['iconSize']*FACTOR)
    icon = Image.open(ROOT / 'output/minimal-photo-action-camera.png').convert('RGBA').resize((icon_size, icon_size), Image.Resampling.LANCZOS)
    label_font = font(action['fontSize']*FACTOR)
    label = action['label']
    text_width = round(draw.textlength(label, font=label_font)) if label else 0
    group_width = max(icon_size, text_width) + round(8*FACTOR)
    group_height = round((action['visualHeight']+8)*FACTOR)
    center_x = (target['left'] + target['width']/2)*FACTOR
    center_y = (target['top'] + target['height']/2)*FACTOR
    group_left, group_top = round(center_x-group_width/2), round(center_y-group_height/2)
    if case['userPhoto']:
        backing = Image.new('RGBA', image.size)
        ImageDraw.Draw(backing).rounded_rectangle((group_left, group_top, group_left+group_width, group_top+group_height), radius=6*FACTOR, fill=(255, 255, 255, 214))
        image = Image.alpha_composite(image, backing)
    image.alpha_composite(icon, (round(center_x-icon_size/2), group_top+round(4*FACTOR)))
    if label:
        draw = ImageDraw.Draw(image)
        draw.text((round(center_x-text_width/2), group_top+round((4+action['iconSize']+action['gap'])*FACTOR)), label, font=label_font, fill=INK)
    mask = Image.new('L', image.size)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, width, height), radius=14*FACTOR, fill=255)
    image.putalpha(mask)
    return image

board = Image.new('RGBA', (940, 1450), 'white')
draw = ImageDraw.Draw(board)
draw.text((26, 20), 'bemem - Minimal photo action', font=font(25), fill=INK)
draw.text((26, 57), 'STATIC MOCKUP - production dimensions/styles, not a Samsung screenshot', font=font(13), fill=INK)
for index, case in enumerate(DATA['cases']):
    col, row = index % 2, index // 2
    x, y = 26+col*460, [96, 360, 620, 990][row]
    draw.text((x, y), f"{case['label']}  {case['id']}", font=font(14), fill=INK)
    if case['userPhoto']:
        draw.text((x, y+23), 'With photo state - synthetic image fixture', font=font(12), fill=INK)
    artwork = card(case)
    board.alpha_composite(artwork, (round(x+(420-artwork.width)/2), y+48))
# Extra compact color strip verifies the same dark ink against all approved PNGs.
draw.text((486, 1038), 'Same action on all eight matte colors', font=font(13), fill=INK)
for index, color in enumerate(['gray','brown','red','green','blue','purple','pink','orange']):
    base = DATA['cases'][0]
    sample = card({**base, 'color':color})
    sample.thumbnail((96, 64), Image.Resampling.LANCZOS)
    x, y = 486+(index%4)*106, 1080+(index//4)*99
    board.alpha_composite(sample, (x, y))
    draw.text((x, y+67), color, font=font(11), fill=INK)
draw.text((26, 1416), 'Touch targets are transparent; shown artwork files are unmodified.', font=font(12), fill=INK)
board.convert('RGB').save(ROOT / 'output/minimal-photo-action-review.png', optimize=True)
print('Created output/minimal-photo-action-review.png (940 x 1450, static mockup)')
