// Synthetic in-memory wallet + actual coordinator/repository; never opens native wallet files.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), ts = require('typescript');
const root = path.resolve(__dirname, '..'), cache = new Map();
function load(relative) {
  let file=path.resolve(root,relative);if(!path.extname(file))file+='.ts';
  if(cache.has(file))return cache.get(file).exports;
  const module={exports:{}};cache.set(file,module);
  const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  vm.runInThisContext(`(function(require,module,exports){${code}\n})`,{filename:file})(name=>{
    assert.ok(name.startsWith('.'),'No native/network imports in headless Decorate');return load(path.resolve(path.dirname(file),name));
  },module,module.exports);return module.exports;
}
const {validateWalletDocument,decodeWalletDocument}=load('src/lib/wallet-validation.ts');
const {createDecorateSession,decorationDropCell}=load('src/lib/decorate-session.ts');
const {createWalletOwnerScope}=load('src/lib/wallet-runtime-owner.ts');
const {createWalletStorageAdapters}=load('src/lib/wallet-storage-adapters.ts');
const {createWalletRepository}=load('src/lib/wallet-repository.ts');
const {walletCanvasPresentation,walletSearchPresentation}=load('src/lib/wallet-preparation.ts');
const {prepareProductionCardDraft,validateProductionWallet}=load('src/lib/wallet-production-policy.ts');
const {membershipResizePlan}=load('src/lib/card-editor-state.ts');
const {DECORATION_ASSETS,DECORATION_COLLECTIONS}=load('src/lib/decoration-catalog.ts');
const clone=x=>JSON.parse(JSON.stringify(x)),time='2026-11-09T00:00:00.000Z';
function card(id='synthetic-member') {return {kind:'membership',id,name:'Test Member',memberNumber:' 00123456 Ab ',payload:' 00123456 Ab ',preferredDisplayFormat:'qr',orientation:'landscape',
  appearance:{backgroundColor:'#405764',textColor:'#ffffff',imageAssetId:null},createdAt:time,updatedAt:time};}
