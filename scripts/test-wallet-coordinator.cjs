// Synthetic snapshots, injected in-memory ports; no native FileSystem or live UI.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), ts = require('typescript');
const root = path.resolve(__dirname, '..'), cache = new Map();
function load(relative) {
  const file = path.resolve(root, relative);
  if (cache.has(file)) return cache.get(file).exports;
  const module = { exports: {} }; cache.set(file, module);
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const dependency = name => { assert.ok(name.startsWith('.')); return load(path.resolve(path.dirname(file), name + '.ts')); };
  vm.runInThisContext(`(function(require,module,exports){${code}\n})`)(dependency, module, module.exports);
  return module.exports;
}
const { createWalletCoordinator, WalletCoordinatorFailure } = load('src/lib/wallet-coordinator.ts');
const copy = x => JSON.parse(JSON.stringify(x));
const time = '2026-11-07T00:00:00.000Z';
function document() {
  return { schemaVersion: 2, dataset: 'bemem-wallet', revision: 10, savedAt: time,
    cards: [{ kind: 'demo', id: 'synthetic-demo', name: 'Synthetic Club', orientation: 'landscape', colors: ['#405764', '#ffffff'] }],
    canvas: { columns: 12, layout: { 'synthetic-demo': { col: 0, row: 0 } } } };
}
function gate() { let release; const promise = new Promise(resolve => { release = resolve; }); return { promise, release }; }
function setup(source = 'v1') {
  const e = { source, doc: document(), pending: 0, saves: [], imports: 0, activations: [], active: null,
    beforeSave: null, beforeImport: null, beforeInspect: null, failV2Activation: false };
  const ports = {
    async inspect() {
      if (e.beforeInspect) await e.beforeInspect();
      return e.source.startsWith('invalid') ? { source: e.source, pendingCount: e.pending }
        : { source: e.source, wallet: copy(e.doc), pendingCount: e.pending };
    },
    writers: Object.fromEntries(['v1', 'v2'].map(s => [s, { async save(draft, expected) {
      e.saves.push(s); if (e.beforeSave) await e.beforeSave();
      if (expected !== e.doc.revision) throw new WalletCoordinatorFailure('revision_conflict');
      e.doc = { ...copy(draft), revision: expected + 1 }; e.source = s; return copy(e.doc);
    } }])),
    async importV1(prepared) {
      e.imports++; if (e.beforeImport) await e.beforeImport();
      e.source = 'v2'; e.doc = copy(prepared); return copy(e.doc);
    },
    async activate(session) {
      e.activations.push(session);
      if (session.source === 'v2' && e.failV2Activation) throw Error('Synthetic activation failure');
      e.active = session;
    },
  };
  e.ports = ports; e.c = createWalletCoordinator(ports);
  e.generation = () => e.c.getState().generation;
  e.edit = () => {
    const draft = e.c.getSession().draft; draft.canvas.layout['synthetic-demo'].row = 20;
    assert.equal(e.c.updateDraft(e.generation(), draft).ok, true);
  };
  return e;
}

test('loading -> ready_v1 -> switching -> ready_v2; activation receives one coherent envelope', async () => {
  const e = setup(); assert.equal(e.c.getState().phase, 'loading');
  assert.equal((await e.c.initialize()).ok, true); assert.equal(e.c.getState().phase, 'ready_v1');
  const cutover = e.c.cutover(e.generation(), e.doc);
  assert.equal(e.c.getState().phase, 'switching'); assert.equal(e.c.getState().editsAllowed, false);
  assert.equal((await cutover).ok, true); assert.equal(e.c.getState().phase, 'ready_v2');
  assert.equal(e.active.source, 'v2'); assert.equal(e.active.repository.source, 'v2');
  assert.equal(e.active.revision, e.active.saved.revision); assert.deepEqual(e.active.draft, e.active.saved);
  assert.equal(e.imports, 1);
});

