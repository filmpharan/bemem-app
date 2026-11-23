// Actual device composition + hook + Home bindings against a synthetic FileSystem.
// No device, production path, native module or member data is accessed by this test process.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), ts = require('typescript');
const root = path.resolve(__dirname, '..');
const tokens = require('../design-system/bemem-lagoon-glass-rc2/TOKENS.json');
function environment(approved = false, populated = true, editorUI = false) {
  const release = { PRODUCTION_WALLET_V2_APPROVED: approved };
  const data = new Map(), dirs = new Set(['documents']), events = [], cache = new Map();
  const slots = []; let cursor = 0, uuid = 0, runtime, back = null, failRead = null, failWrite = null;
  let backupReadGate = null, afterBackup = null, activationFailure = false;
  const cleanups = [];
  const alerts = [];let keyboardVisible=false,keyboardY=500;const keyboardListeners=new Map();
  function setKeyboardVisible(visible,top=500){keyboardVisible=visible;keyboardY=top;for(const fn of keyboardListeners.get(visible?'keyboardDidShow':'keyboardDidHide')??[])fn({endCoordinates:{screenY:top}});}
  const react = {
    useState(initial) { const index = cursor++; if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial;
      return [slots[index], next => { slots[index] = typeof next === 'function' ? next(slots[index]) : next; }]; },
    useRef(initial) { const index = cursor++; slots[index] ??= { current: initial }; return slots[index]; },
    useImperativeHandle(ref,fn){if(ref)ref.current=fn();},useEffect(fn) { const cleanup = fn(); if (cleanup) cleanups.push(cleanup); }, useMemo: fn => fn(), useCallback: fn => fn,
  };
  function operation(uri, kind) {
    assert.ok(uri === 'documents' || /^documents\/(bemem-phase1-canvas|bemem-wallet-v2|bemem-pre-cutover-backup|bemem-card-artwork)(\/|$)/.test(uri), 'Unexpected fixture path');
    events.push([kind, uri]);
  }
  class Directory {
    constructor(parent, name) { this.uri = name ? parent.uri + '/' + name : parent; this.name = this.uri.split('/').at(-1); }
    create() { operation(this.uri, 'mkdir'); dirs.add(this.uri); }
    list() {
      operation(this.uri, 'list'); if (!dirs.has(this.uri)) throw Error('missing directory');
      return [...[...dirs].filter(uri => path.posix.dirname(uri) === this.uri).map(uri => new Directory(this, path.posix.basename(uri))),
        ...[...data.keys()].filter(uri => path.posix.dirname(uri) === this.uri).map(uri => new File(this, path.posix.basename(uri)))];
    }
  }
  class File {
    constructor(parent, name) { this.uri = typeof parent === 'string' ? parent : name ? parent.uri + '/' + name : parent.uri; this.name = this.uri.split('/').at(-1); }
    info() { operation(this.uri,'info'); const text=data.get(this.uri);
      if(text==='synthetic-cached-default'){const known=load('src/constants/default-card-artwork.ts').DEFAULT_CARD_ARTWORK[this.name];assert.ok(known);return {exists:true,size:known.byteLength,md5:known.md5};}
      return {exists:text!==undefined,size:text===undefined?null:Buffer.byteLength(text),md5:text===undefined?null:require('node:crypto').createHash('md5').update(text).digest('hex')}; }
    create(options = {}) { operation(this.uri, 'create'); if (data.has(this.uri) && !options.overwrite) throw Error('exists'); data.set(this.uri, ''); }
    async write(text) { operation(this.uri, 'write'); if (failWrite && this.uri.includes(failWrite)) { failWrite = null; throw Error('synthetic write failure'); } data.set(this.uri, text);
      if (afterBackup && this.uri.startsWith('documents/bemem-pre-cutover-backup/')) await afterBackup(); }
    async text() { operation(this.uri, 'read'); if (failRead && this.uri.includes(failRead) && this.uri.endsWith('.json')) { failRead = null; throw Error('synthetic read failure'); }
      if (backupReadGate && this.uri.startsWith('documents/bemem-pre-cutover-backup/')) { const gate = backupReadGate; backupReadGate = null; await gate.promise; }
      if (!data.has(this.uri)) throw Error('missing file'); return data.get(this.uri); }
    async move(destination, options) { operation(this.uri, 'move'); operation(destination.uri, 'destination'); assert.equal(options.overwrite, false);
      if (data.has(destination.uri)) throw Error('exists'); data.set(destination.uri, data.get(this.uri)); data.delete(this.uri); }
  }
  const native = { StyleSheet: { create: value => value, absoluteFill: {} }, Keyboard: { dismiss(){setKeyboardVisible(false);},isVisible:()=>keyboardVisible,metrics:()=>keyboardVisible?{screenY:keyboardY}:undefined,addListener(name,fn){if(!keyboardListeners.has(name))keyboardListeners.set(name,new Set());keyboardListeners.get(name).add(fn);return{remove(){keyboardListeners.get(name).delete(fn);}};} }, TextInput: 'TextInput',
    Alert: { alert: (...args) => alerts.push(args) },
    BackHandler: { addEventListener: (_name, callback) => { back = callback; return { remove() {} }; } },
    Platform: { OS: 'android' }, useWindowDimensions: () => ({ width: 390, height: 844, scale: 3, fontScale: 1 }),
    PanResponder: { create: options => ({ panHandlers: options }) },
    ActivityIndicator: 'ActivityIndicator', Modal: 'Modal', Pressable: 'Pressable', ScrollView: 'ScrollView', Text: 'Text', View: 'View' };
  const jsx = (type, props) => ({ type, props });
  function load(relative) {
    let file = path.resolve(root, relative);
    if (!/\.(tsx?|json)$/.test(file)) file += fs.existsSync(file + '.ts') ? '.ts' : '.tsx';
    if (cache.has(file)) return cache.get(file).exports;
    if (file.endsWith('.json')) return JSON.parse(fs.readFileSync(file, 'utf8'));
    const module = { exports: {} }; cache.set(file, module);
    const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
    vm.runInThisContext(`(function(require,module,exports){${code}\n})`, { filename: file })(name => {
      if (name === 'react') return react;
      if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
      // Existing UI regressions model already-cached defaults; first-use asset IO has dedicated tests.
      if(name.endsWith('/default-card-artwork-native'))return {
        defaultCardArtworksReady(session){dirs.add('documents/bemem-card-artwork');for(const image of [session.front,session.back])data.set('documents/bemem-card-artwork/'+image.assetId,'synthetic-cached-default');return true;},
        defaultCardArtworkSources:()=>({}),prepareDefaultCardArtworks:async()=>{},
      };
      // Existing Wallet regressions isolate the new History policy; its real adapter and recovery are covered in test-card-history.cjs.
      if (name === './card-history-delete-native') return { createDeviceHistoryDeletion: () => ({ policy: undefined }) };
      if (name === 'expo-file-system') return { Directory, File, Paths: { document: new Directory('documents') } };
      if (name === 'expo') return { Platform: { OS: 'android' }, uuid: { v4: () => `synthetic-${++uuid}` } };
      if (name === 'react-native') return native;
      if (name === 'react-native-safe-area-context') return { SafeAreaView: 'SafeAreaView' };
      if (name.endsWith('/wallet-release')) return release;
      if (name.endsWith('/WalletRuntimeProvider')) return { useWalletRuntime: () => ({ runtime, snapshot: runtime.getSnapshot() }) };
      if (name === './wallet-cutover-runtime' && file.endsWith('wallet-device-runtime.ts')) {
        const real = load('src/lib/wallet-cutover-runtime.ts');
        return { createPreparedWalletRuntime: ports => real.createPreparedWalletRuntime({ ...ports, beforeInstall: async session => {
          if (ports.beforeInstall) await ports.beforeInstall(session);
          if (activationFailure && session.source === 'v2') throw Error('Synthetic binding failure');
        } }) };
      }
      if (['./CardFrontBackArtwork', './ConfirmationDialog','./CardAppearancePreview', './AddCardIcon', './GlassButton', './CardCodeView', './AddCardForm', './AddCardSheet', './AddCardText', './ShareCardSheet', './KeepsSheet','./CardHistorySheet', './FullScreenCardView'].includes(name)
        || name === './EditMembershipCardEditor' && !editorUI) { const component = name.slice(2); return { [component]: component }; }
 if(name.endsWith('/ci-theme'))return require('./ci-theme-fixture.cjs');
      if (name === '../../constants/lagoon-theme') return { core: tokens.core, lagoon: tokens.palettes['pearl-gray'].colors, lagoonFonts: { latin: 'BememManrope' } };
      if (name.startsWith('@/components/')) { const component = name.split('/').at(-1); return { [component]: component }; }
      if (name === '@/constants/bemem-theme') return { bemem: { muted: '#555555', background: '#fafafa' } };
      if (name === '@/constants/lagoon-theme') return { lagoon: tokens.palettes['pearl-gray'].colors, lagoonFonts: { latin: 'BememManrope' } };
      if (name.startsWith('@/')) return load('src/' + name.slice(2));
      assert.ok(name.startsWith('.'), `No real native/network import: ${name}`);
      return load(path.resolve(path.dirname(file), name));
    }, module, module.exports);
    return module.exports;
  }
  const { PREVIEW_CARDS, INITIAL_LAYOUT } = load('src/data/wallet-preview.ts');
  if (populated) {
    dirs.add('documents/bemem-phase1-canvas');
    data.set('documents/bemem-phase1-canvas/layout-0000000010.json', JSON.stringify({ schemaVersion: 1, dataset: 'bemem-phase1-demo-v1',
      columns: 12, revision: 10, savedAt: '2026-11-07T00:00:00.000Z', layout: INITIAL_LAYOUT }));
  }
  const factory = () => load('src/lib/wallet-device-runtime.ts').createDeviceWalletRuntime();
  runtime = factory();
  const render = (file = 'src/hooks/use-wallet-canvas.ts', exportName = 'useWalletCanvas', props) => { cursor = 0; return load(file)[exportName](props); };
  return { data, dirs, events, load, runtime, factory, render, cards: PREVIEW_CARDS, alerts,
    setReleaseApproval: value => { release.PRODUCTION_WALLET_V2_APPROVED = value; },
    releaseApproval: () => release.PRODUCTION_WALLET_V2_APPROVED,
    setKeyboardVisible,setRuntime: next => { runtime = next; }, unmount: () => cleanups.forEach(fn => fn()), back: () => back,
    resetNavigation: () => { slots.length = 0; },
    shareModule: (relative, exports) => { cache.set(path.resolve(root, relative), { exports }); },
    holdBackupRead: gate => { backupReadGate = gate; }, afterBackup: fn => { afterBackup = fn; }, failActivation: value => { activationFailure = value; },
    failRead: name => { failRead = name; }, failWrite: name => { failWrite = name; } };
}
const writes = e => e.events.filter(([kind]) => ['mkdir', 'create', 'write', 'move', 'destination'].includes(kind));

test('Full View Home binding uses the existing clean/dirty Create exit protection without changing saved data',async()=>{
 for(const dirty of [false,true]){
  const {e,id}=await savedMember(),view=environment(true,true,true);view.setRuntime(e.runtime);let tree=view.render('src/app/index.tsx','default');
  nodes(tree).find(n=>n.type==='ContextualFooter').props.onCreate();tree=view.render('src/app/index.tsx','default');
  if(dirty){nodes(tree).find(n=>n.type==='WalletCanvas').props.onMove(id,{col:0,row:100});tree=view.render('src/app/index.tsx','default');}
  const before=JSON.stringify(e.runtime.getSnapshot().session.saved),count=writes(e).length;
  nodes(tree).find(n=>n.type==='CardPreview').props.onHome();tree=view.render('src/app/index.tsx','default');
  assert.equal(nodes(tree).find(n=>n.type==='WalletCanvas').props.editing,dirty);
  assert.equal(nodes(tree).find(n=>n.type==='UnsavedChangesDialog').props.visible,dirty);
  assert.equal(JSON.stringify(e.runtime.getSnapshot().session.saved),before);assert.equal(writes(e).length,count);
 }
});

function addDiscardFixture(){
 const view=environment(true,false,true),cancelled=[],added=[];let closed=0,submissions=0;
 const commands={begin:()=> 'synthetic-add-token',cancel:token=>cancelled.push(token),add(){submissions++;return{ok:true};}};
 const props={commands,background:null,onClose(){closed++;},onAdded(){added.push('added');},disabled:false,v2Active:true};
 const render=()=>view.render('src/components/bemem/AddCardEditor.tsx','AddCardEditor',props);
 function dirty(){const form=sharedForm(render());form.onChange({...form.values,name:'Synthetic unsaved card',memberNumber:' 00123 Ab ',payload:' 00123 Ab ',orientation:'portrait'});
  form.onPresentationChange({...form.presentation,expiryMonth:'2030-06-15',sizePresetId:'card-portrait',side:'back',artwork:{front:{uri:'memory-only-front'},back:{uri:'memory-only-back'}}});return render();}
 return{view,render,dirty,cancelled,added,get closed(){return closed;},get submissions(){return submissions;}};
}
const sheetConfirmationRequest=t=>{assert.ok(t.props.confirmation);assert.equal(t.props.confirmation.content.props.presentation,'inline');return t.props.confirmation.content.props.request;};

test('Dirty Add Cancel and sheet Close open the approved inline safe-primary/destructive confirmation without native Alert',()=>{
 for(const via of ['cancel','sheet']){const h=addDiscardFixture();let t=h.dirty();
  if(via==='cancel')control(t,'Cancel adding card').props.onPress();else t.props.onClose();
  const r=sheetConfirmationRequest(h.render());assert.equal(r.title,'Discard changes?');assert.equal(r.description,'Your unsaved card changes will be discarded.');
  assert.deepEqual(r.actions.map(a=>[a.label,a.role]),[['Keep Editing','primary'],['Discard Changes','destructive']]);
  assert.equal(h.view.alerts.length,0);assert.equal(h.closed,0);assert.deepEqual(h.cancelled,[]);
 }
});
test('Clean Add exit keeps the original cancel-token and close callback without a confirmation',()=>{
 const h=addDiscardFixture();h.render().props.onClose();assert.equal(h.closed,1);assert.deepEqual(h.cancelled,['synthetic-add-token']);assert.equal(h.render().props.confirmation,undefined);assert.equal(h.submissions,0);
});
test('Add Keep Editing retains Name Number EXP size orientation and both image selections without submitting',()=>{
 const h=addDiscardFixture(),before=sharedForm(h.dirty());h.render().props.onClose();sheetConfirmationRequest(h.render()).actions[0].onPress();
 const after=sharedForm(h.render());assert.deepEqual(after.values,before.values);assert.deepEqual(after.presentation,before.presentation);
 assert.equal(h.render().props.confirmation,undefined);assert.equal(h.closed,0);assert.equal(h.submissions,0);assert.deepEqual(h.cancelled,[]);
});
test('Add Discard consumes its existing cancel-token/exit path once and rejects stale confirmation actions',()=>{
 const h=addDiscardFixture();h.dirty();h.render().props.onClose();const old=sheetConfirmationRequest(h.render());old.actions[0].onPress();
 h.render().props.onClose();const current=sheetConfirmationRequest(h.render());assert.notEqual(old.id,current.id);old.actions[1].onPress();old.onDismiss();assert.equal(h.closed,0);
 assert.equal(sheetConfirmationRequest(h.render()).id,current.id);current.actions[1].onPress();current.actions[1].onPress();current.onDismiss();
 assert.equal(h.closed,1);assert.deepEqual(h.cancelled,['synthetic-add-token']);assert.equal(h.submissions,0);assert.equal(h.render().props.confirmation,undefined);
});
test('Add confirmation Android Back and backdrop dismissal both act only as Keep Editing',()=>{
 for(const via of ['back','backdrop']){const h=addDiscardFixture(),before=sharedForm(h.dirty());h.render().props.onClose();const t=h.render(),r=sheetConfirmationRequest(t);
  assert.equal(t.props.confirmation.onRequestClose,r.onDismiss);if(via==='back')t.props.confirmation.onRequestClose();else r.onDismiss();
  assert.equal(h.closed,0);assert.deepEqual(h.cancelled,[]);assert.deepEqual(sharedForm(h.render()).values,before.values);assert.deepEqual(sharedForm(h.render()).presentation,before.presentation);
 }
});
test('Add close reentry and stale Add CTA cannot submit behind confirmation; image processing still blocks exit',()=>{
 const h=addDiscardFixture();let t=h.dirty();const staleAdd=control(t,'Add Card to Arrange draft').props.onPress;
 sharedForm(t).onImageBusy(true);h.render().props.onClose();assert.equal(h.render().props.confirmation,undefined);
 sharedForm(h.render()).onImageBusy(false);h.render().props.onClose();const r=sheetConfirmationRequest(h.render());h.render().props.onClose();staleAdd();
 assert.equal(sheetConfirmationRequest(h.render()).id,r.id);assert.equal(h.submissions,0);assert.equal(h.closed,0);
 r.actions[0].onPress();control(h.render(),'Add Card to Arrange draft').props.onPress();assert.equal(h.submissions,1);assert.equal(h.added.length,1);
});
test('Add Keep Editing and explicit Discard leave the real mock owner Saved/Canvas draft and storage bytes unchanged',async()=>{
 const {e}=await savedMember(),snapshot=e.runtime.getSnapshot(),draft=JSON.parse(JSON.stringify(snapshot.session.draft));
 const id=draft.cards[0].id;draft.canvas.layout[id]={col:0,row:100};assert.equal(e.runtime.commands.updateDraft(snapshot.state.generation,draft).ok,true);
 assert.notDeepEqual(e.runtime.getSnapshot().session.draft.canvas.layout,e.runtime.getSnapshot().session.saved.canvas.layout);
 const before=JSON.stringify(e.runtime.getSnapshot().session),bytes=[...e.data.entries()],count=writes(e).length,view=environment(true,false,true);let closed=0;
 const props={commands:e.runtime.features,background:null,onClose(){closed++;},onAdded(){assert.fail('No card should be created');},disabled:false,v2Active:true};
 const render=()=>view.render('src/components/bemem/AddCardEditor.tsx','AddCardEditor',props);
 const form=sharedForm(render());form.onChange({...form.values,name:'Unsaved only'});render().props.onClose();sheetConfirmationRequest(render()).actions[0].onPress();
 render().props.onClose();sheetConfirmationRequest(render()).actions[1].onPress();assert.equal(closed,1);
 assert.equal(JSON.stringify(e.runtime.getSnapshot().session),before);assert.deepEqual([...e.data.entries()],bytes);assert.equal(writes(e).length,count);
});

test('Automatic Add appearance stays fixed across rerenders/side changes and an untouched new form cancels without a discard prompt',async()=>{
 const e=environment(true,false,true);await e.runtime.commands.initialize();let closed=0;
 const props={commands:e.runtime.features,background:null,onClose(){closed++;},onAdded(){},disabled:false,v2Active:true};
 const render=()=>e.render('src/components/bemem/AddCardEditor.tsx','AddCardEditor',props);
 let tree=render(),form=sharedForm(tree),color=form.values.colorId,gradient=form.presentation.gradientPresetId;
 form.onPresentationChange({...form.presentation,side:'back'});tree=render();form=sharedForm(tree);assert.equal(form.values.colorId,color);assert.equal(form.presentation.gradientPresetId,gradient);
 control(tree,'Cancel adding card').props.onPress();assert.equal(closed,1);assert.equal(e.alerts.length,0);
});

test('Full expiration dates Add to draft without writes and survive the existing Save/readback/restart',async()=>{
 const e=environment(true,false);await e.runtime.commands.initialize();const form=e.load('src/lib/card-form.ts');
 const values={...form.changeMembershipNumber(form.emptyCardForm(),'00123456'),name:'Synthetic full date'};
 const presentation={...e.load('src/lib/card-presentation.ts').emptyCardPresentation(),expiryMonth:'2028-06-15'};
 const count=writes(e).length,added=e.runtime.features.add(e.runtime.features.begin(),values,presentation);assert.equal(added.ok,true);assert.equal(writes(e).length,count);
 assert.equal(e.runtime.getSnapshot().session.draft.cards[0].expiryMonth,'2028-06-15');assert.equal(e.runtime.getSnapshot().session.saved.cards.length,0);
 assert.equal((await e.runtime.commands.save(e.runtime.getSnapshot().state.generation)).ok,true);
 const fresh=e.factory();await fresh.commands.initialize();assert.equal(fresh.getSnapshot().session.saved.cards[0].expiryMonth,'2028-06-15');
});

test('Unrelated Edit preserves YYYY-MM exactly; confirmed full date/clear round-trip without changing layout or other card fields',async()=>{
 const {e,id}=await savedMember(),initial=JSON.parse(JSON.stringify(e.runtime.getSnapshot().session.saved)),original=initial.cards.find(c=>c.id===id);
 assert.match(original.expiryMonth,/^\d{4}-\d{2}$/);
 const cancelled=e.runtime.features.openEdit(id),bytes=[...e.data.entries()];e.runtime.features.cancelEdit(cancelled.session.token);assert.deepEqual([...e.data.entries()],bytes);
 async function save(patch){const state=e.runtime.getSnapshot(),card=state.session.saved.cards.find(c=>c.id===id),open=e.runtime.features.openEdit(id),form=e.load('src/lib/card-editor-state.ts').membershipEditorState(card);patch(form);
  const result=await e.runtime.features.saveEdit(open.session.token,{name:form.values.name,memberNumber:form.values.memberNumber,expiryMonth:form.presentation.expiryMonth},form);assert.equal(result.ok,true);return e.runtime.getSnapshot().session.saved;}
 let saved=await save(form=>{form.values.name='Renamed only';});assert.equal(saved.cards.find(c=>c.id===id).expiryMonth,original.expiryMonth);
 saved=await save(form=>{form.presentation.expiryMonth='2028-02-29';});let card=saved.cards.find(c=>c.id===id);assert.equal(card.expiryMonth,'2028-02-29');assert.deepEqual(saved.canvas,initial.canvas);
 for(const key of ['id','memberNumber','payload','widthBlocks','heightBlocks','orientation','appearance'])assert.deepEqual(card[key],original[key]);
 const fresh=e.factory();await fresh.commands.initialize();assert.equal(fresh.getSnapshot().session.saved.cards.find(c=>c.id===id).expiryMonth,'2028-02-29');
 const open=e.runtime.features.openEdit(id),form=e.load('src/lib/card-editor-state.ts').membershipEditorState(card);form.presentation.expiryMonth='2027-02-29';const before=writes(e).length;
 const invalid=await e.runtime.features.saveEdit(open.session.token,{name:form.values.name,memberNumber:form.values.memberNumber,expiryMonth:form.presentation.expiryMonth},form);assert.equal(invalid.ok,false);assert.equal(writes(e).length,before);e.runtime.features.cancelEdit(open.session.token);
 saved=await save(form=>{form.presentation.expiryMonth='';});assert.equal(saved.cards.find(c=>c.id===id).expiryMonth,'');assert.equal(saved.cards.length,initial.cards.length);assert.deepEqual(saved.canvas,initial.canvas);
});

