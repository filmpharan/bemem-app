const {test}=require('node:test'), assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
function environment(){
 const cache=new Map(),frames=new Map(),alerts=[],pickerCalls=[],pickerOptions=[];let slots=[],cursor=0,permission=true,pickerResult={canceled:true,assets:null};
 const react={useState(initial){const i=cursor++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;return[slots[i],v=>{slots[i]=typeof v==='function'?v(slots[i]):v;}];},useRef(v){const i=cursor++;return slots[i]??={current:v};},useEffect(){},useMemo:fn=>fn()};
 const picker={UIImagePickerPreferredAssetRepresentationMode:{Compatible:'compatible'},requestCameraPermissionsAsync:async()=>{pickerCalls.push('permission');return{granted:permission};},launchCameraAsync:async options=>{pickerOptions.push(options);pickerCalls.push('camera');return pickerResult;},launchImageLibraryAsync:async options=>{pickerOptions.push(options);pickerCalls.push('gallery');return pickerResult;}};
 function load(relative){let file=path.resolve(root,relative);if(!/\.tsx?$/.test(file))file+=fs.existsSync(file+'.ts')?'.ts':'.tsx';if(cache.has(file))return cache.get(file).exports;
 const mod={exports:{}};cache.set(file,mod);const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 vm.runInThisContext(`(function(require,module,exports){${code}\n})`,{filename:file})(name=>{
 if(name==='react')return react;if(name==='react/jsx-runtime')return{jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})};
 if(name==='expo-file-system')return{File:class{constructor(){throw Error('No real FileSystem allowed');}},Directory:class{},Paths:{}};
 if(name==='expo')return{uuid:{v4:()=> 'synthetic'}};if(name==='expo-image-picker')return picker;
 if(name==='react-native')return{useWindowDimensions:()=>({width:390,height:844}),Alert:{alert:(...args)=>alerts.push(args)},Keyboard:{dismiss(){}},StyleSheet:{create:v=>v,absoluteFill:{}},Modal:'Modal',View:'View',Text:'Text',Pressable:'Pressable',ScrollView:'ScrollView',PanResponder:{create:v=>({panHandlers:v})}};
 if(name==='react-native-safe-area-context')return{SafeAreaView:'SafeAreaView'};
 if(name.endsWith('/lagoon-theme'))return{lagoon:{text:{secondary:'#555',primary:'#222',onAction:'#fff'},surface:{base:'#eee'},canvas:{base:'#eee'},action:{primary:'#405764'}},lagoonFonts:{latin:'Manrope'}};
 if(['./GlassButton','./AddCardIcon','./CardArtworkImage','./ArtworkSlider'].includes(name)){const key=name.slice(2);return{[key]:key};}
 assert.ok(name.startsWith('.'),'No uncontrolled dependency '+name);return load(path.resolve(path.dirname(file),name));
 },mod,mod.exports);return mod.exports;}
 const render=(component,props,key='main')=>{slots=frames.get(key)??[];frames.set(key,slots);cursor=0;return component(props);};
 return{load,render,alerts,pickerCalls,pickerOptions,permission:v=>{permission=v;},result:v=>{pickerResult=v;}};
}
const env=environment(),art=env.load('src/lib/card-artwork.ts'),validation=env.load('src/lib/wallet-validation.ts'),state=env.load('src/lib/card-editor-state.ts');
const sizes=env.load('src/lib/card-size-presets.ts').CARD_SIZE_PRESETS;
const clone=x=>JSON.parse(JSON.stringify(x));
const old={kind:'membership',id:'synthetic-member',name:'Synthetic',memberNumber:' 001Ab c ',payload:' 001Ab c ',preferredDisplayFormat:'qr',orientation:'landscape',appearance:{backgroundColor:'#123456',textColor:'#ffffff',imageAssetId:'legacy-reference'},createdAt:'2026-01-01T00:00:00.000Z',updatedAt:'2026-01-01T00:00:00.000Z'};
const image={assetId:'art-synthetic.jpg',width:1200,height:800,byteLength:1234,md5:'a'.repeat(32),crop:{x:.5,y:.5,zoom:1}};
const wallet=card=>({schemaVersion:2,dataset:'bemem-wallet',revision:2,savedAt:old.createdAt,cards:[card],canvas:{columns:12,layout:{[card.id]:{col:0,row:0}}}});
function nodes(t,out=[]){if(!t||typeof t!=='object')return out;if(Array.isArray(t)){t.forEach(n=>nodes(n,out));return out;}out.push(t);nodes(t.props?.children,out);return out;}
function control(t,label){const n=nodes(t).find(n=>n.props?.accessibilityLabel===label);assert.ok(n,label);return n;}
for(const p of sizes)test(`Artwork crop and stored dimensions remain proportional for ${p.id}`,()=>{
 const w=p.ratioWidth*20,h=p.ratioHeight*20,frame=art.artworkFrame(image,w,h);
 assert.ok(frame.width>=w&&frame.height>=h);assert.ok(Math.abs(frame.width/frame.height-image.width/image.height)<1e-10);
 const card={...old,orientation:p.orientation,sizePresetId:p.id,widthBlocks:p.ratioWidth,heightBlocks:p.ratioHeight,appearance:{...old.appearance,artwork:{front:image,back:{...image,assetId:'art-back.png',crop:{x:1,y:0,zoom:2}}}}};
 assert.deepEqual(validation.decodeWalletDocument(JSON.stringify(wallet(card))).cards[0],card);
});
test('Legacy roundtrip and no-change full editor preserve all absent metadata and original image reference',()=>{
 const bytes=JSON.stringify(old),result=state.prepareFullMembershipEdit(old,state.membershipEditorState(old),'2026-11-08T00:00:00.000Z');
 assert.deepEqual(result.card,old);assert.equal(result.changed,false);assert.equal(JSON.stringify(old),bytes);
});
test('All editable fields update without changing ID or unrelated legacy metadata',()=>{
 const form=state.membershipEditorState(old);Object.assign(form.values,{name:'Updated',memberNumber:' 000NEW ',payload:' 000Qr Ab ',colorId:'leaf'});
 Object.assign(form.presentation,{brandId:'lotus',brandQuery:"Lotus's",expiryMonth:'2030-12',gradientPresetId:'ptt',artwork:{front:image,back:null}});
 const result=state.prepareFullMembershipEdit(old,form,'2026-11-08T00:00:00.000Z').card;
 assert.equal(result.id,old.id);assert.equal(result.memberNumber,' 000NEW ');assert.equal(result.payload,' 000NEW ');assert.equal(result.appearance.imageAssetId,old.appearance.imageAssetId);
 assert.equal(result.appearance.backgroundColor,old.appearance.backgroundColor);assert.equal(result.expiryMonth,'2030-12');assert.deepEqual(result.appearance.artwork.front,image);
});
test('Invalid artwork IDs, dimensions, crop, digest and unknown nested fields never pass validation',()=>{
 for(const patch of [{assetId:'../../wallet.json'},{assetId:'https://example.com/x.jpg'},{width:0},{height:1.5},{byteLength:art.MAX_IMAGE_BYTES+1},{md5:'bad'},{crop:{x:-1,y:.5,zoom:1}},{crop:{x:0,y:0,zoom:4}},{unexpected:true}]){
 const card={...old,appearance:{...old.appearance,artwork:{front:{...image,...patch}}}};assert.throws(()=>validation.validateWalletCard(card));}
 assert.throws(()=>validation.validateWalletCard({...old,appearance:{...old.appearance,artwork:{other:image}}}));
});
test('Image selection rejects remote, unsupported, oversized, malformed or video inputs',()=>{
 const good={uri:'file:///synthetic.jpg',width:100,height:100,mimeType:'image/jpeg',type:'image',fileSize:100};
 assert.equal(art.validateImageSelection(good),'jpg');
 for(const patch of [{uri:'https://example.com/x.jpg'},{type:'video'},{width:0},{width:1.1},{width:10000,height:10000},{fileSize:art.MAX_IMAGE_BYTES+1},{uri:'file:///x.heic',mimeType:'image/heic'}]) assert.throws(()=>art.validateImageSelection({...good,...patch}));
});
test('Immutable file copy verifies bytes/hash and never overwrites or removes previous front/back files',async()=>{
 const storeModule=env.load('src/lib/card-artwork-store.ts'),files=new Map([['file:///picked.jpg','synthetic-image']]),copies=[];
 const info=uri=>{const v=files.get(uri);return{exists:v!==undefined,size:v?.length,md5:v===undefined?null:crypto.createHash('md5').update(v).digest('hex')};};let n=0;
 const ports={info,uri:id=>'file:///documents/'+id,nextId:()=>`copy-${++n}`,copyExclusive:async(source,id)=>{const target=ports.uri(id);assert.equal(files.has(target),false);copies.push(target);files.set(target,files.get(source));}};
 const store=storeModule.createArtworkStore(ports),input={uri:'file:///picked.jpg',width:100,height:80,mimeType:'image/jpeg'};
 const first=await store.retain(input),original=files.get(ports.uri(first.assetId));
 files.set(input.uri,'replacement-image');const second=await store.retain(input);
 assert.notEqual(first.assetId,second.assetId);assert.equal(files.get(ports.uri(first.assetId)),original);
 store.verifyWallet(wallet({...old,appearance:{...old.appearance,artwork:{front:second,back:first}}}));
 files.delete(input.uri);store.verifyWallet(wallet({...old,appearance:{...old.appearance,artwork:{front:second}}}));
 files.set(ports.uri(second.assetId),'corrupt');assert.throws(()=>store.verifyWallet(wallet({...old,appearance:{...old.appearance,artwork:{front:second}}})));
 assert.equal(copies.length,2);
});
test('Failed image copy/readback cannot produce a usable reference or remove previous files',async()=>{
 const create=env.load('src/lib/card-artwork-store.ts').createArtworkStore;
 const input={uri:'file:///picked.jpg',width:100,height:80,mimeType:'image/jpeg'};
 const base={uri:id=>'file:///'+id,nextId:()=> 'copy',info:()=>({exists:true,size:100,md5:'a'.repeat(32)}),copyExclusive:async()=>{throw Error('copy failed');}};
 await assert.rejects(create(base).retain(input));
 await assert.rejects(create({...base,info:uri=>({exists:true,size:uri===input.uri?100:99,md5:'a'.repeat(32)}),copyExclusive:async()=>{}}).retain(input));
});
function controls(){const e=environment(),component=e.load('src/components/bemem/CardArtworkControls.tsx').CardArtworkControls;let draft=e.load('src/lib/card-presentation.ts').emptyCardPresentation(),busy=false,retains=0;
 e.load('src/lib/card-artwork-store.ts').deviceArtworkStore.retain=async()=>{retains++;return clone(image);};
 const render=()=>e.render(component,{presentation:draft,onChange:next=>{draft=next;},disabled:false,onBusy:v=>{busy=v;}});
 return{e,render,draft:()=>draft,busy:()=>busy,retains:()=>retains};}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
