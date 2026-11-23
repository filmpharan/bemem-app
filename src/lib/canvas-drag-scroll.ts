type Bounds={scrollY:number;viewportHeight:number;contentHeight:number};
type Frames={request:(callback:(time:number)=>void)=>number;cancel:(id:number)=>void};
const frames:Frames={request:callback=>requestAnimationFrame(callback),cancel:id=>cancelAnimationFrame(id)};

/** Only scrolls existing grid content. UI hint/footer padding is not drop space. */
export function edgeScrollPosition(pointerY:number,bounds:Bounds,elapsedMs:number) {
  const {scrollY,viewportHeight,contentHeight}=bounds;
  if(![pointerY,scrollY,viewportHeight,contentHeight,elapsedMs].every(Number.isFinite)||viewportHeight<=0)return scrollY;
  const zone=Math.min(56,viewportHeight/4),maximum=Math.max(0,contentHeight-viewportHeight);
  const strength=pointerY<zone?-Math.min(1,(zone-pointerY)/zone):pointerY>viewportHeight-zone?Math.min(1,(pointerY-viewportHeight+zone)/zone):0;
  const delta=strength*400*Math.max(0,Math.min(32,elapsedMs))/1000;
  // Native manual scrolling can reach the existing hint padding; never jump it
  // back on pickup or extend that padding into additional placement rows.
  return delta>0?Math.max(scrollY,Math.min(maximum,scrollY+delta)):delta<0?Math.max(0,scrollY+delta):scrollY;
}

export function createCanvasEdgeScroll(bounds:()=>Bounds,onScroll:(y:number)=>void,clock:Frames=frames) {
  let active=false,pointerY=0,frame:number|undefined,last:number|undefined,refresh=()=>{},epoch=0;
  function stop(){++epoch;active=false;if(frame!==undefined)clock.cancel(frame);frame=undefined;last=undefined;refresh=()=>{};}
  function tick(time:number,ticket:number){
    if(!active||ticket!==epoch)return;frame=undefined;
    const current=bounds(),next=edgeScrollPosition(pointerY,current,last===undefined?16:time-last);last=time;
    if(next!==current.scrollY){onScroll(next);if(bounds().scrollY!==current.scrollY)refresh();}
    if(active&&ticket===epoch)frame=clock.request(time=>tick(time,ticket));
  }
  return {start(y:number,onStep:()=>void){stop();active=true;pointerY=y;refresh=onStep;const ticket=epoch;frame=clock.request(time=>tick(time,ticket));},
    move(y:number){pointerY=y;},sync(){if(active)refresh();},stop};
}
