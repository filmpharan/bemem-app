// Synthetic snapshots + in-memory filesystem only. Never touches a device wallet.
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..'), cache = new Map();
const nativeMocks = {};
function load(relative) {
  const file = path.resolve(root, relative);
  if (cache.has(file)) return cache.get(file).exports;
  const module = { exports: {} }; cache.set(file, module);
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  function dependency(name) {
    if (name in nativeMocks) return nativeMocks[name];
    assert.ok(name.startsWith('.'), 'Unexpected native/network dependency');
    return load(path.resolve(path.dirname(file), name + '.ts'));
  }
  vm.runInThisContext(`(function(require,module,exports){${code}\n})`, { filename: file })(dependency, module, module.exports);
  return module.exports;
}
const { createWalletRepository, WalletRepositoryError } = load('src/lib/wallet-repository.ts');
const { PREVIEW_CARDS: demos, INITIAL_LAYOUT: initial } = load('src/data/wallet-preview.ts');
const time = '2026-11-07T00:00:00.000Z';
const name = n => `wallet-${String(n).padStart(16, '0')}.json`;
const clone = x => JSON.parse(JSON.stringify(x));
function wallet() {
  return { schemaVersion: 2, dataset: 'bemem-wallet', revision: 0, savedAt: time,
    cards: [{ kind: 'membership', id: 'synthetic-1', name: 'Synthetic Club', memberNumber: '000123',
      payload: ' 000123 A ', preferredDisplayFormat: 'qr', orientation: 'landscape',
      appearance: { backgroundColor: '#405764', textColor: '#ffffff', imageAssetId: null }, createdAt: time, updatedAt: time }],
    canvas: { columns: 12, layout: { 'synthetic-1': { col: 0, row: 300 } } } };
}
function memory() {
  const data = new Map(), operations = [];
  const adapter = {
    scope: {},
    async list() { operations.push(['list']); return [...data.keys()]; },
    async read(n) { operations.push(['read', n]); if (!data.has(n)) throw Error('Unreadable'); return data.get(n); },
    async writeExclusive(n, text) {
      operations.push(['write', n]); if (data.has(n)) throw Error('Exists'); data.set(n, text);
    },
    async promoteExclusive(pending, committed) {
      operations.push(['promote', pending, committed]);
      if (data.has(committed) || !data.has(pending)) throw Error('Cannot promote');
      data.set(committed, data.get(pending)); data.delete(pending);
    },
  };
  let counter = 0;
  const repo = createWalletRepository(adapter, { token: () => `test-${++counter}`, now: () => time });
  return { data, operations, adapter, repo };
}
const rejects = (promise, code) => assert.rejects(promise, e => e instanceof WalletRepositoryError && e.code === code);

test('Save commits cards and Canvas together, reads pending and final snapshots back, then reports success', async () => {
  const m = memory(), source = wallet(), before = clone(source);
  const saved = await m.repo.save(source, 0);
  assert.equal(saved.revision, 1);
  assert.deepEqual(source, before);
  assert.deepEqual(saved.cards, source.cards);
  assert.deepEqual(saved.canvas, source.canvas);
  assert.equal(saved.cards[0].payload, ' 000123 A ');
  assert.equal(saved.cards[0].memberNumber, '000123');
  assert.deepEqual([...m.data.keys()], [name(1)]);
  const promoteIndex = m.operations.findIndex(x => x[0] === 'promote');
  assert.ok(m.operations.slice(0, promoteIndex).some(x => x[0] === 'read' && x[1].endsWith('.pending')));
  assert.deepEqual(m.operations.at(-1), ['read', name(1)]);
  assert.deepEqual((await m.repo.load()).document, saved);
});

test('Revisions increase and all preceding committed snapshots remain unchanged', async () => {
  const m = memory(); let doc = await m.repo.save(wallet(), 0);
  const first = m.data.get(name(1));
  for (let revision = 1; revision < 4; revision++) {
    doc.cards[0].name = `Synthetic ${revision}`;
    doc = await m.repo.save(doc, revision);
    assert.equal(doc.revision, revision + 1);
  }
  assert.equal(m.data.get(name(1)), first);
  assert.deepEqual((await m.repo.inspect()).revisions, [1, 2, 3, 4]);
});

