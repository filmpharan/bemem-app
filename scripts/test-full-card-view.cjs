const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),cache=new Map();
function logic(relative){let file=path.resolve(root,relative);if(!path.extname(file))file+='.ts';if(cache.has(file))return cache.get(file).exports;
 const m={exports:{}};cache.set(file,m);const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInThisContext(`(function(require,module,exports){${code}\n})`)(n=>{assert.ok(n.startsWith('.'),'No native/storage/network code in pure helpers');return logic(path.resolve(path.dirname(file),n));},m,m.exports);return m.exports;}
const {fullViewOrientation}=logic('src/lib/full-view-orientation.ts'),{fullCardFit}=logic('src/lib/full-card-view.ts');
const presets=logic('src/lib/card-size-presets.ts').CARD_SIZE_PRESETS;
const member=(p=presets[1])=>({kind:'membership',id:'synthetic-full',name:'Test Member',memberNumber:'00123456',payload:'OLD URL',preferredDisplayFormat:'qr',
 orientation:p.orientation,sizePresetId:p.id,widthBlocks:p.ratioWidth,heightBlocks:p.ratioHeight,appearance:{backgroundColor:'#405764',textColor:'#ffffff',imageAssetId:null,gradientPresetId:'ptt',artwork:{front:{assetId:'art-front.jpg'},back:{assetId:'art-back.jpg'}}}});
const tick=async()=>{for(let i=0;i<6;i++)await new Promise(r=>setImmediate(r));};
function port(previous=0){const events=[],lock={DEFAULT:0,ALL:1,PORTRAIT:2,PORTRAIT_UP:3,PORTRAIT_DOWN:4,LANDSCAPE:5,LANDSCAPE_LEFT:6,LANDSCAPE_RIGHT:7,OTHER:8,UNKNOWN:9};
 const p={events,current:previous,supported:true,gate:null,failRestore:false,failLock:false,OrientationLock:lock,
  getOrientationLockAsync:async()=>{events.push(['get',p.current]);return p.current;},getPlatformOrientationLockAsync:async()=>({screenOrientationConstantAndroid:14}),
  supportsOrientationLockAsync:async()=>p.supported,
  async lockAsync(value){events.push(['lock',value]);if(p.gate)await p.gate;p.current=value;if(p.failLock)throw Error('Synthetic lock failure');},
  async unlockAsync(){events.push(['unlock']);if(p.failRestore)throw Error('Synthetic restore failure');p.current=0;},
  async lockPlatformAsync(value){events.push(['platform',value]);p.current=8;}};return p;}

test('Every footprint fits the available Full View with one scale and the existing paint ratio, never modifying card data',()=>{
 for(const preset of presets)for(const [width,height]of [[300,650],[700,300],[200,220]]){
  const card=member(preset),before=JSON.stringify(card),fit=fullCardFit(card,width,height);
  assert.ok(fit.width<=width+1e-8&&fit.height<=height+1e-8);assert.ok(Math.abs(fit.width/fit.height-(preset.ratioWidth-.2)/(preset.ratioHeight-.2))<1e-8);
  assert.equal(fit.portrait,preset.orientation==='portrait');assert.equal(JSON.stringify(card),before);
 }
 const legacy=member();delete legacy.sizePresetId;delete legacy.widthBlocks;delete legacy.heightBlocks;assert.ok(fullCardFit(legacy,600,300).width>0);
});
test('Portrait/landscape request the appropriate lock and restore the prior policy, including custom policies',async()=>{
 for(const previous of [0,3,8,9])for(const portrait of [false,true]){
  const p=port(previous),s=fullViewOrientation(p,portrait);await s.resume();assert.equal(p.current,portrait?3:5);await s.release();
  assert.equal(p.current,previous===9?0:previous);assert.equal((await s.resume()),undefined);
 }
});
test('Background pause restores policy; resume reapplies without recapturing the temporary lock as the original',async()=>{
 const p=port(),s=fullViewOrientation(p,false);await s.resume();await s.pause();assert.equal(p.current,0);await s.resume();assert.equal(p.current,5);
 assert.equal(p.events.filter(e=>e[0]==='get').length,1);await s.release();assert.equal(p.current,0);
});
test('Closing during a native lock and opening the next Full View cannot let stale cleanup override its orientation',async()=>{
 const p=port();let finish;p.gate=new Promise(r=>{finish=r;});const old=fullViewOrientation(p,false),start=old.resume();await tick();assert.ok(p.events.some(e=>e[0]==='lock'));
 const close=old.release(),next=fullViewOrientation(p,true),open=next.resume();p.gate=null;finish();await Promise.all([start,close,open]);
 assert.equal(p.current,3);assert.deepEqual(p.events.filter(e=>['lock','unlock'].includes(e[0])).map(e=>e[0]==='unlock'?0:e[1]),[5,0,3]);await next.release();assert.equal(p.current,0);
});
test('Unsupported/failed locks are honest; restoration failures are retryable and never reported as success',async()=>{
 const unavailable=port();unavailable.supported=false;const a=fullViewOrientation(unavailable,false);await assert.rejects(a.resume());await a.release();assert.equal(unavailable.current,0);
 const partial=port();partial.failLock=true;const b=fullViewOrientation(partial,false);await assert.rejects(b.resume());await b.release();assert.equal(partial.current,0);
 const p=port(),s=fullViewOrientation(p,false);await s.resume();p.failRestore=true;await assert.rejects(s.release());assert.equal(p.current,5);p.failRestore=false;await s.release();assert.equal(p.current,0);
});

