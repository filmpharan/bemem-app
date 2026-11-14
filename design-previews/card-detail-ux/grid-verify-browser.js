async (page) => {
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 const base='http://127.0.0.1:8791/';
 const ids=['mini-landscape','card-landscape','voucher-landscape','boarding-pass-landscape','mini-portrait','card-portrait','vaccine-passport-portrait'];
 const expected=[[3,2],[6,4],[7,3],[8,4],[2,3],[4,6],[5,7]],results=[];
 const check=(c,m)=>{if(!c)throw Error(m);}; const near=(a,b)=>Math.abs(a-b)<.12;
 for(const viewport of [{width:320,height:640},{width:390,height:844},{width:844,height:390}]){
  await page.setViewportSize(viewport);let shared=null;
  for(let i=0;i<ids.length;i++){
   await page.goto(`${base}reference.html?sample=${ids[i]}`);await page.evaluate(()=>document.fonts.ready);
   await page.waitForFunction(()=>Number(document.querySelector('.card-slot').dataset.scale)>0);
   const m=await page.evaluate(()=>{const slot=document.querySelector('.card-slot'),f=document.querySelector('.card-footprint').getBoundingClientRect(),c=document.querySelector('.card-art').getBoundingClientRect(),s=slot.getBoundingClientRect();return{data:{...slot.dataset},f:{w:f.width,h:f.height,x:f.x,y:f.y},c:{w:c.width,h:c.height},slot:{w:s.width,h:s.height,x:s.x,y:s.y},radius:getComputedStyle(document.querySelector('.card-art')).borderRadius,overflow:document.documentElement.scrollWidth>innerWidth};});
   const u=Number(m.data.displayUnit),scale=Number(m.data.scale),[w,h]=expected[i];
   check(near(m.f.w,w*u)&&near(m.f.h,h*u),'Full footprint dimension');
   check(near(m.c.w,(w-.2)*u)&&near(m.c.h,(h-.2)*u),'Create paint inset');
   check(near(m.f.x+m.f.w/2,m.slot.x+m.slot.w/2)&&near(m.f.y+m.f.h/2,m.slot.y+m.slot.h/2),'Centered card');
   check(m.radius==='14px'&&!m.overflow,'Radius and no page overflow');
   if(shared===null)shared=scale;else check(near(scale,shared),'Shared scale independent of selected preset');
   await page.getByRole('button',{name:'Show QR Code',exact:true}).click();
   check(await page.locator('.qr').isVisible(),'QR toggle');
   await page.getByRole('button',{name:'Show card back',exact:true}).click();
   const after=await page.locator('.card-footprint').boundingBox();check(near(after.width,m.f.w)&&near(after.height,m.f.h),'Flip preserves geometry');
   await page.getByRole('button',{name:'Close card detail'}).click();check(!await page.getByRole('dialog').isVisible(),'Close');
  }
  results.push(`${viewport.width}px: all 7 dimensions, common scale, inset, centering, radius, QR, flip and Close passed`);
 }
 for(const orientation of ['landscape','portrait']){
  await page.goto(`${base}reference.html?sample=legacy-${orientation}`);
  await page.waitForFunction(()=>document.querySelector('.card-slot').dataset.source==='legacy');
  const source=await page.locator('.card-slot').getAttribute('data-source');check(source==='legacy','Legacy fallback');
 }
 await page.setViewportSize({width:1440,height:1100});await page.goto(base+'grid-sizes.html');
 for(const f of page.frames().slice(1))await f.evaluate(()=>document.fonts.ready);
 await page.waitForSelector('.lineup-item');
 await page.screenshot({path:'output/playwright/grid-sizes-all.png',fullPage:true});
 await page.locator('.scale-lineup').screenshot({path:'output/playwright/grid-sizes-relative.png'});
 await page.locator('#grid-format').selectOption('qr');
 for(const f of page.frames().slice(1)){await f.waitForSelector('.qr');check(await f.locator('.member-number').textContent()==='00123456','Same number');}
 results.push('Legacy fallback, 7-frame comparison, uniform-size lineup and all-frame QR selection passed');
 check(errors.length===0,`Browser errors: ${errors.join('; ')}`);
 return results;
}
