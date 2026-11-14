async page=>{
 const base='http://127.0.0.1:8768/gallery/index.html';
 for(const width of [360,393,412]){
   await page.setViewportSize({width,height:852});await page.goto(base+'?phone='+width);await page.evaluate(()=>document.fonts.ready);
   await page.evaluate(()=>window.folderPreview.set({count:6}));await page.locator('#canvas .folder').click();
   await page.screenshot({animations:'disabled',path:`sheets/contents-${width}-top.png`});await page.locator('#sheet-body').evaluate(e=>e.scrollTop=e.scrollHeight);await page.screenshot({animations:'disabled',path:`sheets/contents-${width}-bottom.png`});await page.locator('#close-sheet').click();await page.locator('#overlay').waitFor({state:'hidden'});
   await page.evaluate(()=>window.folderPreview.set({orientation:'portrait',name:'Everyday memberships, weekend discoveries and places I love'}));await page.locator('#canvas .folder').click();await page.screenshot({animations:'disabled',path:`sheets/long-name-${width}-sheet.png`});await page.locator('#close-sheet').click();await page.locator('#overlay').waitFor({state:'hidden'});
 }
 await page.setViewportSize({width:393,height:852});await page.goto(base+'?phone=393');
 for(const concept of ['A','B','C']){
  await page.evaluate(c=>window.folderPreview.set({concept:c,count:6}),concept);await page.locator('#canvas .folder').click();await page.screenshot({animations:'disabled',path:`sheets/${concept}-six-member-sheet.png`});await page.locator('#close-sheet').click();await page.locator('#overlay').waitFor({state:'hidden'});
 }
 await page.evaluate(()=>window.folderPreview.set({name:'Everyday memberships, weekend discoveries and places I love',orientation:'portrait'}));await page.addStyleTag({content:'.sheet-header h2{font-size:24px!important;line-height:34px!important}'});await page.locator('#canvas .folder').click();await page.screenshot({animations:'disabled',path:'sheets/enlarged-heading-simulation.png'});await page.locator('#close-sheet').click();await page.locator('#overlay').waitFor({state:'hidden'});
 return {captures:'13 settled-state screenshots refreshed; no app data access'};
}
