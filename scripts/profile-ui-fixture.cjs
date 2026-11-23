const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const root=path.resolve(__dirname,'..');
const nodes=(t,out=[])=>{if(!t||typeof t!=='object')return out;if(Array.isArray(t)){t.forEach(n=>nodes(n,out));return out;}out.push(t);nodes(t.props?.children,out);return out;};
function fixture(dimensions={width:393,height:844,fontScale:1},insets={top:24,bottom:24,left:0,right:0}){
 const slots=[],cache=new Map(),animations=[],events=[],files=new Map(),listeners=new Map();let cursor=0,effects=[],uuid=0;
 const profile={profile:{name:'My profile',avatar:null},ready:true,busy:false,error:'',reload:async()=>{},update:async change=>{profile.profile={...profile.profile,...change};}};
 const picker={permission:true,result:{canceled:true},requestCameraPermissionsAsync:async()=>({granted:picker.permission}),UIImagePickerPreferredAssetRepresentationMode:{Compatible:'compatible'},launchCameraAsync:async options=>{events.push(['camera',options]);return picker.result;},launchImageLibraryAsync:async options=>{events.push(['gallery',options]);return picker.result;}};
 const react={useState(v){const i=cursor++;if(!(i in slots))slots[i]=typeof v==='function'?v():v;return[slots[i],v=>{slots[i]=typeof v==='function'?v(slots[i]):v;}];},useRef(v){const i=cursor++;return slots[i]??={current:v};},useEffect(fn,deps){const i=cursor++,old=slots[i];if(!old||!deps||deps.some((v,j)=>v!==old[j])){slots[i]=deps;effects.push(fn);}},useSyncExternalStore:(_s,get)=>get()};
 class Value{constructor(v){this.value=v;}stopAnimation(){}interpolate(spec){return spec;}}
 const native={...Object.fromEntries(['View','Text','TextInput','Pressable','ScrollView','Modal','ActivityIndicator'].map(n=>[n,n])),StyleSheet:{create:s=>s,absoluteFill:{position:'absolute',top:0,left:0,right:0,bottom:0},hairlineWidth:1},useWindowDimensions:()=>dimensions,
 Platform:{OS:'android'},Animated:{Value,View:'Animated.View',timing:(value,options)=>({start(cb){animations.push(options);value.value=options.toValue;cb?.({finished:true});}})},Easing:{cubic:'cubic',out:v=>v,inOut:v=>v},
 AccessibilityInfo:{isReduceMotionEnabled:async()=>fixture.reduced??false,addEventListener:(name,fn)=>{listeners.set(name,fn);return{remove(){}};}},Keyboard:{dismiss(){},addListener:(name,fn)=>{listeners.set(name,fn);return{remove(){}};}}};
 function uri(parts){return parts.map(p=>typeof p==='string'?p:p.uri).join('/');}
 class Directory{constructor(...p){this.uri=uri(p);}get exists(){return [...files.keys()].some(k=>k.startsWith(this.uri+'/'));}create(){events.push(['mkdir',this.uri]);}list(){return [...files.keys()].filter(k=>k.startsWith(this.uri+'/')).map(k=>new File(k));}}
 class File{constructor(...p){this.uri=uri(p);}get name(){return this.uri.split('/').at(-1);}get exists(){return files.has(this.uri);}get type(){return'image/jpeg';}info(){const value=files.get(this.uri);return{exists:this.exists,size:value?.length,md5:value?require('node:crypto').createHash('md5').update(value).digest('hex'):null};}async text(){if(!this.exists)throw Error('missing');return files.get(this.uri).toString();}async write(raw){events.push(['write',this.uri]);files.set(this.uri,Buffer.from(raw));}async copy(target){events.push(['copy',target.uri]);if(target.exists)throw Error('exists');files.set(target.uri,files.get(this.uri));}async move(target){events.push(['move',target.uri]);if(target.exists)throw Error('exists');files.set(target.uri,files.get(this.uri));files.delete(this.uri);}}
 function load(relative){let file=path.resolve(root,relative);if(!path.extname(file))file+=fs.existsSync(file+'.ts')?'.ts':'.tsx';if(cache.has(file))return cache.get(file).exports;
 const m={exports:{}};cache.set(file,m);const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 const jsx=(type,props)=>({type,props});vm.runInThisContext(`(function(require,module,exports){${code}\n})`,{filename:file})(name=>{
 if(name==='react')return react;if(name==='react/jsx-runtime')return{jsx,jsxs:jsx};if(name==='react-native')return native;if(name==='expo-image')return{Image:'Image'};
 if(name==='expo-file-system')return{File,Directory,Paths:{document:new Directory('documents')}};if(name==='expo')return{uuid:{v4:()=>`synthetic-${++uuid}`}};if(name==='expo-image-picker')return picker;
 if(name.endsWith('/use-local-profile'))return{useLocalProfile:()=>profile};if(name==='react-native-safe-area-context')return{useSafeAreaInsets:()=>insets};
 if(name.endsWith('/ci-theme'))return require('./ci-theme-fixture.cjs');if(name.endsWith('/sheet-visual'))return require('./sheet-visual-fixture.cjs');
 if(name.endsWith('/bemem-theme'))return{bemem:{border:'#ccc'}};if(name==='./EightSlotHeader')return{compactHeaderStyles:{target:{width:48,height:48},circle:{width:32}}};
 if(['./ProfileSheet','./ProfileAvatar','./AddCardIcon','./AccountIcon','./BememIcon','./AddCardSheet','./GlassButton','./ConfirmationDialog'].includes(name)){const n=name.slice(2);return{[n]:n};}
 if(!name.startsWith('.'))throw Error('Unexpected dependency '+name);return load(path.resolve(path.dirname(file),name));
 },m,m.exports);return m.exports;}
 return{load,profile,animations,events,files,picker,listeners,render(fn,props){cursor=0;effects=[];const t=fn(props);effects.forEach(fn=>fn());return t;},nodes};
}
module.exports={fixture,nodes};
