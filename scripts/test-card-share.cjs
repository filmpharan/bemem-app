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
function environment(){
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
 if(name==='react-native')return{useWindowDimensions:()=>({width:390,height:844}),PixelRatio:{get:()=>3},View:'View',Text:'Text',ScrollView:'ScrollView',ActivityIndicator:'ActivityIndicator',StyleSheet:{create:v=>v,absoluteFill:{}}};
 if(name==='expo-image')return{Image:'Image'};if(name==='expo-font')return{useFonts:()=>[true,null]};
 if(name.endsWith('manrope.ttf'))return 1;
 if(name==='expo-file-system')return{Directory,File,Paths:{cache:new Directory('file:///cache'),document:new Directory('file:///documents')}};
 if(name==='expo')return{uuid:{v4:()=>`synthetic-${++uuid}`}};
 if(name==='expo-sharing')return sharing;
 if(name==='react-native-view-shot')return{captureRef:async(view,options)=>{captures.push({view,options});if(captureGate)await captureGate;if(captureError)throw Error('synthetic capture failed');const uri=`file:///captures/${++uuid}.png`;data.set(uri,png(view.width,view.height??300));return uri;},releaseCapture:uri=>{released.push(uri);data.delete(uri);}};
 if(name.endsWith('/ci-theme'))return require('./ci-theme-fixture.cjs');
 if(name.endsWith('/sheet-visual'))return require('./sheet-visual-fixture.cjs');
 if(name.endsWith('/lagoon-theme'))return{lagoon:{text:{primary:'#222222',secondary:'#555555',onAction:'#ffffff'},surface:{base:'#eeeeee'}},lagoonFonts:{latin:'Manrope'}};
 if(['./AddCardSheet','./GlassButton','./CardShareSurface','./CardAppearancePreview','./AddCardText'].includes(name)){const key=name.slice(2);return{[key]:key};}
 assert.ok(name.startsWith('.'),'No uncontrolled import '+name);return load(path.resolve(path.dirname(file),name));},mod,mod.exports);return mod.exports;}
 function render(component,props,key='main'){activeSlots=frames.get(key)??[];frames.set(key,activeSlots);cursor=0;effects=[];const tree=component(props);for(const run of effects)run();return tree;}
 return{load,render,data,events,nativeCalls,captures,released,loaded,replay(key){const list=(frames.get(key)??[]).filter(s=>s?.effect);for(const s of list)s.cleanup?.();for(const s of list)s.cleanup=s.setup();},unmount(key){for(const slot of frames.get(key)??[])if(slot?.effect)slot.cleanup?.();frames.delete(key);},available(v){available=v;},openError(v){openError=v;},captureError(v){captureError=v;},openGate(v){openGate=v;},captureGate(v){captureGate=v;}};
}
const base={kind:'membership',id:'private-card-id',name:'Test Member',memberNumber:' 00123456 Ab ',payload:' 00123456 Ab ',preferredDisplayFormat:'qr',orientation:'landscape',appearance:{backgroundColor:'#405764',textColor:'#ffffff',imageAssetId:null,gradientPresetId:'ptt'},createdAt:'2026-01-01T00:00:00.000Z',updatedAt:'2026-01-01T00:00:00.000Z'};
const clone=x=>JSON.parse(JSON.stringify(x)),env=environment(),planning=env.load('src/lib/card-share-plan.ts');
const opts=patch=>({...planning.DEFAULT_SHARE_OPTIONS,...patch});
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function nodes(t,out=[]){if(!t||typeof t!=='object')return out;if(Array.isArray(t)){t.forEach(n=>nodes(n,out));return out;}out.push(t);nodes(t.props?.children,out);nodes(t.props?.footer,out);return out;}
function control(t,label){const n=nodes(t).find(n=>n.props?.accessibilityLabel===label);assert.ok(n,'Missing '+label);return n;}
const presets=env.load('src/lib/card-size-presets.ts').CARD_SIZE_PRESETS;
for(const p of presets)test(`Share preserves actual dimensions and appearance for ${p.id}`,()=>{
 const card={...clone(base),orientation:p.orientation,sizePresetId:p.id,widthBlocks:p.ratioWidth,heightBlocks:p.ratioHeight},before=JSON.stringify(card),plan=planning.prepareCardShare(card,opts());
 assert.equal(plan.widthBlocks,p.ratioWidth);assert.equal(plan.heightBlocks,p.ratioHeight);assert.ok(Math.abs(plan.cardWidth/plan.cardHeight-(p.ratioWidth-.2)/(p.ratioHeight-.2))<.002);
 assert.deepEqual(plan.appearance,card.appearance);assert.equal(plan.code,null);assert.equal(plan.memberNumber,null);assert.equal(plan.encodedValue,null);assert.equal(JSON.stringify(card),before);
 assert.equal(plan.id,undefined);assert.equal(plan.revision,undefined);assert.equal(plan.updatedAt,undefined);
});
for(const format of ['qr','code128'])test(`Actual share SVG raster -> PNG -> independent ZXing returns exact ${format} payload`,()=>{
 const plan=planning.prepareCardShare(base,opts({mode:'scan',format})),code=plan.code;
 assert.equal(plan.memberNumber,base.memberNumber);assert.equal(plan.encodedValue,base.payload);
 const image=png(code.width,code.height,svgPixels(code));assert.equal(decodePng(image,format),base.payload);
 assert.equal(planning.inspectSharePng(image,code.width).width,code.width);assert.doesNotMatch(code.svg,/transform=/);
});
test('Unicode payload shares QR unchanged, rejects Code128 clearly and never silently converts',()=>{
 const card={...base,memberNumber:' 000 Thai \u0e01 '};const plan=planning.prepareCardShare(card,opts({mode:'scan'}));assert.equal(decodePng(png(plan.code.width,plan.code.height,svgPixels(plan.code)),'qr'),card.memberNumber);
 assert.throws(()=>planning.prepareCardShare(card,opts({mode:'scan',format:'code128'})),/ASCII/);assert.equal(card.memberNumber,' 000 Thai \u0e01 ');
});
test('Overlong Code128 refuses export instead of squeezing, clipping or dropping payload',()=>{
 assert.throws(()=>planning.prepareCardShare({...base,memberNumber:'A'.repeat(100)},opts({mode:'scan',format:'code128'})),/too wide/);
});
test('Legacy dimensions remain absent, Demo codes are never invented, unavailable legacy artwork is explicit',()=>{
 const before=JSON.stringify(base),plan=planning.prepareCardShare(base,opts());assert.equal(plan.widthBlocks,6);assert.equal(JSON.stringify(base),before);
 assert.throws(()=>planning.prepareCardShare({kind:'demo',id:'demo-card',name:'Demo',orientation:'landscape',colors:['#123456','#abcdef']},opts({mode:'scan'})),/Demo/);
 assert.throws(()=>planning.prepareCardShare({...base,appearance:{...base.appearance,imageAssetId:'old-reserved-reference'}},opts()),/legacy/);
 assert.throws(()=>planning.prepareCardShare(base,opts({side:'back'})),/Back artwork/);
});
test('Front/Back choose actual artwork and never add a number/code in Card Image mode',()=>{
 const image={assetId:'art-synthetic.jpg',width:1200,height:800,byteLength:123,md5:'a'.repeat(32),crop:{x:.2,y:.8,zoom:1.5}},card={...clone(base),appearance:{...base.appearance,artwork:{front:image,back:{...image,assetId:'art-back.jpg'}}}};
 for(const side of ['front','back']){const plan=planning.prepareCardShare(card,opts({side}));assert.equal(plan.side,side);assert.deepEqual(plan.appearance.artwork[side],card.appearance.artwork[side]);assert.equal(plan.memberNumber,null);assert.equal(plan.code,null);}
});
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
function host(card=base){const e=environment(),Sheet=e.load('src/components/bemem/ShareCardSheet.tsx').ShareCardSheet;let closes=0;const render=()=>e.render(Sheet,{card,onClose(){closes++;}},'sheet');
 const preview=()=>nodes(render()).find(n=>typeof n.type==='function');const renderPreview=()=>{const p=preview();return e.render(p.type,p.props,'preview');};
 async function prepare(){let tree=renderPreview();const surface=nodes(tree).find(n=>n.type==='CardShareSurface');assert.ok(surface);surface.props.onReady({nodeType:1,width:surface.props.plan.width,height:500});await tick();await tick();tree=renderPreview();const image=nodes(tree).find(n=>n.type==='Image');assert.ok(image);image.props.onDisplay();return renderPreview();}
 return{e,render,renderPreview,prepare,closes:()=>closes};}