function wallet(){return {schemaVersion:2,dataset:'bemem-wallet',revision:0,savedAt:time,cards:[card()],canvas:{columns:12,layout:{'synthetic-member':{col:0,row:0}}}};}
function tile(id='decor-test',position={col:8,row:0}){return {id,assetId:'pet-cat',position,rotation:0};}
function decorated(){const doc=wallet();doc.canvas.decorations={version:1,items:[tile()]};return doc;}
async function environment(input=wallet()) {
  const data=new Map(),events=[],scope={};let serial=0,failWrite=false,pause=null;
  const files={scope,async list(){return [...data.keys()];},async read(n){events.push(['read',n]);return data.get(n);},
    async writeExclusive(n,text){events.push(['write',n]);if(failWrite)throw Error('Synthetic failure');if(data.has(n))throw Error('Exists');data.set(n,text);},
    async promoteExclusive(p,c){events.push(['promote',p,c]);if(pause)await pause;if(data.has(c))throw Error('Exists');data.set(c,data.get(p));data.delete(p);}};
  const repository=()=>createWalletRepository(files,{token:()=>`synthetic-${++serial}`,now:()=>time});
  let repo=repository();const first=await repo.save(input,0);events.length=0;
  const adapter=()=>createWalletStorageAdapters({v1:{load:async()=>null,save:async()=>assert.fail('No v1 writes')},v2:repo,demoCards:[]});
  const owner=createWalletOwnerScope(adapter).getOwner();await owner.commands.initialize();events.length=0;
  return {data,events,first,repo,owner,newSession:()=>createDecorateSession(owner),repository,
    failWrite:()=>{failWrite=true;},pause:gate=>{pause=gate;}};
}
test('Six collections expose270 unique assets, retaining the original240 order and appending exactly30 frames',()=>{
  assert.equal(DECORATION_COLLECTIONS.length,6);assert.equal(DECORATION_ASSETS.length,270);
  assert.equal(new Set(DECORATION_ASSETS.map(a=>a.id)).size,270);
  assert.equal(new Set(DECORATION_COLLECTIONS.flatMap(c=>c.assets)).size,270);
  const baseline=JSON.parse(fs.readFileSync(path.join(root,'artwork-trials/cozy-cute-270-2026-11-11/existing-240.json')));
  for(const c of DECORATION_COLLECTIONS){const expanded=['pets','wellness','savings'].includes(c.id);assert.equal(c.assets.length,expanded?50:40);assert.ok(c.assets.every(id=>DECORATION_ASSETS.some(a=>a.id===id)));
    assert.deepEqual(c.assets.slice(0,40),baseline.filter(a=>a.collection===c.id).map(a=>a.id));
    const counts={};for(const id of c.assets){const a=DECORATION_ASSETS.find(a=>a.id===id);counts[a.category]=(counts[a.category]??0)+1;}
    assert.deepEqual(counts,{focal:10,mini:10,frame:expanded?22:12,accent:8});}
});
test('Static Metro registry covers every asset exactly once with literal requires; approved13 copied byte-for-byte',()=>{
  const registry=fs.readFileSync(path.join(root,'src/constants/decoration-images.ts'),'utf8');
  const matches=[...registry.matchAll(/'([^']+)': require\('([^']+)'\)/g)];assert.equal(matches.length,270);
  const hashes=new Set();
  for(const [_,id,relative]of matches){assert.ok(DECORATION_ASSETS.some(a=>a.id===id));const bytes=fs.readFileSync(path.resolve(root,'src/constants',relative));
    assert.equal(bytes.subarray(1,4).toString(),'PNG');assert.equal(bytes.readUInt32BE(16),192);assert.equal(bytes.readUInt32BE(20),192);assert.equal(bytes[24],8);assert.equal(bytes[25],6);
    hashes.add(require('node:crypto').createHash('sha256').update(bytes).digest('hex'));}assert.equal(hashes.size,270);
  for(const a of JSON.parse(fs.readFileSync(path.join(root,'artwork-trials/cozy-cute-270-2026-11-11/existing-240.json')))){
    assert.equal(require('node:crypto').createHash('sha256').update(fs.readFileSync(path.join(root,a.path))).digest('hex'),a.sha256);
  }
  for(const a of JSON.parse(fs.readFileSync(path.join(root,'artwork-trials/cozy-cute-240-2026-11-11/legacy-assets.json')))){
    const entry=matches.find(m=>m[1]===a.id);assert.ok(entry);assert.equal(require('node:crypto').createHash('sha256').update(fs.readFileSync(path.resolve(root,'src/constants',entry[2]))).digest('hex'),a.sha256);
  }
  const old=JSON.parse(fs.readFileSync(path.join(root,'artwork-trials/illustrator-v2-first-trial-2026-11-09/review/asset-manifest.json')));
  for(const a of old.assets)assert.deepEqual(fs.readFileSync(path.join(root,'assets/decorations/cozy-cute-v1',a.id+'.png')),fs.readFileSync(path.join(root,'artwork-trials/illustrator-v2-first-trial-2026-11-09/review',a.png)));
});
test('Legacy v2 stays unchanged on read; additive decorations round-trip without changing card payloads or metadata',()=>{
  const before=wallet();assert.deepEqual(validateWalletDocument(before),before);assert.equal(Object.hasOwn(validateWalletDocument(before).canvas,'decorations'),false);
  const extended=decorated();assert.deepEqual(decodeWalletDocument(JSON.stringify(extended)),extended);assert.deepEqual(extended.cards,before.cards);
});
test('Decoration schema rejects unknown fields, versions, assets, IDs, coordinates and non-quarter rotations',()=>{
  const inputs=[d=>d.canvas.decorations.version=2,d=>d.canvas.decorations.extra=true,d=>d.canvas.decorations.items[0].extra=true,
    d=>d.canvas.decorations.items[0].assetId='missing',d=>d.canvas.decorations.items[0].rotation=45,d=>d.canvas.decorations.items[0].position.row=-1,
    d=>d.canvas.decorations.items[0].position.col=12,d=>d.canvas.decorations.items[0].position.col=1.5,d=>d.canvas.decorations.items[0].id='synthetic-member'];
  for(const patch of inputs){const d=decorated();patch(d);assert.throws(()=>validateWalletDocument(d));}
  const duplicate=decorated();duplicate.canvas.decorations.items.push(tile());assert.throws(()=>validateWalletDocument(duplicate));
});
test('Full logical blocks collide with cards and decorations; no inset loophole',()=>{
  const a=decorated();a.canvas.decorations.items[0].position={col:5,row:3};assert.throws(()=>validateWalletDocument(a),/overlapping_decorations/);
  const b=decorated();b.canvas.decorations.items.push(tile('second'));assert.throws(()=>validateWalletDocument(b),/overlapping_decorations/);
});
test('Production retains its 240-row safety boundary; schema does not trim distant decorations',()=>{
  const d=decorated();d.canvas.decorations.items[0].position.row=300;assert.equal(validateWalletDocument(d).canvas.decorations.items[0].position.row,300);
  assert.throws(()=>validateProductionWallet(d),/canvas_240_row_limit/);
});
test('Opening Decorate, selecting and cancelling without changes do not write',async()=>{
  const e=await environment();const s=e.newSession();assert.equal(s.snapshot().dirty,false);assert.equal(s.cancel().ok,true);assert.equal(e.events.some(e=>e[0]==='write'),false);
});
test('Add, move, four rotations and delete are draft-only; membership metadata stays byte-equivalent',async()=>{
  const e=await environment(),s=e.newSession();assert.equal(s.apply({type:'add',assetId:'pet-cat',position:{col:8,row:0}}).ok,true);
  const id=s.snapshot().document.canvas.decorations.items[0].id;
  assert.equal(s.apply({type:'move',id,position:{col:9,row:1}}).ok,true);
  for(const angle of [90,180,270,0]){assert.equal(s.apply({type:'rotate',id}).ok,true);assert.equal(s.snapshot().document.canvas.decorations.items[0].rotation,angle);}
  assert.deepEqual(s.snapshot().document.cards,e.first.cards);assert.equal(s.apply({type:'delete',id}).ok,true);
  assert.equal(s.snapshot().document.canvas.decorations.items.length,0);assert.deepEqual(e.owner.getSnapshot().session.saved,e.first);assert.equal(e.events.length,0);
});
test('Undo/Redo each action, including a completed membership drag, one action per step',async()=>{
  const e=await environment(),s=e.newSession();let before=s.snapshot().document;
  const actions=[{type:'add',assetId:'vine-corner',position:{col:8,row:0}},{type:'move',id:'synthetic-member',position:{col:0,row:8}}];
  for(const action of actions){assert.equal(s.apply(action).ok,true);const after=s.snapshot().document;assert.equal(s.undo().ok,true);assert.deepEqual(s.snapshot().document,before);
    assert.equal(s.redo().ok,true);assert.deepEqual(s.snapshot().document,after);before=after;}
  const id=before.canvas.decorations.items[0].id;
  for(const action of [{type:'move',id,position:{col:9,row:0}},{type:'rotate',id},{type:'delete',id}]){
    assert.equal(s.apply(action).ok,true);const after=s.snapshot().document;s.undo();assert.deepEqual(s.snapshot().document,before);s.redo();assert.deepEqual(s.snapshot().document,after);before=after;
  }
});
test('A new action after Undo clears only the Redo branch; no-op movement adds no history',async()=>{
  const e=await environment(),s=e.newSession();s.apply({type:'move',id:'synthetic-member',position:{col:0,row:8}});s.undo();assert.equal(s.snapshot().canRedo,true);
  s.apply({type:'add',assetId:'pet-paw',position:{col:10,row:2}});assert.equal(s.snapshot().canRedo,false);s.undo();assert.deepEqual(s.snapshot().document,e.first);
  s.apply({type:'move',id:'synthetic-member',position:{col:0,row:0}});assert.equal(s.snapshot().canUndo,false);
});
test('Occupied and outside drops keep every unrelated item and history unchanged',async()=>{
  const e=await environment(decorated()),s=e.newSession(),before=s.snapshot();
  for(const position of [{col:-1,row:0},{col:12,row:0},{col:8,row:0},{col:0,row:0},{col:8,row:240}])assert.equal(s.apply({type:'add',assetId:'pet-paw',position}).ok,false);
  assert.equal(s.apply({type:'move',id:'synthetic-member',position:{col:5,row:0}}).ok,false);
  assert.deepEqual(s.snapshot(),before);assert.equal(s.apply({type:'delete',id:'synthetic-member'}).ok,false);assert.equal(s.apply({type:'rotate',id:'synthetic-member'}).ok,false);
});
test('Cancel restores the entry Create draft without writing; no inherited unsaved work is discarded',async()=>{
  const e=await environment(),snapshot=e.owner.getSnapshot();const prior=clone(snapshot.session.draft);prior.canvas.layout['synthetic-member']={col:0,row:10};
  e.owner.commands.updateDraft(snapshot.state.generation,prior);const s=e.newSession();s.apply({type:'add',assetId:'pet-cat',position:{col:8,row:0}});
  assert.equal(s.cancel().ok,true);assert.deepEqual(e.owner.getSnapshot().session.draft,prior);assert.equal(e.owner.getSnapshot().state.dirty,true);assert.equal(e.events.length,0);
});
test('Save commits moved cards and decorations together, verifies readback, then a new repository reloads exact state',async()=>{
  const e=await environment(),s=e.newSession();s.apply({type:'add',assetId:'vine-corner',position:{col:8,row:0}});const id=s.snapshot().document.canvas.decorations.items[0].id;
  s.apply({type:'rotate',id});s.apply({type:'move',id:'synthetic-member',position:{col:0,row:8}});const expected=s.snapshot().document;
  assert.equal((await s.save()).ok,true);assert.equal(s.snapshot().closed,true);assert.equal(s.snapshot().canUndo,false);
  const reloaded=(await e.repository().load()).document;assert.equal(reloaded.revision,2);assert.deepEqual(reloaded.canvas,expected.canvas);assert.deepEqual(reloaded.cards,expected.cards);
  assert.equal(e.events.filter(e=>e[0]==='write').length,1);assert.equal(e.events.filter(e=>e[0]==='promote').length,1);
});
test('Double Save and edits while commit is pending are synchronously rejected',async()=>{
  const e=await environment(),s=e.newSession();s.apply({type:'add',assetId:'pet-cat',position:{col:8,row:0}});
  let release;e.pause(new Promise(r=>release=r));const first=s.save();assert.equal((await s.save()).ok,false);
  assert.equal(s.apply({type:'move',id:'synthetic-member',position:{col:0,row:8}}).ok,false);assert.equal(s.cancel().ok,false);
  release();assert.equal((await first).ok,true);assert.equal(e.events.filter(e=>e[0]==='write').length,1);
});
test('Save failure retains draft, blocks retry and never reports success or rewrites an old wallet',async()=>{
  const e=await environment(),s=e.newSession();s.apply({type:'add',assetId:'pet-cat',position:{col:8,row:0}});e.failWrite();const before=clone(e.owner.getSnapshot().session.saved);
  assert.equal((await s.save()).ok,false);assert.equal(s.snapshot().uncertain,true);const writes=e.events.filter(e=>e[0]==='write').length;
  assert.equal((await s.save()).ok,false);assert.equal(e.events.filter(e=>e[0]==='write').length,writes);assert.deepEqual(e.owner.getSnapshot().session.saved,before);
  assert.equal(s.cancel().ok,true);assert.equal(e.owner.getSnapshot().session.draft.canvas.decorations.items.length,1);
});
test('Pending and revision conflicts remain blocked through Decorate without retry or false success',async()=>{
  for(const reason of ['pending','revision']) {
    const e=await environment(),s=e.newSession();s.apply({type:'add',assetId:'pet-cat',position:{col:8,row:0}});
    if(reason==='pending')e.data.set('wallet-0000000000000002.synthetic-interrupted.pending','incomplete');
    else await e.repo.save(e.owner.getSnapshot().session.saved,1);
    const before=new Map(e.data),result=await s.save();assert.equal(result.ok,false);assert.equal(e.owner.getSnapshot().state.editsAllowed,false);
    assert.equal(e.owner.getSnapshot().state.failure.kind,reason==='pending'?'pending':'revision_conflict');assert.deepEqual(e.data,before);
    assert.equal((await s.save()).ok,false);assert.deepEqual(e.data,before);
  }
});
test('An old editor session cannot overwrite another draft or a changed generation',async()=>{
  const e=await environment(),first=e.newSession(),second=e.newSession();second.apply({type:'add',assetId:'pet-paw',position:{col:8,row:0}});
  assert.equal(first.apply({type:'add',assetId:'pet-cat',position:{col:9,row:0}}).ok,false);assert.equal(first.cancel().ok,false);
  await e.owner.commands.save(e.owner.getSnapshot().state.generation);assert.equal(second.apply({type:'add',assetId:'pet-cat',position:{col:9,row:0}}).ok,false);
});
test('Search hides decorations, reflows matching cards, and clearing restores exact saved coordinates',()=>{
  const doc=decorated(),before=clone(doc),view=walletSearchPresentation(doc,'test',true);assert.equal(view.cards.length,1);assert.equal(view.cards[0].kind,'membership');
  assert.deepEqual(view.layout['synthetic-member'],{col:0,row:0});const restored=walletSearchPresentation(doc,'',true);assert.equal(restored.cards.length,2);assert.deepEqual(restored.layout['decor-test'],{col:8,row:0});assert.deepEqual(doc,before);
});
test('Add and Resize respect decoration occupancy while preserving all existing decoration data',()=>{
  const doc=decorated();doc.canvas.layout['synthetic-member']={col:0,row:10};doc.canvas.decorations.items[0].position={col:0,row:0};
  const sizes=load('src/lib/card-size-presets.ts');const preset=sizes.CARD_SIZE_PRESETS[0];
  const next={...card('new-card'),sizePresetId:preset.id,widthBlocks:preset.ratioWidth,heightBlocks:preset.ratioHeight,orientation:preset.orientation,country:'TH',brandId:null,brandQuery:'',expiryMonth:'',appearance:{...card().appearance,gradientPresetId:null}};
  const added=prepareProductionCardDraft(doc,next);assert.deepEqual(added.canvas.decorations,doc.canvas.decorations);assert.notDeepEqual(added.canvas.layout['new-card'],{col:0,row:0});
  assert.deepEqual(membershipResizePlan(doc,doc.cards[0]).position,doc.canvas.layout['synthetic-member']);
});
test('Drop mapping accounts for native viewport, current scroll, edges and safe-area offset',()=>{
  const geometry={pageX:16,pageY:128,width:336,height:280,unit:28,scrollY:140};
  assert.deepEqual(decorationDropCell({x:30,y:142},geometry),{col:0,row:5});assert.deepEqual(decorationDropCell({x:351,y:407},geometry),{col:11,row:14});
  for(const point of [{x:15,y:150},{x:352,y:150},{x:30,y:127},{x:30,y:408}])assert.equal(decorationDropCell(point,geometry),null);
});
test('Render DTO preserves one full square tile with zero inset and does not expose membership payload',()=>{
  const d=decorated(),v=walletCanvasPresentation(d),deco=v.cards.find(c=>c.kind==='decoration'),grid=load('src/lib/canvas-layout.ts');
  assert.deepEqual(grid.cardSize(deco),{cols:1,rows:1});const frame=grid.canvasItemFrame(deco,{col:8,row:0},28);assert.deepEqual(frame,{left:224,top:0,width:28,height:28});assert.equal('payload' in v.cards[0],false);
});

