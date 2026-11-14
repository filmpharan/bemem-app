// Actual UI modules with native/hook mocks; no filesystem wallet, network or auth.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const root=path.resolve(__dirname,'..');
const jsx=(type,props)=>({type,props});
function nodes(tree,out=[]){if(!tree||typeof tree!=='object')return out;if(Array.isArray(tree)){tree.forEach(n=>nodes(n,out));return out;}out.push(tree);nodes(tree.props?.children,out);return out;}
function texts(tree){return nodes(tree).filter(n=>n.type==='Text').map(n=>n.props.children).filter(t=>typeof t==='string');}
function harness(relative,exportName,extra={},dimensions={width:390,height:844,fontScale:1}){
 const slots=[],alerts=[];let cursor=0;
 const react={useState(initial){const i=cursor++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;
  return[slots[i],v=>{slots[i]=typeof v==='function'?v(slots[i]):v;}];},useRef(initial){const i=cursor++;return slots[i]??={current:initial};},useEffect(){},useMemo:fn=>fn(),useCallback:fn=>fn};
 const native=Object.fromEntries(['View','Text','Pressable','ScrollView','Modal','ActivityIndicator'].map(n=>[n,n]));
 Object.assign(native,{StyleSheet:{create:s=>s,absoluteFill:{position:'absolute',top:0,right:0,bottom:0,left:0},hairlineWidth:1},useWindowDimensions:()=>dimensions,
  Alert:{alert:(...a)=>alerts.push(a)},BackHandler:{addEventListener(){return{remove(){}};}},Keyboard:{dismiss(){}}});
 const dependencies={'../../constants/sheet-visual':require('./sheet-visual-fixture.cjs'),'../../constants/ci-theme':require('./ci-theme-fixture.cjs'),'@/constants/ci-theme':require('./ci-theme-fixture.cjs'),react,'react-native':native,'react/jsx-runtime':{jsx,jsxs:jsx},
  'react-native-safe-area-context':{SafeAreaView:'SafeAreaView',useSafeAreaInsets:()=>({top:24,bottom:24,left:0,right:0})},
  '../../constants/bemem-theme':{bemem:{border:'#bdc6ce',background:'#f7f7fa'}},
  '../../constants/lagoon-theme':{lagoon:{text:{primary:'#263943'}},lagoonFonts:{latin:'BememManrope'}},
  './AddCardSheet':{AddCardSheet:'AddCardSheet'},'./GlassButton':{GlassButton:'GlassButton'},
  './AddCardIcon':{AddCardIcon:'AddCardIcon'},'./AccountIcon':{AccountIcon:'AccountIcon'},
  './EightSlotHeader':{compactHeaderStyles:{target:{width:'100%',maxWidth:48,height:48},circle:{width:32}}},
  ...extra};
 const file=path.join(root,relative),module={exports:{}};
 const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 vm.runInThisContext(`(function(require,module,exports){${code}\n})`,{filename:file})(name=>{
  if(dependencies[name])return dependencies[name];
  if(name.startsWith('@/components/')){const component=path.basename(name);return{[component]:component};}
  throw Error('Unexpected UI dependency: '+name);
 },module,module.exports);
 return{alerts,render(props){cursor=0;return module.exports[exportName](props);}};
}
function account(options={}){
 let added=0,decorated=0;const h=harness('src/components/bemem/HomeAccountMenu.tsx','HomeAccountMenu');
 const render=()=>h.render({disabled:false,onAddCard(){added++;},onDecorate(){decorated++;},...options});
 const open=()=>{nodes(render()).find(n=>n.props?.accessibilityLabel==='Account').props.onPress();return render();};
 return{h,render,open,added:()=>added,decorated:()=>decorated};
}

test('Account opens exactly one compact popup with exactly4 ordered labels and no subtitles',()=>{
 const a=account();let tree=a.render();assert.equal(nodes(tree).some(n=>n.type==='Modal'),false);
 const trigger=nodes(tree).find(n=>n.props?.accessibilityLabel==='Account');
 assert.equal(trigger.props.style({pressed:false})[0].width,48);assert.equal(trigger.props.style({pressed:false})[0].borderRadius,24);
 trigger.props.onPress();trigger.props.onPress();tree=a.render();assert.equal(nodes(tree).filter(n=>n.type==='Modal').length,1);
 assert.deepEqual(texts(tree),['Add Card','Decorate','Policy','Login']);
 assert.equal(nodes(tree).filter(n=>n.props?.accessibilityLabel==='Account')[0].props.accessibilityState.expanded,true);
 const menu=nodes(tree).find(n=>n.props?.accessibilityViewIsModal);assert.ok(menu.props.style[1].width<=224);
 for(const b of nodes(menu).filter(n=>n.type==='Pressable'))assert.ok(b.props.style({pressed:false})[0].minHeight>=48);
});

