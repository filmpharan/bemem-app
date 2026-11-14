async page => {
  const results=[];
  const check=(name,ok,detail)=>{results.push({name,passed:!!ok,...(detail?{detail}: {})});if(!ok)throw new Error(name+': '+JSON.stringify(detail));};
  const base='http://127.0.0.1:8768/gallery/index.html';
  await page.setViewportSize({width:1280,height:900});await page.goto(base);await page.evaluate(()=>document.fonts.ready);
  await page.locator('#landscape-board .mini-card').first().waitFor();
  await page.locator('#landscape-board').evaluate(e=>e.closest('section').id='landscape-section');
  await page.locator('#portrait-board').evaluate(e=>e.closest('section').id='portrait-section');
  await page.locator('#landscape-section').screenshot({animations:'disabled',path:'sheets/comparison-landscape.png'});
  await page.locator('#portrait-section').screenshot({animations:'disabled',path:'sheets/comparison-portrait.png'});
  await page.locator('#states-board').screenshot({animations:'disabled',path:'sheets/empty-one-four-six.png'});
  await page.screenshot({animations:'disabled',path:'sheets/gallery-overview.png',fullPage:true});
  check('All local artwork decoded',await page.evaluate(()=>[...document.images].every(i=>i.complete&&i.naturalWidth>0)));
  for(const width of [360,393,412]){
    await page.setViewportSize({width,height:852});await page.goto(base+'?phone='+width);await page.evaluate(()=>document.fonts.ready);
    for(const concept of ['A','B','C'])for(const orientation of ['landscape','portrait'])for(let count=0;count<=6;count++){
      await page.evaluate(o=>window.folderPreview.set(o),{concept,orientation,count,name:'Everyday essentials'});
      await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
      const data=await page.locator('#canvas .folder').evaluate(e=>{
        const b=e.getBoundingClientRect();return {minis:e.querySelectorAll('.mini-card').length,w:b.width,h:b.height,inset:parseFloat(e.style.getPropertyValue('--inset')),canvas:e.parentElement.clientWidth,name:e.querySelector('.folder-name').textContent,
          ratios:[...e.querySelectorAll('.mini-card')].map(i=>({expected:+i.dataset.ratio,actual:parseFloat(i.style.width)/parseFloat(i.style.height)}))};
      });
      const f=orientation==='landscape'?{w:6,h:4}:{w:4,h:6};
      check(`Canvas ${width}/${concept}/${orientation}/${count}`,data.minis===Math.min(count,4)&&Math.abs(data.w-data.canvas/12*f.w)<.1&&Math.abs(data.h-data.canvas/12*f.h)<.1&&Math.abs(data.inset-data.canvas/120)<.01&&data.name==='Everyday essentials'&&data.ratios.every(r=>Math.abs(r.expected-r.actual)<.001));
      await page.locator('#canvas .folder').click();
      const figures=page.locator('#sheet .member-card');check(`Sheet members ${width}/${concept}/${orientation}/${count}`,await figures.count()===count);
      const shape=await figures.evaluateAll(es=>es.map(e=>{const art=e.querySelector('.member-art').getBoundingClientRect();return {actual:art.width/art.height,expected:(+e.dataset.w-.2)/(+e.dataset.h-.2)};}));
      check(`Sheet shapes ${width}/${concept}/${orientation}/${count}`,shape.every(s=>Math.abs(s.expected-s.actual)<.01));
      if(count===6){
        await page.locator('#sheet-body').evaluate(e=>e.scrollTop=e.scrollHeight);
        const visible=await figures.last().evaluate(e=>{const r=e.getBoundingClientRect(),p=e.closest('.sheet-body').getBoundingClientRect();return r.bottom<=p.bottom+1&&r.bottom>p.top;});
        check(`Last member reachable ${width}/${concept}/${orientation}`,visible);
      }
      await page.locator('#close-sheet').click();await page.locator('#overlay').waitFor({state:'hidden'});
    }
    await page.evaluate(()=>window.folderPreview.set({concept:'A',orientation:'landscape',count:6,name:'Everyday essentials'}));
    await page.screenshot({animations:'disabled',path:`sheets/canvas-${width}.png`});
    await page.locator('#canvas .folder').click();await page.screenshot({animations:'disabled',path:`sheets/contents-${width}-top.png`});
    await page.locator('#sheet-body').evaluate(e=>e.scrollTop=e.scrollHeight);await page.screenshot({animations:'disabled',path:`sheets/contents-${width}-bottom.png`});
    await page.locator('#close-sheet').click();await page.locator('#overlay').waitFor({state:'hidden'});
    await page.evaluate(()=>window.folderPreview.set({orientation:'portrait',name:'Everyday memberships, weekend discoveries and places I love'}));
    await page.screenshot({animations:'disabled',path:`sheets/long-name-${width}-canvas.png`});await page.locator('#canvas .folder').click();
    const title=await page.locator('#sheet-title').boundingBox(),close=await page.locator('#close-sheet').boundingBox();
    check(`Long title clear of Close ${width}`,title.x+title.width<=close.x&&close.width>=48&&close.height>=48);
    await page.screenshot({animations:'disabled',path:`sheets/long-name-${width}-sheet.png`});
    await page.locator('#close-sheet').click();await page.locator('#overlay').waitFor({state:'hidden'});
  }
  await page.locator('#canvas .folder').click();await page.mouse.click(8,8);await page.locator('#overlay').waitFor({state:'hidden'});check('Outside tap closes',true);
  await page.locator('#canvas .folder').click();await page.keyboard.press('Escape');await page.locator('#overlay').waitFor({state:'hidden'});check('Escape closes',true);
  await page.locator('#canvas .folder').click();await page.evaluate(()=>history.back());await page.locator('#overlay').waitFor({state:'hidden'});check('Browser Back closes (native unverified)',true);
  const rejected=await page.evaluate(()=>{try{window.folderPreview.set({count:7});return false;}catch(e){return e.message.includes('six');}});check('Seven members rejected',rejected);
  check('No count badge on shells',await page.locator('.folder [class*=badge]').count()===0);
  await page.context().setOffline(true);await page.locator('#canvas .folder').click();await page.locator('#close-sheet').click();await page.locator('#overlay').waitFor({state:'hidden'});check('Loaded prototype operates without network',true);await page.context().setOffline(false);
  await page.setViewportSize({width:393,height:852});await page.goto(base+'?phone=393');
  for(const concept of ['A','B','C']){
    await page.evaluate(c=>window.folderPreview.set({concept:c,count:6}),concept);await page.locator('#canvas .folder').click();await page.screenshot({animations:'disabled',path:`sheets/${concept}-six-member-sheet.png`});await page.locator('#close-sheet').click();await page.locator('#overlay').waitFor({state:'hidden'});
  }
  // Browser text enlargement approximation. This is not Samsung's native font scaling.
  await page.addStyleTag({content:'.folder-name{font-size:16px!important;line-height:20px!important}.sheet-header h2{font-size:24px!important;line-height:34px!important}'});
  await page.evaluate(()=>window.folderPreview.set({orientation:'portrait',name:'Everyday memberships, weekend discoveries and places I love'}));await page.locator('#canvas .folder').click();
  const enlarged=await page.locator('#sheet-title').boundingBox(),close=await page.locator('#close-sheet').boundingBox();check('Enlarged heading clear of Close',enlarged.x+enlarged.width<=close.x);await page.screenshot({animations:'disabled',path:'sheets/enlarged-heading-simulation.png'});await page.locator('#close-sheet').click();await page.locator('#overlay').waitFor({state:'hidden'});
  const summary={passed:results.filter(r=>r.passed).length,failed:results.filter(r=>!r.passed).length,scope:'Standalone browser prototype, simulated CSS pixels. No native Samsung, filesystem or Wallet tests.',results};
  return summary;
}
