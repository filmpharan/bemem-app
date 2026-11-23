// Synthetic images, mocked native capture/sharing/FileSystem. Never opens Android or reads a device wallet.
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript'),crypto=require('node:crypto'),zlib=require('node:zlib'),Z=require('@zxing/library');
const root=path.resolve(__dirname,'..');
function crc32(b){let c=0xffffffff;for(const v of b){c^=v;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0);}return(c^0xffffffff)>>>0;}
function png(width,height,pixels=Buffer.alloc(width*height,255)){
 const chunk=(type,data)=>{const t=Buffer.from(type),out=Buffer.alloc(data.length+12);out.writeUInt32BE(data.length);t.copy(out,4);data.copy(out,8);out.writeUInt32BE(crc32(Buffer.concat([t,data])),data.length+8);return out;};
 const header=Buffer.alloc(13);header.writeUInt32BE(width);header.writeUInt32BE(height,4);header[8]=8;header[9]=0;
 const rows=Buffer.alloc((width+1)*height);for(let y=0;y<height;y++)Buffer.from(pixels.subarray(y*width,(y+1)*width)).copy(rows,y*(width+1)+1);
 return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',zlib.deflateSync(rows)),chunk('IEND',Buffer.alloc(0))]);
}
function decodePng(bytes,format){const width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20),parts=[];for(let p=8;p<bytes.length;){const n=bytes.readUInt32BE(p),type=bytes.toString('ascii',p+4,p+8);if(type==='IDAT')parts.push(bytes.subarray(p+8,p+8+n));p+=n+12;}const raw=zlib.inflateSync(Buffer.concat(parts)),pixels=new Uint8ClampedArray(width*height);for(let y=0;y<height;y++){assert.equal(raw[y*(width+1)],0);pixels.set(raw.subarray(y*(width+1)+1,y*(width+1)+1+width),y*width);}
 const reader=new Z.MultiFormatReader(),hints=new Map([[Z.DecodeHintType.POSSIBLE_FORMATS,[format==='qr'?Z.BarcodeFormat.QR_CODE:Z.BarcodeFormat.CODE_128]],[Z.DecodeHintType.TRY_HARDER,true]]);reader.setHints(hints);return reader.decode(new Z.BinaryBitmap(new Z.HybridBinarizer(new Z.RGBLuminanceSource(pixels,width,height))),hints).getText();}
