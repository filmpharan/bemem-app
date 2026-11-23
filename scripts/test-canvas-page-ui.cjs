const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const root=path.resolve(__dirname,'..');
function environment(runtime,dimensions={width:320,height:740,fontScale:2}){const cache=new Map(),slots=[],alerts=[];let cursor=0,effects=[];
 const popover={request:null,open(request){this.request=request;request.expanded(true);},close(owner){if(this.request?.owner===owner){this.request.expanded(false);this.request=null;}},choose(page){const request=this.request;if(!request?.valid())return;this.close(request.owner);request.select(page);}};
 const react={useState(v){const i=cursor++;if(!(i in slots))slots[i]=typeof v==='function'?v():v;return[slots[i],v=>{slots[i]=typeof v==='function'?v(slots[i]):v;}];},useRef(v){const i=cursor++;return slots[i]??={current:v};},useMemo:fn=>fn(),useCallback:fn=>fn,useEffect(fn,deps){const i=cursor++,old=slots[i];if(!old||!deps||deps.some((v,j)=>v!==old[j])){slots[i]=deps;effects.push(fn);}},memo:fn=>fn};
 function load(file){file=path.resolve(root,file);if(!path.extname(file))file+=fs.existsSync(file+'.ts')?'.ts':'.tsx';if(cache.has(file))return cache.get(file).exports;const m={exports:{}};cache.set(file,m);const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 vm.runInThisContext(`(function(require,module,exports){${code}\n})`,{filename:file})(n=>{
  if(n==='react')return react;if(n==='react/jsx-runtime')return{jsx:(type,props,key)=>({type,props,key}),jsxs:(type,props,key)=>({type,props,key})};
  if(n==='react-native')return{...Object.fromEntries(['View','Text','Modal','Pressable','ScrollView','ActivityIndicator'].map(n=>[n,n])),Alert:{alert:(...a)=>alerts.push(a)},StyleSheet:{create:v=>v,absoluteFill:{}},useWindowDimensions:()=>dimensions,PanResponder:{create:v=>({panHandlers:v})}};
  if(n==='react-native-safe-area-context')return{SafeAreaView:'SafeAreaView'};
  if(n==='expo-font')return{useFonts:()=>[true]};if(n.endsWith('.ttf'))return 1;
  if(n==='./CanvasPagePopoverHost')return{useCanvasPagePopover:()=>popover,CanvasPagePopoverHost:'CanvasPagePopoverHost'};
  if(n==='./EightSlotHeader'){const actual=load(path.resolve(path.dirname(file),n));return{...actual,EightSlotHeader:'EightSlotHeader'};}
  if(n.endsWith('WalletRuntimeProvider'))return{useWalletRuntime:()=>({runtime,snapshot:runtime.getSnapshot()})};
 if(n.endsWith('/sheet-visual'))return require('./sheet-visual-fixture.cjs');
 if(n.endsWith('/ci-theme'))return require('./ci-theme-fixture.cjs');
  if(n.endsWith('lagoon-theme'))return{lagoon:require('../design-system/bemem-vivid-lagoon/TOKENS.json').palettes['vivid-lagoon'].colors,lagoonFonts:{latin:'Manrope'}};
  if(n.endsWith('bemem-theme'))return{bemem:{background:'#eef1f4',foreground:'#263943',muted:'#53636c',primary:'#405764',error:'#b42318'}};
  if(['./NavigationHeader','./ContextualFooter','./ConfirmationDialog','./HomeAccountMenu','./GlassButton','./AddCardIcon','./WalletCanvas','./CanvasPageSelector','./LockedCanvas','./DecorationImage','./BememIcon','./MembershipCard','./WalletEmptyState','./DecorateIcon'].includes(n)){const name=n.slice(2);return{[name]:name};}
  assert.ok(n.startsWith('.'),'No native storage/network '+n);return load(path.resolve(path.dirname(file),n));
 },m,m.exports);return m.exports;}
 return{load,alerts,popover,render(fn,props){cursor=0;effects=[];const tree=fn(props);effects.forEach(fn=>fn());return tree;}};
}
const nodes=(t,out=[])=>{if(!t||typeof t!=='object')return out;if(Array.isArray(t)){t.forEach(n=>nodes(n,out));return out;}out.push(t);nodes(t.props?.children,out);if(t.props?.slots)nodes(Object.values(t.props.slots),out);return out;};
const find=(t,name)=>nodes(t).find(n=>n.props?.accessibilityLabel===name);
const setup=environment(),{createMultiCanvasFixture}=setup.load('src/lib/dev-multicanvas.ts'),tick=()=>new Promise(r=>setImmediate(r));
async function fixture(status='active'){const f=createMultiCanvasFixture();await f.owner.commands.initialize();f.status(status);return f;}

test('All five Home/Create pages are real destinations with isolated projections and no navigation writes or Login',async()=>{
 const f=await fixture('free'),e=environment(f.owner),Hook=e.load('src/hooks/use-wallet-canvas.ts').useWalletCanvas,before=JSON.stringify([...f.files]);let h=e.render(Hook);
 for(const page of [1,2,3,4,5]){h.selectPage(page);h=e.render(Hook);assert.equal(h.page,page);assert.equal(h.pageEditable,true);assert.deepEqual(h.savedCards.map(c=>c.id),[`fixture-card-${page}`]);assert.equal(h.enter(),true);h=e.render(Hook);assert.equal(h.mode,'create');h.leave();h=e.render(Hook);assert.equal(h.mode,'home');assert.equal(h.page,page);}
 assert.equal(e.alerts.length,0);assert.equal(JSON.stringify([...f.files]),before);
});