test('Account entries use approved family icons and Login shares the existing Account/Profile component',()=>{
 const a=account(),tree=a.open();
 assert.equal(nodes(tree).find(n=>n.props?.accessibilityLabel==='Account').props.children.type,'AccountIcon');
 for(const [label,type,name] of [['Add Card','AddCardIcon','add-card'],['Decorate','AddCardIcon','decorate'],['Policy','AddCardIcon','policy'],['Login','AccountIcon',undefined]]){
  const entry=nodes(tree).find(n=>n.props?.accessibilityLabel===label);
  const icon=nodes(entry).find(n=>n.type===type);assert.ok(icon);assert.equal(icon.props.name,name);assert.equal(icon.props.size,20);
  assert.equal(entry.props.accessibilityRole,'button');assert.equal(entry.props.style({pressed:false})[0].minHeight,48);
 }
});

test('Outside tap and native Android Back dismiss popup without invoking a navigation action',()=>{
 for(const dismissal of ['outside','back']){
  const a=account(),tree=a.open();
  if(dismissal==='outside')nodes(tree).find(n=>n.props?.accessibilityLabel==='Close account menu').props.onPress();
  else nodes(tree).find(n=>n.type==='Modal').props.onRequestClose();
  assert.equal(nodes(a.render()).some(n=>n.type==='Modal'||n.type==='AddCardSheet'),false);
  assert.equal(a.added()+a.decorated(),0);
 }
});

test('Add Card/Decorate close the popup and issue one existing-route callback, rejecting repeated/stale selection',()=>{
 for(const label of ['Add Card','Decorate']){
  const a=account(),tree=a.open(),item=nodes(tree).find(n=>n.props?.accessibilityLabel===label);
  item.props.onPress();item.props.onPress();assert.equal(a.added()+a.decorated(),1);
  assert.equal(a.added(),label==='Add Card'?1:0);assert.equal(a.decorated(),label==='Decorate'?1:0);
  assert.equal(nodes(a.render()).some(n=>n.type==='Modal'||n.type==='AddCardSheet'),false);
 }
});

test('Policy reuses the existing sheet with exact3 informational sections, Close and no consent controls',()=>{
 const a=account(),menu=a.open();nodes(menu).find(n=>n.props?.accessibilityLabel==='Policy').props.onPress();
 let tree=a.render();assert.equal(nodes(tree).some(n=>n.type==='Modal'),false);
 const sheet=nodes(tree).find(n=>n.type==='AddCardSheet');assert.equal(sheet.props.title,'Policy');assert.equal(sheet.props.modalOnly,true);
 assert.deepEqual(texts(sheet).filter((_,i)=>i%2===0),['Local Device Storage','Decorate — One-Time Purchase','Cloud Backup — Monthly Subscription']);
 assert.ok(texts(sheet).includes('Your cards and decorations are currently stored on this device. Automatic cloud backup is not available. Uninstalling the app or changing devices may result in data loss.'));
 assert.ok(texts(sheet).includes('Decorate is currently available for testing. A one-time purchase to unlock Decorate is planned for a future release.'));
 assert.ok(texts(sheet).includes('Cloud backup and sync are planned as a monthly subscription service. Login and cloud storage are not yet available.'));
 assert.equal(/I Agree|Accept|checkbox/i.test(texts(sheet).join(' ')),false);
 sheet.props.footer.props.onPress();tree=a.render();assert.equal(nodes(tree).some(n=>n.type==='AddCardSheet'),false);
 const reopened=a.open();nodes(reopened).find(n=>n.props?.accessibilityLabel==='Policy').props.onPress();
 nodes(a.render()).find(n=>n.type==='AddCardSheet').props.onClose();assert.equal(nodes(a.render()).some(n=>n.type==='AddCardSheet'),false);
});

test('Login is Coming Soon only; Back to Home and sheet dismissal close without authentication or wallet commands',()=>{
 const a=account(),menu=a.open();nodes(menu).find(n=>n.props?.accessibilityLabel==='Login').props.onPress();
 const sheet=nodes(a.render()).find(n=>n.type==='AddCardSheet');assert.equal(sheet.props.title,'Coming Soon');
 assert.deepEqual(texts(sheet),['Login and cloud backup are not available yet.']);
 assert.equal(sheet.props.footer.props.children.props.children,'Back to Home');
 assert.equal(nodes(sheet).some(n=>n.type==='TextInput'),false);
 sheet.props.onClose();assert.equal(nodes(a.render()).some(n=>n.type==='AddCardSheet'),false);assert.equal(a.added()+a.decorated(),0);
});

