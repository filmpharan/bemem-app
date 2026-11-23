import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import { lagoon, lagoonFonts } from '../../constants/lagoon-theme';
import { AddCardIcon } from './AddCardIcon';

/** Visual sizing only. The invisible target stays within the painted card. */
export function cardPhotoActionLayout(width:number,height:number,userPhoto:boolean,fontScale=1,side:'front'|'back'='front') {
  const availableWidth=Math.max(1,width-8),availableHeight=Math.max(1,height-8);
  const small=Math.min(width,height)<115,iconSize=small?16:18,fontSize=small?11:12,gap=small?3:4,lineHeight=fontSize+4;
  const fullLabel=userPhoto?'Change photo':'Add your photo';
  const textWidth=(label:string)=>Math.ceil(label.length*fontSize*.62*fontScale)+4;
  let label=fullLabel;
  if(textWidth(label)+8>availableWidth)label=userPhoto?'Change photo':'Add photo';
  if(Math.min(width,height)<76||textWidth(label)+8>availableWidth||iconSize+gap+lineHeight*fontScale+8>availableHeight)label='';
  const visualWidth=label?Math.max(iconSize,textWidth(label)):iconSize;
  const visualHeight=iconSize+(label?gap+lineHeight*fontScale:0);
  const targetWidth=Math.min(availableWidth,Math.max(48,visualWidth+8));
  const targetHeight=Math.min(availableHeight,Math.max(48,visualHeight+8));
  // Leave room for the existing first caption line at enlarged fonts; do not
  // change CardAppearancePreview's global text rules or the card's dimensions.
  let top=(height-targetHeight)/2;
  const slack=(targetHeight-visualHeight)/2;
  if(height>=100)top=side==='front'?Math.max(top,8+20*fontScale+4-slack):Math.min(top,height-12-16*fontScale-4-visualHeight-slack);
  top=Math.max(4,Math.min(height-targetHeight-4,top));
  return {label,fullLabel,iconSize,fontSize,lineHeight,gap:label?gap:0,visualWidth,visualHeight,targetWidth,targetHeight,left:(width-targetWidth)/2,top};
}

/** Shared Add/Edit presentation. Menu ownership remains in CardArtworkControls. */
export function CardPhotoAction({width,height,userPhoto,disabled,onPress,side='front'}:{
  width:number;height:number;userPhoto:boolean;disabled:boolean;onPress:()=>void;side?:'front'|'back';
}) {
  const {fontScale}=useWindowDimensions();
  const layout=cardPhotoActionLayout(width,height,userPhoto,fontScale??1,side);
  return <Pressable testID="card-photo-action" accessibilityRole="button" accessibilityLabel={layout.fullLabel}
    accessibilityHint="Choose a photo source for the visible card side" accessibilityState={{disabled}}
    disabled={disabled} onPress={onPress} pressRetentionOffset={0}
    style={({pressed})=>({position:'absolute',left:layout.left,top:layout.top,width:layout.targetWidth,height:layout.targetHeight,alignItems:'center',justifyContent:'center',opacity:disabled ? 0.45 : pressed ? 0.65 : 1})}>
    <View pointerEvents="none" style={{alignItems:'center',justifyContent:'center',gap:layout.gap,
      padding:4,borderRadius:6,backgroundColor:userPhoto?'rgba(255,255,255,0.84)':'transparent'}}>
      <AddCardIcon name="camera" size={layout.iconSize} color={lagoon.text.primary}/>
      {!!layout.label&&<Text accessible={false} allowFontScaling style={{fontFamily:lagoonFonts.latin,color:lagoon.text.primary,
        fontSize:layout.fontSize,lineHeight:layout.lineHeight,textAlign:'center',maxWidth:layout.visualWidth}}>{layout.label}</Text>}
    </View>
  </Pressable>;
}