function svgPixels(code){const box=/viewBox="0 0 (\d+) (\d+)"/.exec(code.svg),sx=code.width/Number(box[1]),sy=code.height/Number(box[2]);assert.ok(Number.isInteger(sx)&&Number.isInteger(sy));const pixels=Buffer.alloc(code.width*code.height,255);for(const m of code.svg.matchAll(/M(\d+) (\d+)h(\d+)v(\d+)h-\d+z/g)){const x=+m[1]*sx,y=+m[2]*sy,w=+m[3]*sx,h=+m[4]*sy;assert.ok(x>=0&&y>=0&&x+w<=code.width&&y+h<=code.height);for(let row=y;row<y+h;row++)pixels.fill(0,row*code.width+x,row*code.width+x+w);}return pixels;}
function environment(dimensions={width:390,height:844,fontScale:1},reduced=false){
 const animations=[],motionListeners=new Set();
 const data=new Map(),events=[],cache=new Map(),frames=new Map(),nativeCalls=[],captures=[],released=[],loaded=[];let uuid=0,activeSlots=[],cursor=0,effects=[],available=true,openError=false,captureError=false,openGate=null,captureGate=null;
 const react={useState(initial){const slots=activeSlots,i=cursor++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;return[slots[i],v=>{slots[i]=typeof v==='function'?v(slots[i]):v;}];},useRef(initial){const i=cursor++;return activeSlots[i]??={current:initial};},
 useMemo(fn,deps){const i=cursor++,old=activeSlots[i];if(old&&deps?.every((v,j)=>v===old.deps[j]))return old.value;const value=fn();activeSlots[i]={deps,value};return value;},useCallback(fn,deps){return react.useMemo(()=>fn,deps);},
 useEffect(fn,deps){const slots=activeSlots,i=cursor++,old=slots[i];if(old&&deps?.every((v,j)=>v===old.deps[j]))return;effects.push(()=>{old?.cleanup?.();slots[i]={deps,cleanup:fn(),setup:fn,effect:true};});}};
 class Directory{constructor(parent,name){this.uri=name?parent.uri.replace(/\/$/,'')+'/'+name:parent;this.name=this.uri.split('/').at(-1);}create(){events.push(['mkdir',this.uri]);}}
 class File{constructor(parent,name){this.uri=name?parent.uri.replace(/\/$/,'')+'/'+name:typeof parent==='string'?parent:parent.uri;this.name=this.uri.split('/').at(-1);}get exists(){return data.has(this.uri);}info(){events.push(['info',this.uri]);const b=data.get(this.uri);return{exists:!!b,size:b?.length,md5:b?crypto.createHash('md5').update(b).digest('hex'):null};}async bytes(){assert.ok(data.has(this.uri));return data.get(this.uri);}async copy(target,opts){assert.equal(opts.overwrite,false);assert.equal(data.has(target.uri),false);events.push(['copy',this.uri,target.uri]);data.set(target.uri,Buffer.from(data.get(this.uri)));}async delete(){events.push(['delete',this.uri]);data.delete(this.uri);}}
 const sharing={isAvailableAsync:async()=>available,shareAsync:async(uri,options)=>{nativeCalls.push({uri,options});if(openGate)await openGate;if(openError)throw Error('synthetic native cancellation/error');}};
 function load(relative){let file=path.resolve(root,relative);if(!/\.tsx?$/.test(file))file+=fs.existsSync(file+'.ts')?'.ts':'.tsx';if(cache.has(file))return cache.get(file).exports;loaded.push(file);
 const mod={exports:{}};cache.set(file,mod);const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
 vm.runInThisContext(`(function(require,module,exports){${code}\n})`,{filename:file})(name=>{
 if(name==='react')return react;if(name==='react/jsx-runtime')return{jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})};
 if(name==='qrcode/lib/core/qrcode'||name==='jsbarcode')return require(name);
 if(name==='react-native')return{useWindowDimensions:()=>dimensions,Animated:{Value:class{interpolate(v){return v;}stopAnimation(){}},View:'Animated.View',timing:(_v,options)=>({start(){animations.push(options);},stop(){}})},Easing:{cubic:'cubic',out:v=>v},AccessibilityInfo:{isReduceMotionEnabled:async()=>reduced,addEventListener:(_n,fn)=>{motionListeners.add(fn);return{remove:()=>motionListeners.delete(fn)};}},PixelRatio:{get:()=>3},View:'View',Text:'Text',Pressable:'Pressable',ScrollView:'ScrollView',ActivityIndicator:'ActivityIndicator',StyleSheet:{create:v=>v,absoluteFill:{}}};
 if(name==='react-native-safe-area-context')return{useSafeAreaInsets:()=>({top:24,bottom:24,left:0,right:0})};
 if(name==='expo-image')return{Image:'Image'};if(name==='expo-font')return{useFonts:()=>[true,null]};
 if(name.endsWith('.ttf'))return 1;
 if(name==='expo-file-system')return{Directory,File,Paths:{cache:new Directory('file:///cache'),document:new Directory('file:///documents')}};
 if(name==='expo')return{uuid:{v4:()=>`synthetic-${++uuid}`}};
 if(name==='expo-sharing')return sharing;
 if(name==='react-native-view-shot')return{captureRef:async(view,options)=>{captures.push({view,options});if(captureGate)await captureGate;if(captureError)throw Error('synthetic capture failed');const uri=`file:///captures/${++uuid}.png`;data.set(uri,png(view.width,view.height??300));return uri;},releaseCapture:uri=>{released.push(uri);data.delete(uri);}};
 if(name.endsWith('/ci-theme'))return require('./ci-theme-fixture.cjs');
 if(name.endsWith('/sheet-visual'))return require('./sheet-visual-fixture.cjs');
 if(name.endsWith('/lagoon-theme'))return{lagoon:{text:{primary:'#222222',secondary:'#555555',onAction:'#ffffff'},surface:{base:'#eeeeee'}},lagoonFonts:{latin:'Manrope'}};
 if(['./AddCardSheet','./GlassButton','./CardShareSurface','./CardAppearancePreview','./AddCardText','./AddCardIcon'].includes(name)){const key=name.slice(2);return{[key]:key};}
 assert.ok(name.startsWith('.'),'No uncontrolled import '+name);return load(path.resolve(path.dirname(file),name));},mod,mod.exports);return mod.exports;}
 function render(component,props,key='main'){activeSlots=frames.get(key)??[];frames.set(key,activeSlots);cursor=0;effects=[];const tree=component(props);for(const run of effects)run();return tree;}
 return{load,render,data,events,animations,motionListeners,nativeCalls,captures,released,loaded,replay(key){const list=(frames.get(key)??[]).filter(s=>s?.effect);for(const s of list)s.cleanup?.();for(const s of list)s.cleanup=s.setup();},unmount(key){for(const slot of frames.get(key)??[])if(slot?.effect)slot.cleanup?.();frames.delete(key);},available(v){available=v;},openError(v){openError=v;},captureError(v){captureError=v;},openGate(v){openGate=v;},captureGate(v){captureGate=v;}};
}
const base={kind:'membership',id:'private-card-id',name:'Test Member',memberNumber:' 00123456 Ab ',payload:' 00123456 Ab ',preferredDisplayFormat:'qr',orientation:'landscape',appearance:{backgroundColor:'#405764',textColor:'#ffffff',imageAssetId:null,gradientPresetId:'ptt'},createdAt:'2026-01-01T00:00:00.000Z',updatedAt:'2026-01-01T00:00:00.000Z'};
const clone=x=>JSON.parse(JSON.stringify(x)),env=environment(),planning=env.load('src/lib/card-share-plan.ts');
const opts=patch=>({...planning.DEFAULT_SHARE_OPTIONS,...patch});
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function nodes(t,out=[]){if(!t||typeof t!=='object')return out;if(Array.isArray(t)){t.forEach(n=>nodes(n,out));return out;}out.push(t);nodes(t.props?.children,out);nodes(t.props?.footer,out);return out;}
function control(t,label){const n=nodes(t).find(n=>n.props?.accessibilityLabel===label);assert.ok(n,'Missing '+label);return n;}
const presets=env.load('src/lib/card-size-presets.ts').CARD_SIZE_PRESETS;
test('PNG validation rejects invalid headers, oversized exports and incorrect capture width',()=>{
 assert.throws(()=>planning.inspectSharePng(Buffer.from('not an image')));assert.throws(()=>planning.inspectSharePng(png(100,20),200));
 const b=png(10,10);b.writeUInt32BE(99999,16);assert.throws(()=>planning.inspectSharePng(b));
});
test('Native cache copies exact reviewed PNG and retains published copy while removing only owned previews',async()=>{
 const e=environment(),native=e.load('src/lib/card-share-native.ts').cardShareNative,source='file:///captures/synthetic.png',original=png(300,200);e.data.set(source,original);
 const preview=await native.adoptCapture(source,300);assert.match(preview.uri,/cache\/bemem-share-exports\/preview-/);assert.deepEqual(e.data.get(source),original);
 const published=await native.publish(preview.uri,preview.md5);assert.deepEqual(e.data.get(published),e.data.get(preview.uri));
 await native.removePreview(preview.uri);assert.ok(e.data.has(published));assert.ok(e.data.has(source));assert.equal(e.data.has(preview.uri),false);
 await assert.rejects(native.removePreview(published));await assert.rejects(native.removePreview('file:///documents/bemem-card-artwork/preview-wrong.png'));
});
test('Native publish rejects a file changed after preview and never writes original artwork or Wallet files',async()=>{
 const e=environment(),native=e.load('src/lib/card-share-native.ts').cardShareNative,source='file:///captures/synthetic.png';e.data.set(source,png(200,100));const preview=await native.adoptCapture(source,200);
 e.data.set(preview.uri,png(201,100));await assert.rejects(native.publish(preview.uri,preview.md5),/changed/);
 assert.equal(e.events.some(event=>event[0]==='copy'&&event[2].includes('documents')),false);
 assert.equal(e.loaded.some(file=>/wallet-(repository|coordinator|storage|feature-commands)/.test(file)),false);
});
test('Delivery serializes duplicate requests, handles cancellation neutrally and never removes published files',async()=>{
 const e=environment(),create=e.load('src/lib/card-share-session.ts').createCardShareSession,calls=[],removed=[];let release;
 const gate=new Promise(resolve=>{release=resolve;}),session=create({available:async()=>true,publish:async(uri,digest)=>{assert.equal(digest,'digest');return 'shared-copy';},open:async uri=>{calls.push(uri);await gate;},removePreview:async uri=>removed.push(uri)});
 session.track('preview','digest');const first=session.share('preview');assert.equal((await session.share('preview')).ok,false);await tick();assert.deepEqual(calls,['shared-copy']);release();const result=await first;assert.equal(result.ok,true);assert.match(result.message,/Returned/);assert.doesNotMatch(result.message,/success/);
 await session.close();assert.deepEqual(removed,['preview']);assert.equal(removed.includes('shared-copy'),false);assert.equal((await session.share('preview')).ok,false);
});
test('Unavailable sharing and native failure do not claim completion or retry automatically',async()=>{
 const e=environment(),create=e.load('src/lib/card-share-session.ts').createCardShareSession;let opens=0;
 const unavailable=create({available:async()=>false,publish:async()=>assert.fail('must not publish'),open:async()=>{opens++;},removePreview:async()=>{}});unavailable.track('preview');assert.match((await unavailable.share('preview')).message,/unavailable/);
 const failing=create({available:async()=>true,publish:async()=> 'published',open:async()=>{opens++;throw Error('cancelled/error');},removePreview:async()=>{}});failing.track('preview');assert.equal((await failing.share('preview')).ok,false);assert.equal(opens,1);
});
test('Closed preparation cleans late preview files and never invokes a stale native Share',async()=>{
 const e=environment(),create=e.load('src/lib/card-share-session.ts').createCardShareSession,removed=[];let finish;
 const gate=new Promise(r=>{finish=r;}),session=create({available:()=>gate,publish:async()=>assert.fail('closed'),open:async()=>assert.fail('closed'),removePreview:async uri=>removed.push(uri)});
 session.track('first');const pending=session.share('first');await session.close();finish(true);assert.equal((await pending).ok,false);assert.equal(session.track('late'),false);await tick();assert.deepEqual(removed,['first','late']);
});

