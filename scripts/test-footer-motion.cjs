// Native-view and worklet contract simulation. No device FPS or raster decode measurements.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const root=path.resolve(__dirname,'..');
function nodes(t,out=[]){if(!t||typeof t!=='object')return out;if(Array.isArray(t)){t.forEach(n=>nodes(n,out));return out;}out.push(t);nodes(t.props?.children,out);return out;}
function ui(file,name,props,options={}){
 const slots=[],effects=[],animations=[],cancelled=[],listeners=new Set(),timers=new Map(),values=[];let cursor=0,stateWrites=0,timerId=0;
 const react={useRef(v){const i=cursor++;return slots[i]??={current:v};},useState(v){const i=cursor++;if(!(i in slots))slots[i]=typeof v==='function'?v():v;return[slots[i],value=>{stateWrites++;slots[i]=typeof value==='function'?value(slots[i]):value;}];},useImperativeHandle(ref,create){if(ref)ref.current=create();},useEffect(fn,deps){const i=cursor++,old=slots[i];if(!old||deps.some((v,j)=>v!==old.deps[j]))effects.push(()=>{old?.cleanup?.();slots[i]={deps,cleanup:fn()};});}};
 const jsx=(type,props)=>({type,props});
 const native={View:'View',Text:'Text',Pressable:'Pressable',StyleSheet:{create:s=>s,hairlineWidth:1},Keyboard:{dismiss(){}},AccessibilityInfo:{isReduceMotionEnabled:()=>options.preference??Promise.resolve(false),addEventListener:(_event,callback)=>{listeners.add(callback);return{remove:()=>listeners.delete(callback)};}}};
 const reanimated={__esModule:true,default:{View:'Animated.View',Text:'Animated.Text'},useSharedValue:initial=>{const ref=react.useRef(null);if(!ref.current){let value=initial;ref.current={pending:null,get value(){return value;},set value(next){if(next?.timing){this.pending=next;}else{this.pending=null;value=next;}}};values.push(ref.current);}return ref.current;},useAnimatedStyle:fn=>({evaluate:fn}),cancelAnimation:value=>{cancelled.push(value);value.pending=null;},withTiming:(value,config,...callbacks)=>{assert.equal(callbacks.length,0);animations.push({value,...config});return options.deferred?{timing:true,value}:value;},interpolateColor:(v,_range,colors)=>colors[v>=.5?1:0],Easing:{cubic:'cubic',out:value=>`out(${value})`}};
 const deps={react,'react/jsx-runtime':{jsx,jsxs:jsx},'react-native':native,'react-native-reanimated':reanimated,'../../constants/ci-theme':require('./ci-theme-fixture.cjs'),'./FooterIcon':{FooterIcon:'FooterIcon'},'./FooterMotion':{FooterItemVisual:'FooterItemVisual',CanvasSelectionPill:'CanvasSelectionPill',CanvasSelectorVisual:'CanvasSelectorVisual',footerVisual:{duration:200}},'../../lib/footer-navigation':{footerCanvasChoices:(_page,access)=>access.map(a=>({...a,kind:a.kind??'select',disabled:a.disabled??false}))}};
 const source=fs.readFileSync(path.join(root,'src/components/bemem',file+'.tsx'),'utf8'),m={exports:{}};
 const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 vm.runInThisContext(`(function(require,module,exports,setTimeout,clearTimeout){${code}\n})`)(name=>{assert.ok(deps[name],'Unexpected native/storage import '+name);return deps[name];},m,m.exports,(fn,delay)=>{assert.equal(delay,200);const id=++timerId;timers.set(id,fn);return id;},id=>timers.delete(id));
 const h={props,animations,cancelled,listeners,values,timerCallbacks:()=>[...timers.values()],finishAnimations(){for(const value of values){if(value.pending)value.value=value.pending.value;}},timerCount:()=>timers.size,flushTimers(){const pending=[...timers.values()];timers.clear();pending.forEach(fn=>fn());},stateWrites:()=>stateWrites,render(){cursor=0;const tree=m.exports[name](h.props);while(effects.length)effects.shift()();return tree;},reduce(value){listeners.forEach(fn=>fn(value));},unmount(){for(const slot of slots)slot?.cleanup?.();}};return h;
}
test('Footer icons use only native vector primitives, one 24dp grid and no image/font/emoji dependency',()=>{
 const signatures=[];
 for(const name of ['decorate','create','home','canvas','add']){
  const h=ui('FooterIcon','FooterIcon',{name,color:'#58747A'}),tree=h.render();assert.equal(tree.props.style.width,24);assert.equal(tree.props.style.height,24);assert.equal(tree.props.pointerEvents,'none');assert.equal(tree.props.accessible,false);assert.ok(nodes(tree).every(n=>n.type==='View'||!n.type));
  signatures.push(JSON.stringify(tree));if(name==='home'){h.props.filled=true;assert.notDeepEqual(h.render(),tree);}h.unmount();
 }
 assert.equal(new Set(signatures).size,5);
});
test('Active icon/color and press feedback use 200ms timing without React state updates per frame',()=>{
 const ref={current:null},h=ui('FooterMotion','FooterItemVisual',{name:'home',label:'Home',active:true,disabled:false,reduced:false,width:70,ref});let tree=h.render();
 assert.equal(nodes(tree).filter(n=>n.type==='FooterIcon').length,2);const label=nodes(tree).find(n=>n.type==='Animated.Text');assert.equal(label.props.children,'Home');assert.equal(label.props.numberOfLines,undefined);assert.equal(label.props.allowFontScaling,undefined);
 ref.current.press(true);assert.equal(h.animations.at(-1).value,.95);assert.equal(h.animations.at(-1).duration,200);ref.current.press(false);assert.equal(h.animations.at(-1).value,1);
 h.props.active=false;tree=h.render();assert.equal(h.animations.at(-1).value,0);assert.equal(h.animations.at(-1).duration,200);assert.equal(h.stateWrites(),0);h.unmount();assert.ok(h.cancelled.length>=2);
});
test('Reduce Motion and disabled controls remove decorative scale and use immediate active changes',()=>{
 for(const disabled of [false,true]){const ref={current:null},h=ui('FooterMotion','FooterItemVisual',{name:'add',label:'Add Card',active:false,disabled,reduced:true,width:62,ref});h.render();ref.current.press(true);assert.equal(h.animations.at(-1).value,1);assert.equal(h.animations.at(-1).duration,0);h.props.active=true;h.render();assert.equal(h.animations.at(-1).duration,0);h.unmount();}
 const ref={current:null},h=ui('FooterMotion','FooterItemVisual',{name:'home',label:'Home',active:false,disabled:true,reduced:false,width:62,ref});h.render();ref.current.press(true);assert.equal(h.animations.at(-1).value,1);h.unmount();
});
test('Canvas pill follows confirmed page, snaps safely on resize and respects Reduce Motion',()=>{
 const h=ui('FooterMotion','CanvasSelectionPill',{page:3,width:360,reduced:false});h.render();h.props.page=2;let tree=h.render();assert.equal(h.animations.at(-1).duration,200);assert.equal(h.animations.at(-1).value,360/5);assert.equal(tree.props.pointerEvents,'none');
 for(const width of [320,393,412]){h.props.width=width;tree=h.render();assert.equal(h.animations.at(-1).duration,0);assert.equal(h.animations.at(-1).value,width/5);}
 h.props.reduced=true;h.props.page=1;h.render();assert.equal(h.animations.at(-1).duration,0);h.unmount();assert.ok(h.cancelled.length);
});
test('Footer listens to live Android Reduce Motion changes, starts conservatively and releases its listener',async()=>{
 const h=ui('ContextualFooter','ContextualFooter',{mode:'Home',page:1,destinations:[],onPage(){}});let tree=h.render();assert.equal(nodes(tree).find(n=>n.type==='FooterItemVisual').props.reduced,true);await Promise.resolve();tree=h.render();assert.equal(nodes(tree).find(n=>n.type==='FooterItemVisual').props.reduced,false);
 h.reduce(true);tree=h.render();assert.equal(nodes(tree).find(n=>n.type==='FooterItemVisual').props.reduced,true);assert.equal(h.listeners.size,1);h.unmount();assert.equal(h.listeners.size,0);
});

