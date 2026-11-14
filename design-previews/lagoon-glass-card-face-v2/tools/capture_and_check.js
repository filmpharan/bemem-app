async page=>{
 const base='http://127.0.0.1:8769';const results=[];const check=(name,ok)=>{results.push({name,passed:!!ok});if(!ok)throw Error(name);};
 await page.setViewportSize({width:1280,height:900});await page.goto(base+'/folders/gallery/index.html');await page.evaluate(()=>document.fonts.ready);
 await page.addStyleTag({content:'.object-stage{height:330px;min-height:330px}'});
 await page.locator('#landscape-board .mini-card').first().waitFor();
 for(const o of ['landscape','portrait']){
  for(const c of ['A','B','C']){
   const f=page.locator(`#${o}-board .folder.${c}`);check(`Folder ${c}/${o} has four previews`,await f.locator('.mini-card').count()===4);
   await f.locator('..').screenshot({animations:'disabled',path:`sheets/folder-${c}-${o}.png`});
  }
  await page.locator('#'+o+'-board').screenshot({animations:'disabled',path:`sheets/folder-${o}-comparison.png`});
 }
 await page.setViewportSize({width:393,height:852});await page.goto(base+'/folders/gallery/index.html?phone=393&count=6&open=1');await page.evaluate(()=>document.fonts.ready);
 check('Open sheet resolves six members',await page.locator('.member-card').count()===6);
 await page.locator('#sheet-title').click();await page.screenshot({animations:'disabled',path:'sheets/folder-six-top.png'});await page.locator('#sheet-body').evaluate(e=>e.scrollTop=e.scrollHeight);await page.screenshot({animations:'disabled',path:'sheets/folder-six-bottom.png'});
 check('Sixth member reachable',await page.locator('.member-card').last().evaluate(e=>{const r=e.getBoundingClientRect(),p=e.closest('.sheet-body').getBoundingClientRect();return r.bottom<=p.bottom+1&&r.bottom>p.top;}));
 await page.locator('#close-sheet').click();await page.locator('#overlay').waitFor({state:'hidden'});
 const ids=['blush-pink','warm-brown','fresh-green','golden-yellow','sky-blue','dream-purple','coral-orange'];
 for(const id of ids){
  await page.goto(base+'/folders/gallery/index.html?phone=393&face='+id+'&count=6');
  check(`Folder first member uses ${id}`,await page.locator('#canvas .mini-card').first().getAttribute('src')==='../assets/cards/'+id+'.webp');
  await page.locator('#canvas .folder').screenshot({animations:'disabled',path:`sheets/miniatures-${id}.png`});
 }
 await page.setViewportSize({width:1280,height:900});await page.goto(base+'/gallery/index.html');await page.evaluate(()=>document.fonts.ready);
 check('Seven overview colors',await page.locator('.color-tile').count()===7);
 await page.locator('#overview').screenshot({animations:'disabled',path:'sheets/seven-square-masters.png'});
 await page.locator('#before-after').screenshot({animations:'disabled',path:'sheets/before-after-browser.png'});
 await page.locator('#folder-grid').screenshot({animations:'disabled',path:'sheets/combined-folder-overview.png'});
 await page.screenshot({animations:'disabled',path:'sheets/gallery-overview.png',fullPage:true});
 for(const width of [360,393,412]){
  await page.setViewportSize({width,height:852});await page.goto(base+'/gallery/index.html');await page.evaluate(()=>document.fonts.ready);
  for(const id of ids){
   await page.locator(`button[data-color="${id}"]`).click();
   check(`Selected ${id}/${width}`,await page.locator(`button[data-color="${id}"]`).getAttribute('aria-pressed')==='true');
   const shapes=await page.locator('#crops .crop-figure').evaluateAll(es=>es.map(e=>{const i=e.querySelector('img');return {id:e.dataset.preset,w:i.getBoundingClientRect().width,h:i.getBoundingClientRect().height};}));
   const presets=await page.evaluate(()=>window.CARD_FACE_REVIEW.presets);
   check(`Seven crops keep block geometry ${id}/${width}`,shapes.length===7&&shapes.every((s,i)=>Math.abs(s.w-(presets[i].w-.2)*32)<.1&&Math.abs(s.h-(presets[i].h-.2)*32)<.1));
   check(`Canvas all seven ${id}/${width}`,await page.locator('.canvas-card').count()===7);
   check(`No document horizontal overflow ${id}/${width}`,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  }
  await page.locator('button[data-color="sky-blue"]').click();
  await page.screenshot({animations:'disabled',path:`sheets/gallery-${width}.png`,fullPage:true});
  await page.locator('.master-section').screenshot({animations:'disabled',path:`sheets/master-${width}.png`});
  await page.locator('.sample-canvas').screenshot({animations:'disabled',path:`sheets/canvas-${width}.png`});
  for(const c of ['A','B','C'])for(const o of ['landscape','portrait']){
   await page.goto(base+`/folders/gallery/index.html?phone=${width}&concept=${c}&orientation=${o}&count=6`);
   check(`Folder geometry ${c}/${o}/${width}`,await page.locator('#canvas .folder').evaluate((e,o)=>{const r=e.getBoundingClientRect(),u=e.parentElement.clientWidth/12;return Math.abs(r.width-u*(o==='landscape'?6:4))<.1&&Math.abs(r.height-u*(o==='landscape'?4:6))<.1;},o));
   await page.locator('#canvas .folder').click();check(`Six member sheet ${c}/${o}/${width}`,await page.locator('.member-card').count()===6);
   await page.locator('#close-sheet').click();await page.locator('#overlay').waitFor({state:'hidden'});
  }
 }
 await page.goto(base+'/gallery/index.html');await page.evaluate(()=>Promise.all([...document.images].map(i=>i.decode().catch(()=>{}))));check('All gallery images decoded',await page.evaluate(()=>[...document.images].every(i=>i.complete&&i.naturalWidth>0)));
 await page.context().setOffline(true);await page.locator('button[data-color="warm-brown"]').click();check('Loaded gallery controls work offline',await page.locator('#color-name').textContent()==='Warm Brown');await page.context().setOffline(false);
 return {passed:results.filter(r=>r.passed).length,failed:results.filter(r=>!r.passed).length,widthsCssPx:[360,393,412],nativeSamsungVerified:false,results};
}