for(const action of ['Stay','Discard','Save','Failed Save'])test(`Free Create1 -> Canvas5 ${action} retains existing draft/readback protection`,async()=>{
 const f=await fixture('free'),e=environment(f.owner),Hook=e.load('src/hooks/use-wallet-canvas.ts').useWalletCanvas;let h=e.render(Hook);h.enter();h=e.render(Hook);h.move('fixture-card-1',{col:6,row:0});h=e.render(Hook);
 const before=JSON.stringify(f.owner.getSnapshot().session.saved);if(action==='Failed Save')f.failWrites(true);h.selectPage(5);h=e.render(Hook);assert.equal(h.page,1);
 await h.pageConfirmation.actions.find(a=>a.label===(action==='Failed Save'?'Save':action)).onPress();await tick();await tick();h=e.render(Hook);
 assert.equal(h.page,action==='Save'||action==='Discard'?5:1);assert.equal(h.mode,'create');assert.equal(h.dirty,action==='Stay'||action==='Failed Save');
 if(action!=='Save')assert.equal(JSON.stringify(f.owner.getSnapshot().session.saved),before);
});





test('Create waits for successful save/readback before entering locked2',async()=>{
 const f=await fixture('free'),e=environment(f.owner),Hook=e.load('src/hooks/use-wallet-canvas.ts').useWalletCanvas;
 let h=e.render(Hook);h.enter();h=e.render(Hook);h.move('fixture-card-1',{col:6,row:0});h=e.render(Hook);
 const save=f.owner.commands.save;let release;const gate=new Promise(r=>release=r);
 f.owner.commands.save=async(...args)=>{await gate;return save(...args);};
 h.selectPage(2);h=e.render(Hook);const work=h.pageConfirmation.actions.find(a=>a.label==='Save').onPress();
 assert.equal(e.render(Hook).page,1);assert.equal(f.events.length,0);release();await work;
 assert.equal(e.render(Hook).page,2);assert.deepEqual(f.owner.getSnapshot().session.saved.canvas.layout['fixture-card-1'],{col:6,row:0});
});

test('Decorate locked2 Discard hands an earlier Create draft back to the existing page confirmation',async()=>{
 const f=await fixture('free'),hooks=environment(f.owner),Hook=hooks.load('src/hooks/use-wallet-canvas.ts').useWalletCanvas;
 let h=hooks.render(Hook);h.enter();h=hooks.render(Hook);h.move('fixture-card-1',{col:6,row:0});h=hooks.render(Hook);
 const draft=JSON.stringify(f.owner.getSnapshot().session.draft),e=environment(f.owner),Mode=e.load('src/components/bemem/DecorateMode.tsx').EditableDecorateMode;
 const props=()=>({wallet:h,onClose(){assert.fail();},onSaved(){assert.fail();},onNavigate:d=>h.finishDecorate(d)});
 let t=e.render(Mode,props());nodes(t).find(n=>typeof n.type==='function').props.onSelect('pet-paw');t=e.render(Mode,props());nodes(t).find(n=>n.type==='WalletCanvas').props.onCanvasPress({col:8,row:0});t=e.render(Mode,props());
 nodes(t).find(n=>n.type==='ContextualFooter').props.onPage(2);t=e.render(Mode,props());nodes(t).find(n=>n.type==='ConfirmationDialog').props.request.actions.find(a=>a.label==='Discard').onPress();await tick();
 h=hooks.render(Hook);assert.equal(h.page,1);assert.equal(h.mode,'create');assert.equal(JSON.stringify(f.owner.getSnapshot().session.draft),draft);assert.ok(h.pageConfirmation);
 h.pageConfirmation.actions.find(a=>a.label==='Stay').onPress();assert.equal(hooks.render(Hook).page,1);assert.equal(f.events.length,0);
});

test('Locked content has exact copy and reachable48dp actions with content-only scrolling for small/large-text screens',()=>{
 for(const dimensions of [{width:280,height:320,fontScale:2},{width:412,height:844,fontScale:1}]){
  const e=environment(undefined,dimensions),Component=e.load('src/components/bemem/CanvasLockedState.tsx').CanvasLockedState;let login=0,back=0;
  const t=e.render(Component,{onLogin:()=>login++,onBack:()=>back++}),all=nodes(t);
  assert.equal(t.type,'ScrollView');assert.equal(t.props.style.flex,1);assert.equal(t.props.contentContainerStyle.flexGrow,1);
  assert.equal(t.props.contentContainerStyle.justifyContent,'center');assert.equal(all.some(n=>/Modal|Header|Footer|WalletCanvas/.test(String(n.type))),false);
  assert.deepEqual(all.filter(n=>n.type==='Text').map(n=>n.props.children),['Canvas 2','Login to unlock more space for your cards.','Coming soon','Login (Coming Soon)','Back to Canvas 1']);
  for(const n of all.filter(n=>n.type==='GlassButton')){assert.ok(n.props.style.minHeight>=48);n.props.onPress();}
  assert.equal(login,1);assert.equal(back,1);assert.equal(all.filter(n=>n.type==='Text').some(n=>n.props.numberOfLines),false);
 }
});


