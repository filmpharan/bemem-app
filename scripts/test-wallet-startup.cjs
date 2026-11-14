// Read-only integration logic with synthetic snapshots and mock storage only.
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..'), cache = new Map();
function load(relative) {
  const file = path.resolve(root, relative);
  if (cache.has(file)) return cache.get(file).exports;
  const module = { exports: {} }; cache.set(file, module);
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  function dependency(name) {
    assert.ok(name.startsWith('.'), 'Startup logic must not import native/network packages');
    assert.ok(!name.endsWith('wallet-storage') && !name.endsWith('canvas-storage'), 'No real storage adapter imports');
    return load(path.resolve(path.dirname(file), name + '.ts'));
  }
  vm.runInThisContext(`(function(require,module,exports){${code}\n})`, { filename: file })(dependency, module, module.exports);
  return module.exports;
}
const { resolveWalletStartup } = load('src/lib/wallet-startup.ts');
const { prepareWalletState, walletCanvasPresentation, walletSearchPresentation } = load('src/lib/wallet-preparation.ts');
const { createWalletRepository } = load('src/lib/wallet-repository.ts');
const { createCanvasRepository } = load('src/lib/canvas-repository.ts');
const { PREVIEW_CARDS: demos, INITIAL_LAYOUT: initial } = load('src/data/wallet-preview.ts');
const time = '2026-11-07T00:00:00.000Z';
const copy = x => JSON.parse(JSON.stringify(x));
function member(id = 'synthetic-1') {
  return { kind: 'membership', id, name: 'Synthetic Club', memberNumber: '00001', payload: ' 00001 TEST ',
    preferredDisplayFormat: 'qr', orientation: 'portrait',
    appearance: { backgroundColor: '#405764', textColor: '#ffffff', imageAssetId: null }, createdAt: time, updatedAt: time };
}
function wallet() {
  return { schemaVersion: 2, dataset: 'bemem-wallet', revision: 5, savedAt: time,
    cards: [member()], canvas: { columns: 12, layout: { 'synthetic-1': { col: 4, row: 500 } } } };
}
function legacy() {
  return { schemaVersion: 1, dataset: 'bemem-phase1-demo-v1', columns: 12, revision: 7, savedAt: time, layout: copy(initial) };
}
function readers(v2 = null, v1 = null) {
  const v2Files = new Map(), v1Files = new Map();
  if (v2 !== null) v2Files.set('wallet-0000000000000005.json', typeof v2 === 'string' ? v2 : JSON.stringify(v2));
  if (v1 !== null) v1Files.set('layout-0000000007.json', typeof v1 === 'string' ? v1 : JSON.stringify(v1));
  const counts = { writes: 0, v1Reads: 0 };
  async function forbiddenWrite() { counts.writes++; throw Error('Startup write forbidden'); }
  const repo = createWalletRepository({ scope: {}, list: async () => [...v2Files.keys()], read: async n => v2Files.get(n),
    writeExclusive: forbiddenWrite, promoteExclusive: forbiddenWrite }, { token: () => 'unused' });
  const old = createCanvasRepository({ list: async () => [...v1Files.keys()], read: async n => v1Files.get(n), commit: forbiddenWrite }, demos);
  return { v2Files, v1Files, counts, ports: { v2: repo, readV1: async () => { counts.v1Reads++; return old.load(); }, demoCards: demos, now: () => time } };
}

test('Valid latest v2 wins without reading v1 and prepares a detached Saved Wallet', async () => {
  const e = readers(wallet(), legacy()), result = await resolveWalletStartup(e.ports);
  assert.equal(result.status, 'ready'); assert.equal(result.source, 'v2');
  assert.deepEqual(result.wallet, wallet());
  assert.equal(result.expectedV2Revision, 5);
  assert.equal(result.nextPersistence, 'save');
  assert.equal(e.counts.v1Reads, 0); assert.equal(e.counts.writes, 0);
});

