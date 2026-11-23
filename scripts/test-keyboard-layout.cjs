// Shared native form presentation contract only; no device or Wallet IO.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const root=path.resolve(__dirname,'..');
function harness(){
 const slots=[],cache=new Map(),listeners=new Map();let cursor=0,effects=[],metric,scrolling;
 const react={useRef(value){const i=cursor++;return slots[i]??={current:value};},
  useState(value){const i=cursor++;if(!(i in slots))slots[i]=typeof value==='function'?value():value;return[slots[i],next=>{slots[i]=typeof next==='function'?next(slots[i]):next;}];},
  useCallback(fn,deps){const i=cursor++,old=slots[i];if(!old||deps.some((d,j)=>d!==old.deps[j]))slots[i]={fn,deps};return slots[i].fn;},
  useEffect(fn,deps){const i=cursor++,old=slots[i];if(!old||deps.some((d,j)=>d!==old.deps[j])){effects.push(()=>{old?.cleanup?.();slots[i]={deps,cleanup:fn()};});}}};
 const Keyboard={isVisible:()=>metric!==undefined,dismiss(){metric=undefined;},metrics:()=>metric,addListener(name,fn){if(!listeners.has(name))listeners.set(name,new Set());listeners.get(name).add(fn);return{remove:()=>listeners.get(name).delete(fn)};}};
 const native={Keyboard,View:'View',ScrollView:'ScrollView',Pressable:'Pressable',KeyboardAvoidingView:'KeyboardAvoidingView',Modal:'Modal',Platform:{OS:'android',Version:36},StyleSheet:{create:s=>s,absoluteFill:{position:'absolute'},hairlineWidth:1}};
 function load(file){file=path.resolve(root,file);if(!path.extname(file))file+=fs.existsSync(file+'.ts')?'.ts':'.tsx';if(cache.has(file))return cache.get(file).exports;const m={exports:{}};cache.set(file,m);
  const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  vm.runInThisContext(`(function(require,module,exports){${code}\n})`,{filename:file})(name=>{
   if(name==='react')return react;if(name==='react/jsx-runtime')return{jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})};
   if(name==='react-native')return native;if(name==='react-native-safe-area-context')return{SafeAreaView:'SafeAreaView'};
   if(name.endsWith('/ci-theme'))return require('./ci-theme-fixture.cjs');if(name.endsWith('/sheet-visual'))return require('./sheet-visual-fixture.cjs');
   if(['./GlassButton','./AddCardText','./AddCardIcon'].includes(name))return{[name.slice(2)]:name.slice(2)};
   assert.ok(name.startsWith('.'),'No native IO dependency '+name);return load(path.resolve(path.dirname(file),name));
  },m,m.exports);return m.exports;
 }
 return{load,render(fn,props){cursor=0;effects=[];const result=fn(props);effects.forEach(fn=>fn());return result;},
  keyboard(top){metric=top===null?undefined:{screenY:top};for(const fn of listeners.get(top===null?'keyboardDidHide':'keyboardDidShow')??[])fn({endCoordinates:{screenY:top}});},
  listeners,unmount(){for(const slot of slots)slot?.cleanup?.();}};
}
const nodes=(tree,out=[])=>{if(!tree||typeof tree!=='object')return out;if(Array.isArray(tree)){tree.forEach(n=>nodes(n,out));return out;}out.push(tree);nodes(tree.props?.children,out);return out;};

for (const title of ['Add Card','Edit Card']) test(`${title} uses one safe-area Native Modal with the same KAV/scroll foundation`,()=>{
 const h=harness(),Sheet=h.load('src/components/bemem/AddCardSheet.tsx').AddCardSheet;
 const tree=h.render(Sheet,{title,modalOnly:true,children:'form',footer:'actions',onClose(){}}),ns=nodes(tree);
 assert.equal(tree.type,'Modal');assert.equal(ns.filter(n=>n.type==='Modal').length,1);
 assert.equal(ns.filter(n=>n.type==='SafeAreaView').length,1);
 assert.equal(ns.find(n=>n.type==='KeyboardAvoidingView').props.behavior,'height');
 const scroll=ns.find(n=>n.type==='ScrollView');assert.equal(ns.filter(n=>n.type==='ScrollView').length,1);
 assert.equal(scroll.props.keyboardShouldPersistTaps,'handled');assert.equal(scroll.props.keyboardDismissMode,'on-drag');
 assert.equal(scroll.props.onContentSizeChange,undefined);assert.equal(scroll.props.onScroll,undefined);
 assert.equal(ns.some(n=>n.props?.testID==='add-card-scroll-viewport'),false);
 assert.equal(tree.props.statusBarTranslucent,true);assert.equal(tree.props.navigationBarTranslucent,true);
 assert.equal(h.listeners.size,0);assert.equal(ns.some(n=>n.type==='ContextualFooter'),false);
});
test('Native Modal Back dismisses keyboard first, then requests safe abandonment; confirmation Back retains the form',()=>{
 const h=harness(),Sheet=h.load('src/components/bemem/AddCardSheet.tsx').AddCardSheet;let closed=0,kept=0;
 const props={modalOnly:true,children:'form',footer:'actions',onClose(){closed++;}};
 let tree=h.render(Sheet,props);h.keyboard(400);tree.props.onRequestClose();assert.equal(closed,0);
 tree.props.onRequestClose();assert.equal(closed,1);
 tree=h.render(Sheet,{...props,confirmation:{content:'confirm',onRequestClose(){kept++;}}});
 h.keyboard(400);tree.props.onRequestClose();assert.equal(kept,0);tree.props.onRequestClose();assert.equal(kept,1);assert.equal(closed,1);
});
test('Busy Modal Back may dismiss keyboard but cannot close the form or create duplicate prompts',()=>{
 const h=harness(),Sheet=h.load('src/components/bemem/AddCardSheet.tsx').AddCardSheet;
 const tree=h.render(Sheet,{modalOnly:true,closeDisabled:true,children:'form',footer:'actions',onClose(){assert.fail('Busy form cannot close');}});
 h.keyboard(400);tree.props.onRequestClose();tree.props.onRequestClose();tree.props.onRequestClose();
});
