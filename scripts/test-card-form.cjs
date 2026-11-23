const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const tokens = require('../design-system/bemem-lagoon-glass-rc2/TOKENS.json');
const themeFixture = { core: tokens.core, lagoon: tokens.palettes['pearl-gray'].colors, lagoonFonts: { latin: 'BememManrope' },
  lagoonTokens: tokens, alpha: (color, opacity) => color + Math.round(opacity * 255).toString(16).padStart(2, '0') };
const cache = new Map();
function load(file) {
  file = path.resolve(root, file);
  if (cache.has(file)) return cache.get(file).exports;
  const module = { exports: {} }; cache.set(file, module);
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const dependency = name => {
    assert.ok(name.startsWith('.'), 'Form validation must not load storage, network or native packages');
    return load(path.resolve(path.dirname(file), name + '.ts'));
  };
  vm.runInThisContext(`(function(require,module,exports){${code}\n})`, { filename: file })(dependency, module, module.exports);
  return module.exports;
}
const form = load('src/lib/card-form.ts');
const metadata = { id: 'synthetic-test-card', createdAt: '2026-11-07T00:00:00.000Z', updatedAt: '2026-11-07T00:00:00.000Z' };
const valid = () => ({ ...form.changeMembershipNumber(form.emptyCardForm(), ' 000Ab c '), name: 'Synthetic Club' });
test('Blank form reports all required fields without creating a card', () => {
  const result = form.prepareCardForm(form.emptyCardForm(), metadata);
  assert.equal(result.ok, false);
  for (const key of ['name', 'memberNumber']) assert.ok(result.errors[key]);
  assert.equal(result.card, undefined);
});
test('Membership changes preserve raw characters and track the code initially', () => {
  const original = form.emptyCardForm(); Object.freeze(original);
  const next = form.changeMembershipNumber(original, ' 000Ab c ');
  assert.equal(next.payload, ' 000Ab c '); assert.equal(next.memberNumber, next.payload);
  assert.equal(original.memberNumber, '');
});
test('Number overrides obsolete independent values without altering its text', () => {
  const old = { ...valid(), payload:'old URL', payloadEdited:true };
  const next = form.changeMembershipNumber(old,' 000New Ab ');
  assert.equal(next.payload,' 000New Ab ');assert.equal(next.memberNumber,' 000New Ab ');assert.equal(next.payloadEdited,false);
});

test('Automatic card initialization varies only within the existing palette and presets',()=>{
  const colors=new Set(),gradients=new Set();
  for(const n of [0,.2,.4,.6,.8,.999]){colors.add(form.newCardForm(()=>n).colorId);gradients.add(presentation.newCardPresentation(()=>n).gradientPresetId);}
  assert.ok(colors.size>1);assert.ok(gradients.size>1);
  for(const id of colors)assert.ok(form.CARD_COLORS.some(c=>c.id===id));
});

test('Model preparation keeps original strings, metadata and both preferred formats', () => {
  for (const preferredDisplayFormat of ['qr', 'code128']) {
    const result = form.prepareCardForm({ ...valid(), preferredDisplayFormat }, metadata);
    assert.equal(result.ok, true);
    assert.equal(result.card.payload, ' 000Ab c '); assert.equal(result.card.memberNumber, ' 000Ab c ');
    assert.equal(result.card.id, metadata.id); assert.equal(result.card.kind, 'membership');
    assert.equal(result.card.preferredDisplayFormat, 'qr');
  }
});
test('Unicode Number is retained for QR despite obsolete Code128 preference',()=>{
 const values={...valid(),memberNumber:'??? 000',payload:'old ASCII',preferredDisplayFormat:'code128'};
 const result=form.prepareCardForm(values,metadata);assert.equal(result.ok,true);assert.equal(result.card.payload,values.memberNumber);assert.equal(result.card.preferredDisplayFormat,'qr');
});

test('Unicode QR input remains intact; encoder capacity is deliberately not claimed', () => {
  const values = { ...valid(), memberNumber: '\u0e01\ud83d\ude00' };
  const result = form.prepareCardForm(values, metadata);
  assert.equal(result.ok, true); assert.equal(result.card.payload, values.memberNumber);
});
test('Incomplete Unicode is rejected with a field error', () => {
  const result = form.prepareCardForm({ ...valid(), memberNumber: '\ud800' }, metadata);
  assert.equal(result.ok, false); assert.match(result.errors.memberNumber, /incomplete character/);
});
test('All fixed colors and orientations produce validated membership cards', () => {
  for (const color of form.CARD_COLORS) for (const orientation of ['landscape', 'portrait']) {
    const result = form.prepareCardForm({ ...valid(), colorId: color.id, orientation }, metadata);
    assert.equal(result.ok, true); assert.equal(result.card.orientation, orientation);
    assert.equal(result.card.appearance.backgroundColor, color.background);
    assert.equal(result.card.appearance.textColor, color.text);
    assert.equal(result.card.appearance.imageAssetId, null);
  }
});
test('Unknown choices and whitespace-only required fields do not produce a card', () => {
  for (const patch of [{ colorId: 'unknown' }, { orientation: 'square' }, { name: '   ' }, { memberNumber: '   ' }]) {
    assert.equal(form.prepareCardForm({ ...valid(), ...patch }, metadata).ok, false);
  }
});
function renderRoute(dev) {
  const file = path.join(root, 'src/app/dev-add-card.tsx');
  const module = { exports: {} };
  const native = Object.fromEntries(['KeyboardAvoidingView', 'ScrollView', 'Text', 'View'].map(name => [name, name]));
  Object.assign(native, { Platform: { OS: 'android' }, Keyboard: { dismiss() {} }, StyleSheet: { create: x => x } });
  const dependencies = {
    react: { useState: initial => [typeof initial === 'function' ? initial() : initial, () => {}] },
    'react/jsx-runtime': { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
    'react-native': native,
    'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' },
    'expo-router': { Redirect: 'Redirect', router: { replace() {} } },
    '@/components/bemem/AddCardForm': { AddCardForm: 'AddCardForm' },
    '@/components/bemem/AddCardSheet': { AddCardSheet: 'AddCardSheet', supportsSheetBackgroundBlur: () => true },
    '@/components/bemem/add-card-layout': load('src/components/bemem/add-card-layout.ts'),
    '@/lib/card-presentation': load('src/lib/card-presentation.ts'),
    '@/components/bemem/GlassButton': { GlassButton: 'GlassButton' },
    '@/components/bemem/AddCardText': { AddCardText: 'AddCardText' },
    '@/constants/ci-theme': require('./ci-theme-fixture.cjs'),
    '@/constants/lagoon-theme': themeFixture,
    '@/lib/card-form': form,
    '@/components/bemem/DevAddCardRuntime': { DevAddCardRuntime: 'DevAddCardRuntime' },
  };
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const dependency = name => { assert.ok(Object.hasOwn(dependencies, name), `Unexpected route dependency: ${name}`); return dependencies[name]; };
  vm.runInThisContext(`(function(require,module,exports,__DEV__){${code}\n})`, { filename: file })(dependency, module, module.exports, dev);
  return module.exports.default();
}
test('Production route redirects instead of exposing the development form', () => {
  const screen = renderRoute(false);
  assert.equal(screen.type, 'Redirect'); assert.equal(screen.props.href, '/');
});
test('Development route mounts the isolated in-memory integration screen', () => {
  const screen = renderRoute(true);
  assert.equal(screen.type, 'DevAddCardRuntime');
});

