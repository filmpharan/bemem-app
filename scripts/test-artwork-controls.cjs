const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const root=path.resolve(__dirname,'..');
function env(){const cache=new Map(),slots=[];let cursor=0;
 const react={useState(v){const i=cursor++;if(!(i in slots))slots[i]=typeof v==='function'?v():v;return[slots[i],v=>{slots[i]=typeof v==='function'?v(slots[i]):v;}];},useRef(v){const i=cursor++;return slots[i]??={current:v};},useMemo(fn,deps){const i=cursor++;if(!slots[i]||!deps.every((v,j)=>v===slots[i].deps[j]))slots[i]={deps,value:fn()};return slots[i].value;},useEffect(){}};
 function load(file){file=path.resolve(root,file);if(!/\.tsx?$/.test(file))file+=fs.existsSync(file+'.ts')?'.ts':'.tsx';if(cache.has(file))return cache.get(file).exports;const mod={exports:{}};cache.set(file,mod);
  const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
  vm.runInThisContext(`(function(require,module,exports){${code}\n})`,{filename:file})(n=>{
   if(n==='react')return react;if(n==='react/jsx-runtime')return{jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})};
   if(n==='react-native')return{...Object.fromEntries(['View','Text','Modal','ScrollView'].map(n=>[n,n])),StyleSheet:{create:v=>v,absoluteFill:{}},useWindowDimensions:()=>({width:320,height:740,fontScale:2}),PanResponder:{create:v=>({panHandlers:v})},Alert:{alert(){assert.fail('No dialog expected');}},Keyboard:{dismiss(){}}};
   if(n==='react-native-safe-area-context')return{SafeAreaView:'SafeAreaView'};
   if(n==='expo-image')return{Image:'Image'};if(n==='expo-image-picker')return{};
   if(n.endsWith('card-artwork-store'))return{artworkUri:id=>'file:///synthetic/'+id,deviceArtworkStore:{}};
   if(n.endsWith('lagoon-theme'))return{lagoon:{canvas:{base:'#eef1f4'},text:{primary:'#263943',secondary:'#53636c',onAction:'#fff'},action:{primary:'#405764'}},lagoonFonts:{latin:'Manrope'}};
   if(['./GlassButton','./AddCardIcon','./CardArtworkImage','./ArtworkSlider'].includes(n)){const name=n.slice(2);return{[name]:name};}
   assert.ok(n.startsWith('.'),'Unexpected dependency '+n);return load(path.resolve(path.dirname(file),n));
  },mod,mod.exports);return mod.exports;}
 return{load,render(component,props){cursor=0;return component(props);}};
}
function nodes(t,out=[]){if(!t||typeof t!=='object')return out;if(Array.isArray(t)){t.forEach(n=>nodes(n,out));return out;}out.push(t);nodes(t.props?.children,out);return out;}
const find=(t,label)=>nodes(t).find(n=>n.props?.accessibilityLabel===label||n.props?.label===label);
const image={assetId:'art-synthetic.png',width:1200,height:800,byteLength:200,md5:'a'.repeat(32),crop:{x:.3,y:.65,zoom:1.4}};
function crop(){const e=env(),Crop=e.load('src/components/bemem/CardArtworkControls.tsx').ArtworkCrop,confirmed=[];let cancels=0;
 const props={image,ratio:5.8/3.8,side:'back',onConfirm:v=>confirmed.push(v),onCancel:()=>cancels++};
 return{e,confirmed,cancels:()=>cancels,render:()=>e.render(Crop,props)};}
