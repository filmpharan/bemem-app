// Real UI modules, mocked native camera events/permissions. No native decoder, frames, wallet or network I/O.
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),tokens=require('../design-system/bemem-lagoon-glass-rc2/TOKENS.json');
const logicCache=new Map();
function logic(relative){
 const file=path.resolve(root,relative);if(logicCache.has(file))return logicCache.get(file).exports;
 const m={exports:{}};logicCache.set(file,m);
 const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInThisContext(`(function(require,module,exports){${code}\n})`)(n=>{assert.ok(n.startsWith('.'),'No native/storage/network capability in form logic');return logic(path.resolve(path.dirname(file),n+'.ts'));},m,m.exports);return m.exports;
}
function nodes(t,out=[]){if(!t||typeof t!=='object')return out;if(Array.isArray(t)){t.forEach(n=>nodes(n,out));return out;}out.push(t);nodes(t.props?.children,out);return out;}
const tick=async()=>{for(let i=0;i<4;i++)await new Promise(r=>setImmediate(r));};
function harness(component,props={},options={}){
 const slots=[],effects=[],timers=new Map(),listeners=new Set(),alerts=[];let cursor=0,timerId=0;
 const ctx={permission:{granted:true,canAskAgain:true},permissionRequests:0,settings:0,denyRequest:false,settingsFail:false,...options};
 const app={currentState:'active',addEventListener:(_,fn)=>{listeners.add(fn);return{remove:()=>listeners.delete(fn)};}};
 const react={
  useState(initial){const i=cursor++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;return[slots[i],n=>{slots[i]=typeof n==='function'?n(slots[i]):n;}];},
  useRef(initial){const i=cursor++;return slots[i]??={current:initial};},
  useEffect(fn,deps){const i=cursor++,previous=slots[i];if(!previous||deps.some((d,j)=>d!==previous.deps[j]))effects.push(()=>{previous?.cleanup?.();slots[i]={deps,cleanup:fn()};});},
 };
 const refresh=async()=>{if(ctx.refreshFail)throw Error('synthetic permission read failure');return ctx.permission;};
 const request=async()=>{ctx.permissionRequests++;if(ctx.denyRequest)throw Error('synthetic permission failure');ctx.permission={granted:true,canAskAgain:true};return ctx.permission;};
 const native=Object.fromEntries(['Modal','View','Text','TextInput','Pressable','ScrollView'].map(n=>[n,n]));
 Object.assign(native,{AppState:app,Platform:{OS:ctx.platform??'android'},Keyboard:{dismiss(){}},
  Linking:{openSettings:async()=>{ctx.settings++;if(ctx.settingsFail)throw Error('synthetic settings failure');}},
  StyleSheet:{create:s=>s,absoluteFill:{position:'absolute',left:0,right:0,top:0,bottom:0}},
  Alert:{alert:(...a)=>alerts.push(a)},useWindowDimensions:()=>({width:ctx.width??390,height:ctx.height??844,fontScale:ctx.fontScale??1})});
 const jsx=(type,props,key)=>({type,props,key});
 const theme={core:tokens.core,lagoon:tokens.palettes['pearl-gray'].colors,lagoonTokens:tokens,lagoonFonts:{latin:'BememManrope'},alpha:(c,a)=>c+Math.round(a*255).toString(16).padStart(2,'0')};
 const deps={react,'react/jsx-runtime':{jsx,jsxs:jsx},'react-native':native,'react-native-safe-area-context':{SafeAreaView:'SafeAreaView'},
  'expo-camera':{CameraView:'CameraView',useCameraPermissions:()=>[ctx.permission,request,refresh]},'../../constants/ci-theme':require('./ci-theme-fixture.cjs'),'../../constants/lagoon-theme':theme};
 for(const name of ['AddCardIcon','AddCardText','CardArtworkControls','CardAppearancePreview','GlassButton','MembershipNumberScanner','ExpirationDatePicker'])deps['./'+name]={[name]:name};
 for(const name of ['card-form','card-presentation','card-size-presets','wallet-validation'])deps['../../lib/'+name]=logic('src/lib/'+name+'.ts');
 deps['./add-card-layout']=logic('src/components/bemem/add-card-layout.ts');
 const module={exports:{}},file=path.join(root,'src/components/bemem',component+'.tsx');
 const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 vm.runInThisContext(`(function(require,module,exports,setTimeout,clearTimeout){${code}\n})`)(n=>{assert.ok(deps[n],'Unexpected dependency '+n);return deps[n];},module,module.exports,
  fn=>{const id=++timerId;timers.set(id,fn);return id;},id=>timers.delete(id));
 const h={ctx,props,alerts,exports:module.exports,
  render(){cursor=0;const tree=module.exports[component](h.props);while(effects.length)effects.shift()();return tree;},
  unmount(){for(const entry of slots)entry?.cleanup?.();},
  appState(state){app.currentState=state;for(const fn of listeners)fn(state);},expire(){for(const fn of [...timers.values()])fn();},listenerCount:()=>listeners.size};
 return h;
}
const button=(tree,label)=>nodes(tree).find(n=>n.props?.accessibilityLabel===label);
const camera=tree=>nodes(tree).find(n=>n.type==='CameraView');
function scanner(options={}){
 const values=[],closed=[];const h=harness('MembershipNumberScanner',{onResult:v=>values.push(v),onClose:()=>closed.push(true)},options);
 const ready=()=>{let tree=h.render();camera(tree).props.onCameraReady();return h.render();};
 return{h,values,closed,ready};
}

