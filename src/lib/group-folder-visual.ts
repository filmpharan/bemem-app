import { folderPreviewRegions } from './group-folder';
import type { Orientation } from '../types/wallet-ui';

/** Presentation only. Never changes the folder's logical footprint or member order. */
export function folderVisualLayout(width:number,height:number,orientation:Orientation,count:number,fontScale=1){
  const partitions=folderPreviewRegions(orientation,count);
  const columns=new Set(partitions.map(p=>p.left)).size,rows=new Set(partitions.map(p=>p.top)).size;
  const gap=Math.min(4,Math.min(width,height)*.04);
  const titleBottom=height*.07,titleHeight=32*Math.min(1.3,Math.max(1,fontScale));
  const left=width*.07,top=height*(orientation==='portrait'?.18:.24);
  const wellWidth=width-left*2,wellHeight=Math.max(0,height-top-Math.max(height*.24,titleBottom+titleHeight+gap));
  const cellWidth=Math.max(0,(wellWidth-gap*(columns-1))/columns),cellHeight=Math.max(0,(wellHeight-gap*(rows-1))/rows);
  const cells=partitions.map(p=>({left:p.left*columns*(cellWidth+gap),top:p.top*rows*(cellHeight+gap),width:cellWidth,height:cellHeight}));
  return {gap,well:{left,top,width:wellWidth,height:wellHeight},cells,titleBottom,titleHeight};
}