test('Direct crop starts Grid/Fine off, requires decoded visible image, and shares slider/+/-/Reset transform',()=>{
 const h=crop();let t=h.render();assert.equal(find(t,'Toggle crop grid').props.selected,false);assert.equal(find(t,'Fine adjustment').props.accessibilityState.expanded,false);
 assert.equal(find(t,'Use image crop').props.disabled,true);find(t,'Use image crop').props.onPress();assert.equal(h.confirmed.length,0);
 nodes(t).find(n=>n.type==='CardArtworkImage').props.onReady();t=h.render();assert.equal(find(t,'Use image crop').props.disabled,false);
 const original=JSON.stringify(image);find(t,'Image zoom').props.onChange(2);t=h.render();assert.equal(find(t,'Image zoom').props.value,2);
 find(t,'Zoom in').props.onPress();t=h.render();assert.equal(find(t,'Image zoom').props.value,2.1);
 const before=nodes(t).find(n=>n.type==='CardArtworkImage').props.image.crop;find(t,'Toggle crop grid').props.onPress();t=h.render();assert.deepEqual(nodes(t).find(n=>n.type==='CardArtworkImage').props.image.crop,before);
 find(t,'Fine adjustment').props.onPress();t=h.render();find(t,'Horizontal image position').props.onChange(.8);t=h.render();assert.equal(nodes(t).find(n=>n.type==='CardArtworkImage').props.image.crop.x,.8);
 find(t,'Reset image crop').props.onPress();t=h.render();assert.deepEqual(nodes(t).find(n=>n.type==='CardArtworkImage').props.image.crop,image.crop);
 find(t,'Use image crop').props.onPress();assert.deepEqual(h.confirmed[0].crop,image.crop);assert.equal(JSON.stringify(image),original);
});
test('Actual native responder supports two-finger pinch, rebases drag and prevents sheet gesture takeover',()=>{
 const h=crop();let t=h.render(),v=find(t,'Image crop viewport');const event=points=>({nativeEvent:{pageX:100+points[0].x,pageY:200+points[0].y,locationX:points[0].x,locationY:points[0].y,touches:points.map(p=>({pageX:100+p.x,pageY:200+p.y}))}});
 assert.equal(v.props.onPanResponderTerminationRequest(),false);
 v.props.onPanResponderGrant(event([{x:60,y:60},{x:120,y:60}]));v.props.onPanResponderMove(event([{x:40,y:60},{x:140,y:60}]));
 t=h.render();const after=nodes(t).find(n=>n.type==='CardArtworkImage').props.image.crop;assert.ok(after.zoom>image.crop.zoom);
 find(t,'Image crop viewport').props.onPanResponderMove(event([{x:140,y:60}]));t=h.render();assert.deepEqual(nodes(t).find(n=>n.type==='CardArtworkImage').props.image.crop,after);
 find(t,'Cancel image crop').props.onPress();assert.equal(h.cancels(),1);assert.equal(h.confirmed.length,0);
});
test('Decoded upright dimensions correct viewport math in memory; Reset keeps dimensions, failure blocks confirmation',()=>{
 const h=crop();let t=h.render();nodes(t).find(n=>n.type==='CardArtworkImage').props.onDimensions({width:800,height:1200});t=h.render();find(t,'Reset image crop').props.onPress();t=h.render();
 const corrected=nodes(t).find(n=>n.type==='CardArtworkImage');assert.equal(corrected.props.image.width,800);assert.equal(corrected.props.image.height,1200);
 corrected.props.onFailure();t=h.render();assert.equal(find(t,'Use image crop').props.disabled,true);find(t,'Use image crop').props.onPress();assert.equal(h.confirmed.length,0);assert.equal(image.width,1200);
});
test('Native zoom slider supports real touch positions and accessible increment/decrement in one state',()=>{
 const e=env(),Slider=e.load('src/components/bemem/ArtworkSlider.tsx').ArtworkSlider,changes=[];let value=1;
 const render=()=>e.render(Slider,{label:'Image zoom',min:1,max:3,value,onChange:v=>{value=v;changes.push(v);}});
 let t=render();assert.equal(t.props.accessibilityRole,'adjustable');assert.equal(t.props.style.minHeight,48);
 t.props.onLayout({nativeEvent:{layout:{width:200}}});t=render();t.props.onPanResponderGrant({nativeEvent:{locationX:100}});t=render();assert.equal(value,2);
 t.props.onAccessibilityAction({nativeEvent:{actionName:'increment'}});assert.ok(value>2);t=render();t.props.onAccessibilityAction({nativeEvent:{actionName:'decrement'}});assert.equal(value,2);
 t.props.onPanResponderMove({nativeEvent:{locationX:1000}});assert.equal(value,3);assert.ok(changes.every(v=>v>=1&&v<=3));
});
test('Artwork renderer derives cover from decoded upright image dimensions without rewriting original metadata',()=>{
 const e=env(),Art=e.load('src/components/bemem/CardArtworkImage.tsx').CardArtworkImage,dimensions=[];
 const props={image,onDimensions:d=>dimensions.push(d)};let t=e.render(Art,props);t.props.onLayout({nativeEvent:{layout:{width:290,height:190}}});t=e.render(Art,props);
 nodes(t).find(n=>n.type==='Image').props.onLoad({source:{width:800,height:1200}});t=e.render(Art,props);const style=nodes(t).find(n=>n.type==='Image').props.style[1];
 assert.ok(Math.abs(style.width-290*image.crop.zoom)<1e-8);assert.ok(style.height>style.width);assert.deepEqual(dimensions,[{width:800,height:1200}]);assert.equal(image.width,1200);
});
