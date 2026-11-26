const { test } = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), ts = require('typescript');
const root = path.resolve(__dirname, '..');
const clone = value => JSON.parse(JSON.stringify(value));
const flush = async () => { for (let i = 0; i < 12; i++) await new Promise(resolve => setImmediate(resolve)); };
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
let scope = 0;
function environment() {
  const cache = new Map(), frames = new Map(), files = new Map(), intents = new Map(), waits = new Set(), events = [], scheduled = [], evidence = new Map();
  let frame, cursor = 0, serial = 0, failure = null, readGate = null, scheduleGate = null, cleanupGate = null;
  const snapshot = { state: { generation: 1, source: 'v2', editsAllowed: true, saving: false, dirty: false }, session: { revision: 10, saved: { cards: [{ id: 'one', kind: 'membership' }, { id: 'two', kind: 'membership' }] } } };
  const runtime = { getSnapshot: () => snapshot, pages: { canEditCard: () => true }, historyDeletion: { allowed: () => true, list: async () => { events.push('history-recovery'); return []; }, recover: async () => 'Recovered' } };
  const react = {
    useRef(value) { const i = cursor++; return frame[i] ??= { current: value }; },
    useState(value) { const i = cursor++, own = frame; if (!(i in own)) own[i] = typeof value === 'function' ? value() : value; return [own[i], next => { own[i] = typeof next === 'function' ? next(own[i]) : next; }]; },
    useMemo(fn, deps) { const i = cursor++; if (!frame[i] || deps.some((d, j) => d !== frame[i].deps[j])) frame[i] = { deps, value: fn() }; return frame[i].value; },
    useEffect(fn, deps) { const i = cursor++; if (!frame[i] || deps.some((d, j) => d !== frame[i].deps[j])) { frame[i]?.cleanup?.(); frame[i] = { deps, cleanup: fn() }; } },
  };
  const nativePorts = { scheduled: async () => { events.push('queue'); return [...scheduled]; }, cancel: async id => { events.push(['cancel', id]); const i = scheduled.indexOf(id); if (i >= 0) scheduled.splice(i, 1); } };
  const media = { subscribe: () => () => {}, isBusy: () => false, hasIssues: () => false, inspect: async () => {} };
  let repo, recovery;
  const notifications = {
    evidence: id => evidence.get(id),
    scheduleResult: async (record, options) => {
      events.push(['schedule', record.id]);
      if (scheduleGate) return scheduleGate(record, options);
      assert.ok(options.authorize()); const id = `bemem-keep-${record.id}`; scheduled.push(id);
      const result = { status: 'queue_confirmed', stage: 'queue_after', intendedId: id, returnedId: id, attempted: true, reason: 'mock queue confirmed' }; evidence.set(id, result); return result;
    },
  };
  function load(relative) {
    let file = path.resolve(root, relative); if (!/\.tsx?$/.test(file)) file += fs.existsSync(file + '.ts') ? '.ts' : '.tsx';
    if (cache.has(file)) return cache.get(file).exports; const m = { exports: {} }; cache.set(file, m);
    const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
    vm.runInThisContext(`(function(require,module,exports,setTimeout,clearTimeout){${code}\n})`, { filename: file })(name => {
      if (name === 'react') return react;
      if (name === 'react/jsx-runtime') return { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) };
      if (name === 'react-native') return { ...Object.fromEntries(['View', 'Text', 'Modal'].map(n => [n, n])), StyleSheet: { create: s => s }, Keyboard: { isVisible: () => false, dismiss() {} } };
      if (name === 'react-native-safe-area-context') return { SafeAreaView: 'SafeAreaView' };
      if (name === 'expo') return { uuid: { v4: () => 'id-' + (++serial) } };
      if (name.endsWith('/ci-theme')) return require('./ci-theme-fixture.cjs');
      if (name === './WalletRuntimeProvider') return { useWalletRuntime: () => ({ runtime, snapshot }) };
      if (['./AddKeepSheet', './MyKeepsScreen', './KeepDetailScreen', './ReceiptViewer', './GlassButton', './ConfirmationDialog'].includes(name)) return { [name.slice(2)]: name.slice(2) };
      if (name === './keeps-motion') return { useKeepsOuterMotion: (_context, _branch, close) => ({ close() { close(); }, onPageShow() {}, renderPage: child => child }) };
      if (name === './keeps-navigation-motion') return { useKeepsNavigationMotion: () => ({ prepare: () => true, render: child => child }) };
      if (name.endsWith('/keep-draft-native')) return { createNativeKeepDraft: () => ({ close() {}, refresh() {}, getSnapshot: () => ({ historyConfirmed: false }) }) };
      if (name.endsWith('/card-history-native')) return { deviceHistoryRepository: repo, keepRecovery: recovery, keepMediaFiles: media, prepareRetiredReminders: (...args) => recovery.prepareDeletion(...args), removeRetiredReceipts: async (...args) => { await recovery.finishDeletion(...args); if (cleanupGate) await cleanupGate.promise; } };
      if (name.endsWith('/keep-notifications-native')) return { keepNotifications: notifications };
      assert.ok(name.startsWith('.'), name); return load(path.resolve(path.dirname(file), name));
    }, m, m.exports, fn => { waits.add(fn); return fn; }, fn => waits.delete(fn)); return m.exports;
  }
  repo = load('src/lib/card-history-repository.ts').createHistoryRepository({ scope: 'controller-' + (++scope), list: async () => { events.push('history-list'); if (failure === 'read') throw Error('History read failed'); if (readGate) await readGate.promise; return [...files.keys()]; }, read: async name => files.get(name), writeExclusive: async (name, value) => { events.push('write'); files.set(name, value); }, promoteExclusive: async (pending, name) => { files.set(name, files.get(pending)); files.delete(pending); } }, { now: () => '2026-11-24T00:00:00.000Z', token: () => 't-' + (++serial), verifyImages: () => {} });
  recovery = load('src/lib/keep-recovery.ts').createKeepRecovery({ repository: repo, nextId: () => 'intent-' + (++serial), intents: { list: async () => { events.push('reminder-recovery'); return [...intents.values()].map(clone); }, write: async item => { events.push('intent'); intents.set(item.id, clone(item)); }, remove: async id => intents.delete(id) }, notifications: nativePorts });
  return { load, repo, recovery, runtime, snapshot, nativePorts, events, files, intents, scheduled, media, evidence,
    fail: value => { failure = value; }, readGate: value => { readGate = value; }, cleanupGate: value => { cleanupGate = value; }, schedule: fn => { scheduleGate = fn; },
    expire() { for (const fn of [...waits]) { waits.delete(fn); fn(); } },
    render(cardId = 'one', key = 'main') { frame = frames.get(key) ?? []; frames.set(key, frame); cursor = 0; return load('src/components/bemem/useKeepsController.ts').useKeepsController(cardId); },
    feature(props, key = 'feature') { frame = frames.get(key) ?? []; frames.set(key, frame); cursor = 0; return load('src/components/bemem/KeepsFeature.tsx').KeepsFeature(props); },
    unmount(key = 'main') { for (const item of frames.get(key) ?? []) item?.cleanup?.(); frames.delete(key); },
    async seed(reminder = true, cardId = 'one') { const c = load('src/lib/card-history-commands.ts').createHistoryCommands(repo, { cardId, admission: () => ({ context: 'home', generation: snapshot.state.generation, revision: snapshot.session.revision, cardExists: true, canManage: true }), now: () => '2026-11-24T00:00:00.000Z', nextId: () => 'seed-' + (++serial) }); await c.load(); return c.saveKeep({ kind: 'full', note: 'Synthetic note', images: [], ...(reminder ? { reminder: { at: '2099-01-01T09:00:00.000Z', title: 'You have a reminder.' } } : {}) }); },
  };
}
test('History loads independently while native enumeration hangs; inspection is not an empty collection', async () => {
  const e = environment(), pending = deferred(); await e.seed(); e.nativePorts.scheduled = () => pending.promise; e.render(); await flush();
  const state = e.render(); assert.equal(state.loadState, 'loaded'); assert.equal(state.document.records.length, 1); assert.equal(state.canMutate(), false); assert.equal(state.canPick(), true);
  e.expire(); assert.equal(e.render().inspection, 'delayed'); assert.equal(e.files.size > 0, true); e.unmount(); pending.resolve([]); await flush();
});
test('failed History read is explicit and never reported as an empty loaded document', async () => {
  const e = environment(); e.fail('read'); e.render(); await flush(); const state = e.render(); assert.equal(state.loadState, 'failed'); assert.equal(state.document, null); assert.equal(state.canWrite(), false); e.unmount();
});
test('both recovery metadata sources finish before a fresh native queue read', async () => {
  const e = environment(), gate = deferred(); e.runtime.historyDeletion.list = () => gate.promise; e.render(); await flush(); assert.equal(e.events.includes('queue'), false);
  gate.resolve([]); await flush(); assert.equal(e.render().inspection, 'verified'); assert.equal(e.events.filter(v => v === 'queue').length, 1); e.unmount();
});
for (const field of ['generation', 'revision']) test('late queue inspection cannot authorize a changed Owner ' + field, async () => {
  const e = environment(), gate = deferred(); await e.seed(); e.nativePorts.scheduled = () => gate.promise; e.render(); await flush(); const retained = e.render().document.records[0]; if (field === 'generation') e.snapshot.state.generation++; else e.snapshot.session.revision++;
  gate.resolve([]); await flush(); const state = e.render(); assert.equal(state.document, null); assert.equal(state.canMutate(), false); const before = JSON.stringify([...e.files]); await state.mutate(retained, 'complete'); assert.equal(e.intents.size, 0); assert.equal(JSON.stringify([...e.files]), before); e.unmount();
});
for (const operation of ['complete', 'delete']) test('retained ' + operation + ' callback rechecks current Owner before effects', async () => {
  const e = environment(); await e.seed(); e.render(); await flush(); const state = e.render(), record = state.document.records[0]; assert.equal(state.canMutate(), true);
  const callback = () => state.mutate(record, operation), before = JSON.stringify([...e.files]); e.snapshot.session.revision++; await callback(); assert.equal(JSON.stringify([...e.files]), before); assert.equal(e.intents.size, 0); assert.equal(e.events.some(v => Array.isArray(v) && v[0] === 'cancel'), false); e.unmount();
});
test('reinspection invalidates retained mutation callback while History reload is pending', async () => {
  const e = environment(); await e.seed(); e.render(); await flush(); const state = e.render(), record = state.document.records[0], gate = deferred();
  e.readGate(gate); const reviewing = state.review(); await flush(); const before = JSON.stringify([...e.files]); await state.mutate(record, 'complete'); assert.equal(JSON.stringify([...e.files]), before); assert.equal(e.intents.size, 0);
  e.readGate(null); gate.resolve(); await reviewing; await flush(); assert.equal(e.render().canMutate(), true); e.unmount();
});
test('reopened controller cannot certify an earlier pending native inspection as fresh', async () => {
  const e = environment(), gate = deferred(); e.nativePorts.scheduled = () => gate.promise; e.render(); await flush(); e.unmount(); e.render(); await flush(); gate.resolve([]); await flush(); assert.equal(e.render().inspection, 'unknown'); assert.equal(e.render().canMutate(), false); await e.render().review(); await flush(); assert.equal(e.render().inspection, 'verified'); e.unmount();
});
test('pending cancellation holds global mutation admission through observation deadline and reopening', async () => {
  const e = environment(), saved = await e.seed(), gate = deferred(); e.scheduled.push('bemem-keep-' + saved.recordId); e.render(); await flush(); const state = e.render();
  e.nativePorts.cancel = async () => { e.events.push('cancel-pending'); await gate.promise; e.scheduled.length = 0; };
  const mutation = state.mutate(state.document.records[0], 'complete'); await flush(); assert.equal(e.intents.size, 1); e.expire(); assert.equal(e.render().canMutate(), false);
  e.unmount(); e.render('two'); await flush(); assert.equal(e.render('two').canWrite(), false); gate.resolve(); await mutation; await flush(); assert.equal(e.render('two').document.records.every(r => r.cardId === 'one'), true); assert.equal(e.intents.size, 1); e.unmount();
});
test('same mounted controller ignores old card read and inspection results', async () => {
  const e = environment(), gate = deferred(); await e.seed(false); e.readGate(gate); e.render('one'); await flush(); e.readGate(null); e.render('two'); await flush(); const before = e.render('two'); assert.equal(before.loadState, 'loaded');
  gate.resolve(); await flush(); const after = e.render('two'); assert.equal(after.document, before.document); assert.equal(after.canMutate(), true); e.unmount();
});
test('recovery-only controller reads preserved evidence without a parent card or new card creation', async () => {
  const e = environment(), saved = await e.seed(), record = saved.document.records[0];
  const intent = { schemaVersion: 1, id: 'recovery-only', operation: 'delete', cardId: 'one', recordId: record.id, notificationId: 'bemem-keep-' + record.id, reminderAt: record.keep.reminder.at, historyRevision: saved.document.revision };
  e.intents.set(intent.id, intent); e.snapshot.session.saved.cards = []; const before = JSON.stringify(e.snapshot); e.render(''); await flush(); let state = e.render(''); assert.equal(state.loadState, 'loaded'); assert.equal(state.canWrite(), false); assert.equal(state.reminderRecovery.length, 1);
  await state.recover(intent, true); await flush(); state = e.render(''); assert.equal(e.intents.size, 0); assert.equal((await e.repo.load()).records.length, 1); assert.equal(JSON.stringify(e.snapshot), before); e.unmount();
});
test('verified save invokes confirmed callback, exposes actual ID and persists notification metadata', async () => {
  const e = environment(); e.render(); await flush(); let count = 0; const result = await e.render().save({ kind: 'full', note: 'Mixed synthetic content', images: [], reminder: { at: '2099-01-01T09:00:00.000Z', title: 'You have a reminder.' } }, () => count++); await flush();
  assert.equal(result.kind, 'saved'); assert.equal(count, 1); assert.equal(result.document.records.find(r => r.id === result.recordId).keep.reminder.notification.status, 'scheduled'); assert.equal(e.render().reviewIds.length, 0); e.unmount();
});
test('notification uncertainty does not duplicate a confirmed Keep and marks only its real record for review', async () => {
  const e = environment(); await e.seed(false); e.schedule(async record => ({ status: 'unconfirmed', stage: 'queue_after', intendedId: 'bemem-keep-' + record.id, returnedId: null, attempted: true, reason: 'synthetic uncertain effect' }));
  e.render(); await flush(); const result = await e.render().save({ kind: 'full', note: 'Saved despite uncertain notification', images: [], reminder: { at: '2099-01-01T09:00:00.000Z', title: 'You have a reminder.' } }); await flush();
  assert.equal(result.kind, 'saved'); assert.equal(result.needsReview, true); assert.equal((await e.repo.load()).records.length, 2); assert.deepEqual(e.render().reviewIds, [result.recordId]); e.unmount();
});
test('pending notification work retains mutation lease after timeout and cannot write metadata for a changed Owner', async () => {
  const e = environment(), gate = deferred(); e.schedule(async record => { await gate.promise; return { status: 'unconfirmed', stage: 'queue_after', intendedId: 'bemem-keep-' + record.id, returnedId: null, attempted: true, reason: 'uncertain' }; });
  e.render(); await flush(); const saving = e.render().save({ kind: 'full', note: 'Synthetic', images: [], reminder: { at: '2099-01-01T09:00:00.000Z', title: 'You have a reminder.' } }); await flush(); e.expire(); assert.equal(e.render().canWrite(), false);
  const writes = e.events.filter(v => v === 'write').length; e.snapshot.session.revision++; gate.resolve(); const result = await saving; await flush(); assert.equal(result.kind, 'saved'); assert.equal(result.needsReview, true); assert.equal(e.events.filter(v => v === 'write').length, writes); assert.equal((await e.repo.load()).records[0].keep.reminder.notification.status, 'not_scheduled'); e.unmount();
});
test('confirmed History callback failure never turns an existing saved Keep into an uncertain save', async () => {
  const e = environment(); e.render(); await flush(); const result = await e.render().save({ kind: 'full', note: 'Confirmed content', images: [] }, () => { throw Error('synthetic custody observer failure'); });
  assert.equal(result.kind, 'saved'); assert.equal((await e.repo.load()).records.length, 1); assert.equal(e.render().document.records[0].id, result.recordId); e.unmount();
});
test('late verified History result preserves custody callback without publishing across an Owner revision change', async () => {
  const e = environment(), gate = deferred(); e.render(); await flush(); const initial = e.render().document; e.cleanupGate(gate); let custody = 0;
  const saving = e.render().save({ kind: 'full', note: 'Late confirmed content', images: [] }, () => custody++); await flush(); assert.equal((await e.repo.load()).records.length, 1);
  e.snapshot.session.revision++; gate.resolve(); const result = await saving; await flush(); assert.equal(result.kind, 'saved'); assert.equal(custody, 1); assert.ok(initial); assert.equal(e.render().document, null); assert.equal(e.render().loadState, 'loading'); assert.equal(e.render().canMutate(), false); e.unmount();
});
test('factory uncertainty is record-specific and an unavailable queue does not classify all records for review', async () => {
  const e = environment(); const a = await e.seed(), b = await e.seed(false); e.evidence.set('bemem-keep-' + a.recordId, { status: 'unconfirmed' });
  const gate = deferred(); e.nativePorts.scheduled = () => gate.promise; e.render(); await flush(); assert.deepEqual(e.render().reviewIds, [a.recordId]); assert.equal(e.render().reviewIds.includes(b.recordId), false); e.unmount(); gate.resolve([]); await flush();
});
test('completed reminder still present in native queue requires record-specific cleanup review', async () => {
  const e = environment(), saved = await e.seed(), doc = await e.repo.load(), r = doc.records[0];
  r.keep.reminder.state = 'completed'; r.keep.reminder.notification = { status: 'scheduled', id: 'bemem-keep-' + r.id }; await e.repo.save(doc, doc.revision, () => true); e.scheduled.push('bemem-keep-' + r.id);
  e.render(); await flush(); assert.deepEqual(e.render().reviewIds, [saved.recordId]); e.unmount();
});
function nodes(tree, output = []) { if (!tree || typeof tree !== 'object') return output; if (Array.isArray(tree)) { tree.forEach(child => nodes(child, output)); return output; } output.push(tree); nodes(tree.props?.children, output); return output; }
const component = (tree, type) => { const value = nodes(tree).find(node => node.type === type); assert.ok(value, 'Missing ' + type); return value; };
test('feature navigates My Keeps to exact detail/photo and returns to preserved collection scroll context', async () => {
  const e = environment(), saved = await e.seed(), p = { card: { id: 'one', name: 'Synthetic card' }, onClose() {} }; e.feature(p); await flush();
  let tree = e.feature(p), list = component(tree, 'MyKeepsScreen'); assert.equal(nodes(tree).filter(n => n.type === 'Modal').length, 1); assert.equal(list.props.cardId, 'one');
  list.props.onScrollOffset(432); list.props.onOpen(saved.recordId); tree = e.feature(p); const detail = component(tree, 'KeepDetailScreen'); assert.equal(detail.props.record.id, saved.recordId);
  const photo = { id: 'synthetic-photo', assetId: 'synthetic-asset' }; detail.props.onPhoto(photo); tree = e.feature(p); assert.equal(tree.type, 'ReceiptViewer'); assert.equal(tree.props.receipt, photo); tree.props.onClose();
  tree = e.feature(p); component(tree, 'KeepDetailScreen').props.onBack(); tree = e.feature(p); list = component(tree, 'MyKeepsScreen'); assert.equal(list.props.scrollOffset, 432); e.unmount('feature');
});
test('feature reveals confirmed save ID in My Keeps instead of automatically opening Detail', async () => {
  const e = environment(), saved = await e.seed(false), p = { card: { id: 'one', name: 'Synthetic card' }, initialAdd: true, onClose() {} }; e.feature(p); await flush();
  let tree = e.feature(p); assert.equal(tree.type, 'AddKeepSheet'); tree.props.onSaved({ kind: 'saved', document: saved.document, recordId: saved.recordId, message: 'Keep saved', needsReview: false }); tree = e.feature(p);
  const list = component(tree, 'MyKeepsScreen'); assert.equal(list.props.revealId, saved.recordId); assert.equal(nodes(tree).some(n => n.type === 'KeepDetailScreen'), false); list.props.onRevealConsumed(saved.recordId); assert.equal(component(e.feature(p), 'MyKeepsScreen').props.revealId, null); e.unmount('feature');
});
test('retained destructive confirmation rejects changed Owner before delete effects', async () => {
  const e = environment(), saved = await e.seed(), p = { card: { id: 'one', name: 'Synthetic card' }, initialKeepId: saved.recordId, onClose() {} }; e.feature(p); await flush();
  component(e.feature(p), 'KeepDetailScreen').props.onDelete(); const request = component(e.feature(p), 'ConfirmationDialog').props.request; assert.equal(request.actions[1].label, 'Delete Keep');
  const before = JSON.stringify([...e.files]); e.snapshot.session.revision++; await request.actions[1].onPress(); await flush(); assert.equal(JSON.stringify([...e.files]), before); assert.equal(e.intents.size, 0); e.unmount('feature');
});