test('Scanner exposes real CameraView with all SDK-supported formats and a clear responsive window/red guide',()=>{
 for(const [width,height]of [[280,640],[390,844],[844,390]]){
  const {h}=scanner({width,height}),tree=h.render(),view=camera(tree);
  assert.equal(view.props.facing,'back');assert.equal(view.props.mode,'picture');
  const types=view.props.barcodeScannerSettings.barcodeTypes;
  for(const format of ['qr','code128','ean13','ean8','upc_a','upc_e','code39','itf14'])assert.ok(types.includes(format));
  const frame=nodes(tree).find(n=>n.props?.testID==='scan-window'),line=nodes(tree).find(n=>n.props?.testID==='scan-aim-line');
  assert.ok(frame.props.style.width<=width-40);assert.ok(frame.props.style.height<=height*.38);
  assert.equal(frame.props.style.backgroundColor,undefined);assert.equal(line.props.style.top,'50%');assert.equal(line.props.style.height,2);assert.equal(line.props.style.backgroundColor,'#f04747');
  assert.equal(button(tree,'Close scanner').props.style({pressed:false})[0].width,48);h.unmount();
 }
});

test('Aiming frame fits the measured safe content area after enlarged text or landscape reduces available space',()=>{
 const s=scanner({width:844,height:390,fontScale:2}),tree=s.h.render();
 nodes(tree).find(n=>n.props?.onLayout).props.onLayout({nativeEvent:{layout:{width:600,height:100}}});
 const frame=nodes(s.h.render()).find(n=>n.props?.testID==='scan-window');
 assert.ok(frame.props.style.width<=560);assert.ok(frame.props.style.height<=76);s.h.unmount();
});

test('Every configured scan format emits one exact string; duplicates and empty results never submit twice',()=>{
 const samples=[' 00123456 Ab ','https://example.test/member?ID=0001&Case=Ab','ไทย 000会员','0000012345678'];
 for(const format of scanner().h.exports.NUMBER_SCAN_TYPES)for(const text of samples){
  const {h,values,ready}=scanner(),view=camera(ready());
  view.props.onBarcodeScanned({type:format,data:'',raw:''});assert.equal(values.length,0);
  view.props.onBarcodeScanned({type:format,data:text});view.props.onBarcodeScanned({type:format,data:'different'});
  assert.deepEqual(values,[text]);assert.equal(camera(h.render()),undefined);h.unmount();
 }
});

test('Android raw decoded text takes precedence over parsed display text without normalization',()=>{
 const text='  https://example.test/member?ID=000Ab  ',s=scanner();
 camera(s.ready()).props.onBarcodeScanned({type:'qr',data:'Displayed URL',raw:text});assert.deepEqual(s.values,[text]);s.h.unmount();
 const ios=scanner({platform:'ios'});camera(ios.ready()).props.onBarcodeScanned({type:'qr',data:' 000Ab ',raw:'Android-only value'});
 assert.deepEqual(ios.values,[' 000Ab ']);ios.h.unmount();
});

test('Permission checking, denial and grant keep manual entry available and prevent repeated permission requests',async()=>{
 const {h,closed}=scanner({permission:null});assert.equal(camera(h.render()),undefined);
 assert.ok(button(h.render(),'Return to manual entry'));
 h.ctx.permission={granted:false,canAskAgain:true};let tree=h.render();const allow=button(tree,'Allow camera');
 allow.props.onPress();allow.props.onPress();assert.equal(h.ctx.permissionRequests,1);await tick();assert.ok(camera(h.render()));
 button(h.render(),'Close scanner').props.onPress();assert.equal(closed.length,1);h.unmount();
});

