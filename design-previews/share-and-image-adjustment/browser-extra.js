async (page) => {
  const base='http://127.0.0.1:8768/design-previews/share-and-image-adjustment/';
  await page.setViewportSize({width:412,height:915});const cases=[];
  const ids=['mini-landscape','card-landscape','voucher-landscape','boarding-pass-landscape','mini-portrait','card-portrait','vaccine-passport-portrait'];
  for(const option of ['a','b'])for(const id of ids){
    await page.goto(base+'prototype.html?feature=adjust&option='+option+'&preset='+id+'&side='+(option==='b'?'back':'front'));
    const geometry=await page.evaluate(()=>{const v=document.querySelector('.interactive-crop').getBoundingClientRect(),a=document.querySelector('.crop-area').getBoundingClientRect(),s=reviewState(),p=CropReview.presets.find(p=>p.id===s.preset);return{actual:v.width/v.height,expected:CropReview.ratio(p),inside:v.width<=a.width&&v.height<=a.height,side:s.side};});
    if(Math.abs(geometry.actual-geometry.expected)>.001||!geometry.inside)throw Error('Incorrect viewport '+id+JSON.stringify(geometry));
    const before=await page.locator('.interactive-crop svg').getAttribute('viewBox');await page.getByRole('button',{name:'Use Image',exact:true}).click();
    if(before!==await page.locator('.final-crop svg').getAttribute('viewBox'))throw Error('Mismatch after Use Image');
    cases.push({option,id,...geometry});
  }
  await page.goto(base+'prototype.html?feature=adjust&option=a');
  const client=await page.context().newCDPSession(page);await client.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
  const r=await page.locator('.interactive-crop').boundingBox(),x=r.x+r.width/2,y=r.y+r.height/2;
  await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:x-30,y,id:1},{x:x+30,y,id:2}]});
  await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x-55,y,id:1},{x:x+55,y,id:2}]});
  await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  const pinch=await page.evaluate(()=>reviewState());if(pinch.crop.zoom<=1.1)throw Error('Pinch did not zoom');
  await client.send('Emulation.setTouchEmulationEnabled',{enabled:false});
  await page.goto(base+'prototype.html?feature=share&option=b');await page.getByRole('button',{name:'Card + scan code',exact:false}).click();
  await page.getByRole('button',{name:'Review image →',exact:true}).click();await page.getByRole('button',{name:'Back',exact:true}).last().click();
  if((await page.evaluate(()=>reviewState())).step!==1)throw Error('Guided Back failed');
  return{sevenSizeFrontBackCases:cases,multiTouchPinchZoom:pinch.crop.zoom,guidedBackPassed:true};
}