const art={assetId:'art-synthetic.jpg',width:1200,height:800,byteLength:20,md5:'a'.repeat(32),crop:{x:.5,y:.5,zoom:1}};
const full={...clone(base),expiryMonth:'2030-12-31',appearance:{...base.appearance,artwork:{front:art,back:{...art,assetId:'art-back.jpg'}}}};
const only=(...fields)=>Object.fromEntries(planning.SHARE_FIELDS.map(f=>[f,fields.includes(f)]));
for(const preset of presets)test(`v3 composition preserves ${preset.id} footprint with no name/number overlay`,()=>{
 const card={...clone(full),orientation:preset.orientation,sizePresetId:preset.id,widthBlocks:preset.ratioWidth,heightBlocks:preset.ratioHeight},before=JSON.stringify(card),plan=planning.prepareCardShare(card,opts());
 assert.equal(plan.widthBlocks,preset.ratioWidth);assert.equal(plan.heightBlocks,preset.ratioHeight);assert.ok(Math.abs(plan.cardWidth/plan.cardHeight-(preset.ratioWidth-.2)/(preset.ratioHeight-.2))<1e-8);
 assert.deepEqual(plan.fields,['front']);assert.deepEqual(plan.texts,{});assert.deepEqual(plan.codes,{});assert.equal(plan.id,undefined);assert.equal(plan.name,undefined);assert.equal(JSON.stringify(card),before);
});

test('All128 option combinations either preserve selection or reject simultaneous QR/Barcode',()=>{
 const before=JSON.stringify(full);
 for(let mask=0;mask<128;mask++){
  const options=Object.fromEntries(planning.SHARE_FIELDS.map((f,i)=>[f,!!(mask&(1<<i))])),plan=options.qr&&options.barcode?null:planning.prepareCardShare(full,options);
  if(options.qr&&options.barcode){assert.throws(()=>planning.prepareCardShare(full,options),/not both/);continue;}
  if(!mask){assert.equal(plan,null);continue;}
  assert.deepEqual(plan.fields,planning.SHARE_FIELDS.filter(f=>options[f]));
  for(const field of ['qr','barcode'])assert.equal(!!plan.codes[field],options[field]);
  for(const field of ['name','number','expiry'])assert.equal(Object.hasOwn(plan.texts,field),options[field]);
 }
 assert.equal(JSON.stringify(full),before);
});

