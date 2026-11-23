import {Directory,File,Paths} from 'expo-file-system';
import {uuid} from 'expo';
import * as ImagePicker from 'expo-image-picker';
import {createLocalProfileStore,validateLocalProfile,type LocalProfile} from './local-profile';

const directory=()=>new Directory(Paths.document,'bemem-profile');
const file=(id:string)=>new File(directory(),id);
const records=()=>directory().exists?directory().list().filter((f):f is File=>f instanceof File&&/^profile-\d{10}\.json$/.test(f.name)).sort((a,b)=>a.name.localeCompare(b.name)):[];
export const profileAvatarUri=(id:string)=>{
 if(!/^avatar-[a-zA-Z0-9-]+\.(jpg|png|webp)$/.test(id))throw Error('Invalid profile photo.');
 return file(id).uri;
};
/** Immutable local settings revisions: no Wallet/card directories, no network, no automatic cleanup. */
export const deviceProfileStore=createLocalProfileStore({
 async read(){const latest=records().at(-1);return latest?validateLocalProfile(JSON.parse(await latest.text())):null;},
 avatarExists:id=>new File(profileAvatarUri(id)).exists,
 async write(profile:LocalProfile){
  directory().create({idempotent:true,overwrite:false});
  const revision=Number(records().at(-1)?.name.slice(8,18)??0)+1;
  const pending=file(`pending-${uuid.v4()}.tmp`),committed=file(`profile-${String(revision).padStart(10,'0')}.json`),raw=JSON.stringify(profile);
  await pending.write(raw);
  if(JSON.stringify(validateLocalProfile(JSON.parse(await pending.text())))!==raw)throw Error('Profile readback failed.');
  await pending.move(committed,{overwrite:false});
  if(JSON.stringify(validateLocalProfile(JSON.parse(await committed.text())))!==raw)throw Error('Profile readback failed.');
 },
});
export async function chooseProfilePhoto(camera:boolean):Promise<string|null>{
 if(camera&&!(await ImagePicker.requestCameraPermissionsAsync()).granted)throw Error('Allow camera access in system settings, or choose a photo from Gallery.');
 const options:ImagePicker.ImagePickerOptions={mediaTypes:['images'],allowsEditing:true,aspect:[1,1],quality:0.75,preferredAssetRepresentationMode:ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible};
 const result=camera?await ImagePicker.launchCameraAsync(options):await ImagePicker.launchImageLibraryAsync(options);
 if(result.canceled)return null;
 const asset=result.assets?.[0];if(!asset||!asset.width||!asset.height)throw Error('Choose a readable photo.');
 const source=new File(asset.uri),info=source.info({md5:true});
 if(!info.exists||!info.size||info.size>10*1024*1024||!info.md5)throw Error('Choose a readable photo smaller than 10 MB.');
 const type=asset.mimeType??source.type;
 const extension=type==='image/png'?'png':type==='image/webp'?'webp':type==='image/jpeg'?'jpg':null;
 if(!extension)throw Error('Choose a JPEG, PNG or WebP photo.');
 directory().create({idempotent:true,overwrite:false});
 const id=`avatar-${uuid.v4()}.${extension}`,target=new File(profileAvatarUri(id));await source.copy(target,{overwrite:false});
 const copied=target.info({md5:true});if(copied.size!==info.size||copied.md5!==info.md5)throw Error('The photo could not be saved. Your previous photo is unchanged.');
 return id;
}
