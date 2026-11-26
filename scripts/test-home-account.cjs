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
 Object.assign(native,{Platform:{OS:'android'},StyleSheet:{create:s=>s,absoluteFill:{position:'absolute',top:0,right:0,bottom:0,left:0},hairlineWidth:1},useWindowDimensions:()=>dimensions,
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
function home(source='v2',allowed=true){
 let enter=0,finish=0;const searchCalls=[],session={saved:{sentinel:'saved'},draft:{sentinel:'existing draft'}};
 const wallet={mode:'home',ready:true,saving:false,blocked:false,dirty:false,source,cards:[],savedCards:[],saved:{},draft:{},exitPrompt:false,
  snapshot:{state:{source,editsAllowed:allowed,saving:false},session},
  runtime:{getSnapshot(){return wallet.snapshot;},features:{}},
  enter(){enter++;wallet.mode='create';},finishDecorate(){finish++;wallet.mode='home';},getCard(){return null;},leave(){},discard(){},cancel(){},save(){throw Error('No Save during navigation');}};
 const extra={'@/hooks/use-inline-keyboard':{useInlineKeyboard:()=>({ref:{current:null},bottomInset:0,keyboard:{visible:false,top:null,revision:0},isVisible:()=>false,onLayout(){}})},'@/hooks/use-wallet-canvas':{useWalletCanvas:()=>wallet},'@/constants/bemem-theme':{bemem:{}},'@/constants/lagoon-theme':{lagoon:{canvas:{}},lagoonFonts:{}},
  '@/lib/phase1-navigation':{primaryHeaderAction:mode=>mode==='create'?'open-pro':'enter-create',backAction:()=> 'system-back'},
  '@/lib/search-reflow':{searchReflow:(cards,layout,query,active)=>{searchCalls.push({query,active});return{cards,layout,active:false,matchCount:0,key:''};}}};
 const h=harness('src/app/index.tsx','default',extra),render=()=>h.render({});
 return{h,wallet,render,enter:()=>enter,finish:()=>finish,session,searchCalls};
}

test('Last-card removal retains an explicit lazy Keeps recovery entry; normal Home and Arrange do not show it',()=>{
 const h=home();h.session.saved.cards=[{id:'saved-card',kind:'membership'}];
 let tree=h.render();assert.ok(!nodes(tree).some(n=>n.props?.accessibilityLabel==='My Keeps recovery'));
 h.session.saved.cards=[];tree=h.render();const entry=nodes(tree).find(n=>n.props?.accessibilityLabel==='My Keeps recovery');assert.ok(entry);assert.ok(!nodes(tree).some(n=>n.type==='KeepsFeature'));
 const saved=JSON.stringify(h.session);entry.props.onPress();tree=h.render();const sheet=nodes(tree).find(n=>n.type==='KeepsFeature');assert.ok(sheet);assert.equal(sheet.props.card,undefined);assert.equal(nodes(tree).find(n=>n.type==='ContextualFooter').props.disabled,true);sheet.props.onClose();assert.ok(!nodes(h.render()).some(n=>n.type==='KeepsFeature'));assert.equal(JSON.stringify(h.session),saved);
 h.wallet.mode='create';assert.ok(!nodes(h.render()).some(n=>n.props?.accessibilityLabel==='My Keeps recovery'));
});

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
 const h=home();nodes(h.render()).find(n=>n.type==='ContextualFooter').props.onCreate();const tree=h.render();
 assert.equal(h.enter(),1);assert.equal(h.wallet.mode,'create');assert.equal(nodes(tree).some(n=>n.type==='AddCardEditor'||n.type==='DecorateMode'),false);
 assert.equal(nodes(tree).find(n=>n.type==='HomeHeader').props.editing,true);
});

test('Direct Home Decorate prepares the existing Create draft and mounts the existing editor; Back and Save return Home, with no Create shortcut',()=>{
 const h=home(),before=JSON.stringify(h.session);let tree=h.render();assert.equal(nodes(tree).some(n=>n.type==='DecorateMode'),false);
 nodes(tree).find(n=>n.type==='ContextualFooter').props.onDecorate();tree=h.render();assert.equal(h.enter(),1);
 let editor=nodes(tree).find(n=>n.type==='DecorateMode');assert.ok(editor);assert.equal(editor.props.wallet,h.wallet);assert.equal(JSON.stringify(h.session),before);
 editor.props.onClose();tree=h.render();assert.equal(h.wallet.mode,'home');assert.equal(nodes(tree).some(n=>n.type==='DecorateMode'),false);
 nodes(tree).find(n=>n.type==='ContextualFooter').props.onDecorate();tree=h.render();assert.equal(h.enter(),2);
 editor=nodes(tree).find(n=>n.type==='DecorateMode');assert.ok(editor);editor.props.onSaved();tree=h.render();
 assert.equal(h.finish(),2);assert.equal(h.wallet.mode,'home');assert.equal(nodes(tree).some(n=>n.type==='DecorateMode'),false);
});

test('Direct Decorate refuses v1, blocked or currently-saving runtime, with no draft initialization or editor mount',()=>{
 for(const [source,allowed,saving]of [['v1',true,false],['v2',false,false],['v2',true,true]]){
  const h=home(source,allowed);h.wallet.snapshot.state.saving=saving;
  nodes(h.render()).find(n=>n.type==='ContextualFooter').props.onDecorate();assert.equal(h.enter(),0);assert.equal(h.h.alerts.length,saving?0:1);
  assert.equal(nodes(h.render()).some(n=>n.type==='DecorateMode'),false);
 }
});


test('Create cannot invoke a second Decorate entry, even through its retained route callback',()=>{
 const h=home();let t=h.render();nodes(t).find(n=>n.type==='ContextualFooter').props.onCreate();t=h.render();
 nodes(t).find(n=>n.type==='ContextualFooter').props.onDecorate();assert.equal(nodes(h.render()).some(n=>n.type==='DecorateMode'),false);assert.equal(h.enter(),1);assert.equal(h.finish(),0);
});

test('Production Create Header receives existing Save; Footer stays navigation only',()=>{
 const h=home();nodes(h.render()).find(n=>n.type==='ContextualFooter').props.onCreate();let t=h.render();assert.equal(typeof nodes(t).find(n=>n.type==='HomeHeader').props.onSave,'function');
 let saves=0;h.wallet.save=()=>{saves++;};h.wallet.dirty=true;t=h.render();let footer=nodes(t).find(n=>n.type==='ContextualFooter');assert.equal(footer.props.mode,'Create');nodes(t).find(n=>n.type==='HomeHeader').props.onSave();assert.equal(saves,1);
 h.wallet.saving=true;footer=nodes(h.render()).find(n=>n.type==='ContextualFooter');assert.equal(footer.props.disabled,true);assert.equal(footer.props.saving,true);
});