for(const [field,format]of [['qr','qr'],['barcode','code128']])test(`v2 ${field}-only SVG to PNG to independent ZXing preserves Number exactly`,()=>{
 for(const number of ['00123456',' 000 Ab C ','A1b2','00000000000000001234']){
  const card={...base,memberNumber:number,payload:'OBSOLETE'},plan=planning.prepareCardShare(card,only(field)),code=plan.codes[field];
  assert.equal(decodePng(png(code.width,code.height,svgPixels(code)),format),number);assert.deepEqual(plan.texts,{});assert.deepEqual(plan.fields,[field]);assert.doesNotMatch(code.svg,/transform=/);
 }
});

test('Unicode QR remains exact, unsupported/overlong Barcode cannot silently convert or clip',()=>{
 const card={...base,memberNumber:' 000 Thai \u0e01 '},plan=planning.prepareCardShare(card,only('qr'));
 assert.equal(decodePng(png(plan.codes.qr.width,plan.codes.qr.height,svgPixels(plan.codes.qr)),'qr'),card.memberNumber);
 assert.equal(planning.cardShareAvailability(card).barcode,false);assert.throws(()=>planning.prepareCardShare(card,only('barcode')),/unavailable/);
 assert.throws(()=>planning.prepareCardShare({...base,memberNumber:'A'.repeat(100)},only('barcode')),/too wide/);
});

test('Missing fields and legacy/demo data are unavailable without fabricating content',()=>{
 assert.equal(planning.cardShareAvailability(base).back,false);assert.equal(planning.cardShareAvailability(base).expiry,false);
 assert.throws(()=>planning.prepareCardShare(base,only('back')),/unavailable/);assert.throws(()=>planning.prepareCardShare(base,only('expiry')),/unavailable/);
 assert.equal(planning.cardShareAvailability({...base,memberNumber:null}).qr,false);
 assert.equal(planning.cardShareAvailability({...base,appearance:{...base.appearance,imageAssetId:'reserved-old'}}).front,false);
 assert.throws(()=>planning.prepareCardShare({kind:'demo',id:'demo',name:'Demo',orientation:'landscape',colors:['#123456','#abcdef']},opts()),/Demo/);
 assert.throws(()=>planning.prepareCardShare(base,{...opts(),unknown:true}));
});

test('Artwork-only and text-only preparation never encodes unselected information or adds metadata',()=>{
 const e=environment(),codec=e.load('src/lib/card-code.ts'),original=codec.encodeCardCode;let encodes=0;codec.encodeCardCode=(...args)=>{encodes++;return original(...args);};
 for(const options of [opts(),only('name'),only('number'),only('expiry')]){const plan=e.load('src/lib/card-share-plan.ts').prepareCardShare(full,options);assert.equal(plan.id,undefined);assert.equal(plan.updatedAt,undefined);assert.deepEqual(plan.codes,{});}
 assert.equal(encodes,0);
});

function host(card=base){const e=environment(),Sheet=e.load('src/components/bemem/ShareCardSheet.tsx').ShareCardSheet;let closes=0;
 const render=()=>{let t=e.render(Sheet,{card,onClose(){closes++;}},'sheet');t.props.onContentViewportLayout?.({width:360,height:560});for(const n of nodes(t).filter(n=>n.type==='Text'&&n.props.onTextLayout)){const style=Object.assign({},...[n.props.style].flat(Infinity).filter(Boolean));if(style.width===65536||style.width===4096)n.props.onTextLayout({nativeEvent:{lines:[{width:Array.from(n.props.children).length*style.fontSize*.55}]}});}return e.render(Sheet,{card,onClose(){closes++;}},'sheet');};
 async function prepare(){let t=render();control(t,'Share selected content').props.onPress();t=render();const surface=nodes(t).find(n=>n.type==='CardShareSurface'&&n.props.onReady);assert.ok(surface);surface.props.onReady({nodeType:1,width:surface.props.plan.width,height:surface.props.plan.height});await tick();await tick();return render();}
 return{e,card,render,prepare,closes:()=>closes};}

test('Compact Card/Info checkboxes and Code radios default to Front; Mini fits without scrolling or captures',()=>{
 const h=host(),t=h.render(),all=nodes(t);assert.deepEqual(all.filter(n=>n.props?.accessibilityRole==='checkbox').map(n=>n.props.accessibilityLabel),['Front','Back','Card Name','EXP Date','Membership Number']);
 for(const field of ['front','back','name','number','expiry'])assert.equal(control(t,planning.SHARE_LABELS[field]).props.accessibilityState.checked,field==='front');assert.equal(control(t,'None').props.accessibilityState.selected,true);
 assert.equal(control(t,'Back').props.disabled,true);assert.equal(control(t,'EXP Date').props.disabled,true);
 assert.ok(all.indexOf(control(t,'Mini share preview'))<all.indexOf(control(t,'Front')));const preview=control(t,'Mini share preview');assert.ok(preview.props.style[1].height>240&&preview.props.style[1].height<=420);
 assert.equal(nodes(preview).some(n=>n.type==='ScrollView'),false);assert.equal(h.e.captures.length,0);assert.equal(h.e.events.length,0);assert.equal(nodes(t).filter(n=>n.props?.onReady).length,0);
 for(const n of all.filter(n=>n.props?.accessibilityRole==='checkbox'))assert.ok(n.props.style({pressed:false})[0].minHeight>=48);
});

