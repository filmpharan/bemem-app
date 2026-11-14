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
  if(n.endsWith('lagoon-theme'))return{lagoon:{canvas:{base:'#eef1f4'},action:{primary:'#405764'},text:{primary:'#263943',secondary:'#53636c'},rim:{inner:'#cdd5da'}},lagoonFonts:{latin:'Manrope'}};
  if(n.endsWith('bemem-theme'))return{bemem:{background:'#eef1f4',foreground:'#263943',muted:'#53636c',primary:'#405764',error:'#b42318'}};
  if(['./ConfirmationDialog','./HomeAccountMenu','./GlassButton','./AddCardIcon','./WalletCanvas','./CanvasPageSelector','./LockedCanvas','./DecorationImage','./BememIcon','./MembershipCard','./WalletEmptyState','./DecorateIcon'].includes(n)){const name=n.slice(2);return{[name]:name};}
  assert.ok(n.startsWith('.'),'No native storage/network '+n);return load(path.resolve(path.dirname(file),n));
 },m,m.exports);return m.exports;}
 return{load,alerts,popover,render(fn,props){cursor=0;effects=[];const tree=fn(props);effects.forEach(fn=>fn());return tree;}};
}
const nodes=(t,out=[])=>{if(!t||typeof t!=='object')return out;if(Array.isArray(t)){t.forEach(n=>nodes(n,out));return out;}out.push(t);nodes(t.props?.children,out);if(t.props?.slots)nodes(Object.values(t.props.slots),out);return out;};
const find=(t,name)=>nodes(t).find(n=>n.props?.accessibilityLabel===name);
const setup=environment(),{createMultiCanvasFixture}=setup.load('src/lib/dev-multicanvas.ts'),tick=()=>new Promise(r=>setImmediate(r));
async function fixture(status='active'){const f=createMultiCanvasFixture();await f.owner.commands.initialize();f.status(status);return f;}
test('Numeric selector submits eligible other pages to its same-window host and consumes navigation once',()=>{
 const e=environment(),Selector=e.load('src/components/bemem/CanvasPageSelector.tsx').CanvasPageSelector,{canvasAccess}=e.load('src/lib/canvas-pages.ts');let count=0;
 const props={page:2,destinations:canvasAccess({cards:[],canvas:{pages:{version:1,assignments:{},selectedCount:3}}},'active'),onSelect:p=>{assert.equal(p,3);count++;}};
 let t=e.render(Selector,props);t.props.ref.current={measureInWindow(){}};find(t,'Canvas 2. Choose canvas').props.onPress();t=e.render(Selector,props);
 assert.equal(find(t,'Canvas 2. Choose canvas').props.accessibilityState.expanded,true);assert.deepEqual(e.popover.request.choices.map(c=>c.page),[1,3]);
 e.popover.choose(3);e.popover.choose(3);assert.equal(count,1);assert.equal(find(e.render(Selector,props),'Canvas 2. Choose canvas').props.accessibilityState.expanded,false);
});
test('Editors offer only editable destinations for Free, Expired and Active counts2/3/5',()=>{
 for(const [status,count,expected]of [['free',5,[]],['expired',3,[]],['active',2,[2]],['active',3,[2,3]],['active',5,[2,3,4,5]]]){
 const e=environment(),Selector=e.load('src/components/bemem/CanvasPageSelector.tsx').CanvasPageSelector,{canvasAccess}=e.load('src/lib/canvas-pages.ts');const props={page:1,destinations:canvasAccess({cards:[],canvas:{pages:{version:1,assignments:{},selectedCount:count}}},status),onSelect(){}};
 const t=e.render(Selector,props);t.props.ref.current={measureInWindow(){}};const button=nodes(t).find(n=>n.type==='Pressable');button.props.onPress();
 assert.equal(button.props.disabled,!expected.length);assert.equal(button.props.accessibilityState.disabled,!expected.length);
 assert.equal(button.props.children.props.style,undefined); // normal visual page, even without alternatives
 assert.deepEqual(e.popover.request?.choices.map(c=>c.page)??[],expected);
 }
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
test('After editing Canvas 2 Save returns Home on selected page 2 and a fresh owner starts at 1',async()=>{
 const f=await fixture();f.owner.pages.select(2);const e=environment(f.owner),Hook=e.load('src/hooks/use-wallet-canvas.ts').useWalletCanvas;let h=e.render(Hook);h.enter();h=e.render(Hook);h.move('fixture-card-2',{col:6,row:0});h=e.render(Hook);await h.save();h=e.render(Hook);assert.equal(h.mode,'home');assert.equal(h.page,2);assert.equal(f.owner.pages.current(),2);assert.deepEqual(h.savedCards.map(c=>c.id),['fixture-card-2']);
 const {createWalletOwnerScope}=e.load('src/lib/wallet-runtime-owner.ts'),{createWalletStorageAdapters}=e.load('src/lib/wallet-storage-adapters.ts');const next=createWalletOwnerScope(()=>createWalletStorageAdapters({v1:{load:async()=>null,save:async()=>assert.fail()},v2:f.repository,demoCards:[]}),undefined,()=> 'active').getOwner();await next.commands.initialize();assert.equal(next.pages.current(),1);assert.deepEqual(next.getSnapshot().session.saved.canvas.layout['fixture-card-2'],{col:6,row:0});
});
test('Search projection includes only readable sources and clearing it cannot alter saved layouts',async()=>{
 const f=await fixture(),e=environment(f.owner),Hook=e.load('src/hooks/use-wallet-canvas.ts').useWalletCanvas;
 f.status('free');let h=e.render(Hook);assert.equal(h.searchCards.filter(c=>c.kind==='membership').length,1);f.status('expired');await tick();h=e.render(Hook);assert.equal(h.searchCards.filter(c=>c.kind==='membership').length,5);
 f.status('active');await f.owner.pages.setCount(2);f.status('expired');h=e.render(Hook);assert.deepEqual(h.searchCards.map(c=>c.id),['fixture-card-1','fixture-card-2']);
 const before=JSON.stringify(f.owner.getSnapshot().session.saved);const {searchReflow}=e.load('src/lib/search-reflow.ts');const result=searchReflow(h.searchCards,h.searchLayout,'Canvas 2',true,Infinity);assert.equal(result.cards[0].id,'fixture-card-2');h.focusCard('fixture-card-2');assert.equal(f.owner.pages.current(),2);assert.equal(e.render(Hook).getCard('fixture-card-2').id,'fixture-card-2');assert.equal(JSON.stringify(f.owner.getSnapshot().session.saved),before);
});
test('Stale/forbidden Decorate exits without mounting a session or changing any draft',async()=>{
 const f=await fixture('free');f.owner.pages.select(2);const before=JSON.stringify(f.owner.getSnapshot()),e=environment(f.owner),Mode=e.load('src/components/bemem/DecorateMode.tsx').DecorateMode;let closed=0;
 const t=e.render(Mode,{wallet:{runtime:f.owner,snapshot:f.owner.getSnapshot(),page:2,pageEditable:true,pageAccess:f.owner.pages.access(),selectPage:p=>f.owner.pages.select(p)},onClose(){closed++;},onSaved(){assert.fail();}});
 assert.equal(t,null);assert.equal(closed,1);assert.equal(JSON.stringify(f.owner.getSnapshot()),before);assert.equal(f.events.length,0);
});

test('Decorate selector dirty confirmation preserves Stay and uses existing save/readback before switching',async()=>{
 const f=await fixture(),e=environment(f.owner),Mode=e.load('src/components/bemem/DecorateMode.tsx').EditableDecorateMode;
 const props=()=>({wallet:{runtime:f.owner,snapshot:f.owner.getSnapshot(),page:1,pageEditable:true,pageAccess:f.owner.pages.access(),selectPage:p=>f.owner.pages.select(p)},onClose(){},onSaved(){assert.fail('Page switch is not Home navigation');}});
 let t=e.render(Mode,props());nodes(t).find(n=>typeof n.type==='function').props.onSelect('pet-paw');t=e.render(Mode,props());nodes(t).find(n=>n.type==='WalletCanvas').props.onCanvasPress({col:8,row:0});t=e.render(Mode,props());
 nodes(t).find(n=>n.type==='CanvasPageSelector').props.onSelect(2);assert.equal(f.owner.pages.current(),1);assert.equal(e.alerts[0][2][0].text,'Stay');assert.equal(f.events.length,0);
 e.alerts[0][2].find(b=>b.text==='Save').onPress();await tick();await tick();assert.equal(f.owner.pages.current(),2);assert.equal(f.owner.getSnapshot().session.saved.canvas.decorations.items.length,1);
});

test('WalletCanvas restores its own scroll offset after native content mounts and reports subsequent scrolling',()=>{
 const e=environment(),Canvas=e.load('src/components/bemem/WalletCanvas.tsx').WalletCanvas,offsets=[],props={cards:[],allCards:[],layout:{},editing:false,disabled:false,initialScrollY:240,onScrollY:y=>offsets.push(y),onMove(){},onOpen(){},onDragging(){}};
 let t=e.render(Canvas,props);t.props.onLayout({nativeEvent:{layout:{width:336,height:400}}});t=e.render(Canvas,props);const scroll=nodes(t).find(n=>n.type==='ScrollView'),restored=[];
 scroll.props.ref.current={scrollTo:args=>restored.push(args.y)};scroll.props.onContentSizeChange();assert.deepEqual(restored,[240]);scroll.props.onScroll({nativeEvent:{contentOffset:{y:480}}});assert.deepEqual(offsets,[480]);scroll.props.onContentSizeChange();assert.equal(restored.at(-1),480);
});

test('Page selector uses the shared28dp square outline with48dp accessible touch target',()=>{
 const e=environment(),Selector=e.load('src/components/bemem/CanvasPageSelector.tsx').CanvasPageSelector,Glyph=e.load('src/components/bemem/CanvasPageGlyph.tsx').CanvasPageGlyph;
 const t=e.render(Selector,{page:1,context:'home',destinations:[{page:1,visible:true,editable:true,preview:false},{page:2,visible:true,editable:false,preview:true}],onSelect(){}}),button=find(t,'Canvas 1. Choose canvas');
 assert.equal(button.props.style.width,48);assert.equal(button.props.style.height,48);const glyph=e.render(Glyph,{page:1});
 assert.equal(glyph.props.style.width,28);assert.equal(glyph.props.style.height,28);assert.equal(glyph.props.style.borderRadius,5);assert.equal(glyph.props.style.borderColor,'#263943');assert.equal(glyph.props.children.props.maxFontSizeMultiplier,1.3);
 assert.equal(nodes(t).some(n=>n.type==='GlassButton'),false);
});

test('Decorate page-switch Discard preserves pre-existing Create draft; clean entry can navigate after discard',async()=>{
 for(const priorDraft of [true,false]){
  const f=await fixture('active');if(priorDraft){const s=f.owner.getSnapshot(),doc=JSON.parse(JSON.stringify(s.session.saved));doc.canvas.layout['fixture-card-1']={col:6,row:0};assert.equal(f.owner.commands.updateDraft(s.state.generation,doc).ok,true);}
  const entry=JSON.stringify(f.owner.getSnapshot().session.draft),saved=JSON.stringify(f.owner.getSnapshot().session.saved),e=environment(f.owner),Mode=e.load('src/components/bemem/DecorateMode.tsx').EditableDecorateMode;let closed=0;
  const props=()=>({wallet:{runtime:f.owner,snapshot:f.owner.getSnapshot(),page:1,pageAccess:f.owner.pages.access(),selectPage:p=>f.owner.pages.select(p)},onClose(){closed++;},onSaved(){assert.fail();}});
  let t=e.render(Mode,props());nodes(t).find(n=>typeof n.type==='function').props.onSelect('pet-paw');t=e.render(Mode,props());nodes(t).find(n=>n.type==='WalletCanvas').props.onCanvasPress({col:8,row:0});t=e.render(Mode,props());
  nodes(t).find(n=>n.type==='CanvasPageSelector').props.onSelect(2);const dialog=e.alerts[0];assert.equal(dialog[2][0].text,'Stay');assert.equal(f.owner.pages.current(),1);
  if(priorDraft)assert.match(dialog[1],/earlier Create draft/);dialog[2].find(b=>b.text==='Discard').onPress();
  assert.equal(JSON.stringify(f.owner.getSnapshot().session.draft),entry);assert.equal(JSON.stringify(f.owner.getSnapshot().session.saved),saved);
  assert.equal(f.owner.pages.current(),priorDraft?1:2);assert.equal(closed,priorDraft?1:0);assert.equal(f.events.length,0);
 }
});

test('Decorate switch Save failure retains both earlier Create work and additional decorations',async()=>{
 const f=await fixture(),s=f.owner.getSnapshot(),doc=JSON.parse(JSON.stringify(s.session.saved));doc.canvas.layout['fixture-card-1']={col:6,row:0};f.owner.commands.updateDraft(s.state.generation,doc);
 const e=environment(f.owner),Mode=e.load('src/components/bemem/DecorateMode.tsx').EditableDecorateMode,props=()=>({wallet:{runtime:f.owner,snapshot:f.owner.getSnapshot(),page:1,pageAccess:f.owner.pages.access(),selectPage:p=>f.owner.pages.select(p)},onClose(){assert.fail();},onSaved(){assert.fail();}});
 let t=e.render(Mode,props());nodes(t).find(n=>typeof n.type==='function').props.onSelect('pet-paw');t=e.render(Mode,props());nodes(t).find(n=>n.type==='WalletCanvas').props.onCanvasPress({col:8,row:0});t=e.render(Mode,props());
 const before=JSON.stringify(f.owner.getSnapshot().session.draft);f.failWrites(true);nodes(t).find(n=>n.type==='CanvasPageSelector').props.onSelect(2);e.alerts[0][2].find(b=>b.text==='Save').onPress();await tick();await tick();
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


test('Home numeric selection reaches neutral Free2 and returns1 without mutating any snapshot',async()=>{
 const f=await fixture('free'),before=JSON.stringify(f.owner.getSnapshot().session),e=environment(f.owner),Hook=e.load('src/hooks/use-wallet-canvas.ts').useWalletCanvas;
 let h=e.render(Hook);assert.equal(h.page,1);h.selectPage(2);h=e.render(Hook);assert.equal(h.page,2);assert.equal(h.pageReadable,false);assert.equal(h.pageEditable,false);assert.deepEqual(h.cards,[]);
 h.enter();h=e.render(Hook);assert.equal(h.mode,'create');assert.equal(h.pageEditable,true);assert.equal(h.page,1);assert.equal(f.owner.getSnapshot().state.dirty,false);h.leave();h=e.render(Hook);assert.equal(h.mode,'home');assert.equal(h.page,2);
 h.selectPage(1);h=e.render(Hook);assert.equal(h.page,1);assert.deepEqual(h.cards.map(c=>c.id),['fixture-card-1']);assert.equal(JSON.stringify(f.owner.getSnapshot().session),before);assert.equal(f.events.length,0);
});

test('Home menu retains readable/preview destinations and editor filtering stays separate',()=>{
 for(const [status,count,expected]of [['free',5,[2]],['active',2,[2]],['active',5,[2,3,4,5]],['expired',3,[2,3,4]],['expired',5,[2,3,4,5]]]){
 const e=environment(),Selector=e.load('src/components/bemem/CanvasPageSelector.tsx').CanvasPageSelector,{canvasAccess}=e.load('src/lib/canvas-pages.ts');const props={page:1,destinations:canvasAccess({cards:[],canvas:{pages:{version:1,assignments:{},selectedCount:count}}},status),context:'home',compact:true,onSelect(){}};
 const t=e.render(Selector,props);t.props.ref.current={measureInWindow(){}};find(t,'Canvas 1. Choose canvas').props.onPress();assert.deepEqual(e.popover.request.choices.map(c=>c.page),expected);
 if(status==='expired'&&count===3){assert.match(e.popover.request.choices[0].label,/Read-only/);assert.match(e.popover.request.choices[2].label,/Locked preview/);}
 }
});

test('Stale selector request cannot navigate after its page becomes disabled',()=>{
 const e=environment(),Selector=e.load('src/components/bemem/CanvasPageSelector.tsx').CanvasPageSelector;let calls=0;const props={page:1,context:'home',destinations:[{page:2,visible:true,editable:false,preview:true}],onSelect(){calls++;}};
 const t=e.render(Selector,props);t.props.ref.current={measureInWindow(){}};find(t,'Canvas 1. Choose canvas').props.onPress();e.render(Selector,{...props,disabled:true});e.popover.choose(2);assert.equal(calls,0);
});

test('Actual Decorate Modal Back dismisses its local page popup before exit or dirty confirmation',async()=>{
 const f=await fixture();
 const e2=environment(f.owner),Editor=e2.load('src/components/bemem/DecorateMode.tsx').EditableDecorateMode;f.owner.pages.select(1);
 let t=e2.render(Editor,{wallet:{runtime:f.owner,snapshot:f.owner.getSnapshot(),page:1,pageAccess:f.owner.pages.access(),selectPage:p=>f.owner.pages.select(p)},onClose(){},onSaved(){}});
 const editorHost=nodes(t).find(n=>n.type==='CanvasPagePopoverHost');editorHost.props.ref.current={dismiss:()=>true};t.props.onRequestClose();assert.equal(e2.alerts.length,0);assert.equal(f.events.length,0);
});


test('Expired read-only Home3 enters Create1 and returns to Home3 without changing snapshots',async()=>{
 const f=await fixture('expired');f.owner.pages.select(3);const before=JSON.stringify(f.owner.getSnapshot().session),e=environment(f.owner),Hook=e.load('src/hooks/use-wallet-canvas.ts').useWalletCanvas;
 let h=e.render(Hook);assert.equal(h.page,3);assert.equal(h.enter(),true);h=e.render(Hook);assert.equal(h.page,1);assert.equal(h.pageEditable,true);
 h.selectPage(3);assert.equal(f.owner.pages.current(),1);h.leave();h=e.render(Hook);assert.equal(h.page,3);assert.equal(h.mode,'home');assert.equal(f.owner.pages.current(),3);
 assert.equal(JSON.stringify(f.owner.getSnapshot().session),before);assert.equal(f.events.length,0);
});

test('Fallback Create1 Save returns to the preserved locked Home2 and changes only page1',async()=>{
 const f=await fixture('free');f.owner.pages.select(2);const before=JSON.parse(JSON.stringify(f.owner.getSnapshot().session.saved)),e=environment(f.owner),Hook=e.load('src/hooks/use-wallet-canvas.ts').useWalletCanvas;
 let h=e.render(Hook);h.enter();h=e.render(Hook);h.move('fixture-card-1',{col:6,row:0});h=e.render(Hook);await h.save();h=e.render(Hook);
 assert.equal(h.mode,'home');assert.equal(h.page,2);const after=f.owner.getSnapshot().session.saved;
 assert.deepEqual(after.cards,before.cards);for(let i=2;i<=5;i++)assert.deepEqual(after.canvas.layout['fixture-card-'+i],before.canvas.layout['fixture-card-'+i]);
 assert.deepEqual(after.canvas.pages,before.canvas.pages);assert.deepEqual(after.canvas.layout['fixture-card-1'],{col:6,row:0});
});

test('Expiry with a dirty premium editor exits safely, retains draft, rejects stale writes and asks before discard',async()=>{
 for(const status of ['expired','free']){
 const f=await fixture('active');f.owner.pages.select(3);const e=environment(f.owner),Hook=e.load('src/hooks/use-wallet-canvas.ts').useWalletCanvas;
 let h=e.render(Hook);h.enter();h=e.render(Hook);h.move('fixture-card-3',{col:6,row:0});h=e.render(Hook);
 const stale=h,draft=JSON.stringify(f.owner.getSnapshot().session.draft),saved=JSON.stringify(f.owner.getSnapshot().session.saved);
 f.status(status);h=e.render(Hook);assert.equal(h.page,1);assert.equal(h.pageEditable,false);h=e.render(Hook);assert.equal(h.mode,'home');
 assert.equal(JSON.stringify(f.owner.getSnapshot().session.draft),draft);assert.match(h.error,/retained/);
 stale.move('fixture-card-3',{col:0,row:6});await stale.save();assert.equal(f.events.length,0);assert.equal(JSON.stringify(f.owner.getSnapshot().session.draft),draft);
 assert.equal(h.enter(),false);assert.deepEqual(e.alerts.at(-1)[2].map(b=>b.text),['Stay','Discard']);assert.equal(h.mode,'home');
 assert.equal(JSON.stringify(f.owner.getSnapshot().session.saved),saved);
 // Re-activation makes the very same retained draft editable again.
 f.status('active');h=e.render(Hook);if(status==='expired'){assert.equal(h.enter(),true);h=e.render(Hook);assert.equal(h.page,3);assert.equal(JSON.stringify(f.owner.getSnapshot().session.draft),draft);}
 }
});

test('Explicit discard after expiry permits editor1 without a storage write',async()=>{
 const f=await fixture();f.owner.pages.select(2);const e=environment(f.owner),Hook=e.load('src/hooks/use-wallet-canvas.ts').useWalletCanvas;
 let h=e.render(Hook);h.enter();h=e.render(Hook);h.move('fixture-card-2',{col:6,row:0});f.status('expired');e.render(Hook);h=e.render(Hook);
 h.enter();const dialog=e.alerts.at(-1);assert.equal(dialog[2][0].style,'cancel');assert.equal(f.owner.getSnapshot().state.dirty,true);
 dialog[2].find(b=>b.text==='Discard').onPress();h=e.render(Hook);assert.equal(h.mode,'create');assert.equal(h.page,1);assert.equal(h.dirty,false);assert.equal(f.events.length,0);
});

test('A stale Home selector callback cannot open a forbidden page after entering Create',async()=>{
 const f=await fixture('free'),e=environment(f.owner),Hook=e.load('src/hooks/use-wallet-canvas.ts').useWalletCanvas;
 const home=e.render(Hook);home.enter();let h=e.render(Hook);home.selectPage(2);h=e.render(Hook);assert.equal(h.mode,'create');assert.equal(h.page,1);assert.equal(f.owner.pages.current(),1);assert.equal(f.events.length,0);
});

test('Entitlement loss revokes a previously offered editor popup callback',()=>{
 const e=environment(),Selector=e.load('src/components/bemem/CanvasPageSelector.tsx').CanvasPageSelector,{canvasAccess}=e.load('src/lib/canvas-pages.ts');let calls=0;
 const doc={cards:[],canvas:{pages:{version:1,assignments:{},selectedCount:3}}},props={page:1,destinations:canvasAccess(doc,'active'),onSelect(){calls++;}};
 const t=e.render(Selector,props);t.props.ref.current={measureInWindow(){}};find(t,'Canvas 1. Choose canvas').props.onPress();const stale=e.popover.request;
 const next=e.render(Selector,{...props,destinations:canvasAccess(doc,'expired')});stale.select(2);assert.equal(stale.valid(),false);assert.equal(calls,0);
 const button=nodes(next).find(n=>n.type==='Pressable');assert.equal(button.props.disabled,true);assert.equal(button.props.children.props.style,undefined);
});

test('Clean entitlement loss routes Create to editable1 without rewriting any page data',async()=>{
 const f=await fixture();f.owner.pages.select(2);const e=environment(f.owner),Hook=e.load('src/hooks/use-wallet-canvas.ts').useWalletCanvas;
 let h=e.render(Hook);h.enter();h=e.render(Hook);const before=JSON.stringify(f.owner.getSnapshot().session);f.status('expired');e.render(Hook);h=e.render(Hook);
 assert.equal(h.mode,'create');assert.equal(h.page,1);assert.equal(h.pageEditable,true);assert.equal(JSON.stringify(f.owner.getSnapshot().session),before);assert.equal(f.events.length,0);
});


test('Decorate rejects direct page2 navigation for Free/Expired before opening any dirty confirmation',async()=>{
 for(const status of ['free','expired']){
 const f=await fixture(status),e=environment(f.owner),Editor=e.load('src/components/bemem/DecorateMode.tsx').EditableDecorateMode;let selected=0;
 const props=()=>({wallet:{runtime:f.owner,snapshot:f.owner.getSnapshot(),page:1,pageEditable:true,pageAccess:f.owner.pages.access(),selectPage(){selected++;}},onClose(){assert.fail();},onSaved(){assert.fail();}});
 let t=e.render(Editor,props());nodes(t).find(n=>typeof n.type==='function').props.onSelect('pet-paw');t=e.render(Editor,props());nodes(t).find(n=>n.type==='WalletCanvas').props.onCanvasPress({col:8,row:0});t=e.render(Editor,props());
 const before=JSON.stringify(f.owner.getSnapshot());nodes(t).find(n=>n.type==='CanvasPageSelector').props.onSelect(2);
 assert.equal(selected,0);assert.equal(e.alerts.length,0);assert.equal(JSON.stringify(f.owner.getSnapshot()),before);assert.equal(f.events.length,0);
 }
});


test('Header Save follows owner dirty state after Create Move/Add, commits with readback and retains failed draft',async()=>{
 for(const operation of ['move','add','failure']){
 const f=await fixture(),e=environment(f.owner),Hook=e.load('src/hooks/use-wallet-canvas.ts').useWalletCanvas,Header=e.load('src/components/bemem/HomeHeader.tsx').HomeHeader;
 const slots=h=>e.render(Header,{editing:h.mode==='create',searchOpen:false,disabled:h.saving,saveRequired:h.dirty,saving:h.saving,onSave:()=>h.save(),onBack:h.leave,onSearch(){},onCreate(){},onDecorate(){},onAdd(){},onLogo(){}}).props.slots;
 let h=e.render(Hook);h.enter();h=e.render(Hook);assert.equal(slots(h)[6],null);
 if(operation==='add'){
 const form=e.load('src/lib/card-form.ts').emptyCardForm(),presentation=e.load('src/lib/card-presentation.ts').emptyCardPresentation();
 const token=f.features.begin();assert.equal(f.features.add(token,{...form,name:'Synthetic new',memberNumber:'00123456'},presentation).ok,true);
 }else h.move('fixture-card-1',{col:6,row:0});
 h=e.render(Hook);assert.equal(h.dirty,true);const button=slots(h)[6];assert.equal(button.props.accessibilityLabel,'Save canvas');
 const draft=JSON.stringify(f.owner.getSnapshot().session.draft);if(operation==='failure')f.failWrites(true);
 await button.props.onPress();h=e.render(Hook);
 if(operation==='failure'){assert.equal(h.mode,'create');assert.equal(h.dirty,true);assert.ok(slots(h)[6]);assert.equal(JSON.stringify(f.owner.getSnapshot().session.draft),draft);assert.match(h.error,/not confirmed/);}
 else{assert.equal(h.dirty,false);assert.equal(h.mode,'home');assert.equal(slots(h)[6].props.accessibilityLabel,'Search cards');assert.deepEqual((await f.repository.load()).document,JSON.parse(JSON.stringify(f.owner.getSnapshot().session.saved)));h.enter();h=e.render(Hook);assert.equal(slots(h)[6],null);}
 }
});

test('Editor page changes never replace the independently selected Home canvas after Save/Discard/Back',async()=>{
 for(const action of ['save','discard','clean']){
 const f=await fixture(),e=environment(f.owner),Hook=e.load('src/hooks/use-wallet-canvas.ts').useWalletCanvas;
 let h=e.render(Hook);assert.equal(h.page,1);h.enter();h=e.render(Hook);h.selectPage(2);h=e.render(Hook);assert.equal(h.page,2);
 if(action==='clean')h.leave();else{h.move('fixture-card-2',{col:6,row:0});h=e.render(Hook);h.leave();h=e.render(Hook);assert.equal(h.exitPrompt,true);h.cancel();h=e.render(Hook);assert.equal(h.mode,'create');assert.equal(h.dirty,true);if(action==='save')await h.save();else h.discard();}
 h=e.render(Hook);assert.equal(h.page,1);assert.equal(h.mode,'home');assert.equal(f.owner.pages.current(),1);
 }
});

test('Decorate page switching followed by verified Save or Cancel restores its original Home page',async()=>{
 for(const action of ['save','cancel']){
 const f=await fixture(),e=environment(f.owner),Hook=e.load('src/hooks/use-wallet-canvas.ts').useWalletCanvas;
 let h=e.render(Hook);h.enter();h=e.render(Hook);h.selectPage(3);h=e.render(Hook);
 const session=f.decorate();session.apply({type:'add',assetId:'pet-paw',position:{col:8,row:0}});
 if(action==='save')assert.equal((await session.save()).ok,true);else assert.equal(session.cancel().ok,true);
 h=e.render(Hook);h.finishDecorate();h=e.render(Hook);assert.equal(h.mode,'home');assert.equal(h.page,1);assert.equal(f.owner.pages.current(),1);
 }
});

test('Create clean Back exits; dirty header Back and cancellation never save or discard implicitly',async()=>{
 const f=await fixture(),e=environment(f.owner),Hook=e.load('src/hooks/use-wallet-canvas.ts').useWalletCanvas,Header=e.load('src/components/bemem/HomeHeader.tsx').HomeHeader;
 const back=h=>e.render(Header,{editing:true,searchOpen:false,disabled:false,onBack:h.leave,onSearch(){},onCreate(){},onDecorate(){},onAdd(){},onLogo(){}}).props.slots[4];
 let h=e.render(Hook);h.enter();h=e.render(Hook);back(h).props.onPress();h=e.render(Hook);assert.equal(h.mode,'home');
 h.enter();h=e.render(Hook);h.move('fixture-card-1',{col:6,row:0});h=e.render(Hook);const before=JSON.stringify(f.owner.getSnapshot().session);back(h).props.onPress();h=e.render(Hook);assert.equal(h.exitPrompt,true);h.cancel();h=e.render(Hook);assert.equal(h.mode,'create');assert.equal(JSON.stringify(f.owner.getSnapshot().session),before);assert.equal(f.events.length,0);
});


test('Returning Home preserves an inherited draft on another editable page and offers Save/Discard/Stay on re-entry',async()=>{
 const f=await fixture(),e=environment(f.owner),Hook=e.load('src/hooks/use-wallet-canvas.ts').useWalletCanvas;
 let h=e.render(Hook);h.enter();h=e.render(Hook);h.selectPage(2);h=e.render(Hook);h.move('fixture-card-2',{col:6,row:0});h=e.render(Hook);
 const before=JSON.stringify(f.owner.getSnapshot().session.draft);h.finishDecorate();h=e.render(Hook);assert.equal(h.page,1);assert.equal(h.mode,'home');assert.equal(f.owner.pages.current(),2);
 assert.equal(h.enter(),false);assert.deepEqual(e.alerts.at(-1)[2].map(b=>b.text),['Stay','Discard','Save']);assert.equal(JSON.stringify(f.owner.getSnapshot().session.draft),before);assert.equal(f.events.length,0);
 e.alerts.at(-1)[2].find(b=>b.text==='Save').onPress();await tick();await tick();h=e.render(Hook);assert.equal(h.mode,'create');assert.equal(h.page,1);assert.equal(h.dirty,false);assert.deepEqual(f.owner.getSnapshot().session.saved.canvas.layout['fixture-card-2'],{col:6,row:0});
});


test('Create page confirmation Stay and Back retain the draft and ignore rapid alternative selections',async()=>{
 const f=await fixture(),e=environment(f.owner),Hook=e.load('src/hooks/use-wallet-canvas.ts').useWalletCanvas;let h=e.render(Hook);h.enter();h=e.render(Hook);h.move('fixture-card-1',{col:6,row:0});h=e.render(Hook);
 const draft=JSON.stringify(f.owner.getSnapshot().session.draft);h.selectPage(2);const first=e.render(Hook).pageConfirmation;h.selectPage(3);assert.equal(e.render(Hook).pageConfirmation.id,first.id);
 h.leave();assert.equal(e.render(Hook).exitPrompt,false);first.onDismiss();h=e.render(Hook);assert.equal(h.pageConfirmation,null);assert.equal(h.mode,'create');assert.equal(h.page,1);assert.equal(JSON.stringify(f.owner.getSnapshot().session.draft),draft);assert.equal(f.events.length,0);
 h.selectPage(2);const second=e.render(Hook).pageConfirmation;assert.notEqual(second.id,first.id);first.actions.find(a=>a.label==='Discard').onPress();assert.equal(e.render(Hook).pageConfirmation.id,second.id);second.actions.find(a=>a.label==='Stay').onPress();assert.equal(e.render(Hook).pageConfirmation,null);
});

test('Expired destination cannot discard a draft or save/navigate through a stale Create consent',async()=>{
 for(const action of ['Save','Discard']){
 const f=await fixture(),e=environment(f.owner),Hook=e.load('src/hooks/use-wallet-canvas.ts').useWalletCanvas;let h=e.render(Hook);h.enter();h=e.render(Hook);h.move('fixture-card-1',{col:6,row:0});h=e.render(Hook);h.selectPage(2);const dialog=e.render(Hook).pageConfirmation,before=JSON.stringify(f.owner.getSnapshot().session);
 f.status('expired');await dialog.actions.find(a=>a.label===action).onPress();h=e.render(Hook);assert.equal(h.pageConfirmation,null);assert.equal(h.page,1);assert.equal(JSON.stringify(f.owner.getSnapshot().session),before);assert.equal(f.events.length,0);
 }
});
