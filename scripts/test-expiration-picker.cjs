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
 const react={useMemo:fn=>fn(),useState(v){const i=cursor++;if(!(i in slots))slots[i]=typeof v==='function'?v():v;return[slots[i],n=>{slots[i]=typeof n==='function'?n(slots[i]):n;}];},
  useRef(v){const i=cursor++;return slots[i]??={current:v};},useEffect(fn,deps){const i=cursor++,old=slots[i];if(!old||deps.some((d,j)=>d!==old.deps[j]))pending.push(()=>{old?.cleanup?.();slots[i]={deps,cleanup:fn()};});}};
 const jsx=(type,props)=>({type,props}),theme={core:tokens.core,lagoon:tokens.palettes['pearl-gray'].colors,lagoonTokens:tokens,lagoonFonts:{latin:'Manrope'},alpha:(c,a)=>c+Math.round(a*255).toString(16).padStart(2,'0')};
 class Value{stopAnimation(){}interpolate(value){return value;}}
 const native={AccessibilityInfo:{isReduceMotionEnabled:async()=>true,addEventListener:()=>({remove(){}})},Animated:{Value,View:'Animated.View',timing:()=>({start(){},stop(){}})},Easing:{cubic:'cubic',out:v=>v},...Object.fromEntries(['Modal','View','Pressable','ScrollView','Text','TextInput'].map(n=>[n,n])),Platform:{OS:'android'},Keyboard:{dismiss(){}},Alert:{alert(){assert.fail('No unrelated alert');}},StyleSheet:{create:s=>s,absoluteFill:{}},useWindowDimensions:()=>({fontScale:scale,width:320,height:700})};
 const deps={'@expo/ui/community/datetime-picker':{default:'NativeTimePicker',__esModule:true},react,'react/jsx-runtime':{jsx,jsxs:jsx},'react-native':native,'react-native-safe-area-context':{SafeAreaView:'SafeAreaView'},'../../constants/sheet-visual':require('./sheet-visual-fixture.cjs'),'../../constants/ci-theme':require('./ci-theme-fixture.cjs'),'../../constants/lagoon-theme':theme};
 for(const c of ['CardSheetModeSelector','GlassButton','AddCardIcon','AddCardText','CardAppearancePreview','CardArtworkControls','CardSizeCarousel','MembershipNumberScanner','ExpirationDatePicker'])deps['./'+c]={[c]:c};
 deps['./ExpirationDatePicker']={ExpirationDatePicker:'ExpirationDatePicker',ExpirationWheel:'ExpirationWheel'};
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
  let tree=h.render(),field=nodes(tree).find(n=>n.type==='CardSheetModeSelector');assert.equal(field.props.expiration,'2028-06');assert.equal(field.props.mode,'cardcode');
  field.props.onExpiration();tree=h.render();let picker=nodes(tree).find(n=>n.type==='ExpirationDatePicker');assert.equal(picker.props.value,'2028-06');picker.props.onCancel();assert.equal(updates.length,0);
  field=nodes(h.render()).find(n=>n.type==='CardSheetModeSelector');field.props.onExpiration();picker=nodes(h.render()).find(n=>n.type==='ExpirationDatePicker');picker.props.onConfirm('2028-06-15');assert.equal(updates.length,1);assert.equal(h.props.presentation.expiryMonth,'2028-06-15');
  field=nodes(h.render()).find(n=>n.type==='CardSheetModeSelector');assert.equal(field.props.expiration,'2028-06-15');field.props.onExpiration();picker=nodes(h.render()).find(n=>n.type==='ExpirationDatePicker');picker.props.onConfirm('');assert.equal(h.props.presentation.expiryMonth,'');
  assert.equal(nodes(h.render()).find(n=>n.type==='CardSheetModeSelector').props.expiration,'');assert.deepEqual(busy,[true,false,true,false,true,false]);
  assert.equal(nodes(h.render()).some(n=>String(n.props?.accessibilityLabel).includes('Code and color options')),false);
  for(const label of ['QR Code','Code 128','Slate card color','No gradient'])assert.equal(button(h.render(),label),undefined);h.unmount();
 }
 const source=fs.readFileSync(path.join(root,'src/components/bemem/AddCardForm.tsx'),'utf8');assert.doesNotMatch(source,/More options|Fewer options|setAdvanced|optionsLink|\badvanced\b/);
});


