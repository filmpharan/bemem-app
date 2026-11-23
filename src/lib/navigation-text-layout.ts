/** Header geometry only; input widths include native glyph-bearing clearance. */
export function navigationTextLayout(width:number,fontScale:number,cancel:number,save:number,wordmark:number){
 const available=Math.max(1,width-24),scale=Math.max(1,fontScale);
 const cancelWidth=Math.max(48,Math.ceil(cancel+8)),saveWidth=Math.max(48,Math.ceil(save+8));
 const groupWidth=cancelWidth+saveWidth+4,sideWidth=groupWidth+12;
 const stacked=width<sideWidth*2+wordmark+16;
 const vertical=groupWidth>available;
 const actionHeight=Math.max(48,Math.ceil(22*scale)+8);
 return {stacked,vertical,sideWidth,groupWidth:Math.min(available,groupWidth),cancelWidth:Math.min(available,cancelWidth),saveWidth:Math.min(available,saveWidth),actionHeight,
  height:stacked?48+actionHeight*(vertical?2:1)+(vertical?4:0):Math.max(48,actionHeight),brandWidth:stacked?width*.44:Math.max(1,width-sideWidth*2)};
}
