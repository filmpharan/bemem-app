// Step 1 only: synthetic data, memory-only execution; no file/network/log adapters.
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const cache = new Map();
const loaded = [];
function load(relative) {
  const file = path.resolve(root, relative);
  if (cache.has(file)) return cache.get(file).exports;
  loaded.push(path.relative(root, file));
  const module = { exports: {} }; cache.set(file, module);
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  function dependency(name) {
    assert.ok(name.startsWith('.'), 'Model must not load native/network/IO packages');
    return load(path.resolve(path.dirname(file), name + '.ts'));
  }
  vm.runInThisContext(`(function(require,module,exports){${code}\n})`, { filename: file })(dependency, module, module.exports);
  return module.exports;
}
const { validateWalletCard, validateWalletDocument, decodeWalletDocument, payloadCapabilities, WalletValidationError } = load('src/lib/wallet-validation.ts');
const { migratePhase1Wallet } = load('src/lib/wallet-migration.ts');
const { PREVIEW_CARDS: demos, INITIAL_LAYOUT: initial } = load('src/data/wallet-preview.ts');
const clone = x => JSON.parse(JSON.stringify(x));
const timestamp = '2026-11-07T00:00:00.000Z';
function member(overrides = {}) {
  return { kind: 'membership', id: 'test-card-1', name: 'Synthetic Club', memberNumber: '00001234', payload: '00001234',
    preferredDisplayFormat: 'qr', orientation: 'landscape', appearance: { backgroundColor: '#405764', textColor: '#ffffff', imageAssetId: null },
    createdAt: timestamp, updatedAt: timestamp, ...overrides };
}
function wallet() {
  return { schemaVersion: 2, dataset: 'bemem-wallet', revision: 0, savedAt: timestamp,
    cards: [member()], canvas: { columns: 12, layout: { 'test-card-1': { col: 0, row: 0 } } } };
}
function legacy() {
  return { schemaVersion: 1, dataset: 'bemem-phase1-demo-v1', revision: 7, savedAt: timestamp, columns: 12, layout: clone(initial) };
}
function rejects(fn, code) {
  assert.throws(fn, e => e instanceof WalletValidationError && (!code || e.code === code));
}
function freeze(x) {
  if (x && typeof x === 'object') { Object.values(x).forEach(freeze); Object.freeze(x); }
  return x;
}

test('One original payload supports either preferred format without losing leading zeroes', () => {
  for (const format of ['qr', 'code128']) {
    const card = validateWalletCard(member({ preferredDisplayFormat: format }));
    assert.equal(card.payload, '00001234');
    assert.equal(card.memberNumber, '00001234');
    assert.equal(card.preferredDisplayFormat, format);
    assert.equal(payloadCapabilities(card.payload).qr.eligible, true);
    assert.equal(payloadCapabilities(card.payload).code128.eligible, true);
    assert.equal(payloadCapabilities(card.payload).qr.encoderValidationRequired, true);
  }
});

test('Payload spaces, case, combining marks and supplementary characters survive unchanged', () => {
  for (const payload of [' 000A a ', 'e\u0301', '\u0e01\u0e02', '\ud83d\ude00', '   ']) {
    assert.equal(validateWalletCard(member({ payload })).payload, payload);
  }
});

test('Unsupported Code128 characters are reported; QR eligibility does not silently change payload', () => {
  for (const payload of ['\u0e01', '\u00e9', '\nABC', '\tABC', '\u007f', '\u0000']) {
    const capabilities = payloadCapabilities(payload);
    assert.equal(capabilities.code128.eligible, false);
    assert.ok(capabilities.code128.reason);
    assert.equal(validateWalletCard(member({ payload })).payload, payload);
    rejects(() => validateWalletCard(member({ payload, preferredDisplayFormat: 'code128' })), 'unsupported_code128_payload');
  }
});

test('Empty/numeric payload and unpaired surrogates are rejected without normalizing data', () => {
  for (const payload of ['', 1234, null, '\ud800', '\udc00', '\ud800x']) rejects(() => validateWalletCard(member({ payload })));
  rejects(() => payloadCapabilities(''));
});