test('Share UI defaults to Card Image, requires explicit scan selection and keeps all targets 48dp',()=>{
 const h=host();let tree=h.render();assert.equal(control(tree,'Image Only').props.selected,true);assert.equal(control(tree,'Share Back').props.disabled,true);
 assert.equal(nodes(tree).some(n=>n.props?.accessibilityLabel==='Share QR Code'),false);
 control(tree,'With Code').props.onPress();tree=h.render();assert.ok(control(tree,'Share QR Code'));assert.equal(control(tree,'Share QR Code').props.selected,true);
 for(const n of nodes(tree).filter(n=>n.type==='GlassButton'))assert.ok(n.props.style.minHeight>=48);
 const p=h.renderPreview();assert.equal(nodes(p).some(n=>n.props?.children===base.memberNumber),false);assert.equal(control(p,'Share prepared image').props.disabled,true);
});

test('Preview First has exact artifact before choices and one Share action without helper paragraphs or duplicate Cancel',async()=>{
 const h=host();const tree=await h.prepare(),all=nodes(tree),imageIndex=all.findIndex(n=>n.type==='Image'),modeIndex=all.findIndex(n=>n.props?.accessibilityLabel==='Image Only');
 assert.ok(imageIndex>=0&&imageIndex<modeIndex);assert.ok(all.findIndex(n=>n.props?.accessibilityLabel==='Share prepared image')>modeIndex);
 assert.equal(all.filter(n=>n.props?.accessibilityLabel==='Share prepared image').length,1);
 for(const label of ['Sharing preview','Artwork only · no added code',"What's included?",'Choose what to share','Encoded value','Cancel'])assert.equal(all.some(n=>n.props?.children===label),false);
 h.e.unmount('preview');
});