const presentation = load('src/lib/card-presentation.ts');
test('Brand workflow is retired while the default independent gradient is retained', () => {
  const draft = presentation.emptyCardPresentation();
  assert.equal(draft.brandId, null); assert.equal(draft.brandQuery, '');
  assert.equal(draft.gradientPresetId, 'ptt'); assert.equal(presentation.matchingWebBrands, undefined);
});

test('Optional expiration validates calendar months without altering entered text', () => {
  for (const value of ['', '2028-12', '2028-01']) assert.equal(presentation.expiryMonthError(value), undefined);
  for (const value of ['2028-00', '2028-13', '2028-1', ' 2028-12 ', '0000-01']) assert.ok(presentation.expiryMonthError(value));
});
function renderNative(relative, exportName, props, os = 'android', version = 36, stateOverrides = {}, fontScale = 1, fontReady = true) {
  const module = { exports: {} }, file = path.join(root, relative);
  let stateIndex = 0;
  const native = Object.fromEntries(['KeyboardAvoidingView', 'Modal', 'Pressable', 'ScrollView', 'Text', 'TextInput', 'View'].map(name => [name, name]));
  const flatten = value => Array.isArray(value) ? Object.assign({}, ...value.map(flatten)) : value || {};
  Object.assign(native, { Platform: { OS: os, Version: version }, Keyboard: { dismiss() {} }, PanResponder: { create: () => ({ panHandlers: {} }) },
    useWindowDimensions: () => ({ width: 360, height: 800, fontScale }),
    StyleSheet: { create: x => x, absoluteFill: {}, flatten } });
  const dependencies = {
    react: { useState: initial => [Object.hasOwn(stateOverrides, stateIndex) ? stateOverrides[stateIndex++] : (stateIndex++, typeof initial==='function'?initial():initial), () => {}],
      useRef: initial => ({ current: initial }), memo: component => component, useEffect() {}, useCallback: fn => fn, useMemo: fn => fn() },
    'react/jsx-runtime': { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
    'react-native': native, 'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' },
    '../../constants/sheet-visual':require('./sheet-visual-fixture.cjs'),'../../constants/ci-theme': require('./ci-theme-fixture.cjs'),
    '../../constants/lagoon-theme': themeFixture,
    '../../constants/card-appearance': load('src/constants/card-appearance.ts'),
    '../../constants/bemem-theme': { bemem: { muted: '#4c606c', grid: '#405764', error: '#b42318' } },
    '../../lib/card-form': form, '../../lib/card-presentation': presentation,
    '../../lib/card-size-presets': load('src/lib/card-size-presets.ts'),
    '../../lib/card-geometry': load('src/lib/card-geometry.ts'),
    '../../lib/default-card-artwork': load('src/lib/default-card-artwork.ts'),
    '../../lib/canvas-layout': load('src/lib/canvas-layout.ts'), '../../lib/card-interaction': load('src/lib/card-interaction.ts'),
    '../../lib/canvas-drag-scroll': load('src/lib/canvas-drag-scroll.ts'),
    '../../lib/wallet-validation': load('src/lib/wallet-validation.ts'),
    './GlassButton': { GlassButton: 'GlassButton' }, './CardAppearancePreview': { CardAppearancePreview: 'CardAppearancePreview' },
    './CardSheetModeSelector': {CardSheetModeSelector:'CardSheetModeSelector'}, './CardSizeCarousel': { CardSizeCarousel: 'CardSizeCarousel' }, './CardArtworkControls': { CardArtworkControls: 'CardArtworkControls' }, './MembershipNumberScanner': { MembershipNumberScanner: 'MembershipNumberScanner' }, './ExpirationDatePicker': { ExpirationDatePicker: 'ExpirationDatePicker' }, './CardArtworkImage': { CardArtworkImage: 'CardArtworkImage' },
    './AddCardIcon': { AddCardIcon: 'AddCardIcon' }, './add-card-layout': load('src/components/bemem/add-card-layout.ts'),
    'expo-image': { Image: 'Image' },
    'expo-font': { useFonts: () => [fontReady] },
    '../../../assets/fonts/lagoon/manrope.ttf': 1,
    '../../../assets/fonts/lagoon/noto-sans-thai.ttf': 2,
    './AddCardText': { AddCardText: 'AddCardText' },
    './MembershipCard': { MembershipCard: 'MembershipCard' }, './WalletEmptyState': { WalletEmptyState: 'WalletEmptyState' },
    './GroupFolderCard': { GroupFolderCard: 'GroupFolderCard' },
    './DecorationImage': { DecorationImage: 'DecorationImage' }, './DecorateIcon': { DecorateIcon: 'DecorateIcon' },
  };
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  vm.runInThisContext(`(function(require,module,exports){${code}\n})`, { filename: file })(name => {
    assert.ok(Object.hasOwn(dependencies, name), `Unexpected native component dependency: ${name}`); return dependencies[name];
  }, module, module.exports);
  return module.exports[exportName](props);
}
function descendants(tree) {
  const nodes = [];
  function walk(node) { if (!node || typeof node !== 'object') return; if (Array.isArray(node)) return node.forEach(walk); nodes.push(node); walk(node.props?.children); if(node.type==='CardArtworkControls'&&node.props.renderTrigger)walk(node.props.renderTrigger({type:'PhotoAction'})); if(node.type==='CardSizeCarousel'){const size=load('src/components/bemem/add-card-layout.ts').cardPreviewSize(node.props.width,node.props.selectedId);walk(node.props.renderPreview(node.props.selectedId,size.width,size.height));} }
  walk(tree); return nodes;
}
test('Sheet Close, backdrop and Android Back share dismissal; keyboard content remains scrollable', () => {
  let closed=0; const close = () => {closed++;};
  const nodes = descendants(renderNative('src/components/bemem/AddCardSheet.tsx', 'AddCardSheet', { onClose: close, children: 'form', footer: 'action' }));
  nodes.find(n => n.type === 'Modal').props.onRequestClose();assert.equal(closed,1);
  assert.equal(nodes.find(n => n.type === 'Pressable').props.onPress, close);
  assert.equal(nodes.find(n => n.type === 'GlassButton').props.onPress, close);
  assert.equal(nodes.find(n => n.type === 'KeyboardAvoidingView').props.behavior, 'height');
  assert.equal(nodes.find(n => n.type === 'ScrollView').props.keyboardShouldPersistTaps, 'handled');
});
test('Blur is limited to Android 12+ background; unsupported platforms retain dimmed fallback', () => {
  for (const [os, version, enabled] of [['android', 36, true], ['android', 30, false], ['ios', '18', false]]) {
    const tree = renderNative('src/components/bemem/AddCardSheet.tsx', 'AddCardSheet', {}, os, version);
    const background = descendants(tree).find(n => n.props?.accessibilityElementsHidden);
    assert.equal(!!background.props.style[1], enabled);
  }
});
test('Simplified form preserves tools and exact values; country/brand controls are absent', () => {
  let nextPresentation, nextValues;
  const nodes = descendants(renderNative('src/components/bemem/AddCardForm.tsx', 'AddCardForm', {
    values: valid(), errors: {}, presentation: presentation.emptyCardPresentation(),
    onPresentationChange: next => { nextPresentation = next; }, onChange: next => { nextValues = next; },
  }));
  const labels = nodes.filter(n => typeof n.type === 'function').map(n => n.props.label);
  assert.deepEqual(labels, ['Name', 'Number']);
  assert.equal(nodes.some(n => n.props?.accessibilityLabel === 'PTT Blue Card'), false, 'Brand suggestions must not fill the default form');
  assert.equal(nodes.some(n=>n.props?.accessibilityLabel==='Switch card front and back'),false,'Face control belongs to the shared Sheet header');
  assert.equal(nextPresentation,undefined);assert.equal(nextValues,undefined);
  assert.equal(nodes.some(n => n.props?.accessibilityLabel === 'Find or select a brand'), false);
  assert.equal(nodes.some(n => String(n.props?.accessibilityLabel).startsWith('Country:')), false);
  assert.equal(nodes.find(n=>n.type==='CardArtworkControls').props.disabled,false);
});
test('Removed code/palette fields are absent in both modes; Number validation remains visible',()=>{
 for(const mode of ['create','edit']){
 const nodes=descendants(renderNative('src/components/bemem/AddCardForm.tsx','AddCardForm',{mode,values:valid(),presentation:presentation.emptyCardPresentation(),errors:{memberNumber:'Check Number'},onChange(){},onPresentationChange(){}}));
 assert.equal(nodes.some(n=>n.props?.label==='Code value'),false);
 for(const label of ['Use membership number as code value','QR Code','Code 128','Slate card color','No gradient'])assert.equal(nodes.some(n=>n.props?.accessibilityLabel===label),false);
 assert.equal(nodes.find(n=>n.props?.label==='Number').props.error,'Check Number');
 }
});

