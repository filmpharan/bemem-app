// Headless fixture tests: no native filesystem, production storage, UI or network imports.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), ts = require('typescript');
const root = path.resolve(__dirname, '..'), cache = new Map();
function load(relative) {
  const file = path.resolve(root, relative);
  if (cache.has(file)) return cache.get(file).exports;
  const module = { exports: {} }; cache.set(file, module);
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInThisContext(`(function(require,module,exports){${code}\n})`, { filename: file })(name => {
    assert.ok(name.startsWith('.'), `Native/network dependency forbidden: ${name}`);
    return load(path.resolve(path.dirname(file), name + '.ts'));
  }, module, module.exports);
  return module.exports;
}
const { createPreparedWalletRuntime } = load('src/lib/wallet-cutover-runtime.ts');
const { backupPhase1Source } = load('src/lib/wallet-cutover-backup.ts');
const { validateProductionWallet, prepareProductionCardDraft, productionCanvasPresentation } = load('src/lib/wallet-production-policy.ts');
const { createCanvasRepository } = load('src/lib/canvas-repository.ts');
const { createWalletRepository } = load('src/lib/wallet-repository.ts');
const { createWalletStorageAdapters } = load('src/lib/wallet-storage-adapters.ts');
const { createWalletOwnerScope } = load('src/lib/wallet-runtime-owner.ts');
const { adaptCardForm } = load('src/lib/card-form-adapter.ts');
const { emptyCardForm } = load('src/lib/card-form.ts');
const { emptyCardPresentation } = load('src/lib/card-presentation.ts');
const { CARD_SIZE_PRESETS } = load('src/lib/card-size-presets.ts');
const { validateWalletDocument } = load('src/lib/wallet-validation.ts');
const { PREVIEW_CARDS: demos, INITIAL_LAYOUT } = load('src/data/wallet-preview.ts');
const copy = value => JSON.parse(JSON.stringify(value));
const time = '2026-11-07T00:00:00.000Z';
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
function fixture() {
  const initial = { schemaVersion: 1, dataset: 'bemem-phase1-demo-v1', columns: 12, revision: 10, savedAt: time, layout: copy(INITIAL_LAYOUT) };
  const v1 = new Map([['layout-0000000010.json', JSON.stringify(initial, null, 2)]]), v2 = new Map(), backups = new Map(), events = [];
  let token = 0, backupId = 0, pendingV1 = 0, onBackup = null, backupRead = null, saveGate = null, activationFailure = false, fault = null;
  const latest = () => [...v1.keys()].sort().at(-1);
  const v1Repo = createCanvasRepository({ list: async () => [...v1.keys()], read: async name => v1.get(name),
    commit: async (name, text) => { events.push('v1_commit'); if (v1.has(name)) throw Error('exists'); v1.set(name, text); } }, demos);
  const v1Port = { load: v1Repo.load, save: async (layout, expected) => {
    events.push('v1_save_started'); if (saveGate) await saveGate.promise;
    return v1Repo.save(layout, expected);
  } };
  const files = { scope: {}, list: async () => [...v2.keys()], read: async name => {
    if (fault === 'final_read' && name.endsWith('.json')) { fault = null; throw Error('synthetic readback'); }
    if (!v2.has(name)) throw Error('missing'); return v2.get(name);
  }, writeExclusive: async (name, text) => {
    if (fault === 'write') { fault = null; throw Error('synthetic write'); }
    if (v2.has(name)) throw Error('exists'); events.push('v2_pending'); v2.set(name, text);
  }, promoteExclusive: async (pending, committed) => {
    if (fault === 'promote') { fault = null; throw Error('synthetic move'); }
    if (v2.has(committed)) throw Error('exists'); events.push('v2_commit'); v2.set(committed, v2.get(pending)); v2.delete(pending);
  } };
  const repo = createWalletRepository(files, { token: () => `fixture-${++token}`, now: () => time });
  const ports = { v1: v1Port, v2: repo, demoCards: demos,
    readSource: async () => ({ filename: latest(), raw: v1.get(latest()), pendingCount: pendingV1 }),
    backups: { writeExclusive: async (id, bytes) => {
      if (backups.has(id)) throw Error('backup exists'); events.push('backup_write'); backups.set(id, bytes); if (onBackup) await onBackup();
    }, read: async id => backupRead ?? backups.get(id) },
    nextBackupId: () => `backup-${++backupId}`,
    beforeInstall: async session => { if (session.source === 'v2' && activationFailure) throw Error('synthetic activation'); events.push(`activate_${session.source}`); },
  };
  const runtime = createPreparedWalletRuntime(ports);
  return { runtime, ports, repo, v1, v2, backups, events, initial,
    source: ports.readSource,
    pending: n => { pendingV1 = n; },
    backupAction: fn => { onBackup = fn; }, badBackup: bytes => { backupRead = bytes; },
    pauseSave: gate => { saveGate = gate; }, failActivation: value => { activationFailure = value; }, fail: value => { fault = value; },
    bumpV1() { const doc = JSON.parse(v1.get(latest())); doc.revision++; doc.savedAt = '2026-11-08T00:00:00.000Z'; v1.set(`layout-${String(doc.revision).padStart(10, '0')}.json`, JSON.stringify(doc)); },
  };
}
async function initialized() { const f = fixture(); assert.equal((await f.runtime.commands.initialize()).ok, true); return f; }
function reviewed(f) { return copy(f.runtime.getSnapshot().session.saved); }
function cutover(f) { return f.runtime.commands.cutover(f.runtime.getSnapshot().state.generation, reviewed(f)); }
function newCard(id, preset = CARD_SIZE_PRESETS[1]) {
  const result = adaptCardForm({ ...emptyCardForm(), name: 'Synthetic Club', memberNumber: ' 000Ab ', payload: ' 000 CODE ', orientation: preset.orientation },
    { ...emptyCardPresentation(), sizePresetId: preset.id }, { id, createdAt: time, updatedAt: time });
  assert.equal(result.ok, true); return result.card;
}
test('Construction does no I/O or activation; default owner import remains locked', async () => {
  const f = fixture(); assert.deepEqual(f.events, []); assert.equal(f.runtime.getSnapshot().state.phase, 'loading');
  const adapters = createWalletStorageAdapters({ v1: f.ports.v1, v2: f.repo, demoCards: demos });
  const owner = createWalletOwnerScope(() => adapters).getOwner(); await owner.commands.initialize();
  assert.equal((await owner.commands.cutover(owner.getSnapshot().state.generation, copy(owner.getSnapshot().session.saved))).ok, false);
  assert.equal(f.v2.size, 0); assert.equal(f.backups.size, 0);
});
test('Prepared routing writes only v1 before isolated cutover and only v2 afterward', async () => {
  const f = await initialized(), originalSource = [...f.v1.entries()];
  const draft = reviewed(f); draft.canvas.layout[demos[0].id] = { col: 0, row: 30 };
  f.runtime.commands.updateDraft(f.runtime.getSnapshot().state.generation, draft);
  assert.equal((await f.runtime.commands.save(f.runtime.getSnapshot().state.generation)).ok, true);
  assert.equal(f.v1.size, 2); assert.equal(f.v2.size, 0); assert.equal(f.runtime.getSnapshot().state.source, 'v1');
  assert.equal((await cutover(f)).ok, true); const sourceAfter = [...f.v1.entries()];
  const added = prepareProductionCardDraft(reviewed(f), newCard('synthetic-after-cutover'));
  f.runtime.commands.updateDraft(f.runtime.getSnapshot().state.generation, added);
  assert.equal((await f.runtime.commands.save(f.runtime.getSnapshot().state.generation)).ok, true);
  assert.deepEqual([...f.v1.entries()], sourceAfter); assert.equal(f.v1.get(originalSource[0][0]), originalSource[0][1]);
  assert.equal(f.runtime.getSnapshot().state.source, 'v2'); assert.equal(f.v2.size, 2);
  assert.deepEqual(f.events.filter(e => e.endsWith('commit')), ['v1_commit', 'v2_commit', 'v2_commit']);
});
test('Synchronous switch barrier closes Save; backup precedes commit/readback then v2 activation', async () => {
  const f = await initialized(), source = [...f.v1.entries()], oldCapability = f.runtime.getSnapshot().session.repository.save;
  const promise = cutover(f); assert.equal(f.runtime.getSnapshot().state.editsAllowed, false);
  assert.equal((await oldCapability()).ok, false); assert.equal((await f.runtime.commands.save(f.runtime.getSnapshot().state.generation)).ok, false);
  assert.equal((await promise).ok, true); assert.deepEqual([...f.v1.entries()], source);
  assert.ok(f.events.indexOf('backup_write') < f.events.indexOf('v2_commit'));
  assert.ok(f.events.indexOf('v2_commit') < f.events.indexOf('activate_v2'));
  assert.equal(f.backups.size, 1); assert.equal((await oldCapability()).ok, false);
});
test('Cutover drains an admitted v1 Save and rejects the now-stale reviewed revision without import', async () => {
  const f = await initialized(), gate = deferred(); f.pauseSave(gate);
  const doc = reviewed(f); doc.canvas.layout[demos[0].id] = { col: 0, row: 30 };
  f.runtime.commands.updateDraft(f.runtime.getSnapshot().state.generation, doc);
  const saving = f.runtime.commands.save(f.runtime.getSnapshot().state.generation);
  const switching = cutover(f); await Promise.resolve();
  assert.equal(f.runtime.getSnapshot().state.phase, 'switching'); assert.equal(f.backups.size, 0); assert.equal(f.v2.size, 0);
  gate.resolve(); assert.equal((await saving).ok, true); assert.equal((await switching).ok, false);
  assert.equal(f.v1.size, 2); assert.equal(f.v2.size, 0); assert.equal(f.backups.size, 0);
});
test('Unsaved Draft blocks cutover and Cancel before import restores only v1 admission', async () => {
  const f = await initialized(), doc = reviewed(f); doc.canvas.layout[demos[0].id] = { col: 0, row: 30 };
  f.runtime.commands.updateDraft(f.runtime.getSnapshot().state.generation, doc);
  assert.equal((await cutover(f)).code, 'draft_unresolved');
  f.runtime.commands.updateDraft(f.runtime.getSnapshot().state.generation, reviewed(f));
  const operation = cutover(f); assert.equal(f.runtime.commands.cancelCutover().ok, true);
  assert.equal((await operation).code, 'cutover_cancelled'); assert.equal(f.runtime.getSnapshot().state.phase, 'ready_v1');
  assert.equal(f.backups.size, 0); assert.equal(f.v2.size, 0);
});
test('Backup is exclusive, byte-identical, independently readable and preserves raw JSON + demo manifest', async () => {
  const f = fixture(), raw = await f.source(), before = [...f.v1.entries()];
  const receipt = await backupPhase1Source(raw, demos, f.ports.backups, 'unique-copy');
  const stored = JSON.parse(f.backups.get(receipt.id)); assert.equal(stored.source.raw, raw.raw);
  assert.deepEqual(stored.demoCards, demos); assert.deepEqual(stored.source, raw);
  const bytes = f.backups.get(receipt.id);
  await assert.rejects(backupPhase1Source(raw, demos, f.ports.backups, 'unique-copy'), error => error.reason === 'backup_not_verified');
  assert.equal(f.backups.get(receipt.id), bytes); assert.deepEqual([...f.v1.entries()], before);
});
test('Unverified backup blocks import without deleting evidence or modifying v1', async () => {
  const f = await initialized(), before = [...f.v1.entries()]; f.badBackup('{corrupt-copy');
  assert.equal((await cutover(f)).code, 'backup_not_verified'); assert.equal(f.v2.size, 0);
  assert.equal(f.backups.size, 1); assert.deepEqual([...f.v1.entries()], before);
  assert.equal(f.runtime.getSnapshot().state.editsAllowed, false);
});
test('Source revision changed after backup stops before import; backup stays and no old source is overwritten', async () => {
  const f = await initialized(), original = [...f.v1.entries()]; f.backupAction(() => f.bumpV1());
  assert.equal((await cutover(f)).code, 'v1_source_changed'); assert.equal(f.v2.size, 0); assert.equal(f.backups.size, 1);
  assert.equal(f.v1.get(original[0][0]), original[0][1]); assert.equal(f.runtime.getSnapshot().state.editsAllowed, false);
});
test('Even same-revision raw-byte changes during backup reject stale source', async () => {
  const f = await initialized(); f.backupAction(() => { const key = [...f.v1.keys()][0]; f.v1.set(key, f.v1.get(key) + '\n'); });
  assert.equal((await cutover(f)).code, 'v1_source_changed'); assert.equal(f.v2.size, 0);
});
test('Pending v1 or v2 before/during cutover blocks all writes and never promotes evidence', async () => {
  const old = fixture(); old.pending(1); assert.equal((await old.runtime.commands.initialize()).ok, false); assert.equal(old.v2.size, 0);
  const f = await initialized(); f.backupAction(() => { f.v2.set('wallet-0000000000000010.foreign.pending', 'pending'); });
  assert.equal((await cutover(f)).kind, 'pending'); const bytes = [...f.v2.entries()];
  assert.equal((await f.runtime.commands.reconcile()).ok, false); assert.deepEqual([...f.v2.entries()], bytes);
});
test('Committed v2 appearing during backup is a sticky barrier even after later loss of visibility', async () => {
  const f = await initialized(); f.backupAction(() => f.v2.set('wallet-0000000000000010.json', JSON.stringify(reviewed(f))));
  assert.equal((await cutover(f)).code, 'v2_already_exists'); assert.equal(f.runtime.getSnapshot().state.committedV2, true);
  f.v2.clear(); // Simulated visibility loss only, never a production recovery operation.
  assert.equal((await f.runtime.commands.reconcile()).ok, false); assert.equal(f.runtime.getSnapshot().state.editsAllowed, false);
  assert.equal(f.v1.size, 1);
});
test('A prepared v1 Save observing committed v2 never writes and retains the same one-way barrier', async () => {
  const f = await initialized(); f.v2.set('wallet-0000000000000010.json', JSON.stringify(reviewed(f)));
  const original = [...f.v1.entries()];
  assert.equal((await f.runtime.commands.save(f.runtime.getSnapshot().state.generation)).code, 'v2_already_exists');
  assert.equal(f.runtime.getSnapshot().state.committedV2, true); assert.deepEqual([...f.v1.entries()], original);
  f.v2.clear(); assert.equal((await f.runtime.commands.reconcile()).ok, false);
  assert.equal(f.runtime.getSnapshot().state.editsAllowed, false);
});
test('Write failure keeps v1/backup, reports failure, no automatic retry; explicit reinspection is required', async () => {
  const f = await initialized(); f.fail('write');
  assert.equal((await cutover(f)).kind, 'failed'); assert.equal(f.v2.size, 0); assert.equal(f.v1.size, 1); assert.equal(f.backups.size, 1);
  assert.equal((await cutover(f)).ok, false); assert.equal(f.backups.size, 1);
  assert.equal((await f.runtime.commands.reconcile()).ok, true);
  assert.equal(f.runtime.getSnapshot().state.source, 'v1');
});
test('Uncertain move leaves pending and writer locked across reinspection, without retry', async () => {
  const f = await initialized(); f.fail('promote');
  assert.equal((await cutover(f)).kind, 'commit_uncertain'); const bytes = [...f.v2.entries()];
  assert.equal(f.runtime.getSnapshot().state.editsAllowed, false); assert.equal(bytes.length, 1); assert.match(bytes[0][0], /pending$/);
  assert.equal((await f.runtime.commands.reconcile()).ok, false); assert.deepEqual([...f.v2.entries()], bytes);
  assert.equal(f.backups.size, 1);
});
test('Post-commit readback uncertainty never reimports; explicit reinspection activates verified v2', async () => {
  const f = await initialized(); f.fail('final_read');
  assert.equal((await cutover(f)).kind, 'commit_uncertain'); assert.equal(f.runtime.getSnapshot().state.editsAllowed, false);
  const bytes = [...f.v2.entries()]; assert.equal((await f.runtime.commands.reconcile()).ok, true);
  assert.equal(f.runtime.getSnapshot().state.source, 'v2'); assert.deepEqual([...f.v2.entries()], bytes); assert.equal(f.backups.size, 1);
});
test('Commit then activation failure stays locked; Retry Activation never writes or backs up again', async () => {
  const f = await initialized(); f.failActivation(true);
  assert.equal((await cutover(f)).code, 'runtime_activation_failed'); assert.equal(f.runtime.getSnapshot().state.phase, 'activation_incomplete');
  assert.equal(f.runtime.getSnapshot().state.editsAllowed, false); const bytes = [...f.v2.entries()];
  assert.equal((await cutover(f)).ok, false); f.failActivation(false);
  assert.equal((await f.runtime.commands.retryActivation()).ok, true); assert.equal(f.runtime.getSnapshot().state.source, 'v2');
  assert.deepEqual([...f.v2.entries()], bytes); assert.equal(f.backups.size, 1); assert.equal(f.v1.size, 1);
});
test('Duplicate cutover is rejected; isolated restart uses v2 snapshot and leaves source/backup unchanged', async () => {
  const f = await initialized(), expected = reviewed(f); assert.equal((await cutover(f)).ok, true);
  assert.equal((await cutover(f)).ok, false); const files = [...f.v2.entries()], source = [...f.v1.entries()];
  const restarted = createPreparedWalletRuntime(f.ports); assert.equal((await restarted.commands.initialize()).ok, true);
  assert.deepEqual(restarted.getSnapshot().session.saved, expected); assert.equal(restarted.getSnapshot().state.source, 'v2');
  assert.deepEqual([...f.v2.entries()], files); assert.deepEqual([...f.v1.entries()], source); assert.equal(f.backups.size, 1);
});
test('Corrupt or unsupported v2 never falls back to a valid v1', async () => {
  for (const text of ['{broken', JSON.stringify({ schemaVersion: 99 })]) {
    const f = fixture(); f.v2.set('wallet-0000000000000010.json', text);
    assert.equal((await f.runtime.commands.initialize()).ok, false); assert.equal(f.runtime.getSnapshot().state.editsAllowed, false);
    assert.equal(f.backups.size, 0); assert.equal(f.v1.size, 1);
  }
});
test('Unknown legacy metadata is fail-closed; migration preserves IDs/kinds/color/order/revision/time exactly', async () => {
  const f = await initialized(), expected = reviewed(f); assert.equal((await cutover(f)).ok, true);
  assert.deepEqual(expected.cards, demos.map(c => ({ kind: 'demo', id: c.id, name: c.name, orientation: c.orientation, colors: [...c.colors] })));
  assert.deepEqual(f.runtime.getSnapshot().session.saved, expected); assert.equal(expected.revision, 10); assert.equal(expected.savedAt, time);
  const invalid = fixture(), key = [...invalid.v1.keys()][0], source = JSON.parse(invalid.v1.get(key)); source.metadata = { synthetic: true };
  invalid.v1.set(key, JSON.stringify(source)); assert.equal((await invalid.runtime.commands.initialize()).ok, false);
  assert.equal(invalid.backups.size, 0); assert.equal(invalid.v2.size, 0);
});
test('Legacy v2 cards with absent optional details retain legacy footprints without backfilling', () => {
  const card = newCard('legacy'); for (const key of ['sizePresetId', 'widthBlocks', 'heightBlocks', 'country', 'brandId', 'brandQuery', 'expiryMonth']) delete card[key];
  delete card.appearance.gradientPresetId;
  const doc = { schemaVersion: 2, dataset: 'bemem-wallet', revision: 1, savedAt: time, cards: [card], canvas: { columns: 12, layout: { legacy: { col: 6, row: 236 } } } };
  assert.deepEqual(validateProductionWallet(doc), doc); const before = JSON.stringify(doc);
  const next = prepareProductionCardDraft(doc, newCard('new-card')); assert.equal(next.canvas.layout['new-card'].col, 0);
  assert.equal(JSON.stringify(doc), before); assert.equal(Object.hasOwn(next.cards[0], 'widthBlocks'), false);
});
for (const preset of CARD_SIZE_PRESETS) test(`240-row policy: ${preset.id} exact footprint accepted at boundary and blocked beyond it`, () => {
  const card = newCard('boundary', preset);
  const doc = { schemaVersion: 2, dataset: 'bemem-wallet', revision: 1, savedAt: time, cards: [card],
    canvas: { columns: 12, layout: { boundary: { col: 12 - preset.ratioWidth, row: 240 - preset.ratioHeight } } } };
  assert.deepEqual(validateProductionWallet(doc), doc);
  doc.canvas.layout.boundary.row++;
  assert.doesNotThrow(() => validateWalletDocument(doc)); // persisted schema remains unbounded.
  assert.throws(() => validateProductionWallet(doc), error => error.reason === 'canvas_240_row_limit');
});
test('Full 240-row grid fails placement explicitly, never moves/scales cards or creates an unsaveable draft', () => {
  const cards = [], layout = {};
  for (let row = 0; row < 240; row += 4) for (const col of [0, 6]) { const card = newCard(`filled-${row}-${col}`); cards.push(card); layout[card.id] = { col, row }; }
  const doc = { schemaVersion: 2, dataset: 'bemem-wallet', revision: 1, savedAt: time, cards, canvas: { columns: 12, layout } }, before = JSON.stringify(doc);
  validateProductionWallet(doc);
  assert.throws(() => prepareProductionCardDraft(doc, newCard('overflow')), error => error.reason === 'canvas_capacity_reached');
  assert.equal(JSON.stringify(doc), before);
});
test('Prepared owner rejects >240 draft before Save and blocks >240 stored v2 activation', async () => {
  const f = await initialized(), doc = reviewed(f); doc.canvas.layout[demos[0].id] = { col: 0, row: 240 };
  const before = copy(f.runtime.getSnapshot().session.draft);
  assert.equal(f.runtime.commands.updateDraft(f.runtime.getSnapshot().state.generation, doc).code, 'canvas_240_row_limit');
  assert.deepEqual(f.runtime.getSnapshot().session.draft, before); assert.equal(f.v2.size, 0);
  f.v2.set('wallet-0000000000000010.json', JSON.stringify(doc));
  const fresh = createPreparedWalletRuntime(f.ports); assert.equal((await fresh.commands.initialize()).ok, false);
  assert.equal(fresh.getSnapshot().state.editsAllowed, false); assert.equal(f.v1.size, 1);
});
test('Prepared v1 runtime rejects membership-card changes at Draft admission instead of failing only on Save', async () => {
  const f = await initialized(), current = reviewed(f), candidate = prepareProductionCardDraft(current, newCard('not-yet-v2'));
  assert.equal(f.runtime.commands.updateDraft(f.runtime.getSnapshot().state.generation, candidate).code, 'v1_card_changes_not_supported');
  assert.deepEqual(f.runtime.getSnapshot().session.draft, current); assert.equal(f.v2.size, 0); assert.equal(f.v1.size, 1);
});
test('Activation policy is rechecked after the optional composition callback before installing a bundle', async () => {
  const f = fixture(); f.ports.beforeInstall = async session => {
    if (session.source === 'v2') session.draft.canvas.layout[demos[0].id].row = 240;
  };
  const runtime = createPreparedWalletRuntime(f.ports); await runtime.commands.initialize();
  const outcome = await runtime.commands.cutover(runtime.getSnapshot().state.generation, copy(runtime.getSnapshot().session.saved));
  assert.equal(outcome.ok, false); assert.equal(runtime.getSnapshot().state.phase, 'activation_incomplete');
  assert.equal(runtime.getSnapshot().state.editsAllowed, false); assert.equal(runtime.getSnapshot().session.source, 'v1');
});
test('Future Home presentation uses Saved only, Create uses Draft; Search is temporary and clears to exact Saved positions', async () => {
  const f = await initialized(), saved = reviewed(f), draft = copy(saved); draft.canvas.layout[demos[0].id] = { col: 0, row: 30 };
  const envelope = { saved, draft }, before = JSON.stringify(envelope);
  assert.deepEqual(productionCanvasPresentation(envelope, 'home').layout, saved.canvas.layout);
  assert.deepEqual(productionCanvasPresentation(envelope, 'create').layout, draft.canvas.layout);
  const search = productionCanvasPresentation(envelope, 'home', demos[0].name, true);
  assert.equal(search.cards.length, 1); assert.deepEqual(search.layout[demos[0].id], { col: 0, row: 0 });
  assert.deepEqual(productionCanvasPresentation(envelope, 'home', '', true).layout, saved.canvas.layout);
  assert.equal(productionCanvasPresentation(envelope, 'create', demos[0].name, true).active, false);
  assert.equal(JSON.stringify(envelope), before);
});
test('Headless safety modules remain native-free and production hook delegates to its single owner', () => {
  for (const filename of ['wallet-cutover-runtime.ts', 'wallet-cutover-backup.ts', 'wallet-production-policy.ts']) {
    const source = fs.readFileSync(path.join(root, 'src/lib', filename), 'utf8');
    assert.doesNotMatch(source, /expo-file-system|canvas-storage|from ['"]\.\/wallet-storage['"]|fetch\(|console\./);
  }
  for (const filename of ['src/app/index.tsx', 'src/app/_layout.tsx', 'src/hooks/use-wallet-canvas.ts']) {
    assert.doesNotMatch(fs.readFileSync(path.join(root, filename), 'utf8'), /createPreparedWalletRuntime|wallet-cutover-runtime/);
  }
  const hook = fs.readFileSync(path.join(root, 'src/hooks/use-wallet-canvas.ts'), 'utf8');
  assert.doesNotMatch(hook, /canvasStorage\.save|canvas-storage/);
  assert.match(hook, /runtime\.commands\.save/);
});
