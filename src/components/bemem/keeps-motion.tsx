import {useEffect,useMemo,useRef,useState,type ReactElement,type ReactNode} from 'react';
import {AccessibilityInfo,Animated,Easing,StyleSheet,type ViewProps} from 'react-native';
import {sheetVisual} from '../../constants/sheet-visual';

type Surface='sheet'|'page';
/** Opt-in presentation only. The existing sheet owns keyboard, guards and native window. */
export type KeepsSheetMotion={renderSheet:(element:ReactElement<ViewProps>)=>ReactNode;scrim:ReactNode;onShow:()=>void};

export function createKeepsOuterMotion(onClosed:()=>void,onClosing:(value:boolean)=>void){
 const identity={},progress=new Animated.Value(1);
 let alive=true,shown=false,reduced:boolean|null=null,epoch=0,phase:'open'|'opening'|'closing'|'closed'='open',admitted=()=>true;
 function complete(){
  if(!alive||phase!=='closing')return;
  if(!admitted()){phase='open';progress.setValue(1);onClosing(false);return;}
  phase='closed';onClosed();
 }
 function run(to:number,duration:number,easing:(value:number)=>number){
  const ticket=++epoch;
  progress.stopAnimation(value=>{
   if(!alive||ticket!==epoch)return;
   progress.setValue(value);
   Animated.timing(progress,{toValue:to,duration,easing,useNativeDriver:true,isInteraction:false}).start(({finished})=>{
    if(!alive||ticket!==epoch)return;
    if(!finished){phase='open';progress.setValue(1);onClosing(false);return;}
    if(to===0)complete();else phase='open';
   });
  });
 }
 return{identity,progress,isClosing:()=>phase==='closing'||phase==='closed',
  mount(){alive=true;},
  show(surface:Surface){
   if(!alive||shown||phase==='closing'||phase==='closed')return;
   shown=true;
   // Unknown accessibility preference never delays a native window or replays entry later.
   if(reduced!==false){progress.setValue(1);return;}
   phase='opening';progress.setValue(0);run(1,surface==='sheet'?220:200,Easing.out(Easing.cubic));
  },
  settle(){
   if(!alive||phase==='closed')return;
   shown=true;++epoch;progress.stopAnimation();progress.setValue(1);
   const wasClosing=phase==='closing';phase='open';if(wasClosing)onClosing(false);
  },
  close(surface:Surface,valid:()=>boolean){
   if(!alive||phase==='closing'||phase==='closed'||!valid())return;
   shown=true;admitted=valid;phase='closing';onClosing(true);
   if(reduced!==false){++epoch;progress.stopAnimation();progress.setValue(0);complete();}
   else run(0,surface==='sheet'?180:160,Easing.inOut(Easing.cubic));
  },
  preference(value:boolean){
   reduced=value;if(!value||!alive||phase==='closed')return;
   ++epoch;progress.stopAnimation();progress.setValue(phase==='closing'?0:1);
   if(phase==='closing')complete();else phase='open';
  },
  dispose(){alive=false;++epoch;progress.stopAnimation();},
 };
}

/** Survives child Modal replacement without retaining a second editor or its media. */
export function useKeepsOuterMotion(context:object,route:string,onClose:()=>void){
 const latest=useRef({context,onClose});latest.current={context,onClose};
 const [closing,setClosing]=useState<object|null>(null);
 const session=useMemo(()=>{
  const value=createKeepsOuterMotion(()=>{if(latest.current.context===context)latest.current.onClose();},state=>{
   if(latest.current.context===context)setClosing(state?value.identity:null);
  });return value;
 },[context]);
 const branch=useMemo(()=>({}),[session,route]),currentBranch=useRef(branch);currentBranch.current=branch;
 const previous=useRef({session,branch});
 useEffect(()=>{
  session.mount();let active=true,eventSeen=false;
  const subscription=AccessibilityInfo.addEventListener('reduceMotionChanged',value=>{eventSeen=true;if(active)session.preference(value);});
  void AccessibilityInfo.isReduceMotionEnabled().then(value=>{if(active&&!eventSeen)session.preference(value);},()=>{});
  return()=>{active=false;subscription.remove();session.dispose();};
 },[session]);
 useEffect(()=>{
  if(previous.current.session===session&&previous.current.branch!==branch)session.settle();
  previous.current={session,branch};
 },[session,branch]);
 const render=(element:ReactElement<ViewProps>,distance:number)=><Animated.View {...element.props}
  pointerEvents={closing===session.identity?'none':element.props.pointerEvents}
  accessibilityElementsHidden={closing===session.identity||element.props.accessibilityElementsHidden}
  importantForAccessibility={closing===session.identity?'no-hide-descendants':element.props.importantForAccessibility}
  style={[element.props.style,{transform:[{translateY:session.progress.interpolate({inputRange:[0,1],outputRange:[distance,0]})}]}]}/>;
 const show=(surface:Surface)=>{if(currentBranch.current===branch&&latest.current.context===context)session.show(surface);};
 return{isClosing:session.isClosing,close:(surface:Surface,valid:()=>boolean)=>{
   if(currentBranch.current!==branch||latest.current.context!==context)return;
   session.close(surface,()=>currentBranch.current===branch&&latest.current.context===context&&valid());
  },
  sheet:{renderSheet:(element:ReactElement<ViewProps>)=>render(element,16),
   scrim:<Animated.View accessible={false} pointerEvents="none" testID="keeps-motion-scrim" style={[StyleSheet.absoluteFill,{backgroundColor:sheetVisual.scrim,opacity:session.progress}]}/>,
   onShow:()=>show('sheet')} satisfies KeepsSheetMotion,
  renderPage:(element:ReactElement<ViewProps>)=>render(element,12),onPageShow:()=>show('page'),
 };
}
