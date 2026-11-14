const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..'), cache = new Map();
function load(relative) {
  const file = path.resolve(root, relative);
  if (cache.has(file)) return cache.get(file).exports;
  const module = { exports: {} }; cache.set(file, module);
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const dependency = name => {
    assert.ok(name.startsWith('.'), 'Foundation must not import native/network/storage packages');
    assert.ok(!/storage|repository|migration|coordinator/.test(name), 'Geometry cannot access wallet files');
    return load(path.resolve(path.dirname(file), name + '.ts'));
  };
  vm.runInThisContext(`(function(require,module,exports){${code}\n})`, { filename: file })(dependency, module, module.exports);
  return module.exports;
}
const grid = load('src/lib/canvas-layout.ts');
const { CARD_SIZE_PRESETS } = load('src/lib/card-size-presets.ts');
const { PREVIEW_CARDS: demos, INITIAL_LAYOUT: legacy } = load('src/data/wallet-preview.ts');
const { searchReflow } = load('src/lib/search-reflow.ts');
const samples = load('src/lib/sandbox-preview.ts');
const card = (id, preset = 'card-landscape') => ({ id, name: id, orientation: 'landscape', colors: ['#244eab', '#189ac0'], sizePresetId: preset });
const decoration = id => ({ id, name: id, orientation: 'landscape', colors: ['#000000', '#ffffff'], kind: 'decoration' });
const clone = value => JSON.parse(JSON.stringify(value));

