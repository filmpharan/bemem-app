// Production geometry and frame controller only. No native wallet/data access.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),cache=new Map();
function load(file){file=path.resolve(root,file);if(!path.extname(file))file+='.ts';if(cache.has(file))return cache.get(file).exports;const m={exports:{}};cache.set(file,m);
 const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInThisContext(`(function(require,module,exports){${code}\n})`,{filename:file})(n=>{assert.ok(n.startsWith('.'));return load(path.resolve(path.dirname(file),n));},m,m.exports);return m.exports;}
const {edgeScrollPosition,createCanvasEdgeScroll}=load('src/lib/canvas-drag-scroll.ts');
const {decorationDropCell,decorationTouchOffset,decorationGhostFrame}=load('src/lib/decorate-session.ts');
const {canvasMetrics,canPlace,dropPosition}=load('src/lib/canvas-layout.ts');
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
test('Edge scrolling is viewport-relative, directional, bounded and independent of Header/Footer height',()=>{
 for(const viewportHeight of [220,400,700]){
  const b={scrollY:100,viewportHeight,contentHeight:2000};
  assert.ok(edgeScrollPosition(viewportHeight-1,b,16)>100);assert.ok(edgeScrollPosition(1,b,16)<100);
  assert.equal(edgeScrollPosition(viewportHeight/2,b,16),100);
  assert.equal(edgeScrollPosition(-100,{...b,scrollY:0},16),0);
  assert.equal(edgeScrollPosition(viewportHeight+100,{...b,scrollY:2000-viewportHeight},16),2000-viewportHeight);
  assert.equal(edgeScrollPosition(viewportHeight,{scrollY:0,viewportHeight,contentHeight:viewportHeight-1},16),0);
 }
});
test('Existing hint padding never creates additional drag space or an abrupt pickup jump',()=>{
 const bounds={scrollY:230,viewportHeight:400,contentHeight:600};
 assert.equal(edgeScrollPosition(390,bounds,16),230);assert.equal(edgeScrollPosition(200,bounds,16),230);
 assert.ok(edgeScrollPosition(0,bounds,16)<230);
});
test('Frame stalls cannot create large scroll jumps; malformed/zero viewport cannot scroll',()=>{
 const b={scrollY:100,viewportHeight:400,contentHeight:1600};near(edgeScrollPosition(400,b,2000)-100,12.8);
 assert.equal(edgeScrollPosition(400,{...b,viewportHeight:0},16),100);assert.equal(edgeScrollPosition(NaN,b,16),100);
});
function controller(){let id=0,time=0,y=0,steps=0;const queue=new Map(),calls=[];
 const bounds={viewportHeight:400,contentHeight:1000};
 const c=createCanvasEdgeScroll(()=>({...bounds,scrollY:y}),next=>{y=next;calls.push(next);},{request(fn){queue.set(++id,fn);return id;},cancel(i){queue.delete(i);}});
 return{c,calls,bounds,y:()=>y,steps:()=>steps,refresh:()=>{steps++;},queue,frame(){time+=16;const work=[...queue.values()];queue.clear();work.forEach(fn=>fn(time));}};
}
test('A stationary held finger drives frame scrolling, stops at content end, reverses upward and stops on release',()=>{
 const h=controller();assert.equal(h.queue.size,0);h.c.start(399,h.refresh);
 for(let i=0;i<150;i++)h.frame();assert.equal(h.y(),600);assert.equal(h.steps(),h.calls.length);
 h.c.move(0);for(let i=0;i<150;i++)h.frame();assert.equal(h.y(),0);
 h.c.stop();assert.equal(h.queue.size,0);const count=h.calls.length;h.frame();assert.equal(h.calls.length,count);
});
test('Cancel/unmount stop invalidates a callback already captured by the native frame scheduler',()=>{
 const h=controller();h.c.start(399,h.refresh);const stale=[...h.queue.values()][0];h.c.stop();stale(20);
 assert.equal(h.calls.length,0);assert.equal(h.queue.size,0);
 h.c.start(399,h.refresh);h.frame();assert.ok(h.y()>0);h.c.stop();
});
test('Rendered grid uses existing ten-row editing extension and retains the production 240-row boundary',()=>{
 const card={id:'test',orientation:'landscape'},layout={test:{col:0,row:230}},before=JSON.stringify(layout);
 const metrics=canvasMetrics(336,400,[card],layout,true);assert.equal(metrics.rows,240);
 const next=dropPosition(card,layout.test,0,10000+280,28);assert.equal(next.row,236);assert.equal(canPlace(card,next,[card],layout),true);
 assert.equal(JSON.stringify(layout),before);
});
for(const scrollY of [0,56,280])test(`Decoration ghost/drop use one measured coordinate path with scroll=${scrollY}`,()=>{
 for(const header of [44,48,64])for(const status of [0,24,36]){
  const geometry=Object.freeze({pageX:20,pageY:status+header,width:336,height:280,unit:28,scrollY});
  const layer=Object.freeze({x:4,y:status+header}),point=Object.freeze({x:258,y:status+header+42});
  const drop=decorationDropCell(point,geometry),frame=decorationGhostFrame(point,geometry,layer);
  assert.deepEqual(drop,{col:8,row:scrollY/28+1});near(frame.left,240);near(frame.top,28);
  near(frame.left+layer.x,geometry.pageX+drop.col*28);near(frame.top+layer.y,geometry.pageY+drop.row*28-scrollY);
  assert.equal(frame.width,28);assert.equal(frame.height,28);
 }
});
test('Repeated measurements do not accumulate origin offsets and all four viewport edges are checked',()=>{
 const g={pageX:16,pageY:100,width:336,height:280,unit:28,scrollY:0},point={x:30,y:114};
 for(let i=0;i<20;i++)assert.deepEqual(decorationGhostFrame(point,g,{x:0,y:100}),{width:28,height:28,left:16,top:0});
 for(const p of [{x:15,y:114},{x:352,y:114},{x:30,y:99},{x:30,y:380}])assert.equal(decorationDropCell(p,g),null);
});
test('Drawer touch calibration includes only measured origin difference, not guessed status/header/footer constants',()=>{
 const touch=Object.freeze({pageX:26,pageY:572,locationX:6,locationY:12});
 assert.deepEqual(decorationTouchOffset({x:40,y:600},touch),{x:20,y:40});
 assert.deepEqual(decorationTouchOffset({x:20,y:560},touch),{x:0,y:0});
});


test('A frame from an old drag cannot change a newly started drag or create a second frame loop',()=>{
 const h=controller();h.c.start(399,h.refresh);const stale=[...h.queue.values()][0];h.c.stop();h.c.start(200,h.refresh);
 stale(16);assert.equal(h.y(),0);assert.equal(h.queue.size,1);h.c.stop();
});
test('Preview refresh waits for actual native scroll acknowledgement rather than assuming scrollTo succeeded',()=>{
 let y=0,refreshes=0,requested,callback;
 const c=createCanvasEdgeScroll(()=>({scrollY:y,viewportHeight:400,contentHeight:1000}),next=>{requested=next;},{request(fn){callback=fn;return 1;},cancel(){}});
 c.start(399,()=>refreshes++);callback(16);assert.ok(requested>0);assert.equal(y,0);assert.equal(refreshes,0);
 y=requested;c.sync();assert.equal(refreshes,1);c.stop();c.sync();assert.equal(refreshes,1);
});
