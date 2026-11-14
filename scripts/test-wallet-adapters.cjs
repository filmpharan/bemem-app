// Preparation-only adapter/owner tests. Native packages are forbidden in this loader.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), ts = require('typescript');
const root = path.resolve(__dirname, '..'), cache = new Map();
function load(relative) {
  const file = path.resolve(root, relative);
  if (cache.has(file)) return cache.get(file).exports;
  const module = { exports: {} }; cache.set(file, module);
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const dependency = name => { assert.ok(name.startsWith('.'), 'Native dependency forbidden'); return load(path.resolve(path.dirname(file), name + '.ts')); };
  vm.runInThisContext(`(function(require,module,exports){${code}\n})`)(dependency, module, module.exports);
  return module.exports;
}
const { createWalletStorageAdapters } = load('src/lib/wallet-storage-adapters.ts');
const { createWalletOwnerScope, createRuntimeBundleStore } = load('src/lib/wallet-runtime-owner.ts');
const { createCanvasRepository } = load('src/lib/canvas-repository.ts');
const { createWalletRepository, WalletRepositoryError } = load('src/lib/wallet-repository.ts');
const { PREVIEW_CARDS: cards, INITIAL_LAYOUT: initial } = load('src/data/wallet-preview.ts');
const copy = x => JSON.parse(JSON.stringify(x)), time = '2026-11-07T00:00:00.000Z';
function fixture() {
  const v1 = new Map([['layout-0000000001.json', JSON.stringify({ schemaVersion: 1, dataset: 'bemem-phase1-demo-v1', columns: 12, revision: 1, savedAt: time, layout: initial })]]);
  const v2 = new Map(); let reads = 0, writes = 0, token = 0;
  const old = createCanvasRepository({ list: async () => { reads++; return [...v1.keys()]; }, read: async n => { reads++; return v1.get(n); }, commit: async (n, text) => { writes++; if (v1.has(n)) throw Error('Exists'); v1.set(n, text); } }, cards);
  const repo = createWalletRepository({ scope: {}, list: async () => { reads++; return [...v2.keys()]; }, read: async n => { reads++; if (!v2.has(n)) throw Error('Missing'); return v2.get(n); },
    writeExclusive: async (n, text) => { writes++; if (v2.has(n)) throw Error('Exists'); v2.set(n, text); },
    promoteExclusive: async (p, n) => { if (v2.has(n)) throw Error('Exists'); v2.set(n, v2.get(p)); v2.delete(p); } }, { token: () => `test-${++token}`, now: () => time });
  const ports = { v1: old, v2: repo, demoCards: cards, now: () => time };
  return { ports, adapters: createWalletStorageAdapters(ports), v1, v2, reads: () => reads, writes: () => writes };
}
function bundle(doc, source = 'v1') {
  return { source, revision: doc.revision, generation: 1, saved: doc, draft: copy(doc), repository: { source, save: async () => ({ ok: true, code: 'completed' }) } };
}

test('Constructing adapters/owner performs no reads or writes; one scope owns one coordinator', () => {
  const f = fixture(); let factories = 0;
  const scope = createWalletOwnerScope(() => { factories++; return f.adapters; });
  const a = scope.getOwner(), b = scope.getOwner();
  assert.equal(a, b); assert.equal(factories, 1); assert.equal(f.reads(), 0); assert.equal(f.writes(), 0);
  assert.equal(a.getSnapshot().state.phase, 'loading');
});

test('v1 adapter delegates to original mock reader/writer and verifies preserved layout snapshot', async () => {
  const f = fixture(), loaded = await f.adapters.readV1(); assert.equal(loaded.ok, true);
  const draft = copy(loaded.value); draft.canvas.layout[cards[0].id] = { col: 0, row: 20 };
  const saved = await f.adapters.saveV1(draft, 1);
  assert.equal(saved.ok, true); assert.equal(saved.value.revision, 2);
  assert.deepEqual(saved.value.cards, loaded.value.cards); assert.deepEqual(saved.value.canvas.layout, draft.canvas.layout);
  assert.equal(f.v2.size, 0); assert.equal(f.v1.size, 2);
});

test('v1 cannot silently lose card edits that its legacy writer cannot represent', async () => {
  const f = fixture(), loaded = await f.adapters.readV1(), draft = copy(loaded.value);
  draft.cards[0].name = 'Synthetic modified name';
  const result = await f.adapters.saveV1(draft, 1);
  assert.equal(result.kind, 'blocked'); assert.equal(f.writes(), 0);
});

test('v2 adapter saves cards and layout together through the existing mock repository', async () => {
  const f = fixture(), loaded = await f.adapters.readV1();
  const draft = copy(loaded.value); draft.revision = 0;
  const result = await f.adapters.saveV2(draft, 0);
  assert.equal(result.ok, true); assert.equal(result.value.revision, 1);
  assert.deepEqual(result.value.cards, draft.cards); assert.deepEqual(result.value.canvas, draft.canvas);
  assert.equal((await f.adapters.readV2()).value.document.revision, 1);
});