test('Checkbox changes only update live composition; no selection disables Share; unavailable Front can still share text',()=>{
 const h=host(full);let t=h.render();control(t,'Back').props.onPress();t=h.render();assert.deepEqual(nodes(t).find(n=>n.type==='CardShareSurface').props.plan.fields,['front','back']);
 control(t,'Front').props.onPress();t=h.render();assert.deepEqual(nodes(t).find(n=>n.type==='CardShareSurface').props.plan.fields,['back']);control(t,'Back').props.onPress();t=h.render();assert.equal(control(t,'Share selected content').props.disabled,true);assert.equal(h.e.captures.length,0);
 const legacy=host({...base,appearance:{...base.appearance,imageAssetId:'reserved-old'}});t=legacy.render();assert.equal(control(t,'Front').props.disabled,true);assert.equal(control(t,'Front').props.accessibilityState.checked,false);control(t,'Card Name').props.onPress();assert.equal(control(legacy.render(),'Share selected content').props.disabled,false);
});

test('Share tap mounts HD only on demand; PNG is verified, duplicate taps blocked and owned previews released',async()=>{
 const h=host(),before=JSON.stringify(h.card);let t=h.render();assert.equal(h.e.captures.length,0);control(t,'Share selected content').props.onPress();control(t,'Share selected content').props.onPress();t=h.render();
 const surfaces=nodes(t).filter(n=>n.type==='CardShareSurface');assert.equal(surfaces.length,2);assert.deepEqual(surfaces[0].props.plan,surfaces[1].props.plan);assert.equal(surfaces[1].props.displayWidth,undefined);
 surfaces[1].props.onReady({nodeType:1,width:surfaces[1].props.plan.width,height:surfaces[1].props.plan.height});surfaces[1].props.onReady({});await tick();await tick();t=h.render();
 assert.equal(h.e.captures.length,1);assert.deepEqual(h.e.captures[0].options,{format:'png',result:'tmpfile'});assert.equal(h.e.nativeCalls.length,1);assert.equal(h.e.released.length,1);assert.equal([...h.e.data.keys()].some(p=>p.includes('preview-')),false);assert.ok([...h.e.data.keys()].some(p=>p.includes('shared-')));
 assert.equal(nodes(t).filter(n=>n.props?.onReady).length,0);assert.equal(JSON.stringify(h.card),before);assert.equal(h.e.events.some(e=>e[1]?.includes('documents')&&e[0]!=='info'),false);assert.equal(h.e.loaded.some(f=>/wallet-(repository|coordinator|storage)/.test(f)),false);
});

test('Stale checkbox callback cannot export the previous selection before its render',()=>{
 const h=host(),t=h.render();control(t,'QR').props.onPress();control(t,'Share selected content').props.onPress();const next=h.render();assert.equal(nodes(next).some(n=>n.props?.onReady),false);assert.equal(h.e.captures.length,0);
});

test('Card changes during asynchronous capture abort sharing; closing releases late captures',async()=>{
 for(const mode of ['change','close']){const h=host();let release;h.e.captureGate(new Promise(r=>release=r));let t=h.render();control(t,'Share selected content').props.onPress();t=h.render();const surface=nodes(t).find(n=>n.props?.onReady);surface.props.onReady({width:surface.props.plan.width,height:surface.props.plan.height});
 if(mode==='change'){h.card.updatedAt='2026-02-01T00:00:00.000Z';h.render();}else h.e.unmount('sheet');release();await tick();await tick();assert.equal(h.e.nativeCalls.length,0);assert.equal(h.e.released.length,1);assert.equal([...h.e.data.keys()].some(p=>p.includes('preview-')),false);}
});

test('Cancellation/unavailable/capture errors are neutral, do not close Detail or automatically retry',async()=>{
 for(const mode of ['cancel','unavailable','capture']){const h=host();if(mode==='cancel')h.e.openError(true);if(mode==='unavailable')h.e.available(false);if(mode==='capture')h.e.captureError(true);const t=await h.prepare();
 assert.equal(h.closes(),0);assert.equal(h.e.captures.length,1);assert.equal(control(t,'Share selected content').props.busy,false);assert.ok(nodes(t).some(n=>n.props?.accessibilityRole==='alert'||typeof n.props?.children==='string'&&/unavailable|could not|not completed/.test(n.props.children)));h.e.unmount('sheet');}
});

test('Surface preview/export share scaled geometry, exact selected order and no app-added artwork text',()=>{
 const e=environment(),Surface=e.load('src/components/bemem/CardShareSurface.tsx').CardShareSurface,plan=planning.prepareCardShare(full,only(...planning.SHARE_FIELDS.filter(f=>f!=='barcode')));
 const a=e.render(Surface,{plan,displayWidth:320},'live'),b=e.render(Surface,{plan,onReady(){},onFailure(){}},'export');
 assert.equal(a.props.style[1].width,320);assert.equal(b.props.style[1].width*3,plan.width);
 const kind=t=>nodes(t).filter(n=>['CardAppearancePreview','Image','Text'].includes(n.type)).map(n=>n.type);assert.deepEqual(kind(a),['Text','Text','CardAppearancePreview','CardAppearancePreview','Text','Image']);assert.deepEqual(kind(b),kind(a));
 for(const t of [a,b])for(const card of nodes(t).filter(n=>n.type==='CardAppearancePreview')){assert.equal(card.props.showText,false);assert.equal(card.props.values.name,'');assert.equal(card.props.values.memberNumber,'');}
 const ratio=320/(plan.width/3);for(let i=0;i<1;i++){const x=nodes(a).filter(n=>n.type==='Image')[i].props,y=nodes(b).filter(n=>n.type==='Image')[i].props;assert.ok(Math.abs(x.style[0].width/y.style[0].width-ratio)<1e-8);assert.equal(y.style[0].transform,undefined);assert.equal(y.contentFit,'contain');}
 for(const t of [a,b]){const txt=nodes(t).filter(n=>n.type==='Text');assert.deepEqual(txt.map(n=>n.props.children),[full.name,full.expiryMonth,full.memberNumber]);assert.equal(txt.some(n=>n.props.numberOfLines),false);}
 e.unmount('export');e.unmount('live');
});

