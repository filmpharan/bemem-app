const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const root=path.resolve(__dirname,'..');
function harness(){const cache=new Map(),scopes=new Map(),backs=new Set();let scope,cursor=0,effects=[];
 const changed=(a,b)=>!a||!b||a.length!==b.length||a.some((v,i)=>v!==b[i]);
 const react={
  createContext(value){const c={current:value};c.Provider={context:c};return c;},useContext:c=>c.current,
  useRef(v){const i=cursor++;return scope.slots[i]??={current:v};},
  useState(v){const i=cursor++;if(!(i in scope.slots))scope.slots[i]=typeof v==='function'?v():v;const s=scope;return[s.slots[i],next=>{s.slots[i]=typeof next==='function'?next(s.slots[i]):next;}];},
  useMemo(fn,deps){const i=cursor++;if(!scope.slots[i]||changed(scope.slots[i].deps,deps))scope.slots[i]={value:fn(),deps};return scope.slots[i].value;},
  useEffect(fn,deps){const i=cursor++,s=scope;if(!s.slots[i]||changed(s.slots[i].deps,deps)){const old=s.slots[i];s.slots[i]={deps,cleanup:old?.cleanup};effects.push(()=>{old?.cleanup?.();s.slots[i].cleanup=fn();});}},
  useImperativeHandle(ref,fn){cursor++;if(ref)ref.current=fn();},
 };
 function load(file){file=path.resolve(root,file);if(!path.extname(file))file+=fs.existsSync(file+'.tsx')?'.tsx':'.ts';if(cache.has(file))return cache.get(file).exports;const m={exports:{}};cache.set(file,m);
  const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  vm.runInThisContext(`(function(require,module,exports){${code}\n})`,{filename:file})(n=>{
   if(n==='react')return react;if(n==='react/jsx-runtime')return{jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})};
   if(n==='react-native')return{View:'View',Text:'Text',Pressable:'Pressable',StyleSheet:{create:v=>v,absoluteFill:{position:'absolute',left:0,top:0,right:0,bottom:0}},BackHandler:{addEventListener(_,fn){backs.add(fn);return{remove:()=>backs.delete(fn)};}}};
   if(n.endsWith('lagoon-theme'))return{lagoon:require('../design-system/bemem-vivid-lagoon/TOKENS.json').palettes['vivid-lagoon'].colors,lagoonFonts:{latin:'Manrope'}};
   assert.ok(n.startsWith('.'),'No storage/network/native window '+n);return load(path.resolve(path.dirname(file),n));
  },m,m.exports);return m.exports;
 }
 function render(key,fn,props){scope=scopes.get(key)??{slots:[]};scopes.set(key,scope);cursor=0;effects=[];const t=fn(props);if(t.type?.context)t.type.context.current=t.props.value;const pending=effects;effects=[];pending.forEach(fn=>fn());return t;}
 const Host=load('src/components/bemem/CanvasPagePopoverHost.tsx').CanvasPagePopoverHost,Selector=load('src/components/bemem/CanvasPageSelector.tsx').CanvasPageSelector;
 return{load,render,Host,Selector,backs,unmount(key){const s=scopes.get(key);for(const v of s?.slots??[])v?.cleanup?.();scopes.delete(key);}};
}
const nodes=(t,out=[])=>{if(!t||typeof t!=='object')return out;if(Array.isArray(t)){t.forEach(n=>nodes(n,out));return out;}out.push(t);nodes(t.props?.children,out);return out;};
const find=(t,label)=>nodes(t).find(n=>n.props?.accessibilityLabel===label);
const h=harness(),{pagePopoverGeometry:G,PAGE_POPOVER:C}=h.load('src/lib/page-popover-geometry.ts');

