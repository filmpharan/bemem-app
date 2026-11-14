// Consent/import execution tests use synthetic data + mock FS, never the phone wallet.
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
const { createMigrationConsent } = load('src/lib/wallet-migration-consent.ts');
const { createWalletRepository } = load('src/lib/wallet-repository.ts');
const { PREVIEW_CARDS: demos, INITIAL_LAYOUT: layout } = load('src/data/wallet-preview.ts');
const clone = x => JSON.parse(JSON.stringify(x)), time = '2026-11-07T00:00:00.000Z';
const name = n => `wallet-${String(n).padStart(16, '0')}.json`;
function setup(withWriter = true) {
  const files = new Map(); let writes = 0;
  const source = { schemaVersion: 1, dataset: 'bemem-phase1-demo-v1', revision: 10, savedAt: time, columns: 12, layout: clone(layout) };
  const adapter = { scope: {}, list: async () => [...files.keys()], read: async n => { if (!files.has(n)) throw Error('Missing'); return files.get(n); },
    writeExclusive: async (n, text) => { writes++; if (files.has(n)) throw Error('Exists'); files.set(n, text); },
    promoteExclusive: async (p, n) => { if (files.has(n)) throw Error('Exists'); files.set(n, files.get(p)); files.delete(p); } };
  const repo = createWalletRepository(adapter, { token: () => 'synthetic-token' });
  const readers = { repo, readV1: async () => clone(source), demoCards: demos };
  const flow = createMigrationConsent(readers, withWriter ? repo : undefined, () => time);
  return { files, source, adapter, repo, readers, flow, writes: () => writes };
}
async function consent(flow) { assert.equal((await flow.preview()).status, 'ready'); assert.equal(flow.requestConsent(), true); }

test('Preview is metadata-only and never writes; source revision 10 and demo count are preserved', async () => {
  const e = setup(), before = clone(e.source), preview = await e.flow.preview();
  assert.equal(preview.status, 'ready'); assert.equal(preview.revision, 10); assert.equal(preview.cardCount, 4);
  assert.equal(preview.source, 'Wallet v1'); assert.equal(preview.pendingCount, 0); assert.equal(preview.canvas, 'compatible');
  assert.equal('wallet' in preview, false); assert.equal('payload' in preview, false);
  assert.equal(e.writes(), 0); assert.deepEqual(e.source, before);
});

test('Confirm without explicit consent is blocked; Cancel invalidates a previously reviewed preview', async () => {
  const e = setup(); await e.flow.preview();
  assert.equal((await e.flow.confirm()).reason, 'explicit_consent_required');
  e.flow.requestConsent(); assert.equal(e.flow.cancel().status, 'cancelled');
  assert.equal((await e.flow.confirm()).status, 'blocked'); assert.equal(e.writes(), 0);
});

test('No device writer means Import stays locked even after preview and consent', async () => {
  const e = setup(false); await consent(e.flow);
  assert.equal((await e.flow.confirm()).reason, 'device_import_locked_pending_approval'); assert.equal(e.writes(), 0);
});

test('Confirmed import uses repository and validates disk readback while retaining every v1 field', async () => {
  const e = setup(), before = clone(e.source); await consent(e.flow);
  const result = await e.flow.confirm(); assert.equal(result.status, 'imported');
  assert.deepEqual(result.metadata, { confirmedAt: time, verifiedAt: time, snapshotRevision: 10 });
  const saved = (await e.repo.load()).document;
  assert.equal(saved.revision, 10); assert.equal(saved.savedAt, time);
  assert.deepEqual(saved.canvas.layout, e.source.layout);
  assert.deepEqual(saved.cards, demos.map(c => ({ kind: 'demo', ...c })));
  assert.ok(saved.cards.every(c => !('payload' in c) && !('memberNumber' in c)));
  assert.deepEqual(e.source, before);
});

test('Revision or content change after Preview requires a fresh review, without writes', async () => {
  for (const change of [s => { s.revision++; }, s => { s.layout[demos[0].id].row = 20; }]) {
    const e = setup(); await consent(e.flow); change(e.source);
    assert.equal((await e.flow.confirm()).reason, 'v1_changed_refresh_preview'); assert.equal(e.writes(), 0);
  }
});

