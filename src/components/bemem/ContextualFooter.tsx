import { useEffect,useImperativeHandle,useRef,useState,type Ref } from 'react';
import { AccessibilityInfo,Keyboard,Pressable,StyleSheet,Text,View } from 'react-native';
import { FooterItemVisual,CanvasSelectionPill,CanvasSelectorVisual,footerVisual,type FooterPressHandle } from './FooterMotion';
import type { FooterIconName } from './FooterIcon';
import { ciColors,ciTypography,ciStates } from '../../constants/ci-theme';
import type { CanvasPage } from '../../lib/canvas-pages';
import { footerCanvasChoices,type FooterAccess } from '../../lib/footer-navigation';

export type ContextualFooterHandle={dismiss:()=>boolean;toggle:()=>void};
type Props={mode:'Home'|'Create'|'Decorate';page:CanvasPage;destinations:readonly FooterAccess[];onPage:(page:CanvasPage)=>void;disabled?:boolean;actionsBlocked?:boolean;saving?:boolean;homeDisabled?:boolean;onHome?:()=>void;onCreate?:()=>void;onDecorate?:()=>void;onAdd?:()=>void;onCanvasRequest?:()=>void;onExpandedChange?:(expanded:boolean)=>void;ref?:Ref<ContextualFooterHandle>};
/** Five permanent icon-and-label positions. The same-window capsule reserves space above this row while visible. */
export function ContextualFooter(props:Props){
 const [footerWidth,setFooterWidth]=useState(360),[reduced,setReduced]=useState(true);
 const [selectorWidth,setSelectorWidth]=useState<number|null>(null),[settling,setSettling]=useState(false);
 const settleTimer=useRef<ReturnType<typeof setTimeout>|null>(null),settlingRef=useRef(false),settlementGeneration=useRef(0);
 function endSettlement(){settlementGeneration.current++;if(settleTimer.current)clearTimeout(settleTimer.current);settleTimer.current=null;if(settlingRef.current){settlingRef.current=false;setSettling(false);}}
 useEffect(()=>()=>{settlementGeneration.current++;if(settleTimer.current)clearTimeout(settleTimer.current);settleTimer.current=null;settlingRef.current=false;},[]);
 useEffect(()=>{if(reduced)endSettlement();},[reduced]);
 const motions=useRef<Partial<Record<FooterIconName,FooterPressHandle|null>>>({});
 useEffect(()=>{let alive=true,eventSeen=false;
  const listener=AccessibilityInfo.addEventListener('reduceMotionChanged',value=>{eventSeen=true;if(alive)setReduced(value);});
  void AccessibilityInfo.isReduceMotionEnabled().then(value=>{if(alive&&!eventSeen)setReduced(value);},()=>{});
  return()=>{alive=false;listener.remove();};
 },[]);
 const {mode,page,destinations}=props,disabled=!!props.disabled||!!props.saving;
 const [expanded,setExpanded]=useState(false),open=useRef(false),latest=useRef(props);latest.current=props;
 const choices=footerCanvasChoices(page,destinations,mode!=='Home');
 function show(value:boolean){open.current=value;setExpanded(value);latest.current.onExpandedChange?.(value);}
 function dismiss(){const visible=open.current||settlingRef.current;endSettlement();if(open.current)show(false);return visible;}
 function toggle(){if(latest.current.disabled||latest.current.saving||latest.current.actionsBlocked)return;endSettlement();if(!open.current)Keyboard.dismiss();show(!open.current);}
 useImperativeHandle(props.ref,()=>({dismiss,toggle}),[]);
 const signature=choices.map(c=>c.kind).join('|');
 useEffect(()=>{if(open.current)dismiss();},[page,mode,disabled,props.actionsBlocked,signature]);
 useEffect(()=>()=>{if(open.current)latest.current.onExpandedChange?.(false);},[]);
 function choose(destination:CanvasPage){
  const p=latest.current;if(p.disabled||p.saving||p.actionsBlocked||!open.current)return;
  const choice=footerCanvasChoices(p.page,p.destinations,p.mode!=='Home').find(c=>c.page===destination)!;
  if(choice.disabled)return;
  dismiss();
  if(choice.kind==='select'){
   // Logical popup closes immediately. A non-interactive 200ms tail lets the
   // confirmed page move the pill; a blocked request keeps the original page.
   if(!reduced){const generation=settlementGeneration.current;settlingRef.current=true;setSettling(true);settleTimer.current=setTimeout(()=>{if(generation!==settlementGeneration.current)return;settleTimer.current=null;if(settlingRef.current){settlingRef.current=false;setSettling(false);}},footerVisual.duration);}
   p.onPage(destination);
  }
 }
 function control(label:string,kind:'canvas'|'decorate'|'home'|'create'|'add'){
  const inactive=disabled||(kind!=='home'&&props.actionsBlocked)||(kind==='home'&&props.homeDisabled);
  const active=kind==='home'&&mode==='Home'||kind==='decorate'&&mode==='Decorate'||kind==='create'&&mode==='Create';
  return <Pressable accessibilityRole="button" accessibilityLabel={kind==='canvas'?`Canvas ${page}. Choose canvas`:label}
   accessibilityState={{disabled:!!inactive,selected:active,expanded:kind==='canvas'?expanded:undefined}} disabled={!!inactive}
   onPressIn={()=>motions.current[kind]?.press(true)} onPressOut={()=>motions.current[kind]?.press(false)}
   onPress={()=>{const p=latest.current;if(p.disabled||p.saving||kind!=='home'&&p.actionsBlocked)return;
    if(kind==='canvas'){if(p.onCanvasRequest)p.onCanvasRequest();else toggle();return;}
    if(kind==='home'){if(!p.homeDisabled){dismiss();p.onHome?.();}return;}
    dismiss();if(kind==='decorate')p.onDecorate?.();else if(kind==='create')p.onCreate?.();else p.onAdd?.();
   }} style={({pressed})=>[styles.target,{opacity:inactive?ciStates.headerDisabled:pressed?ciStates.headerPressed:1}]}>
   <FooterItemVisual name={kind} label={label} active={active} disabled={!!inactive} reduced={reduced} width={Math.max(1,footerWidth/5-2)} ref={value=>{motions.current[kind]=value;}}/>
  </Pressable>;
 }
 const slots=[control('Decorate','decorate'),control('Arrange','create'),control('Home','home'),control(`Canvas ${page}`,'canvas'),control('Add Card','add')];
 return <View accessibilityLabel={`${mode} footer${expanded?'. Canvas selector':''}`} style={styles.host}>
  {(expanded||settling)&&<CanvasSelectorVisual reduced={reduced} accessibilityLabel="Canvas page choices" pointerEvents={expanded?'auto':'none'} accessibilityElementsHidden={!expanded} importantForAccessibility={expanded?'auto':'no-hide-descendants'} style={styles.popover}>
   <View testID="canvas-segment-track" onLayout={event=>{const width=event.nativeEvent.layout.width;setSelectorWidth(previous=>previous===width?previous:width);}} style={styles.track}>
    <CanvasSelectionPill page={page} width={selectorWidth??Math.max(0,footerWidth-26)} reduced={reduced}/>
    {choices.map(choice=><View key={choice.page} style={styles.slot}>
     {choice.page<5&&choice.page!==page&&choice.page+1!==page&&<View pointerEvents="none" style={styles.separator}/>}
     <Pressable accessibilityRole="button" accessibilityLabel={`Canvas ${choice.page}`} accessibilityState={{selected:choice.page===page,disabled:disabled||!!props.actionsBlocked||choice.disabled}} disabled={!expanded||disabled||props.actionsBlocked||choice.disabled} onPress={()=>choose(choice.page)}
      style={[styles.target,styles.pageTarget,{opacity:disabled||props.actionsBlocked||choice.disabled?ciStates.headerDisabled:1}]}>
      <Text style={[styles.number,choice.page===page&&styles.selectedNumber]}>{choice.page}</Text>
     </Pressable></View>)}
   </View>
  </CanvasSelectorVisual>}
  <View accessibilityLabel="Main navigation" onLayout={event=>setFooterWidth(event.nativeEvent.layout.width)} style={styles.footer}>{slots.map((item,index)=><View key={index} style={styles.slot} accessible={item?undefined:false}>{item??undefined}</View>)}</View>
 </View>;
}
const styles=StyleSheet.create({
 host:{width:'100%',flexShrink:0,zIndex:20},
 footer:{width:'100%',flexDirection:'row',flexShrink:0,minHeight:56,paddingVertical:4,backgroundColor:ciColors.surface.canvas,borderTopLeftRadius:20,borderTopRightRadius:20,borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:'#cbd3d7'},
 slot:{width:'20%',alignItems:'center',justifyContent:'center'},target:{width:'100%',minHeight:48,alignItems:'center',justifyContent:'center',paddingHorizontal:0},
 pageTarget:{minHeight:48,paddingVertical:8},number:{...ciTypography.section,color:ciColors.text.primary,textAlign:'center'},selectedNumber:{fontWeight:'800'},
 track:{flexDirection:'row',position:'relative'},separator:{position:'absolute',right:0,top:12,bottom:12,width:1,backgroundColor:'#CDE6E0'},
 popover:{marginHorizontal:8,marginBottom:6,padding:4,borderRadius:999,backgroundColor:'#E8F7F3F2',borderWidth:1,borderColor:'#C9E3DE',boxShadow:'0 3px 12px #16584D18'},
});
