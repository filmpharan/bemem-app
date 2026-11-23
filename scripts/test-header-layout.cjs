// Navigation foundation: actual components with mocked native rendering, no device IO.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const root=path.resolve(__dirname,'..');
const flatten=s=>Object.assign({},...[s].flat(Infinity).filter(Boolean));
const nodes=(tree,out=[])=>{if(!tree||typeof tree!=='object')return out;if(Array.isArray(tree)){tree.forEach(t=>nodes(t,out));return out;}out.push(tree);nodes(tree.props?.children,out);return out;};
function harness(dimensions={width:360,fontScale:1},insets={left:0,right:0}){const cache=new Map(),slots=[];let cursor=0,effects=[];const alerts=[];
 const react={useState(initial){const i=cursor++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;return[slots[i],next=>slots[i]=typeof next==='function'?next(slots[i]):next];},useRef(initial){const i=cursor++;return slots[i]??={current:initial};},useImperativeHandle(ref,create){if(ref)ref.current=create();},useEffect(fn,deps){const i=cursor++;if(!slots[i]||!deps||deps.some((x,j)=>x!==slots[i][j])){slots[i]=deps;effects.push(fn);}}};
 function load(file){file=path.resolve(root,file);if(!path.extname(file))file+=fs.existsSync(file+'.ts')?'.ts':'.tsx';if(cache.has(file))return cache.get(file).exports;const module={exports:{}};cache.set(file,module);
  const jsx=(type,props)=>({type,props}),deps={'react':react,'react/jsx-runtime':{jsx,jsxs:jsx},'react-native':{Keyboard:{dismiss(){}},AccessibilityInfo:{isReduceMotionEnabled:async()=>true,addEventListener:()=>({remove(){}})},useWindowDimensions:()=>dimensions,View:'View',Text:'Text',Pressable:'Pressable',ActivityIndicator:'ActivityIndicator',Alert:{alert:(...args)=>alerts.push(args)},StyleSheet:{create:s=>s,hairlineWidth:1}},'../../constants/ci-theme':require('./ci-theme-fixture.cjs'),'react-native-safe-area-context':{useSafeAreaInsets:()=>insets}};
  for(const name of ['BememIcon','AddCardIcon','CanvasPageGlyph','HomeAccountMenu','AddCardText'])deps['./'+name]={[name]:name};
  deps['./FooterMotion']={FooterItemVisual:'FooterItemVisual',CanvasSelectionPill:'CanvasSelectionPill',CanvasSelectorVisual:'CanvasSelectorVisual',footerVisual:{duration:200}};
  const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  vm.runInThisContext(`(function(require,module,exports){${code}\n})`,{filename:file})(name=>deps[name]??load(path.resolve(path.dirname(file),name)),module,module.exports);return module.exports;
 }
 return{load,alerts,render(Component,props){cursor=0;effects=[];const tree=Component(props);effects.forEach(fn=>fn());return tree;}};
}
const access=()=>Array.from({length:5},(_,i)=>({page:i+1,visible:true,readable:true,editable:true,preview:false}));
const byLabel=(tree,label)=>nodes(tree).find(n=>n.props?.accessibilityLabel===label);


test('Every Header uses the same full-width centre anchor with independent bounded profile and actions',()=>{
 for(const mode of ['Home','Create','Decorate']){
  const h=harness(),Header=h.load('src/components/bemem/NavigationHeader.tsx').NavigationHeader,calls=[];
  const tree=h.render(Header,{mode,onSearch:()=>calls.push('search'),onCancel:()=>calls.push('cancel'),onSave:()=>calls.push('save')});
  const [left,center,right]=tree.props.children[0].props.children;assert.equal(flatten(tree.props.style).minHeight,48);
  assert.equal(left.props.style.left,12);assert.equal(right.props.style.right,12);assert.equal(center.props.style.left,0);assert.equal(center.props.style.right,0);assert.equal(center.props.style.alignItems,'center');
  assert.equal(left.props.children.props.navigationActions,false);assert.equal(nodes(center).find(n=>n.type==='Text').props.children,'bemem.');
  if(mode==='Home'){byLabel(tree,'Search cards').props.onPress();assert.deepEqual(calls,['search']);}
  else{for(const label of ['Cancel','Save']){const b=byLabel(tree,label),style=flatten(b.props.style({pressed:false}));assert.ok(style.width>=48);assert.ok(style.minHeight>=48);assert.equal(style.boxSizing,'border-box');b.props.onPress();}assert.deepEqual(calls,['cancel','save']);}
 }
});

