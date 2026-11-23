import {useEffect,useLayoutEffect,useMemo,useRef,type ReactElement,type ReactNode} from 'react';
import {AccessibilityInfo,Animated,type ViewProps} from 'react-native';
import {createKeepsNavigationMotion} from './keeps-navigation-motion';

export type KeepsContentMotion={renderContent:(content:ReactElement<ViewProps>,fill:boolean)=>ReactNode;onShow:()=>void};

/** Presentation intent survives the existing chooser/editor native-window replacement. */
export function useKeepsEditorMotion(context:object,route:string,owner:string){
 const session=useMemo(()=>createKeepsNavigationMotion(),[context]);
 const branch=useMemo(()=>({}),[session,route]),current=useRef(branch);current.current=branch;
 const latest=useRef({owner,route});latest.current={owner,route};
 const pending=useRef<{session:typeof session;route:string;owner:string;direction:'detail'|'list'}|null>(null);
 useLayoutEffect(()=>{session.mount();return()=>session.dispose();},[session]);
 useEffect(()=>{
  let active=true,eventSeen=false;
  const listener=AccessibilityInfo.addEventListener('reduceMotionChanged',value=>{eventSeen=true;if(active)session.preference(value);});
  void AccessibilityInfo.isReduceMotionEnabled().then(value=>{if(active&&!eventSeen)session.preference(value);},()=>{});
  return()=>{active=false;listener.remove();};
 },[session]);
 useLayoutEffect(()=>{
  session.cancel();const intent=pending.current;
  if(intent&&(intent.session!==session||intent.route!==route||intent.owner!==owner))pending.current=null;
 },[session,route,owner]);
 return{
  prepare(target:string,direction:'editor'|'chooser'){
   if(!session.isActive()||current.current!==branch)return false;
   // Use the approved incoming-only timing primitive, without changing M3-C's instance.
   pending.current={session,route:target,owner,direction:direction==='editor'?'detail':'list'};return true;
  },
  presentation:{
   renderContent:(content:ReactElement<ViewProps>,fill:boolean)=>{
    // Animate the existing host, without an extra layout container around the form.
    const Content=fill?Animated.View:Animated.ScrollView;
    return <Content {...content.props} testID="keeps-editor-incoming" style={[content.props.style,{transform:[{translateX:session.offset}]}]}/>;
   },
   onShow:()=>{
    if(!session.isActive()||current.current!==branch)return;
    const intent=pending.current;
    if(!intent||intent.session!==session||intent.route!==latest.current.route||intent.owner!==latest.current.owner)return;
    pending.current=null;session.enter(intent.direction);
   },
  } satisfies KeepsContentMotion,
 };
}
