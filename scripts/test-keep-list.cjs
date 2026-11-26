const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), ts = require('typescript');
const root = path.resolve(__dirname, '..');
const NOW = Date.parse('2026-11-24T10:00:00.000Z');
function environment() {
  const cache = new Map(), hooks = [], timers = new Map(), calls = [], listeners = new Set();
  let cursor = 0, effects = [], now = NOW, serial = 0;
  const react = {
    useRef(value) { const i = cursor++; return hooks[i] ??= { current: value }; },
    useState(value) { const i = cursor++; if (!(i in hooks)) hooks[i] = typeof value === 'function' ? value() : value; return [hooks[i], next => { hooks[i] = typeof next === 'function' ? next(hooks[i]) : next; }]; },
    useMemo(fn, deps) { const i = cursor++; if (!hooks[i] || deps.some((d, j) => d !== hooks[i].deps[j])) hooks[i] = { deps, value: fn() }; return hooks[i].value; },
    useEffect(fn, deps) { const i = cursor++; if (!hooks[i] || deps.some((d, j) => d !== hooks[i].deps[j])) { hooks[i]?.cleanup?.(); hooks[i] = { deps }; effects.push(() => { hooks[i].cleanup = fn(); }); } },
  };
  function load(relative) {
    let file = path.resolve(root, relative); if (!/\.tsx?$/.test(file)) file += fs.existsSync(file + '.ts') ? '.ts' : '.tsx';
    if (cache.has(file)) return cache.get(file).exports;
    const m = { exports: {} }; cache.set(file, m);
    const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
    vm.runInThisContext(`(function(require,module,exports,setTimeout,clearTimeout,Date){${code}\n})`, { filename: file })(name => {
      if (name === 'react') return react;
      if (name === 'react/jsx-runtime') return { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) };
      if (name === 'react-native') return { ...Object.fromEntries(['View', 'Text', 'FlatList', 'ScrollView', 'Pressable'].map(n => [n, n])), StyleSheet: { create: s => s }, AppState: { currentState: 'active', addEventListener: (_event, fn) => { listeners.add(fn); return { remove: () => listeners.delete(fn) }; } } };
      if (name.endsWith('/ci-theme')) return { ...require('./ci-theme-fixture.cjs'), fontForUiText: () => 'TestFont' };
      if (name.endsWith('/card-history-native')) return { receiptUri: id => 'synthetic://' + id };
      if (['./AddCardIcon', './KeepThumbnail', './CardArtworkImage'].includes(name)) return { [name.slice(2)]: name.slice(2) };
      assert.ok(name.startsWith('.'), name); return load(path.resolve(path.dirname(file), name));
    }, m, m.exports, (fn, delay) => { const id = ++serial; timers.set(id, { fn, delay }); return id; }, id => timers.delete(id), class extends Date { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return now; } });
    return m.exports;
  }
  return { load, calls, timers, resume() { for (const fn of listeners) fn('active'); }, background() { for (const fn of listeners) fn('background'); }, time(value) { now = value; }, render(file, name, props) {
    cursor = 0; effects = []; const tree = load(file)[name](props);
    for (const node of nodes(tree)) if (node.type === 'FlatList' && node.props.ref) node.props.ref.current = { scrollToIndex: value => calls.push(['index', value]), scrollToOffset: value => calls.push(['offset', value]) };
    effects.forEach(fn => fn()); return tree;
  }, unmount() { hooks.forEach(hook => hook?.cleanup?.()); } };
}
function nodes(tree, all = []) {
  if (!tree || typeof tree !== 'object') return all;
  if (Array.isArray(tree)) { tree.forEach(n => nodes(n, all)); return all; }
  all.push(tree); nodes(tree.props?.children, all); nodes(tree.props?.ListHeaderComponent, all); nodes(tree.props?.ListEmptyComponent, all); return all;
}
function words(tree) { if (Array.isArray(tree)) return tree.map(words).join(' '); if (typeof tree === 'string' || typeof tree === 'number') return String(tree); return tree?.props ? words(tree.props.children) + ' ' + words(tree.props.ListHeaderComponent) + ' ' + words(tree.props.ListEmptyComponent) : ''; }
const record = (id, patch = {}) => ({ id, cardId: 'card', type: 'note', notes: 'Actual note ' + id, description: '', receipts: [], date: '2026-11-24', time: '', money: null, createdAt: '2026-11-24T09:00:00.000Z', updatedAt: '2026-11-24T09:00:00.000Z', ...patch });
const reminder = (at, status = 'scheduled', state = 'pending') => ({ kind: 'full', reminder: { at, title: 'You have a reminder.', state, notification: { status, id: status === 'scheduled' ? 'native' : null } } });
const document = records => ({ schemaVersion: 1, dataset: 'bemem-history', revision: 1, savedAt: '2026-11-24T09:00:00.000Z', records });
function projection() { return environment().load('src/lib/keep-list-projection.ts'); }
test('every matching persisted record occupies exactly one group with stable IDs', () => {
  const p = projection(), values = [record('saved'), record('review'), record('overdue', { keep: reminder('2026-11-24T09:59:00.000Z') }), record('next', { keep: reminder('2026-11-24T10:01:00.000Z') }), record('foreign', { cardId: 'other' })];
  const sections = p.projectKeepList(document(values), 'card', ['review', 'nonexistent'], NOW);
  assert.deepEqual(sections.map(s => [s.title, s.data.map(r => r.id)]), [['Needs review', ['review']], ['Overdue', ['overdue']], ['Upcoming', ['next']], ['Saved', ['saved']]]);
  assert.equal(new Set(sections.flatMap(s => s.data.map(r => r.id))).size, 4);
});
test('denied failed and unscheduled reminders stay saved, classified by due time', () => {
  const p = projection(), values = ['denied', 'failed', 'not_scheduled'].map(status => record(status, { keep: reminder('2026-11-25T09:00:00.000Z', status) }));
  const groups = p.projectKeepList(document(values), 'card', [], NOW); assert.equal(groups[0].data.length, 0); assert.equal(groups[2].data.length, 3);
  values.forEach(r => assert.match(p.keepListNotification(r), /^Saved/));
});
test('due equality is overdue, completion moves to Saved, explicit recovery takes priority', () => {
  const p = projection(), r = record('r', { keep: reminder(new Date(NOW).toISOString()) });
  assert.equal(p.projectKeepList(document([r]), 'card', [], NOW)[1].data[0].id, 'r'); r.keep.reminder.state = 'completed';
  assert.equal(p.projectKeepList(document([r]), 'card', [], NOW)[3].data[0].id, 'r');
  assert.equal(p.projectKeepList(document([r]), 'card', ['r'], NOW)[0].data[0].id, 'r');
});
test('due groups sort ascending and Saved uses creation not notification metadata update', () => {
  const p = projection(), records = [record('later', { keep: reminder('2026-11-28T00:00:00.000Z') }), record('near', { keep: reminder('2026-11-25T00:00:00.000Z') }), record('old', { createdAt: '2026-11-20T00:00:00.000Z', updatedAt: '2026-11-24T12:00:00.000Z' }), record('new')];
  const groups = p.projectKeepList(document(records), 'card', [], NOW); assert.deepEqual(groups[2].data.map(r => r.id), ['near', 'later']); assert.deepEqual(groups[3].data.map(r => r.id), ['new', 'old']);
});
test('legacy content and all 20 photos remain intact; projection never mutates records', () => {
  const p = projection(), r = record('legacy', { description: 'Purchase description', notes: '', receipts: Array.from({ length: 20 }, (_, i) => ({ id: 'photo-' + i })) }), doc = document([r]), before = JSON.stringify(doc);
  assert.equal(p.projectKeepList(doc, 'card', [], NOW)[3].data[0].receipts.length, 20); assert.equal(p.keepListSummary(r), 'Purchase description'); assert.equal(JSON.stringify(doc), before);
});
test('rows use actual mixed content, photo count fallback, and never internal kinds', () => {
  const p = projection(); assert.equal(p.keepListSummary(record('a', { notes: '  line one\nline two ', keep: { kind: 'full' } })), 'line one line two');
  assert.equal(p.keepListSummary(record('a', { notes: '', receipts: [{ id: 'photo' }] })), '1 photo'); assert.equal(p.keepListSummary(record('a', { notes: '', keep: reminder('2027-01-01T00:00:00.000Z') })), 'Reminder');
});
test('reveal location resolves actual identity in its true group, missing IDs never fabricate records', () => {
  const p = projection(), sections = p.projectKeepList(document([record('a'), record('due', { keep: reminder('2027-01-01T00:00:00.000Z') })]), 'card', [], NOW);
  assert.deepEqual(p.keepListLocation(sections, 'due'), { sectionIndex: 2, itemIndex: 0 }); assert.equal(p.keepListLocation(sections, 'unknown'), null);
});
test('deadline selects next matching pending reminder only', () => {
  const p = projection(), doc = document([record('past', { keep: reminder(new Date(NOW - 1).toISOString()) }), record('due', { keep: reminder(new Date(NOW + 5000).toISOString()) }), record('foreign', { cardId: 'other', keep: reminder(new Date(NOW + 10).toISOString()) })]);
  assert.equal(p.nextKeepDeadline(doc, 'card', NOW), NOW + 5000); assert.equal(p.nextKeepDeadline(doc, 'card', NOW + 5000), null);
});
const listFile = 'src/components/bemem/MyKeepsScreen.tsx';
function props(records = []) { return { cardId: 'card', cardName: 'My card', document: document(records), loadState: 'loaded', reviewIds: [], notice: '', recovery: null, canAdd: true, onAdd() {}, onBack() {}, onOpen() {}, scrollOffset: 247, onScrollOffset() {} }; }
test('read failure renders explicit failure and never empty collection message', () => {
  const e = environment(), tree = e.render(listFile, 'MyKeepsScreen', { ...props(), loadState: 'failed' });
  assert.match(words(tree), /could not be loaded/); assert.doesNotMatch(words(tree), /A little space/); assert.deepEqual(nodes(tree).find(n => n.type === 'FlatList').props.data, []); e.unmount();
});
test('list restores offset, emits exact record ID on open and persists scroll offset', () => {
  const e = environment(), opened = [], offsets = [], p = { ...props([record('stable')]), onOpen: id => opened.push(id), onScrollOffset: n => offsets.push(n) };
  const tree = e.render(listFile, 'MyKeepsScreen', p), list = nodes(tree).find(n => n.type === 'FlatList'); assert.equal(list.props.contentOffset.y, 247);
  list.props.onScroll({ nativeEvent: { contentOffset: { y: 350 } } }); assert.deepEqual(offsets, [350]);
  const rowElement = list.props.renderItem({ item: list.props.data.find(i => i.record) }); const row = rowElement.type(rowElement.props); row.props.onPress(); assert.deepEqual(opened, ['stable']); e.unmount();
});
test('save reveal uses stable ID in its real group and highlights once', () => {
  const e = environment(), consumed = [], p = { ...props([record('saved'), record('target', { keep: reminder('2027-01-01T00:00:00.000Z') })]), revealId: 'target', onRevealConsumed: id => consumed.push(id) };
  e.render(listFile, 'MyKeepsScreen', p); const tree = e.render(listFile, 'MyKeepsScreen', p), list = nodes(tree).find(n => n.type === 'FlatList');
  const index = list.props.data.findIndex(i => i.record?.id === 'target'); assert.equal(e.calls[0][1].index, index); assert.deepEqual(consumed, ['target']);
  const row = list.props.renderItem({ item: list.props.data[index] }); assert.equal(row.props.highlighted, true); assert.equal(e.calls.length, 1); e.unmount();
});
test('clock and app resume reclassify pending reminders without background polling', () => {
  const e = environment(), p = props([record('soon', { keep: reminder(new Date(NOW + 5000).toISOString()) })]); e.render(listFile, 'MyKeepsScreen', p);
  assert.equal(e.timers.size, 1); e.background(); e.render(listFile, 'MyKeepsScreen', p); assert.equal(e.timers.size, 0);
  e.time(NOW + 6000); e.resume(); const tree = e.render(listFile, 'MyKeepsScreen', p), list = nodes(tree).find(n => n.type === 'FlatList'); assert.equal(list.props.data.find(i => i.record).group, 'Overdue'); assert.equal(e.timers.size, 0); e.unmount();
});
test('classification boundary preserves the visible record anchor', () => {
  const e = environment(), p = props([record('soon', { keep: reminder(new Date(NOW + 5000).toISOString()) }), record('later', { keep: reminder(new Date(NOW + 50000).toISOString()) }), record('saved')]);
  const tree = e.render(listFile, 'MyKeepsScreen', p), list = nodes(tree).find(n => n.type === 'FlatList');
  list.props.onViewableItemsChanged({ viewableItems: [{ isViewable: true, item: list.props.data.find(i => i.record?.id === 'saved') }] });
  e.time(NOW + 6000); [...e.timers.values()][0].fn();
  const updated = e.render(listFile, 'MyKeepsScreen', p), updatedList = nodes(updated).find(n => n.type === 'FlatList');
  assert.equal(e.calls.at(-1)[1].index, updatedList.props.data.findIndex(i => i.record?.id === 'saved')); assert.equal(e.calls.at(-1)[1].animated, false); e.unmount();
});
test('detail exposes all legacy photos and passes exact selected photo to viewer intent', () => {
  const e = environment(), receipts = Array.from({ length: 20 }, (_, i) => ({ id: 'photo-' + i, assetId: 'asset-' + i })), selected = [];
  const tree = e.render('src/components/bemem/KeepDetailScreen.tsx', 'KeepDetailScreen', { record: record('legacy', { receipts, money: { minorUnits: '12345', currency: 'THB' }, description: 'Legacy purchase', notes: 'Full note' }), cardName: 'Card', notificationLabel: '', canMutate: true, busy: false, notice: '', recovery: null, onBack() {}, onClose() {}, onPhoto: photo => selected.push(photo), onComplete() {}, onDelete() {} });
  const photos = nodes(tree).filter(n => /^Open photo /.test(n.props?.accessibilityLabel ?? '')); assert.equal(photos.length, 20); photos[19].props.onPress(); assert.equal(selected[0], receipts[19]); assert.match(words(tree), /123.45/); assert.match(words(tree), /Full note/); assert.equal(nodes(tree).some(n => n.type === 'Modal'), false); e.unmount();
});
test('detail recovery restrictions disable mutation controls but keep saved content readable', () => {
  const e = environment(), tree = e.render('src/components/bemem/KeepDetailScreen.tsx', 'KeepDetailScreen', { record: record('review', { keep: reminder('2027-01-01T00:00:00.000Z') }), cardName: 'Card', notificationLabel: 'Needs review', canMutate: false, busy: false, notice: '', recovery: null, onBack() {}, onClose() {}, onPhoto() {}, onComplete() {}, onDelete() {} });
  const controls = nodes(tree); assert.equal(controls.find(n => n.props?.accessibilityLabel === 'Delete Keep').props.disabled, true); assert.equal(controls.find(n => n.props?.accessibilityLabel === 'Mark reminder complete').props.disabled, true); assert.match(words(tree), /Actual note review/); e.unmount();
});