test('Numeric selector submits eligible other pages to its same-window host and consumes navigation once',()=>{
 const e=environment(),Selector=e.load('src/components/bemem/CanvasPageSelector.tsx').CanvasPageSelector,{canvasAccess}=e.load('src/lib/canvas-pages.ts');let count=0;
 const props={page:2,destinations:canvasAccess({cards:[],canvas:{pages:{version:1,assignments:{},selectedCount:3}}},'active'),onSelect:p=>{assert.equal(p,3);count++;}};
 let t=e.render(Selector,props);t.props.ref.current={measureInWindow(){}};find(t,'Canvas 2. Choose canvas').props.onPress();t=e.render(Selector,props);
 assert.equal(find(t,'Canvas 2. Choose canvas').props.accessibilityState.expanded,true);assert.deepEqual(e.popover.request.choices.map(c=>c.page),[1,3,4,5]);
 e.popover.choose(3);e.popover.choose(3);assert.equal(count,1);assert.equal(find(e.render(Selector,props),'Canvas 2. Choose canvas').props.accessibilityState.expanded,false);
});


test('Locked surface mounts no card data and Unlock truthfully opens Membership Coming Soon with Back/Close',()=>{
 const e=environment(),Locked=e.load('src/components/bemem/LockedCanvas.tsx').LockedCanvas;let t=e.render(Locked,{privateCards:['never show this']});
 assert.equal(nodes(t).some(n=>['WalletCanvas','MembershipCard','Image'].includes(n.type)),false);assert.doesNotMatch(JSON.stringify(t),/never show this/);
 find(t,'Unlock canvas').props.onPress();t=e.render(Locked);assert.equal(nodes(t).find(n=>n.type==='Modal').props.visible,true);assert.ok(nodes(t).some(n=>n.props?.children==='Coming Soon'));
 nodes(t).find(n=>n.type==='Modal').props.onRequestClose();assert.equal(nodes(e.render(Locked)).find(n=>n.type==='Modal').props.visible,false);
});
test('Future Profile controls never grant entitlement; expired/free callbacks remain blocked',()=>{
 for(const status of ['free','expired','active']){const e=environment(),Setting=e.load('src/components/bemem/CanvasPageCountSetting.tsx').CanvasPageCountSetting,selected=[];
  const t=e.render(Setting,{count:3,status,onChange:n=>selected.push(n)}),buttons=nodes(t).filter(n=>n.type==='GlassButton');assert.equal(buttons.length,4);
  assert.equal(buttons[1].props.accessibilityState.selected,true);assert.equal(buttons[0].props.disabled,status!=='active');buttons[0].props.onPress();assert.deepEqual(selected,status==='active'?[2]:[]);
 }
});
test('Hook page switch uses Stay/Discard/Save; Stay retains draft, confirmed save stays in Create on destination',async()=>{
 const f=await fixture(),e=environment(f.owner),Hook=e.load('src/hooks/use-wallet-canvas.ts').useWalletCanvas;let h=e.render(Hook);h.enter();h=e.render(Hook);h.move('fixture-card-1',{col:6,row:0});h=e.render(Hook);
 const before=JSON.stringify(f.owner.getSnapshot().session.draft);h.selectPage(2);assert.equal(f.owner.pages.current(),1);assert.equal(JSON.stringify(f.owner.getSnapshot().session.draft),before);
 const buttons=e.render(Hook).pageConfirmation.actions;assert.deepEqual(buttons.map(b=>b.label),['Save','Discard','Stay']);buttons[0].onPress();await tick();await tick();h=e.render(Hook);
 assert.equal(h.page,2);assert.equal(h.mode,'create');assert.equal(f.owner.getSnapshot().state.dirty,false);
});
test('Hook explicit discard only drops current draft; failed switch Save never navigates or drops draft',async()=>{
 for(const action of ['Discard','Save']){const f=await fixture(),e=environment(f.owner),Hook=e.load('src/hooks/use-wallet-canvas.ts').useWalletCanvas;let h=e.render(Hook);h.enter();h=e.render(Hook);h.move('fixture-card-1',{col:6,row:0});h=e.render(Hook);const before=JSON.stringify(f.owner.getSnapshot().session.saved);
  if(action==='Save')f.failWrites(true);h.selectPage(2);e.render(Hook).pageConfirmation.actions.find(b=>b.label===action).onPress();await tick();await tick();h=e.render(Hook);
  assert.equal(h.page,action==='Discard'?2:1);assert.equal(f.owner.getSnapshot().state.dirty,action==='Save');assert.equal(JSON.stringify(f.owner.getSnapshot().session.saved),before);
 }
});
test('After editing Canvas 2 Save stays Create then Back returns Home on selected page 2 and a fresh owner starts at 1',async()=>{
 const f=await fixture();f.owner.pages.select(2);const e=environment(f.owner),Hook=e.load('src/hooks/use-wallet-canvas.ts').useWalletCanvas;let h=e.render(Hook);h.enter();h=e.render(Hook);h.move('fixture-card-2',{col:6,row:0});h=e.render(Hook);await h.save();h=e.render(Hook);assert.equal(h.mode,'create');h.leave();h=e.render(Hook);assert.equal(h.mode,'home');assert.equal(h.page,2);assert.equal(f.owner.pages.current(),2);assert.deepEqual(h.savedCards.map(c=>c.id),['fixture-card-2']);
 const {createWalletOwnerScope}=e.load('src/lib/wallet-runtime-owner.ts'),{createWalletStorageAdapters}=e.load('src/lib/wallet-storage-adapters.ts');const next=createWalletOwnerScope(()=>createWalletStorageAdapters({v1:{load:async()=>null,save:async()=>assert.fail()},v2:f.repository,demoCards:[]}),undefined,()=> 'active').getOwner();await next.commands.initialize();assert.equal(next.pages.current(),1);assert.deepEqual(next.getSnapshot().session.saved.canvas.layout['fixture-card-2'],{col:6,row:0});
});



