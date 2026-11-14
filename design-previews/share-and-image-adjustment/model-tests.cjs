// Tests the proposed coordinate contract only. Never imports a Wallet or FileSystem adapter.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript'),vm=require('node:vm');
const M=require('./model.js'),root=path.resolve(__dirname,'../..'),mod={exports:{}};
const file=path.join(root,'src/lib/card-artwork.ts'),code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
vm.runInThisContext(`(function(require,module,exports){${code}\n})`,{filename:file})(()=>assert.fail('No dependencies expected'),mod,mod.exports);
const {artworkFrame}=mod.exports,close=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
for(const p of M.presets)for(const [name,source] of Object.entries(M.sources))for(const side of ['front','back']){
 test(`${p.label} / ${name} / ${side}: confirmed region is identical at different display/export scales`,()=>{
  for(const crop of [{x:.5,y:.5,zoom:1},{x:.7,y:.35,zoom:1.65},{x:0,y:1,zoom:3},{x:1,y:0,zoom:2}]){
   const snapshot=JSON.stringify({source,crop}),r=M.region(source,M.ratio(p),crop);
   assert.ok(r.x>=-1e-8&&r.y>=-1e-8&&r.x+r.w<=source.w+1e-8&&r.y+r.h<=source.h+1e-8);
   for(const width of [140,316,960]){
    const height=width/M.ratio(p),frame=artworkFrame({width:source.w,height:source.h,crop},width,height),scale=frame.width/source.w;
    close(frame.width/source.w,frame.height/source.h);close(-frame.left/scale,r.x);close(-frame.top/scale,r.y);close(width/scale,r.w);close(height/scale,r.h);
   }
   assert.equal(JSON.stringify({source,crop}),snapshot);
  }
 });
}
test('Existing nominal viewport and painted viewport have different ratios across all seven presets',()=>{
 for(const p of M.presets){const a=M.region(M.sources.wide,p.w/p.h,{x:.7,y:.35,zoom:1.65}),b=M.region(M.sources.wide,M.ratio(p),{x:.7,y:.35,zoom:1.65});
  assert.notEqual(p.w/p.h,M.ratio(p));assert.ok(Math.abs(a.w-b.w)>.001||Math.abs(a.h-b.h)>.001);}
});
test('All review assets use synthetic data; copied icon geometry has no browser-only production imports',()=>{
 for(const name of ['source-wide.svg','source-tall.svg','source-square.svg','card-back.svg','sample-qr.svg','sample-code128.svg','sample-qr-unicode.svg']){
  const svg=fs.readFileSync(path.join(__dirname,'assets',name),'utf8');assert.match(svg,/<svg\b/);assert.doesNotMatch(svg,/<script|https?:\/\/(?!www\.w3\.org)/);
 }
 const html=fs.readFileSync(path.join(__dirname,'prototype.js'),'utf8');assert.doesNotMatch(html,/localStorage|sessionStorage|fetch\(|navigator\.share|expo-file-system/);
});
