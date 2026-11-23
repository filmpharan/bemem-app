const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),theme=require('./ci-theme-fixture.cjs'),tokens=require('../design-system/bemem-vivid-lagoon/TOKENS.json');
const flat=style=>Object.assign({},...[style].flat(Infinity).filter(Boolean));
const jsx=(type,props)=>({type,props}),m={exports:{}};
const code=ts.transpileModule(fs.readFileSync(path.join(root,'src/components/bemem/GlassButton.tsx'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
vm.runInThisContext(`(function(require,module,exports){${code}\n})`)(name=>{
 if(name==='react/jsx-runtime')return{jsx,jsxs:jsx};if(name==='react-native')return{Pressable:'Pressable',View:'View',StyleSheet:{create:s=>s,flatten:flat}};
 if(name==='../../constants/lagoon-theme')return{core:tokens.core};if(name==='../../constants/ci-theme')return theme;throw Error('Unexpected native/storage dependency '+name);
},m,m.exports);
const Button=m.exports.GlassButton;
function luminance(hex){const rgb=hex.slice(1).match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;}
test('Flat Tonal primary preserves the approved Lagoon and readable white text across enabled/pressed/disabled states',()=>{
 const {ciButtons:b}=theme;assert.equal(b.primary,'#00786F');for(const color of [b.primary,b.primaryPressed,b.disabledPrimary])assert.ok(1.05/(luminance(color)+.05)>=4.5,color);
 const button=Button({kind:'action',children:'Save Changes'});assert.equal(flat(button.props.style({pressed:false})).backgroundColor,b.primary);assert.equal(flat(button.props.style({pressed:true})).backgroundColor,b.primaryPressed);
 assert.equal(flat(Button({kind:'action',disabled:true,children:'Save'}).props.style({pressed:false})).backgroundColor,b.disabledPrimary);
});
test('All public variants discard local decorative overrides, keep geometry and mount only one content view',()=>{
 const shadowKeys=['boxShadow','elevation','shadowColor','shadowOffset','shadowOpacity','shadowRadius','backgroundImage','experimental_backgroundImage'];
 for(const kind of ['utility','action','gel'])for(const disabled of [false,true]){
  const layout={width:173,minHeight:52,borderRadius:14,paddingHorizontal:12,marginTop:7,boxShadow:'0 8px 20px red',elevation:9,shadowColor:'red',shadowOpacity:1,shadowRadius:10,shadowOffset:{width:1,height:1},backgroundImage:'linear-gradient(red,white)'};
  const button=Button({kind,disabled,children:'Actual label',style:[{height:54},layout]});for(const pressed of [false,true]){const result=flat(button.props.style({pressed}));for(const key of shadowKeys)assert.equal(result[key],undefined);assert.equal(result.width,173);assert.equal(result.height,54);assert.equal(result.minHeight,52);assert.equal(result.borderRadius,14);assert.equal(result.paddingHorizontal,12);assert.equal(result.marginTop,7);}
  assert.equal(button.props.children.type,'View');assert.equal(button.props.children.props.children,'Actual label');assert.equal(typeof button.props.children,'object');
 }
});
test('Secondary, selected, tertiary, disabled and busy remain distinct without changing handlers or accessibility',()=>{
 const b=theme.ciButtons,press=()=>{},button=Button({children:'Keep',selected:true,onPress:press,accessibilityLabel:'My Keeps',accessibilityState:{expanded:true}});
 assert.equal(button.props.onPress,press);assert.equal(button.props.accessibilityLabel,'My Keeps');assert.equal(button.props.accessibilityState.expanded,true);assert.equal(button.props.accessibilityState.selected,true);assert.equal(flat(button.props.style({pressed:false})).backgroundColor,b.selected);
 const secondary=Button({children:'Cancel'});assert.equal(flat(secondary.props.style({pressed:false})).backgroundColor,b.secondary);assert.equal(flat(secondary.props.style({pressed:true})).backgroundColor,b.secondaryPressed);
 const tertiary=Button({children:'Close',tone:'tertiary'});assert.equal(flat(tertiary.props.style({pressed:false})).backgroundColor,'transparent');assert.equal(flat(tertiary.props.style({pressed:true})).backgroundColor,b.secondary);
 for(const props of [{disabled:true},{busy:true},{disabled:true,busy:true}]){const target=Button({kind:'action',children:'Save',...props});assert.equal(target.props.disabled,true);assert.equal(target.props.accessibilityState.disabled,true);assert.equal(target.props.accessibilityState.busy,!!props.busy);}
});
test('Flat buttons do not remove card artwork, scan-panel, sheet depth or the approved Canvas capsule treatment',()=>{
 const read=file=>fs.readFileSync(path.join(root,file),'utf8');assert.match(read('src/components/bemem/CardAppearancePreview.tsx'),/boxShadow:/);assert.match(read('src/components/bemem/MembershipCard.tsx'),/boxShadow:/);
 assert.match(read('src/components/bemem/MembershipCardDetail.tsx'),/boxShadow: sheetVisual.shadow/);assert.match(read('src/components/bemem/MembershipCardDetail.tsx'),/boxShadow: '0 8px 14px #11182715'/);assert.match(read('src/components/bemem/ContextualFooter.tsx'),/boxShadow:'0 3px 12px #16584D18'/);
 const buttons=read('src/components/bemem/GlassButton.tsx');assert.doesNotMatch(buttons,/styles\.(specular|depth|innerRim|clip)|core\.materials|linear-gradient|radial-gradient/);
});
