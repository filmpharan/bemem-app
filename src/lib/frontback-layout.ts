import {CARD_SIZE_PRESETS} from './card-size-presets';
import {cardPaintSize} from './card-geometry';

/** Presentation only. One shared block scale keeps all nine footprints comparable. */
export function frontBackLayout(width:number,height:number,widthBlocks:number,heightBlocks:number,sides:1|2,labelHeight:number){
 const gap=12,labelGap=6,paint=cardPaintSize(widthBlocks,heightBlocks);
 if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)return {direction:'column' as 'row'|'column',unit:0,cardWidth:0,cardHeight:0,groupWidth:0,groupHeight:0,scroll:false,gap,labelGap};
 const sizes=CARD_SIZE_PRESETS.map(p=>({...cardPaintSize(p.ratioWidth,p.ratioHeight),portrait:p.ratioHeight>p.ratioWidth}));
 const landscape=sizes.filter(p=>!p.portrait),portrait=sizes.filter(p=>p.portrait);
 const widthCap=Math.max(0,Math.min(width/Math.max(...landscape.map(p=>p.width)),(width-gap)/(2*Math.max(...portrait.map(p=>p.width)))));
 const heightCap=Math.min((height-2*(labelHeight+labelGap)-gap)/(2*Math.max(...landscape.map(p=>p.height))),(height-labelHeight-labelGap)/Math.max(...portrait.map(p=>p.height)));
 // A short viewport scrolls rather than shrinking physical-card previews indefinitely.
 const unit=Math.min(widthCap,Math.max(width/12*.75,heightCap));
 const cardWidth=paint.width*unit,cardHeight=paint.height*unit;
 const group=(direction:'row'|'column')=>({direction,width:direction==='row'?sides*cardWidth+(sides-1)*gap:cardWidth,
  height:direction==='column'?sides*(cardHeight+labelHeight+labelGap)+(sides-1)*gap:cardHeight+labelHeight+labelGap});
 const preferred=group(heightBlocks>widthBlocks?'row':'column'),alternative=group(preferred.direction==='row'?'column':'row');
 const fits=(g:ReturnType<typeof group>)=>g.width<=width+1e-6&&g.height<=height+1e-6;
 const chosen=sides===1?group('column'):fits(preferred)?preferred:fits(alternative)?alternative:preferred;
 return {direction:chosen.direction,unit,cardWidth,cardHeight,groupWidth:chosen.width,groupHeight:chosen.height,scroll:chosen.height>height+1e-6,gap,labelGap};
}
