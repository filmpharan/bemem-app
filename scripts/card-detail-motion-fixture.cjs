// Controllable native-driver model. No timers, native UI, filesystem writes or device data.
exports.createAnimationMock=function(){
 const animations=[],reads=[];let deferReads=false;
 class Value{constructor(value){this.value=value;this.animation=null;}setValue(value){this.value=value;}interpolate(config){return{input:this,config};}
  stopAnimation(callback){if(this.animation){const old=this.animation;this.animation=null;old.callback?.({finished:false});}if(callback){const current=this.value;if(deferReads)reads.push(()=>callback(current));else callback(current);}}
 }
 const Animated={Value,View:'Animated.View',timing(value,config){const item={value,config,callback:null};return{start(callback){item.callback=callback;value.animation=item;animations.push(item);},stop(){value.stopAnimation();}};}};
 const cubic=value=>value*value*value;const Easing={cubic,out:fn=>value=>1-fn(1-value),inOut:fn=>value=>value<.5?fn(value*2)/2:1-fn((1-value)*2)/2};
 return{native:{Animated,Easing},animations,reads,deferReads(value){deferReads=value;},finish(item=animations.at(-1),finished=true){if(finished)item.value.value=item.config.toValue;if(item.value.animation===item)item.value.animation=null;item.callback?.({finished});}};
};