test('Decorate selector dirty confirmation preserves Stay and uses existing save/readback before switching',async()=>{
 const f=await fixture(),e=environment(f.owner),Mode=e.load('src/components/bemem/DecorateMode.tsx').EditableDecorateMode;
 const props=()=>({wallet:{runtime:f.owner,snapshot:f.owner.getSnapshot(),page:1,pageEditable:true,pageAccess:f.owner.pages.access(),selectPage:p=>f.owner.pages.select(p)},onClose(){},onSaved(){assert.fail('Page switch is not Home navigation');}});
 let t=e.render(Mode,props());nodes(t).find(n=>typeof n.type==='function').props.onSelect('pet-paw');t=e.render(Mode,props());nodes(t).find(n=>n.type==='WalletCanvas').props.onCanvasPress({col:8,row:0});t=e.render(Mode,props());
 nodes(t).find(n=>n.type==='ContextualFooter').props.onPage(2);assert.equal(f.owner.pages.current(),1);t=e.render(Mode,props());assert.equal(nodes(t).find(n=>n.type==='ConfirmationDialog').props.request.actions[2].label,'Stay');assert.equal(f.events.length,0);
 t=e.render(Mode,props());nodes(t).find(n=>n.type==='ConfirmationDialog').props.request.actions.find(b=>b.label==='Save').onPress();await tick();await tick();assert.equal(f.owner.pages.current(),2);assert.equal(f.owner.getSnapshot().session.saved.canvas.decorations.items.length,1);
});

test('WalletCanvas restores its own scroll offset after native content mounts and reports subsequent scrolling',()=>{
 const e=environment(),Canvas=e.load('src/components/bemem/WalletCanvas.tsx').WalletCanvas,offsets=[],geometry=[],props={cards:[],allCards:[],layout:{},editing:false,disabled:false,initialScrollY:240,onScrollY:y=>offsets.push(y),onGeometry:g=>geometry.push(g),onMove(){},onOpen(){},onDragging(){}};
 let t=e.render(Canvas,props);assert.equal(t.props.style.marginTop,0);t.props.onLayout({nativeEvent:{layout:{width:336,height:412}}});t=e.render(Canvas,props);const scroll=nodes(t).find(n=>n.type==='ScrollView'),restored=[];
 scroll.props.ref.current={scrollTo:args=>restored.push(args.y)};scroll.props.onContentSizeChange();assert.deepEqual(restored,[240]);t.props.ref.current={measureInWindow:cb=>cb(16,72,336,412)};scroll.props.onScroll({nativeEvent:{contentOffset:{y:480}}});assert.deepEqual(geometry.at(-1),{pageX:16,pageY:72,width:336,height:412,unit:28,scrollY:480});assert.deepEqual(offsets,[480]);scroll.props.onContentSizeChange();assert.equal(restored.at(-1),480);
});

test('Page selector uses the shared28dp square outline with48dp accessible touch target',()=>{
 const e=environment(),Selector=e.load('src/components/bemem/CanvasPageSelector.tsx').CanvasPageSelector,Glyph=e.load('src/components/bemem/CanvasPageGlyph.tsx').CanvasPageGlyph;
 const t=e.render(Selector,{page:1,context:'home',destinations:[{page:1,visible:true,editable:true,preview:false},{page:2,visible:true,editable:false,preview:true}],onSelect(){}}),button=find(t,'Canvas 1. Choose canvas');
 assert.equal(button.props.style.width,48);assert.equal(button.props.style.height,48);const glyph=e.render(Glyph,{page:1});
 assert.equal(glyph.props.style.width,28);assert.equal(glyph.props.style.height,28);assert.equal(glyph.props.style.borderRadius,5);assert.equal(glyph.props.style.borderColor,'#00786F');assert.equal(glyph.props.children.props.maxFontSizeMultiplier,1.3);
 assert.equal(nodes(t).some(n=>n.type==='GlassButton'),false);
});

