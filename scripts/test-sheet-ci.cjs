const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),tokens=require('../design-system/bemem-lagoon-glass-rc2/TOKENS.json');
const {ciColors,ciTypography}=require('./ci-theme-fixture.cjs'),{sheetVisual}=require('./sheet-visual-fixture.cjs');
const lagoon=tokens.palettes['pearl-gray'].colors,lagoonFonts={latin:'BememManrope',thai:'BememThai'};
const layout={padding:20,gap:12,toolSize:36,sheetRadius:22};
const file=name=>path.join(root,'src/components/bemem',name+'.tsx');
const source=name=>fs.readFileSync(file(name),'utf8');
function styles(name){const sf=ts.createSourceFile(name,source(name),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let expression;
 for(const s of sf.statements)if(ts.isVariableStatement(s))for(const d of s.declarationList.declarations)if(d.name.getText(sf)==='styles')expression=d.initializer.arguments[0].getText(sf);
 assert.ok(expression,name);return vm.runInNewContext(`(${expression})`,{sheetVisual,ciColors,ciTypography,lagoon,lagoonFonts,layout,
  bemem:{border:'#bac5cc',background:lagoon.canvas.base},StyleSheet:{absoluteFill:{position:'absolute'},hairlineWidth:1}});
}
function nodes(t,out=[]){if(!t||typeof t!=='object')return out;if(Array.isArray(t)){t.forEach(n=>nodes(n,out));return out;}out.push(t);nodes(t.props?.children,out);return out;}
function harness(name){let cursor=0;const slots=[],jsx=(type,props)=>({type,props}),react={useState(v){const i=cursor++;if(!(i in slots))slots[i]=v;return[slots[i],v=>{slots[i]=v;}];}};
 const native={StyleSheet:{create:s=>s,absoluteFill:{}},Platform:{OS:'android',Version:35}};
 for(const n of ['Modal','SafeAreaView','KeyboardAvoidingView','ScrollView','View','Text','Pressable'])native[n]=n;
 const m={exports:{}},code=ts.transpileModule(source(name),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 vm.runInThisContext(`(function(require,module,exports){${code}\n})`)(n=>{
  if(n==='react')return react;if(n==='react/jsx-runtime')return{jsx,jsxs:jsx};if(n==='react-native')return native;
  if(n==='react-native-safe-area-context')return{SafeAreaView:'SafeAreaView'};
  if(n.endsWith('/ci-theme'))return require('./ci-theme-fixture.cjs');if(n.endsWith('/sheet-visual'))return{sheetVisual};
  if(n.endsWith('/lagoon-theme'))return{lagoon,lagoonFonts};if(n==='./add-card-layout')return{addCardLayout:layout};
  if(['./GlassButton','./AddCardText','./AddCardIcon'].includes(n))return{[n.slice(2)]:n.slice(2)};
  throw Error('Unexpected native or storage dependency '+n);
 },m,m.exports);
 return{render(props){cursor=0;return m.exports[name](props);}};
}
const byLabel=(t,label)=>nodes(t).find(n=>n.props?.accessibilityLabel===label);
test('Sheet recipe reuses Pearl Gray surfaces and existing understated rim/shadow without a modal manager',()=>{
 assert.equal(sheetVisual.surface,'#eceff1');assert.equal(sheetVisual.elevated,'#fafcfd');assert.equal(sheetVisual.border,lagoon.rim.boundary);
 assert.equal(sheetVisual.scrim,lagoon.action.deep+'66');assert.equal(sheetVisual.rim,lagoon.rim.boundary+'99');
 const s=fs.readFileSync(path.join(root,'src/constants/sheet-visual.ts'),'utf8');assert.doesNotMatch(s,/react-native|useState|Provider|Modal|FileSystem/);
});
test('Shared Add/Edit/Policy/Login/Share/History retain their presentation owner and footer modes',()=>{
 for(const name of ['AddCardEditor','EditMembershipCardEditor','HomeAccountMenu','ShareCardSheet','CardHistorySheet'])assert.match(source(name),/AddCardSheet/);
 const s=styles('AddCardSheet');assert.equal(s.sheet.backgroundColor,sheetVisual.surface);assert.equal(s.sheet.maxHeight,'92%');assert.equal(s.sheet.borderTopLeftRadius,22);
 assert.equal(s.content.padding,20);assert.equal(s.header.marginBottom,10);assert.equal(s.close.width,36);assert.equal(s.close.height,36);assert.equal(s.close.backgroundColor,sheetVisual.elevated);
 assert.equal(s.title.lineHeight,28);assert.equal(s.overlay.backgroundColor,sheetVisual.scrim);
});
test('Shared sheet backdrop, Close and Android Back preserve one dismissal path; busy and confirmation block backdrop',()=>{
 let closed=0,dialogBack=0;const h=harness('AddCardSheet'),props={modalOnly:true,title:'Policy',onClose(){closed++;},children:'body',footer:'footer'};
 let t=h.render(props);assert.equal(t.type,'Modal');assert.equal(t.props.statusBarTranslucent,true);assert.equal(t.props.navigationBarTranslucent,true);
 t.props.onRequestClose();byLabel(t,'Close Policy').props.onPress();nodes(t).find(n=>n.type==='GlassButton').props.onPress();assert.equal(closed,3);
 t=h.render({...props,closeDisabled:true});assert.equal(byLabel(t,'Close Policy').props.disabled,true);t.props.onRequestClose();assert.equal(closed,3);
 t=h.render({...props,confirmation:{content:'confirmation',onRequestClose(){dialogBack++;}}});t.props.onRequestClose();assert.equal(dialogBack,1);assert.equal(closed,3);
 assert.equal(nodes(t).find(n=>n.type==='Pressable').props.disabled,true);
});
test('Shared sheet preserves keyboard avoidance, normal scroll and specialized virtualized/fixed footers',()=>{
 const h=harness('AddCardSheet'),p={modalOnly:true,onClose(){},children:'body',footer:'CTA'};
 for(const mode of [{},{virtualized:true},{fixedFooter:true}]){
  const tree=h.render({...p,...mode}),ns=nodes(tree);assert.equal(ns.find(n=>n.type==='KeyboardAvoidingView').props.behavior,'height');
  assert.ok(ns.some(n=>n.type==='SafeAreaView'));assert.equal(ns.filter(n=>n.type==='Modal').length,1);assert.ok(ns.some(n=>n.props?.children==='CTA'));
  assert.ok(ns.some(n=>n.type==='ScrollView'&&n.props.keyboardShouldPersistTaps==='handled'));
 }
 const normal=nodes(h.render(p)).find(n=>n.type==='ScrollView');assert.equal(normal.props.keyboardDismissMode,'on-drag');
});
test('Measured shared titles retain available width and wrap contract at360/393/412dp',()=>{
 const h=harness('AddCardSheet'),p={modalOnly:true,onClose(){},title:'A long membership card title with Thai text',children:null,footer:null};
 for(const width of [360,393,412]){
  const t=h.render(p),title=nodes(t).find(n=>n.type==='AddCardText'),header=nodes(t).find(n=>n.props?.onLayout);
  header.props.onLayout({nativeEvent:{layout:{width:width-40}}});const next=nodes(h.render(p)).find(n=>n.type==='AddCardText');
  assert.equal(title.props.children,p.title);assert.equal(next.props.maxWidth,width-40-12-36-8);assert.equal(next.props.style.flexShrink,0);
 }
});
test('Card Detail migrates only UI chrome; white scan panel, quiet-zone region and reference geometry remain',()=>{
 const s=styles('MembershipCardDetail');assert.equal(s.sheet.backgroundColor,'#eceff1');assert.equal(s.surface.backgroundColor,'#fafcfd');assert.equal(s.history.backgroundColor,'#fafcfd');
 assert.equal(s.title.color,'#263943');assert.equal(s.expiry.color,'#4c606c');assert.equal(s.side.color,'#4c606c');assert.equal(s.number.color,'#263943');
 assert.equal(s.sheet.maxHeight,'92%');assert.equal(s.sheet.maxWidth,600);assert.equal(s.sheet.borderTopLeftRadius,24);assert.equal(s.sheet.paddingTop,20);
 assert.equal(s.header.marginBottom,16);assert.equal(s.content.gap,8);assert.equal(s.hit.width,48);assert.equal(s.hit.height,48);assert.equal(s.surface.width,36);
 assert.equal(s.code.backgroundColor,'#ffffff');assert.equal(s.code.paddingHorizontal,4);assert.equal(s.code.borderRadius,20);assert.equal(s.codeLabel.color,'#000000');
 assert.equal(s.number.fontFamily,'monospace');assert.equal(s.number.fontSize,22);assert.equal(s.expiry.width,64);assert.equal(s.tools.width,48);
 assert.doesNotMatch(source('MembershipCardDetail'),/#f4f4fa|#f4f4f9|#10121c|#596577/);
});
test('Share outer controls use CI while capture dimensions and exact white image preview stay independent',()=>{
 const s=styles('ShareCardSheet');assert.equal(s.text.lineHeight,21);assert.equal(s.error.color,'#b42318');assert.equal(s.choices.backgroundColor,sheetVisual.surface);assert.equal(s.choice.minHeight,48);
 const text=source('ShareCardSheet');assert.match(text,/captureRef\(view, \{ format: 'png', result: 'tmpfile' \}\)/);assert.match(text,/contentFit="contain"/);assert.match(text,/backgroundColor:'#ffffff',borderRadius:14/);
 assert.match(text,/CardShareSurface plan=\{plan\}/);assert.match(text,/AddCardSheet modalOnly fixedFooter/);
});
test('Membership chrome uses title/body roles and keeps locked Canvas and manual Coming Soon flow',()=>{
 const s=styles('LockedCanvas');assert.equal(s.sheet.backgroundColor,sheetVisual.surface);assert.equal(s.sheet.padding,24);assert.equal(s.sheet.gap,16);assert.equal(s.sheet.borderTopLeftRadius,24);
 assert.equal(s.title.fontSize,18);assert.equal(s.title.lineHeight,26);assert.equal(s.membershipText.lineHeight,22);assert.equal(s.text.fontSize,16);assert.equal(s.text.lineHeight,25);
 assert.equal(s.close.width,48);assert.equal(s.close.height,48);assert.equal(s.frost.backgroundColor,'#ffffff77');
 const h=harness('LockedCanvas');let t=h.render();assert.equal(nodes(t).find(n=>n.type==='Modal').props.visible,false);
 byLabel(t,'Unlock canvas').props.onPress();t=h.render();assert.equal(nodes(t).find(n=>n.type==='Modal').props.visible,true);
 byLabel(t,'Close Membership').props.onPress();assert.equal(nodes(h.render()).find(n=>n.type==='Modal').props.visible,false);
});
test('EXP outer sheet retains96%/600dp presentation and wheel styles/geometry are not standardized',()=>{
 const s=styles('ExpirationDatePicker');assert.equal(s.sheet.backgroundColor,sheetVisual.surface);assert.equal(s.overlay.backgroundColor,sheetVisual.scrim);assert.equal(s.sheet.maxHeight,'96%');assert.equal(s.sheet.maxWidth,600);
 assert.equal(s.content.padding,16);assert.equal(s.title.fontSize,18);assert.equal(s.title.lineHeight,28);assert.equal(s.monthText.fontSize,13);assert.equal(s.monthText.lineHeight,18);
 assert.equal(s.wheelText.lineHeight,24);assert.equal(s.wheels.gap,4);assert.equal(s.selection.borderRadius,12);assert.equal(s.actionText.lineHeight,22);
});
test('Policy/History keep local spacing and dividers while shared sheet owns chrome',()=>{
 const p=styles('HomeAccountMenu'),h=styles('CardHistorySheet');assert.equal(p.section.borderBottomColor,sheetVisual.border);assert.equal(h.row.borderBottomColor,sheetVisual.border);
 assert.equal(p.body.fontSize,15);assert.equal(p.body.lineHeight,24);assert.equal(p.section.paddingBottom,18);assert.equal(h.row.minHeight,88);assert.equal(h.list.paddingHorizontal,20);
 assert.match(source('CardHistorySheet'),/<FlatList/);assert.match(source('CardHistorySheet'),/virtualized/);
});