test('Canvas selection closes admission immediately, animates only confirmed page and cleans its short presentation tail',async()=>{
 for(const accepted of [false,true]){const requested=[],ref={current:null},h=ui('ContextualFooter','ContextualFooter',{mode:'Home',page:1,destinations:[1,2,3,4,5].map(page=>({page})),ref,onPage:page=>{requested.push(page);if(accepted)h.props.page=page;}});
 const find=(tree,label)=>nodes(tree).find(n=>n.props?.accessibilityLabel===label);h.render();await Promise.resolve();let tree=h.render();find(tree,'Canvas 1. Choose canvas').props.onPress();tree=h.render();const choose=find(tree,'Canvas 2').props.onPress;choose();choose();assert.deepEqual(requested,[2]);tree=h.render();
 const capsule=find(tree,'Canvas page choices');assert.equal(capsule.props.pointerEvents,'none');assert.equal(capsule.props.accessibilityElementsHidden,true);assert.equal(nodes(capsule).find(n=>n.type==='CanvasSelectionPill').props.page,accepted?2:1);assert.equal(h.timerCount(),1);h.flushTimers();assert.equal(find(h.render(),'Canvas page choices'),undefined);
 find(h.render(),'Canvas '+(accepted?2:1)+'. Choose canvas').props.onPress();tree=h.render();find(tree,'Canvas 3').props.onPress();assert.equal(h.timerCount(),1);h.reduce(true);h.render();assert.equal(h.timerCount(),0);h.unmount();assert.equal(h.timerCount(),0);
 }
});

