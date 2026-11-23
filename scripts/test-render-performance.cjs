const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),capture=process.env.BEMEM_PROFILE_CAPTURE;
function harness(){
 const modules=new Map(),frames=new Map(),counts={},projections=[],listeners=new Set();let active=null,cursor=0,currentRuntime,visited;
 const count=n=>counts[n]=(counts[n]??0)+1,eq=(a,b)=>a&&b&&Object.keys(a).length===Object.keys(b).length&&Object.keys(a).every(k=>Object.is(a[k],b[k]));
 const react={memo:type=>({memo:true,type}),useRef(v){const i=cursor++;return active.slots[i]??={current:v};},useState(v){const own=active,i=cursor++;if(!(i in own.slots))own.slots[i]=typeof v==='function'?v():v;return[own.slots[i],next=>{const n=typeof next==='function'?next(own.slots[i]):next;if(!Object.is(n,own.slots[i])){own.slots[i]=n;own.dirty=true;}}];},
 useMemo(fn,deps){const i=cursor++,old=active.slots[i];if(old&&deps.length===old.deps.length&&deps.every((v,j)=>Object.is(v,old.deps[j])))return old.value;const value=fn();active.slots[i]={deps,value};return value;},
 useCallback(fn,deps){return react.useMemo(()=>fn,deps);},useEffect(fn,deps){const i=cursor++,old=active.slots[i];if(old&&deps?.every((v,j)=>Object.is(v,old.deps[j])))return;old?.cleanup?.();active.slots[i]={deps,cleanup:fn()};}};
 const jsx=(type,props,key)=>{if(type==='Image')count('nativeImageBindings');return{type,props,key};};
 const native={...require('./card-detail-motion-fixture.cjs').createAnimationMock().native,...Object.fromEntries(['View','Text','TextInput','ScrollView','Pressable','Modal','ActivityIndicator'].map(n=>[n,n])),StyleSheet:{create:s=>s,absoluteFill:{},flatten:s=>Object.assign({},...[s].flat(Infinity).filter(Boolean))},
 Keyboard:{dismiss(){}},Platform:{OS:'android'},Alert:{alert(){}},useWindowDimensions:()=>({width:393,height:844,fontScale:1}),AccessibilityInfo:{isReduceMotionEnabled:async()=>true,addEventListener:(name,callback)=>{const listener={name,callback};listeners.add(listener);return{remove(){listeners.delete(listener);}};}},PanResponder:{create:()=>({panHandlers:{}})}};
 function load(relative){let file=path.resolve(root,relative);if(!path.extname(file))file+=fs.existsSync(file+'.ts')?'.ts':'.tsx';if(modules.has(file))return modules.get(file).exports;const m={exports:{}};modules.set(file,m);
 const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 vm.runInThisContext(`(function(require,module,exports){${code}\n})`,{filename:file})(name=>{
  if(name==='react')return react;if(name==='react/jsx-runtime')return{jsx,jsxs:jsx};if(name==='react-native')return native;if(name==='expo-image')return{Image:'Image'};if(name==='react-native-safe-area-context')return{SafeAreaView:'SafeAreaView'};
  if(name.endsWith('/WalletRuntimeProvider'))return{useWalletRuntime:()=>({runtime:currentRuntime,snapshot:currentRuntime.getSnapshot()})};
  if(name.endsWith('/card-artwork-store'))return{artworkUri:id=>{count('artworkUri');return 'synthetic://'+id;}};
  if(name.endsWith('/lagoon-theme')){const t=require('../design-system/bemem-vivid-lagoon/TOKENS.json');return{lagoon:t.palettes[t.metadata.defaultThemeId].colors,lagoonTokens:t,core:t.core,lagoonFonts:{latin:'Manrope'},alpha:(v,a)=>v+Math.round(a*255).toString(16).padStart(2,'0')};}
  if(name.endsWith('/ci-theme'))return require('./ci-theme-fixture.cjs');
  if(name.endsWith('/sheet-visual'))return require('./sheet-visual-fixture.cjs');
  if(['./GroupFolderCard','./EditMembershipCardEditor','./ShareCardSheet','./KeepsSheet','./CardHistorySheet','./FullScreenCardView','./CardCodeView'].includes(name))return{[name.slice(2)]:name.slice(2)};
  if(name==='./CardArtworkControls')return{CardArtworkControls:function CardArtworkControls(p){return p.renderTrigger('photo action');}};
  if(['./GlassButton','./AddCardIcon','./AddCardText','./CardSheetModeSelector','./ExpirationDatePicker','./MembershipNumberScanner'].includes(name))return{[name.slice(2)]:name.slice(2)};
  assert.ok(name.startsWith('.'),'No native IO or network: '+name);return load(path.resolve(path.dirname(file),name));
 },m,m.exports);
 for(const name of ['validateWalletDocument','walletCanvasPresentation'])if(m.exports[name]){const original=m.exports[name];m.exports[name]=(...args)=>{count(name);if(name==='walletCanvasPresentation')projections.push(args[1]??1);return original(...args);};}
 return m.exports;
 }
 function renderNode(tree,where='root'){
  if(Array.isArray(tree))return tree.map((v,i)=>renderNode(v,where+'/'+(v?.key??i)));
  if(!tree||typeof tree!=='object'||!('type'in tree))return tree;
  const memo=tree.type?.memo,fn=memo?tree.type.type:tree.type;
  if(typeof fn==='function'){
   let frame=frames.get(where);if(!frame||frame.fn!==fn){frame={fn,slots:[],dirty:true};frames.set(where,frame);}
   visited.add(where);
   if(memo&&!frame.dirty&&eq(frame.props,tree.props)&&![...frames.entries()].some(([key,value])=>key.startsWith(where+'/')&&value.dirty)){for(const key of frames.keys())if(key.startsWith(where+'/'))visited.add(key);return frame.tree;}
   active=frame;cursor=0;frame.dirty=false;count(fn.name||'anonymous');const next=fn(tree.props);frame.props=tree.props;frame.tree=renderNode(next,where+'/body');return frame.tree;
  }
  return{...tree,props:{...tree.props,children:renderNode(tree.props?.children,where+'/children')}};
 }
 const nodes=(t,out=[])=>{if(!t||typeof t!=='object')return out;if(Array.isArray(t)){t.forEach(n=>nodes(n,out));return out;}out.push(t);nodes(t.props?.children,out);return out;};
 function render(tree){visited=new Set();const result=renderNode(tree);for(const [key,frame]of frames)if(!visited.has(key)){for(const slot of frame.slots)slot?.cleanup?.();frames.delete(key);}return result;}
 return{load,jsx,render,nodes,counts,projections,resources:()=>({frames:frames.size,effects:[...frames.values()].reduce((sum,f)=>sum+f.slots.filter(s=>typeof s?.cleanup==='function').length,0),listeners:listeners.size}),setRuntime:r=>currentRuntime=r,reset(){for(const k of Object.keys(counts))delete counts[k];projections.length=0;},unmount(){for(const f of frames.values())for(const slot of f.slots)slot?.cleanup?.();frames.clear();}};
}
const measurements={notice:'Node execution of production JS with deterministic hook/memo/native-layout simulation. Not React DevTools, Samsung FPS, or native decode measurements.'};
test('Capture Home projection/validation work without native storage',async()=>{
 const h=harness(),fixture=h.load('src/lib/dev-multicanvas.ts').createMultiCanvasFixture();await fixture.owner.commands.initialize();h.setRuntime(fixture.owner);
 const Hook=h.load('src/hooks/use-wallet-canvas.ts').useWalletCanvas;let search=false,view;
 function Probe(){view=Hook(search);return null;}
 h.reset();h.render(h.jsx(Probe,{}));measurements.homeCold={...h.counts,pages:[...h.projections]};
 h.reset();h.render(h.jsx(Probe,{}));measurements.homeUnrelatedRender={...h.counts};
 if(!capture){assert.equal(measurements.homeCold.walletCanvasPresentation,1);assert.equal(measurements.homeCold.validateWalletDocument,1);assert.equal(h.counts.walletCanvasPresentation??0,0);}
 search=true;h.reset();h.render(h.jsx(Probe,{}));assert.ok(view.searchCards.length>0);measurements.searchOpen={...h.counts};
 h.reset();h.render(h.jsx(Probe,{}));if(!capture)assert.equal(h.counts.walletCanvasPresentation??0,0);
 search=false;h.reset();h.render(h.jsx(Probe,{}));if(!capture)assert.equal(h.counts.walletCanvasPresentation??0,0);
 h.unmount();
});
test('Capture actual form/carousel/image work for a photo and immediate controlled Name/Number input',()=>{
 const h=harness(),Form=h.load('src/components/bemem/AddCardForm.tsx').AddCardForm,form=h.load('src/lib/card-form.ts'),presentation=h.load('src/lib/card-presentation.ts').emptyCardPresentation();
 const photo={assetId:'art-synthetic.jpg',width:4000,height:3000,byteLength:100,md5:'a'.repeat(32),crop:{x:.9,y:.1,zoom:2.8}};presentation.artwork={front:photo};let values={...form.emptyCardForm(),name:'Test',memberNumber:'001'};
 const draw=()=>h.render(h.jsx(Form,{values,errors:{},presentation,onChange:v=>{values=v;},onPresentationChange(){}}));
 let tree=draw();for(const node of h.nodes(tree))if(node.type==='View'&&Array.isArray(node.props.style)&&node.props.style[0]?.overflow==='hidden'&&node.props.onLayout)node.props.onLayout({nativeEvent:{layout:{width:200,height:140}}});tree=draw();
 measurements.mountedPhotoViews=h.nodes(tree).filter(n=>n.type==='Image').length;
 for(const field of ['Name','Number']){h.reset();h.nodes(tree).find(n=>n.type==='TextInput'&&n.props.accessibilityLabel===field).props.onChangeText(field==='Name'?'Test A':'0012');tree=draw();measurements[field+'Keystroke']={...h.counts};
  if(!capture){assert.equal(h.counts.CardArtworkImage??0,0);assert.equal(h.counts.artworkUri??0,0);assert.equal(h.counts.nativeImageBindings??0,0);}
 }
 if(!capture)assert.ok(measurements.mountedPhotoViews<=3);
 assert.equal(values.name,'Test A');assert.equal(values.memberNumber,'0012');assert.deepEqual(photo.crop,{x:.9,y:.1,zoom:2.8});
 // Continuous controlled updates are immediate, while image components remain memoized.
 h.reset();for(let i=0;i<12;i++){h.nodes(tree).find(n=>n.type==='TextInput'&&n.props.accessibilityLabel==='Name').props.onChangeText('Immediate '+i);tree=draw();assert.equal(values.name,'Immediate '+i);}
 if(!capture){assert.equal(h.counts.CardArtworkImage??0,0);assert.equal(h.counts.artworkUri??0,0);}
 h.reset();const formResources=h.resources();assert.equal(formResources.listeners,1);
 for(const mode of ['frontback','cardcode','frontback']){presentation.sheetDisplayMode=mode;tree=draw();assert.equal(h.counts.MembershipCardDetail??0,0);assert.equal(h.counts.CardFrontBackArtwork??0,0);assert.equal(h.counts.nativeImageBindings??0,0);assert.deepEqual(h.resources(),formResources);}
 const oldImages=h.nodes(tree).filter(n=>n.type==='Image');h.render(null);assert.deepEqual(h.resources(),{frames:0,effects:0,listeners:0});h.reset();for(const image of oldImages)image.props.onDisplay();assert.equal(h.counts.nativeImageBindings??0,0);assert.equal(h.nodes(h.render(null)).filter(n=>n.type==='Image').length,0);
 h.unmount();h.reset();assert.equal(h.counts.nativeImageBindings??0,0);
 fs.mkdirSync(path.join(root,'output'),{recursive:true});fs.writeFileSync(path.join(root,'output',`render-performance-${capture||'after'}.json`),JSON.stringify(measurements,null,2));
});