test('Export never paints another card name over uploaded artwork and scan output has one external heading',()=>{
 for(const mode of ['image','scan'])for(const side of ['front','back']){
  const art={assetId:'art-synthetic.png',width:800,height:1200,byteLength:100,md5:'a'.repeat(32),crop:{x:.3,y:.6,zoom:1.4}};
  const card={...base,appearance:{...base.appearance,artwork:{front:art,back:art}}},e=environment(),plan=e.load('src/lib/card-share-plan.ts').prepareCardShare(card,{mode,side,format:'qr'});
  const Surface=e.load('src/components/bemem/CardShareSurface.tsx').CardShareSurface,tree=e.render(Surface,{plan,onReady(){},onFailure(){}}),all=nodes(tree);
  assert.equal(all.find(n=>n.type==='CardAppearancePreview').props.showText,false);
  assert.equal(all.filter(n=>n.type==='Text'&&n.props.children===card.name).length,mode==='scan'?1:0);
 }
});
test('Full UI capture -> exact PNG preview -> native share -> return is read-only and blocks duplicate taps',async()=>{
 const h=host();let tree=await h.prepare();const image=nodes(tree).find(n=>n.type==='Image'),previewUri=image.props.source.uri;
 assert.equal(h.e.captures.length,1);assert.equal(h.e.captures[0].options.format,'png');assert.equal(h.e.captures[0].options.width,undefined);assert.equal(h.e.captures[0].options.height,undefined);
 let finish;h.e.openGate(new Promise(resolve=>{finish=resolve;}));control(tree,'Share prepared image').props.onPress();control(tree,'Share prepared image').props.onPress();await tick();await tick();
 assert.equal(h.e.nativeCalls.length,1);assert.equal(h.e.nativeCalls[0].options.mimeType,'image/png');assert.deepEqual(h.e.data.get(h.e.nativeCalls[0].uri),h.e.data.get(previewUri));
 h.render().props.onClose();assert.equal(h.closes(),0);finish();await tick();tree=h.renderPreview();assert.ok(nodes(tree).some(n=>typeof n.props?.children==='string'&&n.props.children.startsWith('Returned from sharing')));
 h.render().props.onClose();assert.equal(h.closes(),1);h.e.unmount('preview');await tick();assert.equal(h.e.data.has(previewUri),false);assert.equal(h.e.data.has(h.e.nativeCalls[0].uri),true);
 assert.equal(h.e.loaded.some(file=>/wallet-(repository|coordinator|storage|feature-commands)/.test(file)),false);
});
test('Generation failure and cancelled preparation never launch native sharing or discard card data',async()=>{
 const h=host();h.e.captureError(true);let tree=h.renderPreview();nodes(tree).find(n=>n.type==='CardShareSurface').props.onReady({nodeType:1,width:960});await tick();tree=h.renderPreview();assert.ok(nodes(tree).some(n=>n.props?.accessibilityRole==='alert'));assert.equal(control(tree,'Share prepared image').props.disabled,true);assert.equal(h.e.nativeCalls.length,0);
 const fresh=host(),stale=nodes(fresh.renderPreview()).find(n=>n.type==='CardShareSurface');fresh.e.unmount('preview');stale.props.onReady({nodeType:1,width:960});await tick();assert.equal(fresh.e.captures.length,0);assert.equal(fresh.e.nativeCalls.length,0);
});
test('Late native capture after closing only leaves a released raw file and no external share',async()=>{
 const h=host();let finish;h.e.captureGate(new Promise(resolve=>{finish=resolve;}));const surface=nodes(h.renderPreview()).find(n=>n.type==='CardShareSurface');surface.props.onReady({nodeType:1,width:960});h.e.unmount('preview');finish();await tick();await tick();
 assert.equal(h.e.nativeCalls.length,0);assert.equal(h.e.released.length,1);assert.equal([...h.e.data.keys()].some(uri=>uri.includes('preview-')),false);
});
for(const format of ['qr','code128'])test(`Sharing ${format} encodes Number even when the obsolete payload differs`,()=>{
 const card={...base,memberNumber:'000111',payload:' 000Different Ab '},plan=planning.prepareCardShare(card,opts({mode:'scan',format}));
 assert.equal(plan.memberNumber,'000111');assert.equal(decodePng(png(plan.code.width,plan.code.height,svgPixels(plan.code)),format),card.memberNumber);
});
test('Card Image preparation never calls an encoder or exposes hidden wallet metadata',()=>{
 const e=environment(),codec=e.load('src/lib/card-code.ts');let encodes=0;const original=codec.encodeCardCode;codec.encodeCardCode=(...args)=>{encodes++;return original(...args);};
 const before=JSON.stringify(base),plan=e.load('src/lib/card-share-plan.ts').prepareCardShare(base,opts());
 assert.equal(encodes,0);assert.equal(plan.code,null);assert.equal(plan.memberNumber,null);assert.equal(plan.encodedValue,null);assert.equal(JSON.stringify(plan).includes(base.id),false);assert.equal(JSON.stringify(base),before);
});
test('Real capture surface keeps scan image in native pixel proportions and Back image mode adds no member text',()=>{
 const e=environment(),Surface=e.load('src/components/bemem/CardShareSurface.tsx').CardShareSurface,plan=planning.prepareCardShare(base,opts({mode:'scan',format:'code128'}));
 const props={plan,onReady(){},onFailure(){assert.fail('Unexpected surface failure');}},tree=e.render(Surface,props,'surface');
 const code=nodes(tree).find(n=>n.type==='Image');assert.equal(code.props.style.width*3,plan.code.width);assert.equal(code.props.style.height*3,plan.code.height);assert.equal(code.props.contentFit,'contain');assert.equal(code.props.style.transform,undefined);
 assert.equal(tree.props.collapsable,false);assert.equal(tree.props.style[1].width*3,plan.width);assert.equal(nodes(tree).some(n=>n.type==='GlassButton'),false);
 e.unmount('surface');
 const art={assetId:'art-back.jpg',width:1200,height:800,byteLength:20,md5:'a'.repeat(32),crop:{x:.5,y:.5,zoom:1}},backPlan=planning.prepareCardShare({...base,appearance:{...base.appearance,artwork:{back:art}}},opts({side:'back'}));
 const back=e.render(Surface,{...props,plan:backPlan},'back-surface'),preview=nodes(back).find(n=>n.type==='CardAppearancePreview');
 assert.equal(preview.props.showText,false);assert.equal(preview.props.values.memberNumber,'');assert.equal(nodes(back).some(n=>n.props?.children===base.memberNumber),false);assert.equal(nodes(back).some(n=>n.type==='Image'),false);
 e.unmount('back-surface');
});
test('A changed preview offers explicit regeneration and never sends different bytes than the reviewed image',async()=>{
 const h=host();let tree=await h.prepare();const uri=nodes(tree).find(n=>n.type==='Image').props.source.uri;
 h.e.data.set(uri,png(400,200));control(tree,'Share prepared image').props.onPress();await tick();await tick();tree=h.renderPreview();
 assert.equal(h.e.nativeCalls.length,0);assert.equal(control(tree,'Share prepared image').props.disabled,true);assert.ok(control(tree,'Prepare share preview again'));
 assert.ok(nodes(tree).some(n=>n.props?.accessibilityRole==='alert'));
});
test('Effect cleanup/replay uses a fresh delivery scope without resurrecting cancelled work',async()=>{
 const h=host();h.renderPreview();h.e.replay('preview');let tree=await h.prepare();control(tree,'Share prepared image').props.onPress();await tick();await tick();assert.equal(h.e.nativeCalls.length,1);h.e.unmount('preview');
});
test('Native unavailable/error returns retain the preview and never claim delivery or lose Detail state',async()=>{
 const unavailable=host();unavailable.e.available(false);let tree=await unavailable.prepare();control(tree,'Share prepared image').props.onPress();await tick();tree=unavailable.renderPreview();
 assert.ok(nodes(tree).some(n=>typeof n.props?.children==='string'&&n.props.children.includes('unavailable')));assert.equal(unavailable.e.nativeCalls.length,0);assert.equal(unavailable.closes(),0);unavailable.e.unmount('preview');
 const failed=host();failed.e.openError(true);tree=await failed.prepare();control(tree,'Share prepared image').props.onPress();await tick();await tick();tree=failed.renderPreview();
 assert.equal(failed.e.nativeCalls.length,1);assert.ok(nodes(tree).some(n=>typeof n.props?.children==='string'&&n.props.children.includes('could not be opened')));assert.equal(failed.closes(),0);assert.equal(control(tree,'Share prepared image').props.busy,false);failed.e.unmount('preview');
});
test('Sharing a stored Front artwork reads/verifies it without moving, replacing or deleting its original bytes',async()=>{
 const original=Buffer.from('synthetic-permanent-artwork'),uri='file:///documents/bemem-card-artwork/art-original.png',art={assetId:'art-original.png',width:100,height:50,byteLength:original.length,md5:crypto.createHash('md5').update(original).digest('hex'),crop:{x:.5,y:.5,zoom:1}};
 const card={...clone(base),appearance:{...base.appearance,artwork:{front:art}}},before=JSON.stringify(card),h=host(card);h.e.data.set(uri,original);
 const tree=await h.prepare();control(tree,'Share prepared image').props.onPress();await tick();await tick();h.e.unmount('preview');await tick();
 assert.deepEqual(h.e.data.get(uri),original);assert.equal(JSON.stringify(card),before);assert.equal(h.e.events.some(e=>e[0]==='delete'&&e[1].startsWith('file:///documents')),false);
 assert.equal(h.e.events.some(e=>e[0]==='copy'&&e[2].startsWith('file:///documents')),false);
});
test('Share UI disables unsupported Code128 and offers QR after an overlong Barcode export is rejected',()=>{
 const unicode=host({...base,memberNumber:' 000 Thai \u0e01 '});control(unicode.render(),'With Code').props.onPress();let tree=unicode.render();
 assert.equal(control(tree,'Share Code 128').props.disabled,true);assert.ok(control(tree,'Share QR Code'));
 const long=host({...base,memberNumber:'A'.repeat(100)});control(long.render(),'With Code').props.onPress();control(long.render(),'Share Code 128').props.onPress();tree=long.render();
 assert.ok(nodes(tree).some(n=>n.props?.accessibilityRole==='alert'&&n.props.children.includes('too wide')));assert.equal(nodes(tree).some(n=>typeof n.type==='function'),false);
 control(tree,'Share QR Code').props.onPress();tree=long.render();assert.ok(nodes(tree).some(n=>typeof n.type==='function'));assert.equal(long.e.nativeCalls.length,0);
});
test('A ready preview invalidated by effect replay requests regeneration rather than sharing stale files',async()=>{
 const h=host();await h.prepare();h.e.replay('preview');await tick();const tree=h.renderPreview();control(tree,'Share prepared image').props.onPress();await tick();
 const after=h.renderPreview();assert.equal(h.e.nativeCalls.length,0);assert.equal(control(after,'Share prepared image').props.disabled,true);assert.ok(control(after,'Prepare share preview again'));h.e.unmount('preview');
});