test('Fresh selector fades only opacity from 0 to 1 in 120ms cubic-out, without business callbacks',()=>{
 const h=ui('FooterMotion','CanvasSelectorVisual',{reduced:false,style:{padding:4},pointerEvents:'auto',accessibilityLabel:'Canvas page choices',children:'selector'},{deferred:true});
 const tree=h.render(),motion=tree.props.style[1];assert.equal(tree.type,'Animated.View');assert.equal(h.values[0].value,0);assert.deepEqual(motion.evaluate(),{opacity:0});
 assert.deepEqual(h.animations,[{value:1,duration:120,easing:'out(cubic)'}]);assert.equal(tree.props.pointerEvents,'auto');assert.equal(tree.props.children,'selector');assert.equal(tree.props.accessibilityLabel,'Canvas page choices');
 h.finishAnimations();assert.deepEqual(motion.evaluate(),{opacity:1});assert.equal(h.stateWrites(),0);h.unmount();assert.ok(h.cancelled.includes(h.values[0]));
 const fresh=ui('FooterMotion','CanvasSelectorVisual',{reduced:false},{deferred:true});fresh.render();assert.equal(fresh.values[0].value,0);assert.equal(fresh.animations.length,1);fresh.unmount();
});

test('Unknown/enabled preference appears immediately; a late preference must never replay entry',()=>{
 for(const reduced of [true,false]){
  const h=ui('FooterMotion','CanvasSelectorVisual',{reduced},{deferred:true});h.render();assert.equal(h.values[0].value,reduced?1:0);
  const count=h.animations.length;h.props.reduced=false;h.render();h.props.children='updated confirmed page';h.render();assert.equal(h.animations.length,count);
  h.props.reduced=true;h.render();assert.equal(h.values[0].value,1);assert.equal(h.values[0].pending,null);h.props.reduced=false;h.render();assert.equal(h.animations.length,count);h.finishAnimations();assert.equal(h.values[0].value,1);h.unmount();
 }
});

test('Unmount during entry cancels pending visual work; remount cannot receive old completion',()=>{
 const old=ui('FooterMotion','CanvasSelectorVisual',{reduced:false},{deferred:true});old.render();old.unmount();assert.equal(old.values[0].pending,null);
 const next=ui('FooterMotion','CanvasSelectorVisual',{reduced:false},{deferred:true});next.render();old.finishAnimations();assert.equal(next.values[0].value,0);next.finishAnimations();assert.equal(next.values[0].value,1);next.unmount();
});

const find=(tree,label)=>nodes(tree).find(n=>n.props?.accessibilityLabel===label);
const footerProps=extra=>({mode:'Home',page:1,destinations:[1,2,3,4,5].map(page=>({page})),onPage(){},...extra});

test('Only mounted selector receives entry visual; all modes keep five slots, immediate admission and disabled guards',async()=>{
 for(const mode of ['Home','Create','Decorate']){
  const requested=[],ref={current:null},h=ui('ContextualFooter','ContextualFooter',footerProps({mode,ref,onPage:page=>requested.push(page),destinations:[{page:1},{page:2},{page:3,disabled:true}]}));
  h.render();await Promise.resolve();let tree=h.render();assert.equal(find(tree,'Canvas page choices'),undefined);assert.equal(find(tree,'Main navigation').type,'View');assert.equal(find(tree,'Main navigation').props.children.length,5);
  ref.current.toggle();tree=h.render();const selector=find(tree,'Canvas page choices');assert.equal(selector.type,'CanvasSelectorVisual');assert.equal(selector.props.reduced,false);assert.equal(selector.props.pointerEvents,'auto');assert.equal(selector.props.accessibilityElementsHidden,false);
  const visual=ui('FooterMotion','CanvasSelectorVisual',selector.props,{deferred:true});visual.render();assert.equal(visual.values[0].value,0);
  const blocked=find(tree,'Canvas 3');assert.equal(blocked.props.disabled,true);blocked.props.onPress();assert.deepEqual(requested,[]);
  const tap=find(tree,'Canvas 2').props.onPress;tap();tap();assert.deepEqual(requested,[2]);assert.equal(visual.values[0].value,0);visual.finishAnimations();assert.deepEqual(requested,[2]);assert.equal(h.timerCount(),1);h.unmount();visual.unmount();assert.equal(h.timerCount(),0);
 }
});

