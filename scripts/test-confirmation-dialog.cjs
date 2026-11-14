const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),tokens=require('../design-system/bemem-lagoon-glass-rc2/TOKENS.json');
const nodes=(t,out=[])=>{if(!t||typeof t!=='object')return out;if(Array.isArray(t)){t.forEach(x=>nodes(x,out));return out;}out.push(t);nodes(t.props?.children,out);return out;};
const find=(t,label)=>nodes(t).find(n=>n.props?.accessibilityLabel===label);
const flat=s=>Object.assign({},...[s].flat(Infinity).filter(Boolean)),tick=()=>new Promise(r=>setImmediate(r));
function harness(){const frames=new Map(),cache=new Map(),focus=[],keyboard=[];let slots,cursor,effects;
 const react={useRef(v){const i=cursor++;return slots[i]??={current:v};},useState(v){const i=cursor++,own=slots;if(!(i in own))own[i]=typeof v==='function'?v():v;return[own[i],v=>own[i]=typeof v==='function'?v(own[i]):v];},useEffect(fn,deps){const i=cursor++,old=slots[i];if(!old||deps.some((v,j)=>v!==old.deps[j])){const item=slots[i]={deps};effects.push(()=>{item.cleanup=fn();});}}};
 function load(relative){const file=path.resolve(root,relative);if(cache.has(file))return cache.get(file);const m={exports:{}};
 const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 vm.runInThisContext(`(function(require,module,exports){${code}\n})`,{filename:file})(name=>{
  if(name==='react')return react;if(name==='react/jsx-runtime')return{jsx:(type,props,key)=>({type,props,key}),jsxs:(type,props,key)=>({type,props,key})};
  if(name==='react-native')return{...Object.fromEntries(['View','Text','Pressable','ScrollView','Modal','ActivityIndicator','KeyboardAvoidingView'].map(n=>[n,n])),Platform:{OS:'android',Version:36},Keyboard:{dismiss:()=>keyboard.push('dismiss')},AccessibilityInfo:{sendAccessibilityEvent:(...a)=>focus.push(a)},StyleSheet:{create:s=>s,flatten:flat,absoluteFill:{position:'absolute',left:0,right:0,top:0,bottom:0},hairlineWidth:1}};
  if(name==='react-native-safe-area-context')return{SafeAreaView:'SafeAreaView'};
 if(name.endsWith('/sheet-visual'))return require('./sheet-visual-fixture.cjs');
 if(name.endsWith('/ci-theme'))return require('./ci-theme-fixture.cjs');
  if(name.endsWith('lagoon-theme'))return{lagoon:tokens.palettes['pearl-gray'].colors,core:tokens.core,lagoonTokens:tokens,lagoonFonts:{latin:'BememManrope'},alpha:(h,a)=>h+Math.round(a*255).toString(16).padStart(2,'0')};
  if(name==='./ConfirmationDialog')return load('src/components/bemem/ConfirmationDialog.tsx');
  if(['./AddCardText','./GlassButton','./AddCardIcon'].includes(name))return{[name.slice(2)]:name.slice(2)};
  if(name==='./add-card-layout')return{addCardLayout:{toolSize:36,padding:20,gap:12,sheetRadius:22}};
  throw Error('No storage/native dependency allowed: '+name);
 },m,m.exports);cache.set(file,m.exports);return m.exports;}
 function render(key,fn,props){slots=frames.get(key)??[];frames.set(key,slots);cursor=0;effects=[];const tree=fn(props);effects.forEach(fn=>fn());return tree;}
 const Dialog=load('src/components/bemem/ConfirmationDialog.tsx').ConfirmationDialog;
 function dialog(request,options={}){const wrapper=render('wrapper',Dialog,{request,...options});if(!wrapper)return{wrapper,surface:null};const child=options.presentation==='inline'?wrapper:wrapper.props.children.props.children.props.children;
  const surface=render('surface-'+request.id,child.type,child.props);return{wrapper,surface};}
 return{load,render,dialog,focus,keyboard,unmount(key){for(const slot of frames.get(key)??[])slot?.cleanup?.();}};
}
const request=(patch={})=>({id:'fixture',title:'Delete this card?',description:'Synthetic Test Member will be removed.',onDismiss(){},actions:[{label:'Cancel',role:'primary',onPress(){}},{label:'Delete Card',role:'destructive',onPress(){}}],...patch});

