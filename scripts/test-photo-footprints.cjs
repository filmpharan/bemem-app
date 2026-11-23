// Original IDs plus synthetic Photo records; memory only, no native IO.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),cache=new Map();
function load(file){file=path.resolve(root,file);if(!path.extname(file))file+='.ts';if(cache.has(file))return cache.get(file).exports;const m={exports:{}};cache.set(file,m);
 const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
 vm.runInThisContext(`(function(require,module,exports){${code}\n})`,{filename:file})(name=>{if(['qrcode/lib/core/qrcode','jsbarcode'].includes(name))return require(name);assert.ok(name.startsWith('.'));return load(path.resolve(path.dirname(file),name));},m,m.exports);return m.exports;}
const S=load('src/lib/card-size-presets.ts'),G=load('src/lib/canvas-layout.ts'),V=load('src/lib/wallet-validation.ts'),F=load('src/lib/group-folder.ts'),P=load('src/lib/wallet-preparation.ts');
const time='2026-01-01T00:00:00.000Z',clone=x=>JSON.parse(JSON.stringify(x));
const member=p=>({kind:'membership',id:p.id,name:'Synthetic Photo',memberNumber:' 00123Ab ',payload:' 00123Ab ',preferredDisplayFormat:'qr',orientation:p.orientation,sizePresetId:p.id,widthBlocks:p.ratioWidth,heightBlocks:p.ratioHeight,expiryMonth:'2030-12-31',appearance:{backgroundColor:'#123456',textColor:'#ffffff',imageAssetId:null},createdAt:time,updatedAt:time});
function doc(){return{schemaVersion:2,dataset:'bemem-wallet',revision:10,savedAt:time,cards:['photo-landscape','photo-portrait'].map(id=>member(S.cardSizePreset(id))),canvas:{columns:12,layout:{'photo-landscape':{col:0,row:0},'photo-portrait':{col:4,row:0}}}};}
test('Nine presets have exact Photo labels/order while all seven original definitions retain their values',()=>{
 assert.equal(S.CARD_SIZE_PRESETS.length,9);assert.equal(new Set(S.CARD_SIZE_PRESETS.map(p=>p.id)).size,9);
 assert.deepEqual(S.cardSizePresetsFor('landscape').map(p=>p.id),['mini-landscape','photo-landscape','card-landscape','voucher-landscape','boarding-pass-landscape']);
 assert.deepEqual(S.cardSizePresetsFor('portrait').map(p=>p.id),['mini-portrait','photo-portrait','card-portrait','vaccine-passport-portrait']);
 assert.equal(S.cardSizePreset('photo-landscape').label,'Photo 4\u00d73');assert.equal(S.cardSizePreset('photo-portrait').label,'Photo 3\u00d74');
 const old=[['mini-landscape',3,2,.5,'mini'],['card-landscape',6,4,1,'card'],['voucher-landscape',7,3,1,'special'],['boarding-pass-landscape',8,4,1,'special'],['mini-portrait',2,3,.5,'mini'],['card-portrait',4,6,1,'card'],['vaccine-passport-portrait',5,7,1,'special']];
 for(const [id,w,h,scale,family] of old){const p=S.cardSizePreset(id);assert.deepEqual([p.ratioWidth,p.ratioHeight,p.previewScale,p.family],[w,h,scale,family]);}
});
test('Photo counterpart selection changes only size/orientation; artwork, raw text, expiry and metadata stay exact',()=>{
 const values={name:'Synthetic Photo',memberNumber:' 00123Ab ',orientation:'landscape',payload:' 00123Ab '},presentation={sizePresetId:'photo-landscape',expiryMonth:'2030-12-31',side:'back',artwork:{front:{assetId:'front'},back:{assetId:'back'}}},before=JSON.stringify({values,presentation});
 let selected=S.selectCardSize(values,presentation,S.sizePresetForOrientation('photo-landscape','portrait'));assert.equal(selected.presentation.sizePresetId,'photo-portrait');assert.equal(selected.values.orientation,'portrait');assert.equal(selected.presentation.artwork,presentation.artwork);assert.equal(selected.values.memberNumber,values.memberNumber);
 selected=S.selectCardSize(selected.values,selected.presentation,S.sizePresetForOrientation('photo-portrait','landscape'));assert.deepEqual(selected,{values,presentation});assert.equal(JSON.stringify({values,presentation}),before);
});
for(const id of ['photo-landscape','photo-portrait'])test(`${id}: full grid occupancy, edge bounds, snapping, paint inset, cover crop, Detail and share use the existing engine`,()=>{
 const p=S.cardSizePreset(id),card=member(p),tile={...card,colors:['#123456','#654321']};assert.deepEqual(G.cardSize(tile),{cols:p.ratioWidth,rows:p.ratioHeight});
 const edge={col:12-p.ratioWidth,row:240-p.ratioHeight};assert.equal(G.canPlace(tile,edge,[tile],{[id]:edge}),true);for(const pos of [{...edge,col:edge.col+1},{...edge,row:edge.row+1},{col:-1,row:0}])assert.equal(G.canPlace(tile,pos,[tile],{[id]:edge}),false);
 const blocker={id:'legacy',orientation:'landscape',colors:['#000000','#ffffff']},layout={legacy:{col:0,row:0}},before=JSON.stringify(layout);assert.deepEqual(G.firstFreePosition(tile,[blocker],layout),{col:6,row:0});assert.equal(G.canPlace(tile,{col:2,row:0},[blocker],layout),false);assert.equal(JSON.stringify(layout),before);
 assert.deepEqual(G.dropPosition(tile,{col:0,row:0},28*2.4,28*3.6,28),{col:2,row:4});
 const frame=G.canvasItemFrame(tile,{col:1,row:2},28);assert.ok(Math.abs(frame.width-(p.ratioWidth-.2)*28)<1e-8);assert.ok(Math.abs(frame.height-(p.ratioHeight-.2)*28)<1e-8);
 const detail=load('src/lib/card-detail-layout.ts').cardDetailGeometry(card,393,222);assert.equal(detail.widthBlocks,p.ratioWidth);assert.equal(detail.heightBlocks,p.ratioHeight);assert.equal(detail.radius,14);
 for(const image of [{width:1200,height:800,crop:{x:.5,y:.5,zoom:1}},{width:800,height:1200,crop:{x:.3,y:.7,zoom:1.4}}]){const crop=load('src/lib/card-artwork.ts').artworkFrame(image,frame.width,frame.height);assert.ok(crop.width>=frame.width&&crop.height>=frame.height);assert.ok(Math.abs(crop.width/image.width-crop.height/image.height)<1e-8);}
 for(const format of ['qr','code128']){const share=load('src/lib/card-share-plan.ts').prepareCardShare(card,{front:true,back:false,qr:format==='qr',barcode:format==='code128',name:false,number:false,expiry:false});assert.ok(share.codes[format==='qr'?'qr':'barcode']);assert.equal(share.widthBlocks,p.ratioWidth);assert.ok(Math.abs(share.cardWidth/share.cardHeight-(p.ratioWidth-.2)/(p.ratioHeight-.2))<1e-8);}
});
test('v2 Photo round-trip stays schema2, keeps legacy shapes unchanged, and rejects mismatched dimensions/collisions',()=>{
 const input=doc();input.cards.push({kind:'demo',id:'legacy',name:'Demo',orientation:'landscape',colors:['#123456','#654321']});input.canvas.layout.legacy={col:0,row:6};const before=JSON.stringify(input),read=V.decodeWalletDocument(before);
 assert.deepEqual(read,input);assert.equal(read.schemaVersion,2);assert.equal('widthBlocks' in read.cards[2],false);assert.equal(JSON.stringify(input),before);
 for(const patch of [{widthBlocks:6},{heightBlocks:4},{orientation:'portrait'},{sizePresetId:'unknown'}]){const bad=clone(input);Object.assign(bad.cards[0],patch);assert.throws(()=>V.validateWalletDocument(bad));}
 const bad=clone(input);bad.canvas.layout['photo-portrait']={col:3,row:0};assert.throws(()=>V.validateWalletDocument(bad),/overlapping/);
});
for(const orientation of ['landscape','portrait'])test(`Photo folder members retain IDs/order/crops and existing ${orientation} folder footprint`,()=>{
 const original=doc(),before=clone(original),group=F.createGroupFolder(original,'folder-synthetic','Photos',orientation,original.cards.map(c=>c.id),1),view=P.walletCanvasPresentation(group),folder=view.cards.find(c=>c.kind==='folder');
 assert.deepEqual(original,before);assert.deepEqual(group.cards,original.cards);assert.deepEqual(group.canvas.layout,original.canvas.layout);assert.deepEqual(folder.folder.members.map(c=>c.id),original.cards.map(c=>c.id));assert.deepEqual(G.cardSize(folder),orientation==='landscape'?{cols:6,rows:4}:{cols:4,rows:6});
 const cells=load('src/lib/group-folder-visual.ts').folderVisualLayout(180,120,orientation,2).cells;assert.equal(cells.length,2);assert.ok(cells.every(c=>c.width>0&&c.height>0));
});