test('Cutover closes Save/edit admission synchronously before the first inspection await', async () => {
  const e = setup(); await e.c.initialize(); const old = e.active, wait = gate(); e.beforeInspect = () => wait.promise;
  const cutover = e.c.cutover(e.generation(), e.doc);
  assert.equal((await old.repository.save()).ok, false);
  assert.equal(e.c.updateDraft(old.generation, old.draft).ok, false);
  assert.equal(e.saves.length, 0); e.beforeInspect = null; wait.release(); await cutover;
});

test('An admitted Save drains before Import; changed revision invalidates the earlier Preview', async () => {
  const e = setup(); await e.c.initialize(); e.edit(); const reviewed = copy(e.doc), wait = gate(); e.beforeSave = () => wait.promise;
  const saving = e.c.save(e.generation()); const cutover = e.c.cutover(e.generation(), reviewed);
  await Promise.resolve(); assert.equal(e.imports, 0); assert.equal(e.c.getState().phase, 'switching');
  wait.release(); assert.equal((await saving).ok, true);
  assert.equal((await cutover).code, 'preview_changed'); assert.equal(e.imports, 0);
  assert.equal(e.c.getState().phase, 'blocked');
  await e.c.reconcile(); assert.equal(e.c.getState().revision, 11);
  assert.equal((await e.c.cutover(e.generation(), e.doc)).ok, true);
});

test('Two Saves and duplicate Cutover racing cannot start extra writes/imports', async () => {
  const e = setup(); await e.c.initialize(); const wait = gate(); e.beforeSave = () => wait.promise;
  const first = e.c.save(e.generation()); assert.equal((await e.c.save(e.generation())).ok, false);
  const cutover = e.c.cutover(e.generation(), e.doc);
  assert.equal((await e.c.cutover(e.generation(), e.doc)).ok, false);
  wait.release(); await first; await cutover;
  assert.equal(e.saves.length, 1); assert.equal(e.imports, 0);
});

test('An old v1 callback cannot write after v2 activation', async () => {
  const e = setup(); await e.c.initialize(); const old = e.active;
  await e.c.cutover(e.generation(), e.doc);
  assert.equal((await old.repository.save()).ok, false); assert.equal(e.saves.length, 0);
  assert.equal((await e.active.repository.save()).ok, true); assert.deepEqual(e.saves, ['v2']);
});

test('Unresolved Draft blocks Cutover without discarding any changes', async () => {
  const e = setup(); await e.c.initialize(); e.edit(); const before = e.c.getSession();
  assert.equal((await e.c.cutover(e.generation(), e.doc)).code, 'draft_unresolved');
  assert.deepEqual(e.c.getSession(), before); assert.equal(e.c.getState().phase, 'ready_v1'); assert.equal(e.imports, 0);
});

test('Revision or layout changes after Preview block Import', async () => {
  for (const mutate of [d => { d.revision++; }, d => { d.canvas.layout['synthetic-demo'].row = 30; }]) {
    const e = setup(); await e.c.initialize(); const reviewed = copy(e.doc); mutate(e.doc);
    assert.equal((await e.c.cutover(e.generation(), reviewed)).code, 'preview_changed'); assert.equal(e.imports, 0);
  }
});

test('Pending at startup, including empty storage, blocks all writer admission', async () => {
  for (const source of ['v1', 'v2', 'empty']) {
    const e = setup(source); if (source === 'empty') { e.doc.cards = []; e.doc.canvas.layout = {}; e.doc.revision = 0; }
    e.pending = 1; assert.equal((await e.c.initialize()).code, 'pending_requires_review');
    assert.equal((await e.c.save(e.generation())).ok, false); assert.equal(e.imports, 0);
  }
});

test('Pending appearing at the final admission check blocks Import', async () => {
  const e = setup(); await e.c.initialize(); let reads = 0;
  e.beforeInspect = async () => { if (++reads === 2) e.pending = 1; };
  assert.equal((await e.c.cutover(e.generation(), e.doc)).code, 'pending_requires_review'); assert.equal(e.imports, 0);
});