test('Card artwork bounds name overlays without changing image geometry and distinguishes front/back', () => {
  const values = { ...valid(), name: 'Synthetic long card name '.repeat(20) };
  for (const side of ['front', 'back']) {
    const nodes = descendants(renderNative('src/components/bemem/CardAppearancePreview.tsx', 'CardAppearancePreview', {
      values, presentation: { ...presentation.emptyCardPresentation(), side },
    }));
    const text = nodes.find(n => n.type === 'Text');
    assert.equal(text.props.children, side === 'front' ? values.name : values.memberNumber);
    assert.equal(text.props.numberOfLines, 3); assert.equal(text.props.ellipsizeMode, undefined);
  }
});
test('Responsive carousel uses one bounded block unit and a stable height per orientation',()=>{
 const {cardCarouselLayout}=load('src/components/bemem/add-card-layout.ts');
 for(const width of [120,280,320,372])for(const id of ['card-landscape','card-portrait']){
  const m=cardCarouselLayout(width,id);assert.ok(m.sizes.every(s=>s.width<=width*.84+1e-8));assert.ok(m.height<=256);
  assert.ok(m.offsets.every((x,i)=>!i||x>m.offsets[i-1]));
 }
});

test('Original-flow footer and header remain inside the sheet scroll content', () => {
  const tree = renderNative('src/components/bemem/AddCardSheet.tsx', 'AddCardSheet', {
    children: { type: 'FormMarker' }, footer: { type: 'ActionMarker' }, onClose() {},
  });
  const scroll = descendants(tree).find(n => n.type === 'ScrollView');
  const inside = descendants(scroll);
  assert.ok(inside.some(n => n.type === 'FormMarker'));
  assert.ok(inside.some(n => n.type === 'ActionMarker'));
  assert.ok(inside.some(n => n.props?.accessibilityRole === 'header'));
  const close = inside.find(n => n.type === 'GlassButton');
  assert.equal(close.props.style.width, 36); assert.equal(close.props.style.minHeight, 36);
  assert.equal(close.props.hitSlop, 6);
  assert.ok(descendants(close).some(n => n.type === 'AddCardIcon' && n.props.name === 'close'));
});
test('Form uses one on-card photo controller and no external Front/Back or Gallery/Camera tool rail',()=>{
 const tree=renderNative('src/components/bemem/AddCardForm.tsx','AddCardForm',{values:valid(),errors:{},presentation:presentation.emptyCardPresentation(),onPresentationChange(){},onChange(){}}),ns=descendants(tree);
 assert.equal(ns.filter(n=>n.type==='CardArtworkControls').length,1);assert.equal(ns.filter(n=>n.type==='CardSizeCarousel').length,1);
 assert.equal(typeof ns.find(n=>n.type==='CardArtworkControls').props.renderTrigger,'function');
 assert.equal(ns.some(n=>n.props?.accessibilityLabel==='Switch card front and back'),false);
});

test('Local 16-unit SVG icons use Android-compatible Base64 without disk caching or external URLs', () => {
  for (const name of ['close', 'flip', 'image', 'camera', 'chevron', 'pin']) {
    const icon = renderNative('src/components/bemem/AddCardIcon.tsx', 'AddCardIcon', { name });
    assert.equal(icon.type, 'Image'); assert.equal(icon.props.style.width, 16); assert.equal(icon.props.style.height, 16);
    assert.match(icon.props.source.uri, /^data:image\/svg\+xml;base64,/);
    const encoded = icon.props.source.uri.split(',')[1];
    const decoded = Buffer.from(encoded, 'base64').toString('utf8');
    assert.equal(Buffer.from(decoded, 'utf8').toString('base64'), encoded);
    assert.match(decoded, /width="24" height="24" viewBox="0 0 24 24"/);
    assert.match(decoded, /<path d="[^"]+"/);
    assert.match(decoded, new RegExp(`stroke="${themeFixture.lagoon.text.primary}"`));
    assert.equal(icon.props.cachePolicy, 'none');
  }
});
test('Shared-density fields keep a 48-unit minimum, English labels and unmodified controlled text', () => {
  const tree = renderNative('src/components/bemem/AddCardForm.tsx', 'AddCardForm', {
    values: valid(), errors: {}, presentation: presentation.emptyCardPresentation(), onPresentationChange() {}, onChange() {},
  });
  const fields = descendants(tree).filter(n => typeof n.type === 'function');
  const name = fields.find(n => n.props.label === 'Name');
  assert.equal(name.props.hideLabel, true);
  for (const field of fields) {
    const input = descendants(field.type(field.props)).find(n => n.type === 'TextInput');
    assert.equal(input.props.style.minHeight, 48); assert.equal(input.props.style.fontSize, 14);
    assert.equal(input.props.value, field.props.value); assert.equal(input.props.autoCorrect, false);
    assert.equal(input.props.autoCapitalize, 'none'); assert.equal(input.props.numberOfLines, undefined);
  }
});
const flattenStyle = value => Array.isArray(value) ? Object.assign({}, ...value.map(flattenStyle)) : value || {};