test('Membership metadata, appearance, IDs, timestamps and unknown fields are validated', () => {
  const bad = [
    { name: '   ' }, { memberNumber: 1234 }, { preferredDisplayFormat: 'ean13' }, { orientation: 'square' },
    { kind: 'unknown' }, { id: '__proto__' }, { id: 'constructor' }, { id: 'prototype' }, { id: '../card' },
    { createdAt: 'not-a-date' }, { updatedAt: '2020-01-01T00:00:00Z' },
    { appearance: { backgroundColor: 'red', textColor: '#ffffff', imageAssetId: null } },
    { appearance: { backgroundColor: '#000000', textColor: '#ffffff', imageAssetId: 'https://example.invalid/image' } },
    { extra: 'not-in-schema' },
  ];
  for (const patch of bad) rejects(() => validateWalletCard(member(patch)));
  const missing = member(); delete missing.payload;
  rejects(() => validateWalletCard(missing));
});

test('Demo cards cannot carry membership payloads or masquerade as real cards', () => {
  const demo = { ...demos[0], kind: 'demo' };
  assert.equal(validateWalletCard(demo).kind, 'demo');
  rejects(() => validateWalletCard({ ...demo, payload: '00001234' }));
  rejects(() => validateWalletCard({ ...demo, kind: 'membership' }));
  rejects(() => validateWalletCard({ ...demo, colors: ['#000000'] }));
});

test('v2 round trip reconstructs a detached validated snapshot', () => {
  const source = freeze(wallet());
  const result = decodeWalletDocument(JSON.stringify(source));
  assert.deepEqual(result, source);
  assert.notEqual(result.cards[0], source.cards[0]);
  assert.notEqual(result.cards[0].appearance, source.cards[0].appearance);
  assert.notEqual(result.canvas.layout, source.canvas.layout);
  result.canvas.layout['test-card-1'].row = 10;
  assert.equal(source.canvas.layout['test-card-1'].row, 0);
});

test('Unsupported schemas, malformed JSON and malformed document structures fail closed', () => {
  for (const value of [null, [], 123, {}, { ...wallet(), schemaVersion: 1 }, { ...wallet(), schemaVersion: 3 },
    { ...wallet(), dataset: 'other' }, { ...wallet(), revision: -1 }, { ...wallet(), revision: 1.5 },
    { ...wallet(), revision: Number.MAX_SAFE_INTEGER + 1 }, { ...wallet(), cards: {} },
    { ...wallet(), savedAt: 'broken' }, { ...wallet(), extra: true }]) rejects(() => validateWalletDocument(value));
  rejects(() => decodeWalletDocument('{bad-json'), 'invalid_json');
  rejects(() => validateWalletDocument({ ...wallet(), schemaVersion: 99 }), 'unsupported_schema');
});

test('Duplicate IDs, missing/extra layout entries and extra position fields are rejected', () => {
  const duplicate = wallet(); duplicate.cards.push(member());
  rejects(() => validateWalletDocument(duplicate), 'duplicate_card_id');
  for (const layout of [{}, { other: { col: 0, row: 0 } },
    { 'test-card-1': { col: 0, row: 0 }, extra: { col: 6, row: 0 } },
    { 'test-card-1': { col: 0, row: 0, extra: 1 } }]) {
    const doc = wallet(); doc.canvas.layout = layout;
    rejects(() => validateWalletDocument(doc));
  }
});

test('Dynamic rows beyond 240 are accepted; existing positions remain exact', () => {
  const doc = wallet(); doc.canvas.layout['test-card-1'] = { col: 6, row: 50000 };
  assert.deepEqual(validateWalletDocument(doc).canvas.layout, doc.canvas.layout);
  doc.canvas.layout['test-card-1'].row = Number.MAX_SAFE_INTEGER - 4;
  assert.equal(validateWalletDocument(doc).canvas.layout['test-card-1'].row, Number.MAX_SAFE_INTEGER - 4);
});

test('Large wallets have no fixed card-count limit derived from the screen', () => {
  const doc = wallet(); doc.cards = []; doc.canvas.layout = {};
  for (let i = 0; i < 600; i++) {
    const card = member({ id: `test-${i}`, orientation: i % 2 ? 'portrait' : 'landscape' });
    doc.cards.push(card); doc.canvas.layout[card.id] = { col: 0, row: i * 6 };
  }
  assert.equal(validateWalletDocument(doc).cards.length, 600);
});

