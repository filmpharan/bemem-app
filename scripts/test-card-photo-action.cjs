// Actual production layout/component contracts with synthetic native events. No Wallet/device IO.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const root=path.resolve(__dirname,'..');
function env(fontScale=1){
 const slots=[],cache=new Map();let cursor=0,effects=[],motionListener;
 const same=(a,b)=>a&&b&&a.length===b.length&&b.every((v,i)=>v===a[i]);
 const react={useState(v){const i=cursor++;if(!(i in slots))slots[i]=typeof v==='function'?v():v;return[slots[i],v=>{slots[i]=typeof v==='function'?v(slots[i]):v;}];},useRef(v){const i=cursor++;return slots[i]??={current:v};},
  useEffect(fn,deps){const i=cursor++,old=slots[i];if(!same(old?.deps,deps))effects.push(()=>{old?.cleanup?.();slots[i]={deps,cleanup:fn()};});}};
 const native={useWindowDimensions:()=>({fontScale}),Text:'Text',AccessibilityInfo:{isReduceMotionEnabled:async()=>true,addEventListener(_name,fn){motionListener=fn;return{remove(){}};}},Keyboard:{isVisible:()=>false},Platform:{OS:'android'},StyleSheet:{create:v=>v,absoluteFill:{}},...Object.fromEntries(['View','ScrollView','Modal','KeyboardAvoidingView','Pressable'].map(n=>[n,n]))};
 function load(file){file=path.resolve(root,file);if(!/\.tsx?$/.test(file))file+=fs.existsSync(file+'.ts')?'.ts':'.tsx';if(cache.has(file))return cache.get(file).exports;const mod={exports:{}};cache.set(file,mod);
  const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
  vm.runInThisContext(`(function(require,module,exports){${code}\n})`,{filename:file})(n=>{
   if(n==='react')return react;if(n==='react/jsx-runtime')return{jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})};if(n==='react-native')return native;
   if(n.endsWith('/lagoon-theme'))return{lagoon:{text:{primary:require('./ci-theme-fixture.cjs').ciColors.text.primary}},lagoonFonts:{latin:'BememManrope'}};
   if(n==='react-native-safe-area-context')return{SafeAreaView:'SafeAreaView'};
   if(n.endsWith('/ci-theme'))return require('./ci-theme-fixture.cjs');if(n.endsWith('/sheet-visual'))return require('./sheet-visual-fixture.cjs');
   if(['./GlassButton','./AddCardText','./AddCardIcon'].includes(n))return{[n.slice(2)]:n.slice(2)};
   assert.ok(n.startsWith('.'));return load(path.resolve(path.dirname(file),n));
  },mod,mod.exports);return mod.exports;
 }
 return{load,render(fn,p){cursor=0;effects=[];const tree=fn(p);effects.forEach(fn=>fn());return tree;},motion:v=>motionListener?.(v)};
}
const nodes=(t,out=[])=>{if(!t||typeof t!=='object')return out;if(Array.isArray(t)){t.forEach(n=>nodes(n,out));return out;}out.push(t);nodes(t.props?.children,out);return out;};
const layout=env().load('src/components/bemem/add-card-layout.ts'),presets=env().load('src/lib/card-size-presets.ts');
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);