test('Missing v2 uses original v1 reader and prepareMigration, preserving all legacy data', async () => {
  const source = legacy(), e = readers(null, source), before = [...e.v1Files];
  const result = await resolveWalletStartup(e.ports);
  assert.equal(result.source, 'v1-memory');
  assert.deepEqual(result.wallet.canvas.layout, source.layout);
  assert.equal(result.wallet.revision, 7); assert.equal(result.wallet.savedAt, source.savedAt);
  assert.deepEqual(result.wallet.cards, demos.map(c => ({ kind: 'demo', ...c })));
  assert.equal(result.expectedV2Revision, 0);
  assert.equal(result.nextPersistence, 'explicit-phase1-import');
  assert.deepEqual([...e.v1Files], before); assert.equal(e.v2Files.size, 0); assert.equal(e.counts.writes, 0);
});

test('No versions prepares an empty v2 wallet in memory with zero writes', async () => {
  const e = readers(), result = await resolveWalletStartup(e.ports);
  assert.equal(result.source, 'empty'); assert.equal(result.wallet.revision, 0);
  assert.deepEqual(result.wallet.cards, []); assert.deepEqual(result.wallet.canvas.layout, {});
  assert.equal(result.wallet.savedAt, time);
  assert.equal(e.counts.writes, 0); assert.equal(e.v2Files.size, 0);
});

test('Corrupt latest v2 never falls back to a valid older v2 or valid v1', async () => {
  const e = readers('{broken', legacy());
  e.v2Files.set('wallet-0000000000000004.json', JSON.stringify({ ...wallet(), revision: 4 }));
  const before = [...e.v2Files], result = await resolveWalletStartup(e.ports);
  assert.equal(result.status, 'blocked'); assert.equal(result.source, 'v2'); assert.equal(result.writeBlocked, true);
  assert.equal(e.counts.v1Reads, 0); assert.equal(e.counts.writes, 0); assert.deepEqual([...e.v2Files], before);
});

test('Unsupported v2 schema blocks startup and exposes a sanitized schema error', async () => {
  const e = readers({ ...wallet(), schemaVersion: 99 }, legacy());
  const result = await resolveWalletStartup(e.ports);
  assert.equal(result.status, 'blocked'); assert.equal(result.error.validationCode, 'unsupported_schema');
  assert.equal(e.counts.v1Reads, 0); assert.equal(e.counts.writes, 0);
});

test('Unreadable v2 or malformed v1 blocks rather than inventing an empty wallet', async () => {
  const e = readers(null, '{broken');
  assert.equal((await resolveWalletStartup(e.ports)).source, 'v1');
  e.ports.v2 = { ...e.ports.v2, load: async () => { throw Error('SYNTHETIC_PRIVATE_DETAIL'); } };
  const result = await resolveWalletStartup(e.ports);
  assert.equal(result.status, 'blocked'); assert.equal(result.source, 'v2');
  assert.equal(JSON.stringify(result).includes('SYNTHETIC_PRIVATE_DETAIL'), false);
  assert.equal(e.counts.writes, 0);
});

test('Pending files stay uncommitted and require review, including when no committed version exists', async () => {
  for (const current of [null, wallet()]) {
    const e = readers(current), pending = 'wallet-0000000000000006.abandoned.pending';
    e.v2Files.set(pending, '{partial');
    const result = await resolveWalletStartup(e.ports);
    assert.equal(result.status, 'ready'); assert.equal(result.requiresPendingReview, true);
    assert.deepEqual(result.pendingFiles, [pending]);
    assert.equal(e.v2Files.get(pending), '{partial'); assert.equal(e.counts.writes, 0);
  }
});