test('Uploaded artwork cards have no gradient underpaint, colored border or turquoise shadow; plain cards retain styling', () => {
  for (const orientation of ['landscape','portrait']) for (const dimensions of [[1200,800],[800,1200],[1000,1000]]) {
    const image = { assetId: 'art-synthetic.jpg', width: dimensions[0], height: dimensions[1], crop: { x: .5, y: .5, zoom: 1 } };
    for (const front of [image, { ...image, assetId: 'art-synthetic-back.jpg' }]) {
      const card = { id: 'synthetic', name: 'Test Member', orientation, colors: ['#1549a2','#329bc5'], appearance: { artwork: { front }, textColor: '#ffffff' } };
      const tree = renderNative('src/components/bemem/MembershipCard.tsx', 'MembershipCard', { card });
      const style = flattenStyle(tree.props.style);
      assert.equal(style.borderWidth,0); assert.equal(style.backgroundColor,'transparent'); assert.equal(style.backgroundImage,'none');
      assert.equal(style.borderRadius,14); assert.equal(style.overflow,'hidden'); assert.equal(style.boxShadow,'0 10px 16px -9px #2639432b');
      assert.equal(descendants(tree).find(n=>n.type==='CardArtworkImage').props.image,front);
    }
    const tree = renderNative('src/components/bemem/MembershipCard.tsx', 'MembershipCard', {
      card: { id: 'synthetic', name: 'Test Member', orientation, colors: ['#1549a2','#329bc5'] },
    });
    assert.equal(flattenStyle(tree.props.style).borderWidth,1);
    assert.match(flattenStyle(tree.props.style).backgroundImage,/linear-gradient/);
  }
});

test('Shared Name/Number fields keep identical placeholder geometry in Add and Edit', () => {
  for (const editing of [false,true]) {
    const props = { values:valid(), presentation: presentation.emptyCardPresentation(), errors:{}, onChange(){}, onPresentationChange(){},
      ...(editing ? { mode:'edit', fullEditing:true, editCard:{ appearance:{ backgroundColor:'#123456', textColor:'#ffffff', imageAssetId:null } } } : {}) };
    const tree = renderNative('src/components/bemem/AddCardForm.tsx','AddCardForm',props);
    const fields = descendants(tree).filter(n=>typeof n.type==='function' && n.props.label);
    assert.deepEqual(fields.map(n=>n.props.label),['Name','Number']);
    for (const [index,field] of fields.entries()) {
      const rendered = field.type(field.props), input = descendants(rendered).find(n=>n.type==='TextInput');
      assert.equal(!!field.props.hideLabel,index < 2); assert.equal(input.props.value,field.props.value);
      assert.equal(input.props.placeholder,['Name','Number',undefined][index]);
      const labels=descendants(rendered).filter(n=>n.type==='Text'&&n.props.children===field.props.label);
      assert.equal(labels.length,0);
    }
  }
});
test('Measured labels reserve glyph bearings without changing font size or using ellipsis', () => {
  const tree = renderNative('src/components/bemem/AddCardText.tsx', 'AddCardText', {
    children: 'Add Card', style: { fontSize: 14, lineHeight: 20, fontWeight: '700' }, maxWidth: 200,
  }, 'android', 36, { 0: { epoch: 'true-1-undefined-Add Card-14-700', width: 63.1 } });
  assert.equal(tree.props.style.width, 68);
  const visible = descendants(tree).find(n => n.type === 'Text' && !n.props.onTextLayout);
  assert.equal(flattenStyle(visible.props.style).fontSize, 14);
  assert.equal(flattenStyle(visible.props.style).paddingHorizontal, 2);
  assert.equal(flattenStyle(visible.props.style).includeFontPadding, true);
  assert.equal(visible.props.numberOfLines, undefined); assert.equal(visible.props.ellipsizeMode, undefined);
  assert.equal(visible.props.adjustsFontSizeToFit, false);
});
test('Normal and enlarged font metrics remain bounded and permit wrapping for every affected label', () => {
  for (const fontScale of [1, 1.5, 2]) for (const text of ['Add Card', 'Front', 'Card 6x4', 'Portrait', 'Thailand', 'Code & color']) {
    const measured = text.length * 8 * fontScale;
    const tree = renderNative('src/components/bemem/AddCardText.tsx', 'AddCardText', {
      children: text, style: { fontSize: 14, lineHeight: 20, fontWeight: '700' }, maxWidth: 80,
    }, 'android', 36, { 0: { epoch: `true-${fontScale}-undefined-${text}-14-700`, width: measured } }, fontScale);
    assert.equal(tree.props.style.width, Math.min(Math.ceil(measured) + 4, 80));
    const visible = descendants(tree).find(n => n.type === 'Text' && !n.props.onTextLayout);
    assert.equal(visible.props.allowFontScaling, true); assert.equal(visible.props.numberOfLines, undefined);
    assert.equal(visible.props.children, text);
  }
});
test('A fallback-font measurement cannot constrain the loaded Manrope label', () => {
  const tree = renderNative('src/components/bemem/AddCardText.tsx', 'AddCardText', {
    children: 'Thailand', style: { fontSize: 14, fontWeight: '600' }, maxWidth: 200,
  }, 'android', 36, { 0: { epoch: 'false-1-undefined-Thailand-14-600', width: 1 } });
  assert.ok(tree.props.style.width > 5);
  const visible = descendants(tree).find(n => n.type === 'Text' && !n.props.onTextLayout);
  assert.equal(flattenStyle(visible.props.style).fontFamily, 'BememManrope');
});
test('Measurement probes are hidden from accessibility and system-font labels can render before font readiness', () => {
  const tree = renderNative('src/components/bemem/AddCardText.tsx', 'AddCardText', {
    children: 'Add Card', style: { fontSize: 18, fontWeight: '800' }, maxWidth: 250, accessibilityRole: 'header',
  }, 'android', 36, {}, 1, false);
  const probe = descendants(tree).find(n => n.props?.accessibilityElementsHidden);
  assert.equal(probe.props.importantForAccessibility, 'no-hide-descendants');
  const visible = descendants(tree).find(n => n.type === 'Text' && !n.props.onTextLayout);
  assert.equal(visible.props.accessibilityRole, 'header');
  assert.equal(flattenStyle(visible.props.style).fontFamily, undefined);
});
test('Size selectors give labels definite pixel budgets with room for the unchanged 16-unit icon', () => {
  for (const formWidth of [280, 320, 372]) {
    const nodes = descendants(renderNative('src/components/bemem/AddCardForm.tsx', 'AddCardForm', {
      values: valid(), errors: {}, presentation: presentation.emptyCardPresentation(), onPresentationChange() {}, onChange() {},
    }, 'android', 36, { 0: formWidth }));
    const active = nodes.find(n => n.type === 'AddCardText' && n.props.children === 'Card 6×4');
    const inactive = nodes.find(n => n.type === 'AddCardText' && n.props.children === 'Portrait');
    const innerWidth = (formWidth - 16) / 2 - 18;
    assert.equal(active.props.maxWidth + 16 + 4, innerWidth);
    assert.equal(inactive.props.maxWidth + 16 + 4, innerWidth);
    assert.equal(nodes.some(n=>n.type==='AddCardText'&&n.props.children==='Front'),false);
  }
});

