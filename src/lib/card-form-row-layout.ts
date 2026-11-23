/** Base text widths include AddCardText's 4dp glyph allowance. No date-specific width constants. */
export function cardFormRowLayout(width:number,expTextWidth:number,cardTextWidth:number,backTextWidth:number,fontScale=1){
 const available=Math.max(1,width),gap=8,expPadding=6,expBorder=1,segmentPadding=4,segmentBorder=1,optionPadding=6;
 const expRaw=Math.max(1,expTextWidth-4),modeRaw=Math.max(1,Math.max(cardTextWidth,backTextWidth)-4),requested=Math.min(fontScale,1.3);
 const sizes=(scale:number)=>({exp:Math.max(48,Math.ceil(expRaw*scale+6)+2*(expPadding+expBorder)),
  option:Math.max(48,Math.ceil(modeRaw*scale+6)+2*optionPadding)});
 const required=(scale:number)=>{const s=sizes(scale);return s.exp+gap+2*s.option+2*(segmentPadding+segmentBorder);};
 let scale=requested;
 // On ordinary font settings, use spare padding/font capacity before falling back.
 if(required(scale)>available&&fontScale<=1.3){
  const chrome=6+2*(expPadding+expBorder)+gap+2*(6+2*optionPadding)+2*(segmentPadding+segmentBorder);
  const fit=Math.min(scale,(available-chrome-4)/(expRaw+2*modeRaw));
  if(fit>=1&&required(fit)<=available)scale=fit;
 }
 const stacked=required(scale)>available,s=sizes(scale),expWidth=Math.min(available,s.exp);
 const segmentWidth=stacked?available:available-expWidth-gap,unit=Math.max(0,(segmentWidth-2*(segmentPadding+segmentBorder))/2);
 const expContentWidth=Math.max(1,expWidth-2*(expPadding+expBorder)),optionContentWidth=Math.max(1,unit-2*optionPadding);
 // Small/large-font fallback preserves full text and allows EXP to grow vertically, never ellipsize.
 const modeFontScale=stacked?Math.min(requested,(optionContentWidth-6)/modeRaw):scale;
 return {expWidth,expContentWidth,stacked,viewportWidth:segmentWidth,segmentWidth,unit,optionContentWidth,
  expFontScale:scale,modeFontScale:Math.max(.1,modeFontScale),gap,expPadding,expBorder,segmentPadding,segmentBorder,optionPadding};
}