test('Stale or inconsistent expected revisions fail without any writes', async () => {
  const m = memory(); const doc = await m.repo.save(wallet(), 0);
  const count = m.operations.filter(x => x[0] === 'write').length;
  await rejects(m.repo.save(wallet(), 0), 'revision_conflict');
  await rejects(m.repo.save(doc, 0), 'revision_conflict');
  await rejects(m.repo.save(doc, -1), 'invalid_revision');
  assert.equal(m.operations.filter(x => x[0] === 'write').length, count);
});

test('Overlapping saves across repository instances sharing a scope are rejected', async () => {
  const m = memory(); let release;
  const gate = new Promise(resolve => { release = resolve; });
  const write = m.adapter.writeExclusive;
  m.adapter.writeExclusive = async (...args) => { await gate; await write(...args); };
  const second = createWalletRepository({ ...m.adapter }, { token: () => 'second' });
  const saving = m.repo.save(wallet(), 0);
  await rejects(m.repo.save(wallet(), 0), 'save_in_progress');
  await rejects(second.save(wallet(), 0), 'save_in_progress');
  release(); await saving;
  assert.equal((await second.load()).document.revision, 1);
});

test('Caller mutation while Save is pending cannot alter the transaction snapshot', async () => {
  const m = memory(), source = wallet();
  const saving = m.repo.save(source, 0);
  source.cards[0].payload = 'changed'; source.canvas.layout['synthetic-1'].row = 0;
  const saved = await saving;
  assert.equal(saved.cards[0].payload, ' 000123 A ');
  assert.equal(saved.canvas.layout['synthetic-1'].row, 300);
});

test('Pending write failure preserves the last commit and releases the process lock', async () => {
  const m = memory(), doc = await m.repo.save(wallet(), 0), first = m.data.get(name(1));
  const write = m.adapter.writeExclusive;
  m.adapter.writeExclusive = async () => { throw Error('Disk full with private details'); };
  await rejects(m.repo.save(doc, 1), 'pending_write_failed');
  assert.equal(m.data.get(name(1)), first);
  assert.equal((await m.repo.load()).document.revision, 1);
  m.adapter.writeExclusive = write;
  assert.equal((await m.repo.save(doc, 1)).revision, 2);
});

test('Invalid pending readback and valid-but-different bytes cannot be committed', async () => {
  for (const mutation of [() => '{broken', text => { const doc = JSON.parse(text); doc.cards[0].payload = 'different'; return JSON.stringify(doc); }]) {
    const m = memory(), first = await m.repo.save(wallet(), 0), bytes = m.data.get(name(1));
    const write = m.adapter.writeExclusive;
    m.adapter.writeExclusive = async (n, text) => write(n, mutation(text));
    await rejects(m.repo.save(first, 1), 'pending_verification_failed');
    assert.equal(m.data.get(name(1)), bytes);
    assert.equal(m.data.has(name(2)), false);
    assert.equal((await m.repo.load()).document.revision, 1);
    assert.equal((await m.repo.inspect()).pendingFiles.length, 1);
  }
});

test('Interrupted pending files never become committed or cause an automatic retry/delete', async () => {
  const m = memory(); const pending = 'wallet-0000000000000001.interrupted.pending';
  m.data.set(pending, JSON.stringify({ ...wallet(), revision: 1 }));
  const loaded = await m.repo.load();
  assert.equal(loaded.document, null);
  assert.deepEqual(loaded.pendingFiles, [pending]);
  assert.equal(m.data.has(pending), true);
  assert.equal(m.operations.some(x => x[0] === 'write' || x[0] === 'promote'), false);
});

test('Partial pending write failure leaves evidence but no committed revision', async () => {
  const m = memory();
  m.adapter.writeExclusive = async n => { m.data.set(n, '{partial'); throw Error('Interrupted'); };
  await rejects(m.repo.save(wallet(), 0), 'pending_write_failed');
  const result = await m.repo.load();
  assert.equal(result.document, null);
  assert.equal(result.pendingFiles.length, 1);
  assert.equal(m.data.has(name(1)), false);
});

test('Unreadable directory cannot be treated as an empty wallet or overwritten', async () => {
  const m = memory(); m.adapter.list = async () => { throw Error('No permission'); };
  await rejects(m.repo.load(), 'storage_unreadable');
  await rejects(m.repo.save(wallet(), 0), 'storage_unreadable');
  assert.equal(m.data.size, 0);
});

