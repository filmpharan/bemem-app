// Independent ZXing decoding of pixels reconstructed from the ACTUAL emitted SVG.
// Only synthetic payloads. No DOM, browser, device, network, file images or native decoder.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), ts = require('typescript');
const Z = require('@zxing/library');
const root = path.resolve(__dirname, '..'), cache = new Map();
function load(relative) {
  const file = path.resolve(root, relative);
  if (cache.has(file)) return cache.get(file).exports;
  const module = { exports: {} }; cache.set(file, module);
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  vm.runInThisContext(`(function(require,module,exports){${code}\n})`, { filename: file })(name => {
    if (name === 'qrcode/lib/core/qrcode' || name === 'jsbarcode') return require(name);
    assert.ok(name.startsWith('.'), `Unexpected dependency ${name}`);
    return load(path.resolve(path.dirname(file), name + '.ts'));
  }, module, module.exports);
  return module.exports;
}
const { encodeCardCode, cardCodeDataUri, cardCodeFrame } = load('src/lib/card-code.ts');
const { code128DisplaySvg } = load('src/lib/code128-display.ts');
function raster(svg, scale = 3) {
  const box = /viewBox="0 0 (\d+) (\d+)"/.exec(svg); assert.ok(box);
  const width = Number(box[1]) * scale, height = Number(box[2]) * scale;
  const pixels = new Uint8ClampedArray(width * height).fill(255);
  let count = 0;
  for (const match of svg.matchAll(/M(\d+) (\d+)h(\d+)v(\d+)h-\d+z/g)) {
    const x = Number(match[1]) * scale, y = Number(match[2]) * scale, w = Number(match[3]) * scale, h = Number(match[4]) * scale;
    assert.ok(x >= 0 && y >= 0 && x + w <= width && y + h <= height);
    for (let row = y; row < y + h; row++) pixels.fill(0, row * width + x, row * width + x + w);
    count++;
  }
  assert.ok(count); return { pixels, width, height };
}
function decode(svg, format, scale = 3) {
  const image = raster(svg, scale);
  const hints = new Map([[Z.DecodeHintType.POSSIBLE_FORMATS, [format === 'qr' ? Z.BarcodeFormat.QR_CODE : Z.BarcodeFormat.CODE_128]],
    [Z.DecodeHintType.TRY_HARDER, true]]);
  const reader = new Z.MultiFormatReader(); reader.setHints(hints);
  return reader.decode(new Z.BinaryBitmap(new Z.HybridBinarizer(new Z.RGBLuminanceSource(image.pixels, image.width, image.height))), hints);
}
const card = memberNumber => ({ kind: 'membership', memberNumber, payload: 'OBSOLETE URL https://example.test/old' });

test('A missing Number never falls back to a legacy URL or custom payload',()=>{
 for(const memberNumber of [null,'',undefined])for(const format of ['qr','code128']){
  const input={kind:'membership',memberNumber,payload:'https://example.test/old'};
  assert.equal(encodeCardCode(input,format).code,'invalid_payload');
 }
});

test('QR expands beyond the old 176dp cap while staying square; barcode uses maximum whole-module width and greater bar height',()=>{
 for(const density of [1,2.625,3]){
  const qr=encodeCardCode(card('00123456'),'qr'),q=cardCodeFrame(qr,304,density,280);
  assert.ok(q.width>176&&q.width<=280);assert.equal(q.width,q.height);assert.equal(q.pixelsPerModule,Math.floor(280*density/qr.width));
  const barcode=encodeCardCode(card('00123456'),'code128'),b=cardCodeFrame(barcode,304,density,280);
  assert.ok(b.height>126);assert.ok(b.width<=304);assert.ok(b.width+barcode.width/Math.max(1,density)>304);
  assert.equal(decode(code128DisplaySvg(barcode,b,density),'code128',1).getText(),'00123456');
 }
});
const ascii = ['0000012345', '000000000000', ' 000Ab c ', 'AbCdEf0123456789', '012345678901234567890123456789',
  ' ~!"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~ ', '      ', '00+66 081-234-5678', ' A  B   C '];
