// Mock-native and real HOST filesystem tests. Neither is a Samsung/Expo native result.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), ts = require('typescript');
const root = path.resolve(__dirname, '..');
function environment(dev = true) {
  const data = new Map(), dirs = new Set(), calls = [], cache = new Map();
  const prefix = 'documents/bemem-wallet-cutover-test';
  let fault = null;
  function touched(uri, operation) {
    assert.ok(uri === prefix || uri.startsWith(prefix + '/'), `Protected path accessed: ${operation}`);
    calls.push([operation, uri]);
  }
  class Directory {
    constructor(parent, name) { this.uri = parent.uri + '/' + name; this.name = name; }
    create() { touched(this.uri, 'mkdir'); dirs.add(this.uri); }
    list() {
      touched(this.uri, 'list'); if (!dirs.has(this.uri)) throw Error('Missing directory');
      return [...[...dirs].filter(uri => path.posix.dirname(uri) === this.uri).map(uri => new Directory(this, path.posix.basename(uri))),
        ...[...data.keys()].filter(uri => path.posix.dirname(uri) === this.uri).map(uri => new File(this, path.posix.basename(uri)))];
    }
    delete() { touched(this.uri, 'rmdir'); assert.equal(this.list().length, 0); dirs.delete(this.uri); }
  }
  class File {
    constructor(parent, name) { this.uri = parent.uri + '/' + name; this.name = name; }
    create(options) { touched(this.uri, 'create'); if (!options.overwrite && data.has(this.uri)) throw Error('Exists'); data.set(this.uri, ''); }
    async write(text) { touched(this.uri, 'write'); if (fault === 'write') { fault = null; throw Error('Synthetic write error'); } data.set(this.uri, text); }
    async text() { touched(this.uri, 'read'); if (fault === 'readback' && this.name.endsWith('.json')) { fault = null; throw Error('Synthetic readback error'); } if (!data.has(this.uri)) throw Error('Missing file'); return data.get(this.uri); }
    async move(destination, options) {
      touched(this.uri, 'move'); touched(destination.uri, 'destination'); assert.equal(options.overwrite, false);
      if (data.has(destination.uri) || !data.has(this.uri)) throw Error('Move rejected');
      data.set(destination.uri, data.get(this.uri)); data.delete(this.uri);
    }
    delete() { touched(this.uri, 'delete'); data.delete(this.uri); }
  }
  function load(relative) {
    const file = path.resolve(root, relative);
    if (cache.has(file)) return cache.get(file).exports;
    const module = { exports: {} }; cache.set(file, module);
    const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    vm.runInThisContext(`(function(require,module,exports,__DEV__){${code}\n})`, { filename: file })(name => {
      if (name === 'expo') return { Platform: { OS: 'android' } };
      if (name === 'expo-file-system') return { Directory, File, Paths: { document: { uri: 'documents' } } };
      assert.ok(name.startsWith('.'), `Unexpected dependency ${name}`);
      return load(path.resolve(path.dirname(file), name + '.ts'));
    }, module, module.exports, dev);
    return module.exports;
  }
  const boundary = load('src/lib/dev-wallet-sandbox.ts');
  return { data, dirs, calls, prefix, load, boundary,
    sandbox: boundary.createWalletTestSandbox(boundary.CUTOVER_TEST_DIRECTORY),
    checks: load('src/lib/dev-cutover-checks.ts'), fail: kind => { fault = kind; } };
}
const time = '2026-11-07T00:00:00.000Z';
const copy = x => JSON.parse(JSON.stringify(x));
function legacy(e) {
  const { PREVIEW_CARDS: cards, INITIAL_LAYOUT } = e.load('src/data/wallet-preview.ts');
  return { cards, doc: { schemaVersion: 1, dataset: 'bemem-phase1-demo-v1', columns: 12,
    revision: 10, savedAt: time, layout: copy(INITIAL_LAYOUT) } };
}
test('Migration preserves every demo field, layout, order, revision and timestamp without placement or mutation', () => {
  const e = environment(), { cards, doc } = legacy(e), before = JSON.stringify([cards, doc]);
  const migrate = e.load('src/lib/wallet-migration.ts').migratePhase1Wallet;
  const prepared = migrate(JSON.stringify(doc), cards);
  assert.equal(prepared.revision, doc.revision); assert.equal(prepared.savedAt, doc.savedAt);
  assert.deepEqual(prepared.canvas.layout, doc.layout);
  assert.deepEqual(prepared.cards, cards.map(c => ({ kind: 'demo', id: c.id, name: c.name, orientation: c.orientation, colors: [...c.colors] })));
  assert.ok(prepared.cards.every(c => !('payload' in c) && !('memberNumber' in c)));
  assert.deepEqual(migrate(JSON.stringify(doc), cards), prepared);
  assert.equal(JSON.stringify([cards, doc]), before); assert.equal(e.calls.length, 0);
  assert.doesNotMatch(fs.readFileSync(path.join(root, 'src/lib/wallet-migration.ts'), 'utf8'), /firstFreePosition|canvasStorage|\.save\(/);
});
test('Unknown legacy metadata is rejected instead of silently dropped; v1 decoder is unchanged', () => {
  const e = environment(), { doc, cards } = legacy(e), extra = { ...doc, metadata: { synthetic: true } };
  assert.deepEqual(e.load('src/lib/canvas-repository.ts').decodeDocument(JSON.stringify(extra), cards).metadata, extra.metadata);
  assert.throws(() => e.load('src/lib/wallet-migration.ts').migratePhase1Wallet(JSON.stringify(extra), cards), /invalid_legacy_document/);
  assert.equal(e.calls.length, 0);
});
test('Invalid collision, fractional coordinates, schema and legacy >240 rows fail closed', () => {
  const e = environment(), { cards, doc } = legacy(e), migrate = e.load('src/lib/wallet-migration.ts').migratePhase1Wallet;
  for (const patch of [
    { schemaVersion: 9 }, { savedAt: 'broken' },
    { layout: { ...doc.layout, [cards[1].id]: doc.layout[cards[0].id] } },
    { layout: { ...doc.layout, [cards[0].id]: { col: 0.5, row: 0 } } },
    { layout: { ...doc.layout, [cards[0].id]: { col: 0, row: 240 } } },
  ]) assert.throws(() => migrate(JSON.stringify({ ...doc, ...patch }), cards));
  assert.equal(e.calls.length, 0);
});
test('Synthetic source backup byte comparison, import readback and duplicate rejection use isolated storage only', async () => {
  const e = environment(), { doc, cards } = legacy(e); await e.sandbox.create();
  const original = JSON.stringify(doc, null, 2), backup = Buffer.from(original, 'utf8');
  assert.equal(backup.toString('utf8'), original); // Backup procedure fixture, not a production backup.
  const repo = e.load('src/lib/wallet-repository.ts').createWalletRepository(e.sandbox.files('main'), { token: () => 'fixture-import' });
  const imported = await repo.importPhase1(backup.toString('utf8'), cards), bytes = [...e.data.entries()];
  assert.deepEqual((await repo.load()).document, imported); assert.equal(imported.revision, 10); assert.equal(imported.savedAt, time);
  await assert.rejects(repo.importPhase1(original, cards), error => error.code === 'revision_conflict');
  assert.deepEqual([...e.data.entries()], bytes); assert.equal(JSON.stringify(doc, null, 2), original);
});
test('Dedicated namespace rejects production roots, path traversal and the old device-test sandbox', async () => {
  const e = environment();
  for (const name of ['bemem-wallet-v2', 'bemem-phase1-canvas', '../bemem-wallet-v2', 'bemem-wallet-cutover-test/../bemem-wallet-v2']) {
    const sandbox = e.boundary.createWalletTestSandbox(name);
    assert.throws(() => sandbox.path(), /sandbox_namespace_rejected/);
    await assert.rejects(sandbox.create(), /sandbox_namespace_rejected/);
  }
  await assert.rejects(e.checks.runCutoverFileChecks(e.boundary.createWalletTestSandbox(), 'x', () => {}));
  assert.equal(e.calls.length, 0);
});
test('Construction is read/write free and production DEV guard rejects manual checks', async () => {
  const e = environment(); e.sandbox.path(); e.sandbox.files('main'); assert.equal(e.calls.length, 0);
  const prod = environment(false);
  for (const fn of [() => prod.checks.runCutoverFileChecks(prod.sandbox, 'x', () => {}),
    () => prod.checks.verifyCutoverRestart(prod.sandbox, 'x'), () => prod.checks.inspectCutoverFiles(prod.sandbox)]) await assert.rejects(fn(), /development_only/);
  assert.equal(prod.calls.length, 0);
});
test('Exact device runner passes mock-native flow and never accesses protected sentinel paths', async () => {
  const e = environment(), results = [];
  e.data.set('documents/bemem-phase1-canvas/private.json', 'protected-v1'); e.data.set('documents/bemem-wallet-v2/private.json', 'protected-v2');
  await e.checks.runCutoverFileChecks(e.sandbox, 'session-one', r => results.push(r));
  assert.equal(results.filter(r => r.status === 'Passed').length, 7); assert.equal(results.some(r => r.status === 'Failed'), false);
  assert.equal(results.filter(r => r.status === 'Not Verified').length, 2);
  assert.equal(e.data.get('documents/bemem-phase1-canvas/private.json'), 'protected-v1');
  assert.equal(e.data.get('documents/bemem-wallet-v2/private.json'), 'protected-v2');
  assert.ok(e.calls.some(c => c[0] === 'destination')); assert.ok(e.calls.some(c => c[0] === 'read' && c[1].endsWith('.pending')));
});
test('Restart readback verifies exact full snapshot, requires a changed harness session and never writes', async () => {
  const e = environment(); await e.checks.runCutoverFileChecks(e.sandbox, 'first', () => {});
  const before = [...e.data.entries()], start = e.calls.length;
  assert.equal((await e.checks.verifyCutoverRestart(e.sandbox, 'first')).status, 'Not Verified');
  assert.equal((await e.checks.verifyCutoverRestart(e.sandbox, 'second')).status, 'Passed');
  assert.deepEqual([...e.data.entries()], before);
  assert.ok(e.calls.slice(start).every(c => ['read', 'list'].includes(c[0])));
});
test('Repeat Run refuses a populated test wallet; no duplicate cards/revisions or marker replacement', async () => {
  const e = environment(); await e.checks.runCutoverFileChecks(e.sandbox, 'first', () => {});
  const before = [...e.data.entries()], second = [];
  await e.checks.runCutoverFileChecks(e.sandbox, 'second', r => second.push(r));
  assert.equal(second.at(-1).status, 'Failed'); assert.deepEqual([...e.data.entries()], before);
});
test('Corrupt latest blocks restart/reinspection; previous snapshot recovery remains read-only and explicit', async () => {
  const e = environment(); await e.checks.runCutoverFileChecks(e.sandbox, 'first', () => {});
  const latest = [...e.data.keys()].find(n => n.endsWith('wallet-0000000000000002.json'));
  e.data.set(latest, '{broken'); const before = [...e.data.entries()];
  assert.equal((await e.checks.verifyCutoverRestart(e.sandbox, 'second')).status, 'Failed');
  assert.equal((await e.checks.inspectCutoverFiles(e.sandbox)).status, 'Failed');
  const repo = e.load('src/lib/wallet-repository.ts').createWalletRepository(e.sandbox.files('main'), { token: () => 'not-used' });
  assert.equal((await repo.readRevisionForRecovery(1)).revision, 1);
  assert.deepEqual([...e.data.entries()], before);
});
test('Readback rejects altered card ID/number/position even if the snapshot is otherwise valid', async () => {
  const e = environment(); await e.checks.runCutoverFileChecks(e.sandbox, 'first', () => {});
  const latest = [...e.data.keys()].find(n => n.endsWith('wallet-0000000000000002.json'));
  const original = e.data.get(latest), doc = JSON.parse(original); doc.cards[0].memberNumber = 'changed-synthetic';
  e.data.set(latest, JSON.stringify(doc)); const before = [...e.data.entries()];
  assert.equal((await e.checks.verifyCutoverRestart(e.sandbox, 'second')).status, 'Failed'); assert.deepEqual([...e.data.entries()], before);
});
test('Write failure is not success; pending evidence remains and no retry/promote occurs', async () => {
  const e = environment(), results = []; e.fail('write');
  await e.checks.runCutoverFileChecks(e.sandbox, 'first', r => results.push(r));
  assert.equal(results.at(-1).status, 'Failed'); assert.ok([...e.data.keys()].some(n => n.endsWith('.pending')));
  assert.match(results.at(-1).detail, /pending_write_failed/);
  assert.equal(e.calls.some(c => c[0] === 'move'), false);
  const before = [...e.data.entries()];
  const inspection = await e.checks.inspectCutoverFiles(e.sandbox); assert.match(inspection.detail, /pending 1/);
  assert.deepEqual([...e.data.entries()], before);
});
test('Post-promote readback failure retains committed evidence, reports failure and requires explicit reinspection', async () => {
  const e = environment(), results = []; e.fail('readback');
  await e.checks.runCutoverFileChecks(e.sandbox, 'first', r => results.push(r));
  assert.equal(results.at(-1).status, 'Failed');
  assert.match(results.at(-1).detail, /commit_uncertain/);
  assert.equal([...e.data.keys()].filter(n => n.endsWith('.json')).length, 1);
  assert.equal([...e.data.keys()].some(n => n.endsWith('run-info.json')), false);
  const before = [...e.data.entries()]; assert.equal((await e.checks.inspectCutoverFiles(e.sandbox)).status, 'Passed');
  assert.deepEqual([...e.data.entries()], before);
});
test('Pending-only data blocks runtime write; revision conflict cannot modify committed bytes', async () => {
  const e = environment(); await e.sandbox.create(); const files = e.sandbox.files('main');
  await files.writeExclusive('wallet-0000000000000001.foreign.pending', 'synthetic pending');
  const runtime = e.load('src/lib/dev-add-card-runtime.ts').createDevAddCardRuntime({ files });
  assert.equal((await runtime.initialize()).ok, false); assert.equal(runtime.getSnapshot().state.editsAllowed, false);
  const before = [...e.data.entries()]; assert.equal((await runtime.save()).ok, false); assert.deepEqual([...e.data.entries()], before);
  const separate = environment(); await separate.checks.runCutoverFileChecks(separate.sandbox, 'first', () => {});
  const repo = separate.load('src/lib/wallet-repository.ts').createWalletRepository(separate.sandbox.files('main'), { token: () => 'stale' });
  const doc = (await repo.load()).document, saved = [...separate.data.entries()];
  await assert.rejects(repo.save(doc, 1), error => error.code === 'revision_conflict'); assert.deepEqual([...separate.data.entries()], saved);
});
test('Cleanup refuses unknown entries before any deletion, then only clears recognized dedicated files', async () => {
  const e = environment(); await e.checks.runCutoverFileChecks(e.sandbox, 'first', () => {});
  const unknown = e.prefix + '/main/unknown.txt'; e.data.set(unknown, 'preserve'); const before = [...e.data.entries()];
  await assert.rejects(e.sandbox.clear(), /unknown_sandbox_entry_cleanup_blocked/); assert.deepEqual([...e.data.entries()], before);
  e.data.delete(unknown); await e.sandbox.clear(); assert.equal(e.data.size, 0); assert.ok(e.dirs.has(e.prefix));
});
test('Host real filesystem executes same runner and reads saved files using a fresh runtime (NOT Android)', async () => {
  const e = environment(), parent = path.resolve(root, '.expo'), temporary = path.resolve(parent, `cutover-host-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const directory = path.join(temporary, 'bemem-wallet-cutover-test');
  assert.equal(path.dirname(temporary), parent);
  const sandbox = {
    path: () => directory.replaceAll('\\', '/'),
    create: async () => { for (const name of ['main', 'pending', 'corrupt']) fs.mkdirSync(path.join(directory, name), { recursive: true }); },
    files(name) {
      assert.ok(['main', 'pending', 'corrupt'].includes(name)); const dir = path.join(directory, name);
      const checked = file => { assert.match(file, /^wallet-[a-zA-Z0-9.-]+$/); return path.join(dir, file); };
      return { scope: dir, list: async () => fs.readdirSync(dir), read: async file => fs.readFileSync(checked(file), 'utf8'),
        writeExclusive: async (file, text) => fs.writeFileSync(checked(file), text, { flag: 'wx' }),
        promoteExclusive: async (source, target) => { assert.equal(fs.existsSync(checked(target)), false); fs.renameSync(checked(source), checked(target)); } };
    },
    writeRestartMarker: async text => { const marker = path.join(directory, 'run-info.json'); fs.writeFileSync(marker, text, { flag: 'wx' }); assert.equal(fs.readFileSync(marker, 'utf8'), text); },
    readRestartMarker: async () => fs.readFileSync(path.join(directory, 'run-info.json'), 'utf8'),
  };
  try {
    const results = []; await e.checks.runCutoverFileChecks(sandbox, 'host-first', r => results.push(r));
    assert.equal(results.filter(r => r.status === 'Passed').length, 7); assert.equal(results.some(r => r.status === 'Failed'), false);
    assert.equal(fs.readdirSync(path.join(directory, 'main')).filter(n => n.endsWith('.json')).length, 2);
    assert.equal((await e.checks.verifyCutoverRestart(sandbox, 'host-second')).status, 'Passed');
  } finally {
    assert.equal(path.dirname(temporary), parent); assert.ok(path.basename(temporary).startsWith('cutover-host-'));
    fs.rmSync(temporary, { recursive: true, force: true });
  }
});
test('Production runtime, writer/import gates and schema remain disconnected from the new DEV route', () => {
  for (const relative of ['src/app/index.tsx', 'src/app/_layout.tsx', 'src/hooks/use-wallet-canvas.ts']) {
    assert.doesNotMatch(fs.readFileSync(path.join(root, relative), 'utf8'), /dev-cutover|dev-wallet-cutover|createWalletOwnerScope|createDevAddCardRuntime/);
  }
  assert.match(fs.readFileSync(path.join(root, 'src/lib/wallet-runtime-owner.ts'), 'utf8'), /importV1: async \(\) => \{ throw new WalletCoordinatorFailure/);
  assert.match(fs.readFileSync(path.join(root, 'src/lib/dev-migration-preview.ts'), 'utf8'), /writeExclusive: forbidden, promoteExclusive: forbidden/);
  assert.match(fs.readFileSync(path.join(root, 'src/app/dev-wallet-cutover.tsx'), 'utf8'), /if \(!__DEV__\) return <Redirect/);
});