test('An existing target created during promotion is not overwritten', async () => {
  const m = memory(), promote = m.adapter.promoteExclusive;
  const external = JSON.stringify({ ...wallet(), revision: 1 });
  m.adapter.promoteExclusive = async (...args) => { m.data.set(name(1), external); await promote(...args); };
  await rejects(m.repo.save(wallet(), 0), 'commit_uncertain');
  assert.equal(m.data.get(name(1)), external);
  assert.equal((await m.repo.inspect()).pendingFiles.length, 1);
});

test('Corrupt latest snapshot blocks Load and Save; an older snapshot is only available explicitly', async () => {
  const m = memory(), old = await m.repo.save(wallet(), 0);
  m.data.set(name(2), '{broken');
  await rejects(m.repo.load(), 'invalid_snapshot');
  await rejects(m.repo.save(old, 1), 'invalid_snapshot');
  assert.equal((await m.repo.readRevisionForRecovery(1)).revision, 1);
  assert.equal(m.data.get(name(2)), '{broken');
});

test('Unknown schema, filename/revision mismatch, unsafe revision and unreadable latest snapshot fail closed', async () => {
  for (const patch of [doc => { doc.schemaVersion = 99; }, doc => { doc.revision = 5; }]) {
    const m = memory(), doc = { ...wallet(), revision: 1 }; patch(doc); m.data.set(name(1), JSON.stringify(doc));
    await assert.rejects(m.repo.load(), e => e.code === 'invalid_snapshot' && e.validationCode === 'unsupported_schema' || e.code === 'revision_mismatch');
  }
  const m = memory(); m.data.set('wallet-9999999999999999.json', '{}');
  await rejects(m.repo.load(), 'invalid_revision');
  m.data.clear(); m.data.set('wallet-latest.json', '{}');
  await rejects(m.repo.load(), 'invalid_snapshot_name');
  m.data.clear(); m.data.set(name(1), '{}'); m.adapter.read = async () => { throw Error('denied'); };
  await rejects(m.repo.load(), 'snapshot_unreadable');
});

test('Revision is rechecked immediately before promotion if an external writer changes the folder', async () => {
  const m = memory(), write = m.adapter.writeExclusive;
  m.adapter.writeExclusive = async (n, text) => {
    await write(n, text);
    m.data.set(name(1), JSON.stringify({ ...wallet(), revision: 1 }));
  };
  await rejects(m.repo.save(wallet(), 0), 'revision_conflict');
  assert.equal(m.operations.some(x => x[0] === 'promote'), false);
});

test('Move failure is uncertain, never success; existing committed bytes survive', async () => {
  const m = memory(), doc = await m.repo.save(wallet(), 0), first = m.data.get(name(1));
  m.adapter.promoteExclusive = async () => { throw Error('Native move error'); };
  await rejects(m.repo.save(doc, 1), 'commit_uncertain');
  assert.equal(m.data.get(name(1)), first);
  assert.equal((await m.repo.load()).document.revision, 1);
});

test('Move may finish before throwing: caller must reload rather than assume the old revision', async () => {
  const m = memory(), promote = m.adapter.promoteExclusive;
  m.adapter.promoteExclusive = async (...args) => { await promote(...args); throw Error('Callback failed after move'); };
  await rejects(m.repo.save(wallet(), 0), 'commit_uncertain');
  assert.equal((await m.repo.load()).document.revision, 1);
  await rejects(m.repo.save(wallet(), 0), 'revision_conflict');
});

test('Final readback failure/corruption does not report success or remove previous revisions', async () => {
  const m = memory(), doc = await m.repo.save(wallet(), 0), first = m.data.get(name(1));
  const read = m.adapter.read;
  m.adapter.read = async n => n === name(2) ? '{broken' : read(n);
  await rejects(m.repo.save(doc, 1), 'commit_uncertain');
  assert.equal(m.data.get(name(1)), first);
  m.adapter.read = read;
  assert.equal((await m.repo.load()).document.revision, 2);
});

test('Save Promise remains pending until final destination verification finishes', async () => {
  const m = memory(), read = m.adapter.read; let verify;
  const gate = new Promise(resolve => { verify = resolve; });
  let atFinalRead; const reached = new Promise(resolve => { atFinalRead = resolve; });
  m.adapter.read = async n => { if (n === name(1)) { atFinalRead(); await gate; } return read(n); };
  let done = false;
  const saving = m.repo.save(wallet(), 0).then(doc => { done = true; return doc; });
  await reached; assert.equal(done, false); verify(); await saving;
  assert.equal(done, true);
});

