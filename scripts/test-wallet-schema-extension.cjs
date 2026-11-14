// Schema/readback fixtures live in memory only; no device filesystem or real data.
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
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInThisContext(`(function(require,module,exports){${code}\n})`, { filename: file })(name => {
    assert.ok(name.startsWith('.'), 'No native, network, analytics or filesystem package may be imported by schema code');
    return load(path.resolve(path.dirname(file), name + '.ts'));
  }, module, module.exports);
  return module.exports;
}
const validation = load('src/lib/wallet-validation.ts');
const { CARD_SIZE_PRESETS } = load('src/lib/card-size-presets.ts');
const { WEB_BRANDS, emptyCardPresentation } = load('src/lib/card-presentation.ts');
const { emptyCardForm, changeMembershipNumber, prepareCardForm } = load('src/lib/card-form.ts');
const { createWalletRepository } = load('src/lib/wallet-repository.ts');
const { migratePhase1Wallet } = load('src/lib/wallet-migration.ts');
const { prepareWalletState, walletCanvasPresentation, walletSearchPresentation } = load('src/lib/wallet-preparation.ts');
const { createRuntimeBundleStore } = load('src/lib/wallet-runtime-owner.ts');
const { PREVIEW_CARDS: demos, INITIAL_LAYOUT: initial } = load('src/data/wallet-preview.ts');
const { MAX_ROWS, validateLayout } = load('src/lib/canvas-layout.ts');
const time = '2026-11-07T00:00:00.000Z';
const copy = value => JSON.parse(JSON.stringify(value));
function oldCard(patch = {}) {
  return { kind: 'membership', id: 'synthetic-old', name: 'Synthetic Club', memberNumber: ' 000Ab c ', payload: ' 000Ab c ',
    preferredDisplayFormat: 'qr', orientation: 'landscape', appearance: { backgroundColor: '#405764', textColor: '#ffffff', imageAssetId: 'synthetic-local-asset' },
    createdAt: time, updatedAt: time, ...patch };
}
function newCard(id = 'synthetic-new', presetId = 'card-landscape', patch = {}) {
  const preset = CARD_SIZE_PRESETS.find(p => p.id === presetId);
  return { ...oldCard(), id, sizePresetId: preset.id, widthBlocks: preset.ratioWidth, heightBlocks: preset.ratioHeight,
    orientation: preset.orientation, country: 'TH', brandId: 'ptt', brandQuery: '', expiryMonth: '',
    appearance: { ...oldCard().appearance, gradientPresetId: 'ptt' }, ...patch };
}
function document(cards = [oldCard()], positions) {
  return { schemaVersion: 2, dataset: 'bemem-wallet', revision: 0, savedAt: time, cards,
    canvas: { columns: 12, layout: positions ?? Object.fromEntries(cards.map((c, i) => [c.id, { col: 0, row: i * 10 }])) } };
}
function rejects(fn, code) {
  assert.throws(fn, error => error instanceof validation.WalletValidationError && (!code || error.code === code));
}
function freeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
function memory() {
  const data = new Map(), operations = [];
  const files = {
    scope: {},
    async list() { operations.push('list'); return [...data.keys()]; },
    async read(name) { operations.push('read'); if (!data.has(name)) throw Error('Missing synthetic file'); return data.get(name); },
    async writeExclusive(name, text) { operations.push('write'); assert.equal(data.has(name), false); data.set(name, text); },
    async promoteExclusive(from, to) { operations.push('promote'); assert.equal(data.has(to), false); data.set(to, data.get(from)); data.delete(from); },
  };
  let counter = 0;
  const makeRepo = () => createWalletRepository(files, { token: () => `schema-test-${++counter}`, now: () => time });
  return { data, operations, files, makeRepo, repo: makeRepo() };
}

