/* Offline design prototype. Deliberately has no native sharing, Wallet, persistence, or file picker. */
(() => {
  const q=new URLSearchParams(location.search),feature=q.get('feature')==='adjust'?'adjust':'share',option=q.get('option')==='b'?'b':'a';
  const app=document.querySelector('#app'),M=window.CropReview;
  const state={mode:q.get('mode')==='scan'?'scan':'image',side:q.get('side')==='back'?'back':'front',format:q.get('format')==='code128'?'code128':'qr',step:Number(q.get('step'))===2?2:1,
    closed:false,nativeDemo:false,hasBack:true,scenario:'ready',preset:q.get('preset')||'card-landscape',source:q.get('source')||'wide',crop:{x:.5,y:.5,zoom:1},confirmed:null,cancelled:false,grid:true};
  if(!M.presets.some(p=>p.id===state.preset))state.preset='card-landscape';if(!M.sources[state.source])state.source='wide';
  const icon=(name,cls='')=>`<svg class="icon ${cls}" viewBox="0 0 24 24" aria-hidden="true">${window.ReviewIcons[name]||''}</svg>`;
  const plus=`<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12H19M12 5V19"/></svg>`,minus=`<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12H19"/></svg>`;
  const preset=()=>M.presets.find(p=>p.id===state.preset),source=()=>M.sources[state.source],aspect=()=>M.ratio(preset());
  function dock(){return `<div class="review-dock"><div class="dock-line"><a href="index.html" target="_top">bemem review</a><span>${feature==='share'?'SHARE':'ADJUST'} ${option.toUpperCase()} · MOCKUP ONLY</span></div>${feature==='adjust'?`<div class="fixture-controls"><label>Card<select id="preset">${M.presets.map(p=>`<option value="${p.id}" ${p.id===state.preset?'selected':''}>${p.label}</option>`).join('')}</select></label><label>Source<select id="source">${Object.entries(M.sources).map(([id,s])=>`<option value="${id}" ${id===state.source?'selected':''}>${s.label}</option>`).join('')}</select></label></div>`:`<div class="fixture-controls"><label><input id="has-back" type="checkbox" ${state.hasBack?'checked':''}>Back artwork saved</label><label>Preview state<select id="scenario"><option value="ready">Ready</option><option value="preparing" ${state.scenario==='preparing'?'selected':''}>Preparing</option><option value="failed" ${state.scenario==='failed'?'selected':''}>Export failed</option><option value="unicode" ${state.scenario==='unicode'?'selected':''}>QR-only Number</option></select></label></div>`}</div>`;}
  const backdrop=()=>`<div class="backdrop" aria-hidden="true"><div class="home-row"><span class="wordmark">bemem.</span>${icon('qr')}</div><div class="home-cards"><i></i><i></i><i></i><i></i></div></div><div class="scrim"></div>`;
  const head=title=>`<header class="sheet-head"><h2>${title}</h2><button class="circle" data-action="close" aria-label="Close ${title}">${icon('close')}</button></header>`;
  const modeName=()=>state.mode==='image'?'Card image':'Card + scan code';
  const formatName=()=>state.format==='qr'?'QR Code':'Code 128';
  const number=()=>state.scenario==='unicode'?'0012 สมาชิก':'00123456';
  function card(){const sample=state.side==='back'?{w:900,h:600,file:'assets/card-back.svg'}:M.sources.wide;
    return `<div class="sample-card">${M.svg(sample,1.5,{x:.5,y:.5,zoom:1})}${state.side==='front'?'<span class="card-name">Test Member</span>':''}</div>`;}
  function output(){if(state.scenario==='preparing')return `<div class="output-stage" role="status">Preparing preview…</div>`;
    if(state.scenario==='failed')return `<div class="output-stage"><div><p role="alert">Preview unavailable.</p><button class="secondary" data-action="retry">Try again</button></div></div>`;
    return `<div class="output-stage"><div class="output ${state.mode==='image'?'image-only':'scan-output'}">${state.mode==='scan'?'<span class="output-title">Test Member</span>':''}${card()}${state.mode==='scan'?`<img class="scan-svg ${state.format==='code128'?'barcode':''}" src="assets/sample-${state.scenario==='unicode'?'qr-unicode':state.format}.svg" alt="Synthetic sample ${formatName()} for ${number()}"><span class="sample-number">${number()}</span>`:''}</div></div>`;}
  function modes(){return `<div class="segmented" aria-label="Share content"><button data-mode="image" aria-pressed="${state.mode==='image'}">${icon('image')}Image only</button><button data-mode="scan" aria-pressed="${state.mode==='scan'}">${icon('qr')}With code</button></div>`;}
  function sides(){return `<div class="compact-row"><span class="mini-label">Side</span><div class="segmented" aria-label="Card side"><button data-side="front" aria-pressed="${state.side==='front'}">Front</button><button data-side="back" ${!state.hasBack?'disabled':''} aria-pressed="${state.side==='back'}">Back${!state.hasBack?' · Not saved':''}</button></div></div>`;}
  function formats(){return state.mode==='scan'?`<div class="compact-row"><span class="mini-label">Code</span><div class="segmented" aria-label="Code format"><button data-format="qr" aria-pressed="${state.format==='qr'}">QR Code</button><button data-format="code128" ${state.scenario==='unicode'?'disabled':''} aria-pressed="${state.format==='code128'}">Code 128</button></div></div>${state.scenario==='unicode'?'<p class="status-line warning">Code 128 is unavailable for this Number.</p>':''}`:'';}
  const privacy=()=>`<details class="privacy"><summary>What's included?</summary><p>${state.mode==='image'?'Selected card appearance only. Artwork may already contain personal information.':'Selected card appearance, card name, Number and scan code. Share only with someone you trust.'}</p></details>`;
  const included=()=>`<div class="inclusion">${icon(state.mode==='scan'?'qr':'image')}<span>${state.mode==='image'?'Artwork only · no added code':`Name, Number & ${formatName()}`}</span></div>`;
  const shareAction=()=>`<button class="primary full" data-action="share" ${!['ready','unicode'].includes(state.scenario)?'disabled':''}>${icon('share')}Share${state.mode==='image'?' image':''}</button>`;
  function share(){let body,footer;
    if(option==='a'){
      body=`<div class="preview-label"><span>Sharing preview</span><span class="pill">${state.side==='front'?'Front':'Back'}</span></div>${output()}${included()}${modes()}${sides()}${formats()}${privacy()}`;
      footer=shareAction();
    }else if(state.step===1){
      body=`<p class="step-title">1 OF 2 · CHOOSE OUTPUT</p>${['image','scan'].map(mode=>`<button class="output-choice" data-mode="${mode}" aria-pressed="${state.mode===mode}">${icon(mode==='image'?'image':'qr')}<span><strong>${mode==='image'?'Card image':'Card + scan code'}</strong><small>${mode==='image'?'Selected card appearance':'Appearance, name, Number & code'}</small></span><i class="choice-check" aria-hidden="true"></i></button>`).join('')}<p class="field-title">Live preview · ${state.side==='front'?'Front':'Back'}</p>${output()}${included()}${privacy()}`;
      footer='<button class="primary" data-action="review">Review image →</button>';
    }else{
      body=`<p class="step-title">2 OF 2 · REVIEW & SHARE</p><div class="step-summary"><strong>${modeName()}</strong><button class="text-button" data-action="change">Change</button></div>${output()}${included()}${sides()}${formats()}${privacy()}`;
      footer=`<button class="secondary" data-action="change">Back</button>${shareAction()}`;
    }
    return `<section class="sheet" aria-label="Share Card option ${option.toUpperCase()}">${head('Share Card')}<div class="sheet-body ${option==='b'&&state.step===1?'share-step-one':''}">${body}</div><footer class="footer">${footer}</footer></section>`;
  }
  function viewport(crop=state.crop,cls='interactive-crop'){
    return `<div class="crop-viewport ${cls}" style="--aspect:${aspect()};aspect-ratio:${aspect()}">${M.svg(source(),aspect(),crop)}${state.grid&&cls==='interactive-crop'?'<div class="crop-guides"></div>':''}</div>`;
  }
  const positionControls=()=>`<div class="range-field"><label for="pos-x">Horizontal</label><input id="pos-x" class="range" type="range" min="0" max="1" step="0.005" value="${state.crop.x}" aria-label="Horizontal image position"></div><div class="range-field"><label for="pos-y">Vertical</label><input id="pos-y" class="range" type="range" min="0" max="1" step="0.005" value="${state.crop.y}" aria-label="Vertical image position"></div>`;
  const zoom=()=>`<button class="circle" data-action="zoom-out" aria-label="Zoom out">${minus}</button><input id="zoom" class="range" type="range" min="1" max="3" step=".01" value="${state.crop.zoom}" aria-label="Image zoom"><button class="circle" data-action="zoom-in" aria-label="Zoom in">${plus}</button>`;
  function overview(){const r=M.region(source(),aspect(),state.crop);return `<div class="source-row"><div class="source-overview"><img src="${source().file}" alt="Complete original sample image"><div class="source-outline" style="left:${r.x/source().w*100}%;top:${r.y/source().h*100}%;width:${r.w/source().w*100}%;height:${r.h/source().h*100}%"></div></div><span>Visible on card<br><span class="zoom-value">${Math.round(state.crop.zoom*100)}%</span></span></div>`;}
  function adjust(){
    const controls=option==='a'?`<p class="gesture-hint">Drag to frame · Pinch to zoom</p><div class="zoom-row">${zoom()}</div><div class="adjust-summary"><button class="text-button" data-action="reset">Reset</button><button class="text-button" data-action="grid" aria-pressed="${state.grid}">Grid ${state.grid?'on':'off'}</button></div><details class="fine-adjust"><summary>Fine adjustment</summary>${positionControls()}</details>`:`<section class="control-section"><h3>Zoom <span class="zoom-value">${Math.round(state.crop.zoom*100)}%</span></h3><div class="zoom-controls">${zoom()}</div><h3>Position</h3>${positionControls()}<button class="text-button" data-action="reset">Reset image</button>${overview()}</section>`;
    return `<section class="sheet adjust adjust-${option}" aria-label="Adjust Image option ${option.toUpperCase()}">${head('Adjust image')}<div class="sheet-body"><p class="card-context">${preset().label} · ${state.side==='front'?'Front':'Back'}</p><div class="crop-area">${viewport()}</div>${controls}</div><footer class="footer"><button class="secondary" data-action="cancel">Cancel</button><button class="primary" data-action="use">${icon('check')}Use Image</button></footer></section>`;
  }
  function result(){const committed=state.confirmed||{x:.5,y:.5,zoom:1};return `<section class="sheet adjust adjust-result">${head(state.cancelled?'Image unchanged':'Image ready')}<div class="sheet-body result-body"><p class="card-context">${preset().label} · ${state.side==='front'?'Front':'Back'}</p><div class="crop-area" style="width:100%">${viewport(committed,'final-crop')}</div><h3>${state.cancelled?'Cancelled. Previous composition kept.':'Same frame. Same composition.'}</h3>${!state.cancelled?`<div class="result-pair"><figure>${viewport(committed,'proof-crop')}<figcaption>While adjusting</figcaption></figure><figure>${viewport(committed,'proof-crop')}<figcaption>Confirmed card</figcaption></figure></div>`:''}<p role="status">Browser draft only. No image file or Wallet data was saved.</p></div><footer class="footer"><button class="primary" data-action="adjust-again">Adjust again</button></footer></section>`;}
  function render(){app.innerHTML=dock()+`<main class="mock-window">${backdrop()}${state.closed?`<div class="empty-state"><h2>${feature==='share'?'Share closed':'Adjustment closed'}</h2><p>No files were shared or saved. This is an isolated design proposal.</p><button class="primary" data-action="reopen">Reopen ${feature==='share'?'Share Card':'Adjust image'}</button></div>`:feature==='share'?share():state.confirmed||state.cancelled?result():adjust()}${state.nativeDemo?`<div class="native-demo" role="dialog" aria-label="Native share handoff mockup"><div><h3>Native share sheet</h3><p>Demo handoff only. The app would share this exact reviewed image using its existing verified PNG workflow.</p><button class="primary full" data-action="dismiss-demo">Back to preview</button></div></div>`:''}</main>`;
    fit();document.querySelector('.interactive-crop')?.addEventListener('pointerdown',startPointer);}
  function fit(){const frame=document.querySelector('.mock-window'),dock=document.querySelector('.review-dock');
    if(frame&&dock){frame.style.minHeight='0';frame.style.height=`${Math.max(350,innerHeight-dock.getBoundingClientRect().height-(innerWidth>=700?40:0))}px`;}
    const area=document.querySelector('.crop-area');if(!area)return;const cs=getComputedStyle(area),w=area.clientWidth-parseFloat(cs.paddingLeft)-parseFloat(cs.paddingRight),h=Math.max(120,area.clientHeight-parseFloat(cs.paddingTop)-parseFloat(cs.paddingBottom));
    area.querySelectorAll('.crop-viewport').forEach(v=>{const width=Math.min(w,h*aspect());v.style.width=`${width}px`;v.style.height=`${width/aspect()}px`;});}
  function paint(){const v=document.querySelector('.interactive-crop');if(v){v.querySelector('.crop-art').outerHTML=M.svg(source(),aspect(),state.crop);}
    for(const [id,key] of [['zoom','zoom'],['pos-x','x'],['pos-y','y']]){const input=document.getElementById(id);if(input)input.value=state.crop[key];}
    document.querySelectorAll('.zoom-value').forEach(n=>n.textContent=`${Math.round(state.crop.zoom*100)}%`);
    const outline=document.querySelector('.source-outline');if(outline){const r=M.region(source(),aspect(),state.crop);Object.assign(outline.style,{left:r.x/source().w*100+'%',top:r.y/source().h*100+'%',width:r.w/source().w*100+'%',height:r.h/source().h*100+'%'});}}
  app.addEventListener('click',e=>{const b=e.target.closest('button');if(!b||b.disabled)return;
    if(b.dataset.mode){state.mode=b.dataset.mode;render();return;}if(b.dataset.side){state.side=b.dataset.side;render();return;}if(b.dataset.format){state.format=b.dataset.format;render();return;}
    const action=b.dataset.action;
    if(action==='zoom-in'||action==='zoom-out'){state.crop.zoom=M.clamp(state.crop.zoom+(action==='zoom-in'?.1:-.1),1,3);paint();return;}
    if(action==='reset'){state.crop={x:.5,y:.5,zoom:1};paint();return;}
    if(action==='grid'){state.grid=!state.grid;render();return;}
    if(action==='close')state.closed=true;
    if(action==='reopen')state.closed=false;
    if(action==='review')state.step=2;
    if(action==='change')state.step=1;
    if(action==='share')state.nativeDemo=true;
    if(action==='dismiss-demo')state.nativeDemo=false;
    if(action==='retry')state.scenario='ready';
    if(action==='use'){state.confirmed={...state.crop};state.cancelled=false;}
    if(action==='cancel'){state.crop={x:.5,y:.5,zoom:1};state.cancelled=true;}
    if(action==='adjust-again'){state.confirmed=null;state.cancelled=false;}
    render();});
  app.addEventListener('change',e=>{if(!['preset','source','has-back','scenario'].includes(e.target.id))return;
    if(e.target.id==='preset'||e.target.id==='source'){state[e.target.id]=e.target.value;state.crop={x:.5,y:.5,zoom:1};state.confirmed=null;state.cancelled=false;}
    if(e.target.id==='has-back'){state.hasBack=e.target.checked;if(!state.hasBack)state.side='front';}
    if(e.target.id==='scenario'){state.scenario=e.target.value;if(state.scenario==='unicode')state.format='qr';}
    render();});
  app.addEventListener('input',e=>{const key={zoom:'zoom','pos-x':'x','pos-y':'y'}[e.target.id];if(key){state.crop[key]=Number(e.target.value);paint();}});
  // Pinch preserves the source point under the fingers; single drag moves the image, not the sheet.
  const points=new Map();let gesture=null;
  function beginGesture(){const v=document.querySelector('.interactive-crop');if(!v)return;const rect=v.getBoundingClientRect(),p=[...points.values()];
    if(p.length===1)gesture={rect,start:{...state.crop},x:p[0].x,y:p[0].y};
    else if(p.length>=2){const u=((p[0].x+p[1].x)/2-rect.left)/rect.width,vv=((p[0].y+p[1].y)/2-rect.top)/rect.height,r=M.region(source(),aspect(),state.crop);
      gesture={rect,start:{...state.crop},distance:Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y),focal:{x:r.x+u*r.w,y:r.y+vv*r.h}};}}
  function startPointer(e){if(e.button!==0&&e.pointerType==='mouse')return;e.preventDefault();points.set(e.pointerId,{x:e.clientX,y:e.clientY});e.currentTarget.setPointerCapture(e.pointerId);beginGesture();}
  document.addEventListener('pointermove',e=>{if(!points.has(e.pointerId)||!gesture)return;points.set(e.pointerId,{x:e.clientX,y:e.clientY});const p=[...points.values()],s=source(),g=gesture;
    if(p.length>=2&&g.distance){const dist=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y),z=M.clamp(g.start.zoom*dist/Math.max(1,g.distance),1,3),r=M.region(s,aspect(),{...g.start,zoom:z});
      const u=((p[0].x+p[1].x)/2-g.rect.left)/g.rect.width,v=((p[0].y+p[1].y)/2-g.rect.top)/g.rect.height;
      state.crop={zoom:z,x:s.w-r.w>1e-8?M.clamp((g.focal.x-u*r.w)/(s.w-r.w),0,1):.5,y:s.h-r.h>1e-8?M.clamp((g.focal.y-v*r.h)/(s.h-r.h),0,1):.5};
    }else{const r=M.region(s,aspect(),g.start),dx=(p[0].x-g.x)/g.rect.width*r.w,dy=(p[0].y-g.y)/g.rect.height*r.h;
      state.crop={...g.start,x:s.w-r.w>1e-8?M.clamp(g.start.x-dx/(s.w-r.w),0,1):g.start.x,y:s.h-r.h>1e-8?M.clamp(g.start.y-dy/(s.h-r.h),0,1):g.start.y};}paint();});
  for(const name of ['pointerup','pointercancel'])document.addEventListener(name,e=>{if(points.delete(e.pointerId)){gesture=null;if(points.size)beginGesture();}});
  window.addEventListener('resize',fit);window.addEventListener('keydown',e=>{if(e.key==='Escape'){state.nativeDemo?state.nativeDemo=false:state.closed=true;render();}});
  // Read-only inspection hook for review QA, not an app API.
  window.reviewState=()=>JSON.parse(JSON.stringify({...state,region:M.region(source(),aspect(),state.crop)}));
  render();
})();