function nodes(tree,out=[]) {if(!tree||typeof tree!=='object')return out;if(Array.isArray(tree)){tree.forEach(x=>nodes(x,out));return out;}out.push(tree);nodes(tree.props?.children,out);if(tree.props?.slots)nodes(Object.values(tree.props.slots),out);return out;}
function folderView(){const d=wallet();d.cards.push(card('second'));d.canvas.layout.second={col:6,row:0};return walletCanvasPresentation(load('src/lib/group-folder.ts').createGroupFolder(d,'folder-test','Test Folder','landscape',['synthetic-member','second'],1));}
test('Actual Decorate screen folder move triggers existing Back protection; Keep and Undo/Redo retain history',async()=>{
 const doc=wallet();doc.cards.push(card('second'));doc.canvas.layout.second={col:6,row:0};
 const e=await environment(load('src/lib/group-folder.ts').createGroupFolder(doc,'folder-test','Test Folder','landscape',['synthetic-member','second'],1));
 const h=nativeHarness('src/components/bemem/DecorateMode.tsx','EditableDecorateMode');let closed=0;
 const render=()=>h.render({wallet:{runtime:e.owner,snapshot:e.owner.getSnapshot()},onClose(){closed++;},onSaved(){}});
 let tree=render(),canvas=nodes(tree).find(n=>n.type==='WalletCanvas'),before=clone(e.owner.getSnapshot().session.draft);
 canvas.props.onOpen(canvas.props.cards.find(c=>c.kind==='folder'));assert.equal(closed,0);assert.equal(nodes(render()).some(n=>/FolderSheet/.test(n.type??'')),false);
 canvas.props.onMove('folder-test',{col:0,row:8});tree=render();assert.equal(e.owner.getSnapshot().state.dirty,true);assert.equal(e.events.length,0);
 const moved=clone(e.owner.getSnapshot().session.draft);tree.props.onRequestClose();let request=nodes(render()).find(n=>n.type==='ConfirmationDialog').props.request;
 assert.equal(request.title,'Discard decoration changes?');request.actions[0].onPress();assert.deepEqual(e.owner.getSnapshot().session.draft,moved);
 nodes(render()).find(n=>n.props?.accessibilityLabel==='Undo').props.onPress();assert.deepEqual(e.owner.getSnapshot().session.draft,before);
 nodes(render()).find(n=>n.props?.accessibilityLabel==='Redo').props.onPress();assert.deepEqual(e.owner.getSnapshot().session.draft,moved);
 render().props.onRequestClose();request=nodes(render()).find(n=>n.type==='ConfirmationDialog').props.request;request.actions[1].onPress();assert.equal(closed,1);assert.deepEqual(e.owner.getSnapshot().session.draft,before);assert.equal(e.events.length,0);
});
test('Home/Create/Decorate render the same folder but only editing modes mount the existing drag responder',()=>{
 const view=folderView();
 for(const mode of ['home','create','decorate']){
  let opened=0;const h=nativeHarness('src/components/bemem/WalletCanvas.tsx','WalletCanvas',{3:336,4:400});
  const tree=h.render({...view,allCards:view.cards,editing:mode!=='home',decorating:mode==='decorate',disabled:false,onMove(){},onOpen(){opened++;},onDragging(){}});
  const draggable=nodes(tree).find(n=>typeof n.type==='function'&&n.props.card?.kind==='folder');
  if(mode==='home'){assert.equal(draggable,undefined);nodes(tree).find(n=>n.props?.accessibilityLabel==='Test Folder. Preview card.').props.onPress();assert.equal(opened,1);}
  else {assert.ok(draggable);assert.equal(draggable.props.decorating,mode==='decorate');assert.equal(nodes(tree).some(n=>n.props?.pointerEvents==='none'&&n.props?.children?.props?.card?.kind==='folder'),false);}
 }
});
test('Real folder responder preserves 350ms hold, blocks Decorate sheet taps and emits one valid completed move',()=>{
 const view=folderView(),folder=view.cards.find(c=>c.kind==='folder'),position=view.layout[folder.id],events=[];
 for(const decorating of [false,true]){
  const h=nativeHarness('src/components/bemem/WalletCanvas.tsx','__DraggableCard');
  const props={card:folder,position,unit:28,layout:view.layout,allCards:view.cards,maxRows:240,decorating,onMove:(...a)=>events.push(['move',...a]),onOpen:()=>events.push(['open']),onDragging:a=>events.push(['drag',a])};
  const root=h.render(props),g={dx:0,dy:0,numberActiveTouches:1},openedBefore=events.filter(e=>e[0]==='open').length;
  root.props.onPanResponderGrant(null,g);root.props.onPanResponderRelease(null,g);
  assert.equal(events.filter(e=>e[0]==='open').length,openedBefore+(decorating?0:1));
  const start=events.length;root.props.onPanResponderGrant(null,g);h.advance(349);assert.equal(events.length,start);h.advance(1);assert.deepEqual(events.at(-1),['drag',true]);
  root.props.onPanResponderMove(null,{...g,dy:224});root.props.onPanResponderRelease(null,{...g,dy:224});
  assert.deepEqual(events.at(-2),['move',folder.id,{col:position.col,row:position.row+8}]);assert.deepEqual(events.at(-1),['drag',false]);
  assert.equal(events.filter(e=>e[0]==='open').length,1);
  if(decorating){root.props.onAccessibilityAction({nativeEvent:{actionName:'activate'}});assert.equal(events.filter(e=>e[0]==='open').length,1);}
 }
});
test('Folder drag collision and boundary rejection do not emit a move or sheet open',()=>{
 const view=folderView(),folder=view.cards.find(c=>c.kind==='folder'),position=view.layout[folder.id],blocker={...card('blocker'),colors:['#123456','#234567']};
 for(const [dx,dy] of [[0,112],[1000,0],[0,7000]]){
  const h=nativeHarness('src/components/bemem/WalletCanvas.tsx','__DraggableCard'),events=[],g={dx,dy,numberActiveTouches:1};
  const tree=h.render({card:folder,position,unit:28,layout:{...view.layout,blocker:{col:position.col,row:position.row+4}},allCards:[...view.cards,blocker],maxRows:240,decorating:true,onMove:()=>events.push('move'),onOpen:()=>events.push('open'),onDragging(){}});
  tree.props.onPanResponderGrant(null,{...g,dx:0,dy:0});h.advance(350);tree.props.onPanResponderMove(null,g);tree.props.onPanResponderRelease(null,g);assert.deepEqual(events,[]);
 }
});
function nativeHarness(relative,exportName,initialSlots={},dimensions={width:390,height:844,fontScale:1}) {
  const slots=[],alerts=[],responders=[];let cursor=0;
  let tick=0;const timers=[];
  const react={useState(initial){const i=cursor++;if(!(i in slots))slots[i]=Object.hasOwn(initialSlots,i)?initialSlots[i]:typeof initial==='function'?initial():initial;
    return [slots[i],value=>{slots[i]=typeof value==='function'?value(slots[i]):value;}];},useRef(value){const i=cursor++;slots[i]??={current:value};return slots[i];},
    useMemo:fn=>fn(),useCallback:fn=>fn,useEffect(){},memo:fn=>fn};
  const native=Object.fromEntries(['View','Text','ScrollView','Modal','Pressable','ActivityIndicator'].map(x=>[x,x]));
  Object.assign(native,{StyleSheet:{create:x=>x,absoluteFill:{}},useWindowDimensions:()=>dimensions,
    Alert:{alert:(...args)=>alerts.push(args)},PanResponder:{create:options=>{responders.push(options);return {panHandlers:options};}}});
  const dependencies={react,'react-native':native,'react-native-safe-area-context':{SafeAreaView:'SafeAreaView'},
    'react/jsx-runtime':{jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})},
    '../../constants/bemem-theme':{bemem:{background:'#f7f7f7',primary:'#405764',muted:'#52636b',foreground:'#203138',error:'#a02020'}},
    '../../constants/lagoon-theme':{lagoonFonts:{latin:'System'}},
    './WalletCanvas':{WalletCanvas:'WalletCanvas'},'./DecorationImage':{DecorationImage:'DecorationImage'},'./GlassButton':{GlassButton:'GlassButton'},
    './DecorateIcon':{DecorateIcon:'DecorateIcon'},'./MembershipCard':{MembershipCard:'MembershipCard'},'./WalletEmptyState':{WalletEmptyState:'WalletEmptyState'}};
  dependencies['./BememIcon']={BememIcon:'BememIcon'};
  dependencies['../../constants/ci-theme']=require('./ci-theme-fixture.cjs');
  dependencies['./ConfirmationDialog']={ConfirmationDialog:'ConfirmationDialog'};
  dependencies['./AddCardIcon']={AddCardIcon:'AddCardIcon'};
  dependencies['./CanvasPageSelector']={CanvasPageSelector:'CanvasPageSelector'};dependencies['./LockedCanvas']={LockedCanvas:'LockedCanvas'};
  dependencies['./EightSlotHeader']={EightSlotHeader:'EightSlotHeader',compactHeaderStyles:{target:{width:'100%',maxWidth:48,height:48},circle:{width:32,aspectRatio:1,borderRadius:16,borderWidth:1}}};
  dependencies['./CanvasPagePopoverHost']={CanvasPagePopoverHost:'CanvasPagePopoverHost'};
  dependencies['expo-image']={Image:'Image'};
  dependencies['../../constants/decoration-images']={decorationImages:Object.fromEntries(DECORATION_ASSETS.map((a,i)=>[a.id,i+1]))};
  dependencies['../../lib/card-interaction']={createCardInteraction:callbacks=>load('src/lib/card-interaction.ts').createCardInteraction(callbacks,{schedule(fn,ms){
    const t={fn,at:tick+ms,cancelled:false};timers.push(t);return()=>{t.cancelled=true;};}})};
  const module={exports:{}},file=path.resolve(root,relative),code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  vm.runInThisContext(`(function(require,module,exports){${code}\nif(typeof DrawerAsset==='function')module.exports.__DrawerAsset=DrawerAsset;\nif(typeof DraggableCard==='function')module.exports.__DraggableCard=DraggableCard;\n})`,{filename:file})(name=>dependencies[name]??load(path.resolve(path.dirname(file),name)),module,module.exports);
  return {alerts,responders,render(props){cursor=0;return module.exports[exportName](props);},advance(ms){tick+=ms;for(const t of timers)if(!t.cancelled&&t.at<=tick){t.cancelled=true;t.fn();}}};
}
async function editorHarness(dimensions={width:390,height:844,fontScale:1}) {
  const e=await environment(),h=nativeHarness('src/components/bemem/DecorateMode.tsx','EditableDecorateMode',{},dimensions);let closed=0,saved=0;
  const render=()=>h.render({wallet:{runtime:e.owner,snapshot:e.owner.getSnapshot()},onClose(){closed++;},onSaved(){saved++;}});
  return {e,h,render,closed:()=>closed,saved:()=>saved};
}
test('Fixed drawer has no resize handle or helper footer; thumbnails still use measured grid units',async()=>{
  const x=await editorHarness();let tree=x.render();const rootView=nodes(tree).find(n=>n.props?.onLayout);
  rootView.props.onLayout({nativeEvent:{layout:{height:700}}});tree=x.render();
  const drawer=nodes(tree).find(n=>n.props?.accessibilityLabel==='Decoration drawer');
  assert.equal(drawer.props.style.flexShrink,0);assert.equal(drawer.props.style.height,undefined);
  assert.equal(drawer.props.onPanResponderMove,undefined);
  assert.equal(nodes(drawer).some(n=>/Expand decoration drawer|Collapse decoration drawer/.test(n.props?.accessibilityLabel??'')),false);
  assert.equal(nodes(drawer).some(n=>n.props?.onMoveShouldSetPanResponder),false);
  assert.equal(nodes(drawer).some(n=>n.type==='Text'&&/Hold to drag|Tap an empty canvas|\d\/\d/.test(n.props.children)),false);
  assert.equal(drawer.props.children[0],false); // no error reserves no header/blank content
  assert.equal(drawer.props.children[1].props.style.flexDirection,'row'); // toolbar first visible content
  assert.equal(x.h.responders.length,0); // no parent resize responder competing with pickup
  nodes(tree).find(n=>n.type==='WalletCanvas').props.onGeometry({pageX:16,pageY:100,width:328,height:280,unit:328/12,scrollY:0});tree=x.render();
  assert.ok(nodes(tree).filter(n=>typeof n.type==='function').every(n=>n.props.unit===328/12));
  const cafe=nodes(tree).find(n=>n.type==='Pressable'&&n.props.accessibilityLabel==='Café Day');cafe.props.onPress();tree=x.render();
  assert.deepEqual(nodes(tree).filter(n=>typeof n.type==='function').map(n=>n.props.assetId),DECORATION_COLLECTIONS[3].assets.slice(0,23));
});

