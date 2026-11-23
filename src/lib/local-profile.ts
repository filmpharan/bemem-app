export type LocalProfile={name:string;avatar:string|null};
export type ProfileIdentity={status:'authenticated';email:string;premiumEntitled:boolean}|null;
export const DEFAULT_PROFILE:LocalProfile={name:'My profile',avatar:null};
export function profileName(value:string){
 const name=value.trim();
 if(!name||Array.from(name).length>60)throw Error('Enter a name between 1 and 60 characters.');
 return name;
}
export function validateLocalProfile(value:unknown):LocalProfile{
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Profile settings are invalid.');
 const v=value as Record<string,unknown>;
 if(Object.keys(v).some(k=>k!=='name'&&k!=='avatar')||typeof v.name!=='string'||profileName(v.name)!==v.name||!(v.avatar===null||typeof v.avatar==='string'&&/^avatar-[a-zA-Z0-9-]+\.(jpg|png|webp)$/.test(v.avatar)))throw Error('Profile settings are invalid.');
 return {name:v.name,avatar:v.avatar as string|null};
}
export type ProfileIO={read:()=>Promise<LocalProfile|null>;write:(value:LocalProfile)=>Promise<void>;avatarExists:(id:string)=>boolean};
/** One controlled presentation-settings store, independent of the Wallet owner/writer. */
export function createLocalProfileStore(io:ProfileIO){
 let state={profile:{...DEFAULT_PROFILE},ready:false,busy:false,error:''},loading:Promise<void>|null=null;
 const listeners=new Set<()=>void>();
 const publish=(next:typeof state)=>{state=next;listeners.forEach(fn=>fn());};
 async function load(refresh=false){
  if(loading)return loading;if(state.busy||state.ready&&!refresh)return;
  loading=(async()=>{try{const raw=await io.read(),profile=raw?validateLocalProfile(raw):{...DEFAULT_PROFILE};
   if(profile.avatar&&!io.avatarExists(profile.avatar))profile.avatar=null;
   publish({profile,ready:true,busy:false,error:''});
  }catch{publish({...state,ready:true,error:'Profile settings could not be read. Reopen Profile to try again.'});}})().finally(()=>{loading=null;});
  return loading;
 }
 return {getSnapshot:()=>state,subscribe(fn:()=>void){listeners.add(fn);return()=>{listeners.delete(fn);};},load,
  async update(change:Partial<LocalProfile>){
   if(state.busy)throw Error('A profile change is already being saved.');
   await load();if(state.busy)throw Error('A profile change is already being saved.');
   if(state.error)throw Error('Reopen Profile to check your saved settings before editing.');
   const profile=validateLocalProfile({...state.profile,...change,name:change.name===undefined?state.profile.name:profileName(change.name)});
   if(profile.avatar&&!io.avatarExists(profile.avatar))throw Error('The selected photo is unavailable.');
   publish({...state,busy:true,error:''});
   try{await io.write(profile);publish({profile,ready:true,busy:false,error:''});}
   catch{publish({...state,busy:false,error:'Saving was not confirmed. Reopen Profile to check your saved settings.'});throw Error('Saving was not confirmed. Reopen Profile to check your saved settings.');}
  },
 };
}