test('A valid v2 already present blocks preview and cannot be overwritten', async () => {
  const e = setup(); await e.repo.importPhase1(JSON.stringify(e.source), demos);
  const before = [...e.files]; assert.equal((await e.flow.preview()).reason, 'v2_already_exists');
  assert.equal(e.flow.requestConsent(), false); assert.equal((await e.flow.confirm()).status, 'blocked');
  assert.deepEqual([...e.files], before);
});

test('Corrupt and unsupported v2 snapshots block Preview without falling back or writing', async () => {
  for (const text of ['{broken', JSON.stringify({ schemaVersion: 99 })]) {
    const e = setup(); e.files.set(name(1), text);
    assert.equal((await e.flow.preview()).status, 'blocked'); assert.equal(e.writes(), 0);
    assert.equal(e.flow.requestConsent(), false);
  }
});

test('Pending before Preview or appearing after Consent blocks import', async () => {
  for (const late of [false, true]) {
    const e = setup(); if (late) await consent(e.flow);
    e.files.set('wallet-0000000000000010.abandoned.pending', '{partial');
    const result = late ? await e.flow.confirm() : await e.flow.preview();
    assert.equal(result.reason, 'pending_requires_review'); assert.equal(e.writes(), 0);
  }
});

test('v2 appearing after Consent is rechecked and blocks duplicate import', async () => {
  const e = setup(); await consent(e.flow); await e.repo.importPhase1(JSON.stringify(e.source), demos);
  const count = e.writes(), before = [...e.files];
  assert.equal((await e.flow.confirm()).reason, 'v2_already_exists');
  assert.equal(e.writes(), count); assert.deepEqual([...e.files], before);
});

test('Canvas incompatibility is a hard gate without moving or clipping data', async () => {
  const e = setup(); const prepare = e.repo.prepareMigration;
  e.repo.prepareMigration = (...args) => {
    const doc = prepare(...args); doc.canvas.layout[demos[0].id].row = 500; return doc;
  };
  const before = clone(e.source); const result = await e.flow.preview();
  assert.equal(result.reason, 'canvas_incompatible'); assert.equal(result.canvas, 'blocked');
  assert.equal(e.flow.requestConsent(), false); assert.equal(e.writes(), 0); assert.deepEqual(e.source, before);
});

test('Pending write failure reports failure and never auto-retries the import', async () => {
  const e = setup(); await consent(e.flow);
  let attempts = 0; e.adapter.writeExclusive = async () => { attempts++; throw Error('Disk full'); };
  assert.equal((await e.flow.confirm()).status, 'failed');
  assert.equal((await e.flow.confirm()).reason, 'new_review_required_after_attempt'); assert.equal(attempts, 1);
});

test('Commit-uncertain after move retains v1 and requires status inspection rather than retry', async () => {
  const e = setup(); await consent(e.flow); const before = clone(e.source), promote = e.adapter.promoteExclusive;
  e.adapter.promoteExclusive = async (...args) => { await promote(...args); throw Error('After move failure'); };
  assert.equal((await e.flow.confirm()).status, 'commit-uncertain');
  assert.equal((await e.repo.load()).document.revision, 10);
  assert.equal((await e.flow.confirm()).reason, 'new_review_required_after_attempt'); assert.deepEqual(e.source, before);
});

test('Successful import cannot be repeated in the same flow or a fresh flow', async () => {
  const e = setup(); await consent(e.flow); assert.equal((await e.flow.confirm()).status, 'imported');
  assert.equal((await e.flow.confirm()).status, 'blocked');
  const fresh = createMigrationConsent(e.readers, e.repo);
  assert.equal((await fresh.preview()).reason, 'v2_already_exists'); assert.equal(e.writes(), 1);
});

test('Source read failure is sanitized and never writes', async () => {
  const e = setup(); e.readers.readV1 = async () => { throw Error('SYNTHETIC_PRIVATE_DETAIL'); };
  const result = await e.flow.preview(); assert.equal(result.status, 'blocked');
  assert.equal(JSON.stringify(result).includes('SYNTHETIC_PRIVATE_DETAIL'), false); assert.equal(e.writes(), 0);
});
