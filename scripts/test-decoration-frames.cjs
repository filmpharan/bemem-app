// Decode bundled PNGs with an existing encoder dependency; no native wallet IO.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {PNG}=require('pngjs');
const root=path.resolve(__dirname,'..'),trial=path.join(root,'artwork-trials/cozy-cute-270-chunky-2026-11-11');
const old=JSON.parse(fs.readFileSync(path.join(trial,'existing-240.json')));
const additions=JSON.parse(fs.readFileSync(path.join(trial,'review/manifest.json'))).assets;
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
function transform(data,k,mirror=false){
 const out=Buffer.alloc(data.length);
 for(let y=0;y<192;y++)for(let x=0;x<192;x++){
  let xx=mirror?191-x:x,yy=y;
  for(let r=0;r<k;r++)[xx,yy]=[191-yy,xx];
  data.copy(out,(yy*192+xx)*4,(y*192+x)*4,(y*192+x)*4+4);
 }
 return out;
}
function boundary(data,side){
 const out=Buffer.alloc(192*4);
 for(let i=0;i<192;i++){
  const [x,y]=({W:[0,i],E:[191,i],N:[i,0],S:[i,191]})[side];
  data.copy(out,i*4,(y*192+x)*4,(y*192+x)*4+4);
 }
 return out;
}
const decoded=new Map();
for(const a of [...old,...additions]){
 const filename=a.path?path.join(root,a.path):path.join(trial,a.png);
 decoded.set(a.id,PNG.sync.read(fs.readFileSync(filename)));
}

test('Exactly the same30 stable IDs replace their rejected artwork; protected catalog, registry, renderer and session stay unchanged',()=>{
 const before=JSON.parse(fs.readFileSync(path.join(trial,'before/manifest.json'))).assets;
 assert.deepEqual(additions.map(a=>a.id),before.map(a=>a.id));
 assert.deepEqual(additions.map(a=>a.collection),before.map(a=>a.collection));
 const protectedFiles=JSON.parse(fs.readFileSync(path.join(trial,'protected-files.json')));
 // Multi-Canvas intentionally extends scroll persistence and page-scoped sessions.
 // Their behavior is covered by Decorate/Multi-Canvas tests; artwork/registry hashes stay frozen.
 for(const [relative,sha]of Object.entries(protectedFiles))if(!['src/components/bemem/WalletCanvas.tsx','src/lib/decorate-session.ts'].includes(relative))assert.equal(hash(fs.readFileSync(path.join(root,relative))),sha,relative);
 for(const a of additions){
  const original=before.find(b=>b.id===a.id);assert.notEqual(a.sha256,original.sha256);
  const oldPng=fs.readFileSync(path.join(trial,'before/png',a.id+'.png'));assert.equal(hash(oldPng),original.sha256);
  const oldData=PNG.sync.read(oldPng).data,newData=decoded.get(a.id).data;
  let oldArea=0,newArea=0;for(let i=3;i<newData.length;i+=4){if(oldData[i]>32)oldArea++;if(newData[i]>32)newArea++;}
  assert.ok(newArea>oldArea,a.id+' should be fuller without changing the tile footprint');
 }
});

test('Thirty new192x192 transparent8bit RGBA PNGs decode, match registry copies and leave all240 originals byte-identical',()=>{
 assert.equal(additions.length,30);assert.equal(decoded.size,270);
 for(const a of old)assert.equal(hash(fs.readFileSync(path.join(root,a.path))),a.sha256);
 for(const a of additions){
  const file=fs.readFileSync(path.join(trial,a.png)),png=decoded.get(a.id);
  assert.equal(file[24],8);assert.equal(file[25],6);assert.equal(png.width,192);assert.equal(png.height,192);
  assert.equal(hash(file),a.sha256);assert.deepEqual(file,fs.readFileSync(path.join(root,'assets/decorations/cozy-cute-v3',a.id+'.png')));
  const alpha=png.data.filter((_,i)=>i%4===3);assert.equal(Math.min(...alpha),0);assert.equal(Math.max(...alpha),255);
  for(const i of [0,191,191*192,192*192-1])assert.equal(png.data[i*4+3],0);
 }
});

test('New frames are not byte, rotation, mirror or exact recolor duplicates of one another or any original240',()=>{
 const canon=new Map(),masks=new Map();
 for(const a of [...old,...additions]){
  const data=decoded.get(a.id).data,variants=[],shapes=[];
  for(const mirror of [false,true])for(let k=0;k<4;k++){
   const v=transform(data,k,mirror);variants.push(hash(v));
   const alpha=Buffer.alloc(192*192);for(let i=0;i<alpha.length;i++)alpha[i]=v[i*4+3]>32?255:0;
   shapes.push(hash(alpha));
  }
  const pixelKey=variants.sort()[0],shapeKey=shapes.sort()[0];
  if(additions.includes(a)){assert.equal(canon.has(pixelKey),false,a.id);assert.equal(masks.has(shapeKey),false,a.id);}
  canon.set(pixelKey,a.id);masks.set(shapeKey,a.id);
 }
});

test('Every declared edge connects exactly for all2646 intra-family facing pairs and90degree rotations',()=>{
 const turn={N:'E',E:'S',S:'W',W:'N'};let count=0;
 for(const family of ['pets','wellness','savings']){
  const variants=[];
  for(const a of additions.filter(a=>a.collection===family))for(let k=0;k<4;k++){
   let sides=new Set(a.connectors);for(let r=0;r<k;r++)sides=new Set([...sides].map(s=>turn[s]));
   const data=transform(decoded.get(a.id).data,k),profiles={};
   for(const side of Object.keys(turn)){
    const e=boundary(data,side),indices=[];for(let i=0;i<192;i++)if(e[i*4+3])indices.push(i);
    assert.equal(indices.length>0,sides.has(side),a.id+' '+side);
    if(indices.length){assert.equal(indices[0]+indices.at(-1),191);profiles[side]=e;}
   }
   variants.push(profiles);
  }
  for(const [side,opposite]of [['E','W'],['S','N']])for(const a of variants)for(const b of variants){
   if(!a[side]||!b[opposite])continue;assert.deepEqual(a[side],b[opposite]);count++;
  }
 }
 assert.equal(count,2646);
});