test('EXP + selector preserves full date labels and 48dp targets across representative widths and fonts',()=>{
 for(const width of [240,320,353,372,560])for(const scale of [1,1.5,2]){
  const selected=[],exp=[],h=ui('CardSheetModeSelector','CardSheetModeSelector',{width,mode:'cardcode',expiration:'2029-11-21',disabled:false,onChange:v=>selected.push(v),onExpiration:()=>exp.push(true)},scale);
  let t=h.render(),expiration=button(t,'Expiration date');assert.equal(expiration.props.children.props.children,'EXP 2029-11-21');assert.equal(expiration.props.children.type,'AddCardText');assert.equal(expiration.props.children.props.numberOfLines,undefined);assert.ok(expiration.props.style({pressed:false})[0].minHeight>=48);
  expiration.props.onPress();assert.deepEqual(exp,[true]);
  for(const label of ['Code+Card','Card 2 Side']){const b=button(t,label);assert.equal(b.props.children.type,'AddCardText');assert.ok(b.props.style[0].minHeight>=48);assert.equal(b.props.accessibilityState.checked,label==='Code+Card');b.props.onPress();}
  assert.deepEqual(selected,['cardcode','frontback']);const segment=button(t,'Card sheet display');assert.ok(segment.props.style[1].width>0);assert.equal(nodes(t).some(n=>n.type==='ScrollView'),false);assert.equal(t.props.style[0].flexWrap,'nowrap');
  h.props.mode='frontback';t=h.render();assert.equal(button(t,'Card 2 Side').props.accessibilityState.checked,true);
  h.props.disabled=true;t=h.render();assert.equal(button(t,'Expiration date').props.disabled,true);button(t,'Card 2 Side').props.onPress();assert.equal(selected.length,2);
  h.unmount();
 }
});

test('Shared Add/Edit selector changes only the controlled draft and busy state blocks changes',()=>{
 for(const mode of ['create','edit']){
  const updates=[],base={...logic('src/lib/card-presentation.ts').emptyCardPresentation(),sheetDisplayMode:'frontback'},h=ui('AddCardForm','AddCardForm',{mode,fullEditing:true,editCard:mode==='edit'?{appearance:{backgroundColor:'#263943',textColor:'#ffffff',imageAssetId:null}}:undefined,values:logic('src/lib/card-form.ts').emptyCardForm(),errors:{},presentation:base,onChange(){},onPresentationChange:v=>updates.push(v)});
  let selector=nodes(h.render()).find(n=>n.type==='CardSheetModeSelector');assert.equal(selector.props.mode,'frontback');selector.props.onChange('cardcode');assert.deepEqual(updates,[{...base,sheetDisplayMode:'cardcode'}]);assert.equal(base.sheetDisplayMode,'frontback');
  h.props.disabled=true;selector=nodes(h.render()).find(n=>n.type==='CardSheetModeSelector');selector.props.onChange('cardcode');assert.equal(updates.length,1);h.unmount();
 }
});






test('Measured full date and selector fit one row at normal Samsung content widths without fixed EXP width',()=>{
 const {cardFormRowLayout:layout}=logic('src/lib/card-form-row-layout.ts');
 for(const width of [320,353,372,560])for(const scale of [1,1.1,1.3])for(const exp of [28,99.25,104.5]){
  const g=layout(width,exp,65,71,scale);assert.equal(g.stacked,false);assert.ok(g.unit>=48);assert.equal(g.expWidth+g.gap+g.segmentWidth,width);
  assert.ok((exp-4)*g.expFontScale+4<=g.expContentWidth);assert.ok(67*g.modeFontScale+4<=g.optionContentWidth);assert.ok(g.expFontScale>=1);
 }
 assert.ok(layout(353,99.25,65,71).expWidth>56);assert.ok(layout(353,28,65,71).expWidth<layout(353,99.25,65,71).expWidth);
});

test('Narrow and unusually large-font fallback preserves readable full text without scrolling or overflow',()=>{
 const {cardFormRowLayout:layout}=logic('src/lib/card-form-row-layout.ts');
 for(const width of [200,240,280,320,353])for(const fontScale of [1,1.5,2,3]){
  const g=layout(width,99.25,65,71,fontScale);assert.ok(g.expWidth<=width);assert.ok(g.segmentWidth<=width);assert.ok(g.unit>=48);assert.ok(67*g.modeFontScale+4<=g.optionContentWidth);
  if(!g.stacked)assert.equal(g.expWidth+g.gap+g.segmentWidth,width);else assert.equal(g.segmentWidth,width);
 }
 assert.equal(layout(240,99.25,65,71).stacked,true);assert.equal(layout(320,99.25,65,71,2).stacked,true);
});

