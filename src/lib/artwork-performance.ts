type Phase='asset-resolution'|'file-preparation'|'preview-visible';
export const artworkClock=()=>globalThis.performance?.now()??Date.now();
/** Developer-only numeric measurements. Never log identifiers, paths, names or payloads. */
export function artworkTiming(phase:Phase,start:number){
  if(typeof __DEV__!=='undefined'&&__DEV__)console.debug('[bemem artwork]',{phase,durationMs:Math.round((artworkClock()-start)*100)/100});
}
