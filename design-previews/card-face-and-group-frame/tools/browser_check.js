async page => {
  const results=[];
  await page.goto('http://127.0.0.1:8767/gallery/index.html');
  for(const width of [360,393,412]){
    await page.setViewportSize({width,height:852});
    for(const direction of ['A','B','C']){
      await page.locator(`button[data-dir="${direction}"]`).click();
      await page.locator('button[data-color="pink"]').click();
      await page.waitForFunction(()=>Array.from(document.querySelectorAll('#detail img')).every(i=>i.complete&&i.naturalWidth));
      const info=await page.evaluate(()=>{
        const d=window.BEMEM_FACE_REVIEW,board=document.getElementById('board'),unit=board.getBoundingClientRect().width/12;
        return {width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth,cards:Array.from(document.querySelectorAll('.paint')).map((e,i)=>{
          const r=e.getBoundingClientRect(),p=d.presets[i];return{size:`${p.w}x${p.h}`,actual:[r.width,r.height],expected:[(p.w-.2)*unit,(p.h-.2)*unit],radius:getComputedStyle(e).borderRadius};
        }),frames:document.querySelectorAll('.group-frame').length,master:document.getElementById('master').src};
      });
      if(info.overflow||info.cards.length!==7||info.frames!==3||!info.master.includes(`${direction}-pink.png`))throw Error('Gallery content/layout failed');
      for(const c of info.cards)if(c.radius!=='14px'||c.actual.some((v,i)=>Math.abs(v-c.expected[i])>1))throw Error('Shared block/inset geometry failed');
      await page.locator('#show-labels').check();await page.locator('#guide').uncheck();
      if(!await page.locator('#board').evaluate(e=>e.classList.contains('show-labels')))throw Error('Label toggle failed');
      if(!await page.locator('#safe-zone').isHidden())throw Error('Guide toggle failed');
      await page.locator('#show-labels').uncheck();await page.locator('#guide').check();
      results.push({width,direction,sevenSharedBlockSizes:true,noHorizontalOverflow:true,colorsAndToggles:true});
    }
  }
  await page.setViewportSize({width:393,height:852});
  for(const d of ['A','B','C']){
    await page.locator(`button[data-dir="${d}"]`).click();await page.locator('button[data-color="blue"]').click();
    await page.waitForFunction(()=>Array.from(document.querySelectorAll('#detail img')).every(i=>i.complete&&i.naturalWidth));
    await page.screenshot({path:`sheets/gallery-${d}-mobile.png`,fullPage:true,scale:'css'});
  }
  await page.locator('button[data-dir="all"]').click();
  await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:'sheets/gallery-comparison-desktop.png',fullPage:true,scale:'css'});
  return {status:'passed',localHttpOnly:true,checks:results,screenshots:4};
}
