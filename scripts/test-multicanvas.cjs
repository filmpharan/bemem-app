// Synthetic memory-only repository/owner. No device, FS adapter, account or billing integration.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),cache=new Map();
function load(file){file=path.resolve(root,file);if(!path.extname(file))file+='.ts';if(cache.has(file))return cache.get(file).exports;const m={exports:{}};cache.set(file,m);const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInThisContext(`(function(require,module,exports){${code}\n})`,{filename:file})(n=>{assert.ok(n.startsWith('.'),'Native/network import forbidden '+n);return load(path.resolve(path.dirname(file),n));},m,m.exports);return m.exports;}
const P=load('src/lib/canvas-pages.ts'),V=load('src/lib/wallet-validation.ts'),{createMultiCanvasFixture}=load('src/lib/dev-multicanvas.ts'),{walletCanvasPresentation}=load('src/lib/wallet-preparation.ts');
const clone=x=>JSON.parse(JSON.stringify(x)),doc=f=>V.validateWalletDocument(f.owner.getSnapshot().session.draft),saved=f=>V.validateWalletDocument(f.owner.getSnapshot().session.saved);

test('All five Free pages persist independent new cards, folders and decorations, then reload without changing original Canvas1 data',async()=>{
 const f=createMultiCanvasFixture(),original=legacy();f.files.delete([...f.files.keys()][0]);f.files.set('wallet-0000000000000010.json',JSON.stringify(original));await f.owner.commands.initialize();
 const {emptyCardForm}=load('src/lib/card-form.ts'),{emptyCardPresentation}=load('src/lib/card-presentation.ts'),{createGroupFolder}=load('src/lib/group-folder.ts');
 const expected=new Map();for(const page of [2,3,4,5])assert.deepEqual(walletCanvasPresentation(original,page).cards,[]);
 for(const page of P.CANVAS_PAGES){
  const prior=saved(f),writes=f.events.length;assert.equal(f.owner.pages.selectEditor(page).ok,true);assert.equal(f.events.length,writes);
  const ids=[];for(let i=0;i<2;i++){const id=f.features.begin();assert.equal(f.features.add(id,{...emptyCardForm(),name:`Page ${page} card ${i}`,memberNumber:' 000Ab '},emptyCardPresentation()).ok,true);ids.push(id);}
  const grouped=createGroupFolder(doc(f),`group-${page}`,`Group ${page}`,'landscape',ids,page);assert.equal(f.owner.commands.updateDraft(f.owner.getSnapshot().state.generation,grouped).ok,true);
  const decorations=f.decorate();assert.equal(decorations.apply({type:'add',assetId:'pet-paw',position:{col:10,row:12}}).ok,true);assert.equal((await decorations.save()).ok,true);
  const after=saved(f);for(const other of P.CANVAS_PAGES)if(other!==page)assert.deepEqual(walletCanvasPresentation(after,other),walletCanvasPresentation(prior,other));
  assert.deepEqual((await f.repository.load()).document,after);expected.set(page,walletCanvasPresentation(after,page));
 }
 const after=saved(f);assert.equal(after.revision,original.revision+5);assert.deepEqual(after.cards.find(c=>c.id===original.cards[0].id),original.cards[0]);assert.deepEqual(after.canvas.layout['demo-original'],original.canvas.layout['demo-original']);assert.deepEqual(after.canvas.decorations.items.find(c=>c.id==='original-paw'),original.canvas.decorations.items[0]);
 const {createWalletOwnerScope}=load('src/lib/wallet-runtime-owner.ts'),{createWalletStorageAdapters}=load('src/lib/wallet-storage-adapters.ts');
 const reloaded=createWalletOwnerScope(()=>createWalletStorageAdapters({v1:{load:async()=>null,save:async()=>assert.fail()},v2:f.repository,demoCards:[]})).getOwner();await reloaded.commands.initialize();
 assert.equal(reloaded.pages.status(),'free');for(const page of P.CANVAS_PAGES){assert.equal(reloaded.pages.select(page).ok,true);assert.deepEqual(walletCanvasPresentation(reloaded.getSnapshot().session.saved,page),expected.get(page));}
});

