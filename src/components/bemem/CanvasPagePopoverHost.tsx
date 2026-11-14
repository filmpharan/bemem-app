import { createContext,useContext,useEffect,useImperativeHandle,useMemo,useRef,useState,type ComponentRef,type ReactNode,type Ref } from 'react';
import { BackHandler,Pressable,StyleSheet,View } from 'react-native';
import { CanvasPageGlyph } from './CanvasPageGlyph';
import { PAGE_POPOVER,pagePopoverGeometry,type PopoverFrame } from '../../lib/page-popover-geometry';
import type { CanvasPage } from '../../lib/canvas-pages';

type Choice={page:CanvasPage;label:string};
type Request={owner:symbol;anchor:ComponentRef<typeof View>;choices:Choice[];valid:()=>boolean;select:(page:CanvasPage)=>void;expanded:(value:boolean)=>void};
type Placement=NonNullable<ReturnType<typeof pagePopoverGeometry>>;
type HostApi={open:(request:Request)=>void;close:(owner:symbol)=>void};
export type CanvasPagePopoverHandle={dismiss:()=>boolean};
const Context=createContext<HostApi|null>(null);
export const useCanvasPagePopover=()=>useContext(Context);

/** A local overlay in its parent's native window, inside the existing SafeArea.
 * One host in Main, and one in each Decorate Modal. Never creates another window. */
export function CanvasPagePopoverHost({children,ref}:{children:ReactNode;ref?:Ref<CanvasPagePopoverHandle>}){
 const root=useRef<ComponentRef<typeof View>>(null),active=useRef<Request|null>(null),pending=useRef<Request|null>(null),sequence=useRef(0),mounted=useRef(true);
 const [menu,setMenu]=useState<{request:Request;placement:Placement;token:number}|null>(null);
 function dismiss(owner?:symbol){const request=active.current??pending.current;
  if(!request||owner&&request.owner!==owner)return false;
  sequence.current++;active.current=null;pending.current=null;setMenu(null);request.expanded(false);return true;
 }
 function open(request:Request){
  dismiss();if(!root.current||!request.anchor||!request.valid())return;
  const token=++sequence.current;pending.current=request;
  request.anchor.measureInWindow((x,y,width,height)=>{
   if(!mounted.current||token!==sequence.current||!request.valid())return;
   const anchor:PopoverFrame={x,y,width,height};
   root.current?.measureInWindow((hx,hy,hw,hh)=>{
    if(!mounted.current||token!==sequence.current||!request.valid())return;
    const placement=pagePopoverGeometry(anchor,{x:hx,y:hy,width:hw,height:hh},request.choices.length);
    if(!placement){dismiss(request.owner);return;}
    pending.current=null;active.current=request;setMenu({request,placement,token});request.expanded(true);
   });
  });
 }
 const api=useMemo<HostApi>(()=>({open,close:owner=>{dismiss(owner);}}),[]);
 useImperativeHandle(ref,()=>({dismiss:()=>dismiss()}),[]);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;sequence.current++;active.current=null;pending.current=null;};},[]);
 useEffect(()=>{if(!menu)return;const subscription=BackHandler.addEventListener('hardwareBackPress',()=>dismiss());return()=>subscription.remove();},[!!menu]);
 function select(page:CanvasPage,token:number){const request=active.current;
  if(!request||token!==sequence.current||!request.valid()||!request.choices.some(c=>c.page===page))return;
  // Consume synchronously, before calling navigation: stale/double taps cannot repeat it.
  dismiss(request.owner);request.select(page);
 }
 return <Context.Provider value={api}><View ref={root} collapsable={false} style={styles.host} onLayout={()=>{dismiss();}}>
  <View style={styles.host} accessibilityElementsHidden={!!menu} importantForAccessibility={menu?'no-hide-descendants':'auto'}>{children}</View>
  {menu&&<View accessibilityViewIsModal style={StyleSheet.absoluteFill}>
   <Pressable accessibilityRole="button" accessibilityLabel="Close canvas selector" style={StyleSheet.absoluteFill} onPress={()=>{dismiss();}}/>
   <View style={{position:'absolute',left:menu.placement.left,top:menu.placement.top,width:menu.placement.width,height:menu.placement.height}}>
    {menu.request.choices.map((choice,index)=><Pressable key={choice.page} accessibilityRole="button" accessibilityLabel={choice.label}
      onPress={()=>select(choice.page,menu.token)} style={[styles.target,{left:0,top:index*(PAGE_POPOVER.target+PAGE_POPOVER.targetGap)}]}>
      <CanvasPageGlyph page={choice.page}/>
    </Pressable>)}
   </View>
  </View>}
 </View></Context.Provider>;
}
const styles=StyleSheet.create({host:{flex:1},target:{position:'absolute',width:48,height:48,alignItems:'center',justifyContent:'center'}});
