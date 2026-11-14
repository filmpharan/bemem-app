// Pure synthetic model checks. No filesystem writes or native imports.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), crypto = require('node:crypto');
const model = require('./grid-size-model.js');
const context = {}; vm.runInNewContext(fs.readFileSync(path.join(__dirname,'grid-fixtures.js'),'utf8'),context);
const {samples,sourceSha256} = JSON.parse(JSON.stringify(context.BEMEM_GRID_FIXTURES));
const modern=samples.slice(0,7), before=JSON.stringify(samples);
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8, `${a} differs from ${b}`);
test('Fixture source matches the actual current seven preset definitions',()=>{
 const raw=fs.readFileSync(path.join(__dirname,'../../src/lib/card-size-presets.ts'));
 assert.equal(crypto.createHash('sha256').update(raw).digest('hex'),sourceSha256);
 assert.equal(modern.length,7);
 assert.deepEqual(modern.map(c=>`${c.widthBlocks}x${c.heightBlocks}`),['3x2','6x4','7x3','8x4','2x3','4x6','5x7']);
});
test('Every sample retains full block proportions and uniform scale at each width',()=>{
 for(const width of [320,375,390,414,600,844]){
  const available=width<360?164:214, metric=model.metrics(width,available,samples);
  close(metric.blockUnit,(Math.min(width,600)-32)/12);
  for(const card of modern){const frame=model.frame(card,metric);
   close(frame.footprintWidth/card.widthBlocks,metric.displayUnit);
   close(frame.footprintHeight/card.heightBlocks,metric.displayUnit);
   close(frame.footprintWidth/frame.footprintHeight,card.widthBlocks/card.heightBlocks);
   close(frame.paintWidth,(card.widthBlocks-.2)*metric.displayUnit);
   close(frame.paintHeight,(card.heightBlocks-.2)*metric.displayUnit);
   assert.ok(frame.footprintWidth<=available+1e-8);assert.equal(frame.radius,14);
  }
 }
});
test('Mini portrait is half of Card portrait on both axes, not normalized',()=>{
 const metric=model.metrics(390,214,samples),mini=model.frame(modern[4],metric),card=model.frame(modern[5],metric),vaccine=model.frame(modern[6],metric),landscape=model.frame(modern[1],metric);
 close(mini.footprintWidth/card.footprintWidth,.5);close(mini.footprintHeight/card.footprintHeight,.5);
 close(vaccine.footprintWidth/card.footprintWidth,5/4);close(vaccine.footprintHeight/card.footprintHeight,7/6);
 close(card.footprintWidth/landscape.footprintWidth,4/6);close(card.footprintHeight/landscape.footprintHeight,6/4);
});
test('Dimensions drive projection independently of preset name or orientation heuristics',()=>{
 const fake={...modern[1],sizePresetId:'different-label',widthBlocks:2,heightBlocks:3};
 const d=model.dimensions(fake);assert.equal(d.widthBlocks,2);assert.equal(d.heightBlocks,3);
 // Production validation is still responsible for rejecting mismatched metadata before rendering.
});
test('Legacy fallback resolves in memory without adding fields to source',()=>{
 assert.equal(model.dimensions(samples[7]).widthBlocks,6);assert.equal(model.dimensions(samples[7]).heightBlocks,4);
 assert.equal(model.dimensions(samples[8]).widthBlocks,4);assert.equal(model.dimensions(samples[8]).heightBlocks,6);
 assert.equal(model.dimensions(samples[8]).source,'legacy');assert.equal(Object.hasOwn(samples[8],'widthBlocks'),false);
});
test('Incomplete or invalid dimensions fail instead of silently guessing',()=>{
 for(const bad of [{...modern[0],widthBlocks:0},{...modern[0],heightBlocks:2.5},{...modern[0],widthBlocks:13}])assert.throws(()=>model.dimensions(bad));
 const partial={...modern[0]};delete partial.heightBlocks;assert.throws(()=>model.dimensions(partial));
});
test('All original fixture bytes remain unchanged by resolution and projection',()=>assert.equal(JSON.stringify(samples),before));
