const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),tokens=require('../design-system/bemem-vivid-lagoon/TOKENS.json');
const {ciColors,ciTypography,ciButtons}=require('./ci-theme-fixture.cjs'),{sheetVisual}=require('./sheet-visual-fixture.cjs');
const lagoon=tokens.palettes[tokens.metadata.defaultThemeId].colors,lagoonFonts={latin:'BememManrope',thai:'BememThai'};
const layout={padding:20,gap:12,toolSize:36,sheetRadius:22};
const file=name=>path.join(root,'src/components/bemem',name+'.tsx');
const source=name=>fs.readFileSync(file(name),'utf8');
function styles(name){const sf=ts.createSourceFile(name,source(name),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let expression;
 for(const s of sf.statements)if(ts.isVariableStatement(s))for(const d of s.declarationList.declarations)if(d.name.getText(sf)==='styles')expression=d.initializer.arguments[0].getText(sf);
 assert.ok(expression,name);return vm.runInNewContext(`(${expression})`,{sheetVisual,ciColors,ciTypography,ciButtons,lagoon,lagoonFonts,layout,
  bemem:{border:'#bac5cc',background:lagoon.canvas.base},StyleSheet:{absoluteFill:{position:'absolute'},hairlineWidth:1}});
}
function nodes(t,out=[]){if(!t||typeof t!=='object')return out;if(Array.isArray(t)){t.forEach(n=>nodes(n,out));return out;}out.push(t);nodes(t.props?.children,out);return out;}
function harness(name){let cursor=0;const slots=[],jsx=(type,props)=>({type,props}),react={useRef(v){const i=cursor++;return slots[i]??={current:v};},useCallback:fn=>fn,useEffect(){},useState(v){const i=cursor++;if(!(i in slots))slots[i]=v;return[slots[i],v=>{slots[i]=v;}];}};
 const native={Keyboard:{isVisible:()=>false,dismiss(){}},StyleSheet:{create:s=>s,absoluteFill:{}},Platform:{OS:'android',Version:35}};
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
 return{keyboard:native.Keyboard,render(props){cursor=0;return m.exports[name](props);}};
}
const byLabel=(t,label)=>nodes(t).find(n=>n.props?.accessibilityLabel===label);
test('Sheet recipe reuses Vivid Lagoon surfaces and existing understated rim/shadow without a modal manager',()=>{
 assert.equal(sheetVisual.surface,ciColors.surface.sheet);assert.equal(sheetVisual.elevated,ciColors.surface.elevated);assert.equal(sheetVisual.border,lagoon.rim.boundary);
 assert.equal(sheetVisual.scrim,lagoon.action.deep+'66');assert.equal(sheetVisual.rim,lagoon.rim.boundary+'99');
 const s=fs.readFileSync(path.join(root,'src/constants/sheet-visual.ts'),'utf8');assert.doesNotMatch(s,/react-native|useState|Provider|Modal|FileSystem/);
});

test('Optional fixed-footer viewport observer reports native dimensions without changing Modal, keyboard or dismissal',()=>{
 const h=harness('AddCardSheet'),measured=[];let closed=0;
 const props={modalOnly:true,fixedFooter:true,title:'Share Card',children:'body',footer:'share',onClose:()=>closed++,onContentViewportLayout:size=>measured.push(size)};
 const t=h.render(props),scroll=nodes(t).find(n=>n.type==='ScrollView'&&n.props.onLayout);
 scroll.props.onLayout({nativeEvent:{layout:{width:360,height:540,x:0,y:68}}});assert.equal(measured[0].height,540);assert.equal(measured[0].width,360);assert.equal(closed,0);
 assert.equal(t.type,'Modal');assert.equal(nodes(t).find(n=>n.type==='KeyboardAvoidingView').props.behavior,'height');t.props.onRequestClose();assert.equal(closed,1);
 const without=h.render({...props,onContentViewportLayout:undefined});nodes(without).find(n=>n.type==='ScrollView'&&n.props.onLayout).props.onLayout({nativeEvent:{layout:{width:360,height:540}}});assert.equal(measured.length,1);
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
 const s=styles('MembershipCardDetail');assert.equal(s.sheet.backgroundColor,ciColors.surface.sheet);assert.equal(s.surface.backgroundColor,'transparent');assert.equal(s.history.backgroundColor,ciButtons.secondary);
 assert.equal(s.title.color,'#263943');assert.equal(s.expiry.color,lagoon.text.secondary);assert.equal(s.side.color,lagoon.text.secondary);assert.equal(s.number.color,'#263943');
 assert.equal(s.sheet.maxHeight,'92%');assert.equal(s.sheet.maxWidth,600);assert.equal(s.sheet.borderTopLeftRadius,24);assert.equal(s.sheet.paddingTop,20);
 assert.equal(s.header.marginBottom,16);assert.equal(s.content.gap,8);assert.equal(s.hit.width,48);assert.equal(s.hit.height,48);assert.equal(s.surface.width,36);
 assert.equal(s.code.backgroundColor,'#ffffff');assert.equal(s.code.paddingHorizontal,4);assert.equal(s.code.borderRadius,20);assert.equal(s.codeLabel.color,'#000000');
 assert.equal(s.number.fontFamily,'monospace');assert.equal(s.number.fontSize,22);assert.equal(s.expiry.width,64);assert.equal(s.tools.width,48);
 assert.doesNotMatch(source('MembershipCardDetail'),/#f4f4fa|#f4f4f9|#10121c|#596577/);
});
test('Share outer controls use CI while capture dimensions and exact white image preview stay independent',()=>{
 const s=styles('ShareCardSheet');assert.equal(s.text.lineHeight,21);assert.equal(s.error.color,'#b42318');assert.equal(s.controlsRow.flexDirection,'row');assert.equal(s.controlsRow.flexWrap,'nowrap');assert.equal(s.choice.minHeight,48);
 const text=source('ShareCardSheet');assert.match(text,/captureRef\(view, \{ format: 'png', result: 'tmpfile' \}\)/);assert.match(source('CardShareSurface'),/contentFit="contain"/);assert.equal(s.preview.backgroundColor,'transparent');assert.equal(s.preview.borderWidth,undefined);assert.equal(s.preview.borderRadius,undefined);
 assert.match(text,/CardShareSurface.*plan=\{plan\}/);assert.match(text,/AddCardSheet modalOnly fixedFooter/);
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

test('M3-A sheet motion is opt-in: Add/Edit retain identical native Modal, layout, keyboard and scrim defaults',()=>{
 const h=harness('AddCardSheet'),base={modalOnly:true,title:'Add Card',children:'form',footer:'actions',onClose(){}};
 const original=h.render(base);assert.equal(original.type,'Modal');assert.equal(original.props.animationType,'none');assert.equal(original.props.onShow,undefined);assert.equal(nodes(original).some(n=>n.type==='Animated.View'),false);
 let shows=0,body;const motion={onShow(){shows++;},scrim:{type:'Animated.View',props:{testID:'keeps-motion-scrim'}},renderSheet(element){body=element;return{type:'Animated.View',props:{...element.props,testID:'opt-in-sheet'}};}};
 const animated=h.render({...base,title:'Add Keep',keepsMotion:motion});assert.equal(nodes(animated).filter(n=>n.type==='Modal').length,1);assert.equal(nodes(animated).filter(n=>n.props?.testID==='keeps-motion-scrim').length,1);assert.equal(animated.props.animationType,'none');assert.equal(animated.props.statusBarTranslucent,true);assert.equal(animated.props.navigationBarTranslucent,true);animated.props.onShow();assert.equal(shows,1);
 const oldBody=nodes(original).find(n=>n.props?.style?.[0]?.maxHeight==='92%');assert.deepEqual(body.props.style,oldBody.props.style);assert.equal(nodes(animated).find(n=>n.type==='KeyboardAvoidingView').props.behavior,'height');assert.equal(nodes(h.render({...base,title:'Edit Card'})).some(n=>n.type==='Animated.View'),false);
});
test('M3-A opt-in sheet preserves keyboard-first Back, busy and inline confirmation priority',()=>{
 const h=harness('AddCardSheet');let closed=0,cancelled=0,dismissed=0;const p={modalOnly:true,title:'Add Keep',children:'choices',footer:null,onClose:()=>closed++,keepsMotion:{onShow(){},scrim:null,renderSheet:element=>element}};
 h.keyboard.isVisible=()=>true;h.keyboard.dismiss=()=>dismissed++;h.render(p).props.onRequestClose();assert.equal(dismissed,1);assert.equal(closed,0);
 h.keyboard.isVisible=()=>false;h.render({...p,closeDisabled:true}).props.onRequestClose();assert.equal(closed,0);h.render({...p,confirmation:{content:'confirm',onRequestClose:()=>cancelled++}}).props.onRequestClose();assert.equal(cancelled,1);assert.equal(closed,0);h.render(p).props.onRequestClose();assert.equal(closed,1);
});

test('M3-B content motion stays inside one native sheet and composes onShow without changing default Add/Edit',()=>{
 const h=harness('AddCardSheet');for(const fixedFooter of [false,true]){let inner=0,outer=0,fields,fill;const base={modalOnly:true,title:'Add Keep',fixedFooter,children:'form',footer:'buttons',onClose(){}};const tree=h.render({...base,keepsMotion:{scrim:'same scrim',onShow:()=>outer++,renderSheet:s=>s},keepsContentMotion:{onShow:()=>inner++,renderContent:(s,f)=>{fields=s;fill=f;return s;}}});assert.equal(tree.type,'Modal');assert.equal(nodes(tree).filter(n=>n.type==='Modal').length,1);tree.props.onShow();assert.equal(inner,1);assert.equal(outer,1);assert.equal(fill,fixedFooter);assert.equal(fields.type,fixedFooter?'View':'ScrollView');if(fixedFooter)assert.equal(fields.props.style.flex,1);else{assert.equal(fields.props.keyboardShouldPersistTaps,'handled');assert.equal(fields.props.keyboardDismissMode,'on-drag');}assert.equal(tree.props.animationType,'none');assert.equal(h.render({...base,title:'Add Card'}).props.onShow,undefined);assert.equal(h.render({...base,title:'Edit Card'}).props.onShow,undefined);}
});
test('M3-B keyboard-first Back and discard confirmation remain higher priority than editor cancellation',()=>{
 const h=harness('AddCardSheet');let cancels=0,confirms=0,keyboards=0;const p={modalOnly:true,title:'Note',children:'draft',footer:'actions',onClose:()=>cancels++,keepsContentMotion:{onShow(){},renderContent:s=>s}};h.keyboard.isVisible=()=>true;h.keyboard.dismiss=()=>keyboards++;h.render(p).props.onRequestClose();assert.equal(keyboards,1);assert.equal(cancels,0);h.keyboard.isVisible=()=>false;h.render({...p,confirmation:{content:'discard',onRequestClose:()=>confirms++}}).props.onRequestClose();assert.equal(confirms,1);assert.equal(cancels,0);h.render({...p,closeDisabled:true}).props.onRequestClose();assert.equal(cancels,0);h.render(p).props.onRequestClose();assert.equal(cancels,1);
});
