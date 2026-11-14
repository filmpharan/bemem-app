/* Design-only math. No native imports, storage, network or app runtime. */
(function(root){
  const presets=[['mini-landscape','Mini 3×2',3,2],['card-landscape','Card 6×4',6,4],['voucher-landscape','Voucher 7×3',7,3],['boarding-pass-landscape','Boarding Pass 8×4',8,4],['mini-portrait','Mini 2×3',2,3],['card-portrait','Card 4×6',4,6],['vaccine-passport-portrait','Vaccine Passport 5×7',5,7]].map(([id,label,w,h])=>({id,label,w,h}));
  const sources={wide:{w:1600,h:1000,file:'assets/source-wide.svg',label:'Landscape source'},tall:{w:1000,h:1600,file:'assets/source-tall.svg',label:'Portrait source'},square:{w:1200,h:1200,file:'assets/source-square.svg',label:'Square source'}};
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
  const ratio=p=>(p.w-.2)/(p.h-.2);
  function region(source,aspect,crop){
    const unitScale=Math.max(aspect/source.w,1/source.h)*crop.zoom;
    const w=aspect/unitScale,h=1/unitScale;
    return {x:(source.w-w)*crop.x,y:(source.h-h)*crop.y,w,h};
  }
  function svg(source,aspect,crop,cls='crop-art'){
    const r=region(source,aspect,crop);
    return `<svg class="${cls}" viewBox="${r.x} ${r.y} ${r.w} ${r.h}" preserveAspectRatio="none" aria-label="Sample artwork with the selected crop"><image href="${source.file}" width="${source.w}" height="${source.h}" /></svg>`;
  }
  const model={presets,sources,clamp,ratio,region,svg};root.CropReview=model;
  if(typeof module!=='undefined')module.exports=model;
})(typeof window==='undefined'?globalThis:window);
