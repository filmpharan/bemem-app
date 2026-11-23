const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),tokens=require('../design-system/bemem-vivid-lagoon/TOKENS.json');
const {ciColors,ciTypography,ciButtons,ciStates,fontForUiText}=require('./ci-theme-fixture.cjs');
const palette=tokens.palettes[tokens.metadata.defaultThemeId].colors;
const flat=s=>Object.assign({},...[s].flat(Infinity).filter(Boolean));
function styles(file){const sf=ts.createSourceFile(file,fs.readFileSync(path.join(root,file),'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 let expression;for(const s of sf.statements)if(ts.isVariableStatement(s))for(const d of s.declarationList.declarations)if(d.name.getText(sf)==='styles')expression=d.initializer.arguments[0].getText(sf);
 assert.ok(expression,file);const code=ts.transpileModule(`const result=${expression};result;`,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
 return vm.runInNewContext(code,{...require('./sheet-visual-fixture.cjs'),ciColors,ciTypography,ciButtons,ciStates,lagoon:palette,lagoonFonts:{latin:'BememManrope',thai:'BememThai'},core:tokens.core,
  StyleSheet:{absoluteFill:{position:'absolute',left:0,right:0,top:0,bottom:0},hairlineWidth:1},alpha:(h,a)=>h+Math.round(a*255).toString(16).padStart(2,'0'),
  bemem:{foreground:palette.text.primary,background:palette.canvas.base,border:palette.rim.inner,primary:palette.action.primary,muted:palette.text.secondary,error:'#b42318'},
  layout:{padding:20,gap:12,previewGap:16,toolSize:36,iconSize:16,inputHeight:44,selectorHeight:36,sheetRadius:22,fieldRadius:14,buttonRadius:8},CARD_CORNER_RADIUS:14});
}
test('Five explicit typography roles have current sizes and no layout or global Text behavior',()=>{
 assert.deepEqual(Object.keys(ciTypography),['title','section','body','supporting','button']);
 for(const [name,size,line]of [['title',18,26],['section',16,24],['body',14,22],['supporting',12,18],['button',14,22]]){
  assert.equal(ciTypography[name].fontFamily,'BememManrope');assert.equal(ciTypography[name].fontSize,size);assert.equal(ciTypography[name].lineHeight,line);
  assert.equal(Object.keys(ciTypography[name]).some(k=>/^(width|height|margin|padding|color|border)/.test(k)),false);
 }
 assert.equal(ciTypography.title.fontWeight,'800');assert.equal(ciTypography.button.fontWeight,'600');
 const source=fs.readFileSync(path.join(root,'src/constants/ci-theme.ts'),'utf8');assert.doesNotMatch(source,/Text\.defaultProps|setNativeProps|prototype\./);
});
test('Semantic roles reuse Vivid Lagoon palette and keep approved Save/danger distinct from status success and neutral',()=>{
 assert.equal(ciColors.surface.canvas,palette.canvas.base);assert.equal(ciColors.surface.elevated,palette.surface.base);assert.equal(ciColors.text.primary,palette.text.primary);assert.equal(ciColors.text.secondary,palette.text.secondary);
 assert.equal(ciColors.action.primary,palette.action.primary);assert.equal(ciColors.action.positiveSave,'#26734d');assert.equal(ciColors.status.success,'#176b4a');
 for(const key of ['back','discard','destructive'])assert.equal(ciColors.action[key],'#b42318');assert.equal(ciColors.status.error,'#b42318');assert.equal(ciColors.action.neutral,'#263943');assert.equal(ciColors.status.disabled,palette.text.disabled);
});
test('English uses Manrope; Thai and mixed UI strings use one Noto family without changing their text',()=>{
 for(const s of ['Save Changes','00123456','Card / Store'])assert.equal(fontForUiText(s),'BememManrope');
 for(const s of ['ทดสอบกำลังใช้งาน','Test บัตร 00123456','สวัสดีค่ะ']){const before=s;assert.equal(fontForUiText(s),'BememThai');assert.equal(s,before);}
});
function fontGlyphs(name){const b=fs.readFileSync(path.join(root,'assets/fonts/lagoon',name)),tables=new Map();for(let i=0;i<b.readUInt16BE(4);i++){const at=12+16*i;tables.set(b.toString('ascii',at,at+4),b.readUInt32BE(at+8));}
 const base=tables.get('cmap'),maps=[];for(let i=0;i<b.readUInt16BE(base+2);i++){const at=base+4+8*i,platform=b.readUInt16BE(at);if(platform===0||platform===3){const o=base+b.readUInt32BE(at+4);maps.push([b.readUInt16BE(o),o]);}}
 return{tables,has(cp){for(const [format,o]of maps){if(format===4&&cp<65536){const count=b.readUInt16BE(o+6)/2;for(let i=0;i<count;i++){const end=b.readUInt16BE(o+14+2*i),start=b.readUInt16BE(o+16+2*count+2*i);if(cp<start||cp>end)continue;const delta=b.readInt16BE(o+16+4*count+2*i),at=o+16+6*count+2*i,offset=b.readUInt16BE(at);const g=offset?b.readUInt16BE(at+offset+2*(cp-start)):(cp+delta)&65535;if(g)return true;}}
  if(format===12)for(let i=0;i<b.readUInt32BE(o+12);i++){const at=o+16+12*i,start=b.readUInt32BE(at),end=b.readUInt32BE(at+4),glyph=b.readUInt32BE(at+8);if(cp>=start&&cp<=end&&glyph+cp-start)return true;}
 }return false;}};
}
test('Bundled Noto actually contains Latin, Thai bases and combining marks plus shaping tables; Manrope is not treated as Thai',()=>{
 const noto=fontGlyphs('noto-sans-thai.ttf'),manrope=fontGlyphs('manrope.ttf');for(const cp of [65,97,48,0x0e01,0x0e31,0x0e33,0x0e34,0x0e48])assert.equal(noto.has(cp),true,cp.toString(16));
 assert.equal(noto.tables.has('GSUB'),true);assert.equal(noto.tables.has('GPOS'),true);assert.equal(manrope.has(0x0e01),false);
});
test('Approved confirmation geometry, typography, states and safe/destructive hierarchy survive role migration',()=>{
 const s=styles('src/components/bemem/ConfirmationDialog.tsx');assert.equal(s.dialog.borderRadius,20);assert.equal(s.dialog.maxWidth,400);assert.equal(s.content.padding,20);assert.equal(s.content.gap,12);
 assert.equal(s.title.fontSize,18);assert.equal(s.title.lineHeight,26);assert.equal(s.label.fontSize,14);assert.equal(s.label.lineHeight,22);assert.equal(s.button.minHeight,48);
 assert.equal(s.primary.backgroundColor,palette.action.primary);assert.equal(s.destructive.color,'#b42318');assert.equal(s.disabled.opacity,.65);assert.equal(s.pressed.opacity,.8);
});
test('Sheet and compact form exceptions preserve approved line heights, bounds and small labels',()=>{
 const sheet=styles('src/components/bemem/AddCardSheet.tsx'),form=styles('src/components/bemem/AddCardForm.tsx');assert.equal(sheet.title.fontSize,18);assert.equal(sheet.title.lineHeight,28);assert.equal(sheet.sheet.borderTopLeftRadius,22);assert.equal(sheet.content.padding,20);
 assert.equal(form.sideLabel.fontSize,10);assert.equal(form.sideLabel.lineHeight,15);assert.equal(form.label.lineHeight,16);assert.equal(form.input.minHeight,48);assert.equal(form.input.lineHeight,20);assert.equal(form.tool.width,36);
 assert.equal(form.error.color,ciColors.status.error);assert.equal(form.hint.fontFamily,ciTypography.supporting.fontFamily);
});
test('Add/Edit actions, History body/status and general feedback have explicit roles while exceptions stay compact',()=>{
 const edit=styles('src/components/bemem/EditMembershipCardEditor.tsx'),add=styles('src/components/bemem/AddCardEditor.tsx'),history=styles('src/components/bemem/CardHistorySheet.tsx'),home=styles('src/app/index.tsx');
 for(const s of [edit,add]){assert.equal(s.actionText.fontFamily,'BememManrope');assert.equal(s.actionText.lineHeight,20);assert.equal(s.notice.fontSize,10);assert.equal(s.action.minHeight,48);}
 const detail=styles('src/components/bemem/MembershipCardDetail.tsx');assert.equal(edit.deleteText,undefined);assert.equal(detail.deleteText.color,'#b42318');assert.equal(detail.deleteText.fontSize,14);assert.equal(history.text.lineHeight,22);assert.equal(history.heading.fontSize,16);assert.equal(history.helper.lineHeight,19);assert.equal(home.error.fontFamily,'BememManrope');assert.equal(home.loadingText.fontFamily,'BememManrope');
});
test('Policy reading size and empty-state wording remain intentional exceptions',()=>{
 const account=styles('src/components/bemem/HomeAccountMenu.tsx');assert.equal(account.body.fontSize,15);assert.equal(account.body.lineHeight,24);assert.equal(account.closeText.fontSize,15);
 const copy=fs.readFileSync(path.join(root,'src/components/bemem/WalletEmptyState.tsx'),'utf8');assert.match(copy,/Phase 1 uses demo cards only\. Adding real cards is coming in a future phase\./);
});

function measuredText(){const frames=[],cache={},registered=[];let cursor=0,scale=1,ready=true;const native={StyleSheet:{create:x=>x,flatten:flat},Text:'Text',View:'View',useWindowDimensions:()=>({fontScale:scale})};
 const jsx=(type,props)=>({type,props}),file=path.join(root,'src/components/bemem/AddCardText.tsx'),m={exports:{}};
 const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
 vm.runInThisContext(`(function(require,module,exports){${code}\n})`)(name=>{
  if(name==='react')return{useState(v){const i=cursor++;if(!(i in frames))frames[i]=v;return[frames[i],v=>frames[i]=typeof v==='function'?v(frames[i]):v];},useRef(v){const i=cursor++;return frames[i]??={current:v};}};
  if(name==='react-native')return native;if(name==='react/jsx-runtime')return{jsx,jsxs:jsx};if(name==='expo-font')return{useFonts:map=>{registered.push(map);return[ready];}};if(name.endsWith('.ttf'))return name;if(name.endsWith('/ci-theme'))return require('./ci-theme-fixture.cjs');throw Error(name);
 },m,m.exports);
 return{registered,render(text,maxWidth,fontScale=1,fontReady=true){cursor=0;scale=fontScale;ready=fontReady;return m.exports.AddCardText({children:text,maxWidth,style:ciTypography.button});}};
}
test('Actual measured labels load both local fonts and stay bounded with scaling at360/393/412dp',()=>{
 for(const width of [360,393,412])for(const scale of [1,1.5,2])for(const label of ['Save Changes','ทดสอบ บัตร ABC']){
  const h=measuredText(),available=(width-52)/2,t=h.render(label,available,scale),shown=t.props.children[1];assert.ok(t.props.style.width<=available);assert.equal(shown.props.allowFontScaling,true);assert.equal(shown.props.adjustsFontSizeToFit,false);assert.equal(shown.props.children,label);assert.equal(flat(shown.props.style).fontFamily,fontForUiText(label));assert.ok(h.registered[0].BememManrope);assert.ok(h.registered[0].BememThai);
  assert.equal(flat(h.render(label,available,scale,false).props.children[1].props.style).fontFamily,undefined);
 }
});
