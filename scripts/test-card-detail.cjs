// Native Detail component and pure presentation logic against synthetic records.
// No native filesystem, wallet, network or browser is loaded here.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), ts = require('typescript');
const root = path.resolve(__dirname, '..');
function environment(artwork = false, fontScale = 1) {
  const cache = new Map(), slots = []; let cursor = 0;
  const react = { useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial;
    return [slots[i], next => { slots[i] = typeof next === 'function' ? next(slots[i]) : next; }]; },
    useRef(initial) { const i = cursor++; return slots[i] ??= { current: initial }; }, useMemo: fn => fn(), useEffect: () => {} };
  const native = { View: 'View', Text: 'Text', Modal: 'Modal', Pressable: 'Pressable', ScrollView: 'ScrollView',
    StyleSheet: { create: v => v, absoluteFill: {} },
    useWindowDimensions: () => ({ width: 390, height: 844, fontScale }), PanResponder: { create: options => ({ panHandlers: options }) } };
  function load(relative) {
    let file = path.resolve(root, relative); if (!/\.tsx?$/.test(file)) file += fs.existsSync(file + '.ts') ? '.ts' : '.tsx';
    if (cache.has(file)) return cache.get(file).exports;
    const mod = { exports: {} }; cache.set(file, mod);
    const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
    vm.runInThisContext(`(function(require,module,exports){${code}\n})`, { filename: file })(name => {
      if (name === 'react') return react;
      if (name === 'react/jsx-runtime') return { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) };
      if (name === 'react-native') return native;
      if (name === 'react-native-safe-area-context') return { SafeAreaView: 'SafeAreaView' };
      if(name.endsWith('/ci-theme'))return require('./ci-theme-fixture.cjs');
      if(name.endsWith('/sheet-visual'))return require('./sheet-visual-fixture.cjs');
      if (name.endsWith('/lagoon-theme')) return { lagoon: { canvas: { base: '#eceff1' }, surface: { base: '#fafcfd' },
        action: { soft: '#d7e1e6', deep: '#2b3e49' }, rim: { outer: '#ffffff' }, shadow: { tint: '#293e48' }, text: { primary: '#263943', secondary: '#4c606c', onAction: '#fff' } },
        lagoonFonts: { latin: 'BememManrope' }, alpha: (hex, value) => hex + Math.round(value * 255).toString(16).padStart(2,'0') };
      if (['./CardCodeView', './AddCardIcon', './EditMembershipCardEditor', './CardArtworkImage', './ShareCardSheet', './CardHistorySheet', './FullScreenCardView'].includes(name) || name === './CardAppearancePreview' && !artwork) {
        const key = name.slice(2); return { [key]: key };
      }
      assert.ok(name.startsWith('.'), `Unexpected native/IO dependency ${name}`);
      return load(path.resolve(path.dirname(file), name));
    }, mod, mod.exports); return mod.exports;
  }
  return { load, render(props) { cursor = 0; return load('src/components/bemem/MembershipCardDetail.tsx').MembershipCardDetail(props); },
    renderArt(props) { cursor = 0; return load('src/components/bemem/CardAppearancePreview.tsx').CardAppearancePreview(props); } };
}
const base = { kind: 'membership', id: 'synthetic-card', name: 'Synthetic Club', memberNumber: ' 00123456 Ab ', payload: ' 00 Code Ab ',
  preferredDisplayFormat: 'qr', orientation: 'landscape', appearance: { backgroundColor: '#005b91', textColor: '#ffffff', imageAssetId: null, gradientPresetId: 'ptt' },
  createdAt: '2026-11-08T00:00:00.000Z', updatedAt: '2026-11-08T00:00:00.000Z' };