test('Decorate page-switch Discard preserves pre-existing Create draft; clean entry can navigate after discard',async()=>{
 for(const priorDraft of [true,false]){
  const f=await fixture('active');if(priorDraft){const s=f.owner.getSnapshot(),doc=JSON.parse(JSON.stringify(s.session.saved));doc.canvas.layout['fixture-card-1']={col:6,row:0};assert.equal(f.owner.commands.updateDraft(s.state.generation,doc).ok,true);}
  const entry=JSON.stringify(f.owner.getSnapshot().session.draft),saved=JSON.stringify(f.owner.getSnapshot().session.saved),e=environment(f.owner),Mode=e.load('src/components/bemem/DecorateMode.tsx').EditableDecorateMode;let closed=0;
  const props=()=>({wallet:{runtime:f.owner,snapshot:f.owner.getSnapshot(),page:1,pageAccess:f.owner.pages.access(),selectPage:p=>f.owner.pages.select(p)},onClose(){closed++;},onSaved(){assert.fail();}});
  let t=e.render(Mode,props());nodes(t).find(n=>typeof n.type==='function').props.onSelect('pet-paw');t=e.render(Mode,props());nodes(t).find(n=>n.type==='WalletCanvas').props.onCanvasPress({col:8,row:0});t=e.render(Mode,props());
  nodes(t).find(n=>n.type==='ContextualFooter').props.onPage(2);t=e.render(Mode,props());const dialog=nodes(t).find(n=>n.type==='ConfirmationDialog').props.request;assert.equal(dialog.actions[2].label,'Stay');assert.equal(f.owner.pages.current(),1);
  dialog.actions.find(b=>b.label==='Discard').onPress();await tick();
  assert.equal(JSON.stringify(f.owner.getSnapshot().session.draft),entry);assert.equal(JSON.stringify(f.owner.getSnapshot().session.saved),saved);
  assert.equal(f.owner.pages.current(),priorDraft?1:2);assert.equal(closed,priorDraft?1:0);assert.equal(f.events.length,0);
 }
});

test('Decorate switch Save failure retains both earlier Create work and additional decorations',async()=>{
 const f=await fixture(),s=f.owner.getSnapshot(),doc=JSON.parse(JSON.stringify(s.session.saved));doc.canvas.layout['fixture-card-1']={col:6,row:0};f.owner.commands.updateDraft(s.state.generation,doc);
 const e=environment(f.owner),Mode=e.load('src/components/bemem/DecorateMode.tsx').EditableDecorateMode,props=()=>({wallet:{runtime:f.owner,snapshot:f.owner.getSnapshot(),page:1,pageAccess:f.owner.pages.access(),selectPage:p=>f.owner.pages.select(p)},onClose(){assert.fail();},onSaved(){assert.fail();}});
 let t=e.render(Mode,props());nodes(t).find(n=>typeof n.type==='function').props.onSelect('pet-paw');t=e.render(Mode,props());nodes(t).find(n=>n.type==='WalletCanvas').props.onCanvasPress({col:8,row:0});t=e.render(Mode,props());
 const before=JSON.stringify(f.owner.getSnapshot().session.draft);f.failWrites(true);nodes(t).find(n=>n.type==='ContextualFooter').props.onPage(2);t=e.render(Mode,props());nodes(t).find(n=>n.type==='ConfirmationDialog').props.request.actions.find(b=>b.label==='Save').onPress();await tick();await tick();
 assert.equal(f.owner.pages.current(),1);assert.equal(JSON.stringify(f.owner.getSnapshot().session.draft),before);assert.equal(f.owner.getSnapshot().state.dirty,true);
});

test('Selector retains floating-choice semantics and28/48 geometry without a local native Modal or painted panel',()=>{
 const e=environment(),Selector=e.load('src/components/bemem/CanvasPageSelector.tsx').CanvasPageSelector;const props={page:1,context:'home',destinations:[{page:1,visible:true,editable:true,preview:false},{page:2,visible:true,editable:false,preview:true}],onSelect(){}};
 let t=e.render(Selector,props);const b=find(t,'Canvas 1. Choose canvas');assert.equal(b.props.style.width,48);assert.equal(b.props.children.props.children.props.page,1);assert.equal(nodes(t).some(n=>n.type==='Modal'),false);
 b.props.onPress();assert.equal(e.popover.request,null);t.props.ref.current={measureInWindow(){}};b.props.onPress();assert.deepEqual(e.popover.request.choices.map(c=>c.page),[2]);
});

test('Home numeric page context retains dirty page 2 draft and Create resumes it without resetting data',async()=>{
 const f=await fixture();f.owner.pages.select(2);const s=f.owner.getSnapshot(),draft=JSON.parse(JSON.stringify(s.session.saved));draft.canvas.layout['fixture-card-2']={col:6,row:0};
 assert.equal(f.owner.commands.updateDraft(s.state.generation,draft).ok,true);
 const before=JSON.stringify(f.owner.getSnapshot()),e=environment(f.owner),Hook=e.load('src/hooks/use-wallet-canvas.ts').useWalletCanvas;
 let h=e.render(Hook);assert.equal(h.mode,'home');assert.equal(h.page,2);assert.deepEqual(h.cards.map(c=>c.id),['fixture-card-2']);assert.equal(f.owner.pages.current(),2);
 h.enter();h=e.render(Hook);assert.equal(h.mode,'create');assert.equal(h.page,2);assert.deepEqual(h.draft['fixture-card-2'],{col:6,row:0});
 h.leave();h=e.render(Hook);assert.equal(h.exitPrompt,true);h.cancel();h=e.render(Hook);assert.equal(h.mode,'create');assert.equal(h.dirty,true);
 // Presentation-only return cannot silently reset or persist any draft.
 h.finishDecorate();h=e.render(Hook);assert.equal(h.page,2);assert.equal(h.mode,'home');assert.equal(JSON.stringify(f.owner.getSnapshot()),before);assert.equal(f.events.length,0);
});