test('Permanent denial/settings errors and request errors leave a safe manual-entry exit',async()=>{
 for(const permanent of [false,true]){
  const s=scanner({permission:{granted:false,canAskAgain:!permanent},denyRequest:true,settingsFail:true});
  button(s.h.render(),permanent?'Open camera settings':'Allow camera').props.onPress();await tick();
  assert.equal(camera(s.h.render()),undefined);assert.ok(nodes(s.h.render()).some(n=>n.type==='Text'&&String(n.props.children).includes(permanent?'Settings could not':'permission could not')));
  button(s.h.render(),'Return to manual entry').props.onPress();assert.equal(s.closed.length,1);assert.deepEqual(s.values,[]);s.h.unmount();
 }
});

test('Permission inspection failure and permission revoked while backgrounded keep the camera off with manual recovery',async()=>{
 const failed=scanner({permission:null,refreshFail:true});failed.h.render();await tick();assert.equal(camera(failed.h.render()),undefined);
 assert.ok(button(failed.h.render(),'Return to manual entry'));assert.ok(nodes(failed.h.render()).some(n=>n.type==='Text'&&String(n.props.children).includes('permission could not be checked')));failed.h.unmount();
 const revoked=scanner();revoked.ready();revoked.h.appState('background');revoked.h.ctx.permission={granted:false,canAskAgain:false};
 revoked.h.appState('active');await tick();assert.equal(camera(revoked.h.render()),undefined);assert.ok(button(revoked.h.render(),'Open camera settings'));revoked.h.unmount();
});

test('Native Android Back and Close are one-shot cancellation; late events after close/unmount are ignored',()=>{
 for(const dismiss of ['back','close','unmount']){
  const s=scanner(),tree=s.ready(),view=camera(tree);
  if(dismiss==='back')tree.props.onRequestClose();else if(dismiss==='close')button(tree,'Close scanner').props.onPress();else s.h.unmount();
  view.props.onBarcodeScanned({type:'qr',data:'late'});assert.deepEqual(s.values,[]);
  if(dismiss!=='unmount'){tree.props.onRequestClose();assert.equal(s.closed.length,1);s.h.unmount();}
  assert.equal(s.h.listenerCount(),0);
 }
});

test('Background removes the camera and torch; resume refreshes permission and rejects callbacks from the old preview',async()=>{
 const s=scanner(),tree=s.ready(),old=camera(tree);button(tree,'Turn torch on').props.onPress();assert.equal(camera(s.h.render()).props.enableTorch,true);
 s.h.appState('background');old.props.onBarcodeScanned({type:'qr',data:'background'});assert.equal(camera(s.h.render()),undefined);
 s.h.appState('active');await tick();let next=camera(s.h.render());assert.equal(next.props.enableTorch,false);next.props.onCameraReady();next=camera(s.h.render());
 old.props.onCameraReady();old.props.onBarcodeScanned({type:'qr',data:'old preview'});assert.deepEqual(s.values,[]);
 next.props.onBarcodeScanned({type:'qr',data:' 000New '});assert.deepEqual(s.values,[' 000New ']);s.h.unmount();
});

test('Camera start errors/timeouts never trap the user; Torch toggles without changing the preview key',async()=>{
 for(const timeout of [false,true]){
  const s=scanner(),tree=s.h.render();if(timeout)s.h.expire();else camera(tree).props.onMountError({message:'synthetic camera absent'});
  assert.equal(camera(s.h.render()),undefined);assert.ok(button(s.h.render(),'Return to manual entry'));
  button(s.h.render(),'Try camera again').props.onPress();await tick();assert.ok(camera(s.h.render()));
  const ready=s.ready(),before=camera(ready);button(ready,'Turn torch on').props.onPress();const after=camera(s.h.render());
  assert.equal(after.key,before.key);assert.equal(after.props.enableTorch,true);s.h.unmount();
 }
});