test('Scan-style exact text follows existing Add draft -> Save/readback -> Edit Save without early writes or duplicate cards',async()=>{
 for(const text of [' 000001 Ab C ','https://example.test/member?Id=000Ab&case=X','ไทย 000会员']){
  const e=environment(true,false);await e.runtime.commands.initialize();
  const form=e.load('src/lib/card-form.ts'),presentation=e.load('src/lib/card-presentation.ts').emptyCardPresentation();
  const values={...form.changeMembershipNumber(form.emptyCardForm(),text),name:'Synthetic scanned card'};
  const beforeWrites=writes(e).length,token=e.runtime.features.begin(),added=e.runtime.features.add(token,values,presentation);
  assert.equal(added.ok,true);assert.equal(writes(e).length,beforeWrites);assert.equal(e.runtime.getSnapshot().session.saved.cards.length,0);
  assert.equal((await e.runtime.commands.save(e.runtime.getSnapshot().state.generation)).ok,true);
  let snapshot=e.runtime.getSnapshot(),card=snapshot.session.saved.cards[0];assert.equal(card.memberNumber,text);assert.equal(card.payload,text);
  const id=card.id,layout=JSON.parse(JSON.stringify(snapshot.session.saved.canvas));
  const cancel=e.runtime.features.openEdit(id),bytes=[...e.data.entries()];e.runtime.features.cancelEdit(cancel.session.token);assert.deepEqual([...e.data.entries()],bytes);
  const opened=e.runtime.features.openEdit(id),state=e.load('src/lib/card-editor-state.ts').membershipEditorState(card);
  state.values=form.changeMembershipNumber(state.values,' 000Replacement Ab ');
  const saved=await e.runtime.features.saveEdit(opened.session.token,{name:state.values.name,memberNumber:state.values.memberNumber,expiryMonth:state.presentation.expiryMonth},state);
  assert.equal(saved.ok,true);snapshot=e.runtime.getSnapshot();assert.equal(snapshot.session.saved.cards.length,1);
  card=snapshot.session.saved.cards[0];assert.equal(card.id,id);assert.equal(card.memberNumber,' 000Replacement Ab ');assert.equal(card.payload,' 000Replacement Ab ');assert.deepEqual(snapshot.session.saved.canvas,layout);
  const fresh=e.factory();await fresh.commands.initialize();assert.deepEqual(fresh.getSnapshot().session.saved,snapshot.session.saved);
 }
});
test('Decorate entry uses the existing owner; Save reaches Home, Search hides and restores saved decorations', async () => {
  const e=await activeV2();let tree=e.render('src/app/index.tsx','default');
  nodes(tree).find(n=>n.type==='ContextualFooter').props.onDecorate();tree=e.render('src/app/index.tsx','default');
  const editor=nodes(tree).find(n=>n.type==='DecorateMode');assert.ok(editor);
  const session=e.load('src/lib/decorate-session.ts').createDecorateSession(e.runtime),before=e.runtime.getSnapshot().session.saved;
  assert.equal(session.apply({type:'add',assetId:'vine-corner',position:{col:11,row:22}}).ok,true);
  assert.equal(session.apply({type:'move',id:e.cards[0].id,position:{col:0,row:30}}).ok,true);
  assert.equal((await session.save()).ok,true);editor.props.onSaved();tree=e.render('src/app/index.tsx','default');
  let canvas=nodes(tree).find(n=>n.type==='WalletCanvas');assert.equal(canvas.props.editing,false);assert.equal(canvas.props.cards.length,5);
  assert.deepEqual(canvas.props.layout[e.cards[0].id],{col:0,row:30});assert.deepEqual(e.runtime.getSnapshot().session.saved.cards,before.cards);
  nodes(tree).find(n=>n.type==='HomeHeader').props.onSearch();tree=e.render('src/app/index.tsx','default');
  nodes(tree).find(n=>n.type==='SearchField').props.onChange(e.cards[0].name);tree=e.render('src/app/index.tsx','default');
  canvas=nodes(tree).find(n=>n.type==='WalletCanvas');assert.ok(canvas.props.cards.every(c=>c.kind!=='decoration'));
  nodes(tree).find(n=>n.type==='SearchField').props.onChange('');tree=e.render('src/app/index.tsx','default');
  canvas=nodes(tree).find(n=>n.type==='WalletCanvas');assert.equal(canvas.props.cards.length,5);assert.deepEqual(canvas.props.layout[e.cards[0].id],{col:0,row:30});
  const fresh=e.factory();await fresh.commands.initialize();assert.deepEqual(fresh.getSnapshot().session.saved.canvas,e.runtime.getSnapshot().session.saved.canvas);
});
test('Existing Add, Edit, Delete and normal Create moves preserve saved decorations without reflow',async()=>{
  const e=await activeV2(),create=e.load('src/lib/decorate-session.ts').createDecorateSession,session=create(e.runtime);
  assert.equal(session.apply({type:'add',assetId:'pet-cat',position:{col:11,row:22}}).ok,true);assert.equal((await session.save()).ok,true);
  const decorations=e.runtime.getSnapshot().session.saved.canvas.decorations;
  const preset=e.load('src/lib/card-size-presets.ts').CARD_SIZE_PRESETS.find(p=>p.id==='mini-landscape'),args=fields(e,preset),id=e.runtime.features.begin();
  assert.equal(e.runtime.features.add(id,...args).ok,true);await e.runtime.commands.save(e.runtime.getSnapshot().state.generation);
  assert.deepEqual(e.runtime.getSnapshot().session.saved.canvas.decorations,decorations);
  const edit=e.runtime.features.openEdit(id);assert.equal(edit.ok,true);
  assert.equal((await e.runtime.features.saveEdit(edit.session.token,{...edit.session.values,name:'Synthetic revised name'})).ok,true);
  assert.deepEqual(e.runtime.getSnapshot().session.saved.canvas.decorations,decorations);
  let hook=e.render();hook.enter();hook=e.render();hook.move(id,{col:0,row:40});hook=e.render();await hook.save();
  assert.deepEqual(e.runtime.getSnapshot().session.saved.canvas.decorations,decorations);
  const deletion=e.runtime.features.openDelete(id);assert.equal(deletion.ok,true);assert.equal((await e.runtime.features.confirmDelete(deletion.session.token)).ok,true);
  assert.deepEqual(e.runtime.getSnapshot().session.saved.canvas.decorations,decorations);assert.equal(e.runtime.getSnapshot().session.saved.cards.some(c=>c.id===id),false);
});
test('Wallet v1 cannot silently accept a decoration extension or lose it through its legacy writer',async()=>{
  const e=environment(true);await e.runtime.commands.initialize();const state=e.runtime.getSnapshot(),draft=JSON.parse(JSON.stringify(state.session.draft)),before=[...e.data.entries()];
  draft.canvas.decorations={version:1,items:[{id:'synthetic-decoration',assetId:'pet-cat',position:{col:11,row:22},rotation:0}]};
  assert.equal(e.runtime.commands.updateDraft(state.state.generation,draft).ok,false);assert.deepEqual([...e.data.entries()],before);
});
async function activeV2() {
  const e = environment(true); await e.runtime.commands.initialize();
  const review = await e.runtime.reviewMigration();
  assert.equal((await e.runtime.requestCutover(review.generation, review.document)).ok, true); return e;
}

test('Production Home/Create/Decorate/Add work on every selected Canvas without locks, aliases or navigation writes',async()=>{
 const e=await activeV2(),before=JSON.stringify([...e.data]),saved=JSON.stringify(e.runtime.getSnapshot().session.saved);
 let tree=e.render('src/app/index.tsx','default');
 for(const page of [1,2,3,4,5]){
  nodes(tree).find(n=>n.type==='ContextualFooter').props.onPage(page);tree=e.render('src/app/index.tsx','default');
  const footer=()=>nodes(tree).find(n=>n.type==='ContextualFooter');assert.equal(footer().props.page,page);assert.equal(footer().props.destinations.every(p=>p.editable&&p.visible&&p.readable),true);
  const canvases=nodes(tree).filter(n=>n.type==='WalletCanvas');assert.equal(canvases.length,1);if(page!==1)assert.deepEqual(canvases[0].props.cards,[]);
  assert.equal(nodes(tree).some(n=>/LockedCanvas|CanvasLockedState/.test(String(n.type))),false);
  footer().props.onHome();tree=e.render('src/app/index.tsx','default');assert.equal(footer().props.page,page);
  footer().props.onCreate();tree=e.render('src/app/index.tsx','default');assert.equal(footer().props.mode,'Create');assert.equal(footer().props.page,page);
  footer().props.onAdd();tree=e.render('src/app/index.tsx','default');const form=nodes(tree).find(n=>n.type==='AddCardEditor');assert.ok(form);assert.equal(form.props.v2Active,true);form.props.onClose();tree=e.render('src/app/index.tsx','default');
  footer().props.onDecorate();tree=e.render('src/app/index.tsx','default');assert.equal(tree.type,'DecorateMode');assert.equal(tree.props.wallet.page,page);tree.props.onClose();tree=e.render('src/app/index.tsx','default');assert.equal(footer().props.page,page);assert.equal(footer().props.mode,'Home');
 }
 assert.equal(e.alerts.length,0);assert.equal(JSON.stringify([...e.data]),before);assert.equal(JSON.stringify(e.runtime.getSnapshot().session.saved),saved);
});