test('Reopen preserves the mounted entry/tail visual; a stale tail cannot end a newer presentation',async()=>{
 const requested=[],ref={current:null},h=ui('ContextualFooter','ContextualFooter',footerProps({ref,onPage:page=>requested.push(page)}));h.render();await Promise.resolve();h.render();ref.current.toggle();
 let tree=h.render();const visual=ui('FooterMotion','CanvasSelectorVisual',find(tree,'Canvas page choices').props,{deferred:true});visual.render();visual.values[0].value=.4;
 find(tree,'Canvas 2').props.onPress();tree=h.render();const stale=h.timerCallbacks()[0];assert.equal(find(tree,'Canvas page choices').props.pointerEvents,'none');
 ref.current.toggle();tree=h.render();visual.props=find(tree,'Canvas page choices').props;visual.render();assert.equal(visual.values[0].value,.4);assert.equal(visual.animations.length,1);assert.equal(visual.props.pointerEvents,'auto');assert.equal(h.timerCount(),0);assert.deepEqual(requested,[2]);
 stale();assert.ok(find(h.render(),'Canvas page choices'));find(h.render(),'Canvas 3').props.onPress();const latest=h.timerCallbacks()[0];stale();assert.equal(h.timerCount(),1);assert.ok(find(h.render(),'Canvas page choices'));latest();assert.equal(find(h.render(),'Canvas page choices'),undefined);
 visual.unmount();h.unmount();assert.deepEqual(requested,[2,3]);
});

test('Back/outside imperative dismissal and safety changes unmount immediately, without an exit timer',async()=>{
 for(const reason of ['Back','Outside','disabled','saving','actionsBlocked','page','mode','access']){
  const ref={current:null},h=ui('ContextualFooter','ContextualFooter',footerProps({ref,onPage(){assert.fail('dismiss must not navigate');}}));h.render();await Promise.resolve();h.render();ref.current.toggle();h.render();
  if(reason==='Back'||reason==='Outside')assert.equal(ref.current.dismiss(),true);
  else if(reason==='page')h.props.page=2;
  else if(reason==='mode')h.props.mode='Create';
  else if(reason==='access')h.props.destinations=[{page:1,kind:'locked'}];
  else h.props[reason]=true;
  h.render();assert.equal(find(h.render(),'Canvas page choices'),undefined);assert.equal(h.timerCount(),0);assert.equal(ref.current.dismiss(),false);h.unmount();
 }
});

test('New Reduce Motion event wins over old Promise, including unknown preference and unmount',async()=>{
 let resolve;const preference=new Promise(done=>{resolve=done;}),ref={current:null};
 const h=ui('ContextualFooter','ContextualFooter',footerProps({ref}),{preference});h.render();ref.current.toggle();let tree=h.render();assert.equal(find(tree,'Canvas page choices').props.reduced,true);
 const visual=ui('FooterMotion','CanvasSelectorVisual',find(tree,'Canvas page choices').props,{deferred:true});visual.render();assert.equal(visual.values[0].value,1);
 h.reduce(true);resolve(false);await Promise.resolve();tree=h.render();assert.equal(find(tree,'Canvas page choices').props.reduced,true);assert.equal(visual.animations.length,0);h.unmount();visual.unmount();
 let late;const abandoned=ui('ContextualFooter','ContextualFooter',footerProps(),{preference:new Promise(done=>{late=done;})});abandoned.render();abandoned.unmount();const writes=abandoned.stateWrites();late(false);await Promise.resolve();assert.equal(abandoned.stateWrites(),writes);assert.equal(abandoned.listeners.size,0);
});

test('Rejected/Stay/Save failure keep confirmed pill; only confirmed prop change moves it',async()=>{
 for(const outcome of ['rejected','Stay','Save failure','confirmed']){
  const ref={current:null},requested=[],h=ui('ContextualFooter','ContextualFooter',footerProps({ref,onPage:page=>requested.push(page)}));h.render();await Promise.resolve();h.render();ref.current.toggle();let tree=h.render();
  find(tree,'Canvas 4').props.onPress();tree=h.render();let pill=nodes(tree).find(n=>n.type==='CanvasSelectionPill');assert.equal(pill.props.page,1);
  if(outcome==='confirmed')h.props.page=4;tree=h.render();pill=nodes(tree).find(n=>n.type==='CanvasSelectionPill');assert.equal(pill.props.page,outcome==='confirmed'?4:1);assert.deepEqual(requested,[4]);h.flushTimers();h.unmount();
 }
});
