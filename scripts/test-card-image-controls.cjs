const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), ts = require('typescript');
const root = path.resolve(__dirname, '..');
function treeNodes(tree, out=[]) {
  if (!tree || typeof tree !== 'object') return out;
  if (Array.isArray(tree)) { tree.forEach(t=>treeNodes(t,out)); return out; }
  out.push(tree); treeNodes(tree.props?.children,out); return out;
}
function controls(side, cancelled=false, simpleReplacement=true) {
  const changes=[],busy=[],calls=[],front={assetId:'art-front.jpg'},back={assetId:'art-back.jpg'}, replacement={assetId:'art-replacement.jpg'};
  const presentation={side,sizePresetId:'card-landscape',artwork:{front,back},expiryMonth:'2032-11'}, jsx=(type,props)=>({type,props});
  const pick=async options=>{calls.push(options);return cancelled?{canceled:true}:{canceled:false,assets:[{uri:'file:///synthetic.jpg'}]};};
  const slots=[];let cursor=0;
  const deps={react:{useState(v){const i=cursor++;if(!(i in slots))slots[i]=v;return[slots[i],v=>{slots[i]=v;}];},useRef(v){const i=cursor++;return slots[i]??={current:v};},useEffect:fn=>fn(),useMemo:fn=>fn()},
    'react/jsx-runtime':{jsx,jsxs:jsx},'react-native':{Alert:{alert(){assert.fail('No extra image menu or error expected');}},Keyboard:{dismiss(){}},StyleSheet:{create:s=>s},View:'View',Text:'Text'},
    'expo-image-picker':{requestCameraPermissionsAsync:async()=>({granted:true}),launchCameraAsync:pick,launchImageLibraryAsync:pick,UIImagePickerPreferredAssetRepresentationMode:{Compatible:'compatible'}},
    'react-native-safe-area-context':{SafeAreaView:'SafeAreaView'},'../../lib/card-artwork-store':{deviceArtworkStore:{retain:async()=>replacement}},
    '../../lib/card-geometry':{cardPaintSize:(w,h)=>({width:w-.2,height:h-.2})},'../../lib/artwork-adjustment':{},'./ArtworkSlider':{ArtworkSlider:'ArtworkSlider'},'../../lib/card-size-presets':{cardSizePreset:()=>({ratioWidth:6,ratioHeight:4})},
    '../../constants/lagoon-theme':{lagoon:{text:{primary:'#263943',secondary:'#586670'},surface:{base:'#fff'},canvas:{base:'#eee'}},lagoonFonts:{latin:'Manrope'}},
    './GlassButton':{GlassButton:'GlassButton'},'./AddCardIcon':{AddCardIcon:'AddCardIcon'},'./CardArtworkImage':{CardArtworkImage:'CardArtworkImage'},
    './add-card-layout':{addCardLayout:{toolSize:36,buttonRadius:12}}};
  const module={exports:{}},file=path.join(root,'src/components/bemem/CardArtworkControls.tsx');
  const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  vm.runInThisContext(`(function(require,module,exports){${code}\n})`)(n=>{assert.ok(deps[n],'Unexpected dependency '+n);return deps[n];},module,module.exports);
  const render=()=>{cursor=0;return module.exports.CardArtworkControls({presentation,disabled:false,simpleReplacement,onChange:v=>changes.push(v),onBusy:v=>busy.push(v)});};const tree=render();
  return {render,nodes:treeNodes(tree),changes,busy,calls,front,back,replacement,presentation};
}
test('Edit Gallery and Camera open the shared crop directly, confirm only the selected side, and never delete old files',async()=>{
  for(const side of ['front','back']) for(const label of ['Choose from Gallery','Take Photo']) {
    const h=controls(side),button=h.nodes.find(n=>n.props?.accessibilityLabel===label);
    assert.equal(h.nodes.some(n=>n.props?.accessibilityLabel==='Artwork options'),false);
    button.props.onPress();button.props.onPress();
    for(let i=0;i<10;i++)await new Promise(resolve=>setImmediate(resolve));
    assert.equal(h.changes.length,0);const crop=treeNodes(h.render()).find(n=>typeof n.type==='function');assert.ok(crop);crop.props.onConfirm(h.replacement);assert.equal(h.changes.length,1);assert.equal(h.calls.length,1);assert.deepEqual(h.busy,[true,false]);
    const result=h.changes[0];assert.equal(result.artwork[side],h.replacement);
    assert.equal(result.artwork[side==='front'?'back':'front'],side==='front'?h.back:h.front);
    assert.equal(result.expiryMonth,h.presentation.expiryMonth);
    assert.deepEqual(h.presentation.artwork,{front:h.front,back:h.back});
  }
});
test('Cancelled picker retains both existing images and creates no replacement',async()=>{
  const h=controls('front',true);h.nodes.find(n=>n.props?.accessibilityLabel==='Choose from Gallery').props.onPress();
  for(let i=0;i<10;i++)await new Promise(resolve=>setImmediate(resolve));
  assert.equal(h.changes.length,0);assert.deepEqual(h.presentation.artwork,{front:h.front,back:h.back});
});
