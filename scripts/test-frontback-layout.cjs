const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),cache=new Map();
function load(relative){let file=path.resolve(root,relative);if(!path.extname(file))file+='.ts';if(cache.has(file))return cache.get(file).exports;const m={exports:{}};cache.set(file,m);
 const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInThisContext(`(function(require,module,exports){${code}\n})`,{filename:file})(name=>{assert.ok(name.startsWith('.'),'Layout must never load native/Wallet/network capabilities');return load(path.resolve(path.dirname(file),name));},m,m.exports);return m.exports;
}
const {frontBackLayout}=load('src/lib/frontback-layout.ts'),{CARD_SIZE_PRESETS}=load('src/lib/card-size-presets.ts'),{cardPaintSize}=load('src/lib/card-geometry.ts');
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
for(const width of [240,320,353,372,560])for(const labelHeight of [18,27,36,54])test(`Nine adaptive footprints fit horizontal bounds at ${width}dp, label ${labelHeight}dp`,()=>{
 for(const height of [48,100,240,400,640])for(const sides of [1,2]){
  const frames=CARD_SIZE_PRESETS.map(p=>frontBackLayout(width,height,p.ratioWidth,p.ratioHeight,sides,labelHeight));
  frames.forEach((frame,i)=>{const p=CARD_SIZE_PRESETS[i],paint=cardPaintSize(p.ratioWidth,p.ratioHeight);assert.ok(frame.unit>0);near(frame.unit,frames[0].unit);near(frame.cardWidth/frame.cardHeight,paint.width/paint.height);assert.ok(frame.groupWidth<=width+1e-7);assert.equal(frame.scroll,frame.groupHeight>height+1e-6);assert.ok(frame.groupHeight>0);});
  assert.ok(frames[0].cardWidth<frames[2].cardWidth&&frames[0].cardHeight<frames[2].cardHeight);assert.ok(frames[5].cardWidth<frames[7].cardWidth&&frames[5].cardHeight<frames[7].cardHeight);
 }
});
test('Normal usable viewport stacks landscape and pairs portrait; two sides use equal dimensions',()=>{
 for(const p of CARD_SIZE_PRESETS){const f=frontBackLayout(353,400,p.ratioWidth,p.ratioHeight,2,18);assert.equal(f.direction,p.orientation==='portrait'?'row':'column');assert.equal(f.scroll,false);
  near(f.groupWidth,f.direction==='row'?2*f.cardWidth+f.gap:f.cardWidth);
  near(f.groupHeight,f.direction==='column'?2*(f.cardHeight+18+f.labelGap)+f.gap:f.cardHeight+18+f.labelGap);
 }
});
test('Short wide viewport can choose the alternative arrangement; genuinely short areas scroll',()=>{
 const alternate=frontBackLayout(320,140,6,4,2,36);assert.equal(alternate.direction,'row');assert.equal(alternate.scroll,false);
 const short=frontBackLayout(320,48,4,6,2,36);assert.equal(short.direction,'row');assert.equal(short.scroll,true);assert.ok(short.cardHeight>=100);
});
test('One side has no missing-side gap or reserved panel and shares the same scale relationship',()=>{
 for(const p of CARD_SIZE_PRESETS){const single=frontBackLayout(353,400,p.ratioWidth,p.ratioHeight,1,18),both=frontBackLayout(353,400,p.ratioWidth,p.ratioHeight,2,18);near(single.unit,both.unit);near(single.groupWidth,single.cardWidth);near(single.groupHeight,single.cardHeight+18+single.labelGap);}
});
test('Unmeasured or invalid viewport defers image layout without writing or guessing device dimensions',()=>{
 for(const [width,height]of [[0,400],[353,0],[NaN,400],[353,Infinity]]){const f=frontBackLayout(width,height,6,4,2,18);assert.equal(f.cardWidth,0);assert.equal(f.cardHeight,0);}
});