test('Home/Detail conditionally mount Share; no capture remains after dismissal or effect replay',async()=>{
 const source=fs.readFileSync(path.join(root,'src/components/bemem/MembershipCardDetail.tsx'),'utf8');assert.match(source,/if \(!fromCreate && shareOpen\) return <ShareCardSheet/);
 const h=host();h.render();h.e.replay('sheet');await h.prepare();assert.equal(h.e.nativeCalls.length,1);h.e.unmount('sheet');assert.equal(h.e.captures.length,1);
});

for(const preset of presets)test(`Smart ${preset.id} Front/Back layout uses saved dimensions with no overlaps`,()=>{
 const card={...clone(full),orientation:preset.orientation,sizePresetId:preset.id,widthBlocks:preset.ratioWidth,heightBlocks:preset.ratioHeight};
 for(const fields of [['front'],['back'],['front','back'],['name','expiry','front','back','number','qr']]){
  const plan=planning.prepareCardShare(card,only(...fields)),front=plan.items.find(i=>i.field==='front'),back=plan.items.find(i=>i.field==='back');
  if(front&&back){if(preset.ratioHeight>preset.ratioWidth){assert.equal(front.y,back.y);assert.ok(front.x+front.width<back.x);}else{assert.equal(front.x,back.x);assert.ok(front.y+front.height<back.y);}}
  for(const i of plan.items){assert.ok(i.x>=0&&i.y>=0&&i.x+i.width<=plan.width&&i.y+i.height<=plan.height);if(i.field==='front'||i.field==='back')assert.ok(Math.abs(i.width/i.height-(preset.ratioWidth-.2)/(preset.ratioHeight-.2))<1e-8);}
  assert.ok(plan.width<=2048&&plan.height<=4096&&plan.width*plan.height<=8_000_000);
 }
});

test('TOP and empty zones collapse; single fields consume available space; BOTTOM centers Number before code',()=>{
 for(const fields of [['name'],['expiry'],['name','expiry'],['number'],['qr'],['number','barcode']]){
  const p=planning.prepareCardShare(full,only(...fields));assert.equal(p.zones.includes('center'),false);assert.equal(p.zones.includes('top'),fields.includes('name')||fields.includes('expiry'));
  assert.equal(p.items.length,fields.length);const name=p.items.find(i=>i.field==='name'),date=p.items.find(i=>i.field==='expiry'),number=p.items.find(i=>i.field==='number');
  if(name&&date){assert.ok(name.x+name.width<date.x);assert.equal(name.y,date.y);}else if(name||date)assert.equal((name??date).width,p.width-p.padding*2);
  if(number){assert.equal(number.align,'center');const code=p.items.find(i=>i.field==='barcode');if(code)assert.ok(number.y+number.height<code.y);}
 }
});

test('Measured long names/Numbers fit one line without changing text; unsafe lengths fail explicitly',()=>{
 const card={...clone(full),name:'W'.repeat(120),memberNumber:'0'.repeat(200)};
 const p=planning.prepareCardShare(card,only('name','expiry','number'),{name:2400,expiry:144,number:3200});
 assert.equal(p.texts.name,card.name);assert.equal(p.texts.number,card.memberNumber);assert.equal(Number.isInteger(p.width),true);
 for(const i of p.items){assert.ok(i.fontSize>=18);assert.ok(i.height>=i.lineHeight);assert.equal(i.align,i.field==='name'?'left':i.field==='expiry'?'right':'center');}
 assert.ok(p.items.find(i=>i.field==='name').fontSize<36);assert.ok(p.items.find(i=>i.field==='number').fontSize<30);
 assert.throws(()=>planning.prepareCardShare(card,only('number'),{number:10000}),/too long.*one line/);
});

test('Code segmented control is exclusive; None clears codes; text-only and code-only remain shareable',()=>{
 const h=host(full);let t=h.render();control(t,'Front').props.onPress();t=h.render();
 for(const label of ['QR','Barcode','None']){control(t,label).props.onPress();t=h.render();const p=nodes(t).find(n=>n.type==='CardShareSurface')?.props.plan;
  assert.equal(control(t,label).props.accessibilityState.selected,true);if(label==='None')assert.equal(p,undefined);else{assert.deepEqual(p.fields,[label==='QR'?'qr':'barcode']);assert.equal(Object.keys(p.codes).length,1);}
 }
 control(t,'Membership Number').props.onPress();t=h.render();assert.deepEqual(nodes(t).find(n=>n.type==='CardShareSurface').props.plan.fields,['number']);assert.equal(control(t,'Share selected content').props.disabled,false);
 assert.equal(h.e.captures.length,0);
});

