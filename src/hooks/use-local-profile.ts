import {useEffect,useSyncExternalStore} from 'react';
import {deviceProfileStore} from '../lib/local-profile-native';
export function useLocalProfile(){
 const state=useSyncExternalStore(deviceProfileStore.subscribe,deviceProfileStore.getSnapshot,deviceProfileStore.getSnapshot);
 useEffect(()=>{void deviceProfileStore.load();},[]);
 return {...state,update:deviceProfileStore.update,reload:()=>deviceProfileStore.load(true)};
}
