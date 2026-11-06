// Presentation/grid tests on Node; native font metrics still need Samsung validation.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const cache = new Map();
function load(relative) {
  const file = path.resolve(root, relative);
  if (cache.has(file)) return cache.get(file).exports;
  const module = { exports: {} }; cache.set(file, module);
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const localRequire = name => name.startsWith('.')
    ? load(path.resolve(path.dirname(file), name + '.ts')) : require(name);
  vm.runInThisContext(`(function(require,module,exports){${code}\n})`, { filename: file })(localRequire, module, module.exports);
  return module.exports;
}
const { searchReflow } = load('src/lib/search-reflow.ts');
const { PREVIEW_CARDS: cards, INITIAL_LAYOUT: saved } = load('src/data/wallet-preview.ts');
const { canPlace, cardSize, canvasMetrics, COLUMNS } = load('src/lib/canvas-layout.ts');

test('Every individual name match is first and starts at grid origin; every other card remains', () => {
  for (const card of cards) {
    const result = searchReflow(cards, saved, card.name, true);
    assert.equal(result.cards[0], card);
    assert.deepEqual(result.layout[card.id], { col: 0, row: 0 });
    assert.equal(result.cards.length, cards.length);
    assert.deepEqual(new Set(result.cards.map(c => c.id)), new Set(cards.map(c => c.id)));
    assert.equal(result.matchCount, 1);
  }
});

test('Multiple matches precede nonmatches with stable ties, visually and in render order', () => {
  const mixed = cards.map((c, i) => ({ ...c, name: i === 1 || i === 3 ? `Match ${i}` : c.name }));
  const result = searchReflow(mixed, saved, 'match', true);
  assert.deepEqual(result.cards.map(c => c.id), [mixed[1].id, mixed[3].id, mixed[0].id, mixed[2].id]);
  const positions = result.cards.map(c => result.layout[c.id]);
  for (let i = 1; i < positions.length; i++) {
    assert.ok(positions[i].row > positions[i - 1].row || positions[i].row === positions[i - 1].row && positions[i].col > positions[i - 1].col);
  }
  assert.deepEqual(searchReflow(mixed, saved, 'MATCH', true).layout, result.layout);
});

test('No matches retains every card in original stable order and reports zero matches', () => {
  const result = searchReflow(cards, saved, 'unmatched-card-name', true);
  assert.equal(result.active, true);
  assert.equal(result.matchCount, 0);
  assert.deepEqual(result.cards, cards);
  assert.equal(Object.keys(result.layout).length, cards.length);
});

test('Clear, whitespace-only, and closed Search return the exact Saved Layout, not a reset or copy', () => {
  const custom = Object.fromEntries(Object.entries(saved).map(([id, p]) => [id, { col: p.col, row: p.row + 20 }]));
  searchReflow(cards, custom, 'Travel', true);
  for (const [query, open] of [['', true], ['   ', true], ['Travel', false]]) {
    const result = searchReflow(cards, custom, query, open);
    assert.equal(result.active, false);
    assert.equal(result.layout, custom);
    assert.equal(result.cards, cards);
  }
});

test('Changing queries never mutates frozen cards/Saved Layout or the independent Draft', () => {
  const frozenCards = Object.freeze(cards.map(c => Object.freeze({ ...c })));
  const frozenSaved = Object.freeze(Object.fromEntries(Object.entries(saved).map(([id, p]) => [id, Object.freeze({ ...p })])));
  const draft = { ...saved, [cards[0].id]: { col: 0, row: 20 } };
  const before = JSON.stringify({ saved: frozenSaved, draft, cards: frozenCards });
  for (const query of ['Coffee', 'Travel', 'Club', 'none', '']) searchReflow(frozenCards, frozenSaved, query, true);
  assert.equal(JSON.stringify({ saved: frozenSaved, draft, cards: frozenCards }), before);
});

test('All 16 orientation combinations stay collision-free, in bounds, and retain orientation', () => {
  for (let mask = 0; mask < 16; mask++) {
    const mixed = cards.map((c, i) => ({ ...c, orientation: mask & (1 << i) ? 'portrait' : 'landscape' }));
    for (const query of ['Club', 'Travel', 'none']) {
      const result = searchReflow(mixed, saved, query, true);
      for (const c of result.cards) {
        assert.equal(c.orientation, mixed.find(x => x.id === c.id).orientation);
        assert.ok(canPlace(c, result.layout[c.id], mixed, result.layout));
      }
      for (const width of [208, 248, 288, 328, 568]) {
        const metrics = canvasMetrics(width, 300, mixed, result.layout, false);
        for (const c of mixed) {
          const p = result.layout[c.id], size = cardSize(c);
          assert.ok((p.col + size.cols) * metrics.unit <= width + 1e-8);
          assert.ok((p.row + size.rows) * metrics.unit <= metrics.height + 1e-8);
          assert.ok(p.col + size.cols <= COLUMNS);
        }
      }
    }
  }
});

test('Repeated all-match searches keep original tie order; empty wallets remain empty', () => {
  assert.deepEqual(searchReflow(cards, saved, 'club', true).cards, cards);
  const empty = searchReflow([], {}, 'anything', true);
  assert.deepEqual(empty.cards, []);
  assert.deepEqual(empty.layout, {});
  assert.equal(empty.matchCount, 0);
});
