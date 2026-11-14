const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),cache=new Map(),tokens=require('../design-system/bemem-lagoon-glass-rc2/TOKENS.json');
function logic(relative){const file=path.resolve(root,relative);if(cache.has(file))return cache.get(file).exports;const m={exports:{}};cache.set(file,m);
 const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInThisContext(`(function(require,module,exports){${code}\n})`)(n=>{assert.ok(n.startsWith('.'),'No storage/native/network calls');return logic(path.resolve(path.dirname(file),n+'.ts'));},m,m.exports);return m.exports;}
const date=logic('src/lib/expiration-date.ts');
function nodes(t,out=[]){if(!t||typeof t!=='object')return out;if(Array.isArray(t)){t.forEach(n=>nodes(n,out));return out;}out.push(t);nodes(t.props?.children,out);return out;}
function ui(file,name,props,scale=1){
 const slots=[],pending=[],timers=new Map(),scrolls=[];let cursor=0,timer=0;
 const react={useState(v){const i=cursor++;if(!(i in slots))slots[i]=typeof v==='function'?v():v;return[slots[i],n=>{slots[i]=typeof n==='function'?n(slots[i]):n;}];},
  useRef(v){const i=cursor++;return slots[i]??={current:v};},useEffect(fn,deps){const i=cursor++,old=slots[i];if(!old||deps.some((d,j)=>d!==old.deps[j]))pending.push(()=>{old?.cleanup?.();slots[i]={deps,cleanup:fn()};});}};
 const jsx=(type,props)=>({type,props}),theme={core:tokens.core,lagoon:tokens.palettes['pearl-gray'].colors,lagoonTokens:tokens,lagoonFonts:{latin:'Manrope'},alpha:(c,a)=>c+Math.round(a*255).toString(16).padStart(2,'0')};
 const native={...Object.fromEntries(['Modal','View','Pressable','ScrollView','Text','TextInput'].map(n=>[n,n])),Keyboard:{dismiss(){}},Alert:{alert(){assert.fail('No unrelated alert');}},StyleSheet:{create:s=>s,absoluteFill:{}},useWindowDimensions:()=>({fontScale:scale,width:320,height:700})};
 const deps={react,'react/jsx-runtime':{jsx,jsxs:jsx},'react-native':native,'react-native-safe-area-context':{SafeAreaView:'SafeAreaView'},'../../constants/sheet-visual':require('./sheet-visual-fixture.cjs'),'../../constants/ci-theme':require('./ci-theme-fixture.cjs'),'../../constants/lagoon-theme':theme};
 for(const c of ['GlassButton','AddCardIcon','AddCardText','CardAppearancePreview','CardArtworkControls','MembershipNumberScanner','ExpirationDatePicker'])deps['./'+c]={[c]:c};
 const m={exports:{}},code=ts.transpileModule(fs.readFileSync(path.join(root,'src/components/bemem',file+'.tsx'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInThisContext(`(function(require,module,exports,setTimeout,clearTimeout){${code}\n})`)(n=>{
  if(deps[n])return deps[n];if(n.startsWith('../../lib/'))return logic('src/lib/'+n.split('/').at(-1)+'.ts');if(n==='./add-card-layout')return logic('src/components/bemem/add-card-layout.ts');throw Error('Unexpected dependency '+n);
 },m,m.exports,fn=>{const id=++timer;timers.set(id,fn);return id;},id=>timers.delete(id));
 const h={props,scrolls,render(){cursor=0;const t=m.exports[name](h.props);for(const n of nodes(t))if(n.type==='ScrollView'&&n.props.ref)n.props.ref.current={scrollTo:v=>scrolls.push(v)};while(pending.length)pending.shift()();return t;},
  idle(){const callbacks=[...timers.values()];timers.clear();callbacks.forEach(fn=>fn());},unmount(){for(const s of slots)s?.cleanup?.();},timerCount:()=>timers.size};return h;
}
const button=(t,label)=>nodes(t).find(n=>n.props?.accessibilityLabel===label);
const wheels=t=>nodes(t).filter(n=>typeof n.type==='function'&&n.props.label);
const event=y=>({nativeEvent:{contentOffset:{y}}});

test('Calendar validation handles all month lengths, century leap years and exact strings',()=>{
 for(const [year,days]of [[2028,29],[2027,28],[1900,28],[2000,29],[2100,28],[2400,29]])assert.equal(date.monthDays(year,2),days);
 for(const month of [4,6,9,11])assert.equal(date.monthDays(2028,month),30);
 for(const month of [1,3,5,7,8,10,12])assert.equal(date.monthDays(2028,month),31);
 for(const value of ['', '2028-02','2028-02-29','2028-06-15','0001-01-01','9999-12-31'])assert.equal(date.expirationDateError(value),undefined);
 for(const value of ['2027-02-29','1900-02-29','2028-04-31','2028-01-00','2028-13-01','0000-01-01','2028-6-1',' 2028-06-15','2028-06-15T00:00:00Z'])assert.ok(date.expirationDateError(value),value);
 assert.throws(()=>date.fullExpiration({year:2027,month:2,day:29}));
});
test('Month/year clamping and legacy provisional selection never invent a persisted date',()=>{
 assert.deepEqual(date.clampCalendarDate({year:2028,month:2,day:31}),{year:2028,month:2,day:29});
 assert.deepEqual(date.clampCalendarDate({year:2027,month:2,day:29}),{year:2027,month:2,day:28});
 assert.deepEqual(date.clampCalendarDate({year:2028,month:4,day:31}),{year:2028,month:4,day:30});
 const today={year:2026,month:11,day:12};assert.deepEqual(date.initialExpiration('',today),today);
 assert.deepEqual(date.initialExpiration('1999-06',today),{year:1999,month:6,day:1});assert.equal(date.parseExpiration('1999-06').day,null);
 for(const year of [1,1990,9999]){const years=date.expirationYears(2026,year);assert.ok(years.includes(year)&&years.includes(2026)&&years.includes(2076));assert.equal(new Set(years).size,years.length);}
});
test('Full dates round-trip unchanged across timezone settings without timestamp conversion',()=>{
 const previous=process.env.TZ;
 try{for(const zone of ['UTC','Asia/Bangkok','America/Los_Angeles','Pacific/Kiritimati']){process.env.TZ=zone;for(const value of ['2028-06-15','2028-02-29','0001-01-01','9999-12-31'])assert.equal(date.fullExpiration(date.parseExpiration(value)),value);}}
 finally{if(previous===undefined)delete process.env.TZ;else process.env.TZ=previous;}
});

test('Picker presents Day/Month/Year with centered independent native snapping wheels, including out-of-range saved years',()=>{
 for(const scale of [1,1.5,2]){
  const h=ui('ExpirationDatePicker','ExpirationDatePicker',{value:'0001-06',onCancel(){},onConfirm(){assert.fail('No automatic update');}},scale),tree=h.render(),list=wheels(tree);
  assert.deepEqual(list.map(w=>w.props.label),['Day','Month','Year']);assert.deepEqual(list.map(w=>w.props.value),[1,6,1]);
  assert.equal(list[0].props.values.length,30);assert.deepEqual(list[1].props.values.map(v=>v.text),date.EXPIRATION_MONTHS);assert.ok(list[2].props.values.some(v=>v.value===1));
  for(const wheel of list){const w=ui('ExpirationDatePicker','ExpirationWheel',wheel.props,scale),rendered=w.render(),scroll=nodes(rendered).find(n=>n.props?.snapToInterval);
   assert.ok(scroll.props.snapToInterval>=48);assert.equal(scroll.props.decelerationRate,'fast');assert.equal(scroll.props.contentContainerStyle.paddingVertical,scroll.props.snapToInterval);
   assert.equal(scroll.props.nestedScrollEnabled,true);w.unmount();}
  h.unmount();
 }
});
test('Wheel settles fast momentum and slow drags to a valid centered row and cancels timers on teardown',()=>{
 const changed=[],busy=[],h=ui('ExpirationDatePicker','ExpirationWheel',{label:'Day',values:Array.from({length:31},(_,i)=>({value:i+1,text:String(i+1)})),value:1,rowHeight:52,onChange:v=>changed.push(v),onBusy:v=>busy.push(v)});
 let scroll=nodes(h.render()).find(n=>n.props?.snapToInterval);scroll.props.onScrollBeginDrag();scroll.props.onScrollEndDrag(event(3.3*52));h.idle();assert.equal(changed.at(-1),4);assert.equal(h.scrolls.at(-1).y,3*52);
 scroll=nodes(h.render()).find(n=>n.props?.snapToInterval);scroll.props.onScrollBeginDrag();scroll.props.onMomentumScrollBegin();scroll.props.onScroll(event(30*52));scroll.props.onMomentumScrollEnd(event(30*52));assert.equal(changed.at(-1),31);assert.equal(busy.at(-1),false);
 scroll.props.onScrollEndDrag(event(1));assert.ok(h.timerCount()>0);h.unmount();assert.equal(h.timerCount(),0);
});
test('Confirm clamps day after month/year changes; Clear, Cancel, backdrop and Android Back are explicit one-shot actions',()=>{
 for(const action of ['confirm','clear','cancel','back','backdrop']){
  const results=[],cancelled=[],h=ui('ExpirationDatePicker','ExpirationDatePicker',{value:'2028-01-31',onConfirm:v=>results.push(v),onCancel:()=>cancelled.push(true)});
  let tree=h.render();wheels(tree).find(w=>w.props.label==='Month').props.onChange(2);tree=h.render();assert.equal(wheels(tree)[0].props.value,29);
  wheels(tree).find(w=>w.props.label==='Year').props.onChange(2027);tree=h.render();assert.equal(wheels(tree)[0].props.value,28);assert.deepEqual(results,[]);
  if(action==='back')tree.props.onRequestClose();else button(tree,{confirm:'Confirm expiration date',clear:'Clear expiration date',cancel:'Cancel expiration date',backdrop:'Cancel expiration selection'}[action]).props.onPress();
  tree.props.onRequestClose();assert.deepEqual(results,action==='confirm'?['2027-02-28']:action==='clear'?['']:[]);assert.equal(cancelled.length,['cancel','back','backdrop'].includes(action)?1:0);h.unmount();
 }
});
test('Confirm is gated synchronously while wheels move; parent scrolling cannot compete with a wheel gesture',()=>{
 const results=[],h=ui('ExpirationDatePicker','ExpirationDatePicker',{value:'2028-06-15',onConfirm:v=>results.push(v),onCancel(){}}),old=h.render();
 wheels(old)[0].props.onBusy(true);button(old,'Confirm expiration date').props.onPress();assert.deepEqual(results,[]);
 let tree=h.render();assert.equal(button(tree,'Confirm expiration date').props.disabled,true);assert.equal(nodes(tree).find(n=>n.type==='ScrollView').props.scrollEnabled,false);
 wheels(tree)[0].props.onChange(16);wheels(tree)[0].props.onBusy(false);tree=h.render();button(tree,'Confirm expiration date').props.onPress();assert.deepEqual(results,['2028-06-16']);h.unmount();
});

test('Shared Add/Edit EXP is pressable, not a keyboard field; cancellation preserves legacy text and explicit confirmation/clear only update the form',()=>{
 for(const mode of ['create','edit']){
  const updates=[],busy=[];let h;h=ui('AddCardForm','AddCardForm',{mode,values:{...logic('src/lib/card-form.ts').emptyCardForm(),name:'Test',memberNumber:'001',payload:'001'},
   editCard:mode==='edit'?{appearance:{backgroundColor:'#263943',textColor:'#ffffff',imageAssetId:null}}:undefined,
   fullEditing:true,errors:{},presentation:{...logic('src/lib/card-presentation.ts').emptyCardPresentation(),expiryMonth:'2028-06'},onChange(){},onImageBusy:v=>busy.push(v),onPresentationChange:p=>{updates.push(p);h.props.presentation=p;}});
  let tree=h.render(),field=button(tree,'Expiration date');assert.equal(field.type,'Pressable');assert.equal(field.props.children[0].props.children,'EXP 2028-06');assert.equal(field.props.onChangeText,undefined);
  field.props.onPress();tree=h.render();let picker=nodes(tree).find(n=>n.type==='ExpirationDatePicker');assert.equal(picker.props.value,'2028-06');picker.props.onCancel();assert.equal(updates.length,0);
  field=button(h.render(),'Expiration date');field.props.onPress();picker=nodes(h.render()).find(n=>n.type==='ExpirationDatePicker');picker.props.onConfirm('2028-06-15');assert.equal(updates.length,1);assert.equal(h.props.presentation.expiryMonth,'2028-06-15');
  field=button(h.render(),'Expiration date');assert.equal(field.props.children[0].props.children,'EXP 2028-06-15');field.props.onPress();picker=nodes(h.render()).find(n=>n.type==='ExpirationDatePicker');picker.props.onConfirm('');assert.equal(h.props.presentation.expiryMonth,'');
  assert.equal(button(h.render(),'Expiration date').props.children[0].props.children,'EXP YYYY-MM-DD');assert.deepEqual(busy,[true,false,true,false,true,false]);
  assert.equal(nodes(h.render()).some(n=>String(n.props?.accessibilityLabel).includes('Code and color options')),false);
  for(const label of ['QR Code','Code 128','Slate card color','No gradient'])assert.equal(button(h.render(),label),undefined);h.unmount();
 }
 const source=fs.readFileSync(path.join(root,'src/components/bemem/AddCardForm.tsx'),'utf8');assert.doesNotMatch(source,/More options|Fewer options|setAdvanced|optionsLink|\badvanced\b/);
});
