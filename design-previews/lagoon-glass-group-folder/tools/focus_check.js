async page=>{
 await page.goto('http://127.0.0.1:8768/gallery/index.html?phone=393');await page.setViewportSize({width:393,height:852});
 await page.evaluate(()=>window.folderPreview.set({count:6}));await page.locator('#canvas .folder').click();
 await page.keyboard.press('Tab');const first=await page.locator('#sheet-body').evaluate(e=>e===document.activeElement);
 await page.keyboard.press('Tab');const second=await page.locator('#close-sheet').evaluate(e=>e===document.activeElement);
 await page.keyboard.press('Shift+Tab');const third=await page.locator('#sheet-body').evaluate(e=>e===document.activeElement);
 await page.keyboard.press('Escape');await page.locator('#overlay').waitFor({state:'hidden'});const fourth=await page.locator('#canvas .folder').evaluate(e=>e===document.activeElement);
 const fifth=await page.evaluate(()=>document.documentElement.scrollWidth===innerWidth);
 const checks={keyboardScrollRegion:first,keyboardFocusContained:second,reverseFocusContained:third,focusRestored:fourth,noHorizontalOverflow:fifth};if(!Object.values(checks).every(Boolean))throw new Error(JSON.stringify(checks));return {passed:5,failed:0,checks};
}
