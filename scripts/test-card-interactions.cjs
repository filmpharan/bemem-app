// Deterministic JS logic + component-prop checks. Not native gesture/hit-testing tests.
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const cache = new Map();
const jsx = (type, props) => ({ type, props });
const native = Object.fromEntries(['Modal', 'Pressable', 'ScrollView', 'Text', 'View'].map(x => [x, x]));
native.StyleSheet = { create: x => x, absoluteFill: { position: 'absolute', inset: 0 } };
function load(relative) {
  let file = path.resolve(root, relative);
  if (!path.extname(file)) file += fs.existsSync(file + '.ts') ? '.ts' : '.tsx';
  if (file.endsWith('.json')) return JSON.parse(fs.readFileSync(file, 'utf8'));
  if (cache.has(file)) return cache.get(file).exports;
  const module = { exports: {} };
  cache.set(file, module);
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  function localRequire(name) {
    if (name === 'react-native') return native;
    if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx, Fragment: 'Fragment' };
    if (name === './MembershipCard') return { MembershipCard: 'MembershipCard' };
    return name.startsWith('.') ? load(path.resolve(path.dirname(file), name)) : require(name);
  }
  vm.runInThisContext(`(function(require,module,exports){${code}\n})`, { filename: file })(localRequire, module, module.exports);
  return module.exports;
}
const { createCardInteraction, CARD_HOLD_MS } = load('src/lib/card-interaction.ts');
const { CardPreview } = load('src/components/bemem/CardPreview.tsx');

function fixture() {
  let time = 0;
  const tasks = [];
  const events = [];
  const callbacks = Object.fromEntries(['onTap', 'onDragStart', 'onDragMove', 'onDrop', 'onDragEnd']
    .map(name => [name, (...args) => events.push([name, ...args])]));
  const interaction = createCardInteraction(callbacks, {
    schedule(fn, ms) {
      const task = { fn, at: time + ms, cancelled: false };
      tasks.push(task);
      return () => { task.cancelled = true; };
    },
  });
  return { interaction, events, advance(ms) {
    time += ms;
    for (const task of tasks) if (!task.cancelled && task.at <= time) { task.cancelled = true; task.fn(); }
  } };
}

test('A quick tap opens once without starting or dropping a drag', () => {
  const { interaction: g, advance, events } = fixture();
  g.start(); advance(100); g.release(0, 0); advance(1000);
  assert.deepEqual(events, [['onTap']]);
  assert.equal(g.isDragging(), false);
});

test('Drag becomes active at 350ms, updates and drops without opening a preview', () => {
  const { interaction: g, advance, events } = fixture();
  assert.equal(CARD_HOLD_MS, 350);
  g.start(); advance(349); assert.equal(g.isDragging(), false);
  assert.deepEqual(events, []);
  advance(1); assert.equal(g.isDragging(), true);
  g.move(24, 32); g.release(48, 64);
  assert.deepEqual(events, [['onDragStart'], ['onDragMove', 24, 32], ['onDragMove', 48, 64], ['onDrop', 48, 64], ['onDragEnd']]);
});

test('Scroll movement before the hold threshold cancels both tap and drag, even after returning to origin', () => {
  const { interaction: g, advance, events } = fixture();
  g.start(); advance(100); g.move(0, 12); advance(1000); g.move(0, 0); g.release(0, 0);
  assert.deepEqual(events, []);
  assert.equal(g.isDragging(), false);
});

test('Fast swipe at release cannot be mistaken for a tap', () => {
  const { interaction: g, events } = fixture();
  g.start(); g.release(0, 40);
  assert.deepEqual(events, []);
});

test('Small finger jitter permits the hold; a completed hold never opens a preview', () => {
  const { interaction: g, advance, events } = fixture();
  g.start(); g.move(2, 3); advance(350); g.release(2, 3);
  assert.equal(events.some(([name]) => name === 'onTap'), false);
  assert.equal(events[0][0], 'onDragStart');
});

test('Termination/unmount clears a pending timer; cancelling an active drag never drops', () => {
  const { interaction: g, advance, events } = fixture();
  g.start(); g.cancel(); advance(1000); assert.deepEqual(events, []);
  g.start(); advance(350); g.move(10, 20); g.cancel(); g.release(10, 20);
  assert.deepEqual(events, [['onDragStart'], ['onDragMove', 10, 20], ['onDragEnd']]);
});

test('A second touch cancels the interaction; a subsequent fresh tap still works', () => {
  const { interaction: g, advance, events } = fixture();
  g.start(); g.move(0, 0, 2); advance(350); g.release(0, 0);
  assert.deepEqual(events, []);
  g.start(); g.release(0, 0);
  assert.deepEqual(events, [['onTap']]);
});

function nodes(node) {
  if (Array.isArray(node)) return node.flatMap(nodes);
  if (!node || typeof node !== 'object') return [];
  return [node, ...nodes(node.props?.children)];
}
const card = { id: 'demo-coffee', name: 'Coffee Club', orientation: 'landscape', colors: ['#000000', '#ffffff'] };

test('Card Preview Close, backdrop and Android Back share the exact dismissal handler', () => {
  let closes = 0;
  const onClose = () => { closes++; };
  const modal = CardPreview({ card, fromCreate: false, onClose });
  assert.equal(modal.props.visible, true);
  assert.equal(modal.props.onRequestClose, onClose);
  const [backdrop, sheet] = modal.props.children.props.children;
  assert.equal(backdrop.props.onPress, onClose);
  assert.equal(sheet.props.onPress, undefined);
  assert.equal(sheet.props.accessibilityViewIsModal, true);
  const buttons = nodes(sheet).filter(n => n.type === 'Pressable');
  assert.equal(buttons.length, 1);
  assert.equal(buttons[0].props.onPress, onClose);
  assert.equal(closes, 0); // Rendering/inside content has no dismissal callback.
  backdrop.props.onPress(); buttons[0].props.onPress(); modal.props.onRequestClose();
  assert.equal(closes, 3);
});

test('Only a preview opened from Create offers a clearly disabled Edit Card placeholder', () => {
  const props = { card, onClose() {} };
  const home = nodes(CardPreview({ ...props, fromCreate: false }));
  assert.equal(home.some(n => n.props?.accessibilityLabel === 'Edit Card. Coming soon.'), false);
  const create = nodes(CardPreview({ ...props, fromCreate: true }));
  const edit = create.find(n => n.props?.accessibilityLabel === 'Edit Card. Coming soon.');
  assert.equal(edit.props.disabled, true);
  assert.equal(edit.props.accessibilityState.disabled, true);
  assert.equal(edit.props.onPress, undefined);
  assert.equal(CardPreview({ ...props, card: null, fromCreate: false }).props.visible, false);
});

test('App source contains no Thai string literals (card data remains exempt)', () => {
  function check(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) { if (entry.name !== 'data') check(file); continue; }
      if (!/\.tsx?$/.test(file)) continue;
      const tree = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
      function visit(node) {
        if (ts.isStringLiteralLike(node) || ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node)) {
          assert.equal(/[\u0e00-\u0e7f]/u.test(node.text), false, `Non-English app string in ${path.relative(root, file)}`);
        }
        ts.forEachChild(node, visit);
      }
      visit(tree);
    }
  }
  check(path.join(root, 'src'));
});