function form(editing=false,number='',extra={}){
 const values={...logic('src/lib/card-form.ts').emptyCardForm(),name:'Test Member',memberNumber:number,payload:number};
 const changes=[],busy=[];let h;
 h=harness('AddCardForm',{values,presentation:logic('src/lib/card-presentation.ts').emptyCardPresentation(),errors:{},
  onChange:v=>{changes.push(v);h.props.values=v;},onPresentationChange(){},onImageBusy:v=>busy.push(v),
  ...(editing?{mode:'edit',fullEditing:true,editCard:{appearance:{backgroundColor:'#123456',textColor:'#ffffff',imageAssetId:null}}}:{}),...extra});
 const numberField=()=>nodes(h.render()).find(n=>typeof n.type==='function'&&n.props.label==='Number');
 const open=()=>{numberField().props.onScan();return nodes(h.render()).find(n=>n.type==='MembershipNumberScanner');};
 return{h,changes,busy,numberField,open};
}

test('Both Add/Edit Number fields expose a 48dp scanner control and autofill exact text through existing payload logic',()=>{
 for(const editing of [false,true]){
  const f=form(editing),field=f.numberField(),scanButton=button(field.type(field.props),'Scan QR Code or barcode');
  assert.equal(scanButton.props.style({pressed:false})[0].width,48);assert.equal(scanButton.props.style({pressed:false})[0].minHeight,48);
  const view=f.open();view.props.onResult(' 000Ab c ');view.props.onResult('duplicate');
  assert.equal(f.changes.length,1);assert.equal(f.h.props.values.memberNumber,' 000Ab c ');assert.equal(f.h.props.values.payload,' 000Ab c ');assert.deepEqual(f.busy,[true,false]);
  const nextField=f.numberField();nextField.props.onChange(' 000Manual ');assert.equal(f.h.props.values.memberNumber,' 000Manual ');
  f.h.unmount();
 }
});

test('Existing Number replacement requires confirmation; Cancel/dismiss retain text; stale callbacks cannot change a new scan session',()=>{
 for(const action of ['cancel','dismiss','replace']){
  const f=form(true,' 000Original '),scan=f.open();scan.props.onResult(' 000Scanned Ab ');scan.props.onResult('duplicate');
  assert.equal(f.h.alerts.length,1);assert.equal(f.changes.length,0);
  assert.equal(nodes(f.h.render()).some(n=>n.type==='MembershipNumberScanner'),false);
  const alert=f.h.alerts[0];assert.equal(alert[0],'Replace number?');assert.equal(alert[2][0].style,'cancel');
  if(action==='dismiss')alert[3].onDismiss();else alert[2][action==='replace'?1:0].onPress();
  assert.equal(f.h.props.values.memberNumber,action==='replace'?' 000Scanned Ab ':' 000Original ');
  assert.deepEqual(f.busy,[true,false]);const newScan=f.open();scan.props.onResult('stale');scan.props.onClose();
  assert.equal(f.h.props.values.memberNumber,action==='replace'?' 000Scanned Ab ':' 000Original ');newScan.props.onClose();f.h.unmount();
 }
});

test('Scanner cancellation/disabled form/unmount never changes data; custom code and unsupported Unicode are preserved for existing validation',()=>{
 const cancelled=form(),scan=cancelled.open();scan.props.onClose();assert.equal(cancelled.changes.length,0);assert.deepEqual(cancelled.busy,[true,false]);cancelled.h.unmount();
 const disabled=form(false,'',{disabled:true});disabled.numberField().props.onScan();assert.equal(nodes(disabled.h.render()).some(n=>n.type==='MembershipNumberScanner'),false);disabled.h.unmount();
 const f=form(false);f.h.props.values={...f.h.props.values,payload:'Custom Code',payloadEdited:true};f.open().props.onResult('ไทย 000');assert.equal(f.h.props.values.memberNumber,'ไทย 000');assert.equal(f.h.props.values.payload,'\u0e44\u0e17\u0e22 000');f.h.unmount();
 const g=form(false);g.open().props.onResult('ไทย 000');g.h.props.values.preferredDisplayFormat='code128';
 assert.equal(g.h.props.values.payload,'ไทย 000');const metadata={id:'synthetic-scan',createdAt:'2026-11-12T00:00:00.000Z',updatedAt:'2026-11-12T00:00:00.000Z'};
 assert.equal(logic('src/lib/card-form.ts').prepareCardForm(g.h.props.values,metadata).ok,true);g.h.unmount();
 const unmounted=form(true,'old'),view=unmounted.open();view.props.onResult('new');unmounted.h.unmount();unmounted.h.alerts[0][2][1].onPress();assert.equal(unmounted.changes.length,0);
});
