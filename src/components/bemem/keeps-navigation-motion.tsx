import {useEffect,useLayoutEffect,useMemo,useRef,type ReactNode} from 'react';
import {AccessibilityInfo,Animated,Easing} from 'react-native';

type Destination='list'|'detail';
/** Visual completion never performs navigation or a business operation. */
export function createKeepsNavigationMotion(){
 const offset=new Animated.Value(0);let alive=true,epoch=0,reduced:boolean|null=null;
 function cancel(){++epoch;offset.stopAnimation();offset.setValue(0);}
 return{offset,isActive:()=>alive,mount(){alive=true;},cancel,
  enter(destination:Destination){
   if(!alive)return;cancel();if(reduced!==false)return;
   const ticket=epoch;offset.setValue(destination==='detail'?8:-8);
   Animated.timing(offset,{toValue:0,duration:destination==='detail'?160:140,easing:Easing.out(Easing.cubic),useNativeDriver:true,isInteraction:false}).start(()=>{
    if(alive&&ticket===epoch)offset.setValue(0);
   });
  },
  preference(value:boolean){reduced=value;if(alive&&value)cancel();},
  dispose(){alive=false;cancel();},
 };
}

/** One incoming content tree, inside the existing M3-A/native Modal boundary. */
export function useKeepsNavigationMotion(context:object,route:string,owner:string,available:boolean){
 const session=useMemo(()=>createKeepsNavigationMotion(),[context]);
 const branch=useMemo(()=>({}),[session,route,owner,available]),current=useRef(branch);current.current=branch;
 const pending=useRef<{session:typeof session;route:string;owner:string;destination:Destination}|null>(null);
 useLayoutEffect(()=>{session.mount();return()=>session.dispose();},[session]);
 useEffect(()=>{
  let active=true,eventSeen=false;
  const listener=AccessibilityInfo.addEventListener('reduceMotionChanged',value=>{eventSeen=true;if(active)session.preference(value);});
  void AccessibilityInfo.isReduceMotionEnabled().then(value=>{if(active&&!eventSeen)session.preference(value);},()=>{});
  return()=>{active=false;listener.remove();};
 },[session]);
 useLayoutEffect(()=>{
  const intent=pending.current;pending.current=null;session.cancel();
  if(available&&intent?.session===session&&intent.route===route&&intent.owner===owner)session.enter(intent.destination);
 },[session,route,owner,available]);
 return{
  prepare(targetRoute:string,destination:Destination){
   if(!session.isActive()||current.current!==branch)return false;
   pending.current={session,route:targetRoute,owner,destination};return true;
  },
  render:(children:ReactNode)=><Animated.View testID="keeps-incoming-content" style={{flex:1,transform:[{translateX:session.offset}]}}>{children}</Animated.View>,
 };
}
