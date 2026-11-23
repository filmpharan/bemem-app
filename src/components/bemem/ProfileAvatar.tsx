import {useEffect,useState} from 'react';
import {Image} from 'expo-image';
import {View} from 'react-native';
import {AccountIcon} from './AccountIcon';
import {profileAvatarUri} from '../../lib/local-profile-native';
export function ProfileAvatar({avatar,size=32}:{avatar:string|null;size?:number}){
 const [failed,setFailed]=useState(false);useEffect(()=>setFailed(false),[avatar]);
 return <View pointerEvents="none" accessible={false} style={{width:size,height:size,borderRadius:size/2,overflow:'hidden',alignItems:'center',justifyContent:'center'}}>
  {avatar&&!failed?<Image source={{uri:profileAvatarUri(avatar)}} style={{width:size,height:size}} contentFit="cover" onError={()=>setFailed(true)}/>:<AccountIcon size={size*.75}/>}
 </View>;
}
