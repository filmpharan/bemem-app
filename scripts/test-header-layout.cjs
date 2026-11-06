// Actual Header component with mocked native metrics/hooks. No native rendering claim.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const tokens = require('../design-system/bemem-lagoon-glass-rc2/TOKENS.json');
const code = ts.transpileModule(fs.readFileSync(path.join(root, 'src/components/bemem/HomeHeader.tsx'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
}).outputText;
const flatten = x => Object.assign({}, ...[x].flat(Infinity).filter(Boolean));
const text = x => Array.isArray(x) ? x.map(text).join('') : typeof x === 'string' ? x : x?.props ? text(x.props.children) : '';

function headerHarness(fontScale, editing) {
  const states = []; let cursor = 0; let ready = false;
  const native = {
    Pressable: 'Pressable', Text: 'Text', View: 'View',
    StyleSheet: { create: x => x }, useWindowDimensions: () => ({ fontScale }),
  };
  const jsx = (type, props) => ({ type, props });
  const module = { exports: {} };
  function mockedRequire(name) {
    if (name === 'react') return { useState(value) {
      const i = cursor++;
      if (!(i in states)) states[i] = value;
      return [states[i], next => { states[i] = typeof next === 'function' ? next(states[i]) : next; }];
    } };
    if (name === 'expo-font') return { useFonts: () => [ready, null] };
    if (name === 'react-native') return native;
    if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
    if (name.endsWith('.ttf')) return 1;
    if (name.endsWith('/bemem-theme')) return { bemem: { foreground: '#263943' } };
    if (name.endsWith('/lagoon-theme')) return { core: tokens.core, lagoon: tokens.palettes['pearl-gray'].colors, lagoonFonts: { latin: 'BememManrope' } };
    if (name === './GlassButton') return { GlassButton: 'GlassButton' };
    if (name === './BememIcon') return { BememIcon: 'BememIcon' };
    throw new Error(`Unexpected Header dependency: ${name}`);
  }
  vm.runInThisContext(`(function(require,module,exports){${code}\n})`)(mockedRequire, module, module.exports);
  return {
    loaded() { ready = true; },
    render() {
      cursor = 0;
      return module.exports.HomeHeader({ editing, searchOpen: !editing, disabled: false, onBack() {}, onSearch() {}, onCreate() {}, onLogo() {} });
    },
  };
}

test('Measured full labels fit their allocated widths; narrow headers stack controls instead of squeezing text', () => {
  for (const editing of [false, true]) for (const fontScale of [0.85, 1, 1.25, 2]) for (const width of [280, 320, 360, 412, 600]) {
    const h = headerHarness(fontScale, editing);
    let tree = h.render();
    tree.props.onLayout({ nativeEvent: { layout: { width } } });
    h.loaded(); tree = h.render();
    const scale = Math.min(fontScale, 1.25);
    const actualLogoWidth = 118 * scale;
    const actualLabelWidth = (editing ? 92 : 54) * scale;
    const probes = tree.props.children[0].props.children;
    probes[0].props.onTextLayout({ nativeEvent: { lines: [{ width: actualLogoWidth }] } });
    probes[1].props.onTextLayout({ nativeEvent: { lines: [{ width: actualLabelWidth }] } });
    tree = h.render();
    const [, logo, slot] = tree.props.children;
    const logoStyle = flatten(logo.props.style), slotStyle = flatten(slot.props.style);
    const group = slot.props.children, controls = group.props.children;
    const groupStyle = flatten(group.props.style), buttonStyle = flatten(controls[1].props.style);
    const label = controls[1].props.children;
    assert.equal(text(logo.props.children), 'bemem.');
    assert.equal(text(label), editing ? 'Create PRO' : 'Create');
    assert.equal(logo.props.children.props.numberOfLines, undefined);
    assert.equal(label.props.numberOfLines, undefined);
    assert.equal(label.props.ellipsizeMode, undefined);
    assert.ok(logoStyle.width >= actualLogoWidth + 10 * scale);
    assert.ok(flatten(label.props.style).width >= actualLabelWidth + 8 * scale);
    assert.ok(buttonStyle.width >= flatten(label.props.style).width + 32);
    const inner = width - tokens.core.geometry.header.paddingHorizontal * 2;
    if (logoStyle.width + 8 + groupStyle.width > inner) assert.equal(slotStyle.width, '100%');
    else assert.equal(slotStyle.width, undefined);
    assert.ok(groupStyle.width <= inner, 'Controls must fit even on the second row');
  }
});

test('Font readiness invalidates fallback measurements before measuring Manrope', () => {
  const h = headerHarness(1, false);
  let tree = h.render();
  tree.props.children[0].props.children[0].props.onTextLayout({ nativeEvent: { lines: [{ width: 10 }] } });
  tree = h.render();
  const fallback = flatten(tree.props.children[1].props.style).width;
  h.loaded(); tree = h.render();
  assert.ok(flatten(tree.props.children[1].props.style).width > fallback);
  tree.props.children[0].props.children[0].props.onTextLayout({ nativeEvent: { lines: [{ width: 120 }] } });
  tree = h.render();
  assert.ok(flatten(tree.props.children[1].props.style).width >= 132);
});