test('Known failure before commit remains locked until explicit reinspection, not automatic retry', async () => {
  const e = setup(); await e.c.initialize(); e.beforeImport = async () => { throw new WalletCoordinatorFailure('precommit_failure'); };
  assert.equal((await e.c.cutover(e.generation(), e.doc)).code, 'precommit_failure');
  assert.equal(e.c.getState().phase, 'blocked'); assert.equal((await e.c.save(e.generation())).ok, false);
  assert.equal(e.imports, 1); await e.c.reconcile(); assert.equal(e.imports, 1);
  assert.equal(e.c.getState().phase, 'ready_v1');
});

test('Commit uncertain requires reinspection; a discovered v2 activates without importing twice', async () => {
  const e = setup(); await e.c.initialize();
  e.beforeImport = async () => { e.source = 'v2'; throw new WalletCoordinatorFailure('commit_uncertain'); };
  assert.equal((await e.c.cutover(e.generation(), e.doc)).code, 'commit_uncertain');
  assert.equal((await e.c.cutover(e.generation(), e.doc)).ok, false);
  assert.equal((await e.c.reconcile()).ok, true); assert.equal(e.c.getState().phase, 'ready_v2'); assert.equal(e.imports, 1);
});

test('Commit uncertain with pending evidence stays blocked on reinspection', async () => {
  const e = setup(); await e.c.initialize(); e.beforeImport = async () => { e.pending = 1; throw Error('Unknown outcome'); };
  await e.c.cutover(e.generation(), e.doc);
  assert.equal((await e.c.reconcile()).code, 'pending_requires_review'); assert.equal(e.imports, 1);
});

test('Activation failure after verified commit permits only verified Retry Activation', async () => {
  const e = setup(); await e.c.initialize(); const old = e.active; e.failV2Activation = true;
  await e.c.cutover(e.generation(), e.doc);
  assert.equal(e.c.getState().phase, 'activation_incomplete'); assert.equal(e.c.getState().editsAllowed, false);
  assert.equal((await old.repository.save()).ok, false); assert.equal((await e.c.reconcile()).ok, false);
  assert.equal((await e.c.cutover(e.generation(), e.doc)).ok, false);
  e.failV2Activation = false;
  assert.equal((await e.c.retryActivation()).ok, true); assert.equal(e.c.getState().phase, 'ready_v2'); assert.equal(e.imports, 1);
});

test('Retry Activation rejects a changed snapshot rather than installing stale Saved/Draft', async () => {
  const e = setup(); await e.c.initialize(); e.failV2Activation = true; await e.c.cutover(e.generation(), e.doc);
  e.doc.revision++; e.failV2Activation = false;
  assert.equal((await e.c.retryActivation()).code, 'activation_snapshot_changed'); assert.equal(e.imports, 1);
});

test('Corrupt/unsupported v2 enters blocked and can never re-enable v1 after discovery', async () => {
  for (const malformed of [false, true]) {
    const e = setup(malformed ? 'v2' : 'invalid_v2'); if (malformed) e.doc.schemaVersion = 99;
    assert.equal((await e.c.initialize()).code, 'invalid_v2');
    e.source = 'v1'; e.doc = document();
    assert.equal((await e.c.reconcile()).code, 'v2_required_no_v1_fallback'); assert.equal(e.saves.length, 0);
  }
});

test('Existing committed v2 skips Import and rejects later v1 fallback', async () => {
  const e = setup('v2'); await e.c.initialize(); assert.equal(e.c.getState().phase, 'ready_v2');
  assert.equal((await e.c.cutover(e.generation(), e.doc)).ok, false); assert.equal(e.imports, 0);
  e.beforeSave = async () => { throw new WalletCoordinatorFailure('revision_conflict'); };
  await e.c.save(e.generation()); e.source = 'v1';
  assert.equal((await e.c.reconcile()).code, 'v2_required_no_v1_fallback');
});

test('Cancel before Import restores v1 with a NEW generation only after safe inspection', async () => {
  const e = setup(); await e.c.initialize(); const old = e.active, wait = gate(); e.beforeInspect = () => wait.promise;
  const cutover = e.c.cutover(e.generation(), e.doc); assert.equal(e.c.cancelCutover().ok, true);
  assert.equal(e.c.getState().editsAllowed, false); e.beforeInspect = null; wait.release();
  assert.equal((await cutover).code, 'cutover_cancelled'); assert.equal(e.c.getState().phase, 'ready_v1'); assert.equal(e.imports, 0);
  assert.equal((await old.repository.save()).ok, false); assert.notEqual(e.active.generation, old.generation);
});