function measuredSelector(props){
 const h=ui('CardSheetModeSelector','CardSheetModeSelector',{...props,width:props.width??353,disabled:false,onChange(){},onExpiration(){}},props.fontScale??1);
 const measure=()=>{for(const p of nodes(h.render()).filter(n=>n.type==='AddCardText'&&n.props.onMeasure))p.props.onMeasure(p.props.children.startsWith('EXP ')?99.25:p.props.children==='EXP'?28:p.props.children==='Code+Card'?65:71);return h.render();};
 return{h,measure};
}
test('Visible EXP regression: populated dates always render the exact full date; clear returns EXP in the shared single row',()=>{
 for(const width of [320,353,372]){
  const {h,measure}=measuredSelector({width,mode:'cardcode',expiration:''});
  for(const expiration of ['', '2027-11-22','2027-11-21','2028-12-05',''])for(const mode of ['cardcode','frontback']){
   h.props.expiration=expiration;h.props.mode=mode;const tree=measure(),exp=button(tree,'Expiration date'),segment=button(tree,'Card sheet display'),expected=expiration?`EXP ${expiration}`:'EXP';
   assert.equal(exp.props.children.props.children,expected);if(expiration)assert.notEqual(exp.props.children.props.children,'EXP');
   assert.equal(exp.props.accessibilityValue.text,expiration||'No expiry');assert.equal(tree.props.style[0].flexDirection,'row');assert.equal(tree.props.style[1],false);assert.equal(nodes(tree).some(n=>n.type==='ScrollView'),false);
   const expStyle=exp.props.style({pressed:false});assert.equal(expStyle[1].width+tree.props.style[0].gap+segment.props.style[1].width,width);
   for(const label of ['Code+Card','Card 2 Side'])assert.equal(button(tree,label).props.children.props.children,label);
  }
  h.unmount();
 }
});

test('Actual Add/Edit form date selection, change, Cancel and Clear feed the full visible EXP button and original picker value',()=>{
 for(const mode of ['create','edit']){
  const base=logic('src/lib/card-presentation.ts').emptyCardPresentation(),initial=mode==='edit'?'2027-11-21':'',updates=[];
  const form=ui('AddCardForm','AddCardForm',{mode,fullEditing:true,editCard:mode==='edit'?{appearance:{backgroundColor:'#263943',textColor:'#ffffff',imageAssetId:null}}:undefined,values:logic('src/lib/card-form.ts').emptyCardForm(),errors:{},presentation:{...base,expiryMonth:initial},onChange(){},onPresentationChange:v=>{updates.push(v);form.props.presentation=v;}});
  const selector=()=>nodes(form.render()).find(n=>n.type==='CardSheetModeSelector');
  const visible=()=>{const s=measuredSelector(selector().props),t=s.measure(),label=button(t,'Expiration date').props.children.props.children;s.h.unmount();return label;};
  assert.equal(visible(),initial?`EXP ${initial}`:'EXP');
  for(const value of ['2027-11-22','2028-12-05','']){selector().props.onExpiration();let picker=nodes(form.render()).find(n=>n.type==='ExpirationDatePicker');assert.equal(picker.props.value,form.props.presentation.expiryMonth);picker.props.onCancel();assert.equal(visible(),form.props.presentation.expiryMonth?`EXP ${form.props.presentation.expiryMonth}`:'EXP');
   selector().props.onExpiration();picker=nodes(form.render()).find(n=>n.type==='ExpirationDatePicker');picker.props.onConfirm(value);assert.equal(visible(),value?`EXP ${value}`:'EXP');
  }
  assert.equal(updates.length,3);form.unmount();
 }
});

