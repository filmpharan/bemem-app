// Native/network dependencies are forbidden. All filesystem operations below are Map operations.
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), ts = require('typescript');
const root = path.resolve(__dirname, '..'), cache = new Map();
function load(relative) {
  const file = path.resolve(root, relative);
  if (cache.has(file)) return cache.get(file).exports;
  const module = { exports: {} }; cache.set(file, module);
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInThisContext(`(function(require,module,exports){${code}\n})`, { filename: file })(name => {
    assert.ok(name.startsWith('.'), `Forbidden native/network dependency: ${name}`);
    return load(path.resolve(path.dirname(file), name + '.ts'));
  }, module, module.exports);
  return module.exports;
}
const { adaptCardForm } = load('src/lib/card-form-adapter.ts');
const { createDevAddCardRuntime, createDevWalletMemory } = load('src/lib/dev-add-card-runtime.ts');
const { createWalletRepository } = load('src/lib/wallet-repository.ts');
const { createWalletStorageAdapters } = load('src/lib/wallet-storage-adapters.ts');
const { createWalletOwnerScope } = load('src/lib/wallet-runtime-owner.ts');
const { resolveWalletStartup } = load('src/lib/wallet-startup.ts');
const { validateWalletDocument } = load('src/lib/wallet-validation.ts');
const { migratePhase1Wallet } = load('src/lib/wallet-migration.ts');
const { emptyCardForm } = load('src/lib/card-form.ts');
const { emptyCardPresentation, WEB_BRANDS } = load('src/lib/card-presentation.ts');
const { CARD_SIZE_PRESETS } = load('src/lib/card-size-presets.ts');
const { canPlace } = load('src/lib/canvas-layout.ts');
const { walletCanvasPresentation } = load('src/lib/wallet-preparation.ts');
const { PREVIEW_CARDS, INITIAL_LAYOUT } = load('src/data/wallet-preview.ts');
const copy = value => JSON.parse(JSON.stringify(value));
const time = '2026-11-07T00:00:00.000Z';
const metadata = { id: 'synthetic-card', createdAt: time, updatedAt: time };
const values = () => ({ ...emptyCardForm(), name: '  Synthetic Club  ', memberNumber: ' 000Ab c ', payload: ' 000Ab c ' });
async function fixture() {
  const memory = createDevWalletMemory(), runtime = createDevAddCardRuntime(memory);
  assert.equal(memory.inspectBytes().length, 0);
  assert.equal((await runtime.initialize()).ok, true);
  assert.equal(memory.inspectBytes().length, 0);
  return { memory, runtime };
}
function add(runtime, preset = CARD_SIZE_PRESETS.find(p=>p.id==='card-landscape')) {
  return runtime.add(runtime.beginSubmission(), { ...values(), orientation: preset.orientation },
    { ...emptyCardPresentation(), sizePresetId: preset.id });
}

test('Adapter maps every real form field without trimming identifiers or payload', () => {
  const v = { ...values(), preferredDisplayFormat: 'code128', payload: ' 000XyZ  ' };
  const p = { ...emptyCardPresentation(), brandQuery: ' Custom Brand ', expiryMonth: '2029-12', side: 'back' };
  const before = JSON.stringify([v, p]);
  const result = adaptCardForm(v, p, metadata); assert.equal(result.ok, true);
  const c = result.card;
  for (const key of ['name', 'memberNumber', 'orientation']) assert.equal(c[key], v[key]);
  assert.equal(c.payload,v.memberNumber); assert.equal(c.preferredDisplayFormat,'qr');
  for (const key of ['expiryMonth', 'sizePresetId']) assert.equal(c[key], p[key]);
  for (const key of ['country', 'brandId', 'brandQuery']) assert.equal(Object.hasOwn(c,key),false);
  assert.equal(c.widthBlocks, 6); assert.equal(c.heightBlocks, 4);
  assert.equal(c.appearance.gradientPresetId, 'ptt'); assert.equal(c.appearance.imageAssetId, null);
  assert.equal(c.id, metadata.id); assert.equal(c.createdAt, time); assert.equal(c.updatedAt, time);
  assert.equal(JSON.stringify([v, p]), before); assert.equal(Object.hasOwn(c, 'side'), false);
});
for (const preset of CARD_SIZE_PRESETS) test(`Form to draft supports ${preset.id}`, async () => {
  const { runtime, memory } = await fixture();
  const result = add(runtime, preset); assert.equal(result.ok, true);
  assert.equal(result.card.widthBlocks, preset.ratioWidth); assert.equal(result.card.heightBlocks, preset.ratioHeight);
  assert.equal(runtime.getSnapshot().session.saved.cards.length, 0);
  assert.deepEqual(runtime.getSnapshot().session.draft.canvas.layout[result.card.id], { col: 0, row: 0 });
  assert.equal(memory.inspectBytes().length, 0);
});
test('Gradients remain explicit and old brand metadata is never persisted by Add', () => {
  for (const brand of WEB_BRANDS) {
    const result = adaptCardForm(values(), { ...emptyCardPresentation(), brandId: brand.id, gradientPresetId: brand.gradient ? brand.id : null }, metadata);
    assert.equal(result.ok, true);
    assert.equal(result.card.appearance.gradientPresetId, brand.gradient ? brand.id : null);
  }
  assert.equal(adaptCardForm(values(), { ...emptyCardPresentation(), brandId: null, gradientPresetId: null }, metadata).card.appearance.gradientPresetId, null);
});