test('Cancel cannot reopen v1 if v2 appears while draining; cancel after Import starts is rejected', async () => {
  const e = setup(); await e.c.initialize(); const wait = gate(); e.beforeInspect = () => wait.promise;
  const pending = e.c.cutover(e.generation(), e.doc); e.c.cancelCutover(); e.source = 'v2'; e.beforeInspect = null; wait.release();
  assert.equal((await pending).ok, false); assert.equal(e.c.getState().phase, 'blocked'); assert.equal(e.imports, 0);
  const f = setup(); await f.c.initialize(); const importGate = gate(), entered = gate();
  f.beforeImport = async () => { entered.release(); await importGate.promise; };
  const cutover = f.c.cutover(f.generation(), f.doc); await entered.promise;
  assert.equal(f.c.cancelCutover().ok, false); importGate.release(); await cutover;
});

test('Revision conflict preserves Draft; reconciliation cannot silently replace it with remote data', async () => {
  const e = setup(); await e.c.initialize(); e.edit(); const before = e.c.getSession().draft;
  e.doc.revision++; e.doc.cards[0].name = 'Synthetic external change';
  await e.c.save(e.generation()); assert.equal(e.c.getState().reason, 'revision_conflict');
  assert.equal((await e.c.reconcile()).code, 'revision_conflict_draft_retained');
  assert.deepEqual(e.c.getSession().draft, before);
});

test('Empty installation uses only v2 writer; synchronous writer throws do not leave a stuck Save lock', async () => {
  const e = setup('empty'); e.doc.cards = []; e.doc.canvas.layout = {}; e.doc.revision = 0;
  await e.c.initialize(); assert.equal(e.c.getState().phase, 'ready_v2');
  e.ports.writers.v2.save = () => { throw new WalletCoordinatorFailure('precommit_failure'); };
  await e.c.save(e.generation()); assert.equal(e.c.getState().saving, false);
  assert.equal(e.c.getState().phase, 'blocked'); assert.equal(e.imports, 0);
});

test('Cutover waits for an already-running Save activation and never reopens admission while draining', async () => {
  const e = setup(); await e.c.initialize(); e.edit();
  const wait = gate(), entered = gate(), inspectEntered = gate(), inspectWait = gate(), install = e.ports.activate;
  e.ports.activate = async session => { entered.release(); await wait.promise; await install(session); };
  const saving = e.c.save(e.generation()); await entered.promise;
  e.beforeInspect = async () => { inspectEntered.release(); await inspectWait.promise; };
  const cutover = e.c.cutover(e.generation(), e.doc);
  wait.release(); await saving; await inspectEntered.promise;
  assert.equal(e.c.getState().phase, 'switching'); assert.equal(e.c.getState().editsAllowed, false);
  e.beforeInspect = null; inspectWait.release(); await cutover;
  assert.equal(e.c.getState().phase, 'ready_v2');
});

test('A malformed successful Import acknowledgement still latches the v2 barrier', async () => {
  const e = setup(); await e.c.initialize();
  e.ports.importV1 = async () => ({ schemaVersion: 99 });
  assert.equal((await e.c.cutover(e.generation(), e.doc)).code, 'commit_uncertain');
  assert.equal(e.c.getState().committedV2, true);
  assert.equal((await e.c.reconcile()).code, 'v2_required_no_v1_fallback');
});

test('Import never calls the v1 writer or mutates the reviewed source snapshot', async () => {
  const e = setup(), original = e.doc, before = copy(e.doc);
  await e.c.initialize(); await e.c.cutover(e.generation(), original);
  assert.deepEqual(original, before); assert.deepEqual(e.saves, []);
  assert.deepEqual(e.active.saved, before); assert.deepEqual(e.active.draft, before);
});