test('Nonfinite, unsafe, negative, fractional and horizontally overflowing coordinates are rejected', () => {
  for (const position of [{ col: -1, row: 0 }, { col: 7, row: 0 }, { col: 0, row: -1 }, { col: 0, row: 0.5 },
    { col: 0, row: Infinity }, { col: NaN, row: 0 }, { col: 0, row: Number.MAX_SAFE_INTEGER }, { col: '0', row: 0 }]) {
    const doc = wallet(); doc.canvas.layout['test-card-1'] = position;
    rejects(() => validateWalletDocument(doc), 'invalid_position');
  }
});

test('Mixed-orientation collisions are rejected but edge-touching rectangles are allowed', () => {
  const doc = wallet(); doc.cards.push(member({ id: 'test-2', orientation: 'portrait' }));
  doc.canvas.layout['test-2'] = { col: 6, row: 0 };
  assert.equal(validateWalletDocument(doc).cards.length, 2);
  doc.canvas.layout['test-2'].col = 5;
  rejects(() => validateWalletDocument(doc), 'overlapping_cards');
});

test('An empty v2 wallet is valid and contains no implicit demo cards', () => {
  const doc = wallet(); doc.cards = []; doc.canvas.layout = {};
  assert.deepEqual(validateWalletDocument(doc), doc);
});

test('Migration preserves Phase 1 IDs, coordinates, colors, revision and savedAt without mutation', () => {
  const source = freeze(legacy()), fixtures = freeze(clone(demos));
  const raw = JSON.stringify(source), beforeFixtures = JSON.stringify(fixtures);
  const result = migratePhase1Wallet(raw, fixtures);
  assert.equal(result.schemaVersion, 2);
  assert.equal(result.revision, source.revision);
  assert.equal(result.savedAt, source.savedAt);
  assert.deepEqual(result.canvas.layout, source.layout);
  assert.deepEqual(result.cards.map(c => c.id), fixtures.map(c => c.id));
  for (let i = 0; i < fixtures.length; i++) {
    assert.deepEqual(result.cards[i], { kind: 'demo', ...fixtures[i] });
    assert.equal('payload' in result.cards[i], false);
    assert.notEqual(result.cards[i].colors, fixtures[i].colors);
  }
  assert.equal(JSON.stringify(source), raw);
  assert.equal(JSON.stringify(fixtures), beforeFixtures);
  assert.deepEqual(migratePhase1Wallet(raw, fixtures), result);
});

test('Legacy decoder remains authoritative: unsupported schema, corrupt or colliding legacy layouts are not repaired', () => {
  for (const change of [d => { d.schemaVersion = 2; }, d => { d.dataset = 'other'; }, d => { d.columns = 10; },
    d => { d.revision = 0; }, d => { delete d.layout[demos[0].id]; },
    d => { d.layout[demos[1].id] = { col: 0, row: 0 }; },
    d => { d.layout[demos[0].id].row = 500; }]) {
    const doc = legacy(); change(doc);
    rejects(() => migratePhase1Wallet(JSON.stringify(doc), demos), 'invalid_legacy_document');
  }
  rejects(() => migratePhase1Wallet('not json', demos), 'invalid_legacy_document');
});

test('Empty Phase 1 fixture migration stays empty; no invented timestamps or memberships', () => {
  const doc = legacy(); doc.layout = {}; doc.savedAt = '2026-11-07';
  const result = migratePhase1Wallet(JSON.stringify(doc), []);
  assert.deepEqual(result.cards, []);
  assert.deepEqual(result.canvas.layout, {});
  assert.equal(result.savedAt, doc.savedAt);
});

test('Errors do not disclose payloads; model/migration do not load storage, native, network or analytics adapters', () => {
  const secret = 'SYNTHETIC_PRIVATE_PAYLOAD\n';
  try { validateWalletCard(member({ payload: secret, preferredDisplayFormat: 'code128' })); }
  catch (error) { assert.equal(error.message.includes(secret), false); }
  assert.ok(loaded.every(file => !/storage|analytics|network/i.test(file)));
});