test('Shared Pearl dialog renders role colors, Manrope, safe primary and destructive text without glass',()=>{
 const h=harness(),t=h.dialog(request()).surface,surface=nodes(t).find(n=>n.props?.testID==='confirmation-surface');
 assert.equal(surface.props.style.backgroundColor,'#eceff1');assert.equal(surface.props.style.borderRadius,20);assert.equal(surface.props.style.maxWidth,400);
 const scroll=nodes(t).find(n=>n.type==='ScrollView');assert.equal(scroll.props.contentContainerStyle.padding,20);
 const title=nodes(t).find(n=>n.props?.accessibilityRole==='header');assert.equal(flat(title.props.style).fontFamily,'BememManrope');assert.equal(flat(title.props.style).fontSize,18);assert.equal(flat(title.props.style).lineHeight,26);
 const primary=find(t,'Cancel'),danger=find(t,'Delete Card');assert.equal(flat(primary.props.style({pressed:false})).backgroundColor,'#405764');assert.equal(flat(danger.props.style({pressed:false})).backgroundColor,undefined);
 assert.equal(flat(danger.props.children.props.style).color,'#b42318');for(const b of [primary,danger])assert.equal(flat(b.props.style({pressed:false})).minHeight,48);
 assert.equal(nodes(t).some(n=>n.type==='GlassButton'),false);
});

test('Closed confirmation renders nothing; inline surface creates no extra native window',()=>{
 const h=harness();assert.equal(h.dialog(null).wrapper,null);const t=h.dialog(request(),{presentation:'inline'});assert.equal(nodes(t.surface).some(n=>n.type==='Modal'),false);assert.equal(t.surface.props.accessibilityViewIsModal,true);
 assert.equal(h.dialog(request()).wrapper.type,'Modal');
});

test('Long card names/counts retain complete text and scroll rather than shrink or truncate at representative widths/heights',()=>{
 for(const width of [360,393,412])for(const height of [320,700])for(const scale of [1,2]){
  const h=harness(),r=request({title:'Delete this card? '+ 'Long card name '.repeat(20),description:'7 history entries and 18 associated photos. '.repeat(15)}),t=h.dialog(r).surface;
  assert.ok(Math.min(400,width-48)<=width-48);assert.ok(height-48>0);const scroll=nodes(t).find(n=>n.type==='ScrollView');assert.equal(scroll.props.style.flexShrink,1);
  const texts=nodes(t).filter(n=>n.type==='Text');assert.ok(texts.some(n=>n.props.children===r.title));assert.ok(texts.some(n=>n.props.children===r.description));
  for(const n of texts){assert.equal(n.props.numberOfLines,undefined);assert.notEqual(n.props.allowFontScaling,false);}
  assert.equal(nodes(t).find(n=>n.props?.testID==='confirmation-surface').props.style.maxHeight,'100%');assert.ok(scale>=1);
 }
});

test('Outside tap and Android Back dismiss exactly once without invoking Delete',async()=>{
 for(const trigger of ['outside','back']){const h=harness();let dismiss=0,remove=0;const r=request({onDismiss:()=>dismiss++,actions:[{label:'Delete Card',role:'destructive',onPress:()=>remove++}]});
  const t=h.dialog(r);if(trigger==='outside'){const b=find(t.surface,'Dismiss confirmation');b.props.onPress();b.props.onPress();}else{t.wrapper.props.onRequestClose();t.wrapper.props.onRequestClose();}
  find(t.surface,'Delete Card').props.onPress();await tick();assert.equal(dismiss,1);assert.equal(remove,0);
 }
});

test('Cancel action followed by an already queued Back cannot call Cancel twice',async()=>{
 const h=harness();let count=0;const cancel=()=>count++,t=h.dialog(request({onDismiss:cancel,actions:[{label:'Cancel',role:'primary',onPress:cancel}]}));
 find(t.surface,'Cancel').props.onPress();t.wrapper.props.onRequestClose();find(t.surface,'Dismiss confirmation').props.onPress();await tick();assert.equal(count,1);
});

test('Async action remains mounted and locks repeated/stale taps and Back until caller completion',async()=>{
 const h=harness();let calls=0,dismiss=0,release;const wait=new Promise(r=>release=r),r=request({onDismiss:()=>dismiss++,actions:[{label:'Save',role:'primary',onPress:async()=>{calls++;await wait;}}]});
 let t=h.dialog(r);const stale=find(t.surface,'Save');stale.props.onPress();stale.props.onPress();t.wrapper.props.onRequestClose();assert.equal(calls,1);assert.equal(dismiss,0);
 t=h.dialog(r);assert.equal(find(t.surface,'Save').props.disabled,true);assert.equal(find(t.surface,'Save').props.accessibilityState.busy,true);assert.ok(nodes(t.surface).some(n=>n.type==='ActivityIndicator'));
 release();await tick();h.dialog(r);stale.props.onPress();assert.equal(calls,1);
});

