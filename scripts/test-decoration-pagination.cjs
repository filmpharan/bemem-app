const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const file=path.resolve(__dirname,'../src/lib/decoration-pagination.ts'),moduleObject={exports:{}};
const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
vm.runInThisContext(`(function(require,module,exports){${code}\n})`,{filename:file})(()=>assert.fail('Pagination must be headless without I/O'),moduleObject,moduleObject.exports);
const {decorationPages,decorationPickerGeometry,DRAWER_COLUMNS,DRAWER_ROWS}=moduleObject.exports;
const ids=n=>Array.from({length:n},(_,i)=>`synthetic-${i+1}`);

test('50 assets produce23+Next, Previous+22+Next, then Previous+5+18empty',()=>{
 const assets=ids(50),pages=decorationPages(assets);assert.equal(pages.length,3);
 assert.deepEqual(pages.map(p=>p.filter(c=>c.type==='asset').length),[23,22,5]);
 assert.deepEqual(pages.flat().filter(c=>c.type==='asset').map(c=>c.assetId),assets);
 assert.equal(pages[0][23].type,'next');assert.equal(pages[1][0].type,'previous');assert.equal(pages[1][23].type,'next');
 assert.equal(pages[2][0].type,'previous');assert.ok(pages[2].slice(6).every(c=>c.type==='empty'));
});
test('40 assets produce exact23+Next and Previous+17+6empty pages',()=>{
 const assets=Object.freeze(ids(40)),pages=decorationPages(assets);assert.equal(pages.length,2);assert.equal(DRAWER_COLUMNS,8);assert.equal(DRAWER_ROWS,3);
 assert.deepEqual(pages[0].slice(0,23).map(c=>c.assetId),assets.slice(0,23));assert.deepEqual(pages[0][23],{type:'next'});
 assert.deepEqual(pages[1][0],{type:'previous'});assert.deepEqual(pages[1].slice(1,18).map(c=>c.assetId),assets.slice(23));
 assert.ok(pages[1].slice(18).every(c=>c.type==='empty'));assert.ok(pages.every(p=>p.length===24));
});
test('Larger libraries have22-asset middle pages and never lose, repeat or reorder assets',()=>{
 for(const count of [0,1,23,24,25,40,46,47,68,69,1000]){
  const assets=ids(count),pages=decorationPages(assets);assert.deepEqual(pages.flat().filter(c=>c.type==='asset').map(c=>c.assetId),assets);
  for(let i=0;i<pages.length;i++){const p=pages[i];assert.equal(p.length,24);
   assert.equal(p.some(c=>c.type==='previous'),i>0);assert.equal(p.some(c=>c.type==='next'),i<pages.length-1);
   if(i>0)assert.equal(p[0].type,'previous');if(i<pages.length-1)assert.equal(p[23].type,'next');
   if(i>0&&i<pages.length-1)assert.equal(p.filter(c=>c.type==='asset').length,22);
  }
 }
});
test('Navigation and empty slots have no asset identity to drag or persist',()=>{
 for(const c of decorationPages(ids(40)).flat().filter(c=>c.type!=='asset'))assert.deepEqual(Object.keys(c),['type']);
});
test('Eight responsive columns fit the available width and three rows have fixed geometry',()=>{
 for(const width of [238,288,318,358,388,410,598]){
  const g=decorationPickerGeometry(width);assert.ok(g.cell>0);assert.ok(Math.abs(8*g.cell+7*g.gap+2*g.padding-width)<1e-8);
  assert.equal(g.height,3*g.rowHeight+2*g.gap);assert.ok(g.rowHeight>=(width-30)/12+2);
 }
});