test('One square logical unit uses actual canvas width with zero logical gap', () => {
  for (const width of [208, 288, 328, 380, 568]) {
    const metrics = grid.canvasMetrics(width, 300, demos, legacy, true);
    assert.equal(metrics.unit, width / 12); assert.equal(metrics.gap, 0);
    const one = grid.canvasItemFrame(decoration('one'), { col: 0, row: 0 }, metrics.unit);
    const next = grid.canvasItemFrame(decoration('two'), { col: 1, row: 0 }, metrics.unit);
    assert.equal(one.width, one.height); assert.equal(one.left + one.width, next.left);
  }
});
test('All seven footprints are integer blocks from the existing preset definitions', () => {
  const expected = [[3, 2], [6, 4], [7, 3], [8, 4], [2, 3], [4, 6], [5, 7]];
  CARD_SIZE_PRESETS.forEach((preset, index) => {
    const footprint = grid.cardSize(card(preset.id, preset.id));
    assert.deepEqual([footprint.cols, footprint.rows], expected[index]);
  });
});
test('Legacy demo IDs, full footprints and saved coordinates remain compatible', () => {
  assert.deepEqual(demos.map(c => c.id), ['demo-coffee', 'demo-everyday', 'demo-travel', 'demo-weekend']);
  assert.deepEqual(demos.map(c => grid.cardSize(c)), [{ cols: 6, rows: 4 }, { cols: 4, rows: 6 }, { cols: 6, rows: 4 }, { cols: 4, rows: 6 }]);
  const before = clone(legacy); assert.deepEqual(grid.validateLayout(legacy, demos), before);
  assert.deepEqual(legacy, before);
});
test('Card paint inset is one tenth of a block per side, not a collision gap', () => {
  const item = card('portrait', 'card-portrait');
  const frame = grid.canvasItemFrame(item, { col: 1, row: 2 }, 30);
  assert.equal(frame.left, 33); assert.equal(frame.top, 63);
  assert.equal(frame.width, 3.8 * 30); assert.equal(frame.height, 5.8 * 30);
  assert.equal(grid.canPlace(decoration('piece'), { col: 3, row: 5 }, [item], { portrait: { col: 0, row: 0 } }, Infinity), false);
});
test('Future decorations occupy exactly one full uninset block and cannot overlap', () => {
  const piece = decoration('one'), second = decoration('two');
  assert.deepEqual(grid.cardSize(piece), { cols: 1, rows: 1 });
  assert.deepEqual(grid.canvasItemFrame(piece, { col: 1, row: 2 }, 30), { left: 30, top: 60, width: 30, height: 30 });
  assert.equal(grid.canPlace(second, { col: 0, row: 0 }, [piece], { one: { col: 0, row: 0 } }, Infinity), false);
  assert.equal(grid.canPlace(second, { col: 1, row: 0 }, [piece], { one: { col: 0, row: 0 } }, Infinity), true);
});
test('First fit scans left-to-right and then rows, including small earlier holes', () => {
  const left = card('left', 'card-landscape'), right = card('right', 'card-portrait');
  const items = [left, right], layout = { left: { col: 0, row: 0 }, right: { col: 7, row: 0 } };
  assert.deepEqual(grid.firstFreePosition(decoration('piece'), items, layout), { col: 6, row: 0 });
  assert.deepEqual(grid.firstFreePosition(card('mini', 'mini-landscape'), items, layout), { col: 0, row: 4 });
});
test('Automatic placement never moves or mutates existing objects', () => {
  const state = samples.initialSandboxPreview(), before = clone(state);
  const next = samples.appendSandboxSamples(state);
  for (const existing of state.cards) assert.deepEqual(next.layout[existing.id], state.layout[existing.id]);
  assert.deepEqual(state, before); assert.equal(next.cards.length, 14);
});
test('Placement and metrics grow past row 240 with the unbounded Sandbox option', () => {
  const cards = [], layout = {};
  for (let index = 0; index < 124; index++) {
    const next = card(`synthetic-${index}`);
    layout[next.id] = grid.firstFreePosition(next, cards, layout); cards.push(next);
  }
  assert.ok(Math.max(...Object.values(layout).map(p => p.row)) > 240);
  const metrics = grid.canvasMetrics(360, 300, cards, layout, true, Infinity);
  assert.ok(metrics.rows > 240);
  for (const item of cards) assert.ok(grid.canPlace(item, layout[item.id], cards, layout, Infinity));
});
test('Legacy validator and writer boundary remain 240; unbounded positions never leak into v1', () => {
  const beyond = { ...legacy, [demos[0].id]: { col: 0, row: 250 } };
  assert.equal(grid.MAX_ROWS, 240);
  assert.throws(() => grid.validateLayout(beyond, demos));
  assert.equal(grid.canPlace(demos[0], beyond[demos[0].id], demos, beyond), false);
  assert.equal(grid.canPlace(demos[0], beyond[demos[0].id], demos, beyond, Infinity), true);
});
test('Drag snapping uses the same square unit and full seven-preset footprints', () => {
  for (const preset of CARD_SIZE_PRESETS) {
    const item = card('drag', preset.id), size = grid.cardSize(item);
    assert.deepEqual(grid.dropPosition(item, { col: 0, row: 0 }, 44, 76, 30, Infinity), { col: 1, row: 3 });
    assert.equal(grid.dropPosition(item, { col: 0, row: 0 }, 99999, 0, 30, Infinity).col, 12 - size.cols);
    assert.equal(grid.dropPosition(item, { col: 0, row: 0 }, -999, -999, 30, Infinity).row, 0);
  }
});
test('Resize placement ignores only its own old slot and preserves every neighbor', () => {
  const current = card('resized', 'mini-landscape'), neighbor = card('neighbor');
  const layout = { resized: { col: 0, row: 0 }, neighbor: { col: 3, row: 0 } }, before = clone(layout);
  const bigger = { ...current, sizePresetId: 'boarding-pass-landscape' };
  assert.deepEqual(grid.firstFreePosition(bigger, [current, neighbor], layout), { col: 0, row: 4 });
  assert.deepEqual(layout, before);
});
test('Search shows matching cards only and hides even matching decoration names', () => {
  const items = [card('match', 'mini-landscape'), card('other'), decoration('match-piece')];
  const layout = { match: { col: 0, row: 20 }, other: { col: 0, row: 30 }, 'match-piece': { col: 0, row: 40 } };
  const result = searchReflow(items, layout, 'match', true, Infinity);
  assert.deepEqual(result.cards.map(c => c.id), ['match']); assert.deepEqual(result.layout, { match: { col: 0, row: 0 } });
  assert.equal(searchReflow(items, layout, '', true, Infinity).layout, layout);
  assert.equal(searchReflow(items, layout, '', true, Infinity).cards, items);
});
test('All seven matching shapes reflow collision-free without changing saved coordinates', () => {
  const state = samples.initialSandboxPreview(), before = clone(state);
  const cards = state.cards.map(c => ({ ...c, name: 'Match ' + c.name }));
  const result = searchReflow(cards, state.layout, 'match', true, Infinity);
  assert.equal(result.cards.length, 7);
  assert.deepEqual(result.layout[result.cards[0].id], { col: 0, row: 0 });
  for (const item of result.cards) assert.ok(grid.canPlace(item, result.layout[item.id], result.cards, result.layout, Infinity));
  assert.deepEqual(state, before); assert.equal(searchReflow(cards, state.layout, '', false).layout, state.layout);
});
test('Memory-only preview rejects overlap and cannot modify the demo wallet fixtures', () => {
  const before = clone({ demos, legacy }), state = samples.initialSandboxPreview();
  const first = state.cards[0], second = state.cards[1];
  assert.equal(samples.moveSandboxSample(state, first.id, state.layout[second.id]), state);
  const moved = samples.moveSandboxSample(state, first.id, { col: 0, row: 260 });
  assert.notEqual(moved, state); assert.equal(moved.layout[first.id].row, 260);
  assert.deepEqual({ demos, legacy }, before);
});
test('Developer route is gated before mounting the Sandbox and exposes no wallet storage imports', () => {
  const file = path.join(root, 'src/app/dev-sandbox.tsx'), module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText;
  const allowed = {
    react: {}, 'react-native': { StyleSheet: { create: value => value } },
    'react/jsx-runtime': { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
    'react-native-safe-area-context': {}, 'expo-router': { Redirect: 'Redirect' },
    '@/components/bemem/CardPreview': {}, '@/components/bemem/GlassButton': {}, '@/components/bemem/WalletCanvas': {},
    '@/constants/lagoon-theme': { lagoon: { canvas: {}, text: {}, surface: {} }, lagoonFonts: {} },
    '@/lib/sandbox-preview': {}, '@/lib/search-reflow': {},
  };
  const requireAllowed = name => { assert.ok(Object.hasOwn(allowed, name), `Unexpected dev route import: ${name}`); return allowed[name]; };
  for (const dev of [false, true]) {
    vm.runInThisContext(`(function(require,module,exports,__DEV__){${code}\n})`, { filename: file })(requireAllowed, module, module.exports, dev);
    const route = module.exports.default();
    if (dev) assert.equal(typeof route.type, 'function');
    else { assert.equal(route.type, 'Redirect'); assert.equal(route.props.href, '/'); }
  }
});