const photo=env().load('src/components/bemem/CardPhotoAction.tsx');
for(const fontScale of [1,1.5,2])test(`All nine photo actions remain inside painted bounds at font scale ${fontScale}`,()=>{
 for(const width of [240,320,353,372])for(const p of presets.CARD_SIZE_PRESETS)for(const userPhoto of [false,true]){
  const size=layout.cardPreviewSize(width,p.id),v=photo.cardPhotoActionLayout(size.width,size.height,userPhoto,fontScale);
  assert.ok(v.left>=0&&v.top>=0);assert.ok(v.left+v.targetWidth<=size.width+1e-7);assert.ok(v.top+v.targetHeight<=size.height+1e-7);
  assert.ok(v.visualWidth+8<=v.targetWidth+1e-7);assert.ok(v.visualHeight+8<=v.targetHeight+1e-7);
  assert.ok(v.targetWidth>=48||size.width<56);assert.ok(v.targetHeight>=48||size.height<56);
 }
});
test('Normal Card has a small stacked group; Mini becomes icon-only with the full accessible label',()=>{
 const card=layout.cardPreviewSize(353,'card-landscape'),c=photo.cardPhotoActionLayout(card.width,card.height,false),mini=layout.cardPreviewSize(353,'mini-landscape'),m=photo.cardPhotoActionLayout(mini.width,mini.height,false);
 assert.equal(c.iconSize,18);assert.equal(c.fontSize,12);assert.equal(c.gap,4);assert.equal(c.label,'Add your photo');
 assert.equal(m.label,'');assert.equal(m.iconSize,16);assert.equal(m.fullLabel,'Add your photo');
 const compact=photo.cardPhotoActionLayout(100,110,false);assert.equal(compact.label,'Add photo');
});
test('Typical front caption and action visual content do not overlap at normal or enlarged fonts',()=>{
 for(const scale of [1,1.5,2])for(const id of ['card-landscape','photo-landscape','card-portrait','vaccine-passport-portrait']){
  const size=layout.cardPreviewSize(353,id),v=photo.cardPhotoActionLayout(size.width,size.height,false,scale);
  const visualTop=v.top+(v.targetHeight-v.visualHeight)/2;
  assert.ok(visualTop>=8+20*scale,'Keep the existing first title line clear');
 }
});
for(const userPhoto of [false,true])test(`Actual shared Pressable has no glass/border/shadow; localized backing only when photo=${userPhoto}`,()=>{
 const e=env(),C=e.load('src/components/bemem/CardPhotoAction.tsx').CardPhotoAction;let opened=0;
 const tree=e.render(C,{width:220,height:144,userPhoto,disabled:false,onPress(){opened++;}}),style=tree.props.style({pressed:false}),ns=nodes(tree);
 assert.equal(tree.type,'Pressable');assert.equal(tree.props.accessibilityLabel,userPhoto?'Change photo':'Add your photo');
 assert.equal(style.backgroundColor,undefined);assert.equal(style.borderWidth,undefined);assert.equal(style.boxShadow,undefined);
 assert.equal(ns.some(n=>n.type==='GlassButton'),false);assert.equal(tree.props.pressRetentionOffset,0);assert.equal(tree.props.onMoveShouldSetResponder,undefined);
 assert.equal(ns.find(n=>n.type==='View').props.style.backgroundColor,userPhoto?'rgba(255,255,255,0.84)':'transparent');
 assert.equal(ns.find(n=>n.type==='AddCardIcon').props.size,18);assert.equal(ns.find(n=>n.type==='Text').props.style.fontSize,12);
 tree.props.onPress();assert.equal(opened,1);assert.ok(style.width<220*.6);assert.ok(style.height<144*.5);
});
test('Active-card overlay stays clipped, leaves empty space touch-through, and does not add a gesture responder',()=>{
 const e=env(),C=e.load('src/components/bemem/CardSizeCarousel.tsx').CardSizeCarousel,t=e.render(C,{width:353,selectedId:'card-landscape',disabled:false,onSelect(){},renderPreview(){return null;},photoAction:'action'});
 const host=nodes(t).find(n=>n.props?.testID==='card-photo-action-host');assert.equal(host.props.pointerEvents,'box-none');assert.equal(host.props.style.overflow,'hidden');assert.equal(host.props.style.borderRadius,14);
 assert.equal(host.props.onStartShouldSetResponder,undefined);assert.equal(host.props.style.top,0);assert.equal(host.props.style.bottom,0);
});
test('Export seven static review cases from actual shared component values and actual current artwork',()=>{
 const cases=[['A','card-landscape',false,'gray'],['B','card-landscape',true,'synthetic-photo'],['C','mini-landscape',false,'orange'],['D','photo-landscape',false,'blue'],['E','card-portrait',false,'purple'],['F','mini-portrait',false,'green'],['G','vaccine-passport-portrait',false,'pink']];
 const values=cases.map(([label,id,userPhoto,color])=>{const size=layout.cardPreviewSize(353,id),e=env(),C=e.load('src/components/bemem/CardPhotoAction.tsx').CardPhotoAction,t=e.render(C,{...size,userPhoto,disabled:false,onPress(){}});return{label,id,userPhoto,color,...size,action:photo.cardPhotoActionLayout(size.width,size.height,userPhoto),targetStyle:t.props.style({pressed:false}),visualStyle:nodes(t).find(n=>n.type==='View').props.style,textStyle:nodes(t).find(n=>n.type==='Text')?.props.style};});
 const cameraSource=fs.readFileSync(path.join(root,'src/components/bemem/AddCardIcon.tsx'),'utf8').match(/camera:\s*'([^']+)'/)[1];
 fs.mkdirSync(path.join(root,'output'),{recursive:true});fs.writeFileSync(path.join(root,'output/minimal-photo-action-review.json'),JSON.stringify({notice:'STATIC MOCKUP from production layout/component values, not a Samsung screenshot',cameraSource,ink:require('./ci-theme-fixture.cjs').ciColors.text.primary,cases:values},null,2));
 assert.equal(values.length,7);
});