const sizes = load('src/lib/card-size-presets.ts');
const previewGeometry = load('src/components/bemem/add-card-layout.ts');
const sizeLabels = ['Mini 3\u00d72', 'Photo 4\u00d73', 'Card 6\u00d74', 'Voucher 7\u00d73', 'Boarding Pass 8\u00d74', 'Mini 2\u00d73', 'Photo 3\u00d74', 'Card 4\u00d76', 'Vaccine Passport 5\u00d77'];
test('Nine unique named size IDs exist with Landscape Card as default', () => {
  assert.equal(sizes.CARD_SIZE_PRESETS.length, 9);
  assert.equal(new Set(sizes.CARD_SIZE_PRESETS.map(p => p.id)).size, 9);
  assert.deepEqual(sizes.CARD_SIZE_PRESETS.map(p => p.label), sizeLabels);
  assert.equal(form.emptyCardForm().orientation, 'landscape');
  assert.equal(presentation.emptyCardPresentation().sizePresetId, 'card-landscape');
});
test('Landscape options contain exactly five presets in the requested order', () => {
  assert.deepEqual(sizes.cardSizePresetsFor('landscape').map(p => p.label), sizeLabels.slice(0, 5));
});
test('Portrait options contain exactly four presets in the requested order', () => {
  assert.deepEqual(sizes.cardSizePresetsFor('portrait').map(p => p.label), sizeLabels.slice(5));
});
test('Mini Landscape uses exact 3:2 and the same painted block unit as Card', () => {
  const mini = previewGeometry.cardPreviewSize(372, 'mini-landscape');
  const card = previewGeometry.cardPreviewSize(372, 'card-landscape');
  assert.ok(Math.abs(mini.width/mini.height-2.8/1.8)<1e-8);assert.ok(Math.abs(mini.width/card.width-2.8/5.8)<1e-8);
});
test('Mini Portrait uses exact 2:3 and the same painted block unit as Card', () => {
  const mini = previewGeometry.cardPreviewSize(372, 'mini-portrait');
  const card = previewGeometry.cardPreviewSize(372, 'card-portrait');
  assert.ok(Math.abs(mini.width/mini.height-1.8/2.8)<1e-8);assert.ok(Math.abs(mini.width/card.width-1.8/3.8)<1e-8);
});
test('Every other preset uses its declared dimensions without treating them as Canvas coordinates', () => {
  const ratios = { 'card-landscape': 5.8 / 3.8, 'voucher-landscape': 6.8 / 2.8, 'boarding-pass-landscape': 7.8 / 3.8,
    'card-portrait': 3.8 / 5.8, 'vaccine-passport-portrait': 4.8 / 6.8 };
  for (const [id, ratio] of Object.entries(ratios)) {
    const geometry = previewGeometry.cardPreviewSize(372, id);
    assert.ok(Math.abs(geometry.width / geometry.height - ratio) < 1e-8);
    assert.deepEqual(Object.keys(geometry).sort(), ['height', 'width']);
  }
});
test('Changing preset updates the actual appearance component geometry for all seven shapes', () => {
  for (const preset of sizes.CARD_SIZE_PRESETS) {
    const next = sizes.selectCardSize(valid(), presentation.emptyCardPresentation(), preset.id);
    const geometry = previewGeometry.cardPreviewSize(372, preset.id);
    const tree = renderNative('src/components/bemem/CardAppearancePreview.tsx', 'CardAppearancePreview', {
      ...next, width: geometry.width,
    });
    assert.equal(flattenStyle(tree.props.style).width, geometry.width);
    const card = tree.props.children;
    assert.ok(Math.abs(flattenStyle(card.props.style).minHeight - geometry.height) < 1e-8);
  }
});
test('Mini orientation switching retains the Mini family in both directions', () => {
  assert.equal(sizes.sizePresetForOrientation('mini-landscape', 'portrait'), 'mini-portrait');
  assert.equal(sizes.sizePresetForOrientation('mini-portrait', 'landscape'), 'mini-landscape');
});
test('Card orientation switching retains the Card family in both directions', () => {
  assert.equal(sizes.sizePresetForOrientation('card-landscape', 'portrait'), 'card-portrait');
  assert.equal(sizes.sizePresetForOrientation('card-portrait', 'landscape'), 'card-landscape');
});
test('Unpaired shapes fall back to Card on the new axis and do not restore a stale special size', () => {
  for (const id of ['voucher-landscape', 'boarding-pass-landscape']) {
    const switched = sizes.sizePresetForOrientation(id, 'portrait');
    assert.equal(switched, 'card-portrait');
    assert.equal(sizes.sizePresetForOrientation(switched, 'landscape'), 'card-landscape');
    assert.equal(sizes.sizePresetForOrientation(id, 'landscape'), id);
  }
  assert.equal(sizes.sizePresetForOrientation('vaccine-passport-portrait', 'landscape'), 'card-landscape');
});
test('Every selection preserves all form/presentation properties and leaves its inputs untouched', () => {
  const values = Object.freeze({ ...valid(), payload: ' 000Custom Ab ', payloadEdited: true, colorId: 'lilac', preferredDisplayFormat: 'code128' });
  const draft = Object.freeze({ ...presentation.emptyCardPresentation(), brandQuery: 'Synthetic Brand', brandId: null,
    expiryMonth: '2028-12', side: 'back' });
  const original = JSON.stringify({ values, draft });
  for (const preset of sizes.CARD_SIZE_PRESETS) {
    const next = sizes.selectCardSize(values, draft, preset.id);
    assert.deepEqual({ ...next.values, orientation: values.orientation }, values);
    assert.deepEqual({ ...next.presentation, sizePresetId: draft.sizePresetId }, draft);
    assert.equal(next.values.memberNumber, ' 000Ab c '); assert.equal(next.values.payload, ' 000Custom Ab ');
    assert.equal(next.values.payloadEdited, true);
    assert.notEqual(next.values, values); assert.notEqual(next.presentation, draft);
  }
  assert.equal(JSON.stringify({ values, draft }), original);
});
function renderSizeForm(values, draft, callbacks = {}, formWidth = 320) {
  return renderNative('src/components/bemem/AddCardForm.tsx', 'AddCardForm', {
    values, errors: {}, presentation: draft, onChange() {}, onPresentationChange() {}, ...callbacks,
  }, 'android', 36, { 0: formWidth, 1: true, 5: values.orientation });
}
test('Size menu renders only current-axis presets, full accessible names and selected state', () => {
  for (const orientation of ['landscape', 'portrait']) {
    const id = orientation === 'landscape' ? 'card-landscape' : 'card-portrait';
    const current = sizes.selectCardSize(valid(), presentation.emptyCardPresentation(), id);
    const nodes = descendants(renderSizeForm(current.values, current.presentation));
    const options = nodes.filter(n => n.type === 'Pressable' && sizeLabels.includes(n.props.accessibilityLabel));
    assert.deepEqual(options.map(n => n.props.accessibilityLabel), sizes.cardSizePresetsFor(orientation).map(p => p.label));
    assert.equal(options.filter(n => n.props.accessibilityState.selected).length, 1);
    assert.equal(options.find(n => n.props.accessibilityState.selected).props.accessibilityLabel, sizes.cardSizePreset(id).label);
    assert.ok(options.every(n => n.props.disabled !== true));
  }
});
test('Pressing a size or orientation invokes real controlled updates while preserving custom payload', () => {
  let values = { ...valid(), payload: ' 000Custom ', payloadEdited: true };
  let draft = presentation.emptyCardPresentation();
  let nodes = descendants(renderSizeForm(values, draft, { onChange: next => { values = next; }, onPresentationChange: next => { draft = next; } }));
  nodes.find(n => n.props?.accessibilityLabel === 'Mini 3×2').props.onPress();
  assert.equal(draft.sizePresetId, 'mini-landscape'); assert.equal(values.payload, ' 000Custom ');
  nodes = descendants(renderSizeForm(values, draft, { onChange: next => { values = next; }, onPresentationChange: next => { draft = next; } }));
  nodes.find(n => n.type === 'GlassButton' && n.props.accessibilityLabel === 'Portrait').props.onPress();
  assert.equal(values.orientation,'landscape','Orientation trigger only opens choices');
  nodes=descendants(renderNative('src/components/bemem/AddCardForm.tsx','AddCardForm',{values,presentation:draft,errors:{},onChange:next=>{values=next;},onPresentationChange:next=>{draft=next;}},'android',36,{0:320,1:true,5:'portrait'}));
  nodes.find(n=>n.props?.accessibilityLabel==='Use Portrait').props.onPress();
  assert.equal(values.orientation, 'portrait'); assert.equal(draft.sizePresetId, 'mini-portrait');
  assert.equal(values.memberNumber, ' 000Ab c '); assert.equal(values.payload, ' 000Custom ');
});
test('Preset labels use bounded measured text without ellipsis at narrow width and enlarged fonts', () => {
  for (const preset of sizes.CARD_SIZE_PRESETS) {
    const current = sizes.selectCardSize(valid(), presentation.emptyCardPresentation(), preset.id);
    const nodes = descendants(renderSizeForm(current.values, current.presentation, {}, 280));
    const labels = nodes.filter(n => n.type === 'AddCardText' && n.props.children === preset.label);
    assert.ok(labels.length >= 2);
    for (const label of labels) {
      assert.ok(label.props.maxWidth > 0 && label.props.maxWidth <= 280);
      const tree = renderNative('src/components/bemem/AddCardText.tsx', 'AddCardText', label.props, 'android', 36, {}, 2);
      const visible = descendants(tree).find(n => n.type === 'Text' && !n.props.onTextLayout);
      assert.equal(visible.props.children, preset.label); assert.equal(visible.props.numberOfLines, undefined);
      assert.equal(visible.props.ellipsizeMode, undefined); assert.equal(visible.props.allowFontScaling, true);
    }
  }
});
test('Preview sizes stay within narrow viewports; invalid IDs fail before any state update', () => {
  for (const width of [240, 280, 320, 372]) for (const preset of sizes.CARD_SIZE_PRESETS) {
    const geometry = previewGeometry.cardPreviewSize(width, preset.id);
    assert.ok(geometry.width > 0 && geometry.width <= width);
    assert.ok(geometry.width <= width*.84+1e-8);
  }
  const values = valid(), draft = presentation.emptyCardPresentation(), before = JSON.stringify({ values, draft });
  assert.throws(() => sizes.selectCardSize(values, draft, 'unknown-shape'), /Unknown card size preset/);
  assert.equal(JSON.stringify({ values, draft }), before);
});
test('Web-parity card radius is fixed at 14 for every membership card size and rim mask', () => {
  assert.equal(load('src/constants/card-appearance.ts').CARD_CORNER_RADIUS, 14);
  for (const preset of sizes.CARD_SIZE_PRESETS) {
    const tree = renderNative('src/components/bemem/MembershipCard.tsx', 'MembershipCard', {
      card: { id: 'synthetic-card', name: preset.label, orientation: preset.orientation, sizePresetId: preset.id, colors: ['#244eab', '#189ac0'] },
    });
    assert.equal(flattenStyle(tree.props.style).borderRadius, 14);
    assert.equal(flattenStyle(tree.props.style).overflow, 'hidden');
    const rim = descendants(tree).find(n => flattenStyle(n.props?.style).backgroundImage?.includes('#ffffff22'));
    assert.equal(flattenStyle(rim.props.style).borderRadius, 14);
  }
});
test('Add Card front/back background, artwork and shade share the fixed card radius', () => {
  for (const preset of sizes.CARD_SIZE_PRESETS) for (const side of ['front', 'back']) {
    const current = sizes.selectCardSize(valid(), { ...presentation.emptyCardPresentation(), side }, preset.id);
    const geometry = previewGeometry.cardPreviewSize(372, preset.id);
    const tree = renderNative('src/components/bemem/CardAppearancePreview.tsx', 'CardAppearancePreview', { ...current, width: geometry.width });
    const rounded = descendants(tree).filter(n => flattenStyle(n.props?.style).borderRadius !== undefined);
    assert.equal(rounded.length, 3);
    assert.ok(rounded.every(n => flattenStyle(n.props.style).borderRadius === 14));
    assert.equal(flattenStyle(tree.props.style).width, geometry.width);
  }
});
test('Home and Create Canvas card wrappers use the same radius without changing their frame', () => {
  const card = { id: 'synthetic-card', name: 'Synthetic', orientation: 'landscape', colors: ['#244eab', '#189ac0'] };
  for (const editing of [false, true]) {
    const tree = renderNative('src/components/bemem/WalletCanvas.tsx', 'WalletCanvas', {
      cards: [card], allCards: [card], layout: { [card.id]: { col: 0, row: 0 } }, editing, disabled: false,
      onMove() {}, onOpen() {}, onDragging() {},
    }, 'android', 36, { 0: 320 });
    let frame;
    if (editing) {
      const drag = descendants(tree).find(n => typeof n.type === 'function');
      frame = flattenStyle(drag.type(drag.props).props.style);
    } else {
      const pressable = descendants(tree).find(n => n.type === 'Pressable');
      frame = flattenStyle(pressable.props.style({ pressed: false }));
    }
    assert.equal(frame.borderRadius, 14);
    assert.equal(frame.width, (6 - 0.2) * (320 / 12));
    assert.equal(frame.left, (320 / 12) * 0.1);
  }
});