test('Home card wrappers remain direct tap targets and the native vertical ScrollView remains enabled',()=>{
 const e=environment(),Canvas=e.load('src/components/bemem/WalletCanvas.tsx').WalletCanvas,opened=[],offsets=[];
 const card={id:'tap-member',name:'Synthetic',orientation:'landscape',kind:'membership',widthBlocks:6,heightBlocks:4,colors:['#ffffff','#eeeeee']};
 const props={cards:[card],allCards:[card],layout:{[card.id]:{col:0,row:0}},editing:false,disabled:false,onMove(){assert.fail('Home cannot drag');},onOpen:c=>opened.push(c),onDragging(){assert.fail();},onScrollY:y=>offsets.push(y)};
 let t=e.render(Canvas,props);t.props.onLayout({nativeEvent:{layout:{width:336,height:400}}});t=e.render(Canvas,props);
 const scroll=nodes(t).find(n=>n.type==='ScrollView');assert.equal(scroll.props.scrollEnabled,true);assert.equal(scroll.props.horizontal,undefined);assert.equal(scroll.props.disableScrollViewPanResponder,undefined);
 assert.equal(nodes(t).some(n=>Object.keys(n.props??{}).some(key=>/PanResponder|ShouldSetResponder/.test(key))),false);
 const target=nodes(t).find(n=>n.type==='Pressable');target.props.onPress();assert.equal(opened[0],card);
 scroll.props.onScroll({nativeEvent:{contentOffset:{y:160}}});assert.deepEqual(offsets,[160]);
});

test('Retired swipe and trace modules are deleted; source has no executable references and DEV entitlement utility remains',()=>{
 const retired=['HomeCanvasPager','HomeGestureDiagnostics','home-gesture-trace'];
 for(const file of ['src/components/bemem/HomeCanvasPager.tsx','src/components/bemem/HomeGestureDiagnostics.tsx','src/lib/home-gesture-trace.ts'])assert.equal(fs.existsSync(path.join(root,file)),false,file);
 function inspect(folder){for(const item of fs.readdirSync(folder,{withFileTypes:true})){const file=path.join(folder,item.name);if(item.isDirectory())inspect(file);else if(/\.[tj]sx?$/.test(item.name)){const source=fs.readFileSync(file,'utf8');for(const name of [...retired,'homeSwipeDirection','traceHome'])assert.equal(source.includes(name),false,file+' '+name);}}}
 inspect(path.join(root,'src'));
 const dev=fs.readFileSync(path.join(root,'src/app/dev-multicanvas.tsx'),'utf8');assert.match(dev,/if\(!__DEV__\)return <Redirect/);assert.match(dev,/createMultiCanvasFixture/);assert.match(dev,/\['free','active','expired'\]/);assert.match(dev,/CanvasPageCountSetting/);assert.match(dev,/CanvasPageSelector/);
});






test('Stale selector request cannot navigate after its page becomes disabled',()=>{
 const e=environment(),Selector=e.load('src/components/bemem/CanvasPageSelector.tsx').CanvasPageSelector;let calls=0;const props={page:1,context:'home',destinations:[{page:2,visible:true,editable:false,preview:true}],onSelect(){calls++;}};
 const t=e.render(Selector,props);t.props.ref.current={measureInWindow(){}};find(t,'Canvas 1. Choose canvas').props.onPress();e.render(Selector,{...props,disabled:true});e.popover.choose(2);assert.equal(calls,0);
});

test('Actual Decorate Modal Back dismisses its local page popup before exit or dirty confirmation',async()=>{
 const f=await fixture();
 const e2=environment(f.owner),Editor=e2.load('src/components/bemem/DecorateMode.tsx').EditableDecorateMode;f.owner.pages.select(1);
 let t=e2.render(Editor,{wallet:{runtime:f.owner,snapshot:f.owner.getSnapshot(),page:1,pageAccess:f.owner.pages.access(),selectPage:p=>f.owner.pages.select(p)},onClose(){},onSaved(){}});
 const editorHost=nodes(t).find(n=>n.type==='ContextualFooter');editorHost.props.ref.current={dismiss:()=>true};t.props.onRequestClose();assert.equal(e2.alerts.length,0);assert.equal(f.events.length,0);
});










test('A stale Home selector callback cannot open a forbidden page after entering Create',async()=>{
 const f=await fixture('free'),e=environment(f.owner),Hook=e.load('src/hooks/use-wallet-canvas.ts').useWalletCanvas;
 const home=e.render(Hook);home.enter();let h=e.render(Hook);home.selectPage(2);h=e.render(Hook);assert.equal(h.mode,'create');assert.equal(h.page,1);assert.equal(f.owner.pages.current(),1);assert.equal(f.events.length,0);
});






test('Decorate rejects direct page2 navigation for Free/Expired before opening any dirty confirmation',async()=>{
 for(const status of ['free','expired']){
 const f=await fixture(status),e=environment(f.owner),Editor=e.load('src/components/bemem/DecorateMode.tsx').EditableDecorateMode;let selected=0;
 const props=()=>({wallet:{runtime:f.owner,snapshot:f.owner.getSnapshot(),page:1,pageEditable:true,pageAccess:f.owner.pages.access(),selectPage(){selected++;}},onClose(){assert.fail();},onSaved(){assert.fail();}});
 let t=e.render(Editor,props());nodes(t).find(n=>typeof n.type==='function').props.onSelect('pet-paw');t=e.render(Editor,props());nodes(t).find(n=>n.type==='WalletCanvas').props.onCanvasPress({col:8,row:0});t=e.render(Editor,props());
 const before=JSON.stringify(f.owner.getSnapshot());nodes(t).find(n=>n.type==='ContextualFooter').props.onPage(2);
 assert.equal(selected,0);assert.equal(e.alerts.length,0);assert.equal(JSON.stringify(f.owner.getSnapshot()),before);assert.equal(f.events.length,0);
 }
});