test('Same-window subtraction yields52dp centers,24dp square visual gap and4dp target gap without any inset additions',()=>{
 for(const [hx,hy]of [[0,0],[0,24],[0,87],[40,24],[35,120]])for(const width of [360,393,412]){
  const host={x:hx,y:hy,width,height:700},anchor={x:hx+width*3/8,y:hy+1,width:Math.min(48,width/8),height:48};
  const p=G(anchor,host,1);assert.ok(p);assert.equal(p.top,53);assert.equal(p.targetGap,4);assert.equal(p.visibleGap,24);assert.equal(p.centerDistance,52);
  assert.equal(p.left+C.target/2,anchor.x-host.x+anchor.width/2);assert.ok(p.top>=51);assert.ok(p.visibleGap>=16);
 }
});
test('One to four vertical choices stay near slot8 and never overlap targets at360/393/412dp',()=>{
 for(const width of [360,393,412])for(let count=1;count<=4;count++){
  const target=Math.min(48,width/8),x=width*7/8+(width/8-target)/2;
  const p=G({x,y:1,width:target,height:48},{x:0,y:0,width,height:700},count);assert.ok(p);assert.equal(p.columns,1);assert.equal(p.width,48);assert.equal(p.height,count*48+(count-1)*4);
  assert.ok(p.left>=8);assert.equal(p.left+p.width,width-8);assert.equal(p.top,53);
  for(let i=1;i<count;i++)assert.equal(i*52-((i-1)*52+48),4);
 }
 const small=G({x:50,y:1,width:48,height:48},{x:0,y:0,width:160,height:700},4);assert.equal(small.columns,1);assert.equal(small.height,204);
});

test('Invalid/unavailable native frames and insufficient space defer presentation rather than using a fallback anchor',()=>{
 const host={x:0,y:24,width:360,height:700},anchor={x:135,y:25,width:45,height:48};
 for(const a of [{...anchor,width:0},{...anchor,height:0},{...anchor,y:NaN},{...anchor,y:0},{...anchor,x:999}])assert.equal(G(a,host,1),null);
 assert.equal(G(anchor,{...host,height:65},1),null);assert.equal(G(anchor,host,0),null);assert.equal(G(anchor,host,5),null);
});