test('Revision conflict is explicit and does not invoke a writer', async () => {
  const f = fixture(), loaded = await f.adapters.readV1();
  assert.equal((await f.adapters.saveV1(loaded.value, 0)).kind, 'revision_conflict');
  assert.equal((await f.adapters.saveV2(loaded.value, 1)).kind, 'revision_conflict');
  assert.equal(f.writes(), 0);
});

test('Pending and corrupt v2 block v1/v2 writes with distinct results', async () => {
  const f = fixture(), loaded = await f.adapters.readV1(), draft = copy(loaded.value); draft.revision = 0;
  f.v2.set('wallet-0000000000000001.orphan.pending', '{partial');
  assert.equal((await f.adapters.saveV1(loaded.value, 1)).kind, 'pending');
  assert.equal((await f.adapters.saveV2(draft, 0)).kind, 'pending');
  f.v2.clear(); f.v2.set('wallet-0000000000000001.json', '{broken');
  assert.equal((await f.adapters.saveV2(draft, 0)).kind, 'blocked'); assert.equal(f.writes(), 0);
});

test('Existing v2 prohibits the privileged v1 writer; no split-brain write occurs', async () => {
  const f = fixture(), loaded = await f.adapters.readV1(), doc = copy(loaded.value); doc.revision = 0;
  await f.adapters.saveV2(doc, 0); const count = f.writes();
  assert.equal((await f.adapters.saveV1(loaded.value, 1)).kind, 'revision_conflict'); assert.equal(f.writes(), count);
});

test('Commit uncertainty is retained and never automatically retried', async () => {
  const f = fixture(), loaded = await f.adapters.readV1(), doc = copy(loaded.value); doc.revision = 0;
  let attempts = 0; f.ports.v2.save = async () => { attempts++; throw new WalletRepositoryError('commit_uncertain'); };
  assert.equal((await f.adapters.saveV2(doc, 0)).kind, 'commit_uncertain'); assert.equal(attempts, 1);
});

test('Bundle store separates Saved/Draft and rejects mixed source or revision before publication', async () => {
  const f = fixture(), doc = (await f.adapters.readV1()).value, store = createRuntimeBundleStore(), input = bundle(doc);
  store.install(input); const installed = store.getSnapshot();
  input.draft.canvas.layout[cards[0].id].row = 20;
  assert.equal(installed.saved.canvas.layout[cards[0].id].row, 0); assert.equal(installed.draft.canvas.layout[cards[0].id].row, 0);
  const mixed = bundle(doc); mixed.repository.source = 'v2';
  assert.throws(() => store.install(mixed), /mixed_runtime_bundle/); assert.equal(store.getSnapshot(), installed);
  const revision = bundle(doc); revision.draft.revision++;
  assert.throws(() => store.install(revision), /mixed_runtime_revision/); assert.equal(store.getSnapshot(), installed);
  assert.ok(Object.isFrozen(installed.repository));
});

test('Owner exposes guarded commands only; current bundle Draft tracks edits without changing Saved', async () => {
  const f = fixture(), owner = createWalletOwnerScope(() => f.adapters).getOwner();
  await owner.commands.initialize(); const current = owner.getSnapshot(), draft = copy(current.session.draft);
  draft.canvas.layout[cards[0].id].row = 20;
  owner.commands.updateDraft(current.state.generation, draft);
  const next = owner.getSnapshot();
  assert.equal(next.session.draft.canvas.layout[cards[0].id].row, 20); assert.equal(next.session.saved.canvas.layout[cards[0].id].row, 0);
  assert.equal('adapters' in owner, false); assert.equal('coordinator' in owner, false);
  assert.throws(() => Object.defineProperty(next.session.repository, 'source', { value: 'v2' }));
  assert.equal((await next.session.repository.save()).ok, true); assert.equal(f.writes(), 1);
});

test('Stale callback cannot write after cutover admission closes; device import is still denied', async () => {
  const f = fixture(), owner = createWalletOwnerScope(() => f.adapters).getOwner(); await owner.commands.initialize();
  const old = owner.getSnapshot().session;
  const cutover = owner.commands.cutover(old.generation, copy(old.saved));
  assert.equal(owner.getSnapshot().state.phase, 'switching');
  assert.equal((await old.repository.save()).ok, false);
  assert.equal((await cutover).ok, false); assert.equal(owner.getSnapshot().state.phase, 'blocked'); assert.equal(f.writes(), 0);
  await owner.commands.reconcile(); assert.equal((await old.repository.save()).ok, false);
});

test('Listener exceptions cannot turn a published complete bundle into failed activation', async () => {
  const f = fixture(), owner = createWalletOwnerScope(() => f.adapters).getOwner();
  owner.subscribe(() => { throw Error('Synthetic listener failure'); });
  assert.equal((await owner.commands.initialize()).ok, true);
  assert.equal(owner.getSnapshot().state.phase, 'ready_v1'); assert.ok(owner.getListenerFailureCount() > 0);
});

test('Malformed post-write acknowledgement is uncertain rather than a safe precommit failure', async () => {
  const f = fixture(), loaded = await f.adapters.readV1(), doc = copy(loaded.value); doc.revision = 0;
  f.ports.v2.save = async () => ({ schemaVersion: 99 });
  assert.equal((await f.adapters.saveV2(doc, 0)).kind, 'commit_uncertain');
});
