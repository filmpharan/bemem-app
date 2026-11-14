const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),cache=new Map();
function load(file){file=path.resolve(root,file);if(!path.extname(file))file+='.ts';if(cache.has(file))return cache.get(file).exports;const mod={exports:{}};cache.set(file,mod);
 const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInThisContext(`(function(require,module,exports){${code}\n})`,{filename:file})(n=>{assert.ok(n.startsWith('.'));return load(path.resolve(path.dirname(file),n));},mod,mod.exports);return mod.exports;}
const {cardPaintSize}=load('src/lib/card-geometry.ts'),{artworkFrame}=load('src/lib/card-artwork.ts'),A=load('src/lib/artwork-adjustment.ts');
const {CARD_SIZE_PRESETS}=load('src/lib/card-size-presets.ts'),{validateWalletDocument}=load('src/lib/wallet-validation.ts');
const sources=[{width:1600,height:1000},{width:900,height:1600},{width:48,height:48}];
const transforms=[{x:.5,y:.5,zoom:1},{x:.73,y:.21,zoom:1.65},{x:0,y:1,zoom:3},{x:1,y:0,zoom:2}];
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
// Asymmetric raster pattern: independent left/right, top/bottom landmarks and nonuniform color channels.
const pixel=(x,y)=>{x=Math.floor(x+1e-7);y=Math.floor(y+1e-7);return [(x*13+y*3)%256,(y*7+(x<17?90:0))%256,(x+y*11+(y<13?70:0))%256];};
const fixtures=[];
for(const p of CARD_SIZE_PRESETS)for(const source of sources)for(const side of ['front','back'])test(`WYSIWYG content/readback ${p.id}, ${source.width}x${source.height}, ${side}`,()=>{
 const paint=cardPaintSize(p.ratioWidth,p.ratioHeight),ratio=paint.width/paint.height;
 for(const crop of transforms){const art={...source,crop,assetId:`art-${side}.png`,byteLength:123,md5:'a'.repeat(32)};
  const member={kind:'membership',id:'synthetic-wysiwyg',name:'Test Member',memberNumber:'00123456',payload:'00123456',preferredDisplayFormat:'qr',orientation:p.orientation,
   sizePresetId:p.id,widthBlocks:p.ratioWidth,heightBlocks:p.ratioHeight,appearance:{backgroundColor:'#405764',textColor:'#ffffff',imageAssetId:null,artwork:{[side]:art}},createdAt:'2026-11-12T00:00:00.000Z',updatedAt:'2026-11-12T00:00:00.000Z'};
  const wallet={schemaVersion:2,dataset:'bemem-wallet',revision:4,savedAt:'2026-11-12T00:00:00.000Z',cards:[member],canvas:{columns:12,layout:{[member.id]:{col:0,row:0}}}};
  const before=JSON.stringify(wallet),read=validateWalletDocument(JSON.parse(before));assert.equal(JSON.stringify(wallet),before);assert.deepEqual(read.cards[0].appearance.artwork[side],art);
  const baseWidth=Math.min(source.width,source.height*ratio),rw=baseWidth/crop.zoom,rh=rw/ratio;
  const expected={x:(source.width-rw)*crop.x,y:(source.height-rh)*crop.y,width:rw,height:rh};
  for(const unit of [10,25,60]){const viewport=cardPaintSize(p.ratioWidth,p.ratioHeight,unit),frame=artworkFrame(art,viewport.width,viewport.height),region=A.artworkRegion(art,crop,viewport.width,viewport.height);
   for(const key of ['x','y','width','height'])near(region[key],expected[key]);
   assert.ok(region.x>=-1e-7&&region.y>=-1e-7&&region.x+region.width<=source.width+1e-7&&region.y+region.height<=source.height+1e-7);
   const scale=frame.width/source.width;
   for(let y=.5;y<viewport.height;y+=2)for(let x=.5;x<viewport.width;x+=2){
    const preview=pixel((x-frame.left)/scale,(y-frame.top)/scale);
    const confirmed=pixel(expected.x+x/viewport.width*expected.width,expected.y+y/viewport.height*expected.height);
    assert.deepEqual(preview,confirmed,'Asymmetric content moved or mirrored');
   }
  }
  if(side==='front')fixtures.push({preset:p.id,source,crop,paint,expected,
    output:{width:Math.round(paint.width*40),height:Math.round(paint.height*40)},
    previewFrame:artworkFrame(art,paint.width*40,paint.height*40),
    confirmedRegion:A.artworkRegion(read.cards[0].appearance.artwork[side],crop,paint.width*40,paint.height*40)});
 }
});
test('Drag/pinch uses one transform, preserves focal point, rebases finger transitions and clamps cover',()=>{
 const image=sources[0],w=300,h=200;let crop={x:.5,y:.5,zoom:1.5};const gesture=A.createArtworkGesture(image,w,h,()=>crop,v=>{crop=v;});
 gesture.begin([{x:100,y:100}]);gesture.move([{x:130,y:115}]);assert.ok(crop.x<.5&&crop.y<.5);
 const moved={...crop};gesture.move([{x:90,y:80},{x:150,y:120}]);assert.deepEqual(crop,moved);
 const anchor={x:120,y:100},before=A.artworkRegion(image,crop,w,h),sx=before.x+anchor.x/w*before.width,sy=before.y+anchor.y/h*before.height;
 gesture.move([{x:60,y:60},{x:180,y:140}]);const after=A.artworkRegion(image,crop,w,h);near(after.x+anchor.x/w*after.width,sx);near(after.y+anchor.y/h*after.height,sy);
 const pinched={...crop};gesture.move([{x:180,y:140}]);assert.deepEqual(crop,pinched);gesture.move([{x:200,y:140}]);assert.notEqual(crop.x,pinched.x);
 gesture.end();const clamped=A.zoomArtwork(image,crop,w,h,100);assert.equal(clamped.zoom,3);assert.equal(A.zoomArtwork(image,crop,w,h,-3).zoom,1);
});
test('Shared geometry retains the established full-block inset and never changes collision footprints',()=>{
 const {canvasItemFrame}=load('src/lib/canvas-layout.ts');
 for(const p of CARD_SIZE_PRESETS){const card={id:'synthetic',sizePresetId:p.id,orientation:p.orientation,widthBlocks:p.ratioWidth,heightBlocks:p.ratioHeight},paint=cardPaintSize(p.ratioWidth,p.ratioHeight,28),frame=canvasItemFrame(card,{col:2,row:3},28);
  near(frame.width,paint.width);near(frame.height,paint.height);near(frame.left,2*28+2.8);near(frame.top,3*28+2.8);}
});
// Optional standalone fixture export for the independent Pillow raster check, not needed by app tests.
if(process.argv.includes('--fixtures'))process.on('beforeExit',()=>fs.writeFileSync(path.join(root,'output/artwork-wysiwyg-fixtures.json'),JSON.stringify(fixtures)));