function editFormNodes(overrides = {}, state = {}) {
  const values = valid(), draft = presentation.emptyCardPresentation();
  const props = { values, presentation: draft, errors: {}, onChange() {}, onPresentationChange() {}, mode: 'edit',
    editCard: { appearance: { backgroundColor: '#123456', textColor: '#ffffff', imageAssetId: null }, country: 'TH' }, ...overrides };
  return descendants(renderNative('src/components/bemem/AddCardForm.tsx', 'AddCardForm', props, 'android', 36, state));
}
function expandFields(nodes) {
  return nodes.filter(n => typeof n.type === 'function').map(n => n.type(n.props)).flatMap(descendants);
}
test('Shared edit form keeps Add Card field order, preview geometry and exact stored appearance for all seven presets', () => {
  const original = { backgroundColor: '#123456', textColor: '#ffffff', imageAssetId: null, gradientPresetId: 'ptt' };
  for (const preset of sizes.CARD_SIZE_PRESETS) {
    const selected = sizes.selectCardSize(valid(), presentation.emptyCardPresentation(), preset.id);
    const nodes = editFormNodes({ values: selected.values, presentation: selected.presentation, editCard: { appearance: original, country: 'TH' } });
    const create = descendants(renderNative('src/components/bemem/AddCardForm.tsx', 'AddCardForm', {
      values: selected.values, presentation: selected.presentation, errors: {}, onChange() {}, onPresentationChange() {},
    }));
    const preview = nodes.find(n => n.type === 'CardAppearancePreview').props;
    assert.equal(preview.width, create.find(n => n.type === 'CardAppearancePreview').props.width);
    assert.deepEqual(preview.appearance, original);
    const fields = expandFields(nodes).filter(n => n.type === 'TextInput');
    assert.deepEqual(fields.map(n => n.props.accessibilityLabel), ['Name', 'Number']);
    assert.ok(fields.slice(0,2).every(n => n.props.editable));
    assert.equal(nodes.find(n => n.props?.accessibilityLabel === 'Landscape').props.disabled, true);
    assert.equal(nodes.find(n => n.props?.accessibilityLabel === 'Portrait').props.disabled, true);
  }
});
test('Edit locks size, brand, code format and appearance; stale handlers cannot change unsupported values', () => {
  let valueChange, presentationChange;
  const values = valid(), draft = presentation.emptyCardPresentation();
  const nodes = editFormNodes({ values, presentation: draft, onChange: v => { valueChange = v; }, onPresentationChange: v => { presentationChange = v; } }, {});
  for (const label of ['Portrait', 'Landscape']) {
    const button = nodes.find(n => n.props?.accessibilityLabel === label);
    assert.equal(button.props.disabled, true); button.props.onPress();
  }
  if (valueChange) assert.deepEqual(valueChange, values);
  assert.equal(presentationChange, undefined);
  assert.equal(nodes.some(n => n.props?.accessibilityLabel === 'Find or select a brand'), false);
});
test('Shared form preserves raw membership input and expiry while busy/reinspection locks editable fields', () => {
  let changed, draft;
  let nodes = editFormNodes({ onChange: v => { changed = v; }, onPresentationChange: v => { draft = v; } });
  let fields = expandFields(nodes);
  fields.find(n => n.props?.accessibilityLabel === 'Number').props.onChangeText(' 000Ab C ');
  assert.equal(changed.memberNumber, ' 000Ab C ');
  const expiry = nodes.find(n => n.type === 'CardSheetModeSelector');
  assert.equal(expiry.type, 'CardSheetModeSelector'); assert.equal(expiry.props.disabled,false);
  assert.equal(draft, undefined, 'Opening or rendering cannot change expiry');
  changed = undefined; draft = undefined;
  nodes = editFormNodes({ disabled: true, onChange: v => { changed = v; }, onPresentationChange: v => { draft = v; } });
  fields = expandFields(nodes).filter(n => n.type === 'TextInput');
  assert.ok(fields.every(n => n.props.editable === false)); fields[0].props.onChangeText('Ignored while saving');
  assert.equal(nodes.find(n=>n.type==='CardSheetModeSelector').props.disabled,true);
  assert.equal(changed, undefined); assert.equal(draft, undefined);
});
test('Legacy country/brand is not displayed and edit expiry errors are shown beside the shared field', () => {
  const nodes = editFormNodes({ editCard: { appearance: { backgroundColor: '#123456', textColor: '#ffffff', imageAssetId: null } },
    presentation: { ...presentation.emptyCardPresentation(), brandQuery: '' }, expiryError: 'Check expiration month.' });
  assert.equal(nodes.some(n => String(n.props?.accessibilityLabel).startsWith('Country:')), false);
  assert.equal(nodes.some(n => n.props?.accessibilityLabel === 'Find or select a brand'), false);
  assert.ok(nodes.some(n => n.props?.accessibilityRole === 'alert' && n.props.children === 'Check expiration month.'));
});
test('Full Edit keeps size and image controls while preserving saved colors with all obsolete selectors absent',()=>{
 const values={...valid(),colorId:'leaf'},draft={...presentation.emptyCardPresentation(),gradientPresetId:'lotus'},card={appearance:{backgroundColor:'#123456',textColor:'#ffffff',imageAssetId:null,gradientPresetId:'ptt'}};
 const nodes=editFormNodes({values,presentation:draft,editCard:card,fullEditing:true},{});
 for(const label of ['Landscape','Portrait'])assert.equal(nodes.find(n=>n.props?.accessibilityLabel===label).props.disabled,false);
 assert.equal(nodes.find(n=>n.type==='CardArtworkControls').props.disabled,false);
 const preview=nodes.find(n=>n.type==='CardAppearancePreview').props;assert.equal(preview.appearance.backgroundColor,'#123456');assert.equal(preview.appearance.gradientPresetId,'ptt');
 for(const label of ['QR Code','Code 128','Slate card color','No gradient'])assert.equal(nodes.some(n=>n.props?.accessibilityLabel===label),false);
});