test('Strict new-card validation supports all seven preset/dimension/orientation combinations', () => {
  for (const preset of CARD_SIZE_PRESETS) {
    const input = newCard('synthetic-new', preset.id);
    assert.deepEqual(validation.validateNewMembershipCard(input), input);
    assert.deepEqual(validation.resolveWalletCardFootprint(input), { widthBlocks: preset.ratioWidth, heightBlocks: preset.ratioHeight, source: 'preset' });
    assert.equal(validation.validateWalletDocument(document([input])).schemaVersion, 2);
  }
});
test('Legacy v2 documents remain valid without adding any extension defaults', () => {
  for (const orientation of ['landscape', 'portrait']) {
    const input = freeze(document([oldCard({ orientation })]));
    const before = JSON.stringify(input), result = validation.validateWalletDocument(input);
    assert.deepEqual(result, input); assert.equal(JSON.stringify(input), before);
    for (const name of ['sizePresetId', 'widthBlocks', 'heightBlocks', 'country', 'brandId', 'brandQuery', 'expiryMonth']) {
      assert.equal(Object.hasOwn(result.cards[0], name), false);
    }
    assert.equal(Object.hasOwn(result.cards[0].appearance, 'gradientPresetId'), false);
  }
});
test('Legacy footprint resolution is detached and preserves the original 6x4/4x6 rules', () => {
  for (const orientation of ['landscape', 'portrait']) {
    const legacy = freeze(oldCard({ orientation })), before = JSON.stringify(legacy);
    assert.deepEqual(validation.resolveWalletCardFootprint(legacy), { widthBlocks: orientation === 'portrait' ? 4 : 6,
      heightBlocks: orientation === 'portrait' ? 6 : 4, source: 'legacy' });
    assert.equal(JSON.stringify(legacy), before);
  }
});
test('The explicit new-card path rejects legacy/incomplete creation contracts while reads still accept them', () => {
  assert.equal(validation.validateWalletCard(oldCard()).kind, 'membership');
  rejects(() => validation.validateNewMembershipCard(oldCard()), 'missing_new_card_details');
  for (const name of ['expiryMonth']) {
    const input = newCard(); delete input[name];
    assert.equal(validation.validateWalletCard(input).kind, 'membership');
    rejects(() => validation.validateNewMembershipCard(input), 'missing_new_card_details');
  }
  const input = newCard(); delete input.appearance.gradientPresetId;
  rejects(() => validation.validateNewMembershipCard(input), 'missing_new_card_details');
});
test('Size fields form an all-or-none triple and never infer new dimensions from orientation', () => {
  for (const name of ['sizePresetId', 'widthBlocks', 'heightBlocks']) {
    const input = newCard(); delete input[name];
    rejects(() => validation.validateWalletCard(input), 'incomplete_card_size');
  }
  rejects(() => validation.validateWalletCard({ ...oldCard(), widthBlocks: 3 }), 'incomplete_card_size');
});
test('Preset ID, dimensions and orientation must agree; custom sizes are not accepted', () => {
  rejects(() => validation.validateNewMembershipCard(newCard('x', 'card-landscape', { sizePresetId: 'unknown' })), 'invalid_size_preset');
  rejects(() => validation.validateNewMembershipCard(newCard('x', 'card-landscape', { widthBlocks: 3 })), 'preset_dimension_mismatch');
  rejects(() => validation.validateNewMembershipCard(newCard('x', 'mini-landscape', { orientation: 'portrait' })), 'preset_orientation_mismatch');
  rejects(() => validation.validateNewMembershipCard(newCard('x', 'card-landscape', { widthBlocks: 12, heightBlocks: 8 })), 'preset_dimension_mismatch');
});
test('Dimensions reject nonintegers, nonpositive numbers, unsafe numbers and more than twelve columns', () => {
  for (const value of [0, -1, 2.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, '6', null, undefined]) {
    rejects(() => validation.validateWalletCard(newCard('x', 'card-landscape', { widthBlocks: value })), 'invalid_card_dimensions');
    rejects(() => validation.validateWalletCard(newCard('x', 'card-landscape', { heightBlocks: value })), 'invalid_card_dimensions');
  }
  rejects(() => validation.validateWalletCard(newCard('x', 'card-landscape', { widthBlocks: 13 })), 'invalid_card_dimensions');
});
test('Country and brand IDs use the existing form catalogue; custom brand text stays exact', () => {
  for (const brand of WEB_BRANDS) {
    const result = validation.validateNewMembershipCard(newCard('x', 'card-landscape', { brandId: brand.id, brandQuery: brand.name }));
    assert.equal(result.brandId, brand.id); assert.equal(result.brandQuery, brand.name);
  }
  const custom = '  Synthetic Custom Brand  ';
  assert.equal(validation.validateNewMembershipCard(newCard('x', 'card-landscape', { brandId: null, brandQuery: custom })).brandQuery, custom);
  for (const country of ['th', 'Thailand', 'US', null, 1]) rejects(() => validation.validateWalletCard(newCard('x', 'card-landscape', { country })), 'invalid_country');
  for (const brandId of ['unknown', '', 1, {}, undefined]) rejects(() => validation.validateWalletCard(newCard('x', 'card-landscape', { brandId })), 'invalid_brand');
  rejects(() => validation.validateWalletCard(newCard('x', 'card-landscape', { brandQuery: null })), 'invalid_text');
});
test('Expiry accepts optional full calendar dates and legacy YYYY-MM without date conversion or trimming', () => {
  for (const expiryMonth of ['', '2028-01', '2028-12', '0001-01', '9999-12', '2028-02-29', '2028-06-15']) {
    assert.equal(validation.validateNewMembershipCard(newCard('x', 'card-landscape', { expiryMonth })).expiryMonth, expiryMonth);
  }
  for (const expiryMonth of ['2028-1', '2028-00', '2028-13', '0000-01', '2028-12-32', ' 2028-12 ', 'December']) {
    rejects(() => validation.validateWalletCard(newCard('x', 'card-landscape', { expiryMonth })), 'invalid_expiry_month');
  }
  for (const expiryMonth of [null, 202812, undefined]) rejects(() => validation.validateWalletCard(newCard('x', 'card-landscape', { expiryMonth })), 'invalid_text');
});
test('Gradient IDs allow only existing rendered presets or null, independently of brand text', () => {
  const allowed = WEB_BRANDS.filter(brand => brand.gradient !== null).map(brand => brand.id);
  for (const gradientPresetId of [...allowed, null]) {
    const input = newCard(); input.appearance.gradientPresetId = gradientPresetId;
    assert.equal(validation.validateNewMembershipCard(input).appearance.gradientPresetId, gradientPresetId);
  }
  for (const gradientPresetId of ['mcard', 'bigc', 'unknown', '', 1, {}, undefined]) {
    const input = newCard(); input.appearance.gradientPresetId = gradientPresetId;
    rejects(() => validation.validateWalletCard(input), 'invalid_gradient_preset');
  }
});
test('Unknown fields remain rejected at wallet, card, appearance and position levels', () => {
  rejects(() => validation.validateWalletCard({ ...newCard(), extra: true }), 'invalid_fields');
  const image = newCard(); image.appearance.frontImageUri = 'synthetic-unsupported';
  rejects(() => validation.validateWalletCard(image), 'invalid_fields');
  rejects(() => validation.validateWalletDocument({ ...document([newCard()]), extra: true }), 'invalid_fields');
  const position = document([newCard()]); position.canvas.layout['synthetic-new'].x = 1;
  rejects(() => validation.validateWalletDocument(position), 'invalid_fields');
});
test('Existing member number, payload, image reference, IDs and timestamps survive unchanged', () => {
  for (const preferredDisplayFormat of ['qr', 'code128']) {
    const input = newCard('synthetic-preserved', 'mini-landscape', { preferredDisplayFormat });
    const result = validation.validateNewMembershipCard(input);
    for (const key of ['kind', 'id', 'name', 'memberNumber', 'payload', 'createdAt', 'updatedAt', 'preferredDisplayFormat']) assert.equal(result[key], input[key]);
    assert.equal(result.appearance.imageAssetId, 'synthetic-local-asset');
    assert.equal(result.payload, ' 000Ab c ');
  }
  const unicode = newCard('synthetic-unicode', 'card-portrait', { payload: '\u0e01\ud83d\ude00' });
  assert.equal(validation.validateNewMembershipCard(unicode).payload, unicode.payload);
  rejects(() => validation.validateNewMembershipCard({ ...unicode, preferredDisplayFormat: 'code128' }), 'unsupported_code128_payload');
});
test('Mixed legacy and new cards collide using their respective full integer footprints', () => {
  const old = oldCard({ id: 'old', orientation: 'portrait' }), first = newCard('first', 'mini-landscape'), second = newCard('second', 'mini-landscape');
  const input = document([old, first, second], { old: { col: 0, row: 0 }, first: { col: 4, row: 0 }, second: { col: 7, row: 0 } });
  assert.deepEqual(validation.validateWalletDocument(input), input);
  const overlapping = copy(input); overlapping.canvas.layout.second.col = 6;
  rejects(() => validation.validateWalletDocument(overlapping), 'overlapping_cards');
  const legacyOverlap = copy(input); legacyOverlap.canvas.layout.first.col = 3;
  rejects(() => validation.validateWalletDocument(legacyOverlap), 'overlapping_cards');
});
test('Canvas bounds and integer coordinates use real size, without visual inset', () => {
  const input = document([newCard('voucher', 'voucher-landscape')], { voucher: { col: 5, row: 0 } });
  assert.equal(validation.validateWalletDocument(input).canvas.layout.voucher.col, 5);
  for (const position of [{ col: 6, row: 0 }, { col: -1, row: 0 }, { col: 0, row: -1 }, { col: 0.5, row: 0 }, { col: 0, row: 1.5 }, { col: 0, row: Number.MAX_SAFE_INTEGER }, { col: 0, row: Infinity }]) {
    rejects(() => validation.validateWalletDocument(document(input.cards, { voucher: position })), 'invalid_position');
  }
});
test('v2 existing unbounded-coordinate reads and Production v1 240-row boundary remain unchanged', () => {
  for (const input of [oldCard(), newCard()]) {
    assert.equal(validation.validateWalletDocument(document([input], { [input.id]: { col: 0, row: 300 } })).canvas.layout[input.id].row, 300);
  }
  assert.equal(MAX_ROWS, 240);
  assert.throws(() => validateLayout({ ...initial, [demos[0].id]: { col: 0, row: 250 } }, demos));
});
test('Extended documents round-trip through the existing JSON decoder without losing fields', () => {
  const input = document(CARD_SIZE_PRESETS.map((p, i) => newCard(`synthetic-${i}`, p.id)));
  const before = JSON.stringify(input);
  assert.deepEqual(validation.decodeWalletDocument(JSON.stringify(validation.validateWalletDocument(input))), input);
  assert.equal(JSON.stringify(input), before);
});
test('Existing Repository saves and verifies the extended snapshot as one transaction in memory', async () => {
  const m = memory(), input = document([newCard()]), before = copy(input);
  const saved = await m.repo.save(input, 0);
  assert.equal(saved.revision, 1); assert.equal(saved.schemaVersion, 2);
  assert.deepEqual(saved.cards, input.cards); assert.deepEqual(saved.canvas, input.canvas);
  assert.deepEqual((await m.makeRepo().load()).document, saved);
  assert.deepEqual(input, before); assert.equal(m.operations.filter(op => op === 'write').length, 1);
  assert.equal(m.operations.filter(op => op === 'promote').length, 1);
  assert.ok(m.operations.filter(op => op === 'read').length >= 3);
});
test('Loading old committed v2 bytes does not rewrite or enrich the snapshot', async () => {
  const m = memory(), input = document(); input.revision = 8;
  const name = 'wallet-0000000000000008.json', bytes = JSON.stringify(input);
  m.data.set(name, bytes);
  assert.deepEqual((await m.repo.load()).document, input);
  assert.equal(m.data.get(name), bytes); assert.equal(m.operations.includes('write'), false);
  assert.equal(m.operations.includes('promote'), false);
});
test('Saving a mixed snapshot keeps old committed bytes, legacy cards and coordinates intact', async () => {
  const m = memory(), first = await m.repo.save(document(), 0);
  const committed = m.data.get('wallet-0000000000000001.json');
  const next = copy(first), added = newCard('new-mini', 'mini-landscape');
  next.cards.push(added); next.canvas.layout[added.id] = { col: 6, row: 0 };
  const saved = await m.repo.save(next, 1);
  assert.equal(saved.revision, 2); assert.deepEqual(saved.cards[0], first.cards[0]);
  assert.deepEqual(saved.canvas.layout[first.cards[0].id], first.canvas.layout[first.cards[0].id]);
  assert.equal(m.data.get('wallet-0000000000000001.json'), committed);
});
test('v1 memory migration still preserves demo kinds, IDs, coordinates and original metadata', () => {
  const input = { schemaVersion: 1, dataset: 'bemem-phase1-demo-v1', revision: 10, savedAt: time, columns: 12, layout: copy(initial) };
  const bytes = JSON.stringify(input), migrated = migratePhase1Wallet(bytes, demos);
  assert.equal(migrated.revision, 10); assert.equal(migrated.savedAt, time);
  assert.deepEqual(migrated.canvas.layout, initial);
  for (const card of migrated.cards) {
    assert.equal(card.kind, 'demo'); assert.equal(Object.hasOwn(card, 'payload'), false);
    assert.equal(Object.hasOwn(card, 'widthBlocks'), false);
  }
  assert.equal(JSON.stringify(input), bytes);
});
test('Strict creation accepts a synthetic mapping from actual form names without changing form helpers', () => {
  const values = { ...changeMembershipNumber(emptyCardForm(), ' 000Ab c '), name: 'Synthetic form' };
  const meta = { id: 'synthetic-form', createdAt: time, updatedAt: time };
  const prepared = prepareCardForm(values, meta); assert.equal(prepared.ok, true);
  const draft = emptyCardPresentation(), preset = CARD_SIZE_PRESETS.find(p => p.id === draft.sizePresetId);
  const input = { ...prepared.card, sizePresetId: draft.sizePresetId, widthBlocks: preset.ratioWidth, heightBlocks: preset.ratioHeight,
    country: draft.country, brandId: draft.brandId, brandQuery: draft.brandQuery, expiryMonth: draft.expiryMonth,
    appearance: { ...prepared.card.appearance, gradientPresetId: 'ptt' } };
  assert.equal(validation.validateNewMembershipCard(input).payload, values.payload);
});
test('Saved/Draft and runtime bundle cloning retain extensions; Canvas/search use the new size IDs', () => {
  const cards = [newCard('mini-a', 'mini-landscape'), newCard('mini-b', 'mini-landscape')];
  const input = document(cards, { 'mini-a': { col: 0, row: 0 }, 'mini-b': { col: 3, row: 0 } });
  const state = prepareWalletState(input);
  state.draft.cards[0].brandQuery = 'Synthetic draft';
  assert.equal(state.saved.cards[0].brandQuery, '');
  const store = createRuntimeBundleStore();
  store.install({ source: 'v2', generation: 0, revision: 0, saved: input, draft: input,
    repository: { source: 'v2', save: async () => { throw Error('Must not write'); } } });
  assert.deepEqual(store.getSnapshot().saved.cards, input.cards);
  const view = walletCanvasPresentation(input);
  assert.deepEqual(view.cards.map(c => c.sizePresetId), ['mini-landscape', 'mini-landscape']);
  assert.ok(view.cards.every(c => !Object.hasOwn(c, 'payload')));
  const search = walletSearchPresentation(input, 'Synthetic', true);
  assert.deepEqual(search.layout['mini-b'], { col: 3, row: 0 });
  assert.deepEqual(input.canvas.layout, { 'mini-a': { col: 0, row: 0 }, 'mini-b': { col: 3, row: 0 } });
});
test('Demo extension fields and unsupported schema versions are still rejected', () => {
  rejects(() => validation.validateWalletCard({ kind: 'demo', ...demos[0], widthBlocks: 6 }), 'invalid_fields');
  rejects(() => validation.validateNewMembershipCard({ kind: 'demo', ...demos[0] }), 'unsupported_card_kind');
  rejects(() => validation.validateWalletDocument({ ...document(), schemaVersion: 3 }), 'unsupported_schema');
});