test('Selecting an asset never reintroduces a visible instruction/footer; real errors remain announced above the toolbar',async()=>{
 const x=await editorHarness();let tree=x.render();const asset=nodes(tree).find(n=>typeof n.type==='function');
 asset.props.onSelect(asset.props.assetId);tree=x.render();
 const text=nodes(tree).filter(n=>n.type==='Text').map(n=>n.props.children).join(' ');
 assert.equal(/Hold to drag|Tap an empty canvas cell|Pet & Care|1\/3/.test(text),false);
 nodes(tree).find(n=>typeof n.type==='function').props.onDrop(asset.props.assetId,{x:-1,y:-1});tree=x.render();
 const drawer=nodes(tree).find(n=>n.props?.accessibilityLabel==='Decoration drawer');
 assert.equal(drawer.props.children[0].props.accessibilityRole,'alert');assert.equal(drawer.props.children[0].props.accessibilityLiveRegion,'assertive');
 assert.equal(x.e.events.length,0);
});
test('Drawer drag/drop callbacks show a candidate, add one draft item, then select/rotate/delete/Undo restore it',async()=>{
  const x=await editorHarness();let tree=x.render(),canvas=nodes(tree).find(n=>n.type==='WalletCanvas');
  canvas.props.onGeometry({pageX:16,pageY:100,width:336,height:280,unit:28,scrollY:0});tree=x.render();
  let asset=nodes(tree).find(n=>typeof n.type==='function'&&n.props.assetId==='pet-cat');asset.props.onDrag('pet-cat',{x:254,y:114});tree=x.render();
  canvas=nodes(tree).find(n=>n.type==='WalletCanvas');assert.deepEqual(canvas.props.dropTarget,{position:{col:8,row:0},valid:true});
  asset.props.onDrop('pet-cat',{x:254,y:114});asset.props.onEnd();tree=x.render();canvas=nodes(tree).find(n=>n.type==='WalletCanvas');
  const deco=canvas.props.cards.find(c=>c.kind==='decoration');assert.ok(deco);canvas.props.onOpen(deco);tree=x.render();
  canvas=nodes(tree).find(n=>n.type==='WalletCanvas');assert.equal(canvas.props.selectedDecoration,deco.id);canvas.props.onRotateDecoration(deco.id);
  tree=x.render();canvas=nodes(tree).find(n=>n.type==='WalletCanvas');assert.equal(canvas.props.cards.find(c=>c.id===deco.id).decoration.rotation,90);
  canvas.props.onDeleteDecoration(deco.id);tree=x.render();assert.equal(nodes(tree).find(n=>n.type==='WalletCanvas').props.cards.length,1);
  nodes(tree).find(n=>n.props?.accessibilityLabel==='Undo').props.onPress();tree=x.render();
  assert.equal(nodes(tree).find(n=>n.type==='WalletCanvas').props.cards.length,2);assert.equal(x.e.events.length,0);
});
test('Tap-placement is an alternative to drag; card taps do not open details in Decorate',async()=>{
  const x=await editorHarness();let tree=x.render();nodes(tree).find(n=>typeof n.type==='function').props.onSelect('pet-cat');tree=x.render();
  nodes(tree).find(n=>n.type==='WalletCanvas').props.onCanvasPress({col:8,row:0});tree=x.render();
  const canvas=nodes(tree).find(n=>n.type==='WalletCanvas');assert.equal(canvas.props.cards.length,2);canvas.props.onOpen(canvas.props.cards[0]);tree=x.render();
  assert.equal(nodes(tree).some(n=>/(?:CardDetail|CardPreview|AddCard(?:Sheet|Form|Editor)?|EditCard)$/.test(String(n.type))),false);
});
test('Android Back and Cancel request discard confirmation; keeping changes never writes; confirmed discard restores entry',async()=>{
  const x=await editorHarness();let tree=x.render();nodes(tree).find(n=>typeof n.type==='function').props.onSelect('pet-cat');tree=x.render();
  nodes(tree).find(n=>n.type==='WalletCanvas').props.onCanvasPress({col:8,row:0});tree=x.render();tree.props.onRequestClose();
  assert.equal(x.closed(),0);assert.equal(nodes(x.render()).find(n=>n.type==='ConfirmationDialog').props.request.actions[0].role,'primary');assert.equal(x.e.events.length,0);
  assert.equal(x.e.owner.getSnapshot().session.draft.canvas.decorations.items.length,1);
  nodes(x.render()).find(n=>n.type==='ConfirmationDialog').props.request.actions[1].onPress();assert.equal(x.closed(),1);assert.equal(x.e.owner.getSnapshot().session.draft.canvas.decorations,undefined);assert.equal(x.e.events.length,0);
});
test('Cancel without changes exits immediately; Save returns to Home only after verified persistence',async()=>{
  const clean=await editorHarness();clean.render().props.onRequestClose();assert.equal(clean.closed(),1);assert.equal(clean.h.alerts.length,0);
  const x=await editorHarness();let tree=x.render();nodes(tree).find(n=>typeof n.type==='function').props.onSelect('pet-cat');tree=x.render();
  nodes(tree).find(n=>n.type==='WalletCanvas').props.onCanvasPress({col:8,row:0});tree=x.render();
  nodes(tree).find(n=>n.type==='Pressable'&&n.props.accessibilityLabel==='Save').props.onPress();assert.equal(x.saved(),0);
  await new Promise(r=>setImmediate(r));assert.equal(x.saved(),1);assert.equal((await x.e.repo.load()).document.canvas.decorations.items.length,1);
});
test('Home decoration rendering is static, zero-inset and pointerEvents none; editor/context tools are absent',()=>{
  const h=nativeHarness('src/components/bemem/WalletCanvas.tsx','WalletCanvas',{3:336,4:400});
  const view=walletCanvasPresentation(decorated());const tree=h.render({...view,allCards:view.cards,editing:false,disabled:false,onMove(){assert.fail();},onOpen(){},onDragging(){}});
  const wrapper=nodes(tree).find(n=>n.props?.children?.type==='DecorationImage');assert.ok(wrapper);assert.equal(wrapper.props.pointerEvents,'none');
  assert.equal(nodes(tree).some(n=>n.type==='GlassButton'),false);assert.equal(nodes(tree).some(n=>n.props?.decorating),false);
});
test('Real drawer responder waits350ms, follows screen coordinates and emits one completed drop',()=>{
  const h=nativeHarness('src/components/bemem/DecorateMode.tsx','__DrawerAsset'),events=[];
  const props={assetId:'pet-cat',unit:28,disabled:false,selected:false,...Object.fromEntries(['onSelect','onDrag','onDrop','onEnd'].map(n=>[n,(...args)=>events.push([n,...args])]))};
  const tile=h.render(props),g={x0:30,y0:600,moveX:30,moveY:600,dx:0,dy:0,numberActiveTouches:1};
  assert.equal(tile.props.style[0].width,48);assert.equal(tile.props.children.props.style.width,28);
  tile.props.onPanResponderGrant(null,g);h.advance(349);assert.equal(events.length,0);h.advance(1);assert.equal(events[0][0],'onDrag');
  assert.equal(tile.props.onPanResponderTerminationRequest(),false);
  for(let i=1;i<=12;i++)tile.props.onPanResponderMove(null,{...g,moveX:250,moveY:600-i*20,dx:220,dy:-i*20});
  tile.props.onPanResponderRelease(null,{...g,moveX:250,moveY:360,dx:220,dy:-240});
  assert.equal(events.filter(e=>e[0]==='onDrop').length,1);assert.equal(events.filter(e=>e[0]==='onSelect').length,0);
  assert.deepEqual(events.find(e=>e[0]==='onDrop').slice(1),['pet-cat',{x:250,y:360}]);
});
test('Fast drawer scroll cancels pickup before hold; quick tap selects without a drop; termination never adds',()=>{
  for(const scenario of ['scroll','tap','terminate']){
    const h=nativeHarness('src/components/bemem/DecorateMode.tsx','__DrawerAsset'),events=[];
    const tile=h.render({assetId:'pet-cat',unit:28,disabled:false,selected:false,...Object.fromEntries(['onSelect','onDrag','onDrop','onEnd'].map(n=>[n,(...args)=>events.push([n,...args])]))});
    const g={x0:30,y0:600,moveX:30,moveY:600,dx:0,dy:0,numberActiveTouches:1};tile.props.onPanResponderGrant(null,g);
    if(scenario==='scroll'){tile.props.onPanResponderMove(null,{...g,moveY:580,dy:-20});h.advance(350);assert.equal(tile.props.onPanResponderTerminationRequest(),true);tile.props.onPanResponderRelease(null,{...g,moveY:580,dy:-20});}
    else if(scenario==='tap')tile.props.onPanResponderRelease(null,g);
    else{h.advance(350);tile.props.onPanResponderTerminate();}
    assert.equal(events.filter(e=>e[0]==='onDrop').length,0);assert.equal(events.filter(e=>e[0]==='onSelect').length,scenario==='tap'?1:0);
  }
});
test('Drawer keeps8x3 slots without any scroll; 50 assets use3 pages and switching resets to page1',async()=>{
 const x=await editorHarness();let tree=x.render();
 const grid=()=>nodes(tree).find(n=>n.props?.accessibilityLabel==='Decoration grid. Eight columns, three rows.');
 assert.equal(grid().props.children.length,3);assert.ok(grid().props.children.every(row=>row.props.children.length===8));
 assert.equal(nodes(grid()).filter(n=>typeof n.type==='function').length,23);
 assert.equal(nodes(tree).filter(n=>n.type==='ScrollView').length,0);
 const next=nodes(grid()).find(n=>n.props?.accessibilityLabel==='Next page');assert.ok(next);assert.equal(next.props.onPanResponderGrant,undefined);assert.equal(next.props.assetId,undefined);
 next.props.onPress();tree=x.render();assert.equal(nodes(grid()).filter(n=>typeof n.type==='function').length,22);
 assert.ok(nodes(grid()).find(n=>n.props?.accessibilityLabel==='Previous page'));
 nodes(grid()).find(n=>n.props?.accessibilityLabel==='Next page').props.onPress();tree=x.render();
 assert.equal(nodes(grid()).filter(n=>typeof n.type==='function').length,5);
 assert.equal(nodes(grid()).some(n=>n.props?.accessibilityLabel==='Next page'),false);
 const slots=grid().props.children.flatMap(r=>r.props.children);assert.ok(slots.slice(6).every(n=>n.type==='View'&&n.props.pointerEvents==='none'&&!n.props.onPress));
 const cafe=nodes(tree).find(n=>n.type==='Pressable'&&n.props.accessibilityLabel==='Café Day');cafe.props.onPress();tree=x.render();
 assert.equal(nodes(grid()).filter(n=>typeof n.type==='function').length,23);assert.equal(nodes(grid()).some(n=>n.props?.accessibilityLabel==='Previous page'),false);
 assert.equal(x.e.events.length,0);
});
test('Page2 assets drag through the existing placement command; stale page/collection callbacks cannot interrupt a held drag',async()=>{
 const x=await editorHarness();let tree=x.render();nodes(tree).find(n=>n.props?.accessibilityLabel==='Next page').props.onPress();tree=x.render();
 nodes(tree).find(n=>n.type==='WalletCanvas').props.onGeometry({pageX:16,pageY:100,width:336,height:280,unit:28,scrollY:0});tree=x.render();
 const asset=nodes(tree).find(n=>typeof n.type==='function'),previous=nodes(tree).find(n=>n.props?.accessibilityLabel==='Previous page');
 const cafe=nodes(tree).find(n=>n.type==='Pressable'&&n.props.accessibilityLabel==='Café Day');
 asset.props.onDrag(asset.props.assetId,{x:254,y:114});previous.props.onPress();cafe.props.onPress();tree=x.render();
 assert.ok(nodes(tree).find(n=>n.props?.accessibilityLabel==='Previous page'));assert.equal(nodes(tree).find(n=>typeof n.type==='function').props.assetId,asset.props.assetId);
 asset.props.onDrop(asset.props.assetId,{x:254,y:114});asset.props.onEnd();tree=x.render();
 const deco=nodes(tree).find(n=>n.type==='WalletCanvas').props.cards.find(c=>c.kind==='decoration');assert.equal(deco.decoration.assetId,asset.props.assetId);
 assert.equal(x.e.events.length,0);
});
test('Alpha-aware20% paint changes no geometry, conserves every existing PNG, and leaves connector frames at1x',()=>{
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'artwork-trials/cozy-cute-240-2026-11-11/review/manifest.json')));
 const scales=load('src/constants/decoration-paint.ts').decorationPaint;
 assert.equal(manifest.assets.length,240);assert.equal(Object.keys(scales).length,270);
 for(const a of manifest.assets){const s=scales[a.id],b=a.alphaBounds;assert.ok(s>=1&&s<=1.2);
   assert.ok(Math.max(96-b[0],96-b[1],b[2]-96,b[3]-96)*s<=96+1e-8,a.id);
   if(a.category==='frame')assert.equal(s,1);
 }
 const h=nativeHarness('src/components/bemem/DecorationImage.tsx','DecorationImage');
 for(const id of ['pet-cat','vine-corner'])for(const rotation of [0,90,180,270]){
  const view=h.render({assetId:id,rotation});assert.equal(view.props.pointerEvents,'none');assert.equal(view.props.style.overflow,'hidden');
  assert.deepEqual(view.props.children.props.style.transform,[{rotate:`${rotation}deg`},{scale:scales[id]}]);
 }
});
test('Canvas decorations have square paint roots for frame seams while membership cards retain14dp corners',()=>{
 for(const kind of ['decoration','membership']){
  const h=nativeHarness('src/components/bemem/WalletCanvas.tsx','__DraggableCard');
  const card={id:'synthetic',kind,name:'Synthetic',orientation:'landscape',colors:['#ffffff','#ffffff'],...(kind==='decoration'?{decoration:{assetId:'pet-cat',rotation:0}}:{})};
  const p={col:0,row:0},tree=h.render({card,position:p,unit:28,layout:{synthetic:p},allCards:[card],maxRows:240,decorating:true,onMove(){},onOpen(){},onDragging(){}});
  assert.equal(Object.assign({},...tree.props.style).borderRadius,kind==='decoration'?0:14);
 }
});