for(const page of [2,3,4,5])test(`Free Canvas${page} allows its writer while rejecting cross-page mutation and stale Add sessions`,async()=>{
 const f=await fixture('free');f.owner.pages.selectEditor(page);const before=saved(f),next=doc(f);next.cards[page-1].name=`Edited ${page}`;
 assert.equal(f.owner.commands.updateDraft(f.owner.getSnapshot().state.generation,next).ok,true);assert.equal((await f.owner.commands.save(f.owner.getSnapshot().state.generation)).ok,true);
 const bad=doc(f);bad.cards[0].name='Cross-page forbidden';assert.equal(f.owner.commands.updateDraft(f.owner.getSnapshot().state.generation,bad).ok,false);
 assert.deepEqual(saved(f).cards[0],before.cards[0]);const stale=f.features.begin();assert.equal(f.owner.pages.select(1).ok,true);
 assert.equal(f.features.add(stale,{...load('src/lib/card-form.ts').emptyCardForm(),name:'Stale'},load('src/lib/card-presentation.ts').emptyCardPresentation()).ok,false);
});
async function fixture(status='free'){const f=createMultiCanvasFixture();await f.owner.commands.initialize();f.status(status);return f;}
function legacy(){return {schemaVersion:2,dataset:'bemem-wallet',revision:10,savedAt:'2026-11-12T00:00:00.000Z',cards:[{kind:'demo',id:'demo-original',name:'Demo',orientation:'landscape',colors:['#123456','#abcdef']}],canvas:{columns:12,layout:{'demo-original':{col:0,row:0}},decorations:{version:1,items:[{id:'original-paw',assetId:'pet-paw',position:{col:8,row:2},rotation:270}]}}};}
test('Legacy read is byte-shape preserving; repeated validation never writes metadata or relocates Demo/decorations',()=>{
 const original=legacy(),before=JSON.stringify(original);for(let i=0;i<3;i++){assert.deepEqual(V.validateWalletDocument(original),original);assert.equal(P.itemCanvasPage(original,'demo-original'),1);assert.equal(P.itemCanvasPage(original,'original-paw'),1);}
 assert.equal(JSON.stringify(original),before);assert.equal(original.canvas.pages,undefined);assert.equal(walletCanvasPresentation(original).cards.length,2);
});
for(const [status,n]of [['free',1],...['active','expired'].flatMap(s=>[2,3,4,5].map(n=>[s,n]))])test(`All-five access ${status}/${n} remains available without synthetic entitlement`,()=>{
 const input=legacy();input.canvas.pages={version:1,assignments:{},selectedCount:n===1?5:n};const result=P.canvasAccess(input,status);
 assert.equal(result.length,5);for(const p of result){assert.equal(p.visible,true);assert.equal(p.readable,true);assert.equal(p.editable,true);assert.equal(p.preview,false);}
});
test('Invalid metadata still fails validation while testing availability never invents an entitlement',async()=>{
 const f=await fixture(),original=saved(f);
 for(const change of [d=>d.canvas.pages.version=2,d=>d.canvas.pages.selectedCount=6,d=>d.canvas.pages.selectedCount='3',d=>d.canvas.pages.assignments['fixture-card-1']=0,d=>d.canvas.pages.assignments.missing=2,d=>d.canvas.pages.entitlement='active']){
  const d=clone(original);change(d);assert.throws(()=>V.validateWalletDocument(d));
 }
 assert.deepEqual(P.canvasAccess(original,'unverified').filter(p=>p.visible).map(p=>p.page),[1,2,3,4,5]);
});
test('Five overlapping coordinates are valid only on independent pages; collisions remain strict within each page',async()=>{
 const f=await fixture(),d=saved(f);assert.equal(d.cards.length,5);assert.deepEqual(d.canvas.layout['fixture-card-1'],d.canvas.layout['fixture-card-5']);
 d.canvas.pages.assignments['fixture-card-2']=1;assert.throws(()=>V.validateWalletDocument(d),/overlapping_cards/);
});
test('Page 1 saves one snapshot, preserves hidden pages including their order, IDs, media and coordinates',async()=>{
 const f=await fixture(),before=saved(f),next=doc(f);next.cards[0].name='Updated Canvas 1';
 assert.equal(f.owner.commands.updateDraft(f.owner.getSnapshot().state.generation,next).ok,true);assert.equal((await f.owner.commands.save(f.owner.getSnapshot().state.generation)).ok,true);
 const after=(await f.repository.load()).document;assert.deepEqual(after.cards.slice(1),before.cards.slice(1));assert.deepEqual(after.canvas,before.canvas);assert.equal(after.revision,before.revision+1);assert.equal(after.cards.length,5);
 const reorder=clone(after);[reorder.cards[1],reorder.cards[2]]=[reorder.cards[2],reorder.cards[1]];assert.equal(f.owner.commands.updateDraft(f.owner.getSnapshot().state.generation,reorder).ok,false);
});


test('New cards are placed on the current editable page; stale Add token cannot cross navigation epochs',async()=>{
 const f=await fixture('active'),{emptyCardForm}=load('src/lib/card-form.ts'),{emptyCardPresentation}=load('src/lib/card-presentation.ts'),values={...emptyCardForm(),name:'New sample',memberNumber:'00123456'};
 const stale=f.features.begin();assert.equal(f.owner.pages.select(2).ok,true);assert.equal(f.features.add(stale,values,emptyCardPresentation()).ok,false);
 const id=f.features.begin(),result=f.features.add(id,values,emptyCardPresentation());assert.equal(result.ok,true);const next=doc(f);assert.equal(P.itemCanvasPage(next,id),2);
 assert.deepEqual(next.canvas.layout['fixture-card-1'],{col:0,row:0});assert.notDeepEqual(next.canvas.layout[id],next.canvas.layout['fixture-card-2']);
});

