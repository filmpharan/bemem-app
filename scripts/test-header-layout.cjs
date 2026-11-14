// Actual shared/header components; native geometry is mocked, Samsung appearance is not claimed.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),tokens=require('../design-system/bemem-lagoon-glass-rc2/TOKENS.json');
const flatten=x=>Object.assign({},...[x].flat(Infinity).filter(Boolean));
const text=x=>Array.isArray(x)?x.map(text).join(''):typeof x==='string'?x:x?.props?text(x.props.children):'';
const nodes=(t,out=[])=>{if(!t||typeof t!=='object')return out;if(Array.isArray(t)){t.forEach(n=>nodes(n,out));return out;}out.push(t);nodes(t.props?.children,out);if(t.props?.slots)nodes(Object.values(t.props.slots),out);return out;};
function headerHarness(fontScale=1,editing=false){const cache=new Map(),states=[];let cursor=0,ready=false;
 function load(file){file=path.resolve(root,file);if(!path.extname(file))file+='.tsx';if(cache.has(file))return cache.get(file).exports;const m={exports:{}};cache.set(file,m);
  const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  const jsx=(type,props)=>({type,props});
  vm.runInThisContext(`(function(require,module,exports){${code}\n})`)(n=>{
   if(n==='react')return{useState(v){const i=cursor++;if(!(i in states))states[i]=typeof v==='function'?v():v;return[states[i],next=>states[i]=typeof next==='function'?next(states[i]):next];}};
   if(n==='react-native')return{Pressable:'Pressable',Text:'Text',View:'View',ActivityIndicator:'ActivityIndicator',StyleSheet:{create:v=>v},useWindowDimensions:()=>({fontScale})};
   if(n==='react/jsx-runtime')return{jsx,jsxs:jsx};if(n==='expo-font')return{useFonts:()=>[ready]};if(n.endsWith('.ttf'))return 1;
 if(n.endsWith('/ci-theme'))return require('./ci-theme-fixture.cjs');
   if(n.endsWith('lagoon-theme'))return{core:tokens.core,lagoon:tokens.palettes['pearl-gray'].colors,lagoonFonts:{latin:'BememManrope'}};
   const component=n.slice(2);if(['AddCardIcon','BememIcon','CanvasPageSelector','HomeAccountMenu'].includes(component))return{[component]:component};
   assert.ok(n.startsWith('.'));return load(path.resolve(path.dirname(file),n));
  },m,m.exports);return m.exports;
 }
 const Header=load('src/components/bemem/HomeHeader.tsx').HomeHeader;
 return{loaded(){ready=true;},render(overrides={}){cursor=0;const declaration=Header({editing,searchOpen:false,disabled:false,onBack(){},onSearch(){},onCreate(){},onDecorate(){},onAdd(){},onLogo(){},page:1,pageDestinations:[],onPage(){},...overrides});return{declaration,tree:declaration.type(declaration.props)};}};
}

test('Shared header uses exactly eight equal columns at360/393/412dp,50dp high without wrapping or overlapping targets',()=>{
 for(const width of [280,320,360,393,412,600])for(const scale of [0.85,1,1.25,2])for(const editing of [false,true]){
  const h=headerHarness(scale,editing);let {tree}=h.render();tree.props.onLayout({nativeEvent:{layout:{width}}});h.loaded();const result=h.render();tree=result.tree;
  assert.equal(tree.props.style.height,50);assert.equal(tree.props.style.minHeight,50);assert.equal(tree.props.style.flexDirection,'row');assert.notEqual(tree.props.style.flexWrap,'wrap');assert.equal(tree.props.style.paddingHorizontal,undefined);
  const columns=nodes(tree).filter(n=>n.props?.nativeID?.startsWith('header-slot'));assert.equal(columns.length,6);
  assert.equal(columns[0].props.nativeID,'header-slots-1-3');assert.equal(columns[0].props.style.width,'37.5%');
  assert.deepEqual(columns.slice(1).map(n=>n.props.nativeID),[4,5,6,7,8].map(n=>'header-slot-'+n));
  for(const column of columns.slice(1)){assert.equal(column.props.style.width,'12.5%');assert.equal(column.props.style.height,50);assert.equal(column.props.style.overflow,'hidden');}
  const target=Math.min(48,width/8);for(let slot=4;slot<=8;slot++){const center=(slot-0.5)*width/8,left=center-target/2,right=center+target/2;assert.ok(left>=(slot-1)*width/8);assert.ok(right<=slot*width/8);}
  const logo=nodes(tree).find(n=>n.type==='Text'&&text(n)==='bemem.');assert.equal(logo.props.numberOfLines,1);assert.equal(logo.props.adjustsFontSizeToFit,true);assert.equal(logo.props.ellipsizeMode,'clip');assert.equal(logo.props.maxFontSizeMultiplier,1.15);
  const font=flatten(logo.props.style);assert.equal(font.fontSize,width<320?22:24);assert.equal(font.lineHeight,30);assert.equal(font.fontFamily,'BememManrope');
 }
});

