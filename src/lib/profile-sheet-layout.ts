export type ProfileAnchor={x:number;y:number;width:number;height:number};
/** Coordinates are converted from the measured trigger into the measured overlay window. */
export function profileSheetLayout(anchor:ProfileAnchor,window:{x:number;y:number;width:number;height:number},insets:{top:number;bottom:number;left:number;right:number},contentHeight:number){
 const left=Math.max(insets.left+8,Math.min(anchor.x-window.x,window.width-insets.right-56));
 const top=Math.max(insets.top,Math.min(anchor.y-window.y,window.height-insets.bottom-96));
 const width=Math.max(48,Math.min(420,window.width-left-insets.right-12));
 const height=Math.max(48,Math.min(contentHeight,window.height-top-insets.bottom-64));
 return {left,top,width,height,originWidth:Math.min(anchor.width,width),originHeight:Math.min(anchor.height,height)};
}