const savedPhotoMeasurements={notice:'Production JS + deterministic hooks/layout with synthetic wallets, no native decode, CPU/GPU, FPS or Samsung memory measurement.',cases:[]};
const savedCapture=process.env.BEMEM_SAVED_PHOTO_CAPTURE;
for(const artworkKind of ['photo','builtin'])for(const fromCreate of [false,true])for(const count of (artworkKind==='photo'?[0,1,4]:[1,4]))test(`${fromCreate?'Arrange':'Home'} ${artworkKind} controlled saved-photo Card+Code -> Front&Back -> Card+Code; ${count} cards; close/reopen/restart`,()=>{
 const h=harness(),P=h.load('src/lib/wallet-preparation.ts'),Card=h.load('src/components/bemem/MembershipCard.tsx').MembershipCard,Preview=h.load('src/components/bemem/CardPreview.tsx').CardPreview;
 const builtins=h.load('src/lib/default-card-artwork.ts').createDefaultCardArtworkSession(()=>0).presentation.artwork;
 const artwork=(n,side)=>artworkKind==='builtin'?{...builtins[side],crop:{...builtins[side].crop}}:({assetId:`art-synthetic-${n}-${side}.jpg`,width:n%2?3000:4000,height:n%2?4000:3000,byteLength:3000000+n*100,md5:'a'.repeat(32),crop:side==='front'?{x:.2,y:.8,zoom:2.4}:{x:.7,y:.1,zoom:1.3}});
 let wallet={schemaVersion:2,dataset:'bemem-wallet',revision:10,savedAt:'2026-11-21T00:00:00Z',cards:Array.from({length:count},(_,n)=>({kind:'membership',id:'test-'+n,name:'Synthetic',memberNumber:'00123456',payload:'00123456',preferredDisplayFormat:'qr',orientation:n%2?'portrait':'landscape',sizePresetId:n%2?'card-portrait':'card-landscape',widthBlocks:n%2?4:6,heightBlocks:n%2?6:4,appearance:{backgroundColor:'#123456',textColor:'#ffffff',imageAssetId:null,artwork:{front:artwork(n,'front'),back:artwork(n,'back')}},createdAt:'2026-11-21T00:00:00Z',updatedAt:'2026-11-21T00:00:00Z'})),canvas:{columns:12,layout:Object.fromEntries(Array.from({length:count},(_,n)=>['test-'+n,{col:0,row:n*7}]))}};
 const baseline=JSON.stringify(wallet);let views,open=false;
 const close=()=>{open=false;};
 const draw=()=>h.render([views.cards.map(card=>h.jsx(Card,{card},card.id)),h.jsx(Preview,{presentation:'inline',card:open?views.cards[0]:null,membership:open?wallet.cards[0]:null,fromCreate,onClose:close})]);
 function settle(){let tree=draw();for(let i=0;i<3;i++){for(const node of h.nodes(tree))if((node.type==='View'||node.type==='Animated.View')&&node.props.onLayout){const id=node.props.testID;node.props.onLayout({nativeEvent:{layout:{width:id==='card-detail-slot'?170:353,height:id==='frontback-safe-host'?760:id==='frontback-details'?80:48}}});}tree=draw();}return tree;}
 const cases=[];
 for(const mode of ['cardcode','frontback','cardcode']){
  wallet=JSON.parse(baseline);wallet.cards.forEach(c=>c.sheetDisplayMode=mode);h.reset();views=P.walletCanvasPresentation(wallet);let tree=settle();
  assert.equal(h.nodes(tree).filter(n=>n.type==='Image').length,count);assert.equal(h.counts.CardFrontBackArtwork??0,0);assert.equal(h.counts.MembershipCardDetail??0,0);
  const canvasOptions=h.nodes(tree).filter(n=>n.type==='Image').map(n=>({allowDownscaling:n.props.allowDownscaling,contentFit:n.props.contentFit}));
  h.reset();draw();assert.equal(h.counts.CardArtworkImage??0,0);assert.equal(h.counts.nativeImageBindings??0,0);assert.equal(h.counts.walletCanvasPresentation??0,0);assert.equal(h.counts.validateWalletDocument??0,0);
  const detailCounts=[],closedResources=h.resources();
  if(count)for(let cycle=0;cycle<3;cycle++){
   open=true;tree=settle();const images=h.nodes(tree).filter(n=>n.type==='Image');assert.equal(images.length,count+(mode==='frontback'?2:1));detailCounts.push(images.length);
   if(!savedCapture&&mode==='frontback')for(const n of images){assert.equal(n.props.allowDownscaling,true);assert.equal(n.props.contentFit,'contain');}
   const old=images.slice(count).map(n=>n.props.onDisplay);h.nodes(tree).find(n=>n.props?.accessibilityLabel==='Close').props.onPress();tree=draw();assert.equal(h.nodes(tree).filter(n=>n.type==='Image').length,count);h.reset();old.forEach(fn=>fn?.());draw();assert.equal(h.counts.CardFrontBackArtwork??0,0);assert.equal(h.counts.MembershipCardDetail??0,0);assert.equal(h.counts.nativeImageBindings??0,0);assert.deepEqual(h.resources(),closedResources);
  }
  if(!savedCapture)for(const o of canvasOptions){assert.equal(o.allowDownscaling,true);assert.equal(o.contentFit,'contain');}
  cases.push({mode,closedImages:count,closedFrontBackMounts:0,idleImageBindings:0,canvasOptions,openImages:detailCounts});
 }
 assert.deepEqual(cases[0].canvasOptions,cases[1].canvasOptions);assert.deepEqual(cases[1].canvasOptions,cases[2].canvasOptions);
 // Simulated restart reconstructs projection from serialized bytes; no real persisted wallet accessed.
 h.unmount();wallet=JSON.parse(baseline);wallet.cards.forEach(c=>c.sheetDisplayMode='frontback');views=P.walletCanvasPresentation(JSON.parse(JSON.stringify(wallet)));open=false;assert.equal(h.nodes(settle()).filter(n=>n.type==='Image').length,count);
 h.unmount();assert.equal(h.nodes(h.render(null)).filter(n=>n.type==='Image').length,0);assert.deepEqual(h.resources(),{frames:0,effects:0,listeners:0});
 savedPhotoMeasurements.cases.push({artworkKind,fromCreate,photoCards:count,cases});fs.mkdirSync(path.join(root,'output'),{recursive:true});fs.writeFileSync(path.join(root,'output',`saved-photo-performance-${savedCapture||'after'}.json`),JSON.stringify(savedPhotoMeasurements,null,2));
});

