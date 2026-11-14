// UI-only regression checks. No native filesystem, wallet or network calls.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), ts = require('typescript');
const root = path.resolve(__dirname, '..');
const jsx = (type, props) => ({ type, props });
function component(name, deps = {}) {
  const file = path.join(root, 'src/components/bemem', name + '.tsx');
  const module = { exports: {} };
  const dependencies = {
    'react/jsx-runtime': { jsx, jsxs: jsx }, 'react-native': { View: 'View' },
    'expo-image': { Image: 'Image' }, './add-card-layout': { addCardLayout: { iconSize: 16 } },
    '../../constants/lagoon-theme': { lagoon: { text: { primary: '#263943' } } },
    '../../constants/bemem-theme': { bemem: { error: '#b42318', foreground: '#263943' } }, ...deps,
  };
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInThisContext(`(function(require,module,exports){${code}\n})`, { filename: file })(name => {
    assert.ok(dependencies[name], 'Unexpected dependency: ' + name); return dependencies[name];
  }, module, module.exports);
  return module.exports[name];
}
const Icon = component('AddCardIcon');
const svg = props => Buffer.from(Icon(props).props.source.uri.split(',')[1], 'base64').toString('utf8');
const body = value => value.match(/<svg\b[^>]*>([\s\S]*)<\/svg>/)[1];
const source = file => fs.readFileSync(path.join(root, file), 'utf8');

test('Decorate Undo, Redo and Check reuse existing bemem outline geometry and safe SVG transport', () => {
  for (const name of ['undo', 'redo', 'check']) {
    const decoded = svg({ name });
    assert.equal(body(decoded), body(source(`design-previews/functional-icon-system/svg/c/${name}.svg`)));
    assert.match(decoded, /stroke-linecap="round" stroke-linejoin="round"/);
    assert.doesNotMatch(decoded, /<rect|<image|<filter|<text/);
  }
});

test('Approved Delete, Rotate and Add Card geometry reaches the production SVG decoder unchanged', () => {
  for (const name of ['delete', 'rotate', 'add-card']) {
    const approved = source(`design-previews/icon-family-refinement/svg/${name}.svg`);
    assert.equal(body(svg({ name })), body(approved));
    assert.equal(source(`assets/icons/bemem-functional/${name}.svg`), approved);
  }
});

test('Production Edit keeps the original pencil and does not use the rejected card-pencil', () => {
  assert.equal(body(svg({ name: 'edit' })), body(source('design-previews/icon-family-refinement/before/svg/edit.svg')));
  assert.notEqual(body(svg({ name: 'edit' })), body(source('design-previews/icon-family-refinement/svg/edit.svg')));
});

test('Palette and plain document are local transparent rounded outlines with matching editable sources', () => {
  for (const name of ['decorate', 'policy']) {
    const decoded = svg({ name });
    assert.equal(body(decoded), body(source(`assets/icons/bemem-functional/${name}.svg`)));
    for (const attribute of ['viewBox="0 0 24 24"', 'fill="none"', 'stroke="#263943"',
      'stroke-width="2"', 'stroke-linecap="round"', 'stroke-linejoin="round"']) assert.ok(decoded.includes(attribute));
    assert.doesNotMatch(decoded, /<image|<text|<filter|<linearGradient|<script/);
  }
  assert.equal((svg({ name: 'decorate' }).match(/<circle/g) || []).length, 3);
  assert.equal(body(svg({ name: 'policy' })), '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 8H16M8 12H16M8 16H13"/>');
});

test('Icon size/color overrides preserve default form size and Android-safe Base64 transport', () => {
  assert.equal(Icon({ name: 'camera' }).props.style.width, 16);
  const image = Icon({ name: 'delete', size: 22, color: '#b42318' });
  assert.deepEqual(image.props.style, { width: 22, height: 22 });
  assert.equal(image.props.accessible, false);
  assert.equal(image.props.contentFit, 'contain');
  assert.equal(image.props.cachePolicy, 'none');
  assert.match(svg({ name: 'delete', color: '#b42318' }), /stroke="#b42318"/);
});

test('Decorate wrapper maps existing trash/rotate contracts without changing size or danger color', () => {
  const DecorateIcon = component('DecorateIcon', { './AddCardIcon': { AddCardIcon: Icon } });
  for (const name of ['trash', 'rotate']) {
    const item = DecorateIcon({ name });
    assert.equal(item.type, Icon);
    assert.deepEqual(item.props, { name: name === 'trash' ? 'delete' : 'rotate',
      color: name === 'trash' ? '#b42318' : '#263943', size: 22 });
  }
});

test('Shared Account/Profile retains original native geometry and scales uniformly for Login', () => {
  const AccountIcon = component('AccountIcon');
  const original = AccountIcon({});
  assert.deepEqual(original.props.style, { width: 24, height: 26 });
  assert.equal(original.props.pointerEvents, 'none');
  const [head, shoulders] = original.props.children.props.children;
  assert.deepEqual([head.props.style.left, head.props.style.top, head.props.style.width, head.props.style.height], [7, 2, 10, 10]);
  assert.deepEqual([shoulders.props.style.left, shoulders.props.style.top, shoulders.props.style.width, shoulders.props.style.height], [1, 15, 22, 11]);
  const login = AccountIcon({ size: 20 });
  assert.ok(Math.abs(login.props.style.height / login.props.style.width - 26 / 24) < 1e-12);
  assert.equal(login.props.children.props.style.transform[0].scale, 20 / 24);
});
