export type ShareControlWidths={front?:number;cardTitle?:number;memberShort?:number;memberFull?:number;barcode?:number};
/** Presentation only. Includes glyph bearings, icon widths and the segment's8dp chrome. */
export function sharePresentationLayout(width:number,viewportHeight:number,fontScale=1,measured:ShareControlWidths={},measuredHeight?:number){
 const gap=4,scale=Math.max(1,fontScale),usable=Math.max(1,width-2);
 const card=Math.max(48,24+(measured.front??36*scale),22+(measured.cardTitle??36*scale));
 const shortInfo=Math.max(48,24+(measured.memberShort??68*scale));
 const fullInfo=24+(measured.memberFull??124*scale);
 const segmentWidth=8+3*Math.max(48,8+(measured.barcode??48*scale));
 const mode=card+shortInfo+segmentWidth+gap*2<=usable?'three':card+shortInfo+gap<=usable?'two':'stacked';
 const widths=mode==='three'?{card,info:usable-card-segmentWidth-gap*2,code:segmentWidth}:mode==='two'?{card:Math.min(Math.max(card,(usable-gap)*.3),usable-gap-shortInfo),info:0,code:usable}:{card:usable,info:usable,code:usable};
 if(mode==='two')widths.info=usable-widths.card-gap;
 const row=Math.max(48,18*scale+8),heading=22*scale+12;
 const controlsHeight=mode==='three'?heading+row*3:mode==='two'?heading*2+row*5+8:heading*3+row*7+16;
 // Native viewport already excludes Header, Footer and Safe Area. Only the actual
 // controls, one10dp group gap and shared20dp content padding remain to subtract.
 const previewHeight=Math.max(140,Math.floor(viewportHeight-(measuredHeight??controlsHeight)-30));
 return {mode,widths,gap,segmentWidth,memberLabel:widths.info>=fullInfo?'Membership Number':'Member No.',previewHeight};
}