test('Narrow editor uses a second action row rather than clipping or shrinking tap targets',()=>{
 const h=harness({width:393,fontScale:1}),Header=h.load('src/components/bemem/NavigationHeader.tsx').NavigationHeader,props={mode:'Create'};
 let t=h.render(Header,props);t.props.onLayout({nativeEvent:{layout:{width:320}}});t=h.render(Header,props);assert.equal(flatten(t.props.style).minHeight,96);
 for(const label of ['Cancel','Save'])assert.equal(flatten(byLabel(t,label).props.style({pressed:false})).minHeight,48);
 t.props.onLayout({nativeEvent:{layout:{width:393}}});assert.equal(flatten(h.render(Header,props).props.style).minHeight,48);
});
test('Permanent five-action icon Footer has identical labels, equal targets and all destinations in every mode',()=>{
 for(const mode of ['Home','Create','Decorate']){
  const h=harness(),Footer=h.load('src/components/bemem/ContextualFooter.tsx').ContextualFooter,calls=[];
  const props={mode,page:1,destinations:access(),onPage(){},onCanvasRequest:()=>calls.push('Canvas'),onHome:()=>calls.push('Home'),onDecorate:()=>calls.push('Decorate'),onCreate:()=>calls.push('Create'),onAdd:()=>calls.push('Add')};
  const t=h.render(Footer,props),row=byLabel(t,'Main navigation');assert.equal(row.props.children.length,5);assert.equal(row.props.style.minHeight,56);assert.equal(row.props.style.paddingVertical,4);
  const labels=['Decorate','Arrange','Home','Canvas 1. Choose canvas','Add Card'];
  for(let i=0;i<5;i++){const slot=row.props.children[i];assert.equal(slot.props.style.width,'20%');const button=slot.props.children;assert.equal(button.props.accessibilityLabel,labels[i]);assert.equal(button.props.disabled,false);assert.ok(flatten(button.props.style({pressed:false})).minHeight>=48);button.props.onPress();}
  assert.deepEqual(calls,['Decorate','Create','Home','Canvas','Add']);assert.deepEqual(nodes(t).filter(n=>n.type==='FooterItemVisual').map(n=>n.props.name),['decorate','create','home','canvas','add']);
 }
});

test('Canvas capsule reserves space above the compact Footer; current/outside/Back collapse and Locked2 navigates without an automatic alert',()=>{
 const h=harness(),Footer=h.load('src/components/bemem/ContextualFooter.tsx').ContextualFooter,ref={current:null},selected=[];
 const props={mode:'Home',page:1,destinations:access(),ref,onPage:p=>selected.push(p)};
 let t=h.render(Footer,props);byLabel(t,'Canvas 1. Choose canvas').props.onPress();t=h.render(Footer,props);
 const menu=byLabel(t,'Canvas page choices');assert.equal(menu.props.style.position,undefined);assert.equal(menu.props.style.borderRadius,999);assert.ok(menu.props.style.marginBottom>0);assert.equal(byLabel(t,'Main navigation').props.children.length,5);
 assert.deepEqual(nodes(menu).filter(n=>n.type==='Pressable').map(n=>n.props.disabled),[false,false,false,false,false]);
 byLabel(t,'Canvas 2').props.onPress();assert.equal(h.alerts.length,0);assert.deepEqual(selected,[2]);
 byLabel(h.render(Footer,props),'Canvas 1. Choose canvas').props.onPress();t=h.render(Footer,props);byLabel(t,'Canvas 1').props.onPress();assert.equal(ref.current.dismiss(),false);
 byLabel(h.render(Footer,props),'Canvas 1. Choose canvas').props.onPress();assert.equal(ref.current.dismiss(),true);assert.equal(ref.current.dismiss(),false);
});
test('Stale callback cannot switch edit modes; busy controls cannot save; blocked writer still permits Home/Cancel',()=>{
 const h=harness(),Footer=h.load('src/components/bemem/ContextualFooter.tsx').ContextualFooter;let calls=0;
 const p={mode:'Home',page:1,destinations:access(),onPage(){},onCreate:()=>calls++,onHome:()=>calls++};let t=h.render(Footer,p);const stale=byLabel(t,'Arrange').props.onPress;
 h.render(Footer,{...p,mode:'Decorate',disabled:true});stale();assert.equal(calls,0);
 t=h.render(Footer,{...p,saving:true});byLabel(t,'Home').props.onPress();assert.equal(calls,0);
 t=h.render(Footer,{...p,actionsBlocked:true});assert.equal(byLabel(t,'Home').props.disabled,false);byLabel(t,'Home').props.onPress();assert.equal(calls,1);assert.equal(byLabel(t,'Arrange').props.disabled,true);
 const hh=harness(),Header=hh.load('src/components/bemem/NavigationHeader.tsx').NavigationHeader;
 t=hh.render(Header,{mode:'Create',disabled:true,cancelDisabled:false,onSave:()=>calls++,onCancel:()=>calls++});byLabel(t,'Save').props.onPress();assert.equal(calls,1);byLabel(t,'Cancel').props.onPress();assert.equal(calls,2);
});
test('Temporary restrictions preserve entitled/readable/current content in every mode without changing entitlement',()=>{
 for(const mode of ['Home','Create','Decorate']){
  const h=harness(),Footer=h.load('src/components/bemem/ContextualFooter.tsx').ContextualFooter,choose=h.load('src/lib/footer-navigation.ts').footerCanvasChoices,selected=[];
  assert.deepEqual(choose(1,access(),mode!=='Home').map(c=>c.kind),['current','select','select','select','select']);
  assert.equal(choose(4,access(),true)[3].kind,'current');
  const props={mode,page:1,destinations:access('active'),onPage:p=>selected.push(p)};
  byLabel(h.render(Footer,props),'Canvas 1. Choose canvas').props.onPress();const t=h.render(Footer,props);byLabel(t,'Canvas 3').props.onPress();assert.deepEqual(selected,[3]);
 }
});