const helpers = environment(), geometry = helpers.load('src/lib/card-detail-layout.ts').cardDetailGeometry;
const presets = helpers.load('src/lib/card-size-presets.ts').CARD_SIZE_PRESETS;
const makeCard = preset => ({ ...base, orientation: preset.orientation, sizePresetId: preset.id, widthBlocks: preset.ratioWidth, heightBlocks: preset.ratioHeight });
const near = (a,b) => assert.ok(Math.abs(a-b) < 1e-8, `${a} differs from ${b}`);
const nodes = (tree, out = []) => { if (!tree || typeof tree !== 'object') return out; if (Array.isArray(tree)) { tree.forEach(n => nodes(n,out)); return out; } out.push(tree); nodes(tree.props?.children,out); return out; };
const find = (tree, predicate) => { const node = nodes(tree).find(predicate); assert.ok(node,'Missing component/control'); return node; };
const byLabel = (tree,label) => find(tree,n => n.props?.accessibilityLabel === label);
const byId = (tree,id) => find(tree,n => n.props?.testID === id);
function measured(e, props) {
  let tree = e.render(props);
  byId(tree,'card-detail-sheet').props.onLayout({ nativeEvent: { layout: { width: 390 } } });
  byId(tree,'card-detail-slot').props.onLayout({ nativeEvent: { layout: { width: 222 } } });
  return e.render(props);
}
for (const preset of presets) test(`Native Detail uses real dimensions, inset and 14dp radius: ${preset.id}`, () => {
  const card = makeCard(preset), original = JSON.stringify(card);
  for (const [screen,slot] of [[320,160],[390,222],[600,400]]) {
    const g = geometry(card,screen,slot);
    near(g.blockUnit,(Math.min(screen,600)-32)/12);
    near(g.footprintWidth/g.displayUnit,card.widthBlocks); near(g.footprintHeight/g.displayUnit,card.heightBlocks);
    near(g.paintWidth,(card.widthBlocks-.2)*g.displayUnit); near(g.paintHeight,(card.heightBlocks-.2)*g.displayUnit);
    near(g.inset,g.displayUnit*.1); assert.equal(g.radius,14); assert.ok(g.footprintWidth<=slot+1e-8);
  }
  const e=environment(),props={card,fromCreate:false,onClose(){}},tree=measured(e,props),g=geometry(card,390,222);
  const art=find(tree,n=>n.type==='CardAppearancePreview'); near(art.props.width,g.paintWidth); near(art.props.height,g.paintHeight);
  const box=byId(tree,'card-detail-footprint');near(box.props.style.width,g.footprintWidth);near(box.props.style.height,g.footprintHeight);
  assert.equal(JSON.stringify(card),original);
});
test('2×3 / 4×6 / 5×7 / 6×4 keep relative footprints and one common scale',()=>{
  const frames=presets.map(p=>geometry(makeCard(p),390,222));
  assert.ok(frames.every(g=>g.scale===frames[0].scale));
  near(frames[4].footprintWidth/frames[5].footprintWidth,.5);near(frames[4].footprintHeight/frames[5].footprintHeight,.5);
  near(frames[6].footprintWidth/frames[5].footprintWidth,5/4);near(frames[6].footprintHeight/frames[5].footprintHeight,7/6);
  near(frames[5].footprintWidth/frames[1].footprintWidth,4/6);near(frames[5].footprintHeight/frames[1].footprintHeight,6/4);
});
test('Legacy geometry is resolved without backfilling or changing cards',()=>{
  for(const orientation of ['landscape','portrait']){const card={...base,orientation},before=JSON.stringify(card),g=geometry(card,390,222);
    assert.equal(g.widthBlocks,orientation==='portrait'?4:6);assert.equal(g.heightBlocks,orientation==='portrait'?6:4);assert.equal(JSON.stringify(card),before);}
});
test('Partial or mismatched dimension metadata is rejected, not silently normalized',()=>{
  assert.throws(()=>geometry({...base,widthBlocks:2},390,222));
  assert.throws(()=>geometry({...makeCard(presets[0]),widthBlocks:6},390,222));
});
function swipeHarness(){const formats=[],s=helpers.load('src/lib/card-detail-interaction.ts').createCardDetailSwipe(format=>formats.push(format));return{s,formats};}
test('Swipe claims only horizontal intent and changes format on completed 48-unit release',()=>{
  const {s,formats}=swipeHarness();s.begin(200,390,1);assert.equal(s.shouldClaim(11,0,1),false);assert.equal(s.shouldClaim(-24,2,1),true);
  assert.deepEqual(formats,[]);s.release(-60,2,0);assert.deepEqual(formats,['qr']);s.begin(100,390,1);s.release(70,0,0);assert.deepEqual(formats,['qr','code128']);
});
test('Tap, short, vertical, diagonal, multi-touch and edge gestures never switch',()=>{
  const cases=[[200,1,0,0,0],[200,1,30,0,0],[200,1,60,30,0],[200,1,49,18,2],[10,1,80,0,0],[380,1,-80,0,0],[200,2,-80,0,1]];
  for(const [x,touches,dx,dy,end] of cases){const {s,formats}=swipeHarness();s.begin(x,390,touches);s.shouldClaim(dx,dy,touches);s.release(dx,dy,end);assert.deepEqual(formats,[]);}
});
test('Vertical movement or cancellation stays cancelled even if the finger returns horizontally',()=>{
  const {s,formats}=swipeHarness();s.begin(200,390,1);s.shouldClaim(1,19,1);s.release(-80,0,0);assert.deepEqual(formats,[]);
  s.begin(200,390,1);s.shouldClaim(-20,0,1);s.cancel();s.release(-80,0,0);assert.deepEqual(formats,[]);
});
test('Real CardCodeView receives the exact original payload and raw membership number',()=>{
  const e=environment(),card=makeCard(presets[1]),before=JSON.stringify(card),props={card,fromCreate:false,onClose(){}};
  let tree=measured(e,props);const code=find(tree,n=>n.type==='CardCodeView');assert.equal(code.props.card,card);assert.equal(code.props.card.payload,' 00 Code Ab ');
  assert.ok(nodes(tree).some(n=>n.props?.selectable&&n.props.children===' 00123456 Ab '));
  byLabel(tree,'Show Code 128').props.onPress();tree=e.render(props);assert.equal(find(tree,n=>n.type==='CardCodeView').props.format,'code128');
  byLabel(tree,'Show QR Code').props.onPress();tree=e.render(props);assert.equal(find(tree,n=>n.type==='CardCodeView').props.format,'qr');assert.equal(JSON.stringify(card),before);
});
test('Native code-region responder switches on swipe but never changes the card',()=>{
  const e=environment(),card=makeCard(presets[1]),before=JSON.stringify(card),props={card,fromCreate:false,onClose(){}};
  const area=byId(measured(e,props),'card-detail-swipe-area');
  assert.equal(area.props.onStartShouldSetPanResponder({nativeEvent:{pageX:200}},{numberActiveTouches:1}),false);
  assert.equal(area.props.onMoveShouldSetPanResponder(null,{dx:60,dy:2,numberActiveTouches:1}),true);
  area.props.onPanResponderRelease(null,{dx:70,dy:2,numberActiveTouches:0});
  assert.equal(find(e.render(props),n=>n.type==='CardCodeView').props.format,'code128');assert.equal(JSON.stringify(card),before);
});
test('Unsupported Code128 has a disabled tap and swipe keeps QR without altering payload',()=>{
  const e=environment(),card={...base,memberNumber:' 000 Thai \u0e01 '},before=JSON.stringify(card),props={card,fromCreate:false,onClose(){}};
  let tree=measured(e,props),toggle=byLabel(tree,'Show Code 128');assert.equal(toggle.props.disabled,true);toggle.props.onPress();
  tree=e.render(props);assert.equal(find(tree,n=>n.type==='CardCodeView').props.format,'qr');
  const area=byId(tree,'card-detail-swipe-area');area.props.onStartShouldSetPanResponder({nativeEvent:{pageX:200}},{numberActiveTouches:1});
  area.props.onPanResponderRelease(null,{dx:80,dy:0,numberActiveTouches:0});tree=e.render(props);
  assert.equal(find(tree,n=>n.type==='CardCodeView').props.format,'qr');assert.ok(nodes(tree).some(n=>n.props?.accessibilityRole==='alert'));
  assert.equal(JSON.stringify(card),before);
});
test('Close, outside and Android modal Back share one callback; inside content has no dismiss handler',()=>{
  const e=environment();let closes=0;const tree=measured(e,{card:base,fromCreate:false,onClose(){closes++;}});
  tree.props.onRequestClose();byLabel(tree,'Close card preview').props.onPress();byLabel(tree,'Close').props.onPress();assert.equal(closes,3);
  assert.equal(byId(tree,'card-detail-sheet').props.onPress,undefined);assert.equal(byId(tree,'card-detail-swipe-area').props.onPress,undefined);
});
test('48dp controls, honest unavailable actions and Edit only from Create',()=>{
  const e=environment(),props={card:base,fromCreate:false,onClose(){}};let tree=measured(e,props);
  for(const node of nodes(tree).filter(n=>n.type==='Pressable'&&n.props.accessibilityLabel!=='Close card preview')){
    assert.ok(node.props.style.minWidth>=48&&node.props.style.minHeight>=48);
  }
  assert.notEqual(byLabel(tree,'Share card').props.disabled,true);
  assert.equal(typeof byLabel(tree,'Share card').props.onPress,'function');
  assert.equal(typeof byLabel(tree,'View Card History and Receipts').props.onPress,'function');
  assert.equal(nodes(tree).some(n=>n.props?.children==='Edit Card · Coming soon'),false);
  tree=e.render({...props,fromCreate:true,editCommands:{openEdit(){return {ok:false,message:'Synthetic locked state'};}}});assert.ok(byLabel(tree,'Edit Card'));assert.equal(nodes(tree).some(n=>n.props?.accessibilityLabel==='Share card'),false);assert.equal(nodes(tree).some(n=>n.props?.accessibilityLabel==='Delete Card'),false);
});
test('Artwork and Add Card both keep fixed image boundaries independent of text',()=>{
  const e=environment(true),values={name:'Synthetic long name',memberNumber:'00001234',orientation:'landscape',colorId:'slate'},props={values,width:100,height:60};
  let tree=e.renderArt(props),paint=tree.props.children;assert.equal(paint.props.style.at(-1).height,60);assert.equal(paint.props.style.at(-1).minHeight,0);
  assert.equal(nodes(tree).find(n=>n.type==='Text').props.onTextLayout,undefined);
  tree=e.renderArt(props);assert.equal(tree.props.children.props.style.at(-1).height,60);
  tree=e.renderArt({values,width:100});assert.ok(Math.abs(tree.props.children.props.style[1].minHeight-100*3.8/5.8)<1e-8);
});
test('Create title has one 48dp pencil entry; Home keeps Share and cannot retain an Edit screen on context change',()=>{
 const e=environment();let opens=0,closes=0;
 const props={card:base,fromCreate:true,onClose(){closes++;},editCommands:{openEdit(){opens++;return{ok:true,session:{token:'synthetic',values:{name:base.name,memberNumber:base.memberNumber,expiryMonth:''}}};}}};
 let tree=measured(e,props);const pencil=byLabel(tree,'Edit Card');assert.equal(pencil.props.style.minWidth,48);
 assert.ok(nodes(pencil).some(n=>n.type==='AddCardIcon'&&n.props.name==='edit'));
 const body=find(tree,n=>n.type==='ScrollView');assert.equal(nodes(body).some(n=>['Edit Card','Delete Card'].includes(n.props?.accessibilityLabel)),false);
 pencil.props.onPress();tree=e.render(props);assert.equal(tree.type,'EditMembershipCardEditor');assert.equal(opens,1);assert.equal(typeof tree.props.onDeleted,'function');
 tree=e.render({...props,fromCreate:false});assert.equal(tree.type,'Modal');assert.ok(byLabel(tree,'Share card'));
 assert.equal(nodes(tree).some(n=>['Edit Card','Delete Card'].includes(n.props?.accessibilityLabel)),false);assert.equal(closes,0);
});
test('Compact controls reserve safe bounds outside QR/Code128, including narrow screens and enlarged fonts',()=>{
 const controls=helpers.load('src/lib/card-detail-controls.ts').cardDetailControls;
 for(const format of ['qr','code128'])for(const width of [180,232,256,288,326,536])for(const scale of [1,1.5,2,3]){
  const c=controls(format,width,scale);assert.ok(c.headerHeight>=48);assert.ok(c.labelWidth>0);
  if(c.sideBySide){const left=(width-176)/2,right=left+176;assert.ok(c.labelWidth<=left-8);assert.ok(width-48>=right+8);assert.equal(format,'qr');assert.equal(c.codeTop,4);}
  else{assert.equal(c.codeTop,4);assert.ok(c.codeBottom>=c.headerHeight);assert.ok(c.headerHeight>=Math.ceil(17*scale)+8);}
 }
});
test('Code panel removes the lower tool row and uses bottom-corner overlay or a safe lower edge without shrinking codes',()=>{
 const e=environment(),props={card:base,fromCreate:false,onClose(){}};
 let tree=measured(e,props);byId(tree,'card-detail-code-panel').props.onLayout({nativeEvent:{layout:{width:350}}});tree=e.render(props);
 let tools=byId(tree,'card-detail-code-tools'),area=byId(tree,'card-detail-swipe-area');
 assert.equal(tools.props.style[0].position,'absolute');assert.equal(tools.props.style[1].bottom,4);assert.equal(area.props.style.paddingTop,4);
 assert.equal(find(tree,n=>n.type==='CardCodeView').props.card.payload,base.payload);
 byLabel(tree,'Show Code 128').props.onPress();tree=e.render(props);tools=byId(tree,'card-detail-code-tools');area=byId(tree,'card-detail-swipe-area');
 assert.equal(tools.props.style[1].height,48);assert.ok(area.props.style.paddingBottom>=48);assert.equal(area.props.style.paddingTop,4);assert.equal(find(tree,n=>n.type==='CardCodeView').props.format,'code128');
 assert.equal(byLabel(tree,'Show QR Code').props.style.minWidth,48);
});
test('Detail reduces reserved card-stage whitespace for every preset while retaining original common scale and painted footprint',()=>{
 const e=environment();for(const preset of presets){const card=makeCard(preset),tree=measured(e,{card,fromCreate:false,onClose(){}}),g=geometry(card,390,222);
 const slot=byId(tree,'card-detail-slot');assert.equal(slot.props.style[1].height,g.footprintHeight);
 const preview=find(tree,n=>n.type==='CardAppearancePreview');assert.equal(preview.props.width,g.paintWidth);assert.equal(preview.props.height,g.paintHeight);
 const scroll=find(tree,n=>n.type==='ScrollView');assert.equal(scroll.props.contentContainerStyle.gap,8);
 assert.equal(scroll.props.contentContainerStyle.paddingBottom,20);assert.ok(g.footprintHeight<=g.stageHeight);
 }
});
test('Enlarged code labels fall back to a taller safe edge rather than entering scan content',()=>{
 const e=environment(false,3),props={card:base,fromCreate:false,onClose(){}};let tree=measured(e,props);
 byId(tree,'card-detail-code-panel').props.onLayout({nativeEvent:{layout:{width:312}}});tree=e.render(props);
 const tools=byId(tree,'card-detail-code-tools'),area=byId(tree,'card-detail-swipe-area');assert.ok(tools.props.style[1].height>=59);assert.ok(area.props.style.paddingBottom>=tools.props.style[1].height);assert.equal(area.props.style.paddingTop,4);
 assert.equal(find(tree,n=>n.type==='CardCodeView').props.format,'qr');
});
test('Measured multi-line labels grow the safe control edge instead of clipping or overlaying scan data',()=>{
 const e=environment(false,3),props={card:{...base,preferredDisplayFormat:'code128'},fromCreate:false,onClose(){}};let tree=measured(e,props);byLabel(tree,'Show Code 128').props.onPress();tree=e.render(props);
 byId(tree,'card-detail-code-panel').props.onLayout({nativeEvent:{layout:{width:220}}});tree=e.render(props);
 const label=find(tree,n=>n.type==='Text'&&n.props.children==='Code 128');label.props.onTextLayout({nativeEvent:{lines:[{height:60},{height:60}]}});
 tree=e.render(props);const tools=byId(tree,'card-detail-code-tools'),area=byId(tree,'card-detail-swipe-area');
 assert.ok(tools.props.style[1].height>=128);assert.ok(area.props.style.paddingBottom>=128);assert.equal(area.props.style.paddingTop,4);
 assert.equal(find(tree,n=>n.type==='CardCodeView').props.card.payload,base.payload);
});
test('Home Share opens a read-only sheet and restores the original code format and card side on return',()=>{
 const e=environment(),props={card:base,fromCreate:false,onClose(){}};let tree=measured(e,props);
 byLabel(tree,'Show Code 128').props.onPress();byLabel(tree,'Switch card front and back').props.onPress();tree=e.render(props);
 byLabel(tree,'Share card').props.onPress();tree=e.render(props);assert.equal(tree.type,'ShareCardSheet');assert.equal(tree.props.card,base);
 tree.props.onClose();tree=e.render(props);assert.equal(tree.type,'Modal');assert.equal(find(tree,n=>n.type==='CardCodeView').props.format,'code128');
 assert.equal(find(tree,n=>n.type==='CardAppearancePreview').props.presentation.side,'back');assert.equal(nodes(tree).some(n=>n.props?.accessibilityLabel==='Edit Card'),false);
});
test('History opens the same membership/context and closing preserves the Detail code format',()=>{
 for(const fromCreate of [false,true]){
  const e=environment(),props={card:base,fromCreate,onClose(){}};let tree=e.render(props);
  byLabel(tree,'Show Code 128').props.onPress();tree=e.render(props);byLabel(tree,'View Card History and Receipts').props.onPress();tree=e.render(props);
  assert.equal(tree.type,'CardHistorySheet');assert.equal(tree.props.card,base);assert.equal(tree.props.fromCreate,fromCreate);
  tree.props.onClose();tree=e.render(props);assert.equal(byId(tree,'card-detail-code-tools').props.children[0].props.children,'Code 128');
 }
});
test('Reference Code Panel paints QR tools in lower side gutters and keeps the full code/quiet bounds clear',()=>{
 const controls=helpers.load('src/lib/card-detail-controls.ts').cardDetailControls;
 for(const width of [288,310,350,540])for(const scale of [1,1.5]){
  const c=controls('qr',width,scale);assert.equal(c.codeTop,4);
  if(c.sideBySide){const qrLeft=(width-176)/2,qrRight=qrLeft+176;assert.ok(c.labelWidth<=qrLeft-8);assert.ok(width-48>=qrRight+8);assert.equal(c.codeBottom,8);}
 }
});
test('Barcode and narrow QR bottom controls never paint over SVG bounds at any tested font size',()=>{
 const controls=helpers.load('src/lib/card-detail-controls.ts').cardDetailControls;
 for(const format of ['qr','code128'])for(const width of [180,220,256,310,540])for(const scale of [1,1.5,2,3])for(const measuredHeight of [0,34,120]){
  const c=controls(format,width,scale,measuredHeight);if(c.sideBySide)continue;
  const codeHeight=format==='qr'?176:126,panelHeight=c.codeTop+codeHeight+c.codeBottom;
  const toolTop=panelHeight-4-c.headerHeight,svgBottom=c.codeTop+codeHeight;
  const surfaceTop=toolTop+(c.headerHeight-36)/2,labelHeight=Math.max(17*scale,measuredHeight),labelTop=toolTop+(c.headerHeight-labelHeight)/2;
  assert.ok(surfaceTop>=svgBottom+2);assert.ok(labelTop>=svgBottom);assert.ok(c.headerHeight>=48);assert.ok(c.labelWidth+8+48<=width);
 }
});
test('Both contexts share bottom code geometry without changing Share/Pencil, payload or encoder input',()=>{
 for(const fromCreate of [false,true])for(const format of ['qr','code128']){
  const e=environment(),card={...base,preferredDisplayFormat:format},props={card,fromCreate,onClose(){},editCommands:{openEdit:()=>({ok:false,message:'Fixture'})}};
  let tree=measured(e,props);if(format==='code128'){byLabel(tree,'Show Code 128').props.onPress();tree=e.render(props);}byId(tree,'card-detail-code-panel').props.onLayout({nativeEvent:{layout:{width:350}}});tree=e.render(props);
  const tools=byId(tree,'card-detail-code-tools');assert.equal(tools.props.style[1].bottom,4);assert.equal(tools.props.style[1].top,undefined);assert.equal(find(tree,n=>n.type==='CardCodeView').props.card.payload,base.payload);
  assert.ok(byLabel(tree,fromCreate?'Edit Card':'Share card'));assert.equal(byLabel(tree,format==='qr'?'Show Code 128':'Show QR Code').props.style.width,48);
 }
});

