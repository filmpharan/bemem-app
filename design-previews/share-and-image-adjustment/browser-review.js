async (page) => {
  const base='http://127.0.0.1:8768/design-previews/share-and-image-adjustment/';
  const results=[];
  await page.setViewportSize({width:412,height:915});
  for(const [name,query] of [
    ['share-a','feature=share&option=a'],['share-b','feature=share&option=b'],
    ['share-a-qr','feature=share&option=a&mode=scan'],['share-b-reviewed','feature=share&option=b&mode=scan&step=2'],
    ['share-a-back-barcode','feature=share&option=a&mode=scan&side=back&format=code128'],
    ['adjust-a','feature=adjust&option=a'],['adjust-b','feature=adjust&option=b'],
    ['adjust-a-portrait','feature=adjust&option=a&preset=card-portrait'],['adjust-b-large','feature=adjust&option=b&preset=vaccine-passport-portrait&source=tall']
  ]){
    await page.goto(base+'prototype.html?'+query);await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(100);
    await page.locator('.mock-window').screenshot({path:'output/playwright/'+name+'.png'});
    const metrics=await page.evaluate(()=>({pageWidth:innerWidth,documentWidth:document.documentElement.scrollWidth,
      buttons:[...document.querySelectorAll('.sheet button')].map(b=>({name:b.getAttribute('aria-label')||b.textContent.trim(),width:b.getBoundingClientRect().width,height:b.getBoundingClientRect().height,clipped:b.scrollWidth>b.clientWidth+2})),
      images:[...document.querySelectorAll('img')].map(i=>({loaded:i.complete&&i.naturalWidth>0,src:i.getAttribute('src')}))}));
    if(metrics.documentWidth>metrics.pageWidth)throw Error(name+' horizontal overflow');
    if(metrics.buttons.some(b=>b.width<47.9||b.height<47.9||b.clipped))throw Error(name+' button geometry: '+JSON.stringify(metrics.buttons));
    if(metrics.images.some(i=>!i.loaded))throw Error(name+' image did not decode');
    results.push({name,metrics});
  }
  // Adjustment confirmation must preserve exact viewBox values, not merely a similar aspect ratio.
  for(const option of ['a','b']){
    await page.goto(base+'prototype.html?feature=adjust&option='+option);
    await page.locator('#zoom').fill('1.65');
    if(option==='a')await page.getByText('Fine adjustment',{exact:true}).click();
    await page.locator('#pos-x').fill('0.7');await page.locator('#pos-y').fill('0.35');
    const before=await page.locator('.interactive-crop svg').getAttribute('viewBox');
    await page.getByRole('button',{name:'Use Image',exact:true}).click();
    const after=await page.locator('.final-crop svg').getAttribute('viewBox');
    if(before!==after)throw Error('Confirmation changed source region');
    await page.locator('.mock-window').screenshot({path:'output/playwright/adjust-'+option+'-confirmed.png'});
    results.push({name:'adjust-'+option+'-confirmation',viewBox:after,unchanged:before===after});
  }
  // Real pointer drag rather than only form controls.
  await page.goto(base+'prototype.html?feature=adjust&option=a');await page.locator('#zoom').fill('1.8');
  const initial=await page.evaluate(()=>reviewState());const box=await page.locator('.interactive-crop').boundingBox();
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2+35,box.y+box.height/2+20,{steps:5});await page.mouse.up();
  const moved=await page.evaluate(()=>reviewState());if(initial.crop.x===moved.crop.x&&initial.crop.y===moved.crop.y)throw Error('Drag did not move source');
  await page.getByRole('button',{name:'Cancel',exact:true}).click();const cancelled=await page.evaluate(()=>reviewState());if(!cancelled.cancelled||cancelled.crop.zoom!==1)throw Error('Cancel did not restore initial sample');
  results.push({name:'pointer-drag-and-cancel',passed:true});
  // Share fixture and close/reopen states.
  await page.goto(base+'prototype.html?feature=share&option=a');await page.getByRole('button',{name:'With code',exact:true}).click();
  await page.getByRole('button',{name:'Code 128',exact:true}).click();await page.getByRole('button',{name:'Back',exact:true}).click();
  await page.getByRole('button',{name:'Share',exact:true}).click();await page.getByRole('dialog',{name:'Native share handoff mockup'}).waitFor();
  await page.getByRole('button',{name:'Back to preview',exact:true}).click();await page.getByRole('button',{name:'Close Share Card',exact:true}).click();
  await page.getByRole('button',{name:'Reopen Share Card',exact:true}).click();await page.locator('#has-back').uncheck();
  if(!await page.getByRole('button',{name:'Back · Not saved',exact:true}).isDisabled())throw Error('Missing Back selectable');
  await page.locator('#scenario').selectOption('unicode');if(!await page.getByRole('button',{name:'Code 128',exact:true}).isDisabled())throw Error('Unsupported Code128 enabled');
  await page.locator('#scenario').selectOption('failed');if(!await page.getByRole('button',{name:'Share',exact:true}).isDisabled())throw Error('Failed export can be shared');
  results.push({name:'share-toggles-handoff-close-missing-back-unicode-failure',passed:true});
  // Enlarged browser text approximates layout stress, not Android Dynamic Type certification.
  for(const feature of ['share','adjust'])for(const option of ['a','b']){
    await page.setViewportSize({width:320,height:740});await page.goto(base+'prototype.html?feature='+feature+'&option='+option);
    await page.evaluate(()=>{const nodes=[...document.querySelectorAll('.sheet h2,.sheet h3,.sheet p,.sheet button,.sheet .mini-label,.sheet .field-title,.sheet summary,.sheet label,.sheet strong,.sheet small')];const sizes=nodes.map(n=>parseFloat(getComputedStyle(n).fontSize));nodes.forEach((n,i)=>n.style.fontSize=sizes[i]*1.5+'px');window.dispatchEvent(new Event('resize'));});
    const metrics=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,
      clipped:[...document.querySelectorAll('.sheet button')].filter(b=>b.scrollWidth>b.clientWidth+2).map(b=>b.textContent.trim()),
      rangeOverlap:[...document.querySelectorAll('.range-field')].some(row=>{const label=row.querySelector('label').getBoundingClientRect(),input=row.querySelector('input').getBoundingClientRect();return label.width>0&&label.right>input.left;}),
      footer:[...document.querySelectorAll('.footer button')].map(b=>({top:b.getBoundingClientRect().top,bottom:b.getBoundingClientRect().bottom})),height:innerHeight}));
    if(metrics.scroll>metrics.width||metrics.clipped.length||metrics.rangeOverlap||metrics.footer.some(b=>b.bottom>metrics.height+2))throw Error('Large text layout '+feature+option+JSON.stringify(metrics));
    await page.screenshot({path:'output/playwright/'+feature+'-'+option+'-large-text.png',fullPage:true});results.push({name:feature+'-'+option+'-320px-150percent',metrics});
  }
  await page.setViewportSize({width:1440,height:1200});await page.goto(base+'crop-proof.html');await page.screenshot({path:'output/playwright/crop-proof-seven.png',fullPage:true});
  return results;
}
