import { useMemo, useRef, useState } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';
import { lagoon } from '../../constants/lagoon-theme';
/** Dependency-free native adjustable control; gestures and accessibility share onChange. */
export function ArtworkSlider({label,value,min,max,step=.01,onChange}:{label:string;value:number;min:number;max:number;step?:number;onChange:(value:number)=>void}) {
  const [width,setWidth]=useState(160),latest=useRef({width,min,max,step,onChange,value});latest.current={width,min,max,step,onChange,value};
  const change=(x:number)=>{const p=latest.current;const v=p.min+Math.max(0,Math.min(1,(x-10)/Math.max(1,p.width-20)))*(p.max-p.min);p.onChange(Math.max(p.min,Math.min(p.max,Math.round(v/p.step)*p.step)));};
  const responder=useMemo(()=>PanResponder.create({onStartShouldSetPanResponder:()=>true,onMoveShouldSetPanResponder:()=>true,
    onPanResponderGrant:e=>change(e.nativeEvent.locationX),onPanResponderMove:e=>change(e.nativeEvent.locationX),onPanResponderTerminationRequest:()=>false}),[]);
  return <View accessible accessibilityRole="adjustable" accessibilityLabel={label}
    accessibilityValue={{min,max,now:Number(value.toFixed(3)),text:`${Math.round(value*100)} percent`}}
    accessibilityActions={[{name:'increment',label:'Increase'},{name:'decrement',label:'Decrease'}]}
    onAccessibilityAction={e=>{const p=latest.current;if(['increment','decrement'].includes(e.nativeEvent.actionName))p.onChange(Math.max(p.min,Math.min(p.max,p.value+(e.nativeEvent.actionName==='increment'?1:-1)*Math.max(p.step,(p.max-p.min)/20))));}}
    onLayout={e=>setWidth(e.nativeEvent.layout.width)} style={styles.target} {...responder.panHandlers}>
    <View pointerEvents="none" accessible={false} style={styles.track} />
    <View pointerEvents="none" accessible={false} style={[styles.thumb,{left:Math.max(0,(width-20)*(value-min)/(max-min))}]} />
  </View>;
}
const styles=StyleSheet.create({target:{minHeight:48,flex:1,justifyContent:'center',minWidth:64},track:{height:3,marginHorizontal:10,borderRadius:2,backgroundColor:'#b5c2ca'},
  thumb:{position:'absolute',width:20,height:20,borderRadius:10,backgroundColor:lagoon.action.primary,borderWidth:2,borderColor:'#ffffff'}});
