'use strict';
(()=>{
 const D=window.CARD_FACE_REVIEW,$=s=>document.querySelector(s);let selected=D.colors[4];
 const face=c=>'../previews/faces/'+c.id+'.webp';
 D.colors.forEach(c=>{
  const fig=document.createElement('figure');fig.className='color-tile';fig.innerHTML=`<img src="${face(c)}" alt="${c.name} glass master"><figcaption>${c.name}<small>${c.body}</small></figcaption>`;$('#overview').append(fig);
  const b=document.createElement('button');b.type='button';b.dataset.color=c.id;b.innerHTML=`<span class="swatch" style="background:${c.body}" aria-hidden="true"></span>${c.name}`;b.addEventListener('click',()=>render(c));$('#color-controls').append(b);
 });
 function render(c){
  selected=c;$('#master').src=face(c);$('#master').alt=c.name+' original square artwork';$('#color-name').textContent=c.name;$('#png-link').href='../masters/png/'+c.id+'.png';$('#svg-link').href='../masters/svg/'+c.id+'.svg';
  document.querySelectorAll('button[data-color]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.color===c.id)));
  $('#palette').replaceChildren();['deep','body','light','glint'].forEach(role=>{const d=document.createElement('div');d.innerHTML=`<i style="background:${c[role]}"></i><small>${role}<br>${c[role]}</small>`;$('#palette').append(d);});
  $('#add-preview').innerHTML=`<img src="${face(c)}" alt="${c.name}, centered landscape cover crop">`;
  $('#crops').replaceChildren();D.presets.forEach(p=>{const fig=document.createElement('figure');fig.className='crop-figure';fig.dataset.preset=p.id;fig.innerHTML=`<img src="${face(c)}" alt="${c.name} on ${p.label}" style="width:${(p.w-.2)*32}px;height:${(p.h-.2)*32}px"><figcaption>${p.label}</figcaption>`;$('#crops').append(fig);});
  canvas();
 }
 function canvas(){
  const target=$('#sample-canvas'),unit=(target.clientWidth-32)/12;target.style.setProperty('--block',unit+'px');target.replaceChildren();let occupied=[],rows=0;
  D.presets.forEach((p,i)=>{
   let pos=null;for(let y=0;!pos;y++)for(let x=0;x<=12-p.w;x++){const r={x,y,w:p.w,h:p.h+1};if(!occupied.some(q=>r.x<q.x+q.w&&r.x+r.w>q.x&&r.y<q.y+q.h&&r.y+r.h>q.y)){pos=r;break;}}
   occupied.push(pos);rows=Math.max(rows,pos.y+pos.h);
   const c=D.colors[(D.colors.indexOf(selected)+i)%7],card=document.createElement('figure');card.className='canvas-card';card.dataset.preset=p.id;card.dataset.color=c.id;
   Object.assign(card.style,{left:16+(pos.x+.1)*unit+'px',top:16+(pos.y+.1)*unit+'px',width:(p.w-.2)*unit+'px',height:(p.h-.2)*unit+'px'});card.innerHTML=`<img src="${face(c)}" alt="${c.name}, ${p.label}">`;target.append(card);
  });target.style.height=rows*unit+32+'px';
 }
 for(const key of ['A','B','C'])for(const orientation of ['landscape','portrait']){
  const fig=document.createElement('figure');fig.className='folder-figure';fig.innerHTML=`<a href="../folders/gallery/index.html?phone=393&concept=${key}&orientation=${orientation}&count=6"><img src="../sheets/folder-${key}-${orientation}.png" alt="Existing Folder ${key}, ${orientation}, with four new card face miniatures"></a><figcaption>${key} — ${['Lagoon Folder','Lagoon Stack','Lagoon Pocket'][key.charCodeAt(0)-65]}<span>${orientation==='landscape'?'6×4 landscape':'4×6 portrait'} · Open interactive preview ↗</span></figcaption>`;$('#folder-grid').append(fig);
 }
 for(const [old,id,label] of [['pink','blush-pink','Rose with a richer body'],['brown','warm-brown','Caramel instead of gray'],['blue','sky-blue','Lagoon blue with depth']]){
  const c=D.colors.find(x=>x.id===id),fig=document.createElement('figure');fig.className='before-pair';fig.innerHTML=`<h3>${label}</h3><div><span>BEFORE · rejected A-series</span><img src="../assets/before/A-${old}.png" alt="Unmodified rejected ${old} original"></div><div><span>AFTER · Lagoon Glass</span><img src="${face(c)}" alt="New ${c.name} at the same size"></div>`;$('#before-after').append(fig);
 }
 new ResizeObserver(canvas).observe($('#sample-canvas'));render(selected);
})();