function nodes(t,out=[]){if(!t||typeof t!=='object')return out;if(Array.isArray(t)){t.forEach(v=>nodes(v,out));return out;}out.push(t);nodes(t.props?.children,out);return out;}
function view(card=member()){
 const p=port(),events=p.events,slots=[],effects=[],listeners=new Set();let cursor=0;
 const react={useState(v){const i=cursor++;if(!(i in slots))slots[i]=typeof v==='function'?v():v;return[slots[i],n=>{slots[i]=typeof n==='function'?n(slots[i]):n;}];},useRef(v){const i=cursor++;return slots[i]??={current:v};},
  useEffect(fn,deps){const i=cursor++,old=slots[i];if(!old||deps.some((d,j)=>d!==old.deps[j]))effects.push(()=>{old?.cleanup?.();slots[i]={deps,fn,cleanup:fn()};});}};
 const app={currentState:'active',addEventListener:(_,fn)=>{listeners.add(fn);return{remove:()=>listeners.delete(fn)};}};
 const native={View:'View',Text:'Text',Pressable:'Pressable',Modal:'Modal',AppState:app,StyleSheet:{create:s=>s}};
 const jsx=(type,props)=>({type,props}),m={exports:{}},file=path.join(root,'src/components/bemem/FullScreenCardView.tsx');
 const deps={react,'react-native':native,'react/jsx-runtime':{jsx,jsxs:jsx},'react-native-safe-area-context':{SafeAreaView:'SafeAreaView'},'expo-screen-orientation':p,
  '../../constants/lagoon-theme':{lagoon:{canvas:{base:'#eceff1'},text:{primary:'#263943'}},lagoonFonts:{latin:'Manrope'}},'./AddCardIcon':{AddCardIcon:'AddCardIcon'},'./CardAppearancePreview':{CardAppearancePreview:'CardAppearancePreview'}};
 const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 vm.runInThisContext(`(function(require,module,exports){${code}\n})`)(n=>{if(deps[n])return deps[n];assert.ok(n.startsWith('../../lib/'));return logic('src/lib/'+n.split('/').at(-1));},m,m.exports);
 const h={p,events,home:0,back:0,props:{card,side:'back',onSide:s=>{h.props.side=s;},onHome:()=>{events.push(['home']);h.home++;},onBack:()=>{events.push(['back']);h.back++;}},
  render(){cursor=0;const tree=m.exports.FullScreenCardView(h.props);while(effects.length)effects.shift()();return tree;},
  appState(state){app.currentState=state;for(const fn of listeners)fn(state);},unmount(){for(const s of slots)s?.cleanup?.();},
  replay(){for(const s of slots)if(s?.fn){s.cleanup?.();s.cleanup=s.fn();}}};return h;
}
const byLabel=(t,label)=>nodes(t).find(n=>n.props?.accessibilityLabel===label);
test('Full View shows the actual current side, fits artwork and puts controls bottom/right for each orientation',async()=>{
 for(const preset of presets){
  const card=member(preset),h=view(card);let tree=h.render();await tick();const stage=nodes(tree).find(n=>n.props?.testID==='full-card-stage');stage.props.onLayout({nativeEvent:{layout:{width:500,height:350}}});tree=h.render();
  const preview=nodes(tree).find(n=>n.type==='CardAppearancePreview'),controls=nodes(tree).find(n=>n.props?.testID==='full-card-controls');
  assert.equal(preview.props.presentation.side,'back');assert.equal(preview.props.appearance,card.appearance);assert.ok(preview.props.width<=500&&preview.props.height<=350);
  assert.equal(controls.props.style[1].flexDirection,preset.orientation==='portrait'?'row':'column');
  assert.equal(nodes(tree).some(n=>n.type==='CardCodeView'),false);
  const count=h.events.filter(e=>e[0]==='lock').length;byLabel(tree,'Switch card front and back').props.onPress();tree=h.render();await tick();assert.equal(h.props.side,'front');assert.equal(h.events.filter(e=>e[0]==='lock').length,count);
  for(const label of ['Switch card front and back','Return to Home'])assert.equal(byLabel(tree,label).props.style.width,48);
  h.unmount();await tick();assert.equal(h.p.current,0);
 }
});
test('Android Back and Home wait for restoration, reject duplicate taps, and return to their distinct destinations',async()=>{
 for(const destination of ['home','back']){
  const h=view();let tree=h.render();await tick();if(destination==='home'){byLabel(tree,'Return to Home').props.onPress();byLabel(tree,'Return to Home').props.onPress();}else{tree.props.onRequestClose();tree.props.onRequestClose();}
  await tick();assert.equal(h.home,destination==='home'?1:0);assert.equal(h.back,destination==='back'?1:0);assert.equal(h.p.current,0);
  assert.ok(h.events.findIndex(e=>e[0]==='unlock')<h.events.findIndex(e=>e[0]===destination));h.unmount();await tick();
 }
});
test('Native UI resumes after background/effect replay, preserves side, and cannot exit before a failed restoration is retried',async()=>{
 const h=view();h.render();h.replay();await tick();assert.equal(h.p.current,5);h.appState('background');await tick();assert.equal(h.p.current,0);h.appState('active');await tick();assert.equal(h.p.current,5);assert.equal(h.props.side,'back');
 h.p.failRestore=true;byLabel(h.render(),'Return to Home').props.onPress();await tick();assert.equal(h.home,0);assert.ok(nodes(h.render()).some(n=>n.props?.accessibilityRole==='alert'));
 h.p.failRestore=false;byLabel(h.render(),'Return to Home').props.onPress();await tick();assert.equal(h.home,1);h.unmount();await tick();
});
