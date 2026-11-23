// Public assets / synthetic data only; never reads a device Wallet.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),tokens=require('../design-system/bemem-vivid-lagoon/TOKENS.json'),historical=require('../design-system/bemem-lagoon-glass-rc2/TOKENS.json');
const matte=require('../assets/card-faces/vivid-lagoon-v1/MANIFEST.json');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const lum=hex=>hex.slice(1).match(/../g).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
const contrast=(a,b)=>(Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);

test('Current Vivid Lagoon adoption preserves historical palettes, fonts, geometry, status and material contracts',()=>{
 assert.match(read('src/constants/lagoon-theme.ts'),/bemem-vivid-lagoon\/TOKENS.json/);
 assert.equal(tokens.metadata.defaultThemeId,'vivid-lagoon');
 for(const [id,p] of Object.entries(historical.palettes))assert.deepEqual(tokens.palettes[id],p);
 assert.deepEqual(tokens.core,historical.core);assert.deepEqual(tokens.semantic.status,historical.semantic.status);
 const {ciColors}=require('./ci-theme-fixture.cjs');assert.deepEqual(ciColors.brand,tokens.brand);
 assert.equal(ciColors.surface.canvas,'#FFFFFF');assert.equal(ciColors.surface.sheet,'#F5F8F8');
});
test('Action/wordmark/body text and every matte foreground meet normal-text contrast on their opaque fills',()=>{
 const p=tokens.palettes['vivid-lagoon'].colors;
 assert.ok(contrast(p.action.primary,p.text.onAction)>=4.5);
 for(const surface of ['#FFFFFF','#F5F8F8',tokens.brand.light])for(const color of [tokens.brand.deep,p.text.primary,p.text.secondary])assert.ok(contrast(color,surface)>=4.5,`${color}/${surface}`);
 // Existing sky form colour provides persisted textColor; it does not recolour these PNGs.
 for(const palette of Object.values(matte.palette))for(const fill of palette)assert.ok(contrast('#143f3c',fill)>=4.5,fill);
});
test('Eight original matte pairs are real lightweight PNGs, versioned, statically bundled and distinct from legacy files',()=>{
 assert.equal(matte.artworks.length,16);assert.ok(matte.totalBytes<1024*1024);
 const hashes=new Set();
 for(const asset of matte.artworks){
  const data=fs.readFileSync(path.join(root,asset.runtime));
  assert.equal(data.subarray(0,8).toString('hex'),'89504e470d0a1a0a');assert.equal(data.readUInt32BE(16),1536);assert.equal(data.readUInt32BE(20),1536);
  assert.equal(data.length,asset.byteLength);assert.equal(crypto.createHash('md5').update(data).digest('hex'),asset.md5);
  assert.equal(crypto.createHash('sha256').update(data).digest('hex'),asset.sha256);hashes.add(asset.sha256);
  const svg=read(asset.source);assert.doesNotMatch(svg,/linearGradient|radialGradient|filter|<image|<text|opacity=/);
  assert.ok(read('src/lib/default-card-artwork-assets.ts').includes(`require('../../${asset.runtime}')`));
 }
 assert.equal(hashes.size,16);
});
test('White Canvas has no tinted Home overlay; Header/Footer retain accepted geometry and original navigation slots',()=>{
 assert.match(read('src/app/index.tsx'),/canvasLight: \{ \.\.\.StyleSheet.absoluteFill, backgroundColor: lagoon.canvas.base \}/);
 assert.match(read('src/components/bemem/NavigationHeader.tsx'),/header:\{minHeight:48,width:'100%'/);
 assert.match(read('src/components/bemem/WalletCanvas.tsx'),/marginHorizontal: 16, marginTop: 0/);
 assert.match(read('src/components/bemem/ContextualFooter.tsx'),/minHeight:56,paddingVertical:4/);
 assert.match(read('src/components/bemem/ContextualFooter.tsx'),/minHeight:48,alignItems:/);
 assert.match(read('src/components/bemem/DecorateMode.tsx'),/statusBarTranslucent navigationBarTranslucent/);
});