test('Automatic new gradient combinations use the existing white foreground; solid choices keep their palette foreground',()=>{
 for(const colorId of ['slate','leaf','sky','lilac'])for(const gradientPresetId of [null,'seven','the1','ptt','lotus']){
  const result=adaptCardForm({...values(),colorId},{...emptyCardPresentation(),gradientPresetId},metadata);assert.equal(result.ok,true);
  const palette=load('src/lib/card-form.ts').CARD_COLORS.find(c=>c.id===colorId);
  assert.equal(result.card.appearance.textColor,gradientPresetId?'#ffffff':palette.text);
 }
});
test('Invalid form, Code128, presentation, expiration and orientation produce no draft or write', async () => {
  const { runtime, memory } = await fixture();
  const patches = [
    [{ name: '' }, {}], [{ memberNumber: '' }, {}],
    [{ colorId: 'unknown' }, {}],
    [{ memberNumber: '\ud800' }, {}],
    [{ orientation: 'portrait' }, {}], [{}, { country: 'US' }], [{}, { brandId: 'invalid' }],
    [{}, { brandQuery: 42 }], [{}, { expiryMonth: '2029-13' }], [{}, { expiryMonth: '12/2029' }],
    [{}, { sizePresetId: 'custom' }],
  ];
  for (const [v, p] of patches) {
    const result = runtime.add(runtime.beginSubmission(), { ...values(), ...v }, { ...emptyCardPresentation(), ...p });
    assert.equal(result.ok, false, JSON.stringify([v, p]));
  }
  assert.equal(runtime.getSnapshot().session.draft.cards.length, 0); assert.equal(memory.inspectBytes().length, 0);
});
test('QR keeps Unicode payload; Code128 feedback never transforms it', () => {
  const v = { ...values(), payload: ' 000ภาษาไทย ' };
  assert.equal(adaptCardForm(v, emptyCardPresentation(), metadata).card.payload, v.memberNumber);
  const failure = adaptCardForm({ ...v, preferredDisplayFormat: 'code128' }, emptyCardPresentation(), metadata);
  assert.equal(failure.ok,true); assert.equal(failure.card.payload,v.memberNumber); assert.equal(failure.card.preferredDisplayFormat,'qr');
});
test('Unsupported image fields and malformed form values are rejected rather than silently discarded', () => {
  for (const v of [{ ...values(), imageAssetId: 'synthetic-image' }, { ...values(), name: 42 }, { ...values(), payloadEdited: 'false' }]) {
    assert.equal(adaptCardForm(v, emptyCardPresentation(), metadata).ok, false);
  }
  for (const p of [{ ...emptyCardPresentation(), imageUri: 'test-only://image' }, { ...emptyCardPresentation(), expiryMonth: 202912 }]) {
    assert.equal(adaptCardForm(values(), p, metadata).ok, false);
  }
});
test('A form opened before initialization becomes valid only in that initial session', async () => {
  const runtime = createDevAddCardRuntime(), token = runtime.beginSubmission();
  assert.equal(runtime.add(token, values(), emptyCardPresentation()).ok, false);
  await runtime.initialize(); assert.equal(runtime.add(token, values(), emptyCardPresentation()).ok, true);
});
test('Stale submission callback cannot modify a new generation after recovery', async () => {
  const { runtime, memory } = await fixture();
  const stale = runtime.beginSubmission(); add(runtime); memory.failNext('write'); await runtime.save();
  assert.equal((await runtime.reinspect()).ok, true);
  assert.equal(runtime.add(stale, values(), emptyCardPresentation()).ok, false);
  assert.equal(runtime.getSnapshot().session.draft.cards.length, 1);
});
test('Same submission cannot add twice, even after Save or Discard; cancelled form adds nothing', async () => {
  const { runtime } = await fixture();
  const token = runtime.beginSubmission(); runtime.cancelSubmission(token);
  assert.equal(runtime.add(token, values(), emptyCardPresentation()).ok, false);
  const active = runtime.beginSubmission();
  assert.equal(runtime.add(active, values(), emptyCardPresentation()).ok, true);
  assert.equal(runtime.add(active, values(), emptyCardPresentation()).ok, false);
  await runtime.save(); assert.equal(runtime.add(active, values(), emptyCardPresentation()).ok, false);
  runtime.discard(); assert.equal(runtime.add(active, values(), emptyCardPresentation()).ok, false);
  assert.equal(runtime.getSnapshot().session.saved.cards.length, 1);
});
test('Mixed footprints use existing row-major placement, never move others and reject collisions', async () => {
  const { runtime } = await fixture();
  const a = add(runtime), b = add(runtime), c = add(runtime, CARD_SIZE_PRESETS.find(p=>p.id==='vaccine-passport-portrait'));
  assert.ok(a.ok && b.ok && c.ok);
  const wallet = runtime.getSnapshot().session.draft, view = walletCanvasPresentation(wallet);
  assert.deepEqual(view.layout[a.card.id], { col: 0, row: 0 });
  assert.deepEqual(view.layout[b.card.id], { col: 6, row: 0 });
  assert.deepEqual(view.layout[c.card.id], { col: 0, row: 4 });
  for (const card of view.cards) assert.equal(canPlace(card, view.layout[card.id], view.cards, view.layout, Infinity), true);
  assert.equal(runtime.move(c.card.id, { col: 1, row: 1 }), false);
  assert.equal(runtime.move(c.card.id, { col: 8, row: 9 }), false);
  assert.equal(runtime.move(c.card.id, { col: 0.5, row: 8 }), false);
  assert.equal(runtime.move(c.card.id, { col: 2, row: 10 }), true);
  assert.deepEqual(runtime.getSnapshot().session.saved.cards, []);
});
test('Discard drops added cards and positions together, preserving committed snapshot bytes', async () => {
  const { runtime, memory } = await fixture(); add(runtime); await runtime.save();
  const bytes = memory.inspectBytes(), saved = copy(runtime.getSnapshot().session.saved);
  add(runtime, CARD_SIZE_PRESETS.find(p=>p.id==='vaccine-passport-portrait')); runtime.discard();
  assert.deepEqual(runtime.getSnapshot().session.draft, saved); assert.deepEqual(memory.inspectBytes(), bytes);
});
test('One owner rejects concurrent saves, reads back atomic cards/layout and avoids no-op duplicate Save', async () => {
  const { runtime, memory } = await fixture(); add(runtime);
  const first = runtime.save(); assert.equal(runtime.getSnapshot().state.editsAllowed, false);
  assert.equal((await runtime.save()).ok, false);
  assert.equal(add(runtime).ok, false); assert.equal(runtime.discard().ok, false);
  assert.equal((await first).ok, true); assert.equal(runtime.getSnapshot().state.revision, 1);
  assert.deepEqual(runtime.getSnapshot().session.saved, runtime.getSnapshot().session.draft);
  const bytes = memory.inspectBytes(); assert.equal(bytes.length, 1); assert.match(bytes[0][0], /\.json$/);
  assert.equal((await runtime.save()).code, 'nothing_to_save'); assert.deepEqual(memory.inspectBytes(), bytes);
  assert.equal((await runtime.reload()).ok, true);
});
test('New test runtime loads the same Map snapshots through resolver, with exact fields and no import', async () => {
  const { runtime, memory } = await fixture(); add(runtime, CARD_SIZE_PRESETS.find(p=>p.id==='vaccine-passport-portrait')); await runtime.save();
  const saved = copy(runtime.getSnapshot().session.saved), bytes = memory.inspectBytes();
  const restarted = createDevAddCardRuntime(memory); await restarted.initialize();
  assert.deepEqual(restarted.getSnapshot().session.saved, saved); assert.equal(restarted.getSnapshot().state.source, 'v2');
  assert.deepEqual(memory.inspectBytes(), bytes); assert.equal((await restarted.reload()).ok, true);
});
test('Precommit write failure retains draft, blocks admission and requires explicit reinspection before manual retry', async () => {
  const { runtime, memory } = await fixture(); add(runtime); memory.failNext('write');
  assert.equal((await runtime.save()).kind, 'failed'); assert.equal(runtime.getSnapshot().state.phase, 'blocked');
  assert.equal(runtime.getSnapshot().session.draft.cards.length, 1); assert.equal(memory.inspectBytes().length, 0);
  assert.equal((await runtime.save()).ok, false); assert.equal(memory.inspectBytes().length, 0);
  assert.equal((await runtime.reinspect()).ok, true); assert.equal(runtime.getSnapshot().state.dirty, true);
  assert.equal((await runtime.save()).ok, true);
});
test('Pending blocks Save and reinspection never promotes, deletes or retries it', async () => {
  const { runtime, memory } = await fixture(); add(runtime);
  memory.seed('wallet-0000000000000001.foreign.pending', 'synthetic pending evidence');
  const bytes = memory.inspectBytes(); assert.equal((await runtime.save()).kind, 'pending');
  assert.equal(runtime.getSnapshot().state.editsAllowed, false);
  assert.equal((await runtime.reinspect()).ok, false); assert.deepEqual(memory.inspectBytes(), bytes);
});
test('Commit uncertain with pending keeps evidence; no automatic retry or duplicate snapshot', async () => {
  const { runtime, memory } = await fixture(); add(runtime); memory.failNext('promote');
  assert.equal((await runtime.save()).kind, 'commit_uncertain'); const bytes = memory.inspectBytes();
  assert.equal(bytes.length, 1); assert.match(bytes[0][0], /pending$/);
  assert.equal((await runtime.save()).ok, false); assert.equal((await runtime.reinspect()).ok, false);
  assert.deepEqual(memory.inspectBytes(), bytes); assert.equal(runtime.getSnapshot().session.saved.cards.length, 0);
});
test('Post-commit readback failure reports uncertainty, explicit reinspection adopts committed snapshot without re-saving', async () => {
  const { runtime, memory } = await fixture(); add(runtime); memory.failNext('readback');
  assert.equal((await runtime.save()).kind, 'commit_uncertain'); assert.equal(runtime.getSnapshot().state.phase, 'blocked');
  const bytes = memory.inspectBytes(); assert.equal(bytes.length, 1); assert.match(bytes[0][0], /json$/);
  assert.equal((await runtime.reinspect()).ok, true);
  assert.equal(runtime.getSnapshot().state.revision, 1); assert.equal(runtime.getSnapshot().state.dirty, false);
  assert.deepEqual(memory.inspectBytes(), bytes); assert.equal((await runtime.save()).ok, false);
});
test('Revision conflict preserves external snapshot and local draft; changed readback is not reported as success', async () => {
  const { runtime, memory } = await fixture(); add(runtime); await runtime.save();
  const external = copy(runtime.getSnapshot().session.saved); external.revision = 2;
  memory.seed('wallet-0000000000000002.json', JSON.stringify(external));
  assert.equal((await runtime.reload()).code, 'readback_changed');
  add(runtime); const bytes = memory.inspectBytes();
  assert.equal((await runtime.save()).kind, 'revision_conflict');
  assert.deepEqual(memory.inspectBytes(), bytes); assert.equal(runtime.getSnapshot().session.draft.cards.length, 2);
});
test('Corrupt, unsupported and pending-only test wallets never become writable empty wallets', async () => {
  for (const [name, text] of [
    ['wallet-0000000000000001.json', '{broken'],
    ['wallet-0000000000000001.json', JSON.stringify({ schemaVersion: 9 })],
    ['wallet-0000000000000001.orphan.pending', 'pending'],
  ]) {
    const memory = createDevWalletMemory(); memory.seed(name, text); const bytes = memory.inspectBytes();
    const runtime = createDevAddCardRuntime(memory); assert.equal((await runtime.initialize()).ok, false);
    assert.equal(runtime.getSnapshot().state.editsAllowed, false); assert.equal(add(runtime).ok, false);
    assert.deepEqual(memory.inspectBytes(), bytes);
  }
});
test('Legacy v2 membership remains readable, unchanged and unfilled when used by the test runtime', async () => {
  const legacy = adaptCardForm(values(), emptyCardPresentation(), metadata).card;
  for (const key of ['sizePresetId', 'widthBlocks', 'heightBlocks', 'country', 'brandId', 'brandQuery', 'expiryMonth']) delete legacy[key];
  delete legacy.appearance.gradientPresetId;
  const doc = { schemaVersion: 2, dataset: 'bemem-wallet', revision: 4, savedAt: time, cards: [legacy], canvas: { columns: 12, layout: { [legacy.id]: { col: 6, row: 10 } } } };
  const memory = createDevWalletMemory(); memory.seed('wallet-0000000000000004.json', JSON.stringify(doc));
  const before = memory.inspectBytes(), runtime = createDevAddCardRuntime(memory); await runtime.initialize();
  assert.deepEqual(runtime.getSnapshot().session.saved, doc); assert.deepEqual(memory.inspectBytes(), before);
});
test('Fixture-only v1 resolver preserves demo identity, revision/time/layout; existing owner import gate stays locked', async () => {
  const v1 = { schemaVersion: 1, dataset: 'bemem-phase1-demo-v1', revision: 10, savedAt: time, columns: 12, layout: copy(INITIAL_LAYOUT) };
  const original = JSON.stringify(v1), memory = createDevWalletMemory();
  const repo = createWalletRepository(memory.files, { token: () => 'synthetic', now: () => time });
  const resolved = await resolveWalletStartup({ v2: repo, readV1: async () => copy(v1), demoCards: PREVIEW_CARDS });
  assert.equal(resolved.source, 'v1-memory'); assert.equal(resolved.wallet.revision, 10); assert.equal(resolved.wallet.savedAt, time);
  assert.deepEqual(resolved.wallet.canvas.layout, v1.layout);
  assert.deepEqual(resolved.wallet.cards.map(c => c.id), PREVIEW_CARDS.map(c => c.id));
  assert.ok(resolved.wallet.cards.every(c => c.kind === 'demo' && !Object.hasOwn(c, 'memberNumber')));
  assert.deepEqual(validateWalletDocument(resolved.wallet), migratePhase1Wallet(original, PREVIEW_CARDS));
  const adapters = createWalletStorageAdapters({ v1: { load: async () => copy(v1), save: async () => { throw Error('Forbidden'); } }, v2: repo, demoCards: PREVIEW_CARDS });
  const owner = createWalletOwnerScope(() => adapters).getOwner(); await owner.commands.initialize();
  assert.equal((await owner.commands.cutover(owner.getSnapshot().state.generation, resolved.wallet)).ok, false);
  assert.equal(owner.getSnapshot().state.editsAllowed, false);
  assert.equal(JSON.stringify(v1), original); assert.equal(memory.inspectBytes().length, 0);
});
test('DEV module import graph has no real storage, production hook, import path or logging side effect', () => {
  for (const file of [...cache.keys()].filter(f => /dev-add-card-runtime|card-form-adapter/.test(f))) {
    const source = fs.readFileSync(file, 'utf8');
    assert.doesNotMatch(source, /expo-file-system|canvas-storage|wallet-storage['"]|console\.|fetch\(|importPhase1\(/);
  }
  const route = fs.readFileSync(path.join(root, 'src/app/dev-add-card.tsx'), 'utf8');
  assert.match(route, /if \(!__DEV__\) return <Redirect/);
  assert.doesNotMatch(route, /initialize\(|createDevAddCardRuntime\(/);
});


test('Per-card sheet modes validate strictly, preserve legacy absence and roundtrip through existing repository',async()=>{
 const validation=load('src/lib/wallet-validation.ts'),editor=load('src/lib/card-editor-state.ts');
 for(const mode of ['cardcode','frontback']){
  const result=adaptCardForm(values(),{...emptyCardPresentation(),sheetDisplayMode:mode},metadata);assert.equal(result.ok,true);assert.equal(result.card.sheetDisplayMode,mode);
  const legacy=copy(result.card);delete legacy.sheetDisplayMode;const bytes=JSON.stringify(legacy);
  assert.deepEqual(validation.validateWalletCard(legacy),legacy);assert.equal(JSON.stringify(legacy),bytes);assert.equal(editor.membershipEditorState(legacy).presentation.sheetDisplayMode,'cardcode');
  const form=editor.membershipEditorState(legacy);form.values.name='Rename only';const renamed=editor.prepareFullMembershipEdit(legacy,form,time);assert.equal(Object.hasOwn(renamed.card,'sheetDisplayMode'),false);
  for(const bad of [null,undefined,'both',42,true]){assert.throws(()=>validation.validateWalletCard({...legacy,sheetDisplayMode:bad}),/invalid_sheet_display_mode/);assert.equal(adaptCardForm(values(),{...emptyCardPresentation(),sheetDisplayMode:bad},metadata).ok,false);}
  const {runtime,memory}=await fixture();const added=runtime.add(runtime.beginSubmission(),values(),{...emptyCardPresentation(),sheetDisplayMode:mode});assert.equal(added.ok,true);assert.equal((await runtime.save()).ok,true);
  const fresh=createDevAddCardRuntime(memory);assert.equal((await fresh.initialize()).ok,true);assert.equal(fresh.getSnapshot().session.saved.cards[0].sheetDisplayMode,mode);
 }
});