test('Six artwork-only transparent collection controls share one row and expose selected/disabled accessibility state',async()=>{
 const x=await editorHarness();let tree=x.render();
 const row=nodes(tree).find(n=>n.props?.accessibilityLabel==='Artwork collections');
 assert.equal(row.props.style.flexDirection,'row');assert.equal(row.props.children.length,6);
 const buttons=nodes(row).filter(n=>n.type==='Pressable');assert.equal(buttons.length,6);
 assert.equal(nodes(row).some(n=>n.type==='Text'||n.type==='GlassButton'||n.type==='ScrollView'),false);
 for(let i=0;i<6;i++){
  const b=buttons[i],style=Object.assign({},...b.props.style);
  assert.equal(b.props.accessibilityLabel,DECORATION_COLLECTIONS[i].name);
  assert.equal(b.props.accessibilityRole,'button');assert.equal(b.props.accessibilityState.selected,i===0);
  assert.equal(style.opacity,i===0?1:.48);assert.equal(style.aspectRatio,1);assert.equal(style.flex,1);
  for(const key of ['backgroundColor','borderWidth','borderRadius','boxShadow'])assert.equal(style[key],undefined);
  assert.equal(b.props.onPanResponderGrant,undefined);assert.equal(b.props.assetId,undefined);
 }
 buttons[4].props.onPress();tree=x.render();
 const changed=nodes(nodes(tree).find(n=>n.props?.accessibilityLabel==='Artwork collections')).filter(n=>n.type==='Pressable');assert.equal(changed.filter(n=>n.props.accessibilityState.selected).length,1);
 assert.equal(changed[4].props.style[1].opacity,1);assert.equal(changed[0].props.style[1].opacity,.48);
 assert.equal(x.e.events.length,0);
});