test('Measured text can trigger fallback above 360dp and never escapes the parent at large font scales',()=>{
 const h=harness({width:393,fontScale:1}),geometry=h.load('src/lib/navigation-text-layout.ts').navigationTextLayout;
 for(const width of [280,320,360,393,412,600])for(const fontScale of [1,1.3,2,3]){
  const g=geometry(width,fontScale,46*fontScale,35*fontScale,110);
  assert.ok(g.cancelWidth>=48&&g.saveWidth>=48);assert.ok(g.groupWidth<=width-24);assert.ok(g.actionHeight>=48);
  if(!g.stacked)assert.ok(g.sideWidth*2+110+16<=width);
  if(!g.vertical)assert.equal(g.cancelWidth+g.saveWidth+4,g.groupWidth);
  else assert.equal(g.height,48+g.actionHeight*2+4);
 }
 const Header=h.load('src/components/bemem/NavigationHeader.tsx').NavigationHeader,props={mode:'Create'};
 let tree=h.render(Header,props);tree.props.onLayout({nativeEvent:{layout:{width:393}}});tree=h.render(Header,props);assert.equal(flatten(tree.props.style).minHeight,48);
 nodes(byLabel(tree,'Cancel')).find(n=>n.type==='AddCardText').props.onMeasure(100);
 nodes(byLabel(tree,'Save')).find(n=>n.type==='AddCardText').props.onMeasure(80);
 tree=h.render(Header,props);assert.equal(flatten(tree.props.style).minHeight,96);
 assert.ok(flatten(byLabel(tree,'Save').props.style({pressed:false})).width>=88);
});
test('Footer removes unnecessary label padding and uses full measured words with an unrestricted wrapping fallback',()=>{
 for(const width of [320,360,393,412]){
  const h=harness(),Footer=h.load('src/components/bemem/ContextualFooter.tsx').ContextualFooter,p={mode:'Home',page:1,destinations:access(),onPage(){}};
  let tree=h.render(Footer,p);byLabel(tree,'Main navigation').props.onLayout({nativeEvent:{layout:{width}}});tree=h.render(Footer,p);
  const button=byLabel(tree,'Decorate'),label=nodes(button).find(n=>n.type==='FooterItemVisual');
  assert.equal(label.props.label,'Decorate');assert.equal(label.props.width,width/5-2);assert.equal(label.props.numberOfLines,undefined);
  assert.equal(flatten(button.props.style({pressed:false})).paddingHorizontal,0);
 }
});