test('Draft cards, payload, appearance, demo colors and positions cannot mutate Saved or resolver input', () => {
  const doc = wallet(); doc.cards.push({ kind: 'demo', ...demos[0] }); doc.canvas.layout[demos[0].id] = { col: 0, row: 0 };
  const before = copy(doc), state = prepareWalletState(doc);
  assert.equal(state.mode, 'home');
  state.draft.cards[0].payload = 'changed'; state.draft.cards[0].appearance.backgroundColor = '#000000';
  state.draft.cards[1].colors[0] = '#ffffff'; state.draft.canvas.layout['synthetic-1'].row = 20;
  assert.deepEqual(state.saved, before); assert.deepEqual(doc, before);
  assert.ok(Object.isFrozen(state.saved)); assert.ok(Object.isFrozen(state.saved.canvas.layout));
  assert.ok(Object.isFrozen(state.saved.cards[0].appearance));
});

test('Canvas views preserve arbitrary card counts, IDs, orientations, colors and logical positions', () => {
  const doc = wallet(); doc.cards = []; doc.canvas.layout = {};
  for (let i = 0; i < 100; i++) {
    const card = i % 2 ? member(`synthetic-${i}`) : { kind: 'demo', ...demos[0], id: `demo-${i}` };
    doc.cards.push(card); doc.canvas.layout[card.id] = { col: 0, row: i * 6 };
  }
  const view = walletCanvasPresentation(prepareWalletState(doc).saved);
  assert.equal(view.cards.length, 100);
  assert.deepEqual(view.layout, doc.canvas.layout);
  assert.deepEqual(view.cards.map(c => [c.id, c.orientation]), doc.cards.map(c => [c.id, c.orientation]));
  assert.ok(view.cards.every(c => !('payload' in c) && !('memberNumber' in c)));
  view.layout['synthetic-1'].row = 0;
  assert.equal(doc.canvas.layout['synthetic-1'].row, 6);
});

test('Search is a detached stable presentation; clear restores Saved positions without touching Saved/Draft', () => {
  const doc = wallet(); doc.cards.push({ kind: 'demo', ...demos[0] }); doc.canvas.layout[demos[0].id] = { col: 0, row: 0 };
  const state = prepareWalletState(doc), before = copy(state);
  const search = walletSearchPresentation(state.saved, 'synthetic', true);
  assert.equal(search.matchCount, 1); assert.equal(search.cards.length, 1);
  assert.deepEqual(search.layout['synthetic-1'], { col: 0, row: 0 });
  search.cards[0].name = 'presentation only'; search.layout['synthetic-1'].row = 20;
  assert.deepEqual(state, before);
  assert.deepEqual(walletSearchPresentation(state.saved, '', true).layout, doc.canvas.layout);
  assert.deepEqual(walletSearchPresentation(state.saved, 'synthetic', false).layout, doc.canvas.layout);
  assert.equal(walletSearchPresentation(state.saved, 'no-match', true).cards.length, 0);
});

test('v2 search preparation supports presentations longer than the current UI ceiling', () => {
  const doc = wallet(); doc.cards = []; doc.canvas.layout = {};
  for (let i = 0; i < 200; i++) { const card = member(`synthetic-${i}`); doc.cards.push(card); doc.canvas.layout[card.id] = { col: 0, row: i * 6 }; }
  const result = walletSearchPresentation(doc, 'Club', true);
  assert.equal(result.cards.length, 200);
  assert.ok(Math.max(...Object.values(result.layout).map(p => p.row)) > 240);
});

test('Resolver validates injected v2 data and does not trust a broken reader to bypass schema validation', async () => {
  const e = readers();
  e.ports.v2 = { ...e.ports.v2, load: async () => ({ document: { ...wallet(), schemaVersion: 3 }, pendingFiles: [] }) };
  const result = await resolveWalletStartup(e.ports);
  assert.equal(result.status, 'blocked'); assert.equal(result.error.validationCode, 'unsupported_schema');
  assert.equal(e.counts.v1Reads, 0); assert.equal(e.counts.writes, 0);
});