test('Approved Home/Create slot mapping keeps empty slots and conditional Save',()=>{
 const home=headerHarness(1,false).render().declaration.props.slots;
 assert.equal(home[4],null);assert.equal(home[5],undefined);assert.equal(home[6].props.accessibilityLabel,'Search cards');assert.equal(home[7].type,'HomeAccountMenu');assert.equal(home[7].props.compact,true);
 assert.equal(home[8].type,'CanvasPageSelector');assert.equal(home[8].props.context,'home');
 const h=headerHarness(1,true),clean=h.render().declaration.props.slots;
 assert.equal(clean[4].props.accessibilityLabel,'Back');assert.equal(clean[4].props.children.props.name,'chevron-left');assert.equal(clean[4].props.children.props.color,'#b42318');
 assert.equal(clean[5],undefined);assert.equal(clean[6],null);assert.equal(clean[7].props.accessibilityLabel,'Add Card');assert.equal(clean[8].type,'CanvasPageSelector');assert.equal(clean[8].props.context,'editor');
 let saves=0;const dirty=h.render({saveRequired:true,onSave(){saves++;}}).declaration.props.slots;
 assert.equal(dirty[6].props.accessibilityLabel,'Save canvas');assert.equal(dirty[6].props.children.props.name,'check');assert.equal(dirty[6].props.children.props.color,'#26734d');dirty[6].props.onPress();assert.equal(saves,1);
 const busy=h.render({saveRequired:true,saving:true,onSave(){}}).declaration.props.slots[6];assert.equal(busy.props.disabled,true);assert.equal(busy.props.accessibilityState.busy,true);assert.equal(busy.props.children.type,'ActivityIndicator');
 assert.equal(h.render({saveRequired:false,onSave(){}}).declaration.props.slots[6],null);
 assert.equal(h.render({saveRequired:true,saveDisabled:true,onSave(){}}).declaration.props.slots[6].props.disabled,true);
});

test('Header actions remain frameless, accessible and disabled while Save is busy',()=>{
 const h=headerHarness(1,true),calls=[],handlers={saveRequired:true,onBack:()=>calls.push('back'),onSave:()=>calls.push('save'),onAdd:()=>calls.push('add'),onLogo:()=>calls.push('logo')};
 const {declaration}=h.render(handlers);for(const slot of [4,6,7]){const b=declaration.props.slots[slot];b.props.onPress();const s=flatten(b.props.style({pressed:false}));assert.equal(s.width,'100%');assert.equal(s.maxWidth,48);assert.equal(s.height,48);assert.equal(s.borderWidth,undefined);assert.equal(b.props.accessibilityRole,'button');assert.notEqual(b.props.children.type,'View');}
 declaration.props.onLogo();assert.deepEqual(calls,['back','save','add','logo']);assert.equal(h.render({addDisabled:true}).declaration.props.slots[7].props.disabled,true);
 for(const slot of [4,6,7]){const b=h.render({...handlers,disabled:true}).declaration.props.slots[slot];assert.equal(b.props.disabled,true);assert.equal(b.props.accessibilityState.disabled,true);}
 const home=headerHarness(1,false).render({searchOpen:true});assert.equal(home.declaration.props.slots[6].props.accessibilityLabel,'Close search');assert.equal(home.declaration.props.slots[6].props.accessibilityState.expanded,true);
});

// Actual bottom rail: Create mounts nothing; only empty Home retains the FAB.
test('Create bottom Save and its touch-blocking rail are absent; empty Home retains only FAB', () => {
  const module = { exports: {} }, jsx = (type, props) => ({ type, props });
  const code = ts.transpileModule(fs.readFileSync(path.join(root, 'src/components/bemem/CanvasActions.tsx'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const deps = { 'react/jsx-runtime': { jsx, jsxs: jsx }, 'react-native': { View: 'View', Text: 'Text', StyleSheet: { create: s => s } },
    '../../constants/lagoon-theme': { core: tokens.core, lagoon: tokens.palettes['pearl-gray'].colors, lagoonFonts: { latin: 'BememManrope' } },
    './GlassButton': { GlassButton: 'GlassButton' }, './BememIcon': { BememIcon: 'BememIcon' } };
  vm.runInThisContext(`(function(require,module,exports){${code}\n})`)(name => { assert.ok(deps[name]); return deps[name]; }, module, module.exports);
  const save = () => {}, add = () => {};
  for (const editing of [true, false]) for (const empty of [true, false]) {
    const tree = module.exports.CanvasActions({ editing, empty, dirty: true, disabled: false, saving: false, onAdd: add, onSave: save });
    if(editing||!empty){assert.equal(tree,null);continue;}
    const controls = [tree.props.children].flat().filter(Boolean);
    const adds = controls.filter(c => c.props.accessibilityLabel === 'Add Card');
    assert.equal(adds.length, !editing && empty ? 1 : 0);
    if (adds.length) { assert.equal(adds[0].props.onPress, add); assert.equal(flatten(adds[0].props.style).right, 0); }
    const saves = controls.filter(c => c.props.onPress === save);
    assert.equal(saves.length,0);

  }
});