test('Camera denied and picker Cancel preserve all form artwork without copying files',async()=>{
 const h=controls(),before=clone(h.draft());h.e.permission(false);control(h.render(),'Take Photo').props.onPress();await tick();
 assert.deepEqual(h.e.pickerCalls,['permission']);assert.equal(h.e.alerts.length,1);assert.deepEqual(h.draft(),before);assert.equal(h.retains(),0);
 control(h.render(),'Choose from Gallery').props.onPress();await tick();assert.deepEqual(h.draft(),before);assert.equal(h.retains(),0);assert.equal(h.busy(),false);
});
test('Gallery selection and confirmed replacement affect only the active side; crop confirms non-destructively',async()=>{
 const h=controls();h.e.result({canceled:false,assets:[{uri:'file:///synthetic.jpg',width:1200,height:800,type:'image'}]});
 control(h.render(),'Choose from Gallery').props.onPress();await tick();assert.equal(h.draft().artwork,undefined);
 let tree=h.render(),crop=nodes(tree).find(n=>typeof n.type==='function');assert.ok(crop);
 crop.props.onConfirm({...image,crop:{x:0,y:1,zoom:2}});assert.equal(h.draft().artwork.front.crop.zoom,2);
 tree=h.render();assert.equal(nodes(tree).some(n=>n.props?.accessibilityLabel==='Artwork options'),false);assert.equal(h.draft().artwork.front.crop.zoom,2);
 assert.equal(h.retains(),1);assert.deepEqual(h.e.pickerCalls,['gallery']);
});
test('Malformed picker result reports failure and retains previous fields',async()=>{
 const h=controls(),before=clone(h.draft());h.e.result({canceled:false,assets:[]});control(h.render(),'Choose from Gallery').props.onPress();await tick();
 assert.deepEqual(h.draft(),before);assert.equal(h.e.alerts[0][0],'Image unavailable');assert.equal(h.busy(),false);
});
test('Crop zoom and drag use one scale and have 48dp tap alternatives and explicit Cancel',async()=>{
 const h=controls();h.e.result({canceled:false,assets:[{uri:'file:///synthetic.jpg',width:1200,height:800,type:'image'}]});
 control(h.render(),'Choose from Gallery').props.onPress();await tick();const child=nodes(h.render()).find(n=>typeof n.type==='function');
 let tree=h.e.render(child.type,child.props,'crop');control(tree,'Zoom in').props.onPress();tree=h.e.render(child.type,child.props,'crop');
 assert.equal(nodes(tree).find(n=>n.type==='CardArtworkImage').props.image.crop.zoom,1.1);
 control(tree,'Fine adjustment').props.onPress();tree=h.e.render(child.type,child.props,'crop');nodes(tree).find(n=>n.props?.label==='Horizontal image position').props.onChange(.4);tree=h.e.render(child.type,child.props,'crop');
 assert.ok(nodes(tree).find(n=>n.type==='CardArtworkImage').props.image.crop.x<.5);
 for(const n of nodes(tree).filter(n=>n.type==='GlassButton'))assert.equal(Object.assign({},...(Array.isArray(n.props.style)?n.props.style:[n.props.style])).minHeight,48);
 const before=clone(h.draft());control(tree,'Cancel image crop').props.onPress();assert.deepEqual(h.draft(),before);
});
test('A full 12×240 grid cannot resize a 6×4 slot to 8×4 and never changes any stored coordinates',()=>{
 const cards=[],layout={};for(let row=0;row<240;row+=4)for(const col of [0,6]){const card={...old,id:`slot-${row}-${col}`,sizePresetId:'card-landscape',widthBlocks:6,heightBlocks:4};cards.push(card);layout[card.id]={col,row};}
 const input={...wallet(cards[0]),cards,canvas:{columns:12,layout}},before=JSON.stringify(input),target={...cards[0],sizePresetId:'boarding-pass-landscape',widthBlocks:8,heightBlocks:4};
 assert.throws(()=>state.membershipResizePlan(input,target),/no space/i);assert.equal(JSON.stringify(input),before);
});
test('Shrinking and equal-size edits keep original position while a growing card proposes only its own relocation',()=>{
 const other={...old,id:'second'},input={...wallet(old),cards:[old,other],canvas:{columns:12,layout:{[old.id]:{col:0,row:0},second:{col:6,row:0}}}};
 const small={...old,sizePresetId:'mini-landscape',widthBlocks:3,heightBlocks:2};assert.deepEqual(state.membershipResizePlan(input,small),{moved:false,position:{col:0,row:0}});
 const big={...old,sizePresetId:'boarding-pass-landscape',widthBlocks:8,heightBlocks:4},plan=state.membershipResizePlan(input,big);
 assert.equal(plan.moved,true);assert.deepEqual(plan.position,{col:0,row:4});assert.deepEqual(input.canvas.layout.second,{col:6,row:0});
});
test('Camera success and Back-side gallery changes preserve the other side and non-image form data',async()=>{
 const e=environment(),component=e.load('src/components/bemem/CardArtworkControls.tsx').CardArtworkControls;let draft={...e.load('src/lib/card-presentation.ts').emptyCardPresentation(),side:'back',expiryMonth:'2030-12',artwork:{front:image}},count=0;
 e.load('src/lib/card-artwork-store.ts').deviceArtworkStore.retain=async()=>({...image,assetId:`art-new-${++count}.jpg`});
 e.result({canceled:false,assets:[{uri:'file:///synthetic.jpg',width:1200,height:800}]});
 const render=()=>e.render(component,{presentation:draft,onChange:next=>{draft=next;},disabled:false});
 control(render(),'Take Photo').props.onPress();await tick();assert.deepEqual(e.pickerCalls,['permission','camera']);assert.deepEqual(draft.artwork.front,image);
 const crop=nodes(render()).find(n=>typeof n.type==='function');crop.props.onConfirm(crop.props.image);
 assert.equal(draft.artwork.back.assetId,'art-new-1.jpg');assert.equal(draft.expiryMonth,'2030-12');
 control(render(),'Choose from Gallery').props.onPress();await tick();
 const replacement=nodes(render()).find(n=>typeof n.type==='function');replacement.props.onCancel();
 assert.equal(draft.artwork.back.assetId,'art-new-1.jpg');assert.deepEqual(draft.artwork.front,image);
});
test('Camera cancellation returns to the unchanged form without image copy or automatic save',async()=>{
 const h=controls(),before=clone(h.draft());control(h.render(),'Take Photo').props.onPress();await tick();
 assert.deepEqual(h.e.pickerCalls,['permission','camera']);assert.deepEqual(h.draft(),before);assert.equal(h.retains(),0);assert.equal(h.busy(),false);
});

