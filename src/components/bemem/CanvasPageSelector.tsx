import { useEffect,useRef,useState,type ComponentRef } from 'react';
import { Pressable,StyleSheet,View } from 'react-native';
import type { CanvasPage } from '../../lib/canvas-pages';
import { useCanvasPagePopover } from './CanvasPagePopoverHost';
import { CanvasPageGlyph } from './CanvasPageGlyph';

export function CanvasPageSelector({page,destinations,onSelect,disabled=false,compact=false,context='editor'}:{page:CanvasPage;destinations:readonly {page:CanvasPage;editable:boolean;preview:boolean;visible:boolean;editorDestination?:boolean}[];onSelect:(page:CanvasPage)=>void;disabled?:boolean;compact?:boolean;context?:'home'|'editor'}){
 const host=useCanvasPagePopover(),root=useRef<ComponentRef<typeof View>>(null),owner=useRef(Symbol('canvas-page-selector')),mounted=useRef(true);
 const [open,setOpen]=useState(false);
 const others=destinations.filter(p=>p.page!==page&&p.visible&&(context==='home'||p.editable&&!p.preview&&p.editorDestination!==false)).sort((a,b)=>a.page-b.page);
 const choices=others.map(item=>({page:item.page,label:`Canvas ${item.page}${context==='home'?item.preview?'. Locked preview':!item.editable?'. Read-only':'':item.editable?'':'. Locked for editing'}`}));
 const latest=useRef({page,disabled,choices,onSelect});latest.current={page,disabled,choices,onSelect};
 const signature=choices.map(c=>c.label).join('|');
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;host?.close(owner.current);};},[host]);
 useEffect(()=>{host?.close(owner.current);},[host,page,disabled,signature]);
 function show(){
  if(!host||!root.current||disabled||!choices.length)return;
  const initialPage=page,offered=choices.map(c=>c.page);
  host.open({owner:owner.current,anchor:root.current,choices,
   valid:()=>mounted.current&&!latest.current.disabled&&latest.current.page===initialPage&&offered.every(p=>latest.current.choices.some(c=>c.page===p)),
   expanded:value=>{if(mounted.current)setOpen(value);},
   select:next=>{if(!latest.current.disabled&&latest.current.choices.some(c=>c.page===next))latest.current.onSelect(next);},
  });
 }
 return <View ref={root} collapsable={false} style={compact?{width:'100%',maxWidth:48,height:48}:undefined}>
  <Pressable accessibilityRole="button" accessibilityLabel={`Canvas ${page}. ${choices.length?'Choose canvas':'Only available canvas'}`} accessibilityState={{expanded:open,disabled:disabled||!choices.length}} disabled={disabled||!choices.length} style={compact?[styles.target,{width:'100%',maxWidth:48}]:styles.target} onPress={show}>
   <View pointerEvents="none" style={disabled?{opacity:0.45}:undefined}><CanvasPageGlyph page={page}/></View>
  </Pressable>
 </View>;
}
const styles=StyleSheet.create({target:{width:48,height:48,alignItems:'center',justifyContent:'center'}});
