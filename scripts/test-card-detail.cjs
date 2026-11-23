// Native Detail component and pure presentation logic against synthetic records.
// No native filesystem, wallet, network or browser is loaded here.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), ts = require('typescript');
const root = path.resolve(__dirname, '..');
function environment(artwork = false, fontScale = 1) {
  const cache = new Map(), slots = []; let cursor = 0;
  const react = { memo:fn=>fn, useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial;
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
      if (name === 'expo-image') return {Image:'Image'};
      if (name.endsWith('/card-artwork-store')) return {artworkUri:id=>'synthetic://'+id};
      if (name === 'react') return react;
      if (name === 'react/jsx-runtime') return { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) };
      if (name === 'react-native') return native;
      if (name === 'react-native-safe-area-context') return { SafeAreaView: 'SafeAreaView' };
      if(name.endsWith('/ci-theme'))return require('./ci-theme-fixture.cjs');
      if(name.endsWith('/sheet-visual'))return require('./sheet-visual-fixture.cjs');
      if (name.endsWith('/lagoon-theme')) return { lagoon: { canvas: { base: '#eceff1' }, surface: { base: '#fafcfd' },
        action: { soft: '#d7e1e6', deep: '#2b3e49' }, rim: { outer: '#ffffff' }, shadow: { tint: '#293e48' }, text: { primary: '#263943', secondary: '#4c606c', onAction: '#fff' } },
        lagoonFonts: { latin: 'BememManrope' }, alpha: (hex, value) => hex + Math.round(value * 255).toString(16).padStart(2,'0') };
      if (['./GlassButton','./ConfirmationDialog','./GroupFolderCard', './CardFrontBackArtwork', './CardCodeView', './AddCardIcon', './EditMembershipCardEditor', './CardArtworkImage', './ShareCardSheet', './KeepsSheet','./CardHistorySheet', './FullScreenCardView'].includes(name) || name === './CardAppearancePreview' && !artwork) {
        const key = name.slice(2); return { [key]: key };
      }
      assert.ok(name.startsWith('.'), `Unexpected native/IO dependency ${name}`);
      return load(path.resolve(path.dirname(file), name));
    }, mod, mod.exports); return mod.exports;
  }
  return { load, renderComponent(fn,props){cursor=0;return fn(props);}, render(props) { cursor = 0; return load('src/components/bemem/MembershipCardDetail.tsx').MembershipCardDetail(props); },
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
  const frame=id=>frames[presets.findIndex(p=>p.id===id)];
  near(frame('mini-portrait').footprintWidth/frame('card-portrait').footprintWidth,.5);near(frame('mini-portrait').footprintHeight/frame('card-portrait').footprintHeight,.5);
  near(frame('vaccine-passport-portrait').footprintWidth/frame('card-portrait').footprintWidth,5/4);near(frame('vaccine-passport-portrait').footprintHeight/frame('card-portrait').footprintHeight,7/6);
  near(frame('card-portrait').footprintWidth/frame('card-landscape').footprintWidth,4/6);near(frame('card-portrait').footprintHeight/frame('card-landscape').footprintHeight,6/4);
});
test('Legacy geometry is resolved without backfilling or changing cards',()=>{
  for(const orientation of ['landscape','portrait']){const card={...base,orientation},before=JSON.stringify(card),g=geometry(card,390,222);
    assert.equal(g.widthBlocks,orientation==='portrait'?4:6);assert.equal(g.heightBlocks,orientation==='portrait'?6:4);assert.equal(JSON.stringify(card),before);}
});
test('Partial or mismatched dimension metadata is rejected, not silently normalized',()=>{
  assert.throws(()=>geometry({...base,widthBlocks:2},390,222));
  assert.throws(()=>geometry({...makeCard(presets.find(p=>p.id==='mini-landscape')),widthBlocks:6},390,222));
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
  const e=environment(),card=makeCard(presets.find(p=>p.id==='card-landscape')),before=JSON.stringify(card),props={card,fromCreate:false,onClose(){}};
  let tree=measured(e,props);const code=find(tree,n=>n.type==='CardCodeView');assert.equal(code.props.card,card);assert.equal(code.props.card.payload,' 00 Code Ab ');
  assert.ok(nodes(tree).some(n=>n.props?.selectable&&n.props.children===' 00123456 Ab '));
  byLabel(tree,'Show Code 128').props.onPress();tree=e.render(props);assert.equal(find(tree,n=>n.type==='CardCodeView').props.format,'code128');
  byLabel(tree,'Show QR Code').props.onPress();tree=e.render(props);assert.equal(find(tree,n=>n.type==='CardCodeView').props.format,'qr');assert.equal(JSON.stringify(card),before);
});
test('Native code-region responder switches on swipe but never changes the card',()=>{
  const e=environment(),card=makeCard(presets.find(p=>p.id==='card-landscape')),before=JSON.stringify(card),props={card,fromCreate:false,onClose(){}};
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
  assert.equal(typeof byLabel(tree,'My Keeps').props.onPress,'function');
  assert.equal(nodes(tree).some(n=>n.props?.children==='Edit Card · Coming soon'),false);
  tree=e.render({...props,fromCreate:true,editCommands:{openEdit(){return {ok:false,message:'Synthetic locked state'};}}});assert.ok(byLabel(tree,'Edit Card'));assert.equal(nodes(tree).some(n=>n.props?.accessibilityLabel==='Share card'),false);assert.ok(byLabel(tree,'Delete Card'));
});
test('Artwork and Add Card both keep fixed image boundaries independent of text',()=>{
  const e=environment(true),values={name:'Synthetic long name',memberNumber:'00001234',orientation:'landscape',colorId:'slate'},props={values,width:100,height:60};
  let tree=e.renderArt(props),paint=tree.props.children;assert.equal(paint.props.style.at(-1).height,60);assert.equal(paint.props.style.at(-1).minHeight,0);
  assert.equal(nodes(tree).find(n=>n.type==='Text').props.onTextLayout,undefined);
  tree=e.renderArt(props);assert.equal(tree.props.children.props.style.at(-1).height,60);
  tree=e.renderArt({values,width:100});assert.ok(Math.abs(tree.props.children.props.style[1].minHeight-100*3.8/5.8)<1e-8);
});
test('Create has bottom Edit/Delete actions without a header pencil; Home keeps Share and cannot retain an Edit screen on context change',()=>{
 const e=environment();let opens=0,closes=0;
 const props={card:base,fromCreate:true,onClose(){closes++;},editCommands:{openEdit(){opens++;return{ok:true,session:{token:'synthetic',values:{name:base.name,memberNumber:base.memberNumber,expiryMonth:''}}};}}};
 let tree=measured(e,props);const pencil=byLabel(tree,'Edit Card');assert.equal(pencil.props.style.minWidth,48);
 assert.equal(nodes(tree).some(n=>n.type==='AddCardIcon'&&n.props.name==='edit'),false);assert.equal(pencil.props.kind,'action');
 const body=find(tree,n=>n.type==='ScrollView');assert.ok(nodes(body).some(n=>n.props?.testID==='card-detail-actions'));
 pencil.props.onPress();tree=e.render(props);assert.equal(tree.type,'EditMembershipCardEditor');assert.equal(opens,1);assert.equal(tree.props.onDeleted,undefined);
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
test('Home has My Keeps left and Add Keep right in both modes; old Memory is removed',()=>{
 for(const mode of ['cardcode','frontback'])for(const action of ['My Keeps','Add Keep']){
  const e=environment(),props={card:{...base,sheetDisplayMode:mode},fromCreate:false,onClose(){}};let tree=e.render(props);const row=byId(tree,'card-keeps-actions');assert.equal(row.props.style.flexDirection,'row');assert.equal(row.props.children[0].props.accessibilityLabel,'My Keeps');assert.equal(row.props.children[1].props.accessibilityLabel,'Add Keep');assert.equal(row.props.children[1].props.kind,'action');assert.equal(nodes(tree).some(n=>n.props?.accessibilityLabel==='Memory'),false);
  byLabel(tree,action).props.onPress();tree=e.render(props);assert.equal(tree.type,'KeepsSheet');assert.equal(tree.props.card,props.card);assert.equal(tree.props.initialAdd,action==='Add Keep');tree.props.onClose();assert.ok(byId(e.render(props),'card-keeps-actions'));
 }
});

test('Create/Edit context has no Memory/History entry or orphan footer wrapper; existing Edit remains reachable',()=>{
 const e=environment(),props={card:base,fromCreate:true,onClose(){},editCommands:{openEdit(){return{ok:true,session:{token:'synthetic-edit'}};}}};
 let tree=e.render(props);const ns=nodes(tree);
 assert.equal(ns.some(n=>['Memory','View Card History and Receipts'].includes(n.props?.accessibilityLabel)),false);
 assert.equal(ns.some(n=>n.type==='AddCardIcon'&&n.props.name==='history'),false);
 const scroll=find(tree,n=>n.type==='ScrollView'),last=scroll.props.children.filter(Boolean).at(-1);
 assert.equal(last.props.testID,'card-detail-actions');assert.ok(nodes(scroll).some(n=>n.props?.selectable&&n.props.children===base.memberNumber));
 byLabel(tree,'Edit Card').props.onPress();tree=e.render(props);assert.equal(tree.type,'EditMembershipCardEditor');assert.equal(tree.props.card,base);
 assert.equal(nodes(tree).some(n=>['Memory','View Card History and Receipts'].includes(n.props?.accessibilityLabel)),false);
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


test('Detail QR has a content cap independent of tall screens while Code128 keeps its existing height budget',()=>{
 const e=environment(),props={card:makeCard(presets.find(p=>p.id==='card-landscape')),fromCreate:false,onClose(){}};
 let tree=measured(e,props);assert.equal(find(tree,n=>n.type==='CardCodeView').props.maxHeight,224);
 byLabel(tree,'Show Code 128').props.onPress();tree=e.render(props);assert.equal(find(tree,n=>n.type==='CardCodeView').props.maxHeight,Math.max(176,844*.34));
 byLabel(tree,'Show QR Code').props.onPress();tree=e.render(props);assert.equal(find(tree,n=>n.type==='CardCodeView').props.maxHeight,224);
});


test('Front&Back mounts only image-focused presentation; legacy Card+Code retains original code controls',()=>{
 for(const preset of presets){for(const fromCreate of [false,true]){
  const e=environment(),card={...makeCard(preset),sheetDisplayMode:'frontback'},before=JSON.stringify(card);let closed=0;
  const props={card,fromCreate,editCommands:{openEdit(){return{ok:false,message:'Synthetic blocked edit'};}},onClose:()=>closed++};let t=e.render(props);
  assert.equal(nodes(t).some(n=>n.type==='CardCodeView'||n.props?.testID==='card-detail-code-panel'||n.props?.testID==='card-detail-slot'),false);assert.ok(find(t,n=>n.type==='CardFrontBackArtwork'));
  assert.ok(byLabel(t,fromCreate?'Edit Card':'Share card'));if(!fromCreate){byLabel(t,'My Keeps').props.onPress();assert.equal(e.render(props).type,'KeepsSheet');}
  assert.equal(JSON.stringify(card),before);
  const old=environment(),legacy=old.render({...props,card:makeCard(preset)});assert.ok(find(legacy,n=>n.type==='CardCodeView'));
 }
 }
});

// The full-image contain path was a regression: Detail must enlarge the saved Canvas viewport.
const savedImage=(id,width,height,crop)=>({assetId:`art-${id}.jpg`,width,height,byteLength:10,md5:'a'.repeat(32),crop});
function frontBack(card,width=350,availableHeight){
 const e=environment(),C=e.load('src/components/bemem/CardFrontBackArtwork.tsx').CardFrontBackArtwork;
 let tree=e.renderComponent(C,{card,availableHeight});tree.props.onLayout({nativeEvent:{layout:{width}}});tree=e.renderComponent(C,{card,availableHeight});
 return {e,tree,sides:nodes(tree).filter(n=>typeof n.type==='function'&&n.props.image)};
}
function actualImageFrame(image,width,height){
 const e=environment(),C=e.load('src/components/bemem/CardArtworkImage.tsx').CardArtworkImage;
 let tree=e.renderComponent(C,{image});tree.props.onLayout({nativeEvent:{layout:{width,height}}});tree=e.renderComponent(C,{image});
 const rendered=find(tree,n=>n.type==='Image');assert.equal(tree.props.style[0].overflow,'hidden');assert.equal(tree.props.style[1].borderRadius,14);assert.equal(rendered.props.contentFit,'fill');
 return rendered.props.style[1];
}
for(const preset of presets)test(`Front&Back reuses exact Canvas crop at larger painted footprint: ${preset.id}`,()=>{
 const front=savedImage('front',2400,1600,{x:.94,y:.08,zoom:2.8}),back=savedImage('back',800,2400,{x:.05,y:.87,zoom:1.7});
 const card={...makeCard(preset),sheetDisplayMode:'frontback',appearance:{...base.appearance,artwork:{front,back}}},before=JSON.stringify(card),{e,sides}=frontBack(card);
 assert.equal(sides.length,2);const canvas=e.load('src/lib/canvas-layout.ts'),view=e.load('src/lib/wallet-preparation.ts').walletCanvasPresentation({schemaVersion:2,dataset:'bemem-wallet',revision:1,savedAt:base.updatedAt,cards:[card],canvas:{columns:12,layout:{[card.id]:{col:0,row:0}}}});
 const canvasFrame=canvas.canvasItemFrame(view.cards[0],{col:0,row:0},25);
 const canvasTree=e.renderComponent(e.load('src/components/bemem/MembershipCard.tsx').MembershipCard,{card:view.cards[0]});assert.deepEqual(find(canvasTree,n=>n.type==='CardArtworkImage').props.image,front);
 for(const side of sides){
  const rendered=e.renderComponent(side.type,side.props),art=find(rendered,n=>n.type==='CardArtworkImage'),clip=nodes(rendered).find(n=>n.props?.accessibilityLabel?.endsWith('card image'));
  assert.equal(art.props.image,card.appearance.artwork[side.props.side]);assert.equal(art.props.thumbnail,undefined);assert.equal(clip.props.style[0].overflow,'hidden');assert.equal(clip.props.style[0].borderRadius,14);
  const {width,height}=side.props;near(width/height,canvasFrame.width/canvasFrame.height);assert.ok(width>canvasFrame.width);
  const original=actualImageFrame(art.props.image,canvasFrame.width,canvasFrame.height),large=actualImageFrame(art.props.image,width,height),scale=width/canvasFrame.width;
  for(const key of ['width','height','left','top'])near(large[key],original[key]*scale);
  assert.ok(large.left<=0&&large.top<=0&&large.left+large.width>=width-1e-8&&large.top+large.height>=height-1e-8);
 }
 assert.equal(JSON.stringify(card),before);
});
test('Different zoom/pan settings and independent Front/Back are passed unchanged; one-sided cards reserve no missing-side space',()=>{
 for(const crop of [{x:0,y:1,zoom:1},{x:1,y:0,zoom:3},{x:.23,y:.76,zoom:2.1}])for(const side of ['front','back']){
  const image=savedImage(side,4000,900,crop),card={...base,sheetDisplayMode:'frontback',appearance:{...base.appearance,artwork:{[side]:image}}},before=JSON.stringify(card),{e,sides}=frontBack(card,320);
  assert.equal(sides.length,1);assert.equal(sides[0].props.side,side);const t=e.renderComponent(sides[0].type,sides[0].props);assert.deepEqual(find(t,n=>n.type==='CardArtworkImage').props.image.crop,crop);assert.equal(JSON.stringify(card),before);
 }
});
test('Legacy no-image fallback uses legacy painted card ratio, never invents Back or mutates dimensions',()=>{
 for(const orientation of ['landscape','portrait']){
  const card={...base,orientation},before=JSON.stringify(card),{tree,sides}=frontBack(card,320),preview=find(tree,n=>n.type==='CardAppearancePreview');
  assert.equal(sides.length,0);near(preview.props.width/preview.props.height,orientation==='portrait'?3.8/5.8:5.8/3.8);assert.equal(preview.props.presentation.side,'front');assert.equal(JSON.stringify(card),before);
 }
});


test('Canonical image refreshes pan/zoom after Edit for the same asset ID without revealing uncropped content',()=>{
 const e=environment(),C=e.load('src/components/bemem/CardArtworkImage.tsx').CardArtworkImage,image=savedImage('same-id',2400,1600,{x:.9,y:.1,zoom:2.9});
 let tree=e.renderComponent(C,{image});tree.props.onLayout({nativeEvent:{layout:{width:350,height:350*3.8/5.8}}});tree=e.renderComponent(C,{image});const before=find(tree,n=>n.type==='Image').props;
 const changed={...image,crop:{x:.1,y:.85,zoom:1.8}};tree=e.renderComponent(C,{image:changed});const after=find(tree,n=>n.type==='Image').props;
 assert.equal(after.source.uri,before.source.uri);assert.notDeepEqual(after.style[1],before.style[1]);assert.deepEqual(after.style[1],e.load('src/lib/card-artwork.ts').artworkFrame(changed,350,350*3.8/5.8));assert.deepEqual(image.crop,{x:.9,y:.1,zoom:2.9});
});


test('Shared adaptive budget measures the safe content host, header and metadata; Card+Code keeps its presentation',()=>{
 const e=environment(),card={...base,sheetDisplayMode:'frontback'},props={card,fromCreate:false,onClose(){}},before=JSON.stringify(card);
 let t=e.render(props);assert.equal(find(t,n=>n.type==='CardFrontBackArtwork').props.availableHeight,0);
 byId(t,'frontback-safe-host').props.onLayout({nativeEvent:{layout:{width:393,height:700}}});
 find(t,n=>n.props?.style?.marginBottom===16).props.onLayout({nativeEvent:{layout:{height:48}}});byId(t,'frontback-details').props.onLayout({nativeEvent:{layout:{height:112}}});
 t=e.render(props);near(find(t,n=>n.type==='CardFrontBackArtwork').props.availableHeight,700*.92-48-20-16-20-8-112);
 byId(t,'frontback-details').props.onLayout({nativeEvent:{layout:{height:220}}});t=e.render(props);const smallBudget=find(t,n=>n.type==='CardFrontBackArtwork').props.availableHeight;near(smallBudget,700*.92-48-20-16-20-8-220);
 assert.ok(find(t,n=>n.type==='ScrollView'));assert.equal(JSON.stringify(card),before);byLabel(t,'Share card').props.onPress();assert.equal(e.render(props).type,'ShareCardSheet');
 const arrange=environment().render({...props,fromCreate:true});assert.ok(byId(arrange,'frontback-safe-host'));assert.equal(find(arrange,n=>n.type==='CardFrontBackArtwork').props.availableHeight,0);
 const legacy=environment().render({...props,card:base});assert.equal(nodes(legacy).some(n=>n.props?.testID==='frontback-safe-host'),false);assert.ok(find(legacy,n=>n.type==='CardCodeView'));
});

test('Adaptive groups center equal-size saved sides, preserve exact crop scaling and never mount scan code',()=>{
 for(const preset of presets)for(const oneSide of [false,true]){
  const front=savedImage('adaptive-front',2400,1600,{x:.96,y:.04,zoom:2.9}),back=savedImage('adaptive-back',800,2400,{x:.07,y:.91,zoom:1.8});
  const card={...makeCard(preset),sheetDisplayMode:'frontback',appearance:{...base.appearance,artwork:oneSide?{front}:{front,back}}},before=JSON.stringify(card),{e,tree,sides}=frontBack(card,353,400);
  const group=byId(tree,'frontback-card-group');assert.equal(group.props.style[0].alignSelf,'center');assert.equal(group.props.style[1].flexDirection,oneSide?'column':preset.orientation==='portrait'?'row':'column');assert.equal(sides.length,oneSide?1:2);
  for(const side of sides){near(side.props.width,sides[0].props.width);near(side.props.height,sides[0].props.height);const rendered=e.renderComponent(side.type,side.props),art=find(rendered,n=>n.type==='CardArtworkImage');assert.equal(art.props.image,card.appearance.artwork[side.props.side]);const small=actualImageFrame(art.props.image,side.props.width/2,side.props.height/2),large=actualImageFrame(art.props.image,side.props.width,side.props.height);for(const key of ['width','height','left','top'])near(large[key],small[key]*2);}
  assert.equal(nodes(tree).some(n=>n.type==='CardCodeView'||n.type==='Image'),false);assert.equal(JSON.stringify(card),before);
 }
});

for(const preset of presets)test(`Home/Arrange adaptive Sheet parity for ${preset.id}: exact dimensions, sides and crop under equal viewport`,()=>{
 for(const sides of ['both','front','back'])for(const height of [360,700]){
  const front=savedImage('parity-front',4000,3000,{x:.91,y:.03,zoom:2.8}),back=savedImage('parity-back',1200,4000,{x:.1,y:.86,zoom:1.9});
  const card={...makeCard(preset),sheetDisplayMode:'frontback',appearance:{...base.appearance,artwork:sides==='front'?{front}:sides==='back'?{back}:{front,back}}},before=JSON.stringify(card),results=[];
  for(const fromCreate of [false,true]){
   const e=environment(),props={card,fromCreate,presentation:'inline',onClose(){},editCommands:{openEdit(){assert.fail('Viewing must not open/edit/save a draft');}}};let t=e.render(props);
   assert.equal(nodes(t).some(n=>n.type==='CardCodeView'||n.props?.testID==='card-detail-code-panel'),false);
   byId(t,'frontback-safe-host').props.onLayout({nativeEvent:{layout:{width:393,height}}});
   find(t,n=>n.props?.style?.marginBottom===16).props.onLayout({nativeEvent:{layout:{width:353,height:48}}});
   byId(t,'frontback-details').props.onLayout({nativeEvent:{layout:{width:353,height:112}}});t=e.render(props);
   const art=find(t,n=>n.type==='CardFrontBackArtwork');assert.ok(art.props.availableHeight>0);
   assert.equal(art.props.card,card);assert.ok(byLabel(t,fromCreate?'Edit Card':'Share card'));assert.equal(nodes(t).some(n=>n.props?.accessibilityLabel==='My Keeps'),!fromCreate);
   const rendered=frontBack(card,353,art.props.availableHeight),group=byId(rendered.tree,'frontback-card-group');
   results.push({budget:art.props.availableHeight,group:group.props.style,sideFrames:rendered.sides.map(n=>({side:n.props.side,width:n.props.width,height:n.props.height,image:n.props.image}))});
   for(const side of rendered.sides){const image=rendered.e.renderComponent(side.type,side.props);assert.equal(find(image,n=>n.type==='CardArtworkImage').props.displayPreview,'detail');}
  }
  assert.deepEqual(results[0],results[1]);assert.equal(results[0].sideFrames.length,sides==='both'?2:1);assert.equal(JSON.stringify(card),before);
 }
});

test('Both entry contexts close via backdrop/Close/native Back callback without invoking writer or editor',()=>{
 for(const fromCreate of [false,true])for(const presentation of ['inline','modal']){
  const e=environment();let closed=0,edits=0;const card={...base,sheetDisplayMode:'frontback'},before=JSON.stringify(card),props={card,fromCreate,presentation,onClose:()=>closed++,editCommands:{openEdit(){edits++;return{ok:false,message:'Synthetic'};}}};
  const tree=e.render(props);byLabel(tree,'Close').props.onPress();byLabel(tree,'Close card preview').props.onPress();if(presentation==='modal')tree.props.onRequestClose();
  assert.equal(closed,presentation==='modal'?3:2);assert.equal(edits,0);assert.equal(JSON.stringify(card),before);
 }
});

test('Arrange action row stays horizontal normally, stacks accessibly when necessary, and is absent on Home',()=>{
 for(const [width,scale,stacked] of [[353,1,false],[240,1,true],[353,2,true]]){
  const e=environment(false,scale),props={card:base,fromCreate:true,onClose(){},editCommands:{}};let tree=e.render(props),row=byId(tree,'card-detail-actions');row.props.onLayout({nativeEvent:{layout:{width}}});tree=e.render(props);row=byId(tree,'card-detail-actions');assert.equal(row.props.style.some(s=>s?.flexDirection==='column'),stacked);
  const danger=byLabel(tree,'Delete Card'),edit=byLabel(tree,'Edit Card');assert.equal(danger.props.style.backgroundColor,undefined);assert.equal(danger.props.style.borderWidth,undefined);assert.ok(danger.props.style.minHeight>=48);assert.ok(edit.props.style.minHeight>=48);assert.equal(edit.props.kind,'action');assert.equal(edit.props.style.flex,1);
  assert.ok(nodes(danger).some(n=>n.type==='AddCardIcon'&&n.props.name==='delete'&&n.props.color));assert.equal(nodes(e.render({...props,fromCreate:false})).some(n=>n.props?.testID==='card-detail-actions'),false);
 }
});

for(const preset of presets)test(`Home Front&Back EXP-row Fullscreen reuses existing viewer and preserves artwork budget: ${preset.id}`,()=>{
 const card={...makeCard(preset),sheetDisplayMode:'frontback',expiryMonth:'2030-06-15',appearance:{...base.appearance,artwork:{front:savedImage('full-front',4000,3000,{x:.9,y:.05,zoom:2.8}),back:savedImage('full-back',1200,4000,{x:.1,y:.8,zoom:1.7})}}},before=JSON.stringify(card),e=environment(),props={card,fromCreate:false,onClose(){}};
 let tree=e.render(props);assert.equal(nodes(tree).some(n=>n.type==='FullScreenCardView'),false);const row=byId(tree,'frontback-expiry-row');assert.equal(row.props.style.flexDirection,'row');assert.equal(row.props.style.justifyContent,'space-between');assert.equal(row.props.children[0].props.children,'Expires 2030-06-15');
 const full=byLabel(tree,'View card full screen');assert.equal(full.props.style.width,48);assert.equal(full.props.style.height,48);assert.ok(nodes(full).some(n=>n.type==='AddCardIcon'&&n.props.name==='fullscreen'&&n.props.size===20));
 byId(tree,'frontback-safe-host').props.onLayout({nativeEvent:{layout:{height:700}}});find(tree,n=>n.props?.style?.marginBottom===16).props.onLayout({nativeEvent:{layout:{height:48}}});byId(tree,'frontback-details').props.onLayout({nativeEvent:{layout:{height:143}}});row.props.onLayout({nativeEvent:{layout:{height:48}}});row.props.children[0].props.onLayout({nativeEvent:{layout:{height:17}}});tree=e.render(props);near(find(tree,n=>n.type==='CardFrontBackArtwork').props.availableHeight,700*.92-48-20-16-20-8-112);
 byLabel(tree,'View card full screen').props.onPress();full.props.onPress();tree=e.render(props);assert.equal(tree.type,'FullScreenCardView');assert.equal(tree.props.card,card);assert.equal(tree.props.displayPreview,true);tree.props.onSide('back');tree=e.render(props);assert.equal(tree.props.side,'back');tree.props.onBack();tree=e.render(props);assert.ok(byId(tree,'frontback-expiry-row'));assert.equal(nodes(tree).some(n=>n.type==='FullScreenCardView'),false);assert.equal(JSON.stringify(card),before);
 const arrange=environment().render({...props,fromCreate:true,editCommands:{}});assert.equal(nodes(arrange).some(n=>n.props?.testID==='frontback-expiry-row'||n.props?.accessibilityLabel==='View card full screen'),false);assert.ok(byId(arrange,'card-detail-actions'));
});
test('Home Front&Back with no expiry retains its text; back-only artwork opens at its available side',()=>{
 const e=environment(),card={...base,sheetDisplayMode:'frontback',appearance:{...base.appearance,artwork:{back:savedImage('only-back',4000,3000,{x:.8,y:.1,zoom:2})}}},props={card,fromCreate:false,onClose(){}};let tree=e.render(props);assert.equal(byId(tree,'frontback-expiry-row').props.children[0].props.children,'No expiry');byLabel(tree,'View card full screen').props.onPress();assert.equal(e.render(props).props.side,'back');
});