test('Disabled Account cannot open; popup stays within safe top/right/bottom bounds',()=>{
 const a=account({disabled:true});a.open();assert.equal(nodes(a.render()).some(n=>n.type==='Modal'),false);
 for(const width of [280,320,390,600]){
  const h=harness('src/components/bemem/HomeAccountMenu.tsx','HomeAccountMenu',{}, {width,height:480,fontScale:2});
  const props={disabled:false,onAddCard(){},onDecorate(){}};let tree=h.render(props);
  nodes(tree).find(n=>n.props?.accessibilityLabel==='Account').props.onPress();tree=h.render(props);
  const style=nodes(tree).find(n=>n.props?.accessibilityViewIsModal).props.style[1];
  assert.ok(style.left>=12&&style.left+style.width<=width-12);assert.ok(style.top>=32);assert.ok(style.top+style.maxHeight<=480-24-12);
 }
 const h=harness('src/components/bemem/HomeAccountMenu.tsx','HomeAccountMenu',{
  'react-native-safe-area-context':{useSafeAreaInsets:()=>({top:24,bottom:24,left:44,right:44})}
 },{width:390,height:480,fontScale:1});
 const props={disabled:false,onAddCard(){},onDecorate(){}};let tree=h.render(props);
 nodes(tree).find(n=>n.props?.accessibilityLabel==='Account').props.onPress();tree=h.render(props);
 const popup=nodes(tree).find(n=>n.props?.accessibilityViewIsModal).props.style[1];
 assert.ok(popup.left>=52);assert.ok(popup.left+popup.width<=390-52);
});

function home(source='v2',allowed=true){
 let enter=0,finish=0;const searchCalls=[],session={saved:{sentinel:'saved'},draft:{sentinel:'existing draft'}};
 const wallet={mode:'home',ready:true,saving:false,blocked:false,dirty:false,source,cards:[],savedCards:[],saved:{},draft:{},exitPrompt:false,
  snapshot:{state:{source,editsAllowed:allowed,saving:false},session},
  runtime:{getSnapshot(){return wallet.snapshot;},features:{}},
  enter(){enter++;wallet.mode='create';},finishDecorate(){finish++;wallet.mode='home';},getCard(){return null;},leave(){},discard(){},cancel(){},save(){throw Error('No Save during navigation');}};
 const extra={'@/hooks/use-wallet-canvas':{useWalletCanvas:()=>wallet},'@/constants/bemem-theme':{bemem:{}},'@/constants/lagoon-theme':{lagoon:{canvas:{}},lagoonFonts:{}},
  '@/lib/phase1-navigation':{primaryHeaderAction:mode=>mode==='create'?'open-pro':'enter-create',backAction:()=> 'system-back'},
  '@/lib/search-reflow':{searchReflow:(cards,layout,query,active)=>{searchCalls.push({query,active});return{cards,layout,active:false,matchCount:0,key:''};}}};
 const h=harness('src/app/index.tsx','default',extra),render=()=>h.render({});
 return{h,wallet,render,enter:()=>enter,finish:()=>finish,session,searchCalls};
}

test('Frameless Home Search retains existing query/open/close/reflow wiring without modifying saved layout',()=>{
 const h=home(),saved=h.wallet.saved;let tree=h.render();
 nodes(tree).find(n=>n.type==='HomeHeader').props.onSearch();tree=h.render();
 let field=nodes(tree).find(n=>n.type==='SearchField');assert.ok(field);field.props.onChange('Test');tree=h.render();
 assert.deepEqual(h.searchCalls.at(-1),{query:'Test',active:true});assert.equal(nodes(tree).find(n=>n.type==='SearchField').props.value,'Test');
 nodes(tree).find(n=>n.type==='HomeHeader').props.onSearch();tree=h.render();
 assert.equal(nodes(tree).some(n=>n.type==='SearchField'),false);assert.deepEqual(h.searchCalls.at(-1),{query:'',active:false});
 assert.equal(h.wallet.saved,saved);assert.equal(h.enter(),0);
});

test('Production Home mounts the canvas directly and a card tap opens the existing preview immediately',()=>{
 const h=home();let tree=h.render();const canvas=nodes(tree).find(n=>n.type==='WalletCanvas');assert.ok(canvas);
 assert.equal(nodes(tree).some(n=>n.type==='HomeCanvasPager'),false);
 assert.equal(nodes(tree).some(n=>Object.keys(n.props??{}).some(key=>/PanResponder|ShouldSetResponder/.test(key))),false);
 const card={id:'synthetic-tap',name:'Synthetic',orientation:'landscape',colors:['#ffffff','#eeeeee']};canvas.props.onOpen(card);
 tree=h.render();assert.equal(nodes(tree).find(n=>n.type==='CardPreview').props.card,card);assert.equal(h.enter(),0);assert.equal(h.finish(),0);
});