function fields(e, preset) {
  return [{ ...e.load('src/lib/card-form.ts').emptyCardForm(), name: `Synthetic ${preset.id}`, memberNumber: ' 000Ab c ', payload: ' 000 Code ',
    payloadEdited: true, orientation: preset.orientation }, { ...e.load('src/lib/card-presentation.ts').emptyCardPresentation(), sizePresetId: preset.id, expiryMonth: '2030-12' }];
}
function nodes(tree, output = []) {
  if (!tree || typeof tree !== 'object') return output;
  if (Array.isArray(tree)) { tree.forEach(node => nodes(node, output)); return output; }
  output.push(tree); nodes(tree.props?.children, output); nodes(tree.props?.background, output); nodes(tree.props?.footer, output); nodes(tree.props?.confirmation?.content, output); return output;
}
function confirmation(tree){const n=nodes(tree).find(n=>n.type==='ConfirmationDialog'&&n.props.request);assert.ok(n,'Confirmation is visible');return n.props.request;}
function control(tree, label) {
  const node = nodes(tree).find(item => item.props?.accessibilityLabel === label);
  assert.ok(node, `Missing UI control: ${label}`); return node;
}
function panelHost(e, onClose = () => {}) {
  const view = environment(e.releaseApproval()); view.setRuntime(e.runtime);
  // Distinct component hook state, but the same error-class module identity as the App Root.
  view.shareModule('src/lib/wallet-coordinator.ts', e.load('src/lib/wallet-coordinator.ts'));
  const render = () => view.render('src/components/bemem/WalletMigrationPanel.tsx', 'WalletMigrationPanel', { onClose });
  return { render, press: label => control(render(), label).props.onPress() };
}
async function consent(host) {
  await host.press('Review migration read only');
  control(host.render(), 'Confirm migration consent').props.onPress();
  assert.equal(control(host.render(), 'Confirm migration consent').props.accessibilityState.checked, true);
}
async function until(predicate) {
  for (let i = 0; i < 200; i++) { if (predicate()) return; await Promise.resolve(); }
  assert.fail('Fixture operation did not reach its expected boundary');
}
test('Actual device composition is lazy; unapproved startup keeps existing v1 with no filesystem write', async () => {
  const e = environment(false); assert.equal(e.events.length, 0);
  assert.equal((await e.runtime.commands.initialize()).ok, true); assert.equal(e.runtime.getSnapshot().state.source, 'v1');
  assert.equal(e.runtime.getSnapshot().state.revision, 10); assert.equal(writes(e).length, 0);
});
test('Release gate rejects Backup/Import even with a fresh review and valid consent inputs', async () => {
  const e = environment(false); await e.runtime.commands.initialize(); const review = await e.runtime.reviewMigration(), before = [...e.data.entries()];
  assert.equal((await e.runtime.requestCutover(review.generation, review.document)).code, 'production_cutover_not_approved');
  // Even bypassing the public request wrapper cannot reach the native backup writer.
  assert.equal((await e.runtime.commands.cutover(review.generation, review.document)).code, 'production_cutover_not_approved');
  assert.deepEqual([...e.data.entries()], before); assert.equal(writes(e).length, 0);
  assert.equal(e.dirs.has('documents/bemem-pre-cutover-backup'), false);
});
test('Before activation Add Card validates truthfully and cannot create membership draft or write v1', async () => {
  const e = environment(false); await e.runtime.commands.initialize();
  const preset = e.load('src/lib/card-size-presets.ts').CARD_SIZE_PRESETS.find(p=>p.id==='card-landscape'), [v, p] = fields(e, preset), before = [...e.data.entries()];
  const invalid = e.runtime.features.add(e.runtime.features.begin(), { ...v, memberNumber: '' }, p);
  assert.equal(invalid.ok, false); assert.ok(invalid.errors.memberNumber);
  const result = e.runtime.features.add(e.runtime.features.begin(), v, p); assert.equal(result.ok, false); assert.match(result.message, /waiting for Wallet v2/);
  assert.equal(e.runtime.getSnapshot().session.draft.cards.length, 4); assert.deepEqual([...e.data.entries()], before); assert.equal(writes(e).length, 0);
});
test('Legacy first install boots demos at revision zero without disk writes, then uses original v1 Save', async () => {
  const e = environment(false, false); assert.equal((await e.runtime.commands.initialize()).ok, true);
  assert.equal(e.runtime.getSnapshot().state.source, 'v1'); assert.equal(e.runtime.getSnapshot().state.revision, 0); assert.equal(writes(e).length, 0);
  let hook = e.render(); hook.enter(); hook = e.render(); hook.move(e.cards[0].id, { col: 0, row: 30 }); hook = e.render(); await hook.save(); hook = e.render();
  assert.equal(hook.mode, 'create'); assert.equal(hook.revision, 1); assert.equal(hook.source, 'v1');
  assert.ok([...e.data.keys()].some(key => key.endsWith('layout-0000000001.json')));
  assert.equal(e.dirs.has('documents/bemem-wallet-v2'), false);
});
test('Real hook Create/Save routes v1 layout through sole owner and reload preserves original demo identities', async () => {
  const e = environment(false); await e.runtime.commands.initialize(); const original = [...e.data.entries()];
  let hook = e.render(); assert.equal(hook.mode, 'home'); hook.enter(); hook = e.render();
  hook.move(e.cards[0].id, { col: 0, row: 30 }); hook = e.render(); assert.equal(hook.dirty, true);
  const save = hook.save(); assert.equal(e.runtime.getSnapshot().state.editsAllowed, false); await save; hook = e.render();
  assert.equal(hook.mode, 'create'); assert.equal(hook.revision, 11); assert.equal(hook.saved[e.cards[0].id].row, 30);
  assert.equal(e.data.get(original[0][0]), original[0][1]); assert.equal(e.dirs.has('documents/bemem-wallet-v2'), false);
  const restarted = e.factory(); await restarted.commands.initialize(); assert.equal(restarted.getSnapshot().state.revision, 11);
  assert.ok(restarted.getSnapshot().session.saved.cards.every(card => card.kind === 'demo'));
});
test('Approved isolated native boundary creates verified backup then imports without mutating original v1 bytes', async () => {
  const e = environment(true), original = [...e.data.entries()]; await e.runtime.commands.initialize(); const review = await e.runtime.reviewMigration();
  assert.equal(writes(e).length, 0); assert.equal((await e.runtime.requestCutover(review.generation, review.document)).ok, true);
  assert.equal(e.runtime.getSnapshot().state.source, 'v2'); assert.equal(e.data.get(original[0][0]), original[0][1]);
  const backupKey = [...e.data.keys()].find(key => key.startsWith('documents/bemem-pre-cutover-backup/'));
  assert.ok(backupKey); assert.equal(JSON.parse(e.data.get(backupKey)).source.raw, original[0][1]);
  const before = [...e.data.entries()]; assert.equal((await e.runtime.requestCutover(review.generation, review.document)).ok, false);
  assert.deepEqual([...e.data.entries()], before);
});
test('All nine Add Card sizes reach actual hook Draft, coordinator Save, Home DTO and restarted repository', async () => {
  const e = await activeV2(), presets = e.load('src/lib/card-size-presets.ts').CARD_SIZE_PRESETS;
  let hook = e.render(); hook.enter(); hook = e.render(); const savedBefore = JSON.stringify(e.runtime.getSnapshot().session.saved);
  for (const preset of presets) {
    const [v, p] = fields(e, preset), token = e.runtime.features.begin();
    assert.equal(e.runtime.features.add(token, v, p).ok, true); assert.equal(e.runtime.features.add(token, v, p).ok, false);
  }
  hook = e.render(); assert.equal(hook.cards.length, 13); assert.equal(hook.savedCards.length, 4);
  assert.equal(JSON.stringify(e.runtime.getSnapshot().session.saved), savedBefore); assert.equal(hook.dirty, true);
  await hook.save(); hook = e.render(); assert.equal(hook.mode, 'create'); assert.equal(hook.cards.length, 13); assert.equal(hook.source, 'v2');
  const saved = e.runtime.getSnapshot().session.saved; assert.equal(saved.revision, 11);
  for (const preset of presets) {
    const card = saved.cards.find(card => card.name === `Synthetic ${preset.id}`); assert.equal(card.widthBlocks, preset.ratioWidth); assert.equal(card.heightBlocks, preset.ratioHeight);
    assert.equal(card.memberNumber, ' 000Ab c '); assert.equal(card.payload, ' 000Ab c '); assert.equal(card.expiryMonth, '2030-12'); assert.equal(card.appearance.gradientPresetId, 'ptt');
  }
  assert.ok(saved.cards.slice(0, 4).every(card => card.kind === 'demo'));
  const restarted = e.factory(); await restarted.commands.initialize(); assert.deepEqual(restarted.getSnapshot().session.saved, saved);
});
test('Actual hook Cancel retains draft, Discard restores saved cards/layout, and Home cannot drag', async () => {
  const e = await activeV2(), preset = e.load('src/lib/card-size-presets.ts').CARD_SIZE_PRESETS.find(p=>p.id==='mini-landscape');
  let hook = e.render(); const original = JSON.stringify(e.runtime.getSnapshot().session.saved);
  hook.move(e.cards[0].id, { col: 0, row: 30 }); assert.equal(JSON.stringify(e.runtime.getSnapshot().session.draft), original);
  hook.enter(); hook = e.render(); const [v, p] = fields(e, preset); e.runtime.features.add(e.runtime.features.begin(), v, p);
  hook = e.render(); hook.leave(); hook = e.render(); assert.equal(hook.exitPrompt, true);
  hook.cancel(); hook = e.render(); assert.equal(hook.mode, 'create'); assert.equal(hook.cards.length, 5); assert.equal(hook.exitPrompt, false);
  hook.leave(); hook = e.render(); hook.discard(); hook = e.render(); assert.equal(hook.mode, 'home'); assert.equal(hook.cards.length, 4);
  assert.equal(JSON.stringify(e.runtime.getSnapshot().session.saved), original); assert.equal(JSON.stringify(e.runtime.getSnapshot().session.draft), original);
});
test('Remounting Home does not silently discard an owner-held unsaved draft on reentering Create', async () => {
  const e = await activeV2(); let hook = e.render(); hook.enter(); hook = e.render(); hook.move(e.cards[0].id, { col: 0, row: 30 });
  const draft = JSON.stringify(e.runtime.getSnapshot().session.draft); e.resetNavigation(); hook = e.render();
  assert.equal(hook.mode, 'home'); hook.enter(); hook = e.render(); assert.equal(hook.mode, 'create');
  assert.equal(JSON.stringify(e.runtime.getSnapshot().session.draft), draft); assert.equal(hook.dirty, true);
});
test('Real membership detail binds exact number, expiry, artwork and original payload to its scannable view', async () => {
  const e = await activeV2(), preset = e.load('src/lib/card-size-presets.ts').CARD_SIZE_PRESETS.find(p=>p.id==='card-landscape'), [v, p] = fields(e, preset);
  const result = e.runtime.features.add(e.runtime.features.begin(), v, p); let closed = 0;
  const props = { card: result.card, fromCreate: false, onClose: () => { closed++; } };
  let tree = e.render('src/components/bemem/MembershipCardDetail.tsx', 'MembershipCardDetail', props);
  nodes(tree).find(n => n.props?.testID === 'card-detail-sheet').props.onLayout({ nativeEvent: { layout: { width: 390 } } });
  nodes(tree).find(n => n.props?.testID === 'card-detail-slot').props.onLayout({ nativeEvent: { layout: { width: 214 } } });
  tree = e.render('src/components/bemem/MembershipCardDetail.tsx', 'MembershipCardDetail', props);
  const list = nodes(tree); assert.ok(list.some(n => n.props?.children === ' 000Ab c '));
  assert.equal(list.find(n => n.type === 'CardCodeView').props.card.payload, result.card.payload);
  assert.equal(list.find(n => n.type === 'CardCodeView').props.format, result.card.preferredDisplayFormat);
  assert.ok(list.some(n => n.props?.children === 'Expires\n2030-12'));
  assert.equal(list.find(n => n.type === 'CardAppearancePreview').props.appearance.gradientPresetId, 'ptt');
  list.find(n => n.props?.accessibilityLabel === 'Switch card front and back').props.onPress();
  tree = e.render('src/components/bemem/MembershipCardDetail.tsx', 'MembershipCardDetail', props);
  assert.equal(nodes(tree).find(n => n.type === 'CardAppearancePreview').props.presentation.side, 'back');
  tree.props.onRequestClose(); nodes(tree).find(n => n.props?.accessibilityLabel === 'Close card preview').props.onPress(); assert.equal(closed, 2);
  assert.equal(nodes(tree).some(n => n.props?.children === 'Edit Card · Coming soon'), false);
});
test('Home component binds real membership cards and Clear Search restores exact saved coordinates', async () => {
  const e = await activeV2(), preset = e.load('src/lib/card-size-presets.ts').CARD_SIZE_PRESETS.find(p=>p.id==='card-landscape');
  let hook = e.render(); hook.enter(); hook = e.render(); const [v, p] = fields(e, preset);
  const result = e.runtime.features.add(e.runtime.features.begin(), v, p); hook = e.render(); await hook.save();
  // Independent React instance for the real Home component, sharing the same App Root owner.
  const viewEnv = environment(true); viewEnv.setRuntime(e.runtime);
  let tree = viewEnv.render('src/app/index.tsx', 'default');
  let canvas = nodes(tree).find(n => n.type === 'WalletCanvas'); assert.equal(canvas.props.cards.length, 5); assert.equal(canvas.props.editing, false);
  assert.equal(nodes(tree).find(n => n.type === 'ContextualFooter').props.mode, 'Home');
  nodes(tree).find(n => n.type === 'HomeHeader').props.onSearch(); tree = viewEnv.render('src/app/index.tsx', 'default');
  nodes(tree).find(n => n.type === 'SearchField').props.onChange(v.name); tree = viewEnv.render('src/app/index.tsx', 'default');
  canvas = nodes(tree).find(n => n.type === 'WalletCanvas'); assert.equal(canvas.props.cards.length, 1); assert.deepEqual(canvas.props.layout[result.card.id], { col: 0, row: 0 });
  nodes(tree).find(n => n.type === 'SearchField').props.onChange(''); tree = viewEnv.render('src/app/index.tsx', 'default');
  assert.deepEqual(nodes(tree).find(n => n.type === 'WalletCanvas').props.layout, e.runtime.getSnapshot().session.saved.canvas.layout);
  nodes(tree).find(n => n.type === 'WalletCanvas').props.onOpen(nodes(tree).find(n => n.type === 'WalletCanvas').props.cards.find(c => c.id === result.card.id));
  tree = viewEnv.render('src/app/index.tsx', 'default'); assert.equal(nodes(tree).find(n => n.type === 'CardPreview').props.membership.payload, ' 000Ab c ');
});
test('Actual Create Footer Add opens approved AddCardEditor with real draft commands, not a mock Save', async () => {
  const e = environment(false); await e.runtime.commands.initialize();
  let tree = e.render('src/app/index.tsx', 'default'); nodes(tree).find(n => n.type === 'ContextualFooter').props.onCreate();
  tree = e.render('src/app/index.tsx', 'default'); const actions = nodes(tree).find(n => n.type === 'ContextualFooter'); assert.equal(actions.props.mode, 'Create');
  actions.props.onAdd(); tree = e.render('src/app/index.tsx', 'default'); const addEditor=nodes(tree).find(n=>n.type==='AddCardEditor');assert.equal(addEditor.props.presentation,undefined);assert.equal(addEditor.props.v2Active,false);assert.ok(nodes(tree).find(n=>n.type==='ContextualFooter'));
  assert.equal(addEditor.props.commands,e.runtime.features);addEditor.props.onClose(); tree = e.render('src/app/index.tsx', 'default');
  assert.equal(nodes(tree).find(n => n.type === 'ContextualFooter').props.mode, 'Create'); assert.equal(writes(e).length, 0);
});
test('Android Back uses existing unsaved dialog; Save returns Home only after successful readback', async () => {
  const e = await activeV2(); let tree = e.render('src/app/index.tsx', 'default');
  nodes(tree).find(n => n.type === 'ContextualFooter').props.onCreate(); tree = e.render('src/app/index.tsx', 'default');
  nodes(tree).find(n => n.type === 'WalletCanvas').props.onMove(e.cards[0].id, { col: 0, row: 30 }); tree = e.render('src/app/index.tsx', 'default');
  assert.equal(e.back()(), true); tree = e.render('src/app/index.tsx', 'default');
  assert.equal(nodes(tree).find(n => n.type === 'UnsavedChangesDialog').props.visible, true);
  nodes(tree).find(n => n.type === 'UnsavedChangesDialog').props.onCancel(); tree = e.render('src/app/index.tsx', 'default');
  assert.equal(nodes(tree).find(n => n.type === 'WalletCanvas').props.editing, true);
});
test('Commit uncertain in actual hook retains Draft and locks writer; reinspection adopts committed data without retry', async () => {
  const e = await activeV2(), preset = e.load('src/lib/card-size-presets.ts').CARD_SIZE_PRESETS.find(p=>p.id==='card-landscape');
  let hook = e.render(); hook.enter(); hook = e.render(); const [v, p] = fields(e, preset); e.runtime.features.add(e.runtime.features.begin(), v, p);
  hook = e.render(); e.failRead('bemem-wallet-v2/wallet-0000000000000011'); await hook.save(); hook = e.render();
  assert.equal(hook.mode, 'create'); assert.equal(hook.blocked, true); assert.equal(hook.cards.length, 5);
  const before = [...e.data.entries()]; await hook.reinspect(); hook = e.render(); assert.equal(hook.blocked, false); assert.equal(hook.dirty, false);
  assert.deepEqual([...e.data.entries()], before);
});
test('Existing committed v2 before release approval is locked; never falls back to v1 writer', async () => {
  const approved = await activeV2(), e = environment(false); e.data.clear(); approved.data.forEach((value, key) => e.data.set(key, value));
  approved.dirs.forEach(dir => e.dirs.add(dir)); const before = [...e.data.entries()];
  assert.equal((await e.runtime.commands.initialize()).ok, false); assert.equal(e.runtime.getSnapshot().state.editsAllowed, false);
  assert.equal(e.runtime.getSnapshot().state.committedV2, true); assert.deepEqual([...e.data.entries()], before); assert.equal(writes(e).length, 0);
});
test('Native backup write failure blocks import and retains source bytes without a v2 commit', async () => {
  const e = environment(true); await e.runtime.commands.initialize(); const original = [...e.data.entries()], review = await e.runtime.reviewMigration();
  e.failWrite('bemem-pre-cutover-backup'); assert.equal((await e.runtime.requestCutover(review.generation, review.document)).ok, false);
  assert.equal(e.data.get(original[0][0]), original[0][1]); assert.equal([...e.data.keys()].some(key => key.includes('bemem-wallet-v2/')), false);
  assert.equal(e.runtime.getSnapshot().state.editsAllowed, false);
});
test('Step 8 production approval is explicit and Provider is mounted exactly once at App Root', () => {
  assert.match(fs.readFileSync(path.join(root, 'src/constants/wallet-release.ts'), 'utf8'), /PRODUCTION_WALLET_V2_APPROVED = true/);
  const app = fs.readFileSync(path.join(root, 'src/app/_layout.tsx'), 'utf8'); assert.equal((app.match(/<WalletRuntimeProvider>/g) ?? []).length, 1);
  const hook = fs.readFileSync(path.join(root, 'src/hooks/use-wallet-canvas.ts'), 'utf8'); assert.doesNotMatch(hook, /canvasStorage|useReducer|useState\(.*[Ss]aved/);
  const detail = fs.readFileSync(path.join(root, 'src/components/bemem/MembershipCardDetail.tsx'), 'utf8');
  assert.match(detail, /<CardCodeView card=\{card\} format=\{format\}/); assert.doesNotMatch(detail, /https?:\/\/|Math\.random|fakeBarcode/);
});

test('Approved startup, opening Review and consent alone never back up or import', async () => {
  const e = environment(true), original = [...e.data.entries()];
  await e.runtime.commands.initialize();
  assert.equal(e.runtime.getSnapshot().state.source, 'v1');
  const host = panelHost(e); host.render();
  assert.equal(control(host.render(), 'Back up import and activate Wallet v2').props.disabled, true);
  await host.press('Review migration read only');
  assert.equal(control(host.render(), 'Back up import and activate Wallet v2').props.disabled, true);
  await host.press('Confirm migration consent');
  assert.equal(control(host.render(), 'Back up import and activate Wallet v2').props.disabled, false);
  assert.deepEqual([...e.data.entries()], original); assert.equal(writes(e).length, 0);
  await host.press('Cancel migration review');
  const restarted = e.factory(); await restarted.commands.initialize();
  assert.equal(restarted.getSnapshot().state.source, 'v1'); assert.equal(writes(e).length, 0);
});

test('Approved new installation starts empty in memory and persists only on explicit Save', async () => {
  const e = environment(true, false); await e.runtime.commands.initialize();
  assert.equal(e.runtime.getSnapshot().state.source, 'v2');
  assert.equal(e.runtime.getSnapshot().session.saved.cards.length, 0); assert.equal(writes(e).length, 0);
  let tree = e.render('src/app/index.tsx', 'default');
  assert.equal(nodes(tree).find(n => n.type === 'ContextualFooter').props.mode, 'Home');
  const preset = e.load('src/lib/card-size-presets.ts').CARD_SIZE_PRESETS.find(p=>p.id==='card-landscape'), [v, p] = fields(e, preset);
  assert.equal(e.runtime.features.add(e.runtime.features.begin(), v, p).ok, true);
  assert.equal(writes(e).length, 0);
  assert.equal((await e.runtime.commands.save(e.runtime.getSnapshot().state.generation)).ok, true);
  const fresh = e.factory(); await fresh.commands.initialize();
  assert.equal(fresh.getSnapshot().session.saved.cards.length, 1);
  assert.equal([...e.data.keys()].some(key => key.includes('bemem-pre-cutover-backup')), false);
});

test('Gate UI shows actual approved session, consent toggles action admission without writes', async () => {
  const e = environment(true); await e.runtime.commands.initialize(); const host = panelHost(e);
  const before = [...e.data.entries()];
  const text = () => JSON.stringify(control(host.render(), 'Wallet release gate status').props.children);
  assert.match(text(), /Step 8.1/); assert.match(text(), /Approved/); assert.match(text(), /Required/);
  await host.press('Review migration read only');
  assert.equal(control(host.render(), 'Back up import and activate Wallet v2').props.disabled, true);
  await host.press('Confirm migration consent');
  assert.match(text(), /Confirmed/); assert.match(text(), /Ready/);
  assert.equal(control(host.render(), 'Back up import and activate Wallet v2').props.disabled, false);
  assert.equal(control(host.render(), 'Back up import and activate Wallet v2').props.accessibilityState.disabled, false);
  assert.doesNotMatch(JSON.stringify(host.render()), /locked pending release approval/);
  await host.press('Confirm migration consent');
  assert.match(text(), /Required/);
  assert.equal(control(host.render(), 'Back up import and activate Wallet v2').props.disabled, true);
  assert.deepEqual([...e.data.entries()], before); assert.equal(writes(e).length, 0);
});

test('Fast Refresh retained locked owner cannot be unlocked by a changed bundle or Consent', async () => {
  const e = environment(false); await e.runtime.commands.initialize();
  e.setReleaseApproval(true); // Same owner instance retained by Provider useState.
  const host = panelHost(e); await consent(host); const before = [...e.data.entries()];
  assert.equal(e.runtime.cutoverApproved, false);
  assert.match(JSON.stringify(host.render()), /runtime release gate differs from this bundle/);
  assert.doesNotMatch(JSON.stringify(host.render()), /locked pending release approval/);
  assert.equal(control(host.render(), 'Back up import and activate Wallet v2').props.disabled, true);
  await host.press('Back up import and activate Wallet v2');
  const review = await e.runtime.reviewMigration();
  assert.equal((await e.runtime.requestCutover(review.generation, review.document)).code, 'production_cutover_not_approved');
  assert.equal((await e.runtime.commands.cutover(review.generation, review.document)).code, 'production_cutover_not_approved');
  assert.deepEqual([...e.data.entries()], before); assert.equal(writes(e).length, 0);
  const reloaded = e.factory(); await reloaded.commands.initialize();
  assert.equal(reloaded.cutoverApproved, true); assert.equal(reloaded.getSnapshot().state.source, 'v1');
  const fresh = panelHost({ ...e, runtime: reloaded }); await consent(fresh);
  assert.equal(control(fresh.render(), 'Back up import and activate Wallet v2').props.disabled, false);
  assert.doesNotMatch(JSON.stringify(fresh.render()), /runtime release gate differs from this bundle/);
  assert.deepEqual([...e.data.entries()], before); assert.equal(writes(e).length, 0);
});

test('Bundle/session gate mismatch in the other direction also blocks the UI without writes', async () => {
  const e = environment(true); await e.runtime.commands.initialize(); e.setReleaseApproval(false);
  const host = panelHost(e); await consent(host); const before = [...e.data.entries()];
  assert.equal(control(host.render(), 'Back up import and activate Wallet v2').props.disabled, true);
  await host.press('Back up import and activate Wallet v2');
  assert.match(JSON.stringify(host.render()), /runtime release gate differs from this bundle/);
  assert.deepEqual([...e.data.entries()], before); assert.equal(writes(e).length, 0);
});

test('Actual Review/Consent UI remains read-only and execution-locked before release approval', async () => {
  const e = environment(false); await e.runtime.commands.initialize(); let closed = 0;
  const host = panelHost(e, () => { closed++; }); const before = [...e.data.entries()];
  host.render(); assert.equal(writes(e).length, 0); await consent(host);
  assert.equal(control(host.render(), 'Back up import and activate Wallet v2').props.disabled, true);
  await host.press('Back up import and activate Wallet v2');
  assert.deepEqual([...e.data.entries()], before); assert.equal(writes(e).length, 0);
  await host.press('Cancel migration review'); assert.equal(closed, 1);
  assert.equal(e.runtime.getSnapshot().state.source, 'v1');
});

test('Production UI consent -> verified activation -> actual Add Card UI -> Save -> Home/detail -> restart', async () => {
  const e = environment(true); await e.runtime.commands.initialize(); const original = [...e.data.entries()];
  const savedV1 = JSON.parse(JSON.stringify(e.runtime.getSnapshot().session.saved));
  const home = environment(true); home.setRuntime(e.runtime);
  let tree = home.render('src/app/index.tsx', 'default');
  nodes(tree).find(node => node.type === 'ContextualFooter').props.onCreate(); tree = home.render('src/app/index.tsx', 'default');
  const entry = nodes(tree).find(node => node.type === 'Pressable' && nodes(node).some(child => child.type === 'Text' && child.props.children === 'Wallet v1 · Review Wallet v2'));
  assert.ok(entry); entry.props.onPress(); tree = home.render('src/app/index.tsx', 'default');
  const panel = nodes(tree).find(node => node.type === 'WalletMigrationPanel'); assert.ok(panel);
  let closed = 0; const host = panelHost(e, () => { closed++; panel.props.onClose(); });
  await consent(host); assert.equal(writes(e).length, 0);
  let release; const gate = { promise: new Promise(resolve => { release = resolve; }) }; e.holdBackupRead(gate);
  const execute = control(host.render(), 'Back up import and activate Wallet v2').props.onPress;
  const first = execute(); await execute(); // Same rendered callback: synchronous ref must reject double tap.
  await until(() => [...e.data.keys()].some(key => key.includes('bemem-pre-cutover-backup/')));
  assert.equal(e.runtime.getSnapshot().state.phase, 'switching'); assert.equal(e.runtime.getSnapshot().state.editsAllowed, false);
  assert.equal(control(host.render(), 'Cancel migration review').props.disabled, true);
  host.render().props.onRequestClose(); assert.equal(closed, 0);
  release(); await first; assert.equal(closed, 0);
  assert.ok(nodes(host.render()).some(node => typeof node.props?.children === 'string' && node.props.children.startsWith('Backup integrity passed. Import readback passed.')));
  await host.press('Cancel migration review'); assert.equal(closed, 1);
  assert.equal(e.runtime.getSnapshot().state.source, 'v2'); assert.equal(e.runtime.getSnapshot().state.phase, 'ready_v2');
  assert.deepEqual(e.runtime.getSnapshot().session.saved, savedV1);
  assert.equal(e.data.get(original[0][0]), original[0][1]);
  const backups = [...e.data.entries()].filter(([key]) => key.includes('bemem-pre-cutover-backup/'));
  assert.equal(backups.length, 1); assert.equal(JSON.parse(backups[0][1]).source.raw, original[0][1]);
  assert.deepEqual(JSON.parse(backups[0][1]).demoCards, e.cards);
  tree = home.render('src/app/index.tsx', 'default'); assert.equal(nodes(tree).some(node => node.type === 'WalletMigrationPanel'), false);
  assert.equal(nodes(tree).find(node => node.type === 'WalletCanvas').props.editing, true);
  nodes(tree).find(node => node.type === 'ContextualFooter').props.onAdd(); tree = home.render('src/app/index.tsx', 'default');
  const addEditor=nodes(tree).find(n=>n.type==='AddCardEditor');assert.equal(addEditor.props.presentation,undefined);assert.equal(addEditor.props.v2Active,true);
  const editor = environment(true); editor.setRuntime(e.runtime); const editorProps = addEditor.props;
  let form = editor.render('src/components/bemem/AddCardEditor.tsx', 'AddCardEditor', editorProps);
  const preset = e.load('src/lib/card-size-presets.ts').CARD_SIZE_PRESETS.find(p=>p.id==='vaccine-passport-portrait'), [v, p] = fields(e, preset);
  const fieldsNode = nodes(form).find(node => node.type === 'AddCardForm'); fieldsNode.props.onChange(v); fieldsNode.props.onPresentationChange(p);
  form = editor.render('src/components/bemem/AddCardEditor.tsx', 'AddCardEditor', editorProps);
  const writeCount = writes(e).length, add = control(form, 'Add Card to Arrange draft').props.onPress; add(); add();
  assert.equal(e.runtime.getSnapshot().session.draft.cards.length, 5); assert.equal(e.runtime.getSnapshot().session.saved.cards.length, 4);
  assert.equal(writes(e).length, writeCount);
  tree = home.render('src/app/index.tsx', 'default'); assert.equal(nodes(tree).find(node => node.type === 'WalletCanvas').props.cards.length, 5);
  assert.equal(nodes(tree).find(node => node.type === 'HomeHeader').props.saveDisabled,false);
  nodes(tree).find(node => node.type === 'HomeHeader').props.onSave();
  await until(() => e.runtime.getSnapshot().state.revision === 11 && !e.runtime.getSnapshot().state.saving
    && !e.runtime.getSnapshot().state.dirty);
  await new Promise(r=>setImmediate(r));tree = home.render('src/app/index.tsx', 'default');assert.equal(nodes(tree).find(node=>node.type==='WalletCanvas').props.editing,true);nodes(tree).find(node=>node.type==='ContextualFooter').props.onHome();tree=home.render('src/app/index.tsx','default');assert.equal(nodes(tree).find(node=>node.type==='WalletCanvas').props.editing,false);
  const stored = e.runtime.getSnapshot().session.saved, member = stored.cards.find(card => card.kind === 'membership');
  assert.equal(member.payload, ' 000Ab c '); assert.equal(member.memberNumber, ' 000Ab c '); assert.equal(member.sizePresetId, preset.id);
  assert.deepEqual(stored.cards.slice(0, 4), savedV1.cards);
  for (const card of savedV1.cards) assert.deepEqual(stored.canvas.layout[card.id], savedV1.canvas.layout[card.id]);
  const fresh = e.factory(), beforeRestart = [...e.data.entries()]; await fresh.commands.initialize();
  assert.equal(fresh.getSnapshot().state.source, 'v2'); assert.deepEqual(fresh.getSnapshot().session.saved, stored);
  assert.deepEqual([...e.data.entries()], beforeRestart);
  home.resetNavigation(); home.setRuntime(fresh); tree = home.render('src/app/index.tsx', 'default');
  const canvas = nodes(tree).find(node => node.type === 'WalletCanvas'); assert.equal(canvas.props.editing, false);
  canvas.props.onOpen(canvas.props.cards.find(card => card.id === member.id)); tree = home.render('src/app/index.tsx', 'default');
  const detailBinding = nodes(tree).find(node => node.type === 'CardPreview').props;
  assert.equal(detailBinding.membership.payload, member.payload);
  const detail = environment(true); detail.setRuntime(fresh);
  const detailProps = { card: detailBinding.membership, fromCreate: false, onClose: detailBinding.onClose };
  let detailTree = detail.render('src/components/bemem/MembershipCardDetail.tsx', 'MembershipCardDetail', detailProps);
  assert.equal(nodes(detailTree).find(node => node.type === 'CardCodeView').props.format, 'qr');
  nodes(detailTree).find(node => node.props?.accessibilityLabel === 'Show Code 128').props.onPress();
  detailTree = detail.render('src/components/bemem/MembershipCardDetail.tsx', 'MembershipCardDetail', detailProps);
  assert.equal(nodes(detailTree).find(node => node.type === 'CardCodeView').props.format, 'code128');
  detailTree.props.onRequestClose(); tree = home.render('src/app/index.tsx', 'default');
  assert.equal(nodes(tree).find(node => node.type === 'CardPreview').props.card, null);
  assert.equal((await fresh.requestCutover(1, savedV1)).ok, false); assert.deepEqual([...e.data.entries()], beforeRestart);
});

test('Consent expires on dirty Draft or a completed v1 Save; stale callbacks never start Backup', async () => {
  const e = environment(true); await e.runtime.commands.initialize(); const host = panelHost(e); await consent(host);
  const stale = control(host.render(), 'Back up import and activate Wallet v2').props.onPress;
  const saved = JSON.parse(JSON.stringify(e.runtime.getSnapshot().session.saved)); saved.canvas.layout[e.cards[0].id] = { col: 0, row: 30 };
  e.runtime.commands.updateDraft(e.runtime.getSnapshot().state.generation, saved);
  assert.equal(control(host.render(), 'Back up import and activate Wallet v2').props.disabled, true);
  assert.equal(control(host.render(), 'Review migration read only').props.disabled, true);
  await stale(); assert.equal([...e.data.keys()].some(key => key.includes('bemem-pre-cutover-backup/')), false);
  await e.runtime.commands.save(e.runtime.getSnapshot().state.generation); await consent(host);
  assert.equal(e.runtime.getSnapshot().state.revision, 11);
  const oldReview = control(host.render(), 'Back up import and activate Wallet v2').props.onPress;
  await e.runtime.commands.save(e.runtime.getSnapshot().state.generation); // explicit additional revision; generation can stay the same.
  const before = [...e.data.entries()]; await oldReview(); assert.deepEqual([...e.data.entries()], before);
  assert.equal(control(host.render(), 'Back up import and activate Wallet v2').props.disabled, true);
});

test('UI backup failure exposes explicit reinspection without automatic retry/import or source mutation', async () => {
  const e = environment(true); await e.runtime.commands.initialize(); const original = [...e.data.entries()];
  let closed = 0; const host = panelHost(e, () => { closed++; }); await consent(host);
  e.failWrite('bemem-pre-cutover-backup'); await host.press('Back up import and activate Wallet v2');
  assert.equal(e.runtime.getSnapshot().state.phase, 'blocked'); assert.equal(closed, 0);
  assert.ok(nodes(host.render()).some(node => typeof node.props?.children === 'string' && node.props.children.startsWith('Backup integrity failed or could not be verified.')));
  assert.equal(e.data.get(original[0][0]), original[0][1]); assert.equal([...e.data.keys()].some(key => key.includes('bemem-wallet-v2/')), false);
  const bytes = [...e.data.entries()]; await host.press('Reinspect wallet read only');
  assert.deepEqual([...e.data.entries()], bytes); assert.equal(e.runtime.getSnapshot().state.phase, 'ready_v1');
  assert.equal(control(host.render(), 'Back up import and activate Wallet v2').props.disabled, true);
});

test('UI pending states block preflight and post-backup import, retaining all pending evidence', async () => {
  const e = environment(true); await e.runtime.commands.initialize(); const host = panelHost(e);
  e.dirs.add('documents/bemem-wallet-v2'); e.data.set('documents/bemem-wallet-v2/wallet-0000000000000010.foreign.pending', 'synthetic pending');
  const before = [...e.data.entries()]; await host.press('Review migration read only');
  assert.ok(nodes(host.render()).some(node => typeof node.props?.children === 'string' && node.props.children.includes('pending transaction needs review')));
  assert.deepEqual([...e.data.entries()], before); assert.equal(writes(e).length, 0);
  const during = environment(true); await during.runtime.commands.initialize(); const duringHost = panelHost(during); await consent(duringHost);
  during.afterBackup(() => { during.dirs.add('documents/bemem-wallet-v2'); during.data.set('documents/bemem-wallet-v2/wallet-0000000000000010.other.pending', 'synthetic pending'); });
  await duringHost.press('Back up import and activate Wallet v2'); assert.equal(during.runtime.getSnapshot().state.failure.kind, 'pending');
  const evidence = [...during.data.entries()]; await duringHost.press('Reinspect wallet read only');
  assert.deepEqual([...during.data.entries()], evidence); assert.equal(during.runtime.getSnapshot().state.editsAllowed, false);
});

test('UI commit-uncertain recovery reads the committed snapshot and activates without another import', async () => {
  const e = environment(true); await e.runtime.commands.initialize(); let closed = 0; const host = panelHost(e, () => { closed++; }); await consent(host);
  e.failRead('bemem-wallet-v2/wallet-0000000000000010'); await host.press('Back up import and activate Wallet v2');
  assert.equal(e.runtime.getSnapshot().state.failure.kind, 'commit_uncertain'); assert.equal(closed, 0);
  const evidence = [...e.data.entries()], count = writes(e).length; await host.press('Reinspect wallet read only');
  assert.equal(closed, 0); assert.equal(e.runtime.getSnapshot().state.source, 'v2');
  await host.press('Cancel migration review'); assert.equal(closed, 1);
  assert.deepEqual([...e.data.entries()], evidence); assert.equal(writes(e).length, count);
});

async function savedMember() {
  const e=await activeV2(),preset=e.load('src/lib/card-size-presets.ts').CARD_SIZE_PRESETS.find(p=>p.id==='card-landscape'),[v,p]=fields(e,preset);
  const added=e.runtime.features.add(e.runtime.features.begin(),v,p);assert.equal(added.ok,true);
  assert.equal((await e.runtime.commands.save(e.runtime.getSnapshot().state.generation)).ok,true);
  return {e,id:added.card.id};
}
test('Edit persists the same ID, count, grid, size, appearance and untouched fields; restart reads new number/payload',async()=>{
  const {e,id}=await savedMember(),before=JSON.parse(JSON.stringify(e.runtime.getSnapshot().session.saved));
  const opened=e.runtime.features.openEdit(id);assert.equal(opened.ok,true);
  const values={...opened.session.values,name:'Edited Test Member',memberNumber:' 000987 Ab ',expiryMonth:''};
  const count=writes(e).length;
  const first=e.runtime.features.saveEdit(opened.session.token,values),second=e.runtime.features.saveEdit(opened.session.token,values);
  assert.equal((await second).ok,false);assert.equal((await first).ok,true);
  const saved=e.runtime.getSnapshot().session.saved,old=before.cards.find(c=>c.id===id),next=saved.cards.find(c=>c.id===id);
  assert.equal(saved.revision,before.revision+1);assert.equal(saved.cards.length,before.cards.length);
  assert.deepEqual(saved.canvas,before.canvas);assert.deepEqual(saved.cards.filter(c=>c.id!==id),before.cards.filter(c=>c.id!==id));
  assert.deepEqual(next,{...old,name:values.name,memberNumber:values.memberNumber,payload:values.memberNumber,expiryMonth:'',updatedAt:next.updatedAt});
  assert.ok(writes(e).length>count);
  const fresh=e.factory(),bytes=[...e.data.entries()];await fresh.commands.initialize();assert.deepEqual(fresh.getSnapshot().session.saved,saved);assert.deepEqual([...e.data.entries()],bytes);
  const home=environment(true);home.setRuntime(fresh);const tree=home.render('src/app/index.tsx','default');
  assert.equal(nodes(tree).find(n=>n.type==='WalletCanvas').props.cards.find(c=>c.id===id).name,values.name);
});
test('Edit Cancel and validation errors do not modify draft, saved snapshot or files',async()=>{
  const {e,id}=await savedMember(),snapshot=JSON.stringify(e.runtime.getSnapshot().session),bytes=[...e.data.entries()];
  const opened=e.runtime.features.openEdit(id);e.runtime.features.cancelEdit(opened.session.token);
  assert.equal((await e.runtime.features.saveEdit(opened.session.token,{...opened.session.values,name:'Cancelled'})).ok,false);
  const next=e.runtime.features.openEdit(id);
  const result=await e.runtime.features.saveEdit(next.session.token,{...next.session.values,name:' ',expiryMonth:'2030-13'});
  assert.equal(result.ok,false);assert.ok(result.errors.name);assert.ok(result.errors.expiryMonth);
  assert.equal(JSON.stringify(e.runtime.getSnapshot().session),snapshot);assert.deepEqual([...e.data.entries()],bytes);
});
test('Unchanged member code remains custom on name-only edit; legacy fields remain absent',async()=>{
  const {e,id}=await savedMember();let snapshot=e.runtime.getSnapshot();const doc=JSON.parse(JSON.stringify(snapshot.session.saved));
  const original=doc.cards.find(c=>c.id===id);for(const key of ['sizePresetId','widthBlocks','heightBlocks'])delete original[key];
  assert.equal(e.runtime.commands.updateDraft(snapshot.state.generation,doc).ok,true);assert.equal((await e.runtime.commands.save(snapshot.state.generation)).ok,true);
  const opened=e.runtime.features.openEdit(id);const result=await e.runtime.features.saveEdit(opened.session.token,{...opened.session.values,name:'Legacy renamed'});
  assert.equal(result.ok,true);const saved=e.runtime.getSnapshot().session.saved.cards.find(c=>c.id===id);
  assert.equal(saved.payload,original.payload);assert.equal(saved.memberNumber,original.memberNumber);
  for(const key of ['sizePresetId','widthBlocks','heightBlocks'])assert.equal(Object.hasOwn(saved,key),false);
});
test('Edit blocks dirty canvases, demos, v1 wallets and stale revisions before writing',async()=>{
  const {e,id}=await savedMember();assert.equal(e.runtime.features.openEdit(e.cards[0].id).ok,false);
  const opened=e.runtime.features.openEdit(id);await e.runtime.commands.save(e.runtime.getSnapshot().state.generation);
  let bytes=[...e.data.entries()];assert.equal((await e.runtime.features.saveEdit(opened.session.token,{...opened.session.values,name:'Stale'})).ok,false);assert.deepEqual([...e.data.entries()],bytes);
  const draft=JSON.parse(JSON.stringify(e.runtime.getSnapshot().session.draft));draft.canvas.layout[e.cards[0].id]={col:0,row:30};
  e.runtime.commands.updateDraft(e.runtime.getSnapshot().state.generation,draft);assert.equal(e.runtime.features.openEdit(id).ok,false);
  const legacy=environment(false);await legacy.runtime.commands.initialize();assert.equal(legacy.runtime.features.openEdit(legacy.cards[0].id).ok,false);assert.equal(writes(legacy).length,0);
});
test('Edit write failure retains original saved data and blocks duplicate retries',async()=>{
  const {e,id}=await savedMember(),saved=JSON.stringify(e.runtime.getSnapshot().session.saved),opened=e.runtime.features.openEdit(id);
  e.failWrite('bemem-wallet-v2');const values={...opened.session.values,memberNumber:'00087654'};
  const result=await e.runtime.features.saveEdit(opened.session.token,values);assert.equal(result.ok,false);assert.equal(result.requiresReinspection,true);
  assert.equal(JSON.stringify(e.runtime.getSnapshot().session.saved),saved);assert.equal(e.runtime.getSnapshot().state.editsAllowed,false);
  const bytes=[...e.data.entries()];assert.equal((await e.runtime.features.saveEdit(opened.session.token,values)).ok,false);assert.deepEqual([...e.data.entries()],bytes);
});
test('Edit commit uncertainty requires explicit reinspection and never repeats the write',async()=>{
  const {e,id}=await savedMember(),opened=e.runtime.features.openEdit(id),revision=e.runtime.getSnapshot().state.revision+1;
  e.failRead(`bemem-wallet-v2/wallet-${String(revision).padStart(16,'0')}`);
  const values={...opened.session.values,memberNumber:'00054321'},result=await e.runtime.features.saveEdit(opened.session.token,values);
  assert.equal(result.ok,false);assert.equal(e.runtime.getSnapshot().state.failure.kind,'commit_uncertain');
  const bytes=[...e.data.entries()],count=writes(e).length;assert.equal((await e.runtime.commands.reconcile()).ok,true);
  assert.equal(e.runtime.getSnapshot().session.saved.cards.find(c=>c.id===id).payload,values.memberNumber);
  assert.equal((await e.runtime.features.saveEdit(opened.session.token,values)).ok,false);assert.deepEqual([...e.data.entries()],bytes);assert.equal(writes(e).length,count);
});
function sharedForm(tree) { return nodes(tree).find(n=>n.type==='AddCardForm').props; }

test('Edit button is present only in Create; actual editor preloads, Cancel guards dirty values, Save updates Detail',async()=>{
  const {e,id}=await savedMember(),member=e.runtime.getSnapshot().session.saved.cards.find(c=>c.id===id),bytes=[...e.data.entries()];
  const view=environment(true,true,true);view.setRuntime(e.runtime);let saved=0,closed=0;
  let tree=view.render('src/components/bemem/MembershipCardDetail.tsx','MembershipCardDetail',{card:member,fromCreate:false,onClose(){},editCommands:e.runtime.features});
  assert.equal(nodes(tree).some(n=>n.props?.accessibilityLabel==='Edit Card'),false);
  view.resetNavigation();const detailProps={card:member,fromCreate:true,onClose(){},editCommands:e.runtime.features};
  tree=view.render('src/components/bemem/MembershipCardDetail.tsx','MembershipCardDetail',detailProps);
  control(tree,'Edit Card').props.onPress();tree=view.render('src/components/bemem/MembershipCardDetail.tsx','MembershipCardDetail',detailProps);assert.equal(tree.type.name,'EditMembershipCardEditor');
  const originalCallbacks=tree.props,editor=environment(true,true,true);
  const props={...tree.props,onSaved(){saved++;originalCallbacks.onSaved();},onClose(){closed++;}};
  const render=()=>editor.render('src/components/bemem/EditMembershipCardEditor.tsx','EditMembershipCardEditor',props);
  tree=render();assert.equal(sharedForm(tree).values.memberNumber,member.memberNumber);assert.equal(sharedForm(tree).mode,'edit');assert.deepEqual(sharedForm(tree).editCard,member);
  sharedForm(tree).onChange({...sharedForm(tree).values,name:'Samsung Edited'});tree=render();control(tree,'Cancel editing card').props.onPress();
  assert.equal(closed,0);assert.equal(editor.alerts.length,0);sheetConfirmationRequest(render()).actions.find(a=>a.label==='Keep Editing').onPress();assert.equal(sharedForm(render()).values.name,'Samsung Edited');
  assert.deepEqual([...e.data.entries()],bytes);
  control(render(),'Save membership changes').props.onPress();control(render(),'Save membership changes').props.onPress();
  await until(()=>saved===1);assert.equal(saved,1);assert.equal(e.runtime.getSnapshot().session.saved.cards.find(c=>c.id===id).name,'Samsung Edited');
  const updated=e.runtime.getSnapshot().session.saved.cards.find(c=>c.id===id);
  tree=view.render('src/components/bemem/MembershipCardDetail.tsx','MembershipCardDetail',{...detailProps,card:updated});
  assert.equal(tree.type,'Modal');assert.ok(nodes(tree).some(n=>n.props?.children==='Samsung Edited'));
});
test('Editor Android Back/Cancel before save writes nothing and confirmed discard returns safely',async()=>{
  const {e,id}=await savedMember(),opened=e.runtime.features.openEdit(id),bytes=[...e.data.entries()];
  const view=environment(true,true,true);let closed=0,saved=0;const props={commands:e.runtime.features,session:opened.session,card:e.runtime.getSnapshot().session.saved.cards.find(c=>c.id===id),onClose(){closed++;},onSaved(){saved++;}};
  const render=()=>view.render('src/components/bemem/EditMembershipCardEditor.tsx','EditMembershipCardEditor',props);
  let tree=render();sharedForm(tree).onChange({...sharedForm(tree).values,memberNumber:'00099999'});tree=render();tree.props.onClose();assert.equal(closed,0);assert.equal(saved,0);
  sheetConfirmationRequest(render()).actions.find(a=>a.label==='Discard Changes').onPress();assert.equal(closed,1);assert.deepEqual([...e.data.entries()],bytes);
  assert.equal((await e.runtime.features.saveEdit(opened.session.token,{...opened.session.values,name:'Cancelled'})).ok,false);
});

test('Edit respects repository Pending gate and keeps prior committed snapshot untouched',async()=>{
  const {e,id}=await savedMember(),opened=e.runtime.features.openEdit(id),saved=JSON.stringify(e.runtime.getSnapshot().session.saved);
  e.data.set('documents/bemem-wallet-v2/wallet-0000000000000012.other.pending','synthetic pending');
  const before=[...e.data.entries()];const result=await e.runtime.features.saveEdit(opened.session.token,{...opened.session.values,name:'Blocked by pending'});
  assert.equal(result.ok,false);assert.equal(e.runtime.getSnapshot().state.failure.kind,'pending');
  assert.equal(JSON.stringify(e.runtime.getSnapshot().session.saved),saved);assert.deepEqual([...e.data.entries()],before);
});
test('Edit validates code eligibility without converting Unicode or overwriting data',async()=>{
  const {e,id}=await savedMember(),state=e.runtime.getSnapshot(),doc=JSON.parse(JSON.stringify(state.session.saved));
  doc.cards.find(c=>c.id===id).preferredDisplayFormat='code128';e.runtime.commands.updateDraft(state.state.generation,doc);await e.runtime.commands.save(state.state.generation);
  const opened=e.runtime.features.openEdit(id),bytes=[...e.data.entries()];
  const result=await e.runtime.features.saveEdit(opened.session.token,{...opened.session.values,memberNumber:'000\u0e01'});
  assert.equal(result.ok,true);const card=e.runtime.getSnapshot().session.saved.cards.find(c=>c.id===id);assert.equal(card.memberNumber,'000\u0e01');assert.equal(card.payload,card.memberNumber);assert.equal(card.preferredDisplayFormat,'qr');
});
test('Editor save failure retains typed input, disables retry and closes toward wallet reinspection',async()=>{
  const {e,id}=await savedMember(),opened=e.runtime.features.openEdit(id),editor=environment(true,true,true);let saved=0,closed=null;
  const props={commands:e.runtime.features,session:opened.session,card:e.runtime.getSnapshot().session.saved.cards.find(c=>c.id===id),onClose(flag){closed=flag;},onSaved(){saved++;}};
  const render=()=>editor.render('src/components/bemem/EditMembershipCardEditor.tsx','EditMembershipCardEditor',props);
  let tree=render();sharedForm(tree).onChange({...sharedForm(tree).values,memberNumber:'00087654'});e.failWrite('bemem-wallet-v2');
  control(render(),'Save membership changes').props.onPress();assert.equal(render().props.closeDisabled,true);
  await until(()=>nodes(render()).some(n=>n.props?.accessibilityRole==='alert'));
  tree=render();assert.equal(saved,0);assert.equal(sharedForm(tree).values.memberNumber,'00087654');
  assert.equal(control(tree,'Save membership changes').props.disabled,true);
  const bytes=[...e.data.entries()];control(tree,'Cancel editing card').props.onPress();sheetConfirmationRequest(render()).actions.find(a=>a.label==='Close without retry').onPress();
  assert.equal(closed,true);assert.equal(saved,0);assert.deepEqual([...e.data.entries()],bytes);
});

test('Shared edit UI prefills saved metadata, front/back does not dirty or save, and blank expiry saves only existing card',async()=>{
  const {e,id}=await savedMember(),card=e.runtime.getSnapshot().session.saved.cards.find(c=>c.id===id),opened=e.runtime.features.openEdit(id);
  const view=environment(true,true,true),before=[...e.data.entries()];let saved=0;
  const render=()=>view.render('src/components/bemem/EditMembershipCardEditor.tsx','EditMembershipCardEditor',{
    commands:e.runtime.features,session:opened.session,card,onClose(){},onSaved(){saved++;},
  });
  let tree=render(),form=sharedForm(tree);
  assert.equal(form.presentation.sizePresetId,card.sizePresetId);assert.equal(form.presentation.brandQuery,card.brandQuery ?? '');
  assert.equal(form.presentation.expiryMonth,card.expiryMonth);assert.equal(form.values.payload,card.memberNumber);
  assert.equal(control(tree,'Save membership changes').props.disabled,true);
  assert.ok(nodes(tree).some(n=>n.props?.children==='Save Changes'));
  form.onPresentationChange({...form.presentation,side:'back'});tree=render();
  assert.equal(sharedForm(tree).presentation.side,'back');assert.equal(control(tree,'Save membership changes').props.disabled,true);
  assert.deepEqual([...e.data.entries()],before);
  form=sharedForm(tree);form.onPresentationChange({...form.presentation,expiryMonth:''});tree=render();
  control(tree,'Save membership changes').props.onPress();assert.equal(sharedForm(render()).disabled,true);
  await until(()=>saved===1);
  const result=e.runtime.getSnapshot().session.saved.cards.find(c=>c.id===id);
  assert.equal(result.expiryMonth,'');assert.equal(result.id,card.id);assert.equal(result.payload,card.payload);
  assert.deepEqual(result.appearance,card.appearance);assert.equal(result.widthBlocks,card.widthBlocks);
});

test('Shared edit UI preserves custom code when only membership text changes until the code is explicitly edited',async()=>{
  const {e,id}=await savedMember(),card=e.runtime.getSnapshot().session.saved.cards.find(c=>c.id===id),opened=e.runtime.features.openEdit(id);
  const view=environment(true,true,true),before=[...e.data.entries()];
  const render=()=>view.render('src/components/bemem/EditMembershipCardEditor.tsx','EditMembershipCardEditor',{
    commands:e.runtime.features,session:opened.session,card,onClose(){},onSaved(){},
  });
  let form=sharedForm(render());assert.equal(form.values.payload,card.memberNumber);
  form.onChange({...form.values,name:'Name-only edit'});form=sharedForm(render());assert.equal(form.values.payload,card.memberNumber);
  form.onChange({...form.values,memberNumber:' 000New Ab c '});form=sharedForm(render());
  assert.equal(form.values.memberNumber,' 000New Ab c ');assert.equal(form.values.payload,card.memberNumber);
  form.onChange({...form.values,memberNumber:opened.session.values.memberNumber});form=sharedForm(render());
  assert.equal(form.values.payload,card.memberNumber);assert.deepEqual([...e.data.entries()],before);
});

test('UI activation failure stays locked; verified activation retry does not write or reimport', async () => {
  const e = environment(true); await e.runtime.commands.initialize(); let closed = 0; const host = panelHost(e, () => { closed++; }); await consent(host);
  e.failActivation(true); await host.press('Back up import and activate Wallet v2');
  assert.equal(e.runtime.getSnapshot().state.phase, 'activation_incomplete'); assert.equal(e.runtime.getSnapshot().state.editsAllowed, false);
  assert.equal(closed, 0); const evidence = [...e.data.entries()], count = writes(e).length;
  e.failActivation(false); await host.press('Retry verified activation'); assert.equal(closed, 0);
  await host.press('Cancel migration review'); assert.equal(closed, 1);
  assert.equal(e.runtime.getSnapshot().state.phase, 'ready_v2'); assert.deepEqual([...e.data.entries()], evidence); assert.equal(writes(e).length, count);
});

// Delete tests only use this file's in-memory synthetic native FileSystem.
test('Delete Cancel consumes consent without changing saved/draft/files; Demo and unknown IDs are rejected',async()=>{
  const {e,id}=await savedMember(),before=JSON.stringify(e.runtime.getSnapshot().session),bytes=[...e.data.entries()];
  assert.equal(e.runtime.features.openDelete(e.cards[0].id).ok,false);
  assert.equal(e.runtime.features.openDelete('missing-card').ok,false);
  const opened=e.runtime.features.openDelete(id);assert.equal(opened.ok,true);
  e.runtime.features.cancelDelete(opened.session.token);
  assert.equal((await e.runtime.features.confirmDelete(opened.session.token)).ok,false);
  assert.equal(JSON.stringify(e.runtime.getSnapshot().session),before);assert.deepEqual([...e.data.entries()],bytes);
});
test('Delete removes only selected membership ID and its footprint, preserves other cards/layout and survives restart',async()=>{
  const {e,id}=await savedMember(),preset=e.load('src/lib/card-size-presets.ts').CARD_SIZE_PRESETS.find(p=>p.id==='mini-portrait'),[v,p]=fields(e,preset);
  const other=e.runtime.features.add(e.runtime.features.begin(),{...v,name:'Other Member'},p);assert.equal(other.ok,true);
  await e.runtime.commands.save(e.runtime.getSnapshot().state.generation);
  const before=JSON.parse(JSON.stringify(e.runtime.getSnapshot().session.saved));
  const opened=e.runtime.features.openDelete(id),first=e.runtime.features.confirmDelete(opened.session.token);
  assert.equal((await e.runtime.features.confirmDelete(opened.session.token)).ok,false);
  assert.equal((await first).ok,true);
  const saved=e.runtime.getSnapshot().session.saved,layout={...before.canvas.layout};delete layout[id];
  assert.equal(saved.revision,before.revision+1);assert.equal(saved.cards.length,before.cards.length-1);
  assert.deepEqual(saved.cards,before.cards.filter(c=>c.id!==id));assert.deepEqual(saved.canvas,{...before.canvas,layout});
  const bytes=[...e.data.entries()];assert.equal(e.runtime.features.openDelete(id).ok,false);
  assert.equal((await e.runtime.features.confirmDelete(opened.session.token)).ok,false);assert.deepEqual([...e.data.entries()],bytes);
  const fresh=e.factory();await fresh.commands.initialize();assert.deepEqual(fresh.getSnapshot().session.saved,saved);
});
test('Delete rejects dirty canvas, v1 and stale revision before writing',async()=>{
  const v1=environment(false);await v1.runtime.commands.initialize();assert.equal(v1.runtime.features.openDelete(v1.cards[0].id).ok,false);
  const {e,id}=await savedMember(),opened=e.runtime.features.openDelete(id),state=e.runtime.getSnapshot();
  const changed=JSON.parse(JSON.stringify(state.session.saved));changed.canvas.layout[id].row+=10;
  e.runtime.commands.updateDraft(state.state.generation,changed);
  assert.equal(e.runtime.features.openDelete(id).ok,false);
  let bytes=[...e.data.entries()];assert.equal((await e.runtime.features.confirmDelete(opened.session.token)).ok,false);assert.deepEqual([...e.data.entries()],bytes);
  await e.runtime.commands.save(state.state.generation);
  const stale=e.runtime.features.openDelete(id),next=JSON.parse(JSON.stringify(e.runtime.getSnapshot().session.saved));next.canvas.layout[id].row+=10;
  assert.equal(e.runtime.commands.updateDraft(e.runtime.getSnapshot().state.generation,next).ok,true);assert.equal((await e.runtime.commands.save(e.runtime.getSnapshot().state.generation)).ok,true);
  bytes=[...e.data.entries()];assert.equal((await e.runtime.features.confirmDelete(stale.session.token)).ok,false);assert.deepEqual([...e.data.entries()],bytes);

});
test('Delete write failure retains committed card and rejects retry without replacing prior snapshot',async()=>{
  const {e,id}=await savedMember(),before=JSON.stringify(e.runtime.getSnapshot().session.saved),opened=e.runtime.features.openDelete(id);
  e.failWrite('bemem-wallet-v2');const result=await e.runtime.features.confirmDelete(opened.session.token);
  assert.equal(result.ok,false);assert.equal(result.requiresReinspection,true);
  assert.equal(JSON.stringify(e.runtime.getSnapshot().session.saved),before);assert.equal(e.runtime.getSnapshot().state.editsAllowed,false);
  const bytes=[...e.data.entries()];assert.equal((await e.runtime.features.confirmDelete(opened.session.token)).ok,false);assert.deepEqual([...e.data.entries()],bytes);
});
test('Delete commit uncertainty never claims success; explicit reinspection reads committed removal without retry',async()=>{
  const {e,id}=await savedMember(),opened=e.runtime.features.openDelete(id),revision=e.runtime.getSnapshot().state.revision+1;
  e.failRead(`bemem-wallet-v2/wallet-${String(revision).padStart(16,'0')}`);
  const result=await e.runtime.features.confirmDelete(opened.session.token);
  assert.equal(result.ok,false);assert.equal(result.requiresReinspection,true);assert.equal(e.runtime.getSnapshot().state.failure.kind,'commit_uncertain');
  const count=writes(e).length,bytes=[...e.data.entries()];assert.equal((await e.runtime.features.confirmDelete(opened.session.token)).ok,false);
  assert.deepEqual([...e.data.entries()],bytes);await e.runtime.commands.reconcile();
  assert.equal(e.runtime.getSnapshot().session.saved.cards.some(c=>c.id===id),false);assert.equal(writes(e).length,count);
});
test('Delete respects pending transaction gate and leaves committed snapshot unchanged',async()=>{
  const {e,id}=await savedMember(),opened=e.runtime.features.openDelete(id),saved=JSON.stringify(e.runtime.getSnapshot().session.saved);
  e.data.set('documents/bemem-wallet-v2/wallet-0000000000000099.other.pending','synthetic pending');
  const bytes=[...e.data.entries()],result=await e.runtime.features.confirmDelete(opened.session.token);
  assert.equal(result.ok,false);assert.equal(result.requiresReinspection,true);assert.equal(e.runtime.getSnapshot().state.failure.kind,'pending');
  assert.equal(JSON.stringify(e.runtime.getSnapshot().session.saved),saved);assert.deepEqual([...e.data.entries()],bytes);
});
function deleteDetail(e,id) {
  const view=environment(true,true,true);let closed=0;
  const card=e.runtime.getSnapshot().session.saved.cards.find(c=>c.id===id);
  const render=(fromCreate=true)=>view.render('src/components/bemem/MembershipCardDetail.tsx','MembershipCardDetail',{
    card,fromCreate,editCommands:e.runtime.features,onClose(){closed++;},
  });
  return {view,render,closed:()=>closed};
}
test('Actual Delete UI is Create-only, requires confirmation and defaults to Cancel without writing',async()=>{
  const {e,id}=await savedMember(),host=deleteDetail(e,id),bytes=[...e.data.entries()];
  assert.equal(nodes(host.render(false)).some(n=>n.props?.accessibilityLabel==='Delete Card'),false);
  control(host.render(),'Delete Card').props.onPress();assert.equal(host.view.alerts.length,0);
  const dialog=confirmation(host.render());assert.equal(dialog.title,'Delete this card?');assert.match(dialog.description,/permanently removed/);
  assert.equal(dialog.actions[0].label,'Cancel');assert.equal(dialog.actions[0].role,'primary');assert.equal(dialog.actions[1].label,'Delete Card');assert.equal(dialog.actions[1].role,'destructive');
  assert.deepEqual([...e.data.entries()],bytes);dialog.actions[0].onPress();dialog.actions[1].onPress();await Promise.resolve();
  assert.deepEqual([...e.data.entries()],bytes);assert.equal(host.closed(),0);
  control(host.render(),'Delete Card').props.onPress();confirmation(host.render()).onDismiss();assert.deepEqual([...e.data.entries()],bytes);
});
test('Actual Delete UI blocks duplicate confirmation/Back until readback, then closes once',async()=>{
  const {e,id}=await savedMember(),host=deleteDetail(e,id);
  control(host.render(),'Delete Card').props.onPress();const confirm=confirmation(host.render()).actions[1];confirm.onPress();confirm.onPress();
  const tree=host.render();assert.equal(control(tree,'Delete Card').props.disabled,true);control(tree,'Close').props.onPress();
  assert.equal(host.closed(),0);await until(()=>host.closed()===1);
  assert.equal(e.runtime.getSnapshot().session.saved.cards.some(c=>c.id===id),false);
});
test('Actual Delete UI reports failure and stays open without enabling retry or false success',async()=>{
  const {e,id}=await savedMember(),host=deleteDetail(e,id);control(host.render(),'Delete Card').props.onPress();
  e.failWrite('bemem-wallet-v2');confirmation(host.render()).actions[1].onPress();
  await until(()=>nodes(host.render()).some(n=>n.props?.accessibilityRole==='alert'));
  assert.equal(host.closed(),0);assert.equal(control(host.render(),'Delete Card').props.disabled,true);
  assert.ok(e.runtime.getSnapshot().session.saved.cards.some(c=>c.id===id));
  const bytes=[...e.data.entries()];control(host.render(),'Delete Card').props.onPress();assert.deepEqual([...e.data.entries()],bytes);
});
test('Home/Create presentation retains in-flight Detail, then removes deleted card from Canvas and Search after readback',async()=>{
  const {e,id}=await savedMember(),view=environment(true);view.setRuntime(e.runtime);
  const render=()=>view.render('src/app/index.tsx','default');let tree=render();
  nodes(tree).find(n=>n.type==='ContextualFooter').props.onCreate();tree=render();
  let canvas=nodes(tree).find(n=>n.type==='WalletCanvas');assert.equal(canvas.props.editing,true);
  canvas.props.onOpen(canvas.props.cards.find(c=>c.id===id));tree=render();assert.equal(nodes(tree).find(n=>n.type==='CardPreview').props.membership.id,id);
  const opened=e.runtime.features.openDelete(id),saving=e.runtime.features.confirmDelete(opened.session.token);
  tree=render();assert.equal(nodes(tree).find(n=>n.type==='CardPreview').props.membership.id,id);
  assert.equal((await saving).ok,true);tree=render();
  assert.equal(nodes(tree).find(n=>n.type==='WalletCanvas').props.cards.some(c=>c.id===id),false);
  const preview=nodes(tree).find(n=>n.type==='CardPreview');assert.equal(preview.props.card,null);assert.equal(preview.props.membership,null);preview.props.onClose();
  tree=render();assert.equal(nodes(tree).find(n=>n.type==='CardPreview').props.card,null);
  nodes(tree).find(n=>n.type==='ContextualFooter').props.onHome();tree=render();
  nodes(tree).find(n=>n.type==='HomeHeader').props.onSearch();tree=render();
  nodes(tree).find(n=>n.type==='SearchField').props.onChange('Synthetic card-landscape');tree=render();
  assert.equal(nodes(tree).find(n=>n.type==='WalletCanvas').props.cards.some(c=>c.id===id),false);
});

test('Old-generation Delete consent is rejected even when revision and saved card are unchanged',async()=>{
  const {e,id}=await savedMember();let snapshot=e.runtime.getSnapshot();
  const features=e.load('src/lib/wallet-feature-commands.ts').createWalletFeatureCommands({getSnapshot:()=>snapshot,
    commands:{updateDraft(){assert.fail('Stale consent must never update draft');},save(){assert.fail('Stale consent must never save');}}});
  const opened=features.openDelete(id);assert.equal(opened.ok,true);
  snapshot={...snapshot,state:{...snapshot.state,generation:snapshot.state.generation+1}};
  assert.equal((await features.confirmDelete(opened.session.token)).ok,false);
});

test('Deleting the last real membership leaves an empty wallet and retains Home Create action without demos',async()=>{
  const e=environment(true,false);await e.runtime.commands.initialize();
  const preset=e.load('src/lib/card-size-presets.ts').CARD_SIZE_PRESETS.find(p=>p.id==='card-landscape'),[v,p]=fields(e,preset);
  const added=e.runtime.features.add(e.runtime.features.begin(),v,p);assert.equal(added.ok,true);
  await e.runtime.commands.save(e.runtime.getSnapshot().state.generation);
  const opened=e.runtime.features.openDelete(added.card.id);assert.equal((await e.runtime.features.confirmDelete(opened.session.token)).ok,true);
  assert.deepEqual(e.runtime.getSnapshot().session.saved.cards,[]);assert.deepEqual(e.runtime.getSnapshot().session.saved.canvas.layout,{});
  const view=environment(true,false);view.setRuntime(e.runtime);const tree=view.render('src/app/index.tsx','default');
  const actions=nodes(tree).find(n=>n.type==='ContextualFooter');assert.equal(actions.props.mode,'Home');assert.equal(typeof actions.props.onCreate,'function');
  const fresh=e.factory();await fresh.commands.initialize();assert.deepEqual(fresh.getSnapshot().session.saved.cards,[]);
});
function syntheticArtwork(e,id='front') {
 const text='synthetic-image-'+id,assetId=`art-${id}.jpg`;
 e.dirs.add('documents/bemem-card-artwork');e.data.set('documents/bemem-card-artwork/'+assetId,text);
 return {assetId,width:1200,height:800,byteLength:Buffer.byteLength(text),md5:require('node:crypto').createHash('md5').update(text).digest('hex'),crop:{x:.5,y:.5,zoom:1}};
}

test('Production Add/Edit footers keep Cancel left and primary right in one flexible row; Delete remains separate',async()=>{
 const {e,id}=await savedMember(),view=environment(true,true,true),card=e.runtime.getSnapshot().session.saved.cards.find(c=>c.id===id),opened=e.runtime.features.openEdit(id);
 const edit=view.render('src/components/bemem/EditMembershipCardEditor.tsx','EditMembershipCardEditor',{commands:e.runtime.features,session:opened.session,card,onClose(){},onSaved(){},onDeleted(){}});
 const addView=environment(true,false,true),add=addView.render('src/components/bemem/AddCardEditor.tsx','AddCardEditor',{commands:e.runtime.features,background:null,onClose(){},onAdded(){},disabled:false,v2Active:true});
 for(const [tree,primary,cancel]of [[edit,'Save membership changes','Cancel editing card'],[add,'Add Card to Arrange draft','Cancel adding card']]){
  const footer=tree.props.footer,row=footer.props.children[0];assert.equal(row.type,'View');assert.equal(row.props.style.flexDirection,'row');assert.ok(row.props.style.gap>=8);
  const buttons=row.props.children;assert.deepEqual(buttons.map(b=>b.props.accessibilityLabel),[cancel,primary]);
  for(const button of buttons){assert.equal(button.props.style.flex,1);assert.ok(button.props.style.minHeight>=48);assert.equal(button.props.style.minWidth,0);}
  assert.equal(nodes(row).some(n=>n.props?.accessibilityLabel==='Delete Card'),false);
 }
});

test('Explicit Edit Save removes only obsolete brands from active snapshot, verifies readback and retains prior revision bytes',async()=>{
 const {e,id}=await savedMember(),state=e.runtime.getSnapshot();
 const seeded=JSON.parse(JSON.stringify(state.session.saved)), selected=seeded.cards.find(c=>c.id===id);
 selected.brandId='lotus';selected.brandQuery='Obsolete selection';selected.name='User Name stays';
 const other={...JSON.parse(JSON.stringify(selected)),id:'synthetic-other',name:'Other Name',brandId:'ptt'};
 seeded.cards.push(other);seeded.canvas.layout[other.id]={col:0,row:80};
 assert.equal(e.runtime.commands.updateDraft(state.state.generation,seeded).ok,true);
 assert.equal((await e.runtime.commands.save(state.state.generation)).ok,true);
 const before=JSON.parse(JSON.stringify(e.runtime.getSnapshot().session.saved));
 const committed=[...e.data.entries()].filter(([k])=>/bemem-wallet-v2\/wallet-\d+\.json$/.test(k));
 const opened=e.runtime.features.openEdit(id),bytes=[...e.data.entries()];
 e.runtime.features.cancelEdit(opened.session.token);assert.deepEqual([...e.data.entries()],bytes);
 const session=e.runtime.features.openEdit(id),form=e.load('src/lib/card-editor-state.ts').membershipEditorState(before.cards.find(c=>c.id===id));
 form.values.memberNumber=' 000New Ab C ';form.values.payload=' 000New Ab C ';
 const result=await e.runtime.features.saveEdit(session.session.token,{name:form.values.name,memberNumber:form.values.memberNumber,expiryMonth:form.presentation.expiryMonth},form);
 assert.equal(result.ok,true);
 const after=e.runtime.getSnapshot().session.saved, cleaned=e.load('src/lib/card-presentation.ts').withoutObsoleteBrands(before);
 assert.deepEqual(after.canvas,before.canvas);assert.equal(after.cards.length,before.cards.length);
 for(const card of after.cards.filter(c=>c.kind==='membership')){assert.equal(Object.hasOwn(card,'brandId'),false);assert.equal(Object.hasOwn(card,'brandQuery'),false);}
 assert.deepEqual(after.cards.filter(c=>c.id!==id),cleaned.cards.filter(c=>c.id!==id));
 const updated=after.cards.find(c=>c.id===id);assert.equal(updated.name,'User Name stays');assert.equal(updated.memberNumber,' 000New Ab C ');assert.deepEqual(updated.appearance,selected.appearance);
 for(const [key,text] of committed)assert.equal(e.data.get(key),text);
 const fresh=e.factory();await fresh.commands.initialize();assert.deepEqual(fresh.getSnapshot().session.saved,after);
});

test('Brand cleanup failure retains previous committed snapshot and never retries automatically',async()=>{
 const {e,id}=await savedMember(),state=e.runtime.getSnapshot(),seeded=JSON.parse(JSON.stringify(state.session.saved));
 seeded.cards.find(c=>c.id===id).brandId='ptt';seeded.cards.find(c=>c.id===id).brandQuery='Old brand';
 e.runtime.commands.updateDraft(state.state.generation,seeded);assert.equal((await e.runtime.commands.save(state.state.generation)).ok,true);
 const before=JSON.parse(JSON.stringify(e.runtime.getSnapshot().session.saved)),opened=e.runtime.features.openEdit(id);
 const form=e.load('src/lib/card-editor-state.ts').membershipEditorState(before.cards.find(c=>c.id===id));form.values.name='Changed';
 e.failWrite('bemem-wallet-v2');const result=await e.runtime.features.saveEdit(opened.session.token,{name:'Changed',memberNumber:form.values.memberNumber,expiryMonth:form.presentation.expiryMonth},form);
 assert.equal(result.ok,false);assert.deepEqual(e.runtime.getSnapshot().session.saved,before);
 const count=writes(e).length;assert.equal((await e.runtime.features.saveEdit(opened.session.token,opened.session.values,form)).ok,false);assert.equal(writes(e).length,count);
});
for(const presetId of ['photo-landscape','photo-portrait','mini-landscape','card-landscape','voucher-landscape','boarding-pass-landscape','mini-portrait','card-portrait','vaccine-passport-portrait'])test(`Full Edit saves all controls and artwork using original ID across ${presetId}`,async()=>{
 const {e,id}=await savedMember(),before=JSON.parse(JSON.stringify(e.runtime.getSnapshot().session.saved));
 const original=before.cards.find(c=>c.id===id),form=e.load('src/lib/card-editor-state.ts').membershipEditorState(original),preset=e.load('src/lib/card-size-presets.ts').cardSizePreset(presetId);
 const front=syntheticArtwork(e,'front'),back=syntheticArtwork(e,'back');
 Object.assign(form.values,{name:'Full editor synthetic',memberNumber:' 000Edited AB ',payload:' 00Payload Ab ',orientation:preset.orientation,colorId:'leaf'});
 Object.assign(form.presentation,{sizePresetId:preset.id,brandId:'lotus',brandQuery:"Lotus's",expiryMonth:'2032-12',gradientPresetId:'ptt',artwork:{front,back}});
 const opened=e.runtime.features.openEdit(id),review=e.runtime.features.reviewEdit(opened.session.token,form);assert.equal(review.ok,true);
 const result=await e.runtime.features.saveEdit(opened.session.token,{name:form.values.name,memberNumber:form.values.memberNumber,expiryMonth:form.presentation.expiryMonth},{...form,acceptedPosition:review.position});assert.equal(result.ok,true);
 const saved=e.runtime.getSnapshot().session.saved,card=saved.cards.find(c=>c.id===id);
 assert.equal(card.sizePresetId,preset.id);assert.equal(card.widthBlocks,preset.ratioWidth);assert.equal(card.heightBlocks,preset.ratioHeight);assert.equal(card.payload,' 000Edited AB ');
 assert.deepEqual(card.appearance.artwork,{front,back});assert.equal(card.appearance.gradientPresetId,original.appearance.gradientPresetId);assert.equal(card.appearance.backgroundColor,original.appearance.backgroundColor);assert.equal(Object.hasOwn(card,'brandId'),false); assert.equal(Object.hasOwn(card,'brandQuery'),false);
 assert.equal(saved.cards.length,before.cards.length);assert.deepEqual(saved.cards.filter(c=>c.id!==id),before.cards.filter(c=>c.id!==id));
 for(const other of before.cards.filter(c=>c.id!==id))assert.deepEqual(saved.canvas.layout[other.id],before.canvas.layout[other.id]);
 const fresh=e.factory();await fresh.commands.initialize();assert.deepEqual(fresh.getSnapshot().session.saved,saved);
 e.load('src/lib/card-artwork-store.ts').deviceArtworkStore.verifyWallet(fresh.getSnapshot().session.saved);
});
test('Add with gallery-style Front/Back references reaches one saved card and restart without storing temporary URIs',async()=>{
 const e=environment(true,false);await e.runtime.commands.initialize();const preset=e.load('src/lib/card-size-presets.ts').CARD_SIZE_PRESETS.find(p=>p.id==='card-landscape'),[v,p]=fields(e,preset);
 p.artwork={front:syntheticArtwork(e,'added-front'),back:syntheticArtwork(e,'added-back')};
 const token=e.runtime.features.begin(),added=e.runtime.features.add(token,v,p);assert.equal(added.ok,true);
 assert.equal(e.runtime.features.add(token,v,p).ok,false);assert.equal((await e.runtime.commands.save(e.runtime.getSnapshot().state.generation)).ok,true);
 const fresh=e.factory();await fresh.commands.initialize();const saved=fresh.getSnapshot().session.saved;
 assert.equal(saved.cards.length,1);assert.deepEqual(saved.cards[0].appearance.artwork,p.artwork);
 assert.equal(JSON.stringify(saved).includes('file:///'),false);assert.equal(JSON.stringify(saved).includes('base64'),false);
});
test('Full Edit replacement keeps old image; failed Wallet Save preserves old committed card and all original files',async()=>{
 const {e,id}=await savedMember(),first=syntheticArtwork(e,'old-image');
 let state=e.runtime.getSnapshot(),doc=JSON.parse(JSON.stringify(state.session.saved));doc.cards.find(c=>c.id===id).appearance.artwork={front:first};
 e.runtime.commands.updateDraft(state.state.generation,doc);await e.runtime.commands.save(state.state.generation);
 const before=JSON.stringify(e.runtime.getSnapshot().session.saved),oldBytes=e.data.get('documents/bemem-card-artwork/'+first.assetId);
 const card=e.runtime.getSnapshot().session.saved.cards.find(c=>c.id===id),form=e.load('src/lib/card-editor-state.ts').membershipEditorState(card);
 const replacement=syntheticArtwork(e,'replacement');form.presentation.artwork={front:replacement};const opened=e.runtime.features.openEdit(id);
 e.failWrite('bemem-wallet-v2');const result=await e.runtime.features.saveEdit(opened.session.token,opened.session.values,form);
 assert.equal(result.ok,false);assert.equal(result.requiresReinspection,true);assert.equal(JSON.stringify(e.runtime.getSnapshot().session.saved),before);
 assert.equal(e.data.get('documents/bemem-card-artwork/'+first.assetId),oldBytes);assert.ok(e.data.has('documents/bemem-card-artwork/'+replacement.assetId));
 const bytes=[...e.data.entries()];assert.equal((await e.runtime.features.saveEdit(opened.session.token,opened.session.values,form)).ok,false);assert.deepEqual([...e.data.entries()],bytes);
});
test('Missing or corrupted artwork prevents Wallet write and never confirms Save',async()=>{
 const {e,id}=await savedMember(),before=JSON.stringify(e.runtime.getSnapshot().session.saved),image=syntheticArtwork(e,'corrupt');
 const form=e.load('src/lib/card-editor-state.ts').membershipEditorState(e.runtime.getSnapshot().session.saved.cards.find(c=>c.id===id));
 form.presentation.artwork={front:image};e.data.set('documents/bemem-card-artwork/'+image.assetId,'bad');
 const opened=e.runtime.features.openEdit(id),count=writes(e).length,result=await e.runtime.features.saveEdit(opened.session.token,opened.session.values,form);
 assert.equal(result.ok,false);assert.equal(JSON.stringify(e.runtime.getSnapshot().session.saved),before);assert.equal(writes(e).length,count);
});
async function adjacentMembers(){
 const e=environment(true,false);await e.runtime.commands.initialize();const preset=e.load('src/lib/card-size-presets.ts').CARD_SIZE_PRESETS.find(p=>p.id==='card-landscape'),[v,p]=fields(e,preset);
 const first=e.runtime.features.add(e.runtime.features.begin(),v,p),other=e.runtime.features.add(e.runtime.features.begin(),{...v,name:'Other'},p);
 await e.runtime.commands.save(e.runtime.getSnapshot().state.generation);return{e,id:first.card.id,other:other.card.id};
}
test('Resize collision proposes relocation, rejects Save without consent and never moves another card',async()=>{
 const {e,id,other}=await adjacentMembers(),saved=e.runtime.getSnapshot().session.saved,before=JSON.stringify(saved);
 const form=e.load('src/lib/card-editor-state.ts').membershipEditorState(saved.cards.find(c=>c.id===id));form.presentation.sizePresetId='boarding-pass-landscape';
 const opened=e.runtime.features.openEdit(id),review=e.runtime.features.reviewEdit(opened.session.token,form);assert.equal(review.ok,true);assert.equal(review.moved,true);
 const bytes=[...e.data.entries()];assert.equal((await e.runtime.features.saveEdit(opened.session.token,opened.session.values,form)).ok,false);
 assert.equal(JSON.stringify(e.runtime.getSnapshot().session.saved),before);assert.deepEqual([...e.data.entries()],bytes);
 assert.equal((await e.runtime.features.saveEdit(opened.session.token,opened.session.values,{...form,acceptedPosition:review.position})).ok,true);
 assert.deepEqual(e.runtime.getSnapshot().session.saved.canvas.layout[other],saved.canvas.layout[other]);
 assert.deepEqual(e.runtime.getSnapshot().session.saved.canvas.layout[id],review.position);
});
test('Actual shared Edit form exposes all controls and Resize Cancel does not write; accepted relocation uses existing Save',async()=>{
 const {e,id}=await adjacentMembers(),card=e.runtime.getSnapshot().session.saved.cards.find(c=>c.id===id),opened=e.runtime.features.openEdit(id),view=environment(true,true,true);let completed=0;
 const render=()=>view.render('src/components/bemem/EditMembershipCardEditor.tsx','EditMembershipCardEditor',{commands:e.runtime.features,session:opened.session,card,onClose(){},onSaved(){completed++;}});
 let form=sharedForm(render());assert.equal(form.fullEditing,true);form.onPresentationChange({...form.presentation,sizePresetId:'boarding-pass-landscape'});
 const bytes=[...e.data.entries()],review=e.runtime.features.reviewEdit(opened.session.token,{values:form.values,presentation:{...form.presentation,sizePresetId:'boarding-pass-landscape'}});assert.equal(review.ok,true);
 control(render(),'Save membership changes').props.onPress();assert.equal(view.alerts.length,0);const request=sheetConfirmationRequest(render());assert.equal(request.title,'Move resized card?');assert.ok(request.description.includes(`column ${review.position.col+1}, row ${review.position.row+1}`));assert.deepEqual(request.actions.map(a=>[a.label,a.role]),[['Cancel','neutral'],['Move and Save','primary']]);
 sheetConfirmationRequest(render()).actions.find(a=>a.label==='Cancel').onPress();assert.deepEqual([...e.data.entries()],bytes);assert.equal(completed,0);
 control(render(),'Save membership changes').props.onPress();sheetConfirmationRequest(render()).actions.find(a=>a.label==='Move and Save').onPress();await until(()=>completed===1);
 assert.equal(e.runtime.getSnapshot().session.saved.cards.find(c=>c.id===id).sizePresetId,'boarding-pass-landscape');
});
test('Artwork post-commit readback failure is uncertain, never success, and explicit reinspection does not repeat Save',async()=>{
 const {e,id}=await savedMember(),card=e.runtime.getSnapshot().session.saved.cards.find(c=>c.id===id),form=e.load('src/lib/card-editor-state.ts').membershipEditorState(card);
 form.presentation.artwork={front:syntheticArtwork(e,'post-readback')};
 const store=e.load('src/lib/card-artwork-store.ts').deviceArtworkStore,verify=store.verifyWallet;let checks=0;
 store.verifyWallet=doc=>{verify(doc);if(++checks===2)throw Error('synthetic image readback failure');};
 const opened=e.runtime.features.openEdit(id),result=await e.runtime.features.saveEdit(opened.session.token,opened.session.values,form);
 assert.equal(result.ok,false);assert.equal(result.requiresReinspection,true);assert.equal(e.runtime.getSnapshot().state.failure.kind,'commit_uncertain');
 const count=writes(e).length;assert.equal((await e.runtime.features.saveEdit(opened.session.token,opened.session.values,form)).ok,false);
 store.verifyWallet=verify;await e.runtime.commands.reconcile();assert.equal(writes(e).length,count);assert.deepEqual(e.runtime.getSnapshot().session.saved.cards.find(c=>c.id===id).appearance.artwork,form.presentation.artwork);
});
test('Full Edit artwork Cancel preserves committed data and old asset without any Wallet write',async()=>{
 const {e,id}=await savedMember(),card=e.runtime.getSnapshot().session.saved.cards.find(c=>c.id===id),opened=e.runtime.features.openEdit(id),view=environment(true,true,true);
 const image=syntheticArtwork(e,'cancelled-picture'),bytes=[...e.data.entries()];let closed=0;
 const render=()=>view.render('src/components/bemem/EditMembershipCardEditor.tsx','EditMembershipCardEditor',{commands:e.runtime.features,session:opened.session,card,onClose(){closed++;},onSaved(){assert.fail('Cancel never saves');}});
 const form=sharedForm(render());form.onPresentationChange({...form.presentation,artwork:{front:image}});
 control(render(),'Cancel editing card').props.onPress();assert.equal(closed,0);sheetConfirmationRequest(render()).actions.find(a=>a.label==='Discard Changes').onPress();assert.equal(closed,1);assert.deepEqual([...e.data.entries()],bytes);
 assert.equal(e.runtime.getSnapshot().session.saved.cards.find(c=>c.id===id).appearance.artwork,undefined);
});
test('Add artwork Cancel confirms unsaved form and never adds a card or writes Wallet JSON',async()=>{
 const e=environment(true,false);await e.runtime.commands.initialize();const view=environment(true,false),image=syntheticArtwork(e,'cancel-add'),bytes=[...e.data.entries()];let closed=0;
 const render=()=>view.render('src/components/bemem/AddCardEditor.tsx','AddCardEditor',{commands:e.runtime.features,background:null,onClose(){closed++;},onAdded(){assert.fail('Cancel never adds');},disabled:false,v2Active:true});
 const tree=render(),form=sharedForm(tree);form.onPresentationChange({...form.presentation,artwork:{front:image}});
 control(render(),'Cancel adding card').props.onPress();assert.equal(closed,0);assert.equal(view.alerts.length,0);sheetConfirmationRequest(render()).actions[1].onPress();assert.equal(closed,1);
 assert.deepEqual([...e.data.entries()],bytes);assert.deepEqual(e.runtime.getSnapshot().session.saved.cards,[]);
});
test('Arrange Detail has left borderless Delete and primary Edit; editor has no Delete entry',async()=>{
 const {e,id}=await savedMember(),host=deleteDetail(e,id),bytes=[...e.data.entries()];let tree=host.render();
 const row=nodes(tree).find(n=>n.props?.testID==='card-detail-actions');assert.ok(row);assert.equal(nodes(row)[1].props.accessibilityLabel,'Delete Card');assert.equal(control(tree,'Edit Card').props.kind,'action');assert.equal(control(tree,'Delete Card').props.style.minHeight,48);assert.equal(control(tree,'Delete Card').props.style.backgroundColor,undefined);
 const header=nodes(tree).find(n=>n.props?.style?.marginBottom===16);assert.equal(nodes(header).some(n=>n.props?.accessibilityLabel==='Edit Card'),false);
 control(tree,'Edit Card').props.onPress();tree=host.render();assert.equal(tree.type.name,'EditMembershipCardEditor');
 const editor=environment(true,true,true),render=()=>editor.render('src/components/bemem/EditMembershipCardEditor.tsx','EditMembershipCardEditor',tree.props);const form=sharedForm(render());form.onChange({...form.values,name:'Unsaved input'});
 assert.equal(nodes(render()).some(n=>n.props?.accessibilityLabel==='Delete Card'),false);assert.equal(sharedForm(render()).values.name,'Unsaved input');assert.deepEqual([...e.data.entries()],bytes);
});

test('Arrange Detail Delete closes only after readback and preserves other cards and positions',async()=>{
 const {e,id}=await savedMember(),host=deleteDetail(e,id),before=JSON.parse(JSON.stringify(e.runtime.getSnapshot().session.saved));
 control(host.render(),'Delete Card').props.onPress();confirmation(host.render()).actions[1].onPress();assert.equal(host.closed(),0);await until(()=>host.closed()===1);
 const saved=e.runtime.getSnapshot().session.saved;assert.deepEqual(saved.cards,before.cards.filter(c=>c.id!==id));for(const other of saved.cards)assert.deepEqual(saved.canvas.layout[other.id],before.canvas.layout[other.id]);
});

test('Delete uncertainty in Detail blocks Edit/Delete until wallet reinspection',async()=>{
 const {e,id}=await savedMember(),host=deleteDetail(e,id),revision=e.runtime.getSnapshot().state.revision+1;
 control(host.render(),'Delete Card').props.onPress();
 e.failRead(`bemem-wallet-v2/wallet-${String(revision).padStart(16,'0')}`);confirmation(host.render()).actions[1].onPress();
 await until(()=>nodes(host.render()).some(n=>n.props?.accessibilityRole==='alert'));
 const tree=host.render();assert.equal(host.closed(),0);
 assert.equal(control(tree,'Delete Card').props.disabled,true);assert.equal(control(tree,'Edit Card').props.disabled,true);
 const count=writes(e).length;control(tree,'Delete Card').props.onPress();control(tree,'Edit Card').props.onPress();assert.equal(writes(e).length,count);
});
test('Production Add Card never exposes Delete even when the wallet supports deletion',async()=>{
 const e=environment(true,false);await e.runtime.commands.initialize();const view=environment(true,false);
 const tree=view.render('src/components/bemem/AddCardEditor.tsx','AddCardEditor',{commands:e.runtime.features,background:null,onClose(){},onAdded(){},disabled:false,v2Active:true});
 assert.equal(nodes(tree).some(n=>n.props?.accessibilityLabel==='Delete Card'),false);
});


test('Ordinary inline Card Detail closes before one Footer navigation intent, rejecting double taps and stale generations',async()=>{
 for(const stale of [false,true]){
  const {e,id}=await savedMember(),view=environment(true);view.setRuntime(e.runtime);
  const render=()=>view.render('src/app/index.tsx','default');let tree=render();
  const saved=JSON.stringify(e.runtime.getSnapshot().session.saved),count=writes(e).length;
  nodes(tree).find(n=>n.type==='WalletCanvas').props.onOpen(nodes(tree).find(n=>n.type==='WalletCanvas').props.cards.find(c=>c.id===id));tree=render();
  const preview=nodes(tree).find(n=>n.type==='CardPreview'),footer=nodes(tree).find(n=>n.type==='ContextualFooter');assert.equal(preview.props.presentation,'inline');assert.equal(preview.props.membership.id,id);assert.equal(footer.props.disabled,false);
  footer.props.onCreate();footer.props.onDecorate();assert.equal(nodes(tree).find(n=>n.type==='WalletCanvas').props.editing,false);
  // A synthetic newer session read invalidates this pending UI callback without writing data.
  if(stale)view.setRuntime({...e.runtime,getSnapshot(){const state=e.runtime.getSnapshot();return{...state,state:{...state.state,generation:state.state.generation+1}};}});
  tree=render();assert.equal(nodes(tree).find(n=>n.type==='CardPreview').props.card,null);tree=render();
  assert.equal(nodes(tree).some(n=>n.type==='DecorateMode'),false);assert.equal(JSON.stringify(e.runtime.getSnapshot().session.saved),saved);assert.equal(writes(e).length,count);
  assert.equal(nodes(tree).find(n=>n.type==='WalletCanvas').props.editing,!stale);
 }
});
test('Inline Home Detail and Folder presentation keep Header/Footer siblings and Home closes without changing current page or storage',async()=>{
 const {e,id}=await savedMember(),view=environment(true);view.setRuntime(e.runtime);const render=()=>view.render('src/app/index.tsx','default');let tree=render();
 const saved=JSON.stringify(e.runtime.getSnapshot().session.saved),before=writes(e).length;
 let canvas=nodes(tree).find(n=>n.type==='WalletCanvas');canvas.props.onOpen(canvas.props.cards.find(c=>c.id===id));tree=render();
 const preview=nodes(tree).find(n=>n.type==='CardPreview');preview.props.onNavigationBlockedChange(true);tree=render();assert.equal(nodes(tree).find(n=>n.type==='ContextualFooter').props.disabled,true);
 nodes(tree).find(n=>n.type==='CardPreview').props.onNavigationBlockedChange(false);tree=render();nodes(tree).find(n=>n.type==='ContextualFooter').props.onHome();tree=render();tree=render();
 assert.equal(nodes(tree).find(n=>n.type==='CardPreview').props.card,null);assert.equal(nodes(tree).find(n=>n.type==='WalletCanvas').props.editing,false);assert.equal(JSON.stringify(e.runtime.getSnapshot().session.saved),saved);assert.equal(writes(e).length,before);
 // Actual ordinary Membership Detail renders without a native Modal or additional SafeArea.
 const detailEnv=environment(true),card=e.runtime.getSnapshot().session.saved.cards.find(c=>c.id===id);
 const detail=detailEnv.render('src/components/bemem/MembershipCardDetail.tsx','MembershipCardDetail',{card,fromCreate:false,onClose(){},presentation:'inline'});
 assert.equal(detail.type,'View');assert.equal(nodes(detail).some(n=>n.type==='Modal'||n.type==='SafeAreaView'),false);assert.equal(nodes(detail).find(n=>n.props?.testID==='card-detail-sheet').props.accessibilityViewIsModal,false);
});


test('Home Folder Footer stays usable; dismissal precedes Create, and Home from a dirty Create folder keeps Save/Discard/Stay protection',async()=>{
 const {e,id}=await savedMember(),preset=e.load('src/lib/card-size-presets.ts').CARD_SIZE_PRESETS.find(p=>p.id==='card-landscape'),[v,p]=fields(e,preset);
 const added=e.runtime.features.add(e.runtime.features.begin(),v,p);assert.equal(added.ok,true);assert.equal((await e.runtime.commands.save(e.runtime.getSnapshot().state.generation)).ok,true);
 const current=e.runtime.getSnapshot(),doc=e.load('src/lib/group-folder.ts').createGroupFolder(current.session.saved,'synthetic-nav-folder','Navigation test','landscape',[id,added.card.id],1);
 assert.equal(e.runtime.commands.updateDraft(current.state.generation,doc).ok,true);assert.equal((await e.runtime.commands.save(current.state.generation)).ok,true);
 const view=environment(true);view.setRuntime(e.runtime);const render=()=>view.render('src/app/index.tsx','default');let tree=render(),canvas=nodes(tree).find(n=>n.type==='WalletCanvas');
 const saved=JSON.stringify(e.runtime.getSnapshot().session.saved),writeCount=writes(e).length;
 canvas.props.onOpen(canvas.props.cards.find(c=>c.kind==='folder'));tree=render();assert.equal(nodes(tree).find(n=>n.type==='GroupFolderSheet').props.presentation,'inline');assert.equal(nodes(tree).find(n=>n.type==='ContextualFooter').props.disabled,false);
 nodes(tree).find(n=>n.type==='ContextualFooter').props.onCreate();tree=render();tree=render();assert.equal(nodes(tree).some(n=>n.type==='GroupFolderSheet'),false);canvas=nodes(tree).find(n=>n.type==='WalletCanvas');assert.equal(canvas.props.editing,true);
 canvas.props.onMove('synthetic-nav-folder',{col:0,row:30});tree=render();canvas=nodes(tree).find(n=>n.type==='WalletCanvas');canvas.props.onOpen(canvas.props.cards.find(c=>c.kind==='folder'));tree=render();
 nodes(tree).find(n=>n.type==='ContextualFooter').props.onHome();tree=render();tree=render();assert.equal(nodes(tree).some(n=>n.type==='GroupFolderSheet'),false);let dialog=nodes(tree).find(n=>n.type==='UnsavedChangesDialog');assert.equal(dialog.props.visible,true);assert.equal(nodes(tree).find(n=>n.type==='WalletCanvas').props.editing,true);
 dialog.props.onCancel();tree=render();nodes(tree).find(n=>n.type==='HomeHeader').props.onCancel();tree=render();dialog=nodes(tree).find(n=>n.type==='UnsavedChangesDialog');assert.equal(dialog.props.visible,true);dialog.props.onCancel();
 assert.equal(JSON.stringify(e.runtime.getSnapshot().session.saved),saved);assert.equal(writes(e).length,writeCount);assert.equal(e.runtime.pages.current(),1);
});


test('Add Card Modal safe dismissal retains dirty fields on Keep/Back and rejects stale discard and double submit',async()=>{
 const e=await activeV2();e.runtime.commands.updateDraft(e.runtime.getSnapshot().state.generation,e.runtime.getSnapshot().session.draft);
 const editor=environment(true),ref={current:null};editor.setRuntime(e.runtime);let closed=0,stayed=0,added=0;
 const props={commands:e.runtime.features,background:null,ref,disabled:false,v2Active:true,onClose(){closed++;},onAdded(){added++;}};
 const render=()=>editor.render('src/components/bemem/AddCardEditor.tsx','AddCardEditor',props);
 let tree=render(),form=nodes(tree).find(n=>n.type==='AddCardForm');const input={...form.props.values,name:'Keep this typed name',memberNumber:' 00123Ab '};form.props.onChange(input);render();
 const bytes=[...e.data.entries()];assert.equal(ref.current.requestClose(()=>stayed++),true);tree=render();
 const request=tree.props.confirmation.content.props.request;assert.equal(request.title,'Discard changes?');assert.equal(ref.current.requestClose(),false);
 ref.current.back();tree=render();assert.equal(stayed,1);assert.equal(closed,0);assert.deepEqual(nodes(tree).find(n=>n.type==='AddCardForm').props.values,input);
 request.actions[1].onPress();assert.equal(closed,0);assert.deepEqual([...e.data.entries()],bytes);
 assert.equal(ref.current.requestClose(),true);tree=render();const discard=tree.props.confirmation.content.props.request.actions[1].onPress;discard();discard();assert.equal(closed,1);assert.equal(added,0);assert.equal(ref.current.requestClose(),false);assert.deepEqual([...e.data.entries()],bytes);
});
test('Pristine Add Card dismissal writes nothing and native image activity blocks navigation',async()=>{
 const e=await activeV2(),editor=environment(true),ref={current:null};editor.setRuntime(e.runtime);let closed=0;
 const props={commands:e.runtime.features,background:null,ref,disabled:false,v2Active:true,onClose(){closed++;},onAdded(){assert.fail('navigation must not submit');}};
 const render=()=>editor.render('src/components/bemem/AddCardEditor.tsx','AddCardEditor',props);
 let tree=render();const form=nodes(tree).find(n=>n.type==='AddCardForm');const bytes=[...e.data.entries()];
 form.props.onImageBusy(true);render();assert.equal(ref.current.requestClose(),false);assert.equal(closed,0);
 form.props.onImageBusy(false);render();assert.equal(ref.current.requestClose(),true);assert.equal(closed,1);assert.equal(render().props.confirmation,undefined);assert.deepEqual([...e.data.entries()],bytes);
});
test('Covered shared Footer retains guarded programmatic navigation during Add Modal',async()=>{
 const e=await activeV2(),render=()=>e.render('src/app/index.tsx','default');let tree=render();
 nodes(tree).find(n=>n.type==='ContextualFooter').props.onCreate();tree=render();nodes(tree).find(n=>n.type==='ContextualFooter').props.onAdd();tree=render();
 let sheet=nodes(tree).find(n=>n.type==='AddCardEditor');assert.equal(sheet.props.presentation,undefined);
 const footer=nodes(tree).find(n=>n.type==='ContextualFooter');assert.equal(footer.props.disabled,true);assert.equal(nodes(tree).filter(n=>n.type==='ContextualFooter').length,1);assert.equal(nodes(tree).find(n=>n.type==='HomeHeader').props.saveDisabled,true);
 let requested=0,stay;sheet.props.ref.current={requestClose(callback){requested++;stay=callback;return true;},back(){stay?.();}};
 const bytes=[...e.data.entries()];footer.props.onHome();footer.props.onHome();tree=render();assert.equal(requested,1);assert.equal(nodes(tree).find(n=>n.type==='WalletCanvas').props.editing,true);assert.ok(nodes(tree).find(n=>n.type==='AddCardEditor'));
 e.back()();tree=render();assert.equal(nodes(tree).find(n=>n.type==='ContextualFooter').props.disabled,true);assert.ok(nodes(tree).find(n=>n.type==='AddCardEditor'));
 nodes(tree).find(n=>n.type==='ContextualFooter').props.onAdd();assert.equal(requested,1);
 nodes(tree).find(n=>n.type==='ContextualFooter').props.onHome();tree=render();assert.equal(requested,2);assert.equal(nodes(tree).find(n=>n.type==='WalletCanvas').props.editing,true);
 sheet.props.onClose();tree=render();assert.equal(nodes(tree).some(n=>n.type==='AddCardEditor'),false);tree=render();assert.equal(nodes(tree).find(n=>n.type==='WalletCanvas').props.editing,false);assert.deepEqual([...e.data.entries()],bytes);
});


for(const choice of ['save','discard','stay','failure'])test(`Create -> Decorate preserves requested destination through ${choice}, without opening Add Card from a competing tap`,async()=>{
 const e=await activeV2(),render=()=>e.render('src/app/index.tsx','default');let tree=render();
 nodes(tree).find(n=>n.type==='ContextualFooter').props.onCreate();tree=render();
 const canvas=nodes(tree).find(n=>n.type==='WalletCanvas'),id=canvas.props.cards[0].id,original=JSON.parse(JSON.stringify(e.runtime.getSnapshot().session.saved));
 canvas.props.onMove(id,{col:0,row:30});tree=render();const draft=JSON.stringify(e.runtime.getSnapshot().session.draft),footer=nodes(tree).find(n=>n.type==='ContextualFooter');
 footer.props.onDecorate();footer.props.onAdd();tree=render();assert.equal(nodes(tree).some(n=>n.type==='DecorateMode'||n.type==='AddCardEditor'),false);
 const dialog=nodes(tree).find(n=>n.type==='UnsavedChangesDialog');assert.equal(dialog.props.visible,true);
 if(choice==='stay')dialog.props.onCancel();else if(choice==='discard')dialog.props.onDiscard();else{if(choice==='failure')e.failWrite('bemem-wallet-v2');dialog.props.onSave();await new Promise(r=>setImmediate(r));}
 tree=render();assert.equal(nodes(tree).some(n=>n.type==='DecorateMode'),['save','discard'].includes(choice));assert.equal(nodes(tree).some(n=>n.type==='AddCardEditor'),false);
 if(choice==='stay'||choice==='failure'){assert.equal(JSON.stringify(e.runtime.getSnapshot().session.draft),draft);assert.deepEqual(e.runtime.getSnapshot().session.saved,original);}
 if(choice==='discard')assert.deepEqual(e.runtime.getSnapshot().session.saved,original);
 if(choice==='save')assert.deepEqual(e.runtime.getSnapshot().session.saved.canvas.layout[id],{col:0,row:30});
});
test('Home Add Card enters Create directly once; active Create is idempotent and Decorate Add continuation opens existing Modal form',async()=>{
 const e=await activeV2(),render=()=>e.render('src/app/index.tsx','default');let tree=render();const footer=nodes(tree).find(n=>n.type==='ContextualFooter');footer.props.onAdd();footer.props.onAdd();tree=render();
 assert.equal(nodes(tree).filter(n=>n.type==='AddCardEditor').length,1);assert.equal(nodes(tree).find(n=>n.type==='WalletCanvas').props.editing,true);
 nodes(tree).find(n=>n.type==='AddCardEditor').props.onClose();tree=render();const draft=JSON.stringify(e.runtime.getSnapshot().session.draft);nodes(tree).find(n=>n.type==='ContextualFooter').props.onCreate();tree=render();assert.equal(JSON.stringify(e.runtime.getSnapshot().session.draft),draft);
 nodes(tree).find(n=>n.type==='ContextualFooter').props.onDecorate();tree=render();const decorate=nodes(tree).find(n=>n.type==='DecorateMode');assert.ok(decorate);decorate.props.onNavigate('add');tree=render();
 assert.equal(nodes(tree).some(n=>n.type==='DecorateMode'),false);assert.equal(nodes(tree).find(n=>n.type==='AddCardEditor').props.presentation,undefined);assert.equal(nodes(tree).find(n=>n.type==='WalletCanvas').props.editing,true);
});


test('Production Decorate replaces the shell in the same window, reuses its measured width and keeps one active navigation surface',async()=>{
 const e=await activeV2(),render=()=>e.render('src/app/index.tsx','default');let tree=render();
 const shell=nodes(tree).find(n=>n.props?.onLayout);shell.props.onLayout({nativeEvent:{layout:{width:393}}});tree=render();
 const before=JSON.stringify(e.runtime.getSnapshot().session.saved),footer=nodes(tree).find(n=>n.type==='ContextualFooter');footer.props.onDecorate();footer.props.onDecorate();tree=render();
 assert.equal(tree.type,'DecorateMode');assert.equal(tree.props.presentation,'screen');assert.equal(tree.props.availableWidth,393);assert.equal(nodes(tree).some(n=>n.type==='HomeHeader'||n.type==='ContextualFooter'||n.type==='Modal'),false);
 assert.equal(e.back()(),false,'Parent yields Android Back to same-window Decorate');
 const entry=JSON.stringify(e.runtime.getSnapshot().session.draft);tree=render();assert.equal(JSON.stringify(e.runtime.getSnapshot().session.draft),entry);
 tree.props.onNavigate('create');tree=render();assert.equal(nodes(tree).filter(n=>n.type==='ContextualFooter').length,1);assert.equal(nodes(tree).find(n=>n.type==='WalletCanvas').props.editing,true);assert.equal(JSON.stringify(e.runtime.getSnapshot().session.saved),before);
 nodes(tree).find(n=>n.type==='ContextualFooter').props.onDecorate();tree=render();assert.equal(tree.type,'DecorateMode');assert.equal(tree.props.presentation,'screen');
});


test('Android Back dismisses an open Add Card keyboard before invoking form abandonment, without submitting or writing',async()=>{
 const e=await activeV2(),render=()=>e.render('src/app/index.tsx','default');let tree=render();nodes(tree).find(n=>n.type==='ContextualFooter').props.onAdd();tree=render();
 const sheet=nodes(tree).find(n=>n.type==='AddCardEditor');let abandoned=0;sheet.props.ref.current={back(){abandoned++;},requestClose(){assert.fail('Keyboard Back cannot navigate');}};
 const before=[...e.data.entries()];e.setKeyboardVisible(true);assert.equal(e.back()(),true);assert.equal(abandoned,0);tree=render();assert.ok(nodes(tree).find(n=>n.type==='AddCardEditor'));
 assert.equal(e.back()(),true);assert.equal(abandoned,1);assert.deepEqual([...e.data.entries()],before);
});


test('Add Modal covers one non-interactive Footer without changing shell geometry; dismissal restores all five actions and current page',async()=>{
 const e=await activeV2(),render=()=>e.render('src/app/index.tsx','default');let tree=render();
 const footer=nodes(tree).find(n=>n.type==='ContextualFooter'),page=footer.props.page;
 footer.props.onAdd();tree=render();const sheet=nodes(tree).find(n=>n.type==='AddCardEditor');
 const saved=JSON.stringify(e.runtime.getSnapshot().session.saved),bytes=[...e.data.entries()];
 for(const visible of [false,true,false,true]){
  e.setKeyboardVisible(visible);tree=render();const host=nodes(tree).find(n=>n.props?.testID==='shared-footer-host');
  assert.equal(host.props.style,undefined);assert.equal(host.props.pointerEvents,'none');assert.equal(host.props.importantForAccessibility,'no-hide-descendants');
  assert.equal(nodes(tree).filter(n=>n.type==='ContextualFooter').length,1);assert.equal(nodes(tree).find(n=>n.type==='ContextualFooter').props.disabled,true);
  assert.equal(nodes(tree).find(n=>n.type==='AddCardEditor').props.keyboardState,undefined);
 }
 e.setKeyboardVisible(false);sheet.props.onClose();tree=render();const host=nodes(tree).find(n=>n.props?.testID==='shared-footer-host'),restored=nodes(tree).find(n=>n.type==='ContextualFooter');
 assert.equal(host.props.pointerEvents,'auto');assert.equal(restored.props.disabled,false);assert.equal(restored.props.page,page);
 for(const action of ['onCanvasRequest','onDecorate','onHome','onCreate','onAdd'])assert.equal(typeof restored.props[action],'function');
 assert.equal(JSON.stringify(e.runtime.getSnapshot().session.saved),saved);assert.deepEqual([...e.data.entries()],bytes);
});

test('Add Modal re-renders preserve one creation session, exact strings, artwork, Photo size and side without keyboard coordination',async()=>{
 const e=await activeV2(),editor=environment(true);editor.setRuntime(e.runtime);const props={commands:e.runtime.features,background:null,disabled:false,v2Active:true,onClose(){assert.fail('Keyboard must not close');},onAdded(){assert.fail('Keyboard must not add');}};
 const render=()=>editor.render('src/components/bemem/AddCardEditor.tsx','AddCardEditor',props);let tree=render(),form=nodes(tree).find(n=>n.type==='AddCardForm');
 form.props.onChange({...form.props.values,name:'Test สมาชิก',memberNumber:' 00123Ab '});
 form.props.onPresentationChange({...form.props.presentation,sizePresetId:'photo-landscape',side:'back'});
 tree=render();form=nodes(tree).find(n=>n.type==='AddCardForm');const before=JSON.stringify({values:form.props.values,presentation:form.props.presentation}),bytes=[...e.data.entries()];
 for(const visible of [true,true,false,true,false]){
  editor.setKeyboardVisible(visible);tree=render();form=nodes(tree).find(n=>n.type==='AddCardForm');
  assert.equal(tree.props.modalOnly,true);assert.equal(tree.props.presentation,undefined);assert.equal(tree.props.keyboardState,undefined);assert.equal(tree.props.focusedInput,undefined);
  assert.equal(form.props.keyboardFocused,undefined);assert.equal(form.props.onInputFocus,undefined);assert.equal(JSON.stringify({values:form.props.values,presentation:form.props.presentation}),before);
 }
 assert.deepEqual([...e.data.entries()],bytes);
});

for(const id of ['photo-landscape','photo-portrait'])test(`Add ${id} with independent simulated Gallery/Camera sides saves once and reloads exact records`,async()=>{
 const e=environment(true,false);await e.runtime.commands.initialize();const p=e.load('src/lib/card-size-presets.ts').cardSizePreset(id),[values,presentation]=fields(e,p);
 presentation.artwork={front:syntheticArtwork(e,'photo-gallery-front'),back:syntheticArtwork(e,'photo-camera-back')};
 const token=e.runtime.features.begin(),added=e.runtime.features.add(token,values,presentation);assert.equal(added.ok,true);assert.equal(e.runtime.features.add(token,values,presentation).ok,false);
 assert.equal((await e.runtime.commands.save(e.runtime.getSnapshot().state.generation)).ok,true);const saved=e.runtime.getSnapshot().session.saved;assert.equal(saved.cards.length,1);assert.deepEqual(saved.cards[0].appearance.artwork,presentation.artwork);assert.equal(saved.cards[0].id,added.card.id);assert.equal(saved.cards[0].widthBlocks,p.ratioWidth);assert.equal(saved.cards[0].heightBlocks,p.ratioHeight);
 const fresh=e.factory();await fresh.commands.initialize();assert.deepEqual(fresh.getSnapshot().session.saved,saved);
});


test('Production Add and saved-card Edit select the same Modal-only sheet foundation without sharing persistence sessions',async()=>{
 const {e,id}=await savedMember(),before=JSON.stringify(e.runtime.getSnapshot().session.saved),card=e.runtime.getSnapshot().session.saved.cards.find(c=>c.id===id);
 const opened=e.runtime.features.openEdit(id);assert.equal(opened.ok,true);
 const editing=environment(true);editing.setRuntime(e.runtime);
 const edit=editing.render('src/components/bemem/EditMembershipCardEditor.tsx','EditMembershipCardEditor',{commands:e.runtime.features,session:opened.session,card,onClose(){},onSaved(){}});
 const adding=environment(true);adding.setRuntime(e.runtime);
 const add=adding.render('src/components/bemem/AddCardEditor.tsx','AddCardEditor',{commands:e.runtime.features,background:null,onClose(){},onAdded(){},disabled:false,v2Active:true});
 for(const sheet of [add,edit]){assert.equal(sheet.type,'AddCardSheet');assert.equal(sheet.props.modalOnly,true);assert.equal(sheet.props.presentation,undefined);assert.equal(sheet.props.keyboardState,undefined);}
 assert.equal(nodes(edit).find(n=>n.type==='AddCardForm').props.mode,'edit');assert.equal(nodes(add).find(n=>n.type==='AddCardForm').props.mode,undefined);
 assert.equal(JSON.stringify(e.runtime.getSnapshot().session.saved),before);
});


test('Add and Edit header flip preserves size, exact fields and independent images without persistence',async()=>{
 const {e,id}=await savedMember(),card=e.runtime.getSnapshot().session.saved.cards.find(c=>c.id===id),opened=e.runtime.features.openEdit(id);
 for(const mode of ['add','edit']){
  const view=environment(true);view.setRuntime(e.runtime);const props=mode==='add'?{commands:e.runtime.features,background:null,onClose(){},onAdded(){},disabled:false,v2Active:true}:{commands:e.runtime.features,session:opened.session,card,onClose(){},onSaved(){}};
  const render=()=>view.render(mode==='add'?'src/components/bemem/AddCardEditor.tsx':'src/components/bemem/EditMembershipCardEditor.tsx',mode==='add'?'AddCardEditor':'EditMembershipCardEditor',props);
  let t=render(),form=nodes(t).find(n=>n.type==='AddCardForm');const before=JSON.stringify({values:form.props.values,artwork:form.props.presentation.artwork,size:form.props.presentation.sizePresetId}),bytes=[...e.data.entries()];
  for(const expected of ['back','front']){t.props.face.onToggle();t=render();form=nodes(t).find(n=>n.type==='AddCardForm');assert.equal(t.props.face.side,expected);assert.equal(form.props.presentation.side,expected);assert.equal(JSON.stringify({values:form.props.values,artwork:form.props.presentation.artwork,size:form.props.presentation.sizePresetId}),before);}
  assert.equal(t.props.title,mode==='edit'?'Edit Card':undefined);assert.deepEqual([...e.data.entries()],bytes);
 }
});


test('Both sheet modes survive Add, guarded Edit, Cancel and reload independently on all five pages',async()=>{
 const e=await activeV2(),original=JSON.parse(JSON.stringify(e.runtime.getSnapshot().session.saved));const expected=new Map();
 const {emptyCardForm}=e.load('src/lib/card-form.ts'),{emptyCardPresentation}=e.load('src/lib/card-presentation.ts'),{membershipEditorState}=e.load('src/lib/card-editor-state.ts');
 for(const page of [1,2,3,4,5]){
  assert.equal(e.runtime.pages.selectEditor(page).ok,true);
  const mode=page%2?'frontback':'cardcode',id=e.runtime.features.begin();
  const added=e.runtime.features.add(id,{...emptyCardForm(),name:`Synthetic page ${page}`,memberNumber:' 000Ab c '},{...emptyCardPresentation(),sheetDisplayMode:mode});assert.equal(added.ok,true);
  assert.equal((await e.runtime.commands.save(e.runtime.getSnapshot().state.generation)).ok,true);
  let card=e.runtime.getSnapshot().session.saved.cards.find(c=>c.id===id),opening=membershipEditorState(card);assert.equal(opening.presentation.sheetDisplayMode,mode);
  const beforeCancel=JSON.stringify([...e.data]),cancel=e.runtime.features.openEdit(id);assert.equal(cancel.ok,true);opening.presentation.sheetDisplayMode=mode==='frontback'?'cardcode':'frontback';e.runtime.features.cancelEdit(cancel.session.token);assert.equal(JSON.stringify([...e.data]),beforeCancel);assert.equal(e.runtime.getSnapshot().session.saved.cards.find(c=>c.id===id).sheetDisplayMode,mode);
  const opened=e.runtime.features.openEdit(id),before=JSON.parse(JSON.stringify(e.runtime.getSnapshot().session.saved));
  assert.equal((await e.runtime.features.saveEdit(opened.session.token,opened.session.values,opening)).ok,true);
  const saved=e.runtime.getSnapshot().session.saved,next=saved.cards.find(c=>c.id===id);assert.equal(next.sheetDisplayMode,opening.presentation.sheetDisplayMode);assert.equal(saved.cards.length,before.cards.length);assert.deepEqual(saved.canvas,before.canvas);assert.deepEqual(saved.cards.filter(c=>c.id!==id),before.cards.filter(c=>c.id!==id));
  assert.deepEqual({...next,sheetDisplayMode:card.sheetDisplayMode,updatedAt:card.updatedAt},card);expected.set(id,next.sheetDisplayMode);
 }
 const fresh=e.factory();await fresh.commands.initialize();for(const page of [1,2,3,4,5]){assert.equal(fresh.pages.select(page).ok,true);for(const card of fresh.getSnapshot().session.saved.cards)if(expected.has(card.id))assert.equal(card.sheetDisplayMode,expected.get(card.id));}
 assert.deepEqual(fresh.getSnapshot().session.saved.cards.slice(0,original.cards.length),original.cards);for(const id of original.cards.map(c=>c.id))assert.deepEqual(fresh.getSnapshot().session.saved.canvas.layout[id],original.canvas.layout[id]);
});


test('Display-only edit preserves every unrelated legacy field and other cards; Pending rejects it without changing committed data',async()=>{
 const {e,id}=await savedMember(),state=e.runtime.getSnapshot(),seed=JSON.parse(JSON.stringify(state.session.saved));
 const target=seed.cards.find(c=>c.id===id);target.payload=' 000CUSTOM Code ';target.preferredDisplayFormat='code128';target.brandId='seven';target.brandQuery='Legacy brand';delete target.sheetDisplayMode;
 seed.cards.push({...JSON.parse(JSON.stringify(target)),id:'synthetic-other'});seed.canvas.layout['synthetic-other']={col:0,row:100};
 assert.equal(e.runtime.commands.updateDraft(state.state.generation,seed).ok,true);assert.equal((await e.runtime.commands.save(state.state.generation)).ok,true);
 const before=JSON.parse(JSON.stringify(e.runtime.getSnapshot().session.saved)),open=e.runtime.features.openEdit(id),form=e.load('src/lib/card-editor-state.ts').membershipEditorState(target);form.presentation.sheetDisplayMode='frontback';
 assert.equal((await e.runtime.features.saveEdit(open.session.token,open.session.values,form)).ok,true);
 const after=e.runtime.getSnapshot().session.saved,saved=after.cards.find(c=>c.id===id);assert.deepEqual({...saved,updatedAt:target.updatedAt,sheetDisplayMode:undefined},{...target,sheetDisplayMode:undefined});assert.equal(saved.sheetDisplayMode,'frontback');assert.deepEqual(after.cards.filter(c=>c.id!==id),before.cards.filter(c=>c.id!==id));assert.deepEqual(after.canvas,before.canvas);
 const opened=e.runtime.features.openEdit(id),next=e.load('src/lib/card-editor-state.ts').membershipEditorState(saved);next.presentation.sheetDisplayMode='cardcode';
 e.data.set('documents/bemem-wallet-v2/wallet-0000000000000099.foreign.pending','synthetic pending');const disk=JSON.stringify([...e.data]),snapshot=JSON.stringify(after);
 assert.equal((await e.runtime.features.saveEdit(opened.session.token,opened.session.values,next)).ok,false);assert.equal(JSON.stringify(e.runtime.getSnapshot().session.saved),snapshot);assert.equal(JSON.stringify([...e.data]),disk);
});


for(const presetId of ['card-landscape','card-portrait'])test(`Front&Back crop edited through guarded writer persists and matches Canvas after restart: ${presetId}`,async()=>{
 const {e,id}=await savedMember(),before=JSON.parse(JSON.stringify(e.runtime.getSnapshot().session.saved));
 const original=before.cards.find(c=>c.id===id),form=e.load('src/lib/card-editor-state.ts').membershipEditorState(original),preset=e.load('src/lib/card-size-presets.ts').cardSizePreset(presetId);
 const front=syntheticArtwork(e,'crop-front'),back=syntheticArtwork(e,'crop-back');front.crop={x:.96,y:.08,zoom:2.9};back.crop={x:.04,y:.88,zoom:1.8};back.width=800;back.height=1600;
 form.values.orientation=preset.orientation;Object.assign(form.presentation,{sheetDisplayMode:'frontback',sizePresetId:preset.id,artwork:{front,back}});
 let opening=e.runtime.features.openEdit(id),review=e.runtime.features.reviewEdit(opening.session.token,form);assert.equal(review.ok,true);
 assert.equal((await e.runtime.features.saveEdit(opening.session.token,opening.session.values,{...form,acceptedPosition:review.position})).ok,true);
 const saved=e.runtime.getSnapshot().session.saved,changed=saved.cards.find(c=>c.id===id);assert.deepEqual(changed.appearance.artwork,{front,back});assert.equal(saved.cards.length,before.cards.length);assert.deepEqual(saved.cards.filter(c=>c.id!==id),before.cards.filter(c=>c.id!==id));
 // Change the crop on the same saved asset through Edit, without replacing/reimporting it.
 const next=e.load('src/lib/card-editor-state.ts').membershipEditorState(changed);next.presentation.artwork=JSON.parse(JSON.stringify(changed.appearance.artwork));next.presentation.artwork.front.crop={x:.19,y:.72,zoom:2.3};
 opening=e.runtime.features.openEdit(id);assert.equal((await e.runtime.features.saveEdit(opening.session.token,opening.session.values,next)).ok,true);
 const fresh=e.factory(),bytes=JSON.stringify([...e.data]);await fresh.commands.initialize();assert.equal(JSON.stringify([...e.data]),bytes);
 const wallet=fresh.getSnapshot().session.saved,card=wallet.cards.find(c=>c.id===id),canvas=e.load('src/lib/wallet-preparation.ts').walletCanvasPresentation(wallet).cards.find(c=>c.id===id);
 assert.equal(card.id,id);assert.equal(card.sheetDisplayMode,'frontback');assert.deepEqual(card.appearance.artwork,next.presentation.artwork);assert.deepEqual(canvas.appearance.artwork,card.appearance.artwork);
 const view=environment(true);view.setRuntime(fresh);const tree=view.render('src/components/bemem/MembershipCardDetail.tsx','MembershipCardDetail',{card,fromCreate:false,onClose(){}});
 assert.deepEqual(nodes(tree).find(n=>n.type==='CardFrontBackArtwork').props.card.appearance.artwork,canvas.appearance.artwork);assert.equal(nodes(tree).some(n=>n.type==='CardCodeView'),false);
 assert.deepEqual(wallet.canvas,saved.canvas);assert.deepEqual(wallet.cards.filter(c=>c.id!==id),before.cards.filter(c=>c.id!==id));
});


test('Investigation: Edit Save toggles disabled only when display mode differs from saved, while Add CTA is independent of dirty state',async()=>{
 const {e,id}=await savedMember(),card=e.runtime.getSnapshot().session.saved.cards.find(c=>c.id===id),opened=e.runtime.features.openEdit(id),ui=environment(true,true,true);ui.setRuntime(e.runtime);
 const props={commands:e.runtime.features,session:opened.session,card,onClose(){},onSaved(){}};const render=()=>ui.render('src/components/bemem/EditMembershipCardEditor.tsx','EditMembershipCardEditor',props),bytes=JSON.stringify([...e.data]);
 let tree=render(),save=control(tree,'Save membership changes');assert.equal(save.props.kind,'action');assert.equal(save.props.disabled,true);assert.equal(save.props.busy,false);
 const initial=sharedForm(tree).presentation.sheetDisplayMode;sharedForm(tree).onPresentationChange({...sharedForm(tree).presentation,sheetDisplayMode:initial==='frontback'?'cardcode':'frontback'});
 tree=render();assert.equal(control(tree,'Save membership changes').props.disabled,false);assert.equal(control(tree,'Save membership changes').props.busy,false);
 sharedForm(tree).onPresentationChange({...sharedForm(tree).presentation,sheetDisplayMode:initial});tree=render();assert.equal(control(tree,'Save membership changes').props.disabled,true);assert.equal(JSON.stringify([...e.data]),bytes);
 e.runtime.features.cancelEdit(opened.session.token);
 const addUI=environment(true),addProps={commands:e.runtime.features,background:null,onClose(){},onAdded(){},disabled:false,v2Active:true};addUI.setRuntime(e.runtime);
 const renderAdd=()=>addUI.render('src/components/bemem/AddCardEditor.tsx','AddCardEditor',addProps);let add=renderAdd(),cta=control(add,'Add Card to Arrange draft'),disabled=cta.props.disabled;
 const form=sharedForm(add);form.onPresentationChange({...form.presentation,sheetDisplayMode:'frontback'});assert.equal(control(renderAdd(),'Add Card to Arrange draft').props.disabled,disabled);assert.equal(JSON.stringify([...e.data]),bytes);
});


test('Full EXP date persists from Add and Edit, Cancel preserves the prior date, and reopening restores exact dates and mode',async()=>{
 const e=await activeV2(),{emptyCardForm}=e.load('src/lib/card-form.ts'),{emptyCardPresentation}=e.load('src/lib/card-presentation.ts'),{membershipEditorState}=e.load('src/lib/card-editor-state.ts'),id=e.runtime.features.begin();
 const added=e.runtime.features.add(id,{...emptyCardForm(),name:'Synthetic EXP regression',memberNumber:' 000Ab C '},{...emptyCardPresentation(),expiryMonth:'2027-11-22',sheetDisplayMode:'frontback'});assert.equal(added.ok,true);assert.equal((await e.runtime.commands.save(e.runtime.getSnapshot().state.generation)).ok,true);
 let saved=e.runtime.getSnapshot().session.saved.cards.find(c=>c.id===id);assert.equal(membershipEditorState(saved).presentation.expiryMonth,'2027-11-22');
 const cancel=e.runtime.features.openEdit(id),before=JSON.stringify([...e.data]);e.runtime.features.cancelEdit(cancel.session.token);assert.equal(JSON.stringify([...e.data]),before);
 const opening=e.runtime.features.openEdit(id),form=membershipEditorState(saved);form.presentation.expiryMonth='2027-11-21';assert.equal((await e.runtime.features.saveEdit(opening.session.token,{...opening.session.values,expiryMonth:'2027-11-21'},form)).ok,true);
 const fresh=e.factory();await fresh.commands.initialize();saved=fresh.getSnapshot().session.saved.cards.find(c=>c.id===id);assert.equal(membershipEditorState(saved).presentation.expiryMonth,'2027-11-21');assert.equal(membershipEditorState(saved).presentation.sheetDisplayMode,'frontback');
});

for(const fromCreate of [false,true])for(const mode of ['cardcode','frontback'])test(`${fromCreate?'Arrange':'Home'} ${mode} viewing/Close/Android Back preserves owner, saved data and unsaved positions`,async()=>{
 const {e,id}=await savedMember();let snapshot=e.runtime.getSnapshot(),doc=JSON.parse(JSON.stringify(snapshot.session.draft));doc.cards.find(c=>c.id===id).sheetDisplayMode=mode;
 assert.equal(e.runtime.commands.updateDraft(snapshot.state.generation,doc).ok,true);assert.equal((await e.runtime.commands.save(snapshot.state.generation)).ok,true);
 const render=()=>e.render('src/app/index.tsx','default');let tree=render();if(fromCreate){nodes(tree).find(n=>n.type==='ContextualFooter').props.onCreate();tree=render();nodes(tree).find(n=>n.type==='WalletCanvas').props.onMove(id,{col:0,row:30});tree=render();}
 const entry=e.runtime.getSnapshot(),draft=JSON.stringify(entry.session.draft),saved=JSON.stringify(entry.session.saved),files=JSON.stringify([...e.data]),writeCount=writes(e).length;
 for(const close of ['sheet','android']){
  const canvas=nodes(tree).find(n=>n.type==='WalletCanvas');canvas.props.onOpen(canvas.props.cards.find(c=>c.id===id));tree=render();const sheet=nodes(tree).find(n=>n.type==='CardPreview');
  assert.equal(sheet.props.fromCreate,fromCreate);assert.equal(sheet.props.membership.id,id);assert.equal(sheet.props.membership.sheetDisplayMode,mode);assert.equal(sheet.props.presentation,'inline');assert.equal(nodes(tree).filter(n=>n.type==='CardPreview'&&n.props.card).length,1);
  if(close==='sheet')sheet.props.onClose();else assert.equal(e.back()(),true);tree=render();assert.equal(nodes(tree).find(n=>n.type==='CardPreview').props.card,null);assert.equal(nodes(tree).find(n=>n.type==='WalletCanvas').props.editing,fromCreate);
  const current=e.runtime.getSnapshot();assert.equal(JSON.stringify(current.session.draft),draft);assert.equal(JSON.stringify(current.session.saved),saved);assert.equal(current.state.generation,entry.state.generation);assert.equal(current.state.dirty,entry.state.dirty);assert.equal(writes(e).length,writeCount);assert.equal(JSON.stringify([...e.data]),files);
 }
});

test('Edit inline discard keeps all unsaved fields and separate crops; dismiss/stale actions and unmount cannot discard',async()=>{
 const {e,id}=await savedMember(),card=e.runtime.getSnapshot().session.saved.cards.find(c=>c.id===id),session=e.runtime.features.openEdit(id).session,view=environment(true,true,true);let closed=0;
 const render=()=>view.render('src/components/bemem/EditMembershipCardEditor.tsx','EditMembershipCardEditor',{commands:e.runtime.features,session,card,onClose(){closed++;},onSaved(){assert.fail('Discard confirmation never saves');}});
 let tree=render(),f=sharedForm(tree);f.onChange({...f.values,name:'Unsaved',memberNumber:' 000Ab C '});f.onPresentationChange({...f.presentation,expiryMonth:'2030-06-15',artwork:{front:{assetId:'art-front.jpg',crop:{x:.1,y:.8,zoom:2}},back:{assetId:'art-back.jpg',crop:{x:.8,y:.2,zoom:3}}}});
 const fields=JSON.stringify({values:sharedForm(render()).values,presentation:sharedForm(render()).presentation}),bytes=JSON.stringify([...e.data]);
 control(render(),'Cancel editing card').props.onPress();const old=sheetConfirmationRequest(render());assert.equal(old.title,'Discard changes?');assert.deepEqual(old.actions.map(a=>[a.label,a.role]),[['Keep Editing','primary'],['Discard Changes','destructive']]);
 old.actions[0].onPress();old.actions[1].onPress();assert.equal(closed,0);assert.equal(render().props.confirmation,undefined);assert.equal(JSON.stringify({values:sharedForm(render()).values,presentation:sharedForm(render()).presentation}),fields);
 control(render(),'Cancel editing card').props.onPress();tree=render();const current=sheetConfirmationRequest(tree);assert.notEqual(current.id,old.id);old.actions[1].onPress();assert.equal(closed,0);tree.props.confirmation.onRequestClose();assert.equal(render().props.confirmation,undefined);assert.equal(JSON.stringify([...e.data]),bytes);assert.equal(view.alerts.length,0);
 control(render(),'Cancel editing card').props.onPress();const stale=sheetConfirmationRequest(render());view.unmount();stale.actions[1].onPress();stale.onDismiss();assert.equal(closed,0);assert.equal(JSON.stringify([...e.data]),bytes);
});

test('Unchanged Edit closes directly without confirmation or writes',async()=>{
 const {e,id}=await savedMember(),card=e.runtime.getSnapshot().session.saved.cards.find(c=>c.id===id),session=e.runtime.features.openEdit(id).session,view=environment(true,true,true),bytes=JSON.stringify([...e.data]);let closed=0;
 const props={commands:e.runtime.features,session,card,onClose(){closed++;},onSaved(){assert.fail('No save');}};const tree=view.render('src/components/bemem/EditMembershipCardEditor.tsx','EditMembershipCardEditor',props);tree.props.onClose();assert.equal(closed,1);assert.equal(tree.props.confirmation,undefined);assert.equal(view.alerts.length,0);assert.equal(JSON.stringify([...e.data]),bytes);
});

test('Inline Move and Save revalidates and reports failed persistence without success or duplicate/stale writes',async()=>{
 const {e,id}=await adjacentMembers(),card=e.runtime.getSnapshot().session.saved.cards.find(c=>c.id===id),session=e.runtime.features.openEdit(id).session,view=environment(true,true,true),before=JSON.stringify(e.runtime.getSnapshot().session.saved);let saved=0;
 const render=()=>view.render('src/components/bemem/EditMembershipCardEditor.tsx','EditMembershipCardEditor',{commands:e.runtime.features,session,card,onClose(){},onSaved(){saved++;}});
 const form=sharedForm(render());form.onPresentationChange({...form.presentation,sizePresetId:'boarding-pass-landscape'});const count=writes(e).length;control(render(),'Save membership changes').props.onPress();const request=sheetConfirmationRequest(render());assert.equal(writes(e).length,count);
 e.failWrite('bemem-wallet-v2');const move=request.actions.find(a=>a.label==='Move and Save');const first=move.onPress();move.onPress();await first;
 assert.equal(saved,0);assert.equal(JSON.stringify(e.runtime.getSnapshot().session.saved),before);assert.equal(control(render(),'Save membership changes').props.disabled,true);assert.ok(nodes(render()).some(n=>n.props?.accessibilityRole==='alert'));
 const after=writes(e).length;move.onPress();request.onDismiss();await new Promise(r=>setImmediate(r));assert.equal(writes(e).length,after);assert.equal(view.alerts.length,0);
});

test('Arrange Detail Delete keeps a dirty layout intact and blocks deletion until existing Save/Discard flow resolves it',async()=>{
 const {e,id}=await savedMember(),snapshot=e.runtime.getSnapshot(),draft=JSON.parse(JSON.stringify(snapshot.session.draft));draft.canvas.layout[id]={col:0,row:35};assert.equal(e.runtime.commands.updateDraft(snapshot.state.generation,draft).ok,true);
 const host=deleteDetail(e,id),before=JSON.stringify(e.runtime.getSnapshot().session.draft),bytes=JSON.stringify([...e.data]);control(host.render(),'Delete Card').props.onPress();const tree=host.render();assert.ok(nodes(tree).some(n=>n.props?.accessibilityRole==='alert'));assert.equal(nodes(tree).some(n=>n.type==='ConfirmationDialog'&&n.props.request),false);assert.equal(JSON.stringify(e.runtime.getSnapshot().session.draft),before);assert.equal(JSON.stringify([...e.data]),bytes);
});
test('Inline Detail confirmation routes Android Back to Cancel before closing the Sheet; root respects registered child handler',async()=>{
 const {e,id}=await savedMember(),host=deleteDetail(e,id),card=e.runtime.getSnapshot().session.saved.cards.find(c=>c.id===id),view=environment(true,true,true);let back=null,closed=0;const bytes=JSON.stringify([...e.data]);
 const render=()=>view.render('src/components/bemem/MembershipCardDetail.tsx','MembershipCardDetail',{card,fromCreate:true,presentation:'inline',editCommands:e.runtime.features,onClose(){closed++;},onBackHandler:fn=>{back=fn;}});
 control(render(),'Delete Card').props.onPress();render();assert.equal(typeof back,'function');back();render();assert.equal(closed,0);assert.equal(back,null);assert.equal(JSON.stringify([...e.data]),bytes);
 control(render(),'Delete Card').props.onPress();const stale=confirmation(render());view.unmount();stale.actions[1].onPress();stale.onDismiss();assert.equal(closed,0);assert.equal(JSON.stringify([...e.data]),bytes);
 const root=environment(true);root.setRuntime(e.runtime);const draw=()=>root.render('src/app/index.tsx','default');let tree=draw();nodes(tree).find(n=>n.type==='ContextualFooter').props.onCreate();tree=draw();const canvas=nodes(tree).find(n=>n.type==='WalletCanvas');canvas.props.onOpen(canvas.props.cards.find(c=>c.id===id));tree=draw();let cancels=0;const preview=nodes(tree).find(n=>n.type==='CardPreview');preview.props.onBackHandler(()=>cancels++);root.back()();tree=draw();assert.equal(cancels,1);assert.ok(nodes(tree).find(n=>n.type==='CardPreview').props.card);preview.props.onBackHandler(null);root.back()();assert.equal(nodes(draw()).find(n=>n.type==='CardPreview').props.card,null);
});

function arrangeEditHost(e,id){const view=environment(true);view.setRuntime(e.runtime);let back=null,closed=0;
 const render=()=>view.render('src/components/bemem/MembershipCardDetail.tsx','MembershipCardDetail',{card:e.runtime.getSnapshot().session.saved.cards.find(c=>c.id===id),fromCreate:true,presentation:'inline',editCommands:e.runtime.features,onClose(){closed++;},onBackHandler:fn=>{back=fn;}});
 return{render,view,back:()=>back?.(),closed:()=>closed};
}
async function movedForEdit(folder=false){const fixture=folder?await adjacentMembers():await savedMember(),{e,id}=fixture;let current=e.runtime.getSnapshot();
 if(folder){const doc=e.load('src/lib/group-folder.ts').createGroupFolder(current.session.saved,'edit-folder','Edit group','landscape',[id,fixture.other],1);assert.equal(e.runtime.commands.updateDraft(current.state.generation,doc).ok,true);assert.equal((await e.runtime.commands.save(current.state.generation)).ok,true);current=e.runtime.getSnapshot();}
 const draft=JSON.parse(JSON.stringify(current.session.draft));if(folder)draft.canvas.folders.items.find(f=>f.id==='edit-folder').position={col:0,row:35};else draft.canvas.layout[id]={col:0,row:35};
 assert.equal(e.runtime.commands.updateDraft(current.state.generation,draft).ok,true);return{...fixture,host:arrangeEditHost(e,id),draft,saved:JSON.parse(JSON.stringify(current.session.saved))};
}
for(const grouped of [false,true])for(const choice of ['save','discard'])test(`Arrange ${grouped?'folder member':'card'} ${choice} then Edit preserves selected ID and safe layout`,async()=>{
 const {e,id,host,draft,saved}=await movedForEdit(grouped),commits=()=>e.events.filter(([kind,path])=>kind==='write'&&path.includes('bemem-wallet-v2')).length,count=commits();control(host.render(),'Edit Card').props.onPress();const request=confirmation(host.render());assert.deepEqual(request.actions.map(a=>a.label),['Save and Edit','Discard and Edit','Keep Arranging']);assert.equal(commits(),count);
 const action=request.actions[choice==='save'?0:1],task=action.onPress();action.onPress();await task;const tree=host.render();assert.equal(tree.type,'EditMembershipCardEditor');assert.equal(tree.props.card.id,id);assert.equal(e.runtime.getSnapshot().state.dirty,false);assert.equal(commits(),count+(choice==='save'?1:0));
 const current=e.runtime.getSnapshot().session.saved;assert.deepEqual(current.canvas,choice==='save'?draft.canvas:saved.canvas);assert.deepEqual(current.cards,saved.cards);assert.equal(e.runtime.features.reviewEdit(tree.props.session.token,e.load('src/lib/card-editor-state.ts').membershipEditorState(tree.props.card)).ok,true);
 tree.props.onClose(false);assert.ok(control(host.render(),'Edit Card'));host.view.unmount();
});
for(const choice of ['cancel','back'])test('Arrange Edit '+choice+' retains unsaved movement and writes nothing',async()=>{
 const {e,host,draft}=await movedForEdit(),before=JSON.stringify([...e.data]);control(host.render(),'Edit Card').props.onPress();const request=confirmation(host.render());if(choice==='back')host.back();else request.actions[2].onPress();assert.equal(nodes(host.render()).some(n=>n.type==='ConfirmationDialog'&&n.props.request),false);assert.equal(host.closed(),0);assert.equal(JSON.stringify([...e.data]),before);assert.deepEqual(e.runtime.getSnapshot().session.draft,draft);assert.equal(e.runtime.getSnapshot().state.dirty,true);await request.actions[0].onPress();assert.equal(JSON.stringify([...e.data]),before);host.view.unmount();
});
test('Arrange Save failure blocks auto Edit, retains draft and never retries',async()=>{
 const {e,host,draft}=await movedForEdit();control(host.render(),'Edit Card').props.onPress();const request=confirmation(host.render());e.failWrite('bemem-wallet-v2');await request.actions[0].onPress();const tree=host.render();assert.notEqual(tree.type,'EditMembershipCardEditor');assert.ok(nodes(tree).some(n=>n.props?.accessibilityRole==='alert'));assert.deepEqual(e.runtime.getSnapshot().session.draft,draft);const count=writes(e).length;await request.actions[0].onPress();assert.equal(writes(e).length,count);host.view.unmount();
});
test('Arrange Edit rejects changed draft and revision before any Save or Discard',async()=>{
 for(const conflict of ['draft','revision']){const {e,id}=await movedForEdit(),opened=e.runtime.features.openEdit(id);assert.ok(opened.arrangeToken);const current=e.runtime.getSnapshot();if(conflict==='revision')assert.equal((await e.runtime.commands.save(current.state.generation)).ok,true);else{const doc=JSON.parse(JSON.stringify(current.session.draft));doc.canvas.layout[id]={col:0,row:45};assert.equal(e.runtime.commands.updateDraft(current.state.generation,doc).ok,true);}
 const before=JSON.stringify([...e.data]),draft=JSON.stringify(e.runtime.getSnapshot().session.draft);const result=await e.runtime.features.resolveArrangeEdit(opened.arrangeToken,'discard');assert.equal(result.ok,false);assert.equal(JSON.stringify([...e.data]),before);assert.equal(JSON.stringify(e.runtime.getSnapshot().session.draft),draft);}
});
test('Unmounting Arrange confirmation cancels its continuation without saving or discarding',async()=>{
 const {e,host,draft}=await movedForEdit();control(host.render(),'Edit Card').props.onPress();const request=confirmation(host.render()),before=JSON.stringify([...e.data]);host.view.unmount();await request.actions[0].onPress();assert.equal(JSON.stringify([...e.data]),before);assert.deepEqual(e.runtime.getSnapshot().session.draft,draft);
});

for(const code of ['revision_conflict','commit_uncertain'])test('Arrange continuation '+code+' cannot open Edit or retry',async()=>{
 const {e,host,draft}=await movedForEdit();let attempts=0;e.runtime.commands.save=async()=>{attempts++;return{ok:false,code,kind:code==='revision_conflict'?'revision_conflict':'commit_uncertain'};};
 const before=JSON.stringify([...e.data]);control(host.render(),'Edit Card').props.onPress();const request=confirmation(host.render());await request.actions[0].onPress();assert.notEqual(host.render().type,'EditMembershipCardEditor');assert.equal(control(host.render(),'Edit Card').props.disabled,true);await request.actions[0].onPress();assert.equal(attempts,1);assert.equal(JSON.stringify([...e.data]),before);assert.deepEqual(e.runtime.getSnapshot().session.draft,draft);host.view.unmount();
});

for(const stale of [false,true])test('Motion Footer retains Detail until exit, one intent, and revalidates Owner '+stale,async()=>{
 const {e,id}=await savedMember(),view=environment(true);view.setRuntime(e.runtime);const render=()=>view.render('src/app/index.tsx','default');let tree=render();const before=JSON.stringify([...e.data]);
 const canvas=nodes(tree).find(n=>n.type==='WalletCanvas');canvas.props.onOpen(canvas.props.cards.find(c=>c.id===id));tree=render();const preview=nodes(tree).find(n=>n.type==='CardPreview');let exits=0;preview.props.onBackHandler(()=>exits++);
 const footer=nodes(tree).find(n=>n.type==='ContextualFooter');footer.props.onCreate();footer.props.onDecorate();tree=render();assert.equal(exits,1);assert.ok(nodes(tree).find(n=>n.type==='CardPreview').props.card);assert.equal(nodes(tree).find(n=>n.type==='WalletCanvas').props.editing,false);
 if(stale)view.setRuntime({...e.runtime,getSnapshot(){const s=e.runtime.getSnapshot();return{...s,state:{...s.state,generation:s.state.generation+1}};}});
 if(stale){tree=render();assert.equal(nodes(tree).find(n=>n.type==='CardPreview').props.card,null);}
 preview.props.onClose();tree=render();tree=render();assert.equal(nodes(tree).find(n=>n.type==='CardPreview').props.card,null);assert.equal(nodes(tree).find(n=>n.type==='WalletCanvas').props.editing,!stale);assert.equal(nodes(tree).some(n=>n.type==='DecorateMode'),false);assert.equal(JSON.stringify([...e.data]),before);view.unmount();
});

for(const navigation of [false,true])test('Motion Folder return is atomic; Footer never flashes folder '+navigation,async()=>{
 const {e,id,other}=await adjacentMembers(),s=e.runtime.getSnapshot(),doc=e.load('src/lib/group-folder.ts').createGroupFolder(s.session.saved,'motion-folder','Motion group','landscape',[id,other],1);
 assert.equal(e.runtime.commands.updateDraft(s.state.generation,doc).ok,true);assert.equal((await e.runtime.commands.save(s.state.generation)).ok,true);
 const view=environment(true);view.setRuntime(e.runtime);const render=()=>view.render('src/app/index.tsx','default');let tree=render();const before=JSON.stringify([...e.data]);let canvas=nodes(tree).find(n=>n.type==='WalletCanvas');canvas.props.onOpen(canvas.props.cards.find(c=>c.kind==='folder'));tree=render();nodes(tree).find(n=>n.type==='GroupFolderSheet').props.onOpen(e.load('src/lib/wallet-preparation.ts').walletCanvasPresentation(e.runtime.getSnapshot().session.saved).cards.find(c=>c.id===id)??{id,name:'Member',orientation:'landscape'});
 tree=render();const preview=nodes(tree).find(n=>n.type==='CardPreview');let exits=0;preview.props.onBackHandler(()=>exits++);if(navigation)nodes(tree).find(n=>n.type==='ContextualFooter').props.onCreate();else view.back()();tree=render();assert.equal(exits,1);assert.ok(nodes(tree).find(n=>n.type==='CardPreview').props.card);assert.equal(nodes(tree).some(n=>n.type==='GroupFolderSheet'),false);
 preview.props.onClose();tree=render();assert.equal(nodes(tree).some(n=>n.type==='GroupFolderSheet'),!navigation);tree=render();assert.equal(nodes(tree).some(n=>n.type==='GroupFolderSheet'),!navigation);assert.equal(JSON.stringify([...e.data]),before);view.unmount();
});