test('Collection artwork fits six equal squares at narrow, Samsung and tablet widths, independent of text scaling',async()=>{
 for(const width of [320,360,390,600])for(const fontScale of [1,2]){
  const e=await environment(),h=nativeHarness('src/components/bemem/DecorateMode.tsx','EditableDecorateMode',{}, {width,height:844,fontScale});
  const tree=h.render({wallet:{runtime:e.owner,snapshot:e.owner.getSnapshot()},onClose(){},onSaved(){}});
  const controls=nodes(nodes(tree).find(n=>n.props?.accessibilityLabel==='Artwork collections')).filter(n=>n.type==='Pressable');assert.equal(controls.length,6);
  const square=(Math.min(width,600)-2-16)/6;assert.ok(square>=48);
  for(const b of controls){const visual=b.props.children.props.style;
   assert.ok(visual.width<=square-4);assert.equal(visual.width,visual.height);
   assert.equal(b.props.children.props.pointerEvents,'none');
  }
 }
});

test('New30 frame IDs use the existing placement, collision, rotation, undo/redo and verified Save/readback flow',async()=>{
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'artwork-trials/cozy-cute-270-2026-11-11/review/manifest.json')));
 const e=await environment(),s=e.newSession();assert.equal(manifest.assets.length,30);
 for(let i=0;i<30;i++){
  const a=manifest.assets[i];assert.equal(load('src/constants/decoration-paint.ts').decorationPaint[a.id],1);
  const position={col:i%12,row:10+Math.floor(i/12)};
  assert.equal(s.apply({type:'add',assetId:a.id,position}).ok,true);
  const item=s.snapshot().document.canvas.decorations.items.at(-1);
  assert.equal(s.apply({type:'add',assetId:a.id,position}).ok,false);
  assert.equal(s.apply({type:'rotate',id:item.id}).ok,true);
 }
 const item=s.snapshot().document.canvas.decorations.items.at(-1);
 assert.equal(s.apply({type:'move',id:item.id,position:{col:11,row:20}}).ok,true);
 assert.equal(s.apply({type:'delete',id:item.id}).ok,true);assert.equal(s.undo().ok,true);
 assert.equal(s.redo().ok,true);assert.equal(s.undo().ok,true);
 assert.equal(e.events.length,0);assert.equal((await s.save()).ok,true);
 const read=await e.repo.load();assert.equal(read.document.canvas.decorations.items.length,30);
 assert.deepEqual(read.document.cards,[card()]);assert.deepEqual(read.document.canvas.layout,{'synthetic-member':{col:0,row:0}});
 assert.equal(read.document.canvas.decorations.items.at(-1).assetId,item.assetId);
});

