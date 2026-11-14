(() => {
 const data=window.BEMEM_FACE_REVIEW,$=id=>document.getElementById(id);
 let direction='A',color='blue';
 const paths=(d,c)=>`../masters/${d}-${c}.png`;
 const descriptions={A:'Quiet tonal contours with the most open space. A default that stays out of the way.',B:'Warm paper, a small original flower, and an unhurried hand-drawn line.',C:'A desaturated pastel base with a soft folded-light treatment. Closest to the existing Pearl Gray UI.'};
 for(const [id,info] of Object.entries(data.directions)){
  const row=document.createElement('article');row.className='family';
  row.innerHTML=`<div><p class="eyebrow">Direction ${id}</p><h3>${info.name}</h3><p>${descriptions[id]}</p><button data-open="${id}">Explore crops & frames</button></div><div class="face-row">${data.colorways.map(c=>`<figure class="face"><img src="${paths(id,c.id)}" alt="${id}: ${c.label} artwork, landscape crop"><figcaption>${c.label}</figcaption></figure>`).join('')}</div>`;
  $('families').append(row);
 }
 $('swatches').innerHTML=data.colorways.map(c=>`<button title="${c.label}" aria-label="${c.label}" aria-pressed="${c.id===color}" data-color="${c.id}"><span style="background:${c.base}"></span></button>`).join('');
 function render(){
  const info=data.directions[direction];$('direction-name').textContent=`${direction} / ${info.name}`;$('direction-description').textContent=descriptions[direction];$('frame-name').textContent=info.frame;
  $('color-sheet').href=`../sheets/${direction}-colorways.png`;$('crop-sheet').href=`../sheets/${direction}-crops.png`;$('frame-sheet').href=`../sheets/${direction}-frames.png`;
  $('master').src=paths(direction,color);$('master-link').href=`../masters/${direction}-${color}.svg`;
  const r=data.commonSafeRect;$('safe-zone').style.cssText=`left:${r.x/data.masterSize*100}%;top:${r.y/data.masterSize*100}%;width:${r.width/data.masterSize*100}%;height:${r.height/data.masterSize*100}%`;
  $('board').innerHTML=data.presets.map(p=>`<div class="footprint" style="grid-column:${p.col+1}/span ${p.w};grid-row:${p.row+1}/span ${p.h}"><div class="paint"><img src="${paths(direction,color)}" alt="${p.w} by ${p.h} blocks, ${color} ${direction}"><span class="size-label">${p.w}×${p.h}</span><span class="sample-label">Test Member</span></div></div>`).join('');
  $('groups').innerHTML=Object.entries(data.frameVariants).map(([variant,[w,h]])=>{
   const boxes=variant==='wide'?[[85,130,450,300],[585,130,450,300]]:variant==='tall'?[[210,130,380,570],[170,770,450,300]]:[[85,170,480,320],[650,170,180,270]];
   return `<figure class="group-example"><div class="group-stage" style="aspect-ratio:${w}/${h}">${boxes.map((b,i)=>`<div class="group-card" style="left:${b[0]/w*100}%;top:${b[1]/h*100}%;width:${b[2]/w*100}%;height:${b[3]/h*100}%"><img alt="Grouped sample card" src="${paths(direction,i?color:'green')}"></div>`).join('')}<img class="group-frame" alt="${info.frame}, ${variant} frame concept" src="../frames/${direction}-${variant}.png"><span class="group-label" style="left:${80/w*100}%;top:${40/h*100}%;line-height:1;white-space:nowrap">Everyday · 2</span></div><figcaption>${variant[0].toUpperCase()+variant.slice(1)} pocket · visual concept</figcaption></figure>`;
  }).join('');
  document.querySelectorAll('[data-color]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.color===color)));
  resizeBoard();
 }
 function resizeBoard(){const w=$('board').getBoundingClientRect().width;if(w)$('board').style.setProperty('--unit',`${w/12}px`);}
 function select(id){const all=id==='all';$('comparison').hidden=!all;$('detail').hidden=all;document.querySelectorAll('[data-dir]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.dir===id)));if(!all){direction=id;render();}}
 document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.dir)select(b.dataset.dir);if(b.dataset.open){select(b.dataset.open);$('detail').scrollIntoView({block:'start'});}if(b.dataset.color){color=b.dataset.color;render();}});
 $('guide').addEventListener('change',e=>$('safe-zone').hidden=!e.target.checked);
 $('show-labels').addEventListener('change',e=>$('board').classList.toggle('show-labels',e.target.checked));
 new ResizeObserver(resizeBoard).observe($('board'));render();
})();