test('First and measured Header frames share the same centre and pin Save inside safe bounds at Samsung widths and font scales',()=>{
 for(const width of [360,393,412])for(const fontScale of [1,1.3,2,3])for(const mode of ['Home','Create','Decorate']){
  const h=harness({width,fontScale},{left:8,right:8}),Header=h.load('src/components/bemem/NavigationHeader.tsx').NavigationHeader,props={mode};
  const check=tree=>{
   const [left,brand,right]=tree.props.children[0].props.children;
   assert.equal(brand.props.style.left,0);assert.equal(brand.props.style.right,0);assert.equal(brand.props.style.alignItems,'center');assert.equal(left.props.style.left,12);assert.equal(right.props.style.right,12);
   if(mode==='Home')return;
   const actions=nodes(tree).filter(n=>n.type==='Pressable'&&['Cancel','Save'].includes(n.props.accessibilityLabel));assert.equal(actions.length,2);
   const group=nodes(tree).find(n=>n.props?.style&&flatten(n.props.style).gap===4),g=flatten(group.props.style),targetWidths=actions.map(n=>flatten(n.props.style({pressed:false})).width),usable=width-16;
   assert.ok(g.width<=usable-24);assert.equal(g.boxSizing,'border-box');assert.ok(targetWidths.every(w=>w>=48));
   if(g.flexDirection==='row')assert.equal(targetWidths[0]+4+targetWidths[1],g.width);
   else assert.ok(Math.max(...targetWidths)<=g.width);
  };
  let tree=h.render(Header,props);check(tree);tree.props.onLayout({nativeEvent:{layout:{width:width-16}}});tree=h.render(Header,props);check(tree);
  if(mode!=='Home'){nodes(byLabel(tree,'Cancel')).find(n=>n.type==='AddCardText').props.onMeasure(48*fontScale);nodes(byLabel(tree,'Save')).find(n=>n.type==='AddCardText').props.onMeasure(36*fontScale);check(h.render(Header,props));}
 }
});

test('Footer colors follow actual mode without an underline while Canvas labels change without creating an independent selected item',()=>{
 const h=harness(),Footer=h.load('src/components/bemem/ContextualFooter.tsx').ContextualFooter,p={mode:'Home',page:1,destinations:access(),onPage(){}};
 for(const [mode,index]of [['Home',2],['Create',1],['Decorate',0]])for(const page of [1,5]){const tree=h.render(Footer,{...p,mode,page}),visuals=nodes(tree).filter(n=>n.type==='FooterItemVisual');assert.equal(visuals.filter(n=>n.props.active).length,1);assert.equal(visuals[index].props.active,true);assert.equal(visuals[3].props.label,'Canvas '+page);assert.equal(nodes(tree).some(n=>n.type==='FooterActiveIndicator'||n.props?.testID==='footer-active-indicator'),false);assert.equal(byLabel(tree,'Canvas '+page+'. Choose canvas').props.accessibilityState.selected,false);}
});

test('Canvas capsule tracks actual page and keeps selection unchanged while navigation is blocked by a guard',()=>{
 const h=harness(),Footer=h.load('src/components/bemem/ContextualFooter.tsx').ContextualFooter,ref={current:null},requested=[],p={mode:'Create',page:1,destinations:access(),ref,onPage:page=>requested.push(page)};
 let tree=h.render(Footer,p);byLabel(tree,'Canvas 1. Choose canvas').props.onPress();tree=h.render(Footer,p);let menu=byLabel(tree,'Canvas page choices');assert.equal(nodes(menu).find(n=>n.type==='CanvasSelectionPill').props.page,1);const stale=byLabel(menu,'Canvas 5').props.onPress;stale();stale();assert.deepEqual(requested,[5]);
 // Guard has not approved a page change: reopen still highlights Canvas 1.
 tree=h.render(Footer,p);byLabel(tree,'Canvas 1. Choose canvas').props.onPress();tree=h.render(Footer,p);menu=byLabel(tree,'Canvas page choices');assert.equal(byLabel(menu,'Canvas 1').props.accessibilityState.selected,true);assert.equal(byLabel(menu,'Canvas 5').props.accessibilityState.selected,false);
 tree=h.render(Footer,{...p,page:5});tree=h.render(Footer,{...p,page:5});byLabel(tree,'Canvas 5. Choose canvas').props.onPress();tree=h.render(Footer,{...p,page:5});menu=byLabel(tree,'Canvas page choices');assert.equal(nodes(menu).find(n=>n.type==='CanvasSelectionPill').props.page,5);assert.equal(byLabel(menu,'Canvas 5').props.accessibilityState.selected,true);
 const track=nodes(menu).find(n=>n.props?.testID==='canvas-segment-track');track.props.onLayout({nativeEvent:{layout:{width:294}}});menu=byLabel(h.render(Footer,{...p,page:5}),'Canvas page choices');assert.equal(nodes(menu).find(n=>n.type==='CanvasSelectionPill').props.width,294);assert.equal(nodes(menu).filter(n=>n.type==='Pressable').length,5);assert.ok(nodes(menu).filter(n=>n.type==='Pressable').every(n=>flatten(n.props.style).minHeight>=48));
});
