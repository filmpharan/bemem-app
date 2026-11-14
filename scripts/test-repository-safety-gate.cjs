// Synthetic data + mock filesystem only. No native or actual wallet access.
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
const { createWalletRepository, WalletRepositoryError } = load('src/lib/wallet-repository.ts');
const { createWalletStorageAdapters } = load('src/lib/wallet-storage-adapters.ts');
const { createWalletOwnerScope } = load('src/lib/wallet-runtime-owner.ts');
const time = '2026-11-07T00:00:00.000Z';
const filename = n => `wallet-${String(n).padStart(16, '0')}.json`;
const orphan = 'wallet-0000000000000009.foreign.pending';
function doc() {
  return { schemaVersion: 2, dataset: 'bemem-wallet', revision: 0, savedAt: time,
    cards: [{ kind: 'membership', id: 'synthetic-gate', name: 'Synthetic Club', memberNumber: '000001', payload: ' 000001 TEST ',
      preferredDisplayFormat: 'qr', orientation: 'landscape', appearance: { backgroundColor: '#405764', textColor: '#ffffff', imageAssetId: null }, createdAt: time, updatedAt: time }],
    canvas: { columns: 12, layout: { 'synthetic-gate': { col: 0, row: 0 } } } };
}
function gate() { let release; const promise = new Promise(resolve => { release = resolve; }); return { promise, release }; }
function fixture() {
  const data = new Map(); let writes = 0, promotes = 0, seq = 0;
  const files = { scope: {},
    list: async () => [...data.keys()],
    read: async n => { if (!data.has(n)) throw Error('Missing'); return data.get(n); },
    writeExclusive: async (n, text) => { writes++; if (data.has(n)) throw Error('Exists'); data.set(n, text); },
    promoteExclusive: async (p, n) => { promotes++; if (data.has(n)) throw Error('Exists'); data.set(n, data.get(p)); data.delete(p); } };
  const options = { token: () => `gate-${++seq}`, now: () => time };
  const repo = createWalletRepository(files, options);
  const port = { ...repo };
  const adapters = createWalletStorageAdapters({ v1: { load: async () => null, save: async () => { throw Error('Forbidden v1'); } },
    v2: port, demoCards: [], now: () => time });
  return { data, files, repo, options, port, adapters, writes: () => writes, promotes: () => promotes };
}
const rejects = (promise, code) => assert.rejects(promise, e => e instanceof WalletRepositoryError && e.code === code);

test('Pending before direct Repository Save rejects inside the gate without touching the committed snapshot', async () => {
  const f = fixture(), first = await f.repo.save(doc(), 0), bytes = f.data.get(filename(1)), count = f.writes();
  f.data.set(orphan, '{partial');
  await rejects(f.repo.save(first, 1), 'pending_requires_review');
  assert.equal(f.writes(), count); assert.equal(f.data.get(filename(1)), bytes); assert.equal(f.data.get(orphan), '{partial');
});

test('Pending injected AFTER Adapter preflight is still rejected by Repository admission', async () => {
  const f = fixture(), original = f.port.save;
  f.port.save = async (...args) => { f.data.set(orphan, '{partial'); return original(...args); };
  const result = await f.adapters.saveV2(doc(), 0);
  assert.equal(result.kind, 'pending'); assert.equal(result.code, 'pending_requires_review'); assert.equal(f.writes(), 0);
});

test('Two repositories sharing a scope serialize validation/admission and transaction start', async () => {
  const f = fixture(), wait = gate(), write = f.files.writeExclusive;
  f.files.writeExclusive = async (...args) => { await wait.promise; await write(...args); };
  const other = createWalletRepository({ ...f.files }, f.options), first = f.repo.save(doc(), 0);
  await rejects(other.save(doc(), 0), 'save_in_progress');
  wait.release(); await first; assert.equal(f.writes(), 1);
});

test('Revision conflict is checked by the Repository even when the Adapter is bypassed', async () => {
  const f = fixture(); await f.repo.save(doc(), 0); const before = [...f.data], count = f.writes();
  await rejects(f.repo.save(doc(), 0), 'revision_conflict');
  assert.deepEqual([...f.data], before); assert.equal(f.writes(), count);
});

test('Foreign pending appearing after our pending write blocks promotion and retains both files', async () => {
  const f = fixture(), first = await f.repo.save(doc(), 0), read = f.files.read, before = f.data.get(filename(1));
  f.files.read = async n => { if (n.endsWith('.pending')) f.data.set(orphan, '{foreign'); return read(n); };
  const promotions = f.promotes();
  await rejects(f.repo.save(first, 1), 'pending_requires_review');
  assert.equal(f.promotes(), promotions); assert.equal(f.data.get(filename(1)), before);
  assert.equal((await f.repo.inspect()).pendingFiles.length, 2);
});

