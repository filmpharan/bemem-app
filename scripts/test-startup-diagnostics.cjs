// Synthetic data + mock native readers only; real Samsung results remain manual.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
function loader(mocks = {}, dev = true) {
  const cache = new Map();
  function load(relative) {
    const file = path.resolve(root, relative);
    if (cache.has(file)) return cache.get(file).exports;
    const module = { exports: {} }; cache.set(file, module);
    const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
    }).outputText;
    function dependency(name) {
      if (name in mocks) return mocks[name];
      if (name.startsWith('@/')) return load('src/' + name.slice(2) + '.ts');
      assert.ok(name.startsWith('.'), 'Unexpected native or network dependency');
      return load(path.resolve(path.dirname(file), name + '.ts'));
    }
    vm.runInThisContext(`(function(require,module,exports,__DEV__){${code}\n})`, { filename: file })(dependency, module, module.exports, dev);
    return module.exports;
  }
  return load;
}
const load = loader();
const { diagnoseWalletStartup } = load('src/lib/wallet-startup-diagnostics.ts');
const { createWalletRepository } = load('src/lib/wallet-repository.ts');
const { createCanvasRepository } = load('src/lib/canvas-repository.ts');
const { PREVIEW_CARDS: demos, INITIAL_LAYOUT: initial } = load('src/data/wallet-preview.ts');
const time = '2026-11-07T00:00:00.000Z';
function wallet(row = 0) {
  return { schemaVersion: 2, dataset: 'bemem-wallet', revision: 3, savedAt: time,
    cards: [{ kind: 'membership', id: 'synthetic-private-id', name: 'SYNTHETIC_PRIVATE_NAME', payload: ' 000001 PRIVATE ', memberNumber: '000001',
      preferredDisplayFormat: 'qr', orientation: 'portrait', appearance: { backgroundColor: '#000000', textColor: '#ffffff', imageAssetId: null }, createdAt: time, updatedAt: time }],
    canvas: { columns: 12, layout: { 'synthetic-private-id': { col: 0, row } } } };
}
const legacy = () => ({ schemaVersion: 1, dataset: 'bemem-phase1-demo-v1', columns: 12, revision: 7, savedAt: time, layout: initial });
function fixture(v2, v1) {
  const data2 = new Map(), data1 = new Map(); let mutations = 0, v1Reads = 0;
  if (v2 !== undefined) data2.set('wallet-0000000000000003.json', typeof v2 === 'string' ? v2 : JSON.stringify(v2));
  if (v1 !== undefined) data1.set('layout-0000000007.json', JSON.stringify(v1));
  const forbidden = async () => { mutations++; throw Error('Mutation forbidden'); };
  const repo = createWalletRepository({ scope: {}, list: async () => [...data2.keys()], read: async n => data2.get(n), writeExclusive: forbidden, promoteExclusive: forbidden }, { token: () => { throw Error('No transaction allowed'); } });
  const old = createCanvasRepository({ list: async () => [...data1.keys()], read: async n => data1.get(n), commit: forbidden }, demos);
  return { data2, data1, mutations: () => mutations, v1Reads: () => v1Reads,
    run: () => diagnoseWalletStartup({ v2: repo, readV1: () => { v1Reads++; return old.load(); }, demoCards: demos, now: () => time }, repo.inspect) };
}

test('v2 valid summary hides card data and preserves revision/time with read-only repeated reads', async () => {
  const f = fixture(wallet(), legacy()), before = [...f.data2];
  const result = await f.run(), output = JSON.stringify(result);
  assert.equal(result.source, 'v2'); assert.equal(result.revision, 3); assert.equal(result.readback, 'unchanged');
  for (const secret of ['000001', 'PRIVATE', 'synthetic-private-id']) assert.equal(output.includes(secret), false);
  assert.deepEqual([...f.data2], before); assert.equal(f.v1Reads(), 0); assert.equal(f.mutations(), 0);
});

test('v1 resolves as memory-only migration and leaves original files unchanged', async () => {
  const f = fixture(undefined, legacy()), before = [...f.data1];
  const result = await f.run();
  assert.equal(result.source, 'v1-memory'); assert.equal(result.revision, 7); assert.equal(result.cardCount, 4);
  assert.equal(result.readback, 'unchanged'); assert.equal(f.data2.size, 0);
  assert.deepEqual([...f.data1], before); assert.equal(f.mutations(), 0);
});

test('No versions returns empty status without creating files', async () => {
  const f = fixture(), result = await f.run();
  assert.equal(result.source, 'empty'); assert.equal(result.cardCount, 0);
  assert.equal(result.readback, 'not-applicable'); assert.equal(f.data2.size, 0); assert.equal(f.mutations(), 0);
});