test('Both Detail contexts place Front/Back above Flip and Full below, retaining side and permissions after returning',()=>{
 for(const fromCreate of [false,true]){
  const e=environment(),home=()=>{},props={card:base,fromCreate,onClose(){},onHome:home,editCommands:{openEdit:()=>({ok:false,message:'Synthetic'})}};
  let tree=measured(e,props);const tools=find(tree,n=>n.type==='View'&&Array.isArray(n.props.children)&&n.props.children.some(c=>c?.props?.accessibilityLabel==='View card full screen'));
  assert.equal(tools.props.children[0].type,'Text');assert.equal(tools.props.children[0].props.children,'Front');
  assert.equal(tools.props.children[1].props.accessibilityLabel,'Switch card front and back');assert.equal(tools.props.children[2].props.accessibilityLabel,'View card full screen');
  byLabel(tree,'Switch card front and back').props.onPress();tree=e.render(props);const open=byLabel(tree,'View card full screen');open.props.onPress();open.props.onPress();tree=e.render(props);
  assert.equal(tree.type,'FullScreenCardView');assert.equal(tree.props.side,'back');assert.equal(tree.props.onHome,home);tree.props.onSide('front');tree=e.render(props);tree.props.onBack();tree=e.render(props);
  assert.equal(tree.type,'Modal');assert.ok(byLabel(tree,fromCreate?'Edit Card':'Share card'));assert.equal(byLabel(tree,'Switch card front and back').props.accessibilityState.selected,false);
 }
});