test('Shared Name/Number fields keep Next navigation, exact input strings and a stable visible preview',()=>{
 for(const mode of ['create','edit']){
  const values={...valid(),name:'Test สมาชิก',memberNumber:' 00123Ab '},draft=presentation.emptyCardPresentation(),before=JSON.stringify({values,draft});
  const tree=renderNative('src/components/bemem/AddCardForm.tsx','AddCardForm',{mode,fullEditing:true,editCard:{id:'synthetic'},values,presentation:draft,errors:{},onChange(){assert.fail('Focus cannot change values');},onPresentationChange(){}});
  const all=descendants(tree),fields=all.filter(n=>typeof n.type==='function'&&['Name','Number'].includes(n.props.label));let next=0;
  fields[1].props.inputRef.current={focus(){next++;}};fields[0].props.onFocus();fields[0].props.onNext();fields[1].props.onFocus();
  assert.equal(next,1);assert.equal(fields[0].props.value,values.name);assert.equal(fields[1].props.value,values.memberNumber);
  const preview=all.find(n=>n.props?.testID==='add-card-preview-tools');assert.equal(flattenStyle(preview.props.style).display,undefined);
  assert.equal(all.filter(n=>n.type==='CardAppearancePreview').length,1);assert.equal(JSON.stringify({values,draft}),before);
 }
});

test('Photo previews use the Card block unit on each axis, preserving paint inset and the actual Canvas frame',()=>{
 const grid=load('src/lib/canvas-layout.ts');
 for(const width of [240,280,320,353,372,560])for(const id of ['photo-landscape','photo-portrait']){
  const preset=sizes.cardSizePreset(id),referenceId=preset.orientation==='landscape'?'card-landscape':'card-portrait',reference=sizes.cardSizePreset(referenceId);
  const card=previewGeometry.cardPreviewSize(width,referenceId),photo=previewGeometry.cardPreviewSize(width,id),unit=card.width/(reference.ratioWidth-.2);
  assert.ok(photo.width<card.width&&photo.height<card.height,'Photo must be smaller on BOTH axes');
  const canvas=grid.canvasItemFrame({id:'synthetic-preview',name:'Test',orientation:preset.orientation,colors:['#123456','#654321'],sizePresetId:id},{col:0,row:0},unit);
  assert.ok(Math.abs(photo.width-canvas.width)<1e-8);assert.ok(Math.abs(photo.height-canvas.height)<1e-8);
  assert.ok(Math.abs((photo.width+.2*unit)/(photo.height+.2*unit)-preset.ratioWidth/preset.ratioHeight)<1e-8);
 }
});
test('All nine previews share the same x/y block unit within their orientation',()=>{
 for(const width of [120,240,320,372,560])for(const p of sizes.CARD_SIZE_PRESETS){
  const geometry=previewGeometry.cardPreviewSize(width,p.id),reference=previewGeometry.cardPreviewSize(width,p.orientation==='portrait'?'card-portrait':'card-landscape'),ref=sizes.cardSizePreset(p.orientation==='portrait'?'card-portrait':'card-landscape'),unit=reference.width/(ref.ratioWidth-.2);
  assert.ok(Math.abs(geometry.width-unit*(p.ratioWidth-.2))<1e-8);assert.ok(Math.abs(geometry.height-unit*(p.ratioHeight-.2))<1e-8);
 }
});

