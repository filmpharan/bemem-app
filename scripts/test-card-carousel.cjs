// Actual production layout/component contracts with synthetic native events. No Wallet/device IO.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const root=path.resolve(__dirname,'..');
function env(){
 const slots=[],cache=new Map();let cursor=0,effects=[],motionListener;
 const same=(a,b)=>a&&b&&a.length===b.length&&b.every((v,i)=>v===a[i]);
 const react={useState(v){const i=cursor++;if(!(i in slots))slots[i]=typeof v==='function'?v():v;return[slots[i],v=>{slots[i]=typeof v==='function'?v(slots[i]):v;}];},useRef(v){const i=cursor++;return slots[i]??={current:v};},
  useEffect(fn,deps){const i=cursor++,old=slots[i];if(!same(old?.deps,deps))effects.push(()=>{old?.cleanup?.();slots[i]={deps,cleanup:fn()};});}};
 const native={AccessibilityInfo:{isReduceMotionEnabled:async()=>true,addEventListener(_name,fn){motionListener=fn;return{remove(){}};}},Keyboard:{isVisible:()=>false},Platform:{OS:'android'},StyleSheet:{create:v=>v,absoluteFill:{}},...Object.fromEntries(['View','ScrollView','Modal','KeyboardAvoidingView','Pressable'].map(n=>[n,n]))};
 function load(file){file=path.resolve(root,file);if(!/\.tsx?$/.test(file))file+=fs.existsSync(file+'.ts')?'.ts':'.tsx';if(cache.has(file))return cache.get(file).exports;const mod={exports:{}};cache.set(file,mod);
  const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
  vm.runInThisContext(`(function(require,module,exports){${code}\n})`,{filename:file})(n=>{
   if(n==='react')return react;if(n==='react/jsx-runtime')return{jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})};if(n==='react-native')return native;
   if(n==='react-native-safe-area-context')return{SafeAreaView:'SafeAreaView'};
   if(n.endsWith('/ci-theme'))return require('./ci-theme-fixture.cjs');if(n.endsWith('/sheet-visual'))return require('./sheet-visual-fixture.cjs');
   if(['./GlassButton','./AddCardText','./AddCardIcon'].includes(n))return{[n.slice(2)]:n.slice(2)};
   assert.ok(n.startsWith('.'));return load(path.resolve(path.dirname(file),n));
  },mod,mod.exports);return mod.exports;
 }
 return{load,render(fn,p){cursor=0;effects=[];const tree=fn(p);effects.forEach(fn=>fn());return tree;},motion:v=>motionListener?.(v)};
}
const nodes=(t,out=[])=>{if(!t||typeof t!=='object')return out;if(Array.isArray(t)){t.forEach(n=>nodes(n,out));return out;}out.push(t);nodes(t.props?.children,out);return out;};
const layout=env().load('src/components/bemem/add-card-layout.ts'),presets=env().load('src/lib/card-size-presets.ts');
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
for(const width of [240,320,353,372,560])test(`Nine true-scale footprints, fixed axis heights and exact center offsets at ${width}dp`,()=>{
 for(const orientation of ['landscape','portrait']){
  const m=layout.cardCarouselLayout(width,`card-${orientation}`);assert.equal(m.presets.length,orientation==='landscape'?5:4);
  let left=m.leading;
  m.presets.forEach((p,i)=>{const size=layout.cardPreviewSize(width,p.id);near(size.width,(p.ratioWidth-.2)*m.unit);near(size.height,(p.ratioHeight-.2)*m.unit);
   near(left+size.width/2-m.offsets[i],width/2);left+=size.width+m.gap;
   near(layout.cardCarouselLayout(width,p.id).height,m.height);assert.ok(size.width<=width*.84+1e-7);
  });
  near(left-m.gap+m.trailing-width,m.offsets.at(-1));
 }
 const size=id=>layout.cardPreviewSize(width,id),card=size('card-landscape');
 assert.ok(size('voucher-landscape').width>card.width&&size('voucher-landscape').height<card.height);
 assert.ok(size('boarding-pass-landscape').width>card.width);near(size('boarding-pass-landscape').height,card.height);
 const portrait=size('card-portrait'),vaccine=size('vaccine-passport-portrait');assert.ok(vaccine.width>portrait.width&&vaccine.height>portrait.height);
 for(const axis of ['landscape','portrait']){const photo=size(`photo-${axis}`),card=size(`card-${axis}`);assert.ok(photo.width<card.width&&photo.height<card.height);}
});
function carousel(id='card-landscape'){
 const e=env(),C=e.load('src/components/bemem/CardSizeCarousel.tsx').CardSizeCarousel,selected=[],calls=[];
 let props={width:353,selectedId:id,disabled:false,onSelect:id=>selected.push(id),photoAction:'photo',renderPreview:(id,width,height,renderArtwork)=>({type:'Preview',props:{id,width,height,renderArtwork}})};
 const render=()=>e.render(C,props);let tree=render();nodes(tree).find(n=>n.type==='ScrollView').props.ref.current={scrollTo:p=>calls.push(p)};
 return{e,selected,calls,render,update(next){props={...props,...next};return render();}};
}
const scroll=t=>nodes(t).find(n=>n.type==='ScrollView'),event=(x,velocity=0)=>({nativeEvent:{contentOffset:{x,y:0},velocity:{x:velocity,y:0}}});
test('Swipe settles immediately to exactly one size; duplicate momentum events cannot select twice',()=>{
 const h=carousel(),s=scroll(h.render()),m=layout.cardCarouselLayout(353,'card-landscape');
 s.props.onScrollBeginDrag();s.props.onScrollEndDrag(event(m.offsets[3],1));assert.equal(h.selected.length,0);
 s.props.onMomentumScrollEnd(event(m.offsets[3]));s.props.onMomentumScrollEnd(event(m.offsets[4]));assert.deepEqual(h.selected,['voucher-landscape']);
});
test('Slow drag selects nearest snap, boundaries clamp and no carousel crosses orientation',()=>{
 for(const id of ['card-landscape','card-portrait']){
  const h=carousel(id),m=layout.cardCarouselLayout(353,id),s=scroll(h.render());
  s.props.onScrollBeginDrag();s.props.onScrollEndDrag(event(-100));assert.equal(h.selected.at(-1),m.presets[0].id);
  s.props.onScrollBeginDrag();s.props.onMomentumScrollEnd(event(99999));assert.equal(h.selected.at(-1),m.presets.at(-1).id);
  assert.ok(h.selected.every(id=>presets.cardSizePreset(id).orientation===presets.cardSizePreset(m.presets[0].id).orientation));
 }
});
test('Dropdown centers the actual selected preset without a selection feedback loop',()=>{
 const h=carousel();h.update({selectedId:'boarding-pass-landscape'});
 near(h.calls.at(-1).x,layout.cardCarouselLayout(353,'boarding-pass-landscape').offsets[4]);assert.equal(h.calls.at(-1).animated,false);
 scroll(h.render()).props.onMomentumScrollEnd(event(0));assert.equal(h.selected.length,0);
});
test('Orientation/width/selection changes reject callbacks from an interrupted old gesture',()=>{
 for(const update of [{selectedId:'photo-portrait'},{width:320},{selectedId:'mini-landscape'}]){
  const h=carousel(),old=scroll(h.render());old.props.onScrollBeginDrag();h.update(update);old.props.onMomentumScrollEnd(event(0));assert.equal(h.selected.length,0);
 }
});
test('Front/Back or form typing re-render does not reset scroll or select another footprint',()=>{
 const h=carousel(),before=h.calls.length;h.render();h.render();assert.equal(h.calls.length,before);assert.equal(h.selected.length,0);
});
test('Disabled picker/crop/busy form cannot change size; vertical form gestures use native direction locking',()=>{
 const h=carousel(),s=scroll(h.update({disabled:true}));assert.equal(s.props.scrollEnabled,false);assert.equal(s.props.horizontal,true);assert.equal(s.props.directionalLockEnabled,true);
 s.props.onScrollBeginDrag();s.props.onMomentumScrollEnd(event(0));assert.equal(h.selected.length,0);
 assert.equal(s.props.onStartShouldSetResponder,undefined);assert.equal(nodes(h.render()).filter(n=>n.props?.children==='photo').length,1);
});
test('Reduced-motion changes affect only programmatic carousel sliding',()=>{
 const h=carousel();h.e.motion(false);h.update({selectedId:'photo-landscape'});assert.equal(h.calls.at(-1).animated,true);
 h.e.motion(true);h.update({selectedId:'mini-landscape'});assert.equal(h.calls.at(-1).animated,false);
});
for(const title of ['Add Card','Edit Card'])test(`${title} header retains title and true sheet-centered face control with a narrow fallback`,()=>{
 const e=env(),Sheet=e.load('src/components/bemem/AddCardSheet.tsx').AddCardSheet;let flips=0;
 const props={modalOnly:true,title,face:{side:'front',disabled:false,onToggle(){flips++;}},children:'form',footer:'actions',onClose(){}};
 let tree=e.render(Sheet,props),ns=nodes(tree),head=ns.find(n=>n.props?.testID==='card-form-header');
 head.props.onLayout({nativeEvent:{layout:{width:353}}});ns.find(n=>n.type==='AddCardText'&&n.props.children===title).props.onMeasure(90);
 tree=e.render(Sheet,props);let center=nodes(tree).find(n=>n.props?.testID==='card-form-face-control');assert.equal(center.props.style.position,'absolute');near(center.props.style.left+76/2,353/2);
 nodes(tree).find(n=>n.props?.accessibilityLabel==='Switch card front and back').props.onPress();assert.equal(flips,1);
 assert.ok(nodes(tree).some(n=>n.props?.accessibilityLabel===`Close ${title}`));assert.ok(nodes(tree).some(n=>n.props?.children===title));
 nodes(tree).find(n=>n.type==='AddCardText'&&n.props.children===title).props.onMeasure(220);tree=e.render(Sheet,props);center=nodes(tree).find(n=>n.props?.testID==='card-form-face-control');assert.equal(center.props.style.alignSelf,'center');
});