const flatStyle = style => Object.assign({}, ...(Array.isArray(style) ? style.flat(Infinity) : [style]).filter(Boolean));
const actionButtons = tree => {const header=nodes(tree).find(n=>n.type==='EightSlotHeader');return [4,5,6,7].map(slot=>header.props.slots[slot]);};

test('Decorate has one frameless command set in slots4-7 and selector8; no bottom actions or extra mode-title row',async()=>{
 for(const width of [288,320,360,393,412,600])for(const fontScale of [1,2]){
  const x=await editorHarness({width,height:844,fontScale}),tree=x.render();
  const header=nodes(tree).find(n=>n.type==='EightSlotHeader');assert.equal(header.props.mode,'Decorate');
  assert.equal(nodes(tree).some(n=>n.props?.children==='Cozy Cute'||n.props?.children==='Decorate'),false);
  assert.equal(header.props.slots[8].type,'CanvasPageSelector');
  const buttons=actionButtons(tree);assert.deepEqual(buttons.map(n=>n.props.accessibilityLabel),['Back','Undo','Redo','Save']);
  const drawer=nodes(tree).find(n=>n.props?.accessibilityLabel==='Decoration drawer');assert.equal(nodes(drawer).some(n=>['Back','Undo','Redo','Save'].includes(n.props?.accessibilityLabel)),false);
  for(const b of buttons){const s=flatStyle(b.props.style);assert.equal(b.type,'Pressable');assert.equal(s.width,'100%');assert.equal(s.maxWidth,48);assert.equal(s.height,48);assert.equal(s.borderWidth,undefined);
   assert.notEqual(b.props.children.type,'View');assert.equal(s.backgroundColor,undefined);assert.equal(s.borderRadius,undefined);
   assert.equal(nodes(b).some(n=>n.type==='Text'),false);
  }
  assert.deepEqual(buttons.map(b=>b.props.children.props.name),['chevron-left','undo','redo','check']);
  assert.deepEqual(buttons.map(b=>b.props.children.props.color),['#b42318','#203138','#203138','#26734d']);
 }
});