test('Reminder date reuses EXP wheels with reminder labels and exact calendar confirmation',()=>{
 const values=[],h=ui('ExpirationDatePicker','ExpirationDatePicker',{value:'2028-02-29',purpose:'reminder',onConfirm:v=>values.push(v),onCancel(){}});
 const tree=h.render();assert.ok(nodes(tree).some(n=>n.props?.children==='Reminder date'));button(tree,'Confirm reminder date').props.onPress();assert.deepEqual(values,['2028-02-29']);h.unmount();
});
for(const action of ['confirm','cancel','back','backdrop','unmount'])test('Native reminder time '+action+' stages local time without keyboard or competing native dialog',()=>{
 const values=[],cancelled=[],h=ui('ReminderTimePicker','ReminderTimePicker',{value:'08:05',onConfirm:v=>values.push(v),onCancel:()=>cancelled.push(true)});
 const tree=h.render(),picker=nodes(tree).find(n=>n.type==='NativeTimePicker');assert.equal(picker.props.mode,'time');assert.equal(picker.props.is24Hour,true);assert.equal(picker.props.presentation,'inline');assert.equal(picker.props.display,'default');assert.equal(picker.props.value.getHours(),8);assert.equal(picker.props.value.getMinutes(),5);
 const date=new Date(2028,5,15,23,7);picker.props.onChange({type:'set'},date);assert.deepEqual(values,[]);
 if(action==='confirm')button(tree,'Confirm reminder time').props.onPress();else if(action==='cancel')button(tree,'Cancel reminder time').props.onPress();else if(action==='back')tree.props.onRequestClose();else if(action==='backdrop')button(tree,'Cancel reminder time selection').props.onPress();else h.unmount();
 button(tree,'Confirm reminder time').props.onPress();tree.props.onRequestClose();assert.deepEqual(values,action==='confirm'?['23:07']:[]);assert.equal(cancelled.length,['cancel','back','backdrop'].includes(action)?1:0);h.unmount();
});

