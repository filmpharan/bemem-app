const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),clone=v=>JSON.parse(JSON.stringify(v));let counter=0;
// Existing domain assertions preserved; presentation contracts live in the new focused suites.
function environment(){const files=new Map(),events=[],cache=new Map();let fail=null,serial=0;
 const snapshot={state:{generation:1,dirty:false}};
 function load(relative){let file=path.resolve(root,relative);if(!file.endsWith('.ts'))file+='.ts';if(cache.has(file))return cache.get(file).exports;const m={exports:{}};cache.set(file,m);
  const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  vm.runInThisContext('(function(require,module,exports){'+code+'})',{filename:file})(name=>{assert.ok(name.startsWith('.'),'No native/network dependency');return load(path.resolve(path.dirname(file),name));},m,m.exports);return m.exports;
 }
 const repo=load('src/lib/card-history-repository.ts').createHistoryRepository({scope:'keeps-test-'+(++counter),list:async()=>[...files.keys()],read:async name=>{if(fail==='readback'&&name.endsWith('.json'))throw Error('readback');return files.get(name);},writeExclusive:async(name,value)=>{events.push(['write']);if(fail==='write')throw Error('write');files.set(name,value);},promoteExclusive:async(pending,name)=>{files.set(name,files.get(pending));files.delete(pending);}},{now:()=> '2026-11-22T00:00:00.000Z',token:()=>`t-${++serial}`,verifyImages:()=>{}});
 return{load,repo,files,events,snapshot,fail:v=>{fail=v;}};
}
const fixture={assetId:'art-fixture.jpg',id:'receipt-one',width:4000,height:3000,byteLength:100,md5:'a'.repeat(32),crop:{x:.5,y:.5,zoom:1}};
function capability(e,cardId='card-one'){let id=0;return e.load('src/lib/card-history-commands.ts').createHistoryCommands(e.repo,{cardId,admission:()=>({generation:e.snapshot.state.generation,revision:10,context:'home',cardExists:true,canManage:!e.snapshot.state.dirty}),now:()=> '2026-11-22T00:00:00.000Z',nextId:()=>cardId+'-'+(++id)});}
for(const kind of ['full','reminder','gallery','note','camera'])test('Keep '+kind+' roundtrip is atomic, timestamped, card-linked and legacy-safe',async()=>{
 const e=environment(),c=capability(e),model=e.load('src/lib/card-history.ts'),keeps=e.load('src/lib/keeps.ts');await c.load();const form={kind,note:kind==='note'||kind==='full'?'  useful note  ':'',images:kind==='full'||kind==='camera'||kind==='gallery'?[fixture]:[],...(kind==='full'||kind==='reminder'?{reminder:{at:'2099-12-12T12:00:00.000Z',title:'Warranty check'}}:{})};
 const result=await c.saveKeep(form),record=result.document.records[0];assert.equal(record.cardId,'card-one');assert.equal(record.keep.kind,kind);assert.equal(record.createdAt,'2026-11-22T00:00:00.000Z');assert.equal(record.date,record.createdAt.slice(0,10));assert.deepEqual(await e.repo.load(),result.document);assert.equal(result.recordId,record.id);assert.equal(keeps.keepsForCard(result.document,'card-two').all.length,0);
 const second=capability(e,'card-two');await second.load();await second.saveKeep({kind:'note',note:'another card',images:[]});assert.equal(keeps.keepsForCard(await e.repo.load(),'card-one').all.length,1);
 const loaded=await e.repo.load(),before=clone(loaded);model.validateHistoryDocument(loaded);assert.deepEqual(loaded,before);
});
test('Strict Keep validation rejects empty content, wrong schedule/types/unknown fields; legacy records remain unchanged',()=>{
 const e=environment(),k=e.load('src/lib/keeps.ts'),m=e.load('src/lib/card-history.ts'),now='2026-11-22T00:00:00.000Z';
 assert.throws(()=>k.prepareKeep({kind:'full',note:'  ',images:[]},'one','test',now));assert.throws(()=>k.prepareKeep({kind:'reminder',note:'',images:[],reminder:{at:now,title:'past'}},'one','test',now));
 const record=k.prepareKeep({kind:'note',note:'test',images:[]},'one','test',now);for(const patch of [{keep:{kind:'unknown'}},{keep:{kind:'note',unknown:true}},{keep:{kind:'note',reminder:{at:'2099-01-01T00:00:00.000Z',title:'test',state:'pending',notification:{status:'scheduled',id:'wrong'}}}}])assert.throws(()=>m.validateHistoryRecord({...record,...patch}));
 const legacy=m.prepareHistoryRecord({...m.newHistoryForm(new Date(now)),notes:'Existing receipt'},'one','legacy',now),before=JSON.stringify(legacy);m.validateHistoryRecord(legacy);assert.equal(JSON.stringify(legacy),before);assert.equal(legacy.keep,undefined);
 assert.throws(()=>k.reminderInstant('2027-02-30','12:30'));assert.throws(()=>k.reminderInstant('2027-02-28','99:00'));
});
test('Upcoming sorts nearest first, excludes past/completed, and retains every record in Keeps',()=>{
 const e=environment(),k=e.load('src/lib/keeps.ts'),m=e.load('src/lib/card-history.ts'),now='2026-11-22T00:00:00.000Z',doc=m.emptyHistory(now);
 doc.records=['2099-12-30','2099-12-01','2027-01-01','2099-12-15'].map((date,i)=>k.prepareKeep({kind:'reminder',note:'',images:[],reminder:{at:date+'T12:00:00.000Z',title:'Reminder '+i}},'one','r-'+i,now));doc.records[3].keep.reminder.state='completed';const result=k.keepsForCard(doc,'one','2028-01-01T00:00:00.000Z');assert.deepEqual(result.upcoming.map(r=>r.id),['r-1','r-0']);assert.equal(result.all.length,4);
});
test('Failure and commit uncertainty never create duplicate Keeps or report success; explicit reinspection reads the committed record',async()=>{
 for(const failure of ['write','readback']){const e=environment(),c=capability(e);await c.load();e.fail(failure);await assert.rejects(c.saveKeep({kind:'note',note:'test',images:[]}));const writes=e.events.length;await assert.rejects(c.saveKeep({kind:'note',note:'retry',images:[]}));assert.equal(e.events.length,writes);e.fail(null);const reloaded=await e.repo.load();assert.equal(reloaded.records.length,failure==='readback'?1:0);}
});
test('Keep deletion is card-scoped and uses the same verified repository; old Arrange-only delete permission stays unchanged',async()=>{
 const e=environment(),c=capability(e);await c.load();const a=await c.saveKeep({kind:'note',note:'one',images:[]}),second=capability(e,'card-two');await second.load();const b=await second.saveKeep({kind:'note',note:'two',images:[]});await c.load();await assert.rejects(c.deleteKeep(b.recordId));await c.load();await assert.rejects(c.deleteSelected([a.recordId]));await c.load();await c.deleteKeep(a.recordId);const saved=await e.repo.load();assert.equal(saved.records.length,1);assert.equal(saved.records[0].id,b.recordId);
});