for(const action of ['Take Photo','Choose from Gallery'])test(`${action} requests original-quality acquisition once and cancellation does no retention/crop`,async()=>{
 const h=controls(),before=clone(h.draft());control(h.render(),action).props.onPress();control(h.render(),action).props.onPress();await tick();
 assert.equal(h.e.pickerOptions.length,1);assert.deepEqual(h.e.pickerOptions[0],{mediaTypes:['images'],allowsEditing:false,quality:1,base64:false,exif:false,preferredAssetRepresentationMode:'compatible'});
 assert.equal(h.retains(),0);assert.deepEqual(h.draft(),before);assert.equal(nodes(h.render()).some(n=>typeof n.type==='function'&&n.type.name==='ArtworkCrop'),false);
 h.e.result({canceled:false,assets:[{uri:'file:///synthetic.jpg',width:4000,height:3000,type:'image'}]});control(h.render(),action).props.onPress();await tick();
 assert.equal(h.retains(),1);const crop=nodes(h.render()).find(n=>typeof n.type==='function'&&n.type.name==='ArtworkCrop');assert.ok(crop);
 const tree=h.e.render(crop.type,crop.props,'capture-crop');assert.equal(nodes(tree).find(n=>n.type==='CardArtworkImage').props.displayPreview,'crop');
 crop.props.onConfirm({...image,crop:{x:.23,y:.78,zoom:2.1}});for(let n=0;n<15;n++)h.render();assert.equal(h.retains(),1);assert.deepEqual(h.draft().artwork.front.crop,{x:.23,y:.78,zoom:2.1});
});