test('Create Save after Move/Add stays in Create and readback clears only committed draft; failure retains it',async()=>{
 for(const operation of ['move','add','failure']){
 const f=await fixture(),e=environment(f.owner),Hook=e.load('src/hooks/use-wallet-canvas.ts').useWalletCanvas;
 let h=e.render(Hook);h.enter();h=e.render(Hook);assert.equal(h.dirty,false);
 if(operation==='add'){const form=e.load('src/lib/card-form.ts').emptyCardForm(),presentation=e.load('src/lib/card-presentation.ts').emptyCardPresentation();assert.equal(f.features.add(f.features.begin(),{...form,name:'Synthetic new',memberNumber:'00123456'},presentation).ok,true);}else h.move('fixture-card-1',{col:6,row:0});
 h=e.render(Hook);assert.equal(h.dirty,true);const draft=JSON.stringify(f.owner.getSnapshot().session.draft);if(operation==='failure')f.failWrites(true);
 await h.save();h=e.render(Hook);assert.equal(h.mode,'create');assert.equal(h.page,1);
 if(operation==='failure'){assert.equal(h.dirty,true);assert.equal(JSON.stringify(f.owner.getSnapshot().session.draft),draft);assert.match(h.error,/not confirmed/);}else{assert.equal(h.dirty,false);assert.deepEqual((await f.repository.load()).document,JSON.parse(JSON.stringify(f.owner.getSnapshot().session.saved)));}
 }
});

test('Editor page changes return Home on the current canvas after Save/Discard/Back',async()=>{
 for(const action of ['save','discard','clean']){
 const f=await fixture(),e=environment(f.owner),Hook=e.load('src/hooks/use-wallet-canvas.ts').useWalletCanvas;
 let h=e.render(Hook);assert.equal(h.page,1);h.enter();h=e.render(Hook);h.selectPage(2);h=e.render(Hook);assert.equal(h.page,2);
 if(action==='clean')h.leave();else{h.move('fixture-card-2',{col:6,row:0});h=e.render(Hook);h.leave();h=e.render(Hook);assert.equal(h.exitPrompt,true);h.cancel();h=e.render(Hook);assert.equal(h.mode,'create');assert.equal(h.dirty,true);if(action==='save')await h.save({exitAfterSave:true});else h.discard();}
 h=e.render(Hook);assert.equal(h.page,2);assert.equal(h.mode,'home');assert.equal(f.owner.pages.current(),2);
 }
});

test('Decorate page switching followed by verified Save or Cancel returns to current Home page',async()=>{
 for(const action of ['save','cancel']){
 const f=await fixture(),e=environment(f.owner),Hook=e.load('src/hooks/use-wallet-canvas.ts').useWalletCanvas;
 let h=e.render(Hook);h.enter();h=e.render(Hook);h.selectPage(3);h=e.render(Hook);
 const session=f.decorate();session.apply({type:'add',assetId:'pet-paw',position:{col:8,row:0}});
 if(action==='save')assert.equal((await session.save()).ok,true);else assert.equal(session.cancel().ok,true);
 h=e.render(Hook);h.finishDecorate();h=e.render(Hook);assert.equal(h.mode,'home');assert.equal(h.page,3);assert.equal(f.owner.pages.current(),3);
 }
});

test('Create clean Back exits; dirty header Back and cancellation never save or discard implicitly',async()=>{
 const f=await fixture(),e=environment(f.owner),Hook=e.load('src/hooks/use-wallet-canvas.ts').useWalletCanvas,Header=e.load('src/components/bemem/HomeHeader.tsx').HomeHeader;
 const back=h=>({props:{onPress:h.leave}});
 let h=e.render(Hook);h.enter();h=e.render(Hook);back(h).props.onPress();h=e.render(Hook);assert.equal(h.mode,'home');
 h.enter();h=e.render(Hook);h.move('fixture-card-1',{col:6,row:0});h=e.render(Hook);const before=JSON.stringify(f.owner.getSnapshot().session);back(h).props.onPress();h=e.render(Hook);assert.equal(h.exitPrompt,true);h.cancel();h=e.render(Hook);assert.equal(h.mode,'create');assert.equal(JSON.stringify(f.owner.getSnapshot().session),before);assert.equal(f.events.length,0);
});


test('Returning Home retains current page and inherited draft; re-entry resumes it without silent Save/Discard',async()=>{
 const f=await fixture(),e=environment(f.owner),Hook=e.load('src/hooks/use-wallet-canvas.ts').useWalletCanvas;
 let h=e.render(Hook);h.enter();h=e.render(Hook);h.selectPage(2);h=e.render(Hook);h.move('fixture-card-2',{col:6,row:0});h=e.render(Hook);
 const before=JSON.stringify(f.owner.getSnapshot().session.draft);h.finishDecorate();h=e.render(Hook);assert.equal(h.mode,'home');assert.equal(h.page,2);assert.equal(h.enter(),true);h=e.render(Hook);assert.equal(h.mode,'create');assert.equal(h.page,2);assert.equal(h.dirty,true);assert.equal(JSON.stringify(f.owner.getSnapshot().session.draft),before);assert.equal(f.events.length,0);
 h.selectPage(1);h=e.render(Hook);assert.deepEqual(h.pageConfirmation.actions.map(a=>a.label),['Save','Discard','Stay']);assert.equal(h.page,2);
});