test('Corrupt/unsupported latest v2 blocks diagnostics without reading v1 or older snapshots', async () => {
  for (const value of ['{broken', { ...wallet(), schemaVersion: 9 }]) {
    const f = fixture(value, legacy());
    f.data2.set('wallet-0000000000000002.json', JSON.stringify({ ...wallet(), revision: 2 }));
    const before = [...f.data2], result = await f.run();
    assert.equal(result.source, 'blocked-v2'); assert.equal(result.canvas, 'not-verified');
    assert.equal(f.v1Reads(), 0); assert.equal(f.mutations(), 0); assert.deepEqual([...f.data2], before);
    if (typeof value === 'object') assert.ok(result.errorCode.includes('unsupported_schema'));
  }
});

test('Pending is reported even if the latest committed snapshot is corrupt', async () => {
  for (const value of [wallet(), '{broken']) {
    const f = fixture(value);
    f.data2.set('wallet-0000000000000004.abandoned.pending', '{pending');
    const result = await f.run();
    assert.equal(result.pendingCount, 1); assert.ok(result.states.some(s => s.startsWith('Pending transaction detected')));
    assert.equal(f.mutations(), 0);
  }
});

test('Canvas boundary includes card height: portrait at row 234 fits, 235/500 block without rewriting', async () => {
  for (const row of [234, 235, 500]) {
    const f = fixture(wallet(row)), before = [...f.data2], result = await f.run();
    assert.equal(result.canvas, row === 234 ? 'compatible' : 'blocked');
    assert.deepEqual([...f.data2], before); assert.equal(f.mutations(), 0);
  }
});

test('Actual DEV reader facade uses native read APIs only; production refuses diagnostics before any read', async () => {
  for (const dev of [false, true]) {
    const files = new Map([['documents/bemem-phase1-canvas/layout-0000000007.json', JSON.stringify(legacy())]]);
    let reads = 0, mutations = 0;
    const forbidden = () => { mutations++; throw Error('Forbidden native mutation'); };
    class Directory {
      constructor(parent, name) { this.uri = parent.uri + '/' + name; this.name = name; }
      list() { reads++; return [...files.keys()].filter(n => n.slice(0, n.lastIndexOf('/')) === this.uri).map(n => new File(this, n.split('/').at(-1))); }
      create = forbidden; delete = forbidden;
    }
    class File {
      constructor(parent, name) { this.uri = parent.uri + '/' + name; this.name = name; }
      async text() { reads++; if (!files.has(this.uri)) throw Error('Not found'); return files.get(this.uri); }
      create = forbidden; write = forbidden; move = forbidden; delete = forbidden;
    }
    const docs = { uri: 'documents', list() { reads++; return [new Directory(docs, 'bemem-phase1-canvas')]; } };
    const mocks = { 'expo-file-system': { Directory, File, Paths: { document: docs } },
      expo: { Platform: { OS: 'android' } }, 'react-native': { Platform: { OS: 'android' } } };
    const nativeLoad = loader(mocks, dev), before = [...files];
    const { inspectDeviceWalletStartup } = nativeLoad('src/lib/dev-startup-readers.ts');
    assert.equal(reads, 0);
    if (!dev) await assert.rejects(inspectDeviceWalletStartup(), /development_only/);
    else { assert.equal((await inspectDeviceWalletStartup()).source, 'v1-memory'); assert.ok(reads > 0); }
    assert.equal(mutations, 0); assert.deepEqual([...files], before);
  }
});

test('Diagnostics page is dormant until button press and redirects to Home outside DEV', () => {
  for (const dev of [false, true]) {
    let invoked = 0;
    const mocks = {
      react: { useRef: value => ({ current: value }), useState: value => [value, () => {}] },
      'react-native': { Pressable: 'Pressable', ScrollView: 'ScrollView', Text: 'Text', StyleSheet: { create: x => x }, Alert: {} },
      'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' },
      'react/jsx-runtime': { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
      'expo-router': { Redirect: 'Redirect', router: {} },
      '@/constants/bemem-theme': { bemem: {} },
      '@/lib/dev-startup-readers': { inspectDeviceWalletStartup: async () => { invoked++; } },
    };
    const component = loader(mocks, dev)('src/app/dev-wallet-startup.tsx').default;
    const rendered = component();
    if (!dev) { assert.equal(rendered.type, 'Redirect'); assert.equal(rendered.props.href, '/'); }
    assert.equal(invoked, 0);
  }
});
