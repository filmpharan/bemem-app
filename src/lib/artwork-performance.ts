type Phase='asset-resolution'|'file-preparation'|'preview-visible';
export const artworkClock=()=>globalThis.performance?.now()??Date.now();
type PhotoStage='admitted'|'permission_returned'|'picker_requested'|'picker_returned'|'cancelled'|'retain_started'|'retain_finished'|'crop_visible'|'crop_confirmed'|'crop_cancelled'|'editor_visible'|'failed'|'editor_closed';
type Sample={stage:PhotoStage;elapsedMs:number;width?:number;height?:number;byteLength?:number};
type Trace={source:'camera'|'library';start:number;samples:Sample[]};
const traces:Trace[]=[],bindings=new Map<string,Trace>(),timings:{phase:Phase;durationMs:number}[]=[];
const dev=()=>typeof __DEV__!=='undefined'&&__DEV__;
export function beginPhotoTrace(source:Trace['source']){
 const trace:Trace={source,start:artworkClock(),samples:[]};
 if(dev()){traces.push(trace);if(traces.length>8){const expired=traces.shift();for(const [id,value]of bindings)if(value===expired)bindings.delete(id);}}
 const mark=(stage:PhotoStage,metadata?:{width?:number;height?:number;byteLength?:number})=>{if(dev()&&trace.samples.length<24)trace.samples.push({stage,elapsedMs:Math.round((artworkClock()-trace.start)*100)/100,...metadata});};
 mark('admitted');
 return{mark,bind(assetId:string){if(dev())bindings.set(assetId,trace);},close(){mark('editor_closed');for(const [id,value]of bindings)if(value===trace)bindings.delete(id);}};
}
export function photoDisplayVisible(assetId:string,stage:'crop_visible'|'editor_visible'){
 if(!dev())return;const trace=bindings.get(assetId);if(!trace||trace.samples.some(s=>s.stage===stage))return;
 trace.samples.push({stage,elapsedMs:Math.round((artworkClock()-trace.start)*100)/100});
}
/** Read in React Native DevTools: globalThis.bememPhotoDiagnostics(). Never emits photos, URIs or card text. */
export function photoDiagnostics(){return{notice:'JS admission/picker round-trip includes user interaction. Native camera launch/confirmation and native memory are not measured.',
 traces:traces.map(t=>({source:t.source,samples:t.samples.map(s=>({...s}))})),timings:timings.map(t=>({...t}))};}
if(dev())(globalThis as typeof globalThis&{bememPhotoDiagnostics?:typeof photoDiagnostics}).bememPhotoDiagnostics=photoDiagnostics;
/** Developer-only bounded numeric measurements; no console/network logging or asset identifiers. */
export function artworkTiming(phase:Phase,start:number){
  if(dev()){timings.push({phase,durationMs:Math.round((artworkClock()-start)*100)/100});if(timings.length>20)timings.shift();}
}