test('The exclusive pending file owned by the current transaction is not rejected as foreign', async () => {
  const f = fixture(), first = await f.repo.save(doc(), 0), second = await f.repo.save(first, 1);
  assert.equal(second.revision, 2); assert.equal((await f.repo.inspect()).pendingFiles.length, 0);
});

test('Uncertain commit blocks direct/adapter writes until explicit successful Load reinspection', async () => {
  const f = fixture(), promote = f.files.promoteExclusive;
  f.files.promoteExclusive = async (...args) => { await promote(...args); throw Error('After move'); };
  await rejects(f.repo.save(doc(), 0), 'commit_uncertain');
  const count = f.writes(); assert.equal((await f.repo.inspect()).requiresReinspection, true);
  await rejects(f.repo.save(doc(), 0), 'reinspection_required');
  const result = await f.adapters.saveV2(doc(), 0);
  assert.equal(result.kind, 'commit_uncertain'); assert.equal(result.code, 'reinspection_required'); assert.equal(f.writes(), count);
  const loaded = await f.adapters.readV2(); assert.equal(loaded.value.document.revision, 1);
  assert.equal((await f.repo.inspect()).requiresReinspection, false);
  f.files.promoteExclusive = promote;
  assert.equal((await f.adapters.saveV2(loaded.value.document, 1)).value.revision, 2);
});

test('Readback with pending evidence cannot clear the uncertain latch', async () => {
  const f = fixture(); f.files.promoteExclusive = async () => { throw Error('Move did not complete'); };
  await rejects(f.repo.save(doc(), 0), 'commit_uncertain');
  assert.equal((await f.repo.load()).document, null);
  assert.equal((await f.repo.inspect()).requiresReinspection, true);
  await rejects(f.repo.save(doc(), 0), 'reinspection_required');
});

test('A read begun before the uncertain failure cannot acknowledge a later failure', async () => {
  const f = fixture(), wait = gate(), entered = gate(), list = f.files.list, promote = f.files.promoteExclusive;
  let intercept = true;
  f.files.list = async () => { if (intercept) { intercept = false; const old = await list(); entered.release(); await wait.promise; return old; } return list(); };
  const earlyRead = f.repo.load(); await entered.promise;
  f.files.promoteExclusive = async (...args) => { await promote(...args); throw Error('After move'); };
  await rejects(f.repo.save(doc(), 0), 'commit_uncertain');
  wait.release(); await earlyRead;
  assert.equal((await f.repo.inspect()).requiresReinspection, true);
});

test('Blocked schema reason survives Repository -> Adapter -> Coordinator -> Owner', async () => {
  const f = fixture(); await f.repo.save(doc(), 0);
  const owner = createWalletOwnerScope(() => f.adapters).getOwner(); await owner.commands.initialize();
  f.port.save = async () => { throw new WalletRepositoryError('invalid_snapshot', 'unsupported_schema'); };
  const result = await owner.getSnapshot().session.repository.save();
  assert.equal(result.ok, false); assert.equal(result.kind, 'blocked'); assert.equal(result.code, 'invalid_snapshot');
  assert.equal(result.validationCode, 'unsupported_schema');
  const state = owner.getSnapshot().state;
  assert.equal(state.phase, 'blocked'); assert.equal(state.editsAllowed, false);
  assert.deepEqual(state.failure, { kind: 'blocked', code: 'invalid_snapshot', validationCode: 'unsupported_schema' });
  assert.equal((await owner.commands.save(state.generation)).ok, false);
});

test('Corrupt startup schema also preserves its reason through the inspection interface', async () => {
  const f = fixture(); f.data.set(filename(1), JSON.stringify({ ...doc(), revision: 1, schemaVersion: 99 }));
  const owner = createWalletOwnerScope(() => f.adapters).getOwner();
  const result = await owner.commands.initialize();
  assert.equal(result.kind, 'blocked'); assert.equal(result.validationCode, 'unsupported_schema'); assert.equal(f.writes(), 0);
});

test('All five error categories remain distinct through the Coordinator bridge', async () => {
  const cases = [['revision_conflict', 'revision_conflict'], ['pending_requires_review', 'pending'],
    ['invalid_snapshot', 'blocked'], ['commit_uncertain', 'commit_uncertain'], ['pending_write_failed', 'failed']];
  for (const [code, kind] of cases) {
    const f = fixture(); await f.repo.save(doc(), 0);
    const owner = createWalletOwnerScope(() => f.adapters).getOwner(); await owner.commands.initialize();
    f.port.save = async () => { throw new WalletRepositoryError(code); };
    const result = await owner.getSnapshot().session.repository.save();
    assert.equal(result.ok, false); assert.equal(result.kind, kind); assert.equal(result.code, code);
    assert.equal(owner.getSnapshot().state.editsAllowed, false);
  }
});
