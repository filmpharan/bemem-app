export type PopoverFrame={x:number;y:number;width:number;height:number};
export const PAGE_POPOVER={glyph:28,target:48,targetGap:4,edge:8} as const;
/** Both frames MUST be measured inside the SAME native window. No inset additions. */
export function pagePopoverGeometry(anchor:PopoverFrame,host:PopoverFrame,count:number){
 if(!Number.isInteger(count)||count<1||count>4||![...Object.values(anchor),...Object.values(host)].every(Number.isFinite)
   ||anchor.width<=0||anchor.height<=0||host.width<=0||host.height<=0)return null;
 const a={x:anchor.x-host.x,y:anchor.y-host.y,width:anchor.width,height:anchor.height};
 if(a.x<0||a.y<0||a.x+a.width>host.width||a.y+a.height>host.height)return null;
 const {glyph,target,edge,targetGap}=PAGE_POPOVER;
 if(host.width<target+2*edge)return null;
 const columns=1,width=target,height=count*target+(count-1)*targetGap;
 const left=Math.max(edge,Math.min(a.x+a.width/2-target/2,host.width-edge-width)),top=a.y+a.height+targetGap;
 if(top+height>host.height-edge)return null;
 return {left,top,width,height,columns,targetGap,visibleGap:(a.height-glyph)/2+targetGap+(target-glyph)/2,
   centerDistance:a.height/2+targetGap+target/2};
}
