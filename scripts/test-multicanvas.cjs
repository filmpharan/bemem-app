// Synthetic memory-only repository/owner. No device, FS adapter, account or billing integration.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),cache=new Map();
function load(file){file=path.resolve(root,file);if(!path.extname(file))file+='.ts';if(cache.has(file))return cache.get(file).exports;const m={exports:{}};cache.set(file,m);const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInThisContext(`(function(require,module,exports){${code}\n})`,{filename:file})(n=>{assert.ok(n.startsWith('.'),'Native/network import forbidden '+n);return load(path.resolve(path.dirname(file),n));},m,m.exports);return m.exports;}
const P=load('src/lib/canvas-pages.ts'),V=load('src/lib/wallet-validation.ts'),{createMultiCanvasFixture}=load('src/lib/dev-multicanvas.ts'),{walletCanvasPresentation}=load('src/lib/wallet-preparation.ts');
const clone=x=>JSON.parse(JSON.stringify(x)),doc=f=>V.validateWalletDocument(f.owner.getSnapshot().session.draft),saved=f=>V.validateWalletDocument(f.owner.getSnapshot().session.saved);
async function fixture(status='free'){const f=createMultiCanvasFixture();await f.owner.commands.initialize();f.status(status);return f;}
function legacy(){return {schemaVersion:2,dataset:'bemem-wallet',revision:10,savedAt:'2026-11-12T00:00:00.000Z',cards:[{kind:'demo',id:'demo-original',name:'Demo',orientation:'landscape',colors:['#123456','#abcdef']}],canvas:{columns:12,layout:{'demo-original':{col:0,row:0}},decorations:{version:1,items:[{id:'original-paw',assetId:'pet-paw',position:{col:8,row:2},rotation:270}]}}};}
test('Legacy read is byte-shape preserving; repeated validation never writes metadata or relocates Demo/decorations',()=>{
 const original=legacy(),before=JSON.stringify(original);for(let i=0;i<3;i++){assert.deepEqual(V.validateWalletDocument(original),original);assert.equal(P.itemCanvasPage(original,'demo-original'),1);assert.equal(P.itemCanvasPage(original,'original-paw'),1);}
 assert.equal(JSON.stringify(original),before);assert.equal(original.canvas.pages,undefined);assert.equal(walletCanvasPresentation(original).cards.length,2);
});
for(const [status,n]of [['free',1],...['active','expired'].flatMap(s=>[2,3,4,5].map(n=>[s,n]))])test(`Central access ${status}/${n} has exact navigation/read/write distinctions`,()=>{
 const input=legacy();input.canvas.pages={version:1,assignments:{},selectedCount:n===1?5:n};const result=P.canvasAccess(input,status);
 assert.equal(result.length,5);assert.deepEqual(result.filter(p=>p.visible).map(p=>p.page),Array.from({length:status==='active'?n:Math.min(5,n+1)},(_,i)=>i+1));
 assert.deepEqual(result.filter(p=>p.readable).map(p=>p.page),Array.from({length:n},(_,i)=>i+1));
 assert.deepEqual(result.filter(p=>p.editable).map(p=>p.page),status==='active'?Array.from({length:n},(_,i)=>i+1):[1]);
 assert.equal(result.filter(p=>p.preview).length,status==='active'||n===5?0:1);
});
test('Invalid page metadata/count/unknown fields fail closed, while unverified entitlement resolves Free',async()=>{
 const f=await fixture(),original=saved(f);
 for(const change of [d=>d.canvas.pages.version=2,d=>d.canvas.pages.selectedCount=6,d=>d.canvas.pages.selectedCount='3',d=>d.canvas.pages.assignments['fixture-card-1']=0,d=>d.canvas.pages.assignments.missing=2,d=>d.canvas.pages.entitlement='active']){
  const d=clone(original);change(d);assert.throws(()=>V.validateWalletDocument(d));
 }
 assert.deepEqual(P.canvasAccess(original,'unverified').filter(p=>p.visible).map(p=>p.page),[1,2]);
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
test('Free locked page has no content projection and rejects direct draft, feature and bundle-writer bypasses',async()=>{
 const f=await fixture();assert.equal(f.events.length,0);assert.equal(f.owner.pages.select(2).ok,true);const before=saved(f),next=doc(f);next.cards[1].name='Forbidden';
 assert.equal(f.owner.pages.access()[1].readable,false);assert.equal(f.owner.commands.updateDraft(f.owner.getSnapshot().state.generation,next).ok,false);
 assert.equal(f.features.openEdit('fixture-card-2').ok,false);assert.equal(f.features.openDelete('fixture-card-2').ok,false);assert.throws(()=>f.decorate(),/read-only/);
 assert.equal((await f.owner.getSnapshot().session.repository.save()).ok,false);assert.equal(f.events.length,0);assert.deepEqual((await f.repository.load()).document,before);
});
test('Active 5 to 2 to expiry to reactivation to 5 retains all page data and the last preference',async()=>{
 const f=await fixture('active'),before=saved(f);assert.equal(f.owner.pages.select(5).ok,true);assert.equal((await f.owner.pages.setCount(2)).ok,true);assert.equal(f.owner.pages.current(),1);
 f.status('expired');assert.deepEqual(f.owner.pages.access().filter(p=>p.visible).map(p=>p.page),[1,2,3]);assert.equal((await f.owner.pages.setCount(5)).ok,false);assert.equal(saved(f).canvas.pages.selectedCount,2);
 f.status('active');assert.equal(saved(f).canvas.pages.selectedCount,2);assert.equal((await f.owner.pages.setCount(5)).ok,true);
 const after=saved(f);assert.deepEqual(after.cards,before.cards);assert.deepEqual(after.canvas.layout,before.canvas.layout);assert.deepEqual(after.canvas.pages.assignments,before.canvas.pages.assignments);
});
test('New cards are placed on the current editable page; stale Add token cannot cross navigation epochs',async()=>{
 const f=await fixture('active'),{emptyCardForm}=load('src/lib/card-form.ts'),{emptyCardPresentation}=load('src/lib/card-presentation.ts'),values={...emptyCardForm(),name:'New sample',memberNumber:'00123456'};
 const stale=f.features.begin();assert.equal(f.owner.pages.select(2).ok,true);assert.equal(f.features.add(stale,values,emptyCardPresentation()).ok,false);
 const id=f.features.begin(),result=f.features.add(id,values,emptyCardPresentation());assert.equal(result.ok,true);const next=doc(f);assert.equal(P.itemCanvasPage(next,id),2);
 assert.deepEqual(next.canvas.layout['fixture-card-1'],{col:0,row:0});assert.notDeepEqual(next.canvas.layout[id],next.canvas.layout['fixture-card-2']);
});
test('Edit preserves page and identity; expiry rejects previously admitted Edit/Delete sessions without writes',async()=>{
 const f=await fixture('active');f.owner.pages.select(2);const edit=f.features.openEdit('fixture-card-2');assert.equal(edit.ok,true);
 const r=await f.features.saveEdit(edit.session.token,{...edit.session.values,name:'Edited on 2'});assert.equal(r.ok,true,JSON.stringify(r));assert.equal(P.itemCanvasPage(saved(f),'fixture-card-2'),2);assert.equal(saved(f).cards.length,5);
 const stale=f.features.openEdit('fixture-card-2'),deletion=f.features.openDelete('fixture-card-2'),writes=f.events.length;f.status('expired');
 assert.equal((await f.features.saveEdit(stale.session.token,{...stale.session.values,name:'Forbidden'})).ok,false);assert.equal((await f.features.confirmDelete(deletion.session.token)).ok,false);assert.equal(f.events.length,writes);
 assert.equal(f.owner.pages.access()[1].readable,true);assert.equal(f.owner.pages.canEditCard('fixture-card-2'),false);
});
test('Decorate placement, rotation, undo/redo and save stay on one page and never touch another',async()=>{
 const f=await fixture('active'),before=saved(f);f.owner.pages.select(2);const s=f.decorate();assert.equal(s.apply({type:'add',assetId:'pet-paw',position:{col:8,row:0}}).ok,true);
 let tile=s.snapshot().document.canvas.decorations.items[0];assert.equal(P.itemCanvasPage(s.snapshot().document,tile.id),2);
 assert.equal(s.apply({type:'rotate',id:tile.id}).ok,true);assert.equal(s.undo().ok,true);assert.equal(s.redo().ok,true);assert.equal((await s.save()).ok,true);
 assert.deepEqual(saved(f).cards,before.cards);assert.deepEqual(saved(f).canvas.layout,before.canvas.layout);f.owner.pages.select(1);const one=f.decorate();assert.equal(one.snapshot().canUndo,false);
 assert.equal(one.apply({type:'rotate',id:tile.id}).ok,false);assert.equal(walletCanvasPresentation(saved(f),1).cards.some(c=>c.id===tile.id),false);
 const stale=s.apply({type:'delete',id:tile.id});assert.equal(stale.ok,false);
});
test('Dirty page changes are synchronous blocked; failed Save retains draft and previous committed pages',async()=>{
 const f=await fixture('active');f.owner.pages.select(2);const s=f.decorate();s.apply({type:'add',assetId:'pet-paw',position:{col:8,row:0}});const draft=doc(f),before=saved(f);
 assert.equal(f.owner.pages.select(1).ok,false);assert.equal(f.owner.pages.current(),2);f.failWrites(true);assert.equal((await s.save()).ok,false);assert.deepEqual(doc(f),draft);assert.deepEqual((await f.repository.load()).document,before);
});
test('Expiry while a draft exists blocks Save; explicit discard restores memory without deleting stored page data',async()=>{
 const f=await fixture('active');f.owner.pages.select(2);const s=f.decorate();s.apply({type:'add',assetId:'pet-paw',position:{col:8,row:0}});const before=saved(f);f.status('expired');
 assert.equal(s.apply({type:'move',id:'fixture-card-2',position:{col:6,row:0}}).ok,false);assert.equal((await s.save()).ok,false);assert.equal(f.events.length,0);
 assert.equal(f.owner.commands.updateDraft(f.owner.getSnapshot().state.generation,before).ok,true);assert.equal(f.owner.pages.select(1).ok,true);assert.deepEqual(saved(f),before);
});
test('Repository rechecks admission after pending readback; denied commit preserves previous snapshot and pending evidence',async()=>{
 const f=await fixture('active'),before=saved(f);let calls=0;await assert.rejects(f.repository.save(before,before.revision,()=>++calls<2),/canvas_access_denied/);
 const result=await f.repository.load();assert.deepEqual(result.document,before);assert.equal(result.pendingFiles.length,1);assert.equal(f.files.size,2);
});

test('Entitlement expires after pending write: owner blocks commit, preserves prior data, and never retries automatically',async()=>{
 const f=await fixture('active');f.owner.pages.select(2);const before=saved(f),next=doc(f);next.cards[1].name='Pending edit';assert.equal(f.owner.commands.updateDraft(f.owner.getSnapshot().state.generation,next).ok,true);
 f.onPending(()=>f.status('expired'));const result=await f.owner.commands.save(f.owner.getSnapshot().state.generation);assert.equal(result.ok,false);
 const read=await f.repository.load();assert.deepEqual(read.document,before);assert.equal(read.pendingFiles.length,1);assert.equal(f.owner.getSnapshot().state.phase,'blocked');assert.equal(f.events.length,1);
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
test('Read-only premium Photo Journal loads existing content but denies add/delete/clear at command admission',async()=>{
 const f=await fixture('expired');f.owner.pages.select(2);const {createHistoryCommands}=load('src/lib/card-history-commands.ts');let writes=0;
 const history={schemaVersion:1,dataset:'bemem-card-history',revision:0,savedAt:'2026-01-01T00:00:00.000Z',records:[]};
 const commands=createHistoryCommands({load:async()=>history,save:async()=>{writes++;return history;}},{cardId:'fixture-card-2',now:()=>history.savedAt,nextId:()=> 'fixture-record',
  admission:()=>({generation:1,revision:1,context:'home',cardExists:true,canManage:f.owner.pages.canEditCard('fixture-card-2')})});
 assert.deepEqual(await commands.load(),history);await assert.rejects(commands.savePhoto({}),/ended|blocked/i);await assert.rejects(commands.clear(),/ended|blocked/i);assert.equal(writes,0);
});

test('Hidden Canvas 5 decorations restore exactly after active count 5 to 2 to 5, with no cross-page move',async()=>{
 const f=await fixture('active');f.owner.pages.select(5);const s=f.decorate();s.apply({type:'add',assetId:'pet-paw',position:{col:8,row:6}});const tile=s.snapshot().document.canvas.decorations.items[0];s.apply({type:'rotate',id:tile.id});assert.equal((await s.save()).ok,true);
 const before=saved(f);assert.equal((await f.owner.pages.setCount(2)).ok,true);assert.equal(f.owner.pages.access()[4].visible,false);assert.deepEqual(saved(f).canvas.decorations,before.canvas.decorations);
 assert.equal((await f.owner.pages.setCount(5)).ok,true);assert.equal(f.owner.pages.select(5).ok,true);assert.deepEqual(saved(f).canvas.decorations,before.canvas.decorations);
 const move=doc(f);move.canvas.pages.assignments[tile.id]=1;assert.equal(f.owner.commands.updateDraft(f.owner.getSnapshot().state.generation,move).ok,false);
});


test('Owner editor navigation rejects direct forbidden destinations while Home retains previews/read-only pages',async()=>{
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

test('Free transition keeps dirty hidden page ownership until explicit draft resolution',async()=>{
 const f=await fixture('active');f.owner.pages.selectEditor(5);const s=f.decorate();s.apply({type:'add',assetId:'pet-paw',position:{col:8,row:0}});
 const before=doc(f),committed=saved(f);f.status('free');assert.equal(f.owner.pages.current(),5);assert.equal(f.owner.pages.selectEditor(1).ok,false);
 assert.equal((await s.save()).ok,false);assert.deepEqual(doc(f),before);assert.deepEqual(saved(f),committed);assert.equal(f.events.length,0);
 f.status('active');assert.deepEqual(doc(f),before);assert.equal((await s.save()).ok,true);
});