test('Decorate placement, rotation and save stay on one page and never touch another',async()=>{
 const f=await fixture('active'),before=saved(f);f.owner.pages.select(2);const s=f.decorate();assert.equal(s.apply({type:'add',assetId:'pet-paw',position:{col:8,row:0}}).ok,true);
 let tile=s.snapshot().document.canvas.decorations.items[0];assert.equal(P.itemCanvasPage(s.snapshot().document,tile.id),2);
 assert.equal(s.apply({type:'rotate',id:tile.id}).ok,true);assert.equal(s.snapshot().document.canvas.decorations.items[0].rotation,90);assert.equal((await s.save()).ok,true);
 assert.deepEqual(saved(f).cards,before.cards);assert.deepEqual(saved(f).canvas.layout,before.canvas.layout);f.owner.pages.select(1);const one=f.decorate();assert.equal('canUndo' in one.snapshot(),false);
 assert.equal(one.apply({type:'rotate',id:tile.id}).ok,false);assert.equal(walletCanvasPresentation(saved(f),1).cards.some(c=>c.id===tile.id),false);
 const stale=s.apply({type:'delete',id:tile.id});assert.equal(stale.ok,false);
});
test('Dirty page changes are synchronous blocked; failed Save retains draft and previous committed pages',async()=>{
 const f=await fixture('active');f.owner.pages.select(2);const s=f.decorate();s.apply({type:'add',assetId:'pet-paw',position:{col:8,row:0}});const draft=doc(f),before=saved(f);
 assert.equal(f.owner.pages.select(1).ok,false);assert.equal(f.owner.pages.current(),2);f.failWrites(true);assert.equal((await s.save()).ok,false);assert.deepEqual(doc(f),draft);assert.deepEqual((await f.repository.load()).document,before);
});

test('Repository rechecks admission after pending readback; denied commit preserves previous snapshot and pending evidence',async()=>{
 const f=await fixture('active'),before=saved(f);let calls=0;await assert.rejects(f.repository.save(before,before.revision,()=>++calls<2),/canvas_access_denied/);
 const result=await f.repository.load();assert.deepEqual(result.document,before);assert.equal(result.pendingFiles.length,1);assert.equal(f.files.size,2);
});


test('External revision conflicts do not overwrite another page or falsely confirm the local draft',async()=>{
 const f=await fixture('active'),before=saved(f);await f.repository.save(before,before.revision);const next=doc(f);next.cards[0].name='Stale write';f.owner.commands.updateDraft(f.owner.getSnapshot().state.generation,next);
 assert.equal((await f.owner.commands.save(f.owner.getSnapshot().state.generation)).ok,false);assert.deepEqual((await f.repository.load()).document.cards,before.cards);
});
test('Deleted membership removes only its assignment, leaving all other pages and coordinates intact',async()=>{
 const f=await fixture('active');f.owner.pages.select(2);const before=saved(f),review=f.features.openDelete('fixture-card-2');assert.equal(review.ok,true);assert.equal((await f.features.confirmDelete(review.session.token)).ok,true);
 const after=saved(f);assert.equal(after.cards.length,4);assert.equal(after.canvas.pages.assignments['fixture-card-2'],undefined);assert.equal(after.canvas.layout['fixture-card-2'],undefined);
 assert.deepEqual(after.cards,before.cards.filter(c=>c.id!=='fixture-card-2'));assert.deepEqual(after.canvas.layout['fixture-card-5'],before.canvas.layout['fixture-card-5']);
});
test('Obsolete brand cleanup during Add/Edit is scoped to the selected page, preserving hidden metadata',async()=>{
 const f=await fixture(),d=saved(f);d.cards[1].brandId=null;d.cards[1].brandQuery='Protected legacy value';const {withoutObsoleteBrands}=load('src/lib/card-presentation.ts');const result=withoutObsoleteBrands(d,1);
 assert.deepEqual(result.cards[1],d.cards[1]);assert.equal(result.cards[1].brandQuery,'Protected legacy value');
});





test('Owner navigation exposes all five pages for every membership state without writes',async()=>{
 for(const status of ['free','expired','active']){
  const f=await fixture(status),before=JSON.stringify(f.owner.getSnapshot().session);
  for(const entry of f.owner.pages.access()){
   assert.equal(entry.editorDestination,entry.editable);
   const result=f.owner.pages.selectEditor(entry.page);assert.equal(result.ok,entry.editable);
   if(!entry.editable)assert.equal(result.code,'page_not_editable');
  }
  if(status!=='active')assert.equal(f.owner.pages.select(2).ok,true);
  assert.equal(JSON.stringify(f.owner.getSnapshot().session),before);assert.equal(f.events.length,0);
 }
});
