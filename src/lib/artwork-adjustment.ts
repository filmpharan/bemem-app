import type { CardArtwork } from '../types/membership-card';
import { artworkFrame } from './card-artwork';
type Crop = CardArtwork['crop'];
type Image = Pick<CardArtwork,'width'|'height'>;
export type ArtworkPoint = { x:number; y:number };
export const cropClamp = (value:number,min=0,max=1) => Math.max(min,Math.min(max,value));
/** Region in upright decoded source pixels; same cover model as the actual image renderer. */
export function artworkRegion(image:Image,crop:Crop,width:number,height:number) {
  const frame=artworkFrame({...image,crop},width,height),scale=frame.width/image.width;
  return { x:-frame.left/scale,y:-frame.top/scale,width:width/scale,height:height/scale };
}
export function panArtwork(image:Image,crop:Crop,width:number,height:number,dx:number,dy:number):Crop {
  const frame=artworkFrame({...image,crop},width,height);
  return {...crop,x:frame.width-width>1e-8?cropClamp(crop.x-dx/(frame.width-width)):crop.x,
    y:frame.height-height>1e-8?cropClamp(crop.y-dy/(frame.height-height)):crop.y};
}
/** Zoom anchored under the fingers (or viewport center for slider/+/-), then constrain to cover. */
export function zoomArtwork(image:Image,crop:Crop,width:number,height:number,zoom:number,
  anchor:ArtworkPoint={x:width/2,y:height/2},destination=anchor):Crop {
  const before=artworkRegion(image,crop,width,height),z=cropClamp(zoom,1,3),after=artworkRegion(image,{...crop,zoom:z},width,height);
  const sourceX=before.x+anchor.x/width*before.width,sourceY=before.y+anchor.y/height*before.height;
  return {zoom:z,x:image.width-after.width>1e-8?cropClamp((sourceX-destination.x/width*after.width)/(image.width-after.width)):.5,
    y:image.height-after.height>1e-8?cropClamp((sourceY-destination.y/height*after.height)/(image.height-after.height)):.5};
}
/** Rebase whenever the number of fingers changes; no drag-to-pinch jump. */
export function createArtworkGesture(image:Image,width:number,height:number,read:()=>Crop,write:(crop:Crop)=>void) {
  let start:Crop=read(),points:ArtworkPoint[]=[];
  const center=(p:ArtworkPoint[])=>({x:(p[0].x+p[1].x)/2,y:(p[0].y+p[1].y)/2});
  const distance=(p:ArtworkPoint[])=>Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);
  function begin(next:ArtworkPoint[]){start={...read()};points=next.slice(0,2).map(p=>({...p}));}
  return {begin,end(){points=[];},move(next:ArtworkPoint[]){next=next.slice(0,2);if(!next.length)return;
    if(next.length!==points.length){begin(next);return;}
    if(next.length===1)write(panArtwork(image,start,width,height,next[0].x-points[0].x,next[0].y-points[0].y));
    else write(zoomArtwork(image,start,width,height,start.zoom*distance(next)/Math.max(1,distance(points)),center(points),center(next)));
  }};
}
