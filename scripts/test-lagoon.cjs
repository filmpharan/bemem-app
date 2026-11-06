// Token contract checks only. These do not replace Android/iOS visual validation.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const original = require('../design-system/bemem-lagoon-glass/TOKENS.json');
const next = require('../design-system/bemem-lagoon-glass-rc2/TOKENS.json');

function luminance(hex) {
  const c = hex.match(/[a-f0-9]{2}/gi).map(n => parseInt(n, 16) / 255)
    .map(n => n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4);
  return c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722;
}
function contrast(a, b) {
  const x = luminance(a), y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

test('Pearl Gray is the new default; rc.1 and all six palettes remain intact', () => {
  assert.equal(original.metadata.defaultThemeId, 'lagoon-mint');
  assert.equal(next.metadata.defaultThemeId, 'pearl-gray');
  assert.equal(next.themeApiContract.defaultThemeId, 'pearl-gray');
  assert.equal(Object.keys(next.palettes).length, 6);
  assert.deepEqual(next.palettes, original.palettes);
  assert.deepEqual(next.core, original.core);
});

test('All semantic/component token references resolve for every palette', () => {
  function walk(value, root, trail = []) {
    if (typeof value === 'string' && /^\{.*\}$/.test(value)) {
      const key = value.slice(1, -1);
      assert.ok(!trail.includes(key), `Cyclic reference: ${key}`);
      const resolved = key.split('.').reduce((v, part) => v?.[part], root);
      assert.notEqual(resolved, undefined, `Unknown token: ${key}`);
      walk(resolved, root, [...trail, key]);
    } else if (value && typeof value === 'object') {
      Object.values(value).forEach(v => walk(v, root, trail));
    }
  }
  for (const { colors } of Object.values(next.palettes)) {
    const root = { ...next, palette: colors };
    walk(next.semantic, root);
    walk(next.components, root);
    walk(next.core.materials, root);
  }
});

test('Opaque fallback text/action contrast passes 4.5:1 in all six palettes', () => {
  for (const { colors: c } of Object.values(next.palettes)) {
    for (const bg of [c.canvas.base, c.canvas.high, c.canvas.low, c.surface.base]) {
      assert.ok(contrast(c.text.primary, bg) >= 4.5);
      assert.ok(contrast(c.text.secondary, bg) >= 4.5);
    }
    assert.ok(contrast(c.text.onAction, c.action.primary) >= 4.5);
  }
});