test('Export a geometry-only review from production carousel cells and approved artwork, without claiming native pixels',()=>{
 const image=fs.readFileSync(path.join(root,'assets/card-faces/vivid-lagoon-v1/art-bemem-vl1-front-gray.png')).toString('base64');
 const snapshots=[];let body='';const width=353;
 for(const orientation of ['landscape','portrait']){
  const m=layout.cardCarouselLayout(width,`card-${orientation}`);
  for(const p of m.presets){
   const h=carousel(p.id),tree=h.render(),native=scroll(tree),children=native.props.children,index=m.presets.findIndex(x=>x.id===p.id);
   const col=orientation==='landscape'?0:1,x0=20+col*393,y0=94+index*300;
   snapshots.push({selected:p.id,viewport:width,height:tree.props.style.height,offset:native.props.contentOffset.x,cells:children.map(c=>({id:c.key??c.props.testID,...c.props.style}))});
   const clip='viewport-'+p.id;body+=`<text x="${x0}" y="${y0-12}" font-size="14">${p.label}</text><clipPath id="${clip}"><rect x="${x0}" y="${y0}" width="353" height="${m.height}"/></clipPath><rect x="${x0}" y="${y0}" width="353" height="${m.height}" fill="#f0f3f4"/>`;
   let left=native.props.contentContainerStyle.paddingLeft-native.props.contentOffset.x;
   body+=`<g clip-path="url(#${clip})">`;
   children.forEach((cell,i)=>{const w=cell.props.style.width,ht=cell.props.style.height,x=x0+left,y=y0+(m.height-ht)/2,mask=clip+'-'+i;
    body+=`<clipPath id="${mask}"><rect x="${x}" y="${y}" width="${w}" height="${ht}" rx="14"/></clipPath><image x="${x}" y="${y}" width="${w}" height="${ht}" href="data:image/png;base64,${image}" preserveAspectRatio="xMidYMid slice" opacity="${cell.props.style.opacity}" clip-path="url(#${mask})"/>`;
    left+=w+native.props.contentContainerStyle.gap;
   });body+='</g>';
  }
 }
 const out=path.join(root,'output');fs.mkdirSync(out,{recursive:true});
 fs.writeFileSync(path.join(out,'card-carousel-production-geometry.json'),JSON.stringify({notice:'Synthetic production component geometry, not a native screenshot',snapshots},null,2));
 fs.writeFileSync(path.join(out,'card-carousel-production-geometry.svg'),`<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1580" viewBox="0 0 800 1580"><rect width="800" height="1580" fill="white"/><g fill="#263943" font-family="sans-serif"><text x="20" y="28" font-size="20">bemem - nine carousel sizes</text><text x="20" y="52" font-size="12">Actual production geometry + approved artwork. Not a Samsung/native screenshot.</text>${body}</g></svg>`);
 assert.equal(snapshots.length,9);
});


test('Only the visible footprint and immediate neighbors request artwork; window follows native scrolling before selection settles',()=>{
 for(const id of ['card-landscape','card-portrait']){
  const h=carousel(id),model=layout.cardCarouselLayout(353,id);let tree=h.render();const previews=()=>nodes(tree).filter(n=>n.type==='Preview'),selectedIndex=model.presets.findIndex(p=>p.id===id);
  assert.equal(previews().length,model.presets.length);previews().forEach((p,i)=>assert.equal(p.props.renderArtwork,Math.abs(i-selectedIndex)<=1));
  const s=scroll(tree);s.props.onScrollBeginDrag();s.props.onScroll(event(model.offsets.at(-1)));tree=h.render();assert.ok(previews().filter(p=>p.props.renderArtwork).length<=3);previews().forEach((p,i)=>assert.equal(p.props.renderArtwork,i>=model.presets.length-2));assert.equal(h.selected.length,0);
  s.props.onMomentumScrollEnd(event(model.offsets.at(-1)));assert.equal(h.selected.at(-1),model.presets.at(-1).id);
 }
});