test('Mini fits whole composition; Full Preview fit-to-width scroll and Android Back preserve selection without HD work',()=>{
 const h=host(full);let t=h.render();for(const label of ['Back','Card Name','EXP Date','Membership Number','QR']){control(t,label).props.onPress();t=h.render();}
 const mini=control(t,'Mini share preview'),surface=nodes(mini).find(n=>n.type==='CardShareSurface'),p=surface.props.plan;
 assert.ok(surface.props.displayWidth<=320);assert.ok(surface.props.displayWidth*p.height/p.width<=mini.props.style[1].height);
 control(t,'View full preview').props.onPress();t=h.render();assert.equal(t.props.title,'Full preview');assert.equal(nodes(t).filter(n=>n.type==='AddCardSheet').length,1);
 const fullView=control(t,'Full share preview');assert.equal(nodes(fullView).filter(n=>n.type==='ScrollView').length,1);assert.equal(t.props.virtualized,true);assert.equal(t.props.fixedFooter,undefined);assert.equal(fullView.props.style.flex,1);assert.deepEqual(nodes(fullView).find(n=>n.type==='CardShareSurface').props.plan,p);
 fullView.props.onLayout({nativeEvent:{layout:{width:360,height:550}}});t=h.render();assert.equal(nodes(control(t,'Full share preview')).find(n=>n.type==='CardShareSurface').props.displayWidth,344);assert.equal(nodes(t).some(n=>/Zoom|Reset zoom/.test(n.props?.accessibilityLabel??'')),false);
 t.props.onClose();t=h.render();assert.equal(t.props.title,'Share Card');assert.equal(control(t,'Back').props.accessibilityState.checked,true);assert.equal(control(t,'QR').props.accessibilityState.selected,true);
 assert.equal(h.e.captures.length,0);assert.equal(h.e.nativeCalls.length,0);assert.equal(h.closes(),0);
});

test('Reference controls share a row, no Preview frame, minimal Full action lives beneath Code in QR/None/Barcode order',()=>{
 const h=host(full),t=h.render(),all=nodes(t),groups=all.find(n=>n.props?.accessibilityLabel?.startsWith('Share selection controls.'));
 assert.equal(nodes(control(t,'Front')).find(n=>n.type==='Text').props.allowFontScaling,false);assert.equal(all.find(n=>n.type==='Text'&&n.props.children==='i').props.allowFontScaling,false);
 assert.equal(groups.props.accessibilityLabel,'Share selection controls. three columns');assert.equal(groups.props.style[1].flexDirection,'row');assert.equal(groups.props.style[1].flexWrap,'nowrap');
 const columns=nodes(groups).filter(n=>n.type==='View'&&Array.isArray(n.props?.style)&&n.props.style[0]?.flexShrink===0);assert.equal(columns.length,3);
 for(const [i,title]of ['Card','Info','Code'].entries())assert.ok(nodes(columns[i]).some(n=>n.type==='Text'&&n.props.children===title));
 const code=columns[2],children=code.props.children;assert.equal(children[1].props.accessibilityLabel,'Code options');assert.equal(children[2].props.accessibilityLabel,'View full preview');assert.equal(children[2].type,'Pressable');
 assert.deepEqual(nodes(code).filter(n=>n.props?.accessibilityRole==='radio').map(n=>n.props.accessibilityLabel),['QR','None','Barcode']);
 assert.equal(all.filter(n=>n.props?.accessibilityLabel==='View full preview').length,1);assert.equal(children[2].props.style({pressed:false})[0].minHeight,48);
 const mini=control(t,'Mini share preview');assert.equal(mini.props.style[0].borderWidth,undefined);assert.equal(mini.props.style[0].backgroundColor,'transparent');assert.ok(mini.props.style[1].height>240);
});

test('Presentation adapts to measured widths and large fonts without horizontal overflow or touching export dimensions',()=>{
 const e=environment(),layout=e.load('src/lib/share-presentation-layout.ts').sharePresentationLayout;
 for(const width of [240,280,320,353,372,600])for(const fontScale of [1,1.3,2,3]){
  const p=layout(width,796,fontScale);assert.ok(p.previewHeight>=140&&p.previewHeight<=796);
  for(const value of Object.values(p.widths))assert.ok(value>0&&value<=width);
  if(p.mode==='three')assert.ok(p.widths.card+p.widths.info+p.widths.code+p.gap*2<=width+.01);
  if(p.mode==='two')assert.ok(p.widths.card+p.widths.info+p.gap<=width+.01);
  if(fontScale===3&&width<=372)assert.notEqual(p.mode,'three');
 }
 assert.equal(layout(320,796,1,{front:30,cardTitle:30,memberShort:58,memberFull:112,barcode:38}).mode,'three');
 assert.notEqual(layout(320,796,1,{front:80,cardTitle:80,memberShort:180,memberFull:250,barcode:90}).mode,'three');
 const measured=layout(353,796,1,{},174);assert.equal(measured.previewHeight,796-174-30);
});

test('Segment indicator moves with selection, respects Reduced Motion and leaves no listener after dismissal',async()=>{
 for(const reduced of [false,true]){
  const e=environment(undefined,reduced),Sheet=e.load('src/components/bemem/ShareCardSheet.tsx').ShareCardSheet,render=()=>e.render(Sheet,{card:base,onClose(){}},'motion');
  render();await tick();let t=render();control(t,'Code options').props.onLayout({nativeEvent:{layout:{width:160}}});t=render();
  const indicator=nodes(control(t,'Code options')).find(n=>n.type==='Animated.View');assert.equal(indicator.props.pointerEvents,'none');assert.equal(indicator.props.style[1].width,(160-8)/3);
  for(const [label,index]of [['QR',0],['Barcode',2],['None',1]]){control(t,label).props.onPress();t=render();const animation=e.animations.at(-1);assert.equal(animation.toValue,index);assert.equal(animation.duration,reduced?0:170);assert.equal(animation.useNativeDriver,true);}
  assert.equal(e.captures.length,0);e.unmount('motion');assert.equal(e.motionListeners.size,0);
 }
});

