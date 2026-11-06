"""Read ONLY the new design artifact. No application, storage or network imports."""
from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parent
DS = ROOT.parent.parent / 'design-system' / 'bemem-lagoon-glass'


def load_contract():
    return json.loads((DS / 'TOKENS.json').read_text(encoding='utf-8'))


def resolve_theme(theme_id, data=None):
    data = data or load_contract()
    if theme_id not in data['palettes']:
        raise ValueError('Unknown preview palette: ' + theme_id)
    context = {**data, 'palette': data['palettes'][theme_id]['colors']}

    def resolve(value, stack=()):
        if isinstance(value, dict):
            return {key: resolve(item, stack) for key, item in value.items()}
        if isinstance(value, list):
            return [resolve(item, stack) for item in value]
        if isinstance(value, str) and re.fullmatch(r'\{[A-Za-z0-9_.-]+\}', value):
            name = value[1:-1]
            if name in stack:
                raise ValueError('Cyclic token alias: ' + name)
            item = context
            for key in name.split('.'):
                if key not in item:
                    raise ValueError('Unresolved token alias: ' + name)
                item = item[key]
            return resolve(item, stack + (name,))
        return value

    return {key: resolve(context[key]) for key in ['core', 'semantic', 'components', 'platformRendering']}


def rgba(color, alpha):
    channels = [int(color[i:i+2], 16) for i in (1, 3, 5)]
    return 'rgba(' + ', '.join(str(x) for x in channels) + f', {alpha})'


def rgb(color):
    return [int(color[i:i+2], 16) / 255 for i in (1, 3, 5)]


def luminance(color):
    return sum(w * (x / 12.92 if x <= .04045 else ((x + .055) / 1.055) ** 2.4)
               for w, x in zip((.2126, .7152, .0722), color))


def contrast(a, b):
    low, high = sorted([luminance(a), luminance(b)])
    return (high + .05) / (low + .05)


def composite(fill, alpha, background):
    return [f * alpha + b * (1 - alpha) for f, b in zip(fill, background)]