const calendar=logic('src/lib/reminder-calendar.ts');
test('Reminder calendar is Monday-first with exact leap-month cells and safe year navigation',()=>{
 for(const [year,month,offset,count] of [[2026,11,6,30],[2028,2,1,29],[2027,2,0,28],[1900,2,3,28],[2000,2,1,29]]){
  const cells=calendar.reminderMonthCells(year,month);assert.equal(cells.indexOf(`${year}-${String(month).padStart(2,'0')}-01`),offset);assert.equal(cells.filter(Boolean).length,count);assert.equal(cells.length%7,0);
 }
 assert.deepEqual(calendar.reminderMonth({year:2027,month:12,day:31},1),{year:2028,month:1,day:31});
 assert.deepEqual(calendar.reminderMonth({year:2028,month:3,day:31},-1),{year:2028,month:2,day:29});
});
test('Quick dates always use today, clamp calendar months and survive local timezone/DST boundaries',()=>{
 const previous=process.env.TZ;
 try{for(const zone of ['UTC','Asia/Bangkok','America/New_York','Pacific/Kiritimati']){process.env.TZ=zone;
  for(const [year,month,day,expected] of [[2027,1,31,'2027-02-28'],[2028,1,31,'2028-02-29'],[2028,12,31,'2029-01-31']]){
   const now=new Date(year,month-1,day,23,30);assert.equal(calendar.quickReminderDate(now,'month'),expected);assert.equal(calendar.quickReminderDate(now,'month'),expected);assert.equal(now.getDate(),day);
  }
  assert.equal(calendar.quickReminderDate(new Date(2027,2,13,23,30),'day'),'2027-03-14');assert.equal(calendar.quickReminderDate(new Date(2027,11,28,23,30),'week'),'2028-01-04');
  const initial=calendar.initialReminderSelection(new Date(2027,11,31,23,45));assert.deepEqual(initial,{date:'2028-01-01',time:'00:45'});
 }}finally{if(previous===undefined)delete process.env.TZ;else process.env.TZ=previous;}
});
function reminderUi(scale=1){let h;const chosen=[],times=[],busy=[];
 h=ui('ReminderScheduleFields','ReminderScheduleFields',{date:date.fullExpiration(calendar.localCalendarDate(new Date())),time:'08:05',disabled:false,onDateChange:value=>{chosen.push(value);h.props.date=value;},onTimeChange:value=>{times.push(value);h.props.time=value;},onBusy:value=>busy.push(value)},scale);
 return{h,chosen,times,busy};
}
const timeWheels=tree=>nodes(tree).filter(n=>n.type==='ExpirationWheel');
test('Inline calendar starts in local current month, highlights today, navigates and selects dates without a popup',()=>{
 const {h,chosen}=reminderUi(),now=new Date();let tree=h.render();assert.ok(nodes(tree).some(n=>n.props?.children?.[0]===date.EXPIRATION_MONTHS[now.getMonth()]));
 assert.deepEqual(nodes(tree).filter(n=>['MON','TUE','WED','THU','FRI','SAT','SUN'].includes(n.props?.children)).map(n=>n.props.children),['MON','TUE','WED','THU','FRI','SAT','SUN']);
 button(tree,'Next reminder month').props.onPress();tree=h.render();const next=calendar.reminderMonth(calendar.localCalendarDate(now),1),target=date.fullExpiration({...next,day:1});button(tree,'Reminder date '+target).props.onPress();assert.equal(chosen.at(-1),target);tree=h.render();assert.equal(button(tree,'Reminder date '+target).props.accessibilityState.selected,true);
 button(tree,'Previous reminder month').props.onPress();tree=h.render();assert.ok(nodes(tree).some(n=>n.props?.accessibilityLabel?.endsWith(', today')));assert.equal(nodes(tree).some(n=>n.type==='Modal'||n.type==='NativeTimePicker'),false);h.unmount();
});
test('Shortcuts update selected date and displayed month once, preserving selected time',()=>{
 for(const unit of ['day','week','month']){const {h,chosen,times}=reminderUi();button(h.render(),'+1 '+unit).props.onPress();const expected=calendar.quickReminderDate(new Date(),unit);button(h.render(),'+1 '+unit).props.onPress();assert.deepEqual(chosen,[expected,expected]);assert.equal(times.length,0);assert.ok(nodes(h.render()).some(n=>n.props?.accessibilityLabel?.startsWith('Reminder date '+expected)));h.unmount();}
});
test('Inline Hour/Minute wheels have 24/60 values, centered 48dp+ rows, synchronous combined changes and Save gating',()=>{
 for(const scale of [1,1.5,2]){const {h,times,busy}=reminderUi(scale);let tree=h.render(),[hour,minute]=timeWheels(tree);assert.equal(hour.props.values.length,24);assert.equal(minute.props.values.length,60);assert.equal(hour.props.values[0].text,'00');assert.equal(minute.props.values.at(-1).text,'59');assert.ok(hour.props.rowHeight>=48);assert.ok(minute.props.rowHeight>=48);
 hour.props.onBusy(true);minute.props.onBusy(true);hour.props.onBusy(false);assert.equal(busy.at(-1),true);minute.props.onBusy(false);assert.equal(busy.at(-1),false);
 hour.props.onChange(23);minute.props.onChange(59);assert.deepEqual(times,['23:05','23:59']);tree=h.render();assert.equal(timeWheels(tree)[0].props.value,23);assert.equal(timeWheels(tree)[1].props.value,59);
 const real=ui('ExpirationDatePicker','ExpirationWheel',timeWheels(tree)[1].props,scale),scroll=nodes(real.render()).find(n=>n.props?.snapToInterval);scroll.props.onScrollBeginDrag();scroll.props.onScrollEndDrag(event(7.2*minute.props.rowHeight));real.idle();assert.equal(times.at(-1),'23:07');real.unmount();h.unmount();
 const count=times.length;minute.props.onChange(4);assert.equal(times.length,count);
 }
});

test('Reference Time presentation shares snapping logic while EXP keeps its original labels and metrics',()=>{
 const props={label:'Hour',values:[{value:0,text:'00'},{value:1,text:'01'}],value:0,rowHeight:52,onChange(){},onBusy(){}};
 for(const appearance of [undefined,'reminder']){const h=ui('ExpirationDatePicker','ExpirationWheel',{...props,appearance}),tree=h.render();assert.equal(nodes(tree).some(n=>n.props?.children==='Hour'),appearance===undefined);const scroll=nodes(tree).find(n=>n.props?.snapToInterval);assert.equal(scroll.props.snapToInterval,52);assert.equal(scroll.props.nestedScrollEnabled,true);h.unmount();}
 const {h}=reminderUi(),tree=h.render();assert.equal(timeWheels(tree).every(w=>w.props.appearance==='reminder'),true);assert.ok(nodes(tree).some(n=>n.props?.children==='Time'));assert.ok(nodes(tree).some(n=>n.type==='AddCardIcon'&&n.props.name==='clock'));assert.equal(nodes(tree).filter(n=>n.type==='AddCardIcon'&&n.props.name==='calendar').length,3);h.unmount();
});