test('Explicit import preserves v1 data, IDs, demo kind, colors, revision and savedAt; subsequent Save increments', async () => {
  const m = memory();
  const legacy = JSON.stringify({ schemaVersion: 1, dataset: 'bemem-phase1-demo-v1', columns: 12, revision: 7, savedAt: time, layout: initial });
  const legacyFiles = new Map([['layout-0000000007.json', legacy]]);
  const before = [...legacyFiles];
  const prepared = m.repo.prepareMigration(legacy, demos);
  assert.equal(m.operations.length, 0);
  const imported = await m.repo.importPhase1(legacy, demos);
  assert.deepEqual(imported, prepared);
  assert.deepEqual([...legacyFiles], before);
  assert.deepEqual(imported.canvas.layout, initial);
  assert.deepEqual(imported.cards.map(c => c.id), demos.map(c => c.id));
  imported.cards.forEach((c, i) => {
    assert.equal(c.kind, 'demo'); assert.equal('payload' in c, false); assert.equal('memberNumber' in c, false);
    assert.deepEqual(c.colors, demos[i].colors);
  });
  await rejects(m.repo.importPhase1(legacy, demos), 'revision_conflict');
  assert.equal((await m.repo.save(imported, 7)).revision, 8);
});

test('Invalid migration never writes v2; validation failures and exhausted revisions release the lock', async () => {
  const m = memory(); await assert.rejects(m.repo.importPhase1('{broken', demos));
  const bad = wallet(); bad.canvas.layout = {};
  await assert.rejects(m.repo.save(bad, 0));
  const max = wallet(); max.revision = Number.MAX_SAFE_INTEGER;
  await rejects(m.repo.save(max, max.revision), 'revision_exhausted');
  assert.equal(m.data.size, 0);
  assert.equal((await m.repo.save(wallet(), 0)).revision, 1);
});

test('Native adapter is lazy, uses a private v2 folder, refuses overwrite/path traversal, and exposes no delete API', async () => {
  const files = new Map(), dirs = new Set(); let accesses = 0;
  class Directory {
    constructor(parent, n) { accesses++; this.uri = `${parent.uri}/${n}`; }
    create(options) { assert.equal(options.overwrite, false); dirs.add(this.uri); }
    list() { return [...files.keys()].filter(k => k.startsWith(this.uri + '/')).map(k => ({ name: k.split('/').at(-1) })); }
  }
  class File {
    constructor(parent, n) { accesses++; this.uri = `${parent.uri}/${n}`; }
    create(options) { assert.equal(options.overwrite, false); if (files.has(this.uri)) throw Error('Exists'); files.set(this.uri, ''); }
    async write(value) { files.set(this.uri, value); }
    async text() { if (!files.has(this.uri)) throw Error('Missing'); return files.get(this.uri); }
    async move(destination, options) {
      assert.equal(options.overwrite, false); if (files.has(destination.uri)) throw Error('Exists');
      files.set(destination.uri, files.get(this.uri)); files.delete(this.uri);
    }
  }
  const documents = { uri: 'private-documents', list() {
    accesses++;
    return [...dirs].map(uri => { const folder = Object.create(Directory.prototype); folder.uri = uri; folder.name = uri.split('/').at(-1); return folder; });
  } };
  nativeMocks['expo-file-system'] = { Directory, File, Paths: { document: documents } };
  nativeMocks.expo = { Platform: { OS: 'android' }, uuid: { v4: () => 'test-native-uuid' } };
  const { createExpoWalletRepository, createExpoWalletFiles } = load('src/lib/wallet-storage.ts');
  const repo = createExpoWalletRepository(), adapter = createExpoWalletFiles();
  assert.equal(accesses, 0);
  const legacyPath = 'private-documents/bemem-phase1-canvas/layout-0000000007.json';
  dirs.add('private-documents/bemem-phase1-canvas'); files.set(legacyPath, 'synthetic legacy bytes');
  const saved = await repo.save(wallet(), 0);
  assert.equal(saved.revision, 1);
  assert.deepEqual([...files.keys()], [legacyPath, `private-documents/bemem-wallet-v2/${name(1)}`]);
  assert.equal(files.get(legacyPath), 'synthetic legacy bytes');
  await assert.rejects(adapter.read('../bemem-phase1-canvas/layout-0000000001.json'));
  await assert.rejects(adapter.writeExclusive(name(2), 'bad'));
  assert.equal('delete' in adapter, false);
  assert.equal('remove' in adapter, false);
});