for (const [index, payload] of ascii.entries()) for (const format of ['qr', 'code128']) test(`Exact SVG round-trip ${format}, ASCII fixture ${index + 1}`, () => {
  const input = card(payload), before = JSON.stringify(input), code = encodeCardCode(input, format);
  assert.equal(code.ok, true); const result = decode(code.svg, format);
  assert.equal(result.getText(), payload); assert.equal(result.getBarcodeFormat(), format === 'qr' ? Z.BarcodeFormat.QR_CODE : Z.BarcodeFormat.CODE_128);
  assert.equal(JSON.stringify(input), before);
  const uri = cardCodeDataUri(code.svg); assert.equal(Buffer.from(uri.split(',')[1], 'base64').toString('ascii'), code.svg);
});
for (const [index, payload] of [' 000ภาษาไทย Ab ', '000會員 café 😀 ', 'e\u0301 é 000', ' 000\nline\tvalue\u0000 '].entries()) test(`UTF-8 QR round-trip fixture ${index + 1}; Code128 is rejected without conversion`, () => {
  const code = encodeCardCode(card(payload), 'qr'); assert.equal(code.ok, true); assert.equal(decode(code.svg, 'qr').getText(), payload);
  assert.equal(encodeCardCode(card(payload), 'code128').code, 'unsupported_code128');
});
test('Quiet zones are wholly white: QR four modules and Code128 ten modules on both sides', () => {
  for (const format of ['qr', 'code128']) {
    const code = encodeCardCode(card('000AbC'), format), scale = 3, image = raster(code.svg, scale);
    const quiet = (format === 'qr' ? 4 : 10) * scale;
    for (let row = 0; row < image.height; row++) for (let col = 0; col < quiet; col++) {
      assert.equal(image.pixels[row * image.width + col], 255); assert.equal(image.pixels[row * image.width + image.width - col - 1], 255);
    }
    if (format === 'qr') for (let row = 0; row < quiet; row++) {
      assert.ok(image.pixels.slice(row * image.width, (row + 1) * image.width).every(value => value === 255));
      assert.ok(image.pixels.slice((image.height - row - 1) * image.width, (image.height - row) * image.width).every(value => value === 255));
    }
    assert.match(code.svg, /fill="#ffffff"/); assert.match(code.svg, /fill="#000000"/);
    assert.doesNotMatch(code.svg, /<text|<image|filter|opacity|gradient|href=|<script/);
  }
});
test('Demo, malformed Unicode, empty payload and encoder capacity failures are explicit, not blank/fake codes', () => {
  assert.equal(encodeCardCode({ kind: 'demo' }, 'qr').code, 'demo_card');
  for (const payload of ['', '\ud800', '\udc00']) for (const format of ['qr', 'code128']) assert.equal(encodeCardCode(card(payload), format).code, 'invalid_payload');
  assert.equal(encodeCardCode(card('x'.repeat(10000)), 'qr').code, 'encoding_failed');
  assert.equal(encodeCardCode(card('x'.repeat(4097)), 'code128').code, 'encoding_failed');
});
test('QR core accepts explicit UTF-8 bytes without a TextEncoder, Buffer or browser global in the encoder', () => {
  const original = global.TextEncoder; global.TextEncoder = undefined;
  let code;
  try { assert.equal(typeof document, 'undefined'); assert.equal(typeof window, 'undefined'); code = encodeCardCode(card('000ภาษาไทย'), 'qr'); }
  finally { global.TextEncoder = original; }
  assert.equal(code.ok, true); assert.equal(decode(code.svg, 'qr').getText(), '000ภาษาไทย');
});
test('Measured frames use integral physical modules; too-wide codes are marked for a non-clipping error', () => {
  for (const density of [1, 1.5, 2, 2.625, 3, 4]) for (const width of [200, 280, 600]) for (const format of ['qr', 'code128']) {
    const code = encodeCardCode(card('000AbC 012345'), format), frame = cardCodeFrame(code, width, density);
    assert.equal(Number.isInteger(frame.pixelsPerModule), true); assert.ok(frame.pixelsPerModule >= 2);
    assert.ok(Math.abs(frame.width * density / code.width - frame.pixelsPerModule) < 0.00001);
    assert.equal(frame.scroll, frame.width > width);
  }
  const long = encodeCardCode(card('AbCd'.repeat(60)), 'code128');
  assert.equal(cardCodeFrame(long, 250, 3).scroll, true);
});
test('An altered Code128 check symbol cannot decode successfully as the original value', () => {
  const code = encodeCardCode(card('000AbC 123'), 'code128');
  // Remove the last symbol before the stop pattern; scanner must reject, not normalize data.
  const runs = [...code.svg.matchAll(/M(\d+) (\d+)h(\d+)v(\d+)h-\d+z/g)];
  const damaged = code.svg.replace(runs.at(-9)[0], '');
  // Use the one-dimensional reader directly: avoids MultiFormatReader logging its
  // expected NotFoundException for this intentionally damaged synthetic symbol.
  const image = raster(damaged);
  const reader = new Z.MultiFormatOneDReader(new Map([[Z.DecodeHintType.POSSIBLE_FORMATS, [Z.BarcodeFormat.CODE_128]]]));
  assert.throws(() => reader.decode(new Z.BinaryBitmap(new Z.HybridBinarizer(new Z.RGBLuminanceSource(image.pixels, image.width, image.height)))));
});
function renderView(props, width = 280, density = 3, failedUri = null, displaySvg = code128DisplaySvg) {
  const module = { exports: {} }; let index = 0;
  const values = [width, failedUri];
  const code = ts.transpileModule(fs.readFileSync(path.join(root, 'src/components/bemem/CardCodeView.tsx'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const jsx = (type, props) => ({ type, props });
  const dependencies = {
    react: { useMemo: fn => fn(), useState: () => { const i = index++; return [values[i], next => { values[i] = next; }]; } },
    'react-native': { View: 'View', Text: 'Text', StyleSheet: { create: value => value }, PixelRatio: { get: () => density } },
    'expo-image': { Image: 'Image' }, 'react/jsx-runtime': { jsx, jsxs: jsx },
    '../../lib/card-code': { encodeCardCode, cardCodeDataUri, cardCodeFrame }, '../../lib/code128-display': { code128DisplaySvg: displaySvg },
    '../../constants/lagoon-theme': { lagoonFonts: { latin: 'BememManrope' } },
  };
  vm.runInThisContext(`(function(require,module,exports){${code}\n})`)(name => {
    assert.ok(Object.hasOwn(dependencies, name)); return dependencies[name];
  }, module, module.exports);
  const view = module.exports.CardCodeView(props); return { view, values };
}
test('Real native Code View supplies decodable SVG data to existing expo-image, without cache/tint/blur/network', () => {
  for (const format of ['qr', 'code128']) {
    const payload = ' 000AbC ', rendered = renderView({ card: card(payload), format });
    const image = rendered.view.props.children; assert.equal(image.type, 'Image');
    const props = image.props; assert.equal(props.cachePolicy, 'none'); assert.equal(props.transition, 0);
    const svg = Buffer.from(props.source.uri.split(',')[1], 'base64').toString('ascii');
    assert.equal(decode(svg, format).getText(), payload);
    assert.ok(Number.isInteger(props.source.width)); assert.ok(Number.isInteger(props.source.height));
    assert.equal(props.style.backgroundColor, '#ffffff'); assert.equal(props.tintColor, undefined);
    props.onError(); assert.equal(rendered.values[1], props.source.uri);
  }
});
test('Native Code View never shows clipped/partial bars, reports image errors and waits for layout honestly', () => {
  const oversized = renderView({ card: card('AbCd'.repeat(60)), format: 'code128' });
  assert.equal(oversized.view.props.children.type, 'Text'); assert.match(oversized.view.props.children.props.children, /No partial code/);
  const initial = renderView({ card: card('00001'), format: 'qr' }, 0);
  assert.equal(initial.view.props.children.props.children, 'Preparing code...');
  const valid = renderView({ card: card('00001'), format: 'qr' });
  const failed = renderView({ card: card('00001'), format: 'qr' }, 280, 3, valid.view.props.children.props.source.uri);
  assert.match(failed.view.props.children.props.children, /Unable to display/);
});
test('Code128 display viewBox, SVG bounds, native source and image aspect agree for short/long values', () => {
  for (const payload of ['7','123','00123456','000000000000','00123456789012345678901234567890',' 000Ab c ']) {
    for (const density of [1,1.5,2.625,3,4]) {
      const width=304, input=card(payload), original=encodeCardCode(input,'code128'), before=JSON.stringify(original);
      const rendered=renderView({card:input,format:'code128'},width,density).view.props.children;
      const frame=cardCodeFrame(original,width,density);
      if(frame.scroll){assert.equal(rendered.type,'Text');assert.match(rendered.props.children,/No partial code/);continue;}
      assert.equal(rendered.type,'Image');const p=rendered.props;
      const svg=Buffer.from(p.source.uri.split(',')[1],'base64').toString('ascii');
      const viewBox=/viewBox="0 0 (\d+) (\d+)"/.exec(svg);
      assert.equal(Number(viewBox[1]),p.source.width);assert.equal(Number(viewBox[2]),p.source.height);
      assert.match(svg,new RegExp(`width="${p.source.width}" height="${p.source.height}"`));
      assert.ok(Math.abs(Number(viewBox[1])/Number(viewBox[2])-p.style.width/p.style.height)<.005);
      assert.ok(p.style.width>p.style.height);assert.ok(p.style.width<=width);
      assert.equal(p.contentFit,'contain');assert.equal(p.style.transform,undefined);assert.doesNotMatch(svg,/transform=/);
      assert.equal(decode(svg,'code128',1).getText(),payload);assert.equal(JSON.stringify(original),before);
    }
  }
});

test('Pixel presentation keeps every encoded bar width/gap ratio, presentation bar height and ten-module quiet zones', () => {
  for (const payload of ['00123456',' Ab 00000123 ']) for (const density of [1,2.625,3]) {
    const code=encodeCardCode(card(payload),'code128'),frame=cardCodeFrame(code,600,density);
    const svg=code128DisplaySvg(code,frame,density),rasterized=raster(svg,1);
    const source=[...code.svg.matchAll(/M(\d+) (\d+)h(\d+)v(\d+)h-\d+z/g)];
    const display=[...svg.matchAll(/M(\d+) (\d+)h(\d+)v(\d+)h-\d+z/g)];
    assert.equal(display.length,source.length);
    source.forEach((run,i)=>{
      assert.equal(Number(display[i][1]),Number(run[1])*frame.pixelsPerModule);
      assert.equal(Number(display[i][3]),Number(run[3])*frame.pixelsPerModule);
      assert.ok(Math.abs(Number(display[i][4])/density-(110*frame.height/code.height))<=1/density);
    });
    const quiet=10*frame.pixelsPerModule;
    for(let y=0;y<rasterized.height;y++)for(let x=0;x<quiet;x++){
      assert.equal(rasterized.pixels[y*rasterized.width+x],255);
      assert.equal(rasterized.pixels[y*rasterized.width+rasterized.width-x-1],255);
    }
  }
});

test('QR rendering remains byte-for-byte on its existing square SVG path',()=>{
  const payload=' 000Ab c ',density=2.625,width=280,code=encodeCardCode(card(payload),'qr'),frame=cardCodeFrame(code,width,density);
  const image=renderView({card:card(payload),format:'qr'},width,density).view.props.children;
  const svg=Buffer.from(image.props.source.uri.split(',')[1],'base64').toString('ascii');
  assert.equal(svg,code.svg.replace(`width="${code.width}" height="${code.height}"`,`width="${Math.round(frame.width*density)}" height="${Math.round(frame.height*density)}"`));
});

test('Malformed display geometry is rejected and the native view shows an honest error',()=>{
  const code=encodeCardCode(card('00123456'),'code128'),frame=cardCodeFrame(code,280,3);
  assert.throws(()=>code128DisplaySvg(code,{...frame,width:frame.width+1},3));
  assert.throws(()=>code128DisplaySvg({...code,svg:code.svg.replace(/v110/,'v999')},frame,3));
  assert.throws(()=>code128DisplaySvg(code,{...frame,scroll:true},3));
  const view=renderView({card:card('00123456'),format:'code128'},280,3,null,()=>{throw Error('synthetic render failure');}).view;
  assert.equal(view.props.children.type,'Text');assert.match(view.props.children.props.children,/Unable to prepare/);
});

test('Edited membership number round-trips through both real encoders without losing zeros, spaces or case',()=>{
  const {prepareMembershipEdit,membershipEditValues}=load('src/lib/membership-card-edit.ts');
  const original={kind:'membership',id:'edit-code-test',name:'Test Member',memberNumber:'00123456',payload:'original custom code',preferredDisplayFormat:'qr',orientation:'landscape',
    appearance:{backgroundColor:'#405764',textColor:'#ffffff',imageAssetId:null},createdAt:'2026-11-08T00:00:00.000Z',updatedAt:'2026-11-08T00:00:00.000Z'};
  const nextValue=' 000Ab 123 ',result=prepareMembershipEdit(original,{...membershipEditValues(original),memberNumber:nextValue},'2026-11-08T01:00:00.000Z');
  assert.equal(result.ok,true);assert.equal(result.card.id,original.id);
  for(const format of ['qr','code128']){const encoded=encodeCardCode(result.card,format);assert.equal(encoded.ok,true);assert.equal(decode(encoded.svg,format).getText(),nextValue);}
  assert.equal(original.memberNumber,'00123456');assert.equal(original.payload,'original custom code');
});

test('Application modules never import the test-only decoder or a server/DOM QR renderer', () => {
  const files = fs.readdirSync(path.join(root, 'src/lib')).filter(name => name.endsWith('.ts'));
  for (const name of files) assert.doesNotMatch(fs.readFileSync(path.join(root, 'src/lib', name), 'utf8'), /from ['"]@zxing\//);
  const source = fs.readFileSync(path.join(root, 'src/lib/card-code.ts'), 'utf8');
  assert.doesNotMatch(source, /toDataURL|toCanvas|createElement|from ['"]qrcode['"]|fetch\(|console\./);
});
test('Full shared editor code value round-trips through QR and Code128 with zeros, spaces and case intact',()=>{
 const editor=load('src/lib/card-editor-state.ts'),original={kind:'membership',id:'full-edit-code',name:'Test Member',memberNumber:'00123456',payload:'00123456',preferredDisplayFormat:'qr',orientation:'landscape',appearance:{backgroundColor:'#405764',textColor:'#ffffff',imageAssetId:null},createdAt:'2026-11-08T00:00:00.000Z',updatedAt:'2026-11-08T00:00:00.000Z'};
 const form=editor.membershipEditorState(original),payload=' 000Full Ab ';
 form.values.memberNumber=payload;form.values.payload=payload;form.values.colorId='leaf';
 const result=editor.prepareFullMembershipEdit(original,form,'2026-11-08T01:00:00.000Z');
 for(const format of ['qr','code128']){const encoded=encodeCardCode(result.card,format);assert.equal(encoded.ok,true);assert.equal(decode(encoded.svg,format).getText(),payload);}
});


test('Compact Detail QR retains four-module borders and exact independent pixel decoding at device densities',()=>{
 for(const payload of ['00123456',' 000Ab c ','00123456789012345678901234567890'])for(const density of [1,2.625,3]){
  const code=encodeCardCode(card(payload),'qr'),frame=cardCodeFrame(code,304,density,224);
  assert.equal(frame.width,frame.height);assert.ok(frame.height<=224);assert.equal(frame.pixelsPerModule,Math.floor(224*density/code.width));
  const svg=code.svg.replace(`width="${code.width}" height="${code.height}"`,`width="${Math.round(frame.width*density)}" height="${Math.round(frame.height*density)}"`);
  assert.equal(decode(svg,'qr',frame.pixelsPerModule).getText(),payload);
  assert.equal(code.width,code.height);assert.match(svg,/fill="#ffffff"/);
 }
});