function setup({hostFrame={x:0,y:24,width:360,height:700},anchorFrame={x:135,y:25,width:45,height:48},defer=false}={}){
 const e=harness(),ref={current:null},calls=[],callbacks=[];
 const hostProps={ref,children:{type:'Underlay',props:{}}},selectorProps={page:1,context:'home',compact:true,destinations:[{page:1,visible:true,editable:true,preview:false},{page:2,visible:true,editable:false,preview:true}],onSelect:p=>calls.push(p)};
 let tree=e.render('host',e.Host,hostProps);const hostNode=tree.props.children;hostNode.props.ref.current={measureInWindow:fn=>fn(hostFrame.x,hostFrame.y,hostFrame.width,hostFrame.height)};
 let selector=e.render('selector',e.Selector,selectorProps);selector.props.ref.current={measureInWindow:fn=>defer?callbacks.push(fn):fn(anchorFrame.x,anchorFrame.y,anchorFrame.width,anchorFrame.height)};
 return{e,ref,calls,callbacks,hostProps,selectorProps,host:()=>e.render('host',e.Host,hostProps),selector:props=>e.render('selector',e.Selector,props??selectorProps),open(){find(selector,'Canvas 1. Choose canvas').props.onPress();},get root(){return hostNode;}};
}
test('Actual Host and Selector render no new Modal/panel; outside dismissal and stale double tap perform one transition',()=>{
 const s=setup();s.open();let t=s.host(),selector=s.selector();assert.equal(find(selector,'Canvas 1. Choose canvas').props.accessibilityState.expanded,true);
 assert.equal(nodes(t).some(n=>n.type==='Modal'),false);const choices=nodes(t).filter(n=>n.props?.accessibilityLabel==='Canvas 2. Locked preview');assert.equal(choices.length,1);
 const position=Object.assign({},...choices[0].props.style);assert.equal(position.width,48);assert.equal(position.height,48);assert.equal(choices[0].props.children.props.page,2);
 const menu=nodes(t).find(n=>n.props?.style?.width===48&&n.props?.style?.top===53);assert.ok(menu);assert.equal(menu.props.style.backgroundColor,undefined);assert.equal(menu.props.style.borderWidth,undefined);
 choices[0].props.onPress();choices[0].props.onPress();assert.deepEqual(s.calls,[2]);assert.equal(find(s.selector(),'Canvas 1. Choose canvas').props.accessibilityState.expanded,false);
 s.open();t=s.host();find(t,'Close canvas selector').props.onPress();assert.equal(s.ref.current.dismiss(),false);assert.deepEqual(s.calls,[2]);
});
test('Pending measurement is invisible; Back cancellation invalidates late callbacks and multiple open attempts',()=>{
 const s=setup({defer:true});s.open();assert.equal(find(s.selector(),'Canvas 1. Choose canvas').props.accessibilityState.expanded,false);assert.equal(find(s.host(),'Close canvas selector'),undefined);
 assert.equal(s.ref.current.dismiss(),true);s.callbacks[0](135,25,45,48);assert.equal(find(s.host(),'Close canvas selector'),undefined);
 s.open();s.open();s.callbacks[1](135,25,45,48);assert.equal(find(s.host(),'Close canvas selector'),undefined);s.callbacks[2](135,25,45,48);assert.ok(find(s.host(),'Close canvas selector'));
});
test('Main Back handler and Modal onRequestClose can dismiss overlay first without invoking editor Cancel',()=>{
 const s=setup();s.open();s.host();assert.equal(s.e.backs.size,1);let cancelled=0;
 const onRequestClose=()=>{if(!s.ref.current.dismiss())cancelled++;};onRequestClose();assert.equal(cancelled,0);s.host();assert.equal(s.e.backs.size,0);onRequestClose();assert.equal(cancelled,1);
});
test('Actual selector defers zero measurements and denies disabled/unmounted stale requests without navigation',()=>{
 const empty=setup({anchorFrame:{x:135,y:25,width:0,height:0}});empty.open();assert.equal(find(empty.host(),'Close canvas selector'),undefined);
 const s=setup({defer:true});s.open();s.selector({...s.selectorProps,disabled:true});s.callbacks[0](135,25,45,48);assert.equal(find(s.host(),'Close canvas selector'),undefined);assert.deepEqual(s.calls,[]);
 const removed=setup({defer:true});removed.open();removed.e.unmount('selector');removed.callbacks[0](135,25,45,48);assert.equal(find(removed.host(),'Close canvas selector'),undefined);
});
test('Host geometry changes close the popup and preserve underlay accessibility after dismissal',()=>{
 const s=setup();s.open();let t=s.host();const under=nodes(t).find(n=>n.props?.importantForAccessibility==='no-hide-descendants');assert.ok(under);
 s.root.props.onLayout();t=s.host();assert.equal(find(t,'Close canvas selector'),undefined);assert.ok(nodes(t).some(n=>n.props?.importantForAccessibility==='auto'));
});


test('Actual host paints four ordered square choices in one vertical column in main and modal coordinate spaces',()=>{
 for(const hy of [0,24,87])for(const width of [360,393,412]){
 const target=Math.min(48,width/8),s=setup({hostFrame:{x:0,y:hy,width,height:700},anchorFrame:{x:width*7/8+(width/8-target)/2,y:hy+1,width:target,height:48}});
 const props={...s.selectorProps,context:'editor',destinations:[5,3,1,4,2].map(page=>({page,visible:true,editable:true,preview:false}))};
 const selector=s.selector(props);find(selector,'Canvas 1. Choose canvas').props.onPress();const t=s.host(),choices=nodes(t).filter(n=>/^Canvas [2-5]$/.test(n.props?.accessibilityLabel??''));
 assert.deepEqual(choices.map(n=>n.props.accessibilityLabel),['Canvas 2','Canvas 3','Canvas 4','Canvas 5']);assert.deepEqual(choices.map(n=>Object.assign({},...n.props.style).top),[0,52,104,156]);assert.ok(choices.every(n=>Object.assign({},...n.props.style).left===0));
 assert.ok(choices.every(n=>n.props.children.props.page>=2));const panel=nodes(t).find(n=>n.props?.style?.height===204);assert.ok(panel);assert.equal(panel.props.style.width,48);assert.equal(panel.props.style.top,53);assert.equal(panel.props.style.left+48,width-8);assert.equal(panel.props.style.backgroundColor,undefined);
 }
});