test('Home Account Add Card enters the existing Create mode without opening an Add form or saving',()=>{
 const h=home();nodes(h.render()).find(n=>n.type==='HomeHeader').props.onCreate();const tree=h.render();
 assert.equal(h.enter(),1);assert.equal(h.wallet.mode,'create');assert.equal(nodes(tree).some(n=>n.type==='AddCardEditor'||n.type==='DecorateMode'),false);
 assert.equal(nodes(tree).find(n=>n.type==='HomeHeader').props.editing,true);
});

test('Direct Home Decorate prepares the existing Create draft and mounts the existing editor; Back and Save return Home, with no Create shortcut',()=>{
 const h=home(),before=JSON.stringify(h.session);let tree=h.render();assert.equal(nodes(tree).some(n=>n.type==='DecorateMode'),false);
 nodes(tree).find(n=>n.type==='HomeHeader').props.onDecorate();tree=h.render();assert.equal(h.enter(),1);
 let editor=nodes(tree).find(n=>n.type==='DecorateMode');assert.ok(editor);assert.equal(editor.props.wallet,h.wallet);assert.equal(JSON.stringify(h.session),before);
 editor.props.onClose();tree=h.render();assert.equal(h.wallet.mode,'home');assert.equal(nodes(tree).some(n=>n.type==='DecorateMode'),false);
 nodes(tree).find(n=>n.type==='HomeHeader').props.onDecorate();tree=h.render();assert.equal(h.enter(),2);
 editor=nodes(tree).find(n=>n.type==='DecorateMode');assert.ok(editor);editor.props.onSaved();tree=h.render();
 assert.equal(h.finish(),2);assert.equal(h.wallet.mode,'home');assert.equal(nodes(tree).some(n=>n.type==='DecorateMode'),false);
});

test('Direct Decorate refuses v1, blocked or currently-saving runtime, with no draft initialization or editor mount',()=>{
 for(const [source,allowed,saving]of [['v1',true,false],['v2',false,false],['v2',true,true]]){
  const h=home(source,allowed);h.wallet.snapshot.state.saving=saving;
  nodes(h.render()).find(n=>n.type==='HomeHeader').props.onDecorate();assert.equal(h.enter(),0);assert.equal(h.h.alerts.length,1);
  assert.equal(nodes(h.render()).some(n=>n.type==='DecorateMode'),false);
 }
});


test('Create cannot invoke a second Decorate entry, even through its retained route callback',()=>{
 const h=home();let t=h.render();nodes(t).find(n=>n.type==='HomeHeader').props.onCreate();t=h.render();
 nodes(t).find(n=>n.type==='HomeHeader').props.onDecorate();assert.equal(nodes(h.render()).some(n=>n.type==='DecorateMode'),false);assert.equal(h.enter(),1);assert.equal(h.finish(),0);
});

test('Production Create header receives the existing dirty/busy Save handler while the bottom rail has no Save callback',()=>{
 const h=home();nodes(h.render()).find(n=>n.type==='HomeHeader').props.onCreate();let t=h.render(),header=nodes(t).find(n=>n.type==='HomeHeader');assert.equal(header.props.saveRequired,false);
 let saves=0;h.wallet.save=()=>{saves++;};h.wallet.dirty=true;t=h.render();header=nodes(t).find(n=>n.type==='HomeHeader');assert.equal(header.props.saveRequired,true);header.props.onSave();assert.equal(saves,1);
 const rail=nodes(t).find(n=>n.type==='CanvasActions');assert.equal(rail.props.onSave,undefined);
 h.wallet.saving=true;header=nodes(h.render()).find(n=>n.type==='HomeHeader');assert.equal(header.props.disabled,true);assert.equal(header.props.saving,true);
});

test('Measured Profile popup fits slot7 at Samsung representative widths and enlarged text',()=>{
 for(const width of [360,393,412]){
 const h=harness('src/components/bemem/HomeAccountMenu.tsx','HomeAccountMenu',{}, {width,height:800,fontScale:2});const props={disabled:false,compact:true,onAddCard(){},onDecorate(){}};let t=h.render(props);
 const ref=nodes(t).find(n=>n.props?.ref);const target=Math.min(48,width/8);ref.props.ref.current={measureInWindow:fn=>fn(width*6/8+(width/8-target)/2,25,target,48)};
 nodes(t).find(n=>n.props?.accessibilityLabel==='Account').props.onPress();t=h.render(props);const popup=nodes(t).find(n=>n.props?.accessibilityViewIsModal).props.style[1];
 assert.ok(popup.left>=12);assert.ok(popup.left+popup.width<=width-12);assert.ok(popup.top>=24);
 }
});