test('Home Card Detail mounts Keeps only after an explicit action and releases child views on close/card switch',()=>{
 const h=harness(),Detail=h.load('src/components/bemem/MembershipCardDetail.tsx').MembershipCardDetail;
 const cards=['first','second'].map(id=>({kind:'membership',id,name:'Synthetic '+id,memberNumber:'00123456',payload:'00123456',preferredDisplayFormat:'qr',orientation:'landscape',sizePresetId:'card-landscape',widthBlocks:6,heightBlocks:4,sheetDisplayMode:'frontback',appearance:{backgroundColor:'#123456',textColor:'#ffffff',imageAssetId:null},createdAt:'2026-11-22T00:00:00Z',updatedAt:'2026-11-22T00:00:00Z'}));
 for(const card of [...cards,cards[0]]){
  const draw=()=>h.render([h.jsx(Detail,{card,fromCreate:false,onClose(){}},card.id)]);let tree=draw();assert.equal(h.nodes(tree).some(n=>n.type==='KeepsSheet'),false);const baseline=h.resources();
  for(let cycle=0;cycle<3;cycle++){h.nodes(tree).find(n=>n.props?.accessibilityLabel==='My Keeps').props.onPress();tree=draw();const sheets=h.nodes(tree).filter(n=>n.type==='KeepsSheet');assert.equal(sheets.length,1);assert.equal(sheets[0].props.card.id,card.id);sheets[0].props.onClose();tree=draw();assert.equal(h.nodes(tree).some(n=>n.type==='KeepsSheet'),false);assert.deepEqual(h.resources(),baseline);}
 }
 h.unmount();assert.deepEqual(h.resources(),{frames:0,effects:0,listeners:0});
});