test('Create page confirmation Stay and Back retain the draft and ignore rapid alternative selections',async()=>{
 const f=await fixture(),e=environment(f.owner),Hook=e.load('src/hooks/use-wallet-canvas.ts').useWalletCanvas;let h=e.render(Hook);h.enter();h=e.render(Hook);h.move('fixture-card-1',{col:6,row:0});h=e.render(Hook);
 const draft=JSON.stringify(f.owner.getSnapshot().session.draft);h.selectPage(2);const first=e.render(Hook).pageConfirmation;h.selectPage(3);assert.equal(e.render(Hook).pageConfirmation.id,first.id);
 h.leave();assert.equal(e.render(Hook).exitPrompt,false);first.onDismiss();h=e.render(Hook);assert.equal(h.pageConfirmation,null);assert.equal(h.mode,'create');assert.equal(h.page,1);assert.equal(JSON.stringify(f.owner.getSnapshot().session.draft),draft);assert.equal(f.events.length,0);
 h.selectPage(2);const second=e.render(Hook).pageConfirmation;assert.notEqual(second.id,first.id);first.actions.find(a=>a.label==='Discard').onPress();assert.equal(e.render(Hook).pageConfirmation.id,second.id);second.actions.find(a=>a.label==='Stay').onPress();assert.equal(e.render(Hook).pageConfirmation,null);
});




for(const action of ['Save','Discard','Stay','Failure'])test(`Create exit continuation on Canvas 2: ${action} keeps page and guards stale consent`,async()=>{
 const f=await fixture(),e=environment(f.owner),Hook=e.load('src/hooks/use-wallet-canvas.ts').useWalletCanvas;let h=e.render(Hook);h.enter();h=e.render(Hook);h.selectPage(2);h=e.render(Hook);h.move('fixture-card-2',{col:6,row:0});h=e.render(Hook);
 const before=JSON.stringify(f.owner.getSnapshot().session.draft);let arrivals=0;h.leave(()=>arrivals++);const dialog=e.render(Hook);assert.equal(dialog.exitPrompt,true);assert.equal(dialog.navigationPending(),true);
 if(action==='Stay')dialog.cancel();else if(action==='Discard')dialog.discard();else{if(action==='Failure')f.failWrites(true);await dialog.save({exitAfterSave:true});}
 h=e.render(Hook);assert.equal(h.page,2);assert.equal(h.mode,'create');assert.equal(arrivals,['Save','Discard'].includes(action)?1:0);
 if(action==='Stay'||action==='Failure')assert.equal(JSON.stringify(f.owner.getSnapshot().session.draft),before);
 if(action==='Stay'){
  h.leave(()=>arrivals++);const current=e.render(Hook);const writes=f.events.length;dialog.discard();await dialog.save({exitAfterSave:true});dialog.cancel();assert.equal(e.render(Hook).exitPrompt,true);assert.equal(f.events.length,writes);current.cancel();assert.equal(arrivals,0);
 }
});
for(const action of ['Save','Discard','Stay','Failure'])test(`Decorate page destination survives ${action} and never falls back to Canvas 1`,async()=>{
 const f=await fixture(),hooks=environment(f.owner),Hook=hooks.load('src/hooks/use-wallet-canvas.ts').useWalletCanvas;let wallet=hooks.render(Hook);wallet.enter();wallet=hooks.render(Hook);wallet.selectPage(2);wallet=hooks.render(Hook);
 const ui=environment(f.owner),Editor=ui.load('src/components/bemem/DecorateMode.tsx').EditableDecorateMode;
 const render=()=>ui.render(Editor,{wallet:hooks.render(Hook),onClose(){assert.fail('Page switch cannot close to Home');},onSaved(){assert.fail('Page switch cannot invoke direct Save destination');}});
 let tree=render();nodes(tree).find(n=>n.type==='WalletCanvas').props.onMove('fixture-card-2',{col:6,row:0});tree=render();const before=JSON.stringify(f.owner.getSnapshot().session.draft);
 nodes(tree).find(n=>n.type==='ContextualFooter').props.onPage(3);tree=render();const request=nodes(tree).find(n=>n.type==='ConfirmationDialog').props.request;
 if(action==='Failure')f.failWrites(true);request.actions.find(a=>a.label===(action==='Failure'?'Save':action)).onPress();await tick();await tick();
 assert.equal(f.owner.pages.current(),['Save','Discard'].includes(action)?3:2);
 if(action==='Stay'||action==='Failure')assert.equal(JSON.stringify(f.owner.getSnapshot().session.draft),before);
 assert.equal(f.owner.getSnapshot().session.saved.cards.length,5);
});
test('Home after a resolved Canvas 2 draft keeps Canvas 2 and does not reset selection',async()=>{
 const f=await fixture(),e=environment(f.owner),Hook=e.load('src/hooks/use-wallet-canvas.ts').useWalletCanvas;let h=e.render(Hook);h.enter();h=e.render(Hook);h.selectPage(2);h=e.render(Hook);h.move('fixture-card-2',{col:6,row:0});h=e.render(Hook);h.leave();h=e.render(Hook);await h.save({exitAfterSave:true});h=e.render(Hook);assert.equal(h.mode,'home');assert.equal(h.page,2);assert.equal(f.owner.pages.current(),2);
});