test('Busy and per-action disabled values guard even manually invoked stale handlers',async()=>{
 const h=harness();let calls=0;const r=request({onDismiss:()=>calls++,actions:[{label:'Save',role:'primary',onPress:()=>calls++}]});const stale=h.dialog(r);h.dialog(r,{busy:true});find(stale.surface,'Save').props.onPress();stale.wrapper.props.onRequestClose();await tick();assert.equal(calls,0);
 const q=request({id:'disabled',actions:[{label:'Save',role:'primary',disabled:true,onPress:()=>calls++}]});find(h.dialog(q).surface,'Save').props.onPress();await tick();assert.equal(calls,0);
});

test('Unexpected callback error shows failure without success or automatic retry; Back stays safe',async()=>{
 const h=harness();let calls=0,dismiss=0;const r=request({onDismiss:()=>dismiss++,actions:[{label:'Delete Card',role:'destructive',onPress:async()=>{calls++;throw Error('synthetic');}}]});
 let t=h.dialog(r);find(t.surface,'Delete Card').props.onPress();await tick();t=h.dialog(r);assert.ok(nodes(t.surface).some(n=>n.props?.accessibilityRole==='alert'));find(t.surface,'Delete Card').props.onPress();assert.equal(calls,1);t.wrapper.props.onRequestClose();assert.equal(dismiss,1);
});

test('Dialog focuses a non-destructive title once and dismisses the keyboard',()=>{
 const h=harness(),t=h.dialog(request()),title=nodes(t.surface).find(n=>n.props?.accessibilityRole==='header');title.props.ref.current={native:'title'};title.props.onLayout();title.props.onLayout();assert.deepEqual(h.focus,[[title.props.ref.current,'focus']]);assert.equal(h.keyboard.length,1);
});

test('Create facade preserves Save/Discard/Cancel order and original callbacks; closed facade does not mount',()=>{
 const h=harness(),Facade=h.load('src/components/bemem/UnsavedChangesDialog.tsx').UnsavedChangesDialog,calls=[],p={visible:true,saving:false,onSave:()=>calls.push('save'),onDiscard:()=>calls.push('discard'),onCancel:()=>calls.push('cancel')};
 const t=h.render('facade',Facade,p);assert.deepEqual(t.props.request.actions.map(a=>a.label),['Save','Discard','Cancel']);t.props.request.actions.forEach(a=>a.onPress());assert.deepEqual(calls,['save','discard','cancel']);assert.equal(t.props.request.onDismiss,p.onCancel);assert.equal(h.render('facade',Facade,{...p,visible:false}),null);
});

test('Shared sheet mounts confirmation inside its existing Modal and Back targets it instead of closing editor',()=>{
 const h=harness(),Sheet=h.load('src/components/bemem/AddCardSheet.tsx').AddCardSheet;let dismissed=0,closed=0;const confirmation={content:{type:'InlineConfirmation',props:{}},onRequestClose:()=>dismissed++};
 const t=h.render('sheet',Sheet,{modalOnly:true,title:'Edit Card',onClose:()=>closed++,confirmation,children:null,footer:null});assert.equal(t.type,'Modal');assert.equal(nodes(t).filter(n=>n.type==='Modal').length,1);
 t.props.onRequestClose();assert.equal(dismissed,1);assert.equal(closed,0);assert.ok(nodes(t).some(n=>n.type==='InlineConfirmation'));assert.ok(nodes(t).some(n=>n.props?.importantForAccessibility==='no-hide-descendants'));const safe=nodes(t).find(n=>n.type==='KeyboardAvoidingView');assert.ok(nodes(safe).some(n=>n.type==='InlineConfirmation'));
});


test('A queued action from an unmounted confirmation cannot invoke its caller',async()=>{
 const h=harness();let calls=0;const r=request({onDismiss:()=>calls++,actions:[{label:'Delete Card',role:'destructive',onPress:()=>calls++}]}),t=h.dialog(r);
 h.unmount('surface-fixture');find(t.surface,'Delete Card').props.onPress();t.wrapper.props.onRequestClose();await tick();assert.equal(calls,0);
});