test('Samsung regression budgets Card title, compact Member No. and segment chrome before choosing three columns',()=>{
 const e=environment(),layout=e.load('src/lib/share-presentation-layout.ts').sharePresentationLayout;
 const measured={front:30,cardTitle:34,memberShort:60,memberFull:113,barcode:39};
 for(const width of [320,353,372]){
  const p=layout(width,560,1,measured,180);assert.equal(p.mode,'three');
  assert.ok(p.widths.card>=16+4+measured.cardTitle);
  assert.ok(p.widths.code>=3*48+8);assert.ok((p.widths.code-8)/3-4>=measured.barcode);
  assert.ok(p.widths.info>=16+4+(p.memberLabel==='Member No.'?measured.memberShort:measured.memberFull));
  assert.equal(p.memberLabel,width<372?'Member No.':'Membership Number');
  assert.equal(p.previewHeight,350);assert.ok(p.previewHeight>140);
 }
});

test('No helper paragraphs; compact label keeps full accessibility identity; native viewport drives Mini fit',()=>{
 const h=host(full);let t=h.render();
 const member=control(t,'Membership Number');assert.ok(nodes(member).some(n=>n.type==='Text'&&n.props.children==='Member No.'));
 for(const title of ['Card','Info','Code'])assert.equal(nodes(t).find(n=>n.type==='Text'&&n.props.children===title&&n.props.numberOfLines!==undefined).props.numberOfLines,1);
 for(const label of ['QR','None','Barcode'])assert.equal(nodes(control(t,label)).find(n=>n.type==='Text').props.numberOfLines,1);
 const text=nodes(t).filter(n=>n.type==='Text').map(n=>n.props.children).filter(v=>typeof v==='string').join(' ');
 assert.doesNotMatch(text,/Text and codes already|Scan codes contain|No Back artwork|Barcode is unavailable/);
 assert.match(control(t,'Front').props.accessibilityHint,/artwork/);assert.match(control(t,'QR').props.accessibilityHint,/saved Number/);
 assert.equal(h.e.captures.length,0);
});

for(const [label,fields]of [['Front',['Front']],['Back',['Back']],['Landscape pair',['Front','Back']],['Portrait pair',['Front','Back']],['QR',['QR']],['Barcode',['Barcode']],['All info',['Front','Back','Card Name','EXP Date','Membership Number','QR']]])test(`Full ${label} uses one flexible vertical viewport and unchanged fit-to-width composition`,()=>{
 const preset=presets.find(p=>p.id===(label==='Portrait pair'?'vaccine-passport-portrait':'card-landscape'));
 const card={...clone(full),orientation:preset.orientation,sizePresetId:preset.id,widthBlocks:preset.ratioWidth,heightBlocks:preset.ratioHeight},h=host(card);
 let t=h.render();if(!fields.includes('Front')){control(t,'Front').props.onPress();t=h.render();}
 for(const field of fields.filter(f=>f!=='Front')){control(t,field).props.onPress();t=h.render();}
 const before=nodes(control(t,'Mini share preview')).find(n=>n.type==='CardShareSurface').props.plan;
 control(t,'View full preview').props.onPress();t=h.render();const viewport=control(t,'Full share preview');
 assert.equal(viewport.props.style.flex,1);assert.equal(viewport.props.style.height,undefined);assert.equal(viewport.props.style.minHeight,0);
 viewport.props.onLayout({nativeEvent:{layout:{width:393,height:610}}});t=h.render();const scroll=nodes(control(t,'Full share preview')).find(n=>n.type==='ScrollView');
 assert.equal(scroll.props.horizontal,undefined);assert.equal(scroll.props.style.flex,1);assert.equal(scroll.props.contentContainerStyle.flexGrow,1);assert.equal(scroll.props.contentContainerStyle.justifyContent,'center');assert.equal(scroll.props.contentContainerStyle.height,undefined);assert.deepEqual(scroll.props.contentOffset,{x:0,y:0});
 const surface=nodes(scroll).find(n=>n.type==='CardShareSurface');assert.equal(surface.props.displayWidth,393-16);assert.deepEqual(surface.props.plan,before);assert.equal(surface.props.onReady,undefined);
 assert.equal(nodes(t).some(n=>/Zoom out|Zoom in|Reset zoom/.test(n.props?.accessibilityLabel??'')),false);
 control(t,'Back to Share').props.onPress();t=h.render();assert.deepEqual(nodes(control(t,'Mini share preview')).find(n=>n.type==='CardShareSurface').props.plan,before);
 assert.equal(h.e.captures.length,0);assert.equal(h.e.nativeCalls.length,0);
});

test('Full Preview measures resized viewport, resets each opening and preserves choices through X/Android Back',()=>{
 const h=host(full);let t=h.render();control(t,'View full preview').props.onPress();t=h.render();
 control(t,'Full share preview').props.onLayout({nativeEvent:{layout:{width:600,height:300}}});t=h.render();assert.equal(nodes(control(t,'Full share preview')).find(n=>n.type==='CardShareSurface').props.displayWidth,584);
 t.props.onClose();t=h.render();assert.equal(control(t,'Front').props.accessibilityState.checked,true);control(t,'View full preview').props.onPress();t=h.render();
 const scroll=nodes(control(t,'Full share preview')).find(n=>n.type==='ScrollView');assert.deepEqual(scroll.props.contentOffset,{x:0,y:0});assert.notEqual(nodes(scroll).find(n=>n.type==='CardShareSurface').props.displayWidth,584);
 t.props.onClose();assert.equal(h.render().props.title,'Share Card');assert.equal(h.closes(),0);
});


test('Card Sheet viewing mode never changes Share composition, code data or selected fields',()=>{
 const options={...planning.DEFAULT_SHARE_OPTIONS,front:true,back:true,qr:true,name:true,number:true,expiry:true};
 const legacy=planning.prepareCardShare(full,options),before=JSON.stringify(full);
 for(const mode of ['cardcode','frontback'])assert.deepEqual(planning.prepareCardShare({...clone(full),sheetDisplayMode:mode},options),legacy);
 assert.equal(JSON.stringify(full),before);
});
