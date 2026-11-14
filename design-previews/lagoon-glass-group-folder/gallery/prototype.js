'use strict';
(() => {
  const D=window.LAGOON_FOLDER_DATA;
  const state={concept:'A',orientation:'landscape',count:4,name:'Everyday essentials',width:393};
  const $=s=>document.querySelector(s);
  const overlay=$('#overlay'), review=$('#review');
  let active=null,returnFocus=null,closing=false;
  const observer=new ResizeObserver(entries=>entries.forEach(({target,contentRect:r})=>{
    const image=target.querySelector('img');if(!image)return;
    const ratio=Number(image.dataset.ratio);const w=Math.min(r.width,r.height*ratio);
    image.style.width=w+'px';image.style.height=w/ratio+'px';
  }));
  function folderData(count,name){
    if(!Number.isInteger(count)||count<0||count>6)throw new Error('A folder supports zero to six members.');
    return {id:'preview-folder',name:name||'Untitled folder',memberCardIds:D.cards.slice(0,count).map(c=>c.id)};
  }
  function folder(concept,orientation,count,name,unit){
    const f=folderData(count,name),size=D.orientations[orientation];
    if(!size||!D.concepts[concept])throw new Error('Unsupported preview configuration.');
    const button=document.createElement('button');button.type='button';button.className=`folder ${concept} ${orientation}`;
    button.dataset.concept=concept;button.dataset.orientation=orientation;button.dataset.members=count;
    button.style.width=size.w*unit+'px';button.style.height=size.h*unit+'px';button.style.setProperty('--inset',unit*.1+'px');if(unit<35)button.classList.add('canvas-scale');
    button.setAttribute('aria-label','Open folder: '+f.name);button.title=f.name;
    const paint=document.createElement('div');paint.className='folder-paint';button.append(paint);
    for(const layer of ['back','front']){const img=new Image();img.src=`../assets/shells/${concept}-${orientation}-${layer}.svg`;img.alt='';img.className='shell '+layer;paint.append(img);}
    const minis=document.createElement('div');minis.className='miniatures'+(count===1?' single':'');paint.append(minis);
    D.cards.filter(c=>f.memberCardIds.includes(c.id)).slice(0,4).forEach(c=>{
      const cell=document.createElement('div');cell.className='mini-cell';const img=new Image();img.src='../assets/'+c.image;img.alt='';img.className='mini-card';img.dataset.ratio=(c.w-.2)/(c.h-.2);cell.append(img);minis.append(cell);observer.observe(cell);
    });
    if(!count){const empty=document.createElement('span');empty.className='folder-empty';empty.textContent='Empty folder';paint.append(empty);}
    const label=document.createElement('span');label.className='folder-name';label.textContent=f.name;paint.append(label);
    button.addEventListener('click',()=>openSheet({...f,concept,orientation},button));return button;
  }
  function makeBoards(){
    for(const orientation of ['landscape','portrait']){
      const board=$('#'+orientation+'-board');board.replaceChildren();
      for(const [key,c] of Object.entries(D.concepts)){
        const tile=document.createElement('article');tile.className='concept-tile';
        const label=document.createElement('div');label.className='concept-label';label.innerHTML=`<span class="concept-letter">${key}</span><h3>${c.name}</h3>`;tile.append(label);
        const stage=document.createElement('div');stage.className='object-stage '+(orientation==='portrait'?'portrait-stage':'');tile.append(stage);
        const note=document.createElement('p');note.className='concept-note';note.textContent=c.note;tile.append(note);board.append(tile);
        new ResizeObserver(([entry])=>{const unit=Math.min(50,(entry.contentRect.width-12)/6);stage.querySelectorAll('.mini-cell').forEach(x=>observer.unobserve(x));stage.replaceChildren(folder(key,orientation,4,'Everyday essentials',unit));}).observe(stage);
      }
    }
    [0,1,4,6].forEach(n=>{
      const tile=document.createElement('article');tile.className='state-tile';const title=document.createElement('p');title.textContent=n===0?'Empty':n===1?'One member':n===4?'Four members':'Six members';tile.append(title);
      const stage=document.createElement('div');stage.style.width='100%';stage.style.display='flex';stage.style.justifyContent='center';tile.append(stage);$('#states-board').append(tile);
      new ResizeObserver(([entry])=>{stage.querySelectorAll('.mini-cell').forEach(x=>observer.unobserve(x));stage.replaceChildren(folder('A','landscape',n,'Everyday essentials',Math.min(34,entry.contentRect.width/6)));}).observe(stage);
    });
  }
  function update(){
    const d=$('#device');d.style.width=state.width+'px';
    document.querySelectorAll('[data-choice]').forEach(b=>b.setAttribute('aria-pressed',String(String(state[b.dataset.choice])===b.dataset.value)));
    document.querySelectorAll('[data-orientation]').forEach(b=>{if(b.tagName==='BUTTON'&&!b.classList.contains('folder'))b.setAttribute('aria-pressed',String(b.dataset.orientation===state.orientation));});
    const canvas=$('#canvas');const unit=canvas.clientWidth/12;canvas.style.setProperty('--block',unit+'px');canvas.querySelectorAll('.mini-cell').forEach(x=>observer.unobserve(x));canvas.replaceChildren(folder(state.concept,state.orientation,state.count,state.name,unit));
  }
  function choices(container,key,values,label){values.forEach(v=>{const b=document.createElement('button');b.type='button';b.dataset.choice=key;b.dataset.value=v;b.textContent=label(v);b.addEventListener('click',()=>{state[key]=v;update();});$(container).append(b);});}
  choices('#concept-controls','concept',['A','B','C'],v=>v+' · '+D.concepts[v].name);
  choices('#count-controls','count',[0,1,4,6],v=>String(v));
  choices('#width-controls','width',[360,393,412],v=>v+' px');
  document.querySelectorAll('button[data-orientation]').forEach(b=>b.addEventListener('click',()=>{state.orientation=b.dataset.orientation;update();}));
  $('#folder-name').addEventListener('input',e=>{state.name=e.target.value;update();});
  $('#long-name').addEventListener('click',()=>{state.name='Everyday memberships, weekend discoveries and places I love';$('#folder-name').value=state.name;update();});
  function contentsLayout(){
    if(!active)return;const body=$('#sheet-body');body.replaceChildren();
    const cards=active.memberCardIds.map(id=>D.cards.find(c=>c.id===id));
    if(!cards.length){body.innerHTML='<div class="empty-state"><img class="empty-mark" src="../assets/shells/A-landscape-back.svg" alt=""><strong>A little room for your favorites.</strong><p>This folder is empty.</p></div>';return;}
    const grid=document.createElement('div');grid.className='contents-grid';body.append(grid);
    const unit=body.clientWidth-36;const block=unit/12;const placed=[];let rows=0;
    cards.forEach(c=>{
      let position=null;
      for(let y=0;!position;y++)for(let x=0;x<=12-c.w;x++){
        const candidate={x,y,w:c.w,h:c.h+2};
        if(!placed.some(p=>candidate.x<p.x+p.w&&candidate.x+candidate.w>p.x&&candidate.y<p.y+p.h&&candidate.y+candidate.h>p.y)){position=candidate;break;}
      }
      placed.push(position);rows=Math.max(rows,position.y+position.h);
      const fig=document.createElement('figure');fig.className='member-card';fig.dataset.cardId=c.id;fig.dataset.w=c.w;fig.dataset.h=c.h;
      Object.assign(fig.style,{left:position.x*block+'px',top:position.y*block+'px',width:c.w*block+'px',height:(c.h+2)*block+'px'});fig.style.setProperty('--card-inset',block*.1+'px');
      const art=document.createElement('div');art.className='member-art';art.style.height=(c.h-.2)*block+'px';const img=new Image();img.src='../assets/'+c.image;img.alt=c.name+' sample artwork';art.append(img);
      if(c.kind==='default-artwork'){const title=document.createElement('span');title.textContent=c.name;art.append(title);}
      const cap=document.createElement('figcaption');cap.textContent=c.name;fig.append(art,cap);grid.append(fig);
    });grid.style.height=rows*block+'px';
  }
  function openSheet(f,button){
    if(active)return;active=f;returnFocus=button;$('#sheet-title').textContent=f.name;overlay.hidden=false;review.inert=true;document.body.style.overflow='hidden';contentsLayout();$('#sheet-body').scrollTop=0;$('#close-sheet').focus();history.pushState({bememFolderPreview:true},'');
  }
  function finishClose(){active=null;closing=false;overlay.hidden=true;review.inert=false;document.body.style.overflow='';(returnFocus?.isConnected?returnFocus:$('#canvas .folder'))?.focus();}
  function closeSheet(){if(!active||closing)return;closing=true;if(history.state?.bememFolderPreview)history.back();else finishClose();}
  $('#close-sheet').addEventListener('click',closeSheet);$('.scrim').addEventListener('click',closeSheet);
  window.addEventListener('popstate',()=>{if(active)finishClose();});
  document.addEventListener('keydown',e=>{if(!active)return;if(e.key==='Escape'){e.preventDefault();closeSheet();}if(e.key==='Tab'){e.preventDefault();(document.activeElement===$('#close-sheet')?$('#sheet-body'):$('#close-sheet')).focus();}});
  window.addEventListener('resize',()=>{update();if(active)contentsLayout();});
  if(new URLSearchParams(location.search).has('phone'))document.body.classList.add('phone-review');
  makeBoards();update();
  // Isolated fixture API for browser verification only; no app or storage access.
  window.folderPreview={set(options){folderData(options.count??state.count,options.name??state.name);Object.assign(state,options);$('#folder-name').value=state.name;update();},close:closeSheet,getState:()=>({...state})};
})();
