import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet,Text,View,useWindowDimensions } from 'react-native';
import type { PreviewCard } from '../../types/wallet-ui';
import { folderVisualLayout } from '../../lib/group-folder-visual';
import { artworkUri } from '../../lib/card-artwork-store';
import { WEB_BRANDS } from '../../lib/card-presentation';
import { fontForUiText } from '../../constants/ci-theme';

/** Full-bleed front source, deliberately no card frame, label, tilt or saved-data edit. */
function FrontRegion({card}:{card:PreviewCard}){
 const image=card.appearance?.artwork?.front;
 const gradient=WEB_BRANDS.find(b=>b.id===card.appearance?.gradientPresetId)?.gradient??card.colors;
 return <View pointerEvents="none" style={[StyleSheet.absoluteFill,{backgroundColor:card.colors[0],backgroundImage:`linear-gradient(135deg, ${gradient.join(', ')})`}]}>
  {image&&<Image source={{uri:artworkUri(image.assetId)}} contentFit="cover" contentPosition="center" transition={0} style={StyleSheet.absoluteFill} accessible={false}/>}
 </View>;
}
// Exact approved Lagoon Stack exports. Static PNGs avoid the runtime SVG data-URI decoder.
const shells={
 landscape:{back:require('../../../assets/group-folders/lagoon-stack-landscape-back.png'),front:require('../../../assets/group-folders/lagoon-stack-landscape-front.png')},
 portrait:{back:require('../../../assets/group-folders/lagoon-stack-portrait-back.png'),front:require('../../../assets/group-folders/lagoon-stack-portrait-front.png')},
};
export function GroupFolderCard({card}:{card:PreviewCard}){
 const [size,setSize]=useState({width:0,height:0}),{fontScale}=useWindowDimensions(),members=card.folder?.members??[];
 if(members.length<2||members.length>6)return null;
 const shell=shells[card.orientation],visual=folderVisualLayout(size.width,size.height,card.orientation,members.length,fontScale);
 return <View pointerEvents="none" style={styles.root} onLayout={e=>{const {width,height}=e.nativeEvent.layout;setSize(old=>old.width===width&&old.height===height?old:{width,height});}}>
  <Image source={shell.back} contentFit="fill" transition={0} style={styles.back} accessible={false}/>
  {size.width>0&&size.height>0&&<View style={[styles.well,visual.well]}>{visual.cells.map((cell,i)=><View key={members[i].id} style={[styles.cell,cell]}><FrontRegion card={members[i]}/></View>)}</View>}
  <Image source={shell.front} contentFit="fill" transition={0} style={styles.front} accessible={false}/>
  <Text numberOfLines={2} maxFontSizeMultiplier={1.3} style={[styles.name,{bottom:visual.titleBottom,fontFamily:fontForUiText(card.name)}]}>{card.name}</Text>
 </View>;
}
const styles=StyleSheet.create({
 root:{flex:1},back:{...StyleSheet.absoluteFill,zIndex:0},
 well:{position:'absolute',zIndex:1,borderRadius:5,overflow:'hidden'},
 cell:{position:'absolute',overflow:'hidden'},front:{...StyleSheet.absoluteFill,zIndex:2},
 name:{position:'absolute',zIndex:3,left:'9%',right:'9%',fontSize:12,lineHeight:16,fontWeight:'700',color:'#ffffff',includeFontPadding:false},
});