test('Actual Add form updates Photo geometry immediately across orientation/front/back and fixes its frame without resetting fields',()=>{
 let values={...valid(),name:'A long synthetic card name that remains an overlay',memberNumber:' 00123Ab '};
 const image=(id,w,h)=>({assetId:id,width:w,height:h,crop:{x:.5,y:.5,zoom:1}}),artwork={front:image('art-front.png',1200,800),back:image('art-back.png',800,1200)};
 let draft={...presentation.emptyCardPresentation(),sizePresetId:'photo-landscape',artwork},baseline=JSON.stringify({name:values.name,memberNumber:values.memberNumber,artwork});
 const render=()=>renderNative('src/components/bemem/AddCardForm.tsx','AddCardForm',{values,presentation:draft,errors:{},onChange:next=>{values=next;},onPresentationChange:next=>{draft=next;}});
 for(const orientation of ['landscape','portrait','landscape']){
  let tree=render();if(values.orientation!==orientation){const carousel=descendants(tree).find(n=>n.type==='CardSizeCarousel');const next=sizes.selectCardSize(values,draft,sizes.sizePresetForOrientation(draft.sizePresetId,orientation));values=next.values;draft=next.presentation;tree=render();}
  assert.equal(draft.sizePresetId,'photo-'+orientation);let art=descendants(tree).find(n=>n.type==='CardAppearancePreview');const expected=previewGeometry.cardPreviewSize(320,draft.sizePresetId);assert.equal(art.props.width,expected.width);assert.equal(art.props.height,expected.height);
  for(const fontScale of [1,1.5,2]){
   const appearance=renderNative('src/components/bemem/CardAppearancePreview.tsx','CardAppearancePreview',art.props,'android',36,{},fontScale),card=flattenStyle(appearance.props.children.props.style);
   assert.equal(card.height,expected.height);assert.equal(card.minHeight,0);assert.equal(card.overflow,'hidden');assert.equal(card.borderRadius,14);
  }
  draft={...draft,side:draft.side==='front'?'back':'front'};tree=render();art=descendants(tree).find(n=>n.type==='CardAppearancePreview');assert.equal(art.props.width,expected.width);assert.equal(art.props.height,expected.height);
  const crop=load('src/lib/card-artwork.ts').artworkFrame(artwork[draft.side],expected.width,expected.height);assert.ok(crop.width>=expected.width&&crop.height>=expected.height);
  assert.equal(JSON.stringify({name:values.name,memberNumber:values.memberNumber,artwork:draft.artwork}),baseline);
 }
});


test('Actual shared Add/Edit form synchronizes Carousel and dropdown, rejects cross-axis selection and preserves data',()=>{
 for(const mode of ['create','edit']){
  let values={...valid(),name:'สมาชิก Test',memberNumber:' 001Ab '},draft={...presentation.emptyCardPresentation(),side:'back'};
  const render=(open=false)=>renderNative('src/components/bemem/AddCardForm.tsx','AddCardForm',{mode,fullEditing:true,editCard:{appearance:{backgroundColor:'#123456',textColor:'#fff'}},values,presentation:draft,errors:{},onChange:v=>values=v,onPresentationChange:v=>draft=v},'android',36,{0:353,1:open,5:values.orientation});
  let ns=descendants(render()),carousel=ns.find(n=>n.type==='CardSizeCarousel');carousel.props.onSelect('voucher-landscape');
  ns=descendants(render(true));carousel=ns.find(n=>n.type==='CardSizeCarousel');assert.equal(carousel.props.selectedId,'voucher-landscape');
  assert.equal(ns.find(n=>n.props?.accessibilityLabel==='Landscape').props.accessibilityValue.text,'Voucher 7×3');
  ns.find(n=>n.props?.accessibilityLabel==='Photo 4×3').props.onPress();ns=descendants(render());assert.equal(ns.find(n=>n.type==='CardSizeCarousel').props.selectedId,'photo-landscape');
  carousel.props.onSelect('card-portrait');assert.equal(values.orientation,'landscape');assert.equal(draft.sizePresetId,'photo-landscape');
  assert.equal(draft.side,'back');assert.equal(values.name,'สมาชิก Test');assert.equal(values.memberNumber,' 001Ab ');
 }
});


test('Add/Edit Name and Number geometry stays identical for empty, filled, focused and disabled forms',()=>{
 let baseline;
 for(const editing of [false,true])for(const populated of [false,true])for(const disabled of [false,true]){
  const v={...valid(),name:populated?'Test Member':'',memberNumber:populated?' 000Ab C ':''};
  const props={values:v,presentation:presentation.emptyCardPresentation(),errors:{},disabled,onChange(){},onPresentationChange(){},...(editing?{mode:'edit',fullEditing:true,editCard:{appearance:{backgroundColor:'#123456',textColor:'#ffffff',imageAssetId:null}}}:{})};
  const tree=renderNative('src/components/bemem/AddCardForm.tsx','AddCardForm',props),fields=descendants(tree).filter(n=>typeof n.type==='function'&&n.props.label);
  const geometry=fields.map(f=>{const rendered=f.type(f.props),input=descendants(rendered).find(n=>n.type==='TextInput');assert.equal(input.props.placeholder,f.props.label);assert.equal(input.props.value,f.props.value);assert.equal(input.props.editable,!disabled);assert.equal(descendants(rendered).some(n=>n.type==='Text'&&n.props.children===f.props.label),false);return input.props.style;});
  if(!baseline)baseline=geometry;else assert.deepEqual(geometry,baseline);
  assert.deepEqual(geometry[0],geometry[1]);assert.equal(geometry[0].minHeight,48);assert.equal(tree.props.style.gap,12);
 }
});


test('Flat Tonal GlassButton preserves Save dimensions, distinguishes disabled state and mounts no glossy overlays',()=>{
 const tokens=require('../design-system/bemem-vivid-lagoon/TOKENS.json'),palette=tokens.palettes[tokens.metadata.defaultThemeId].colors;
 const mod={exports:{}},file=path.join(root,'src/components/bemem/GlassButton.tsx'),code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInThisContext(`(function(require,module,exports){${code}\n})`)(name=>{
  if(name==='react/jsx-runtime')return{jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})};
  if(name==='react-native')return{Pressable:'Pressable',View:'View',StyleSheet:{create:s=>s,flatten:s=>s}};
  if(name==='../../constants/lagoon-theme')return{core:tokens.core,lagoon:palette};if(name==='../../constants/ci-theme')return require('./ci-theme-fixture.cjs');throw Error(name);
 },mod,mod.exports);
 const appearance=disabled=>{const t=mod.exports.GlassButton({children:'Save Changes',kind:'action',disabled,busy:false,style:{borderRadius:8}});return{tree:t,style:Object.assign({},...t.props.style({pressed:false}))};};
 const inactive=appearance(true),active=appearance(false);assert.equal(active.style.backgroundColor,'#00786F');assert.notEqual(inactive.style.backgroundColor,active.style.backgroundColor);
 for(const v of [inactive,active]){assert.equal(v.style.borderRadius,8);assert.equal(v.style.minHeight,48);assert.equal(v.style.boxShadow,undefined);assert.equal(v.tree.props.children.type,'View');assert.equal(v.tree.props.children.props.children,'Save Changes');}
});