test('Frameless Undo/Redo preserve disabled states, draft history and clearing Redo after a new action',async()=>{
 const x=await editorHarness();let tree=x.render(),buttons=actionButtons(tree);
 assert.equal(buttons[1].props.disabled,true);assert.equal(buttons[2].props.disabled,true);
 const add=()=>{nodes(tree).find(n=>typeof n.type==='function').props.onSelect('pet-cat');tree=x.render();
  nodes(tree).find(n=>n.type==='WalletCanvas').props.onCanvasPress({col:8,row:0});tree=x.render();};
 add();buttons=actionButtons(tree);assert.equal(buttons[1].props.disabled,false);
 buttons[1].props.onPress();tree=x.render();buttons=actionButtons(tree);
 assert.equal(buttons[1].props.disabled,true);assert.equal(buttons[2].props.disabled,false);
 add();assert.equal(actionButtons(tree)[2].props.disabled,true);assert.equal(x.e.events.length,0);
});

test('Red Back preserves clean exit, dirty confirmation and no implicit Save',async()=>{
 const clean=await editorHarness();actionButtons(clean.render())[0].props.onPress();assert.equal(clean.closed(),1);assert.equal(clean.e.events.length,0);
 const x=await editorHarness();let tree=x.render();nodes(tree).find(n=>typeof n.type==='function').props.onSelect('pet-cat');tree=x.render();
 nodes(tree).find(n=>n.type==='WalletCanvas').props.onCanvasPress({col:8,row:0});tree=x.render();actionButtons(tree)[0].props.onPress();
 assert.equal(x.closed(),0);assert.equal(nodes(x.render()).find(n=>n.type==='ConfirmationDialog').props.request.actions[0].role,'primary');assert.equal(x.e.events.length,0);
 nodes(x.render()).find(n=>n.type==='ConfirmationDialog').props.request.actions[1].onPress();assert.equal(x.closed(),1);assert.equal(x.e.events.length,0);
});

test('Frameless Save remains busy and locks actions until readback; duplicate callback cannot add a second transaction',async()=>{
 const x=await editorHarness();let tree=x.render();nodes(tree).find(n=>typeof n.type==='function').props.onSelect('pet-cat');tree=x.render();
 nodes(tree).find(n=>n.type==='WalletCanvas').props.onCanvasPress({col:8,row:0});tree=x.render();
 let resume;x.e.pause(new Promise(resolve=>{resume=resolve;}));const save=actionButtons(tree)[3];save.props.onPress();
 tree=x.render();assert.equal(x.saved(),0);const buttons=actionButtons(tree);
 assert.ok(buttons.every(b=>b.props.disabled));assert.equal(buttons[3].props.accessibilityState.busy,true);assert.equal(buttons[3].props.children.type,'ActivityIndicator');
 assert.equal(buttons[3].props.accessibilityLabel,'Save');assert.equal(buttons[3].props.accessibilityHint,'Saving decorations');
 save.props.onPress();await new Promise(r=>setImmediate(r));assert.equal(x.e.events.filter(e=>e[0]==='write').length,1);
 resume();await new Promise(r=>setImmediate(r));assert.equal(x.saved(),1);
 assert.equal((await x.e.repo.load()).document.canvas.decorations.items.length,1);
});

test('Save failure keeps Decorate open with existing error feedback and unchanged committed snapshot',async()=>{
 const x=await editorHarness();let tree=x.render();nodes(tree).find(n=>typeof n.type==='function').props.onSelect('pet-cat');tree=x.render();
 nodes(tree).find(n=>n.type==='WalletCanvas').props.onCanvasPress({col:8,row:0});tree=x.render();
 const before=clone(x.e.owner.getSnapshot().session.saved);x.e.failWrite();actionButtons(tree)[3].props.onPress();
 await new Promise(r=>setImmediate(r));tree=x.render();assert.equal(x.saved(),0);assert.equal(x.closed(),0);
 assert.ok(nodes(tree).some(n=>n.props?.accessibilityRole==='alert'));assert.deepEqual(x.e.owner.getSnapshot().session.saved,before);
});

test('Pagination paints smaller light circles inside full unchanged nonoverlapping, non-draggable cells',async()=>{
 for(const width of [288,320,390,600]){
  const x=await editorHarness({width,height:844,fontScale:2});let tree=x.render();
  const grid=()=>nodes(tree).find(n=>n.props?.accessibilityLabel==='Decoration grid. Eight columns, three rows.');
  const geometry=load('src/lib/decoration-pagination.ts').decorationPickerGeometry(Math.min(width,600)-2);
  for(let page=0;page<3;page++){
   const slots=grid().props.children.flatMap(row=>row.props.children);assert.equal(slots.length,24);
   const navigation=nodes(grid()).filter(n=>n.type==='Pressable');assert.ok(navigation.length>=1);
   for(const b of navigation){const target=flatStyle(b.props.style({pressed:false})),circle=flatStyle(b.props.children.props.style);
    assert.equal(target.width,geometry.cell);assert.equal(target.height,geometry.rowHeight);
    assert.equal(b.props.accessibilityRole,'button');assert.equal(b.props.accessibilityState.disabled,false);
    assert.equal(b.props.onPanResponderGrant,undefined);assert.equal(b.props.assetId,undefined);assert.equal(b.props.hitSlop,undefined);
    assert.equal(circle.width,circle.height);assert.ok(circle.borderRadius>=circle.width/2);
    assert.ok(circle.width<target.width&&circle.height<target.height);assert.equal(circle.borderWidth,1);assert.equal(circle.borderColor,'#d5dce0');
    assert.equal(circle.boxShadow,undefined);assert.equal(b.props.children.props.pointerEvents,'none');
    assert.equal(nodes(b).some(n=>n.type==='Text'),false);
   }
   assert.equal(nodes(tree).some(n=>n.type==='ScrollView'),false);
   assert.equal(slots[0].props.accessibilityLabel,page>0?'Previous page':undefined);
   assert.equal(slots[23].props.accessibilityLabel,page<2?'Next page':undefined);
   if(page<2){slots[23].props.onPress();tree=x.render();}
  }
  assert.equal(x.e.events.length,0);
 }
});


test('Inline Decorate Keep/Back preserve session Undo history and leave the outer Modal and Status Bar flags unchanged',async()=>{
 const x=await editorHarness();let tree=x.render();nodes(tree).find(n=>typeof n.type==='function').props.onSelect('pet-cat');tree=x.render();nodes(tree).find(n=>n.type==='WalletCanvas').props.onCanvasPress({col:8,row:0});tree=x.render();const before=clone(x.e.owner.getSnapshot().session.draft);
 actionButtons(tree)[0].props.onPress();tree=x.render();const dialog=nodes(tree).find(n=>n.type==='ConfirmationDialog').props;assert.equal(dialog.presentation,'inline');assert.deepEqual(dialog.request.actions.map(a=>a.label),['Keep Decorating','Discard Changes']);assert.equal(nodes(tree).filter(n=>n.type==='Modal').length,1);assert.equal(tree.props.statusBarTranslucent,true);assert.equal(tree.props.navigationBarTranslucent,true);
 dialog.request.actions[0].onPress();tree=x.render();assert.equal(x.closed(),0);assert.deepEqual(x.e.owner.getSnapshot().session.draft,before);assert.equal(actionButtons(tree)[1].props.disabled,false);actionButtons(tree)[0].props.onPress();tree=x.render();tree.props.onRequestClose();tree=x.render();assert.equal(nodes(tree).find(n=>n.type==='ConfirmationDialog').props.request,null);assert.deepEqual(x.e.owner.getSnapshot().session.draft,before);assert.equal(x.e.events.length,0);
});
