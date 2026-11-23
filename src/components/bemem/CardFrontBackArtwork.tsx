import {useState} from 'react';
import {StyleSheet,Text,View,useWindowDimensions} from 'react-native';
import type {CardArtwork,MembershipCard} from '../../types/membership-card';
import {CARD_CORNER_RADIUS} from '../../constants/card-appearance';
import {ciColors,ciTypography} from '../../constants/ci-theme';
import {membershipEditorState} from '../../lib/card-editor-state';
import {resolveWalletCardFootprint} from '../../lib/wallet-validation';
import {cardPaintSize} from '../../lib/card-geometry';
import {CardAppearancePreview} from './CardAppearancePreview';
import {CardArtworkImage} from './CardArtworkImage';
import {frontBackLayout} from '../../lib/frontback-layout';

function SavedSide({side,image,width,height,onLabelHeight}:{side:'front'|'back';image:CardArtwork;width:number;height:number;onLabelHeight?:(height:number)=>void}){
 return <View style={[styles.side,{width}]}>
  <Text style={styles.label} onTextLayout={event=>onLabelHeight?.(event.nativeEvent.lines.reduce((sum,line)=>sum+line.height,0))}>{side==='front'?'Front':'Back'}</Text>
  <View accessible accessibilityLabel={`${side==='front'?'Front':'Back'} card image`} style={[styles.card,{width,height}]}>
   <CardArtworkImage image={image} displayPreview="detail"/>
  </View>
 </View>;
}
/** Enlarge the saved card viewport, using the exact Canvas crop renderer and paint ratio. */
export function CardFrontBackArtwork({card,availableHeight}:{card:Readonly<MembershipCard>;availableHeight?:number}){
 const pair=card.appearance.artwork,sides=(['front','back'] as const).filter(side=>!!pair?.[side]);
 const [width,setWidth]=useState(0),form=membershipEditorState(card);
 const {fontScale=1}=useWindowDimensions(),[label,setLabel]=useState({key:'',height:0});
 const footprint=resolveWalletCardFootprint(card),paint=cardPaintSize(footprint.widthBlocks,footprint.heightBlocks);
 const labelKey=`${width}|${fontScale}|${availableHeight}`,labelHeight=Math.max(ciTypography.supporting.lineHeight*fontScale,label.key===labelKey?label.height:0);
 const adaptive=availableHeight!==undefined?frontBackLayout(width,availableHeight,footprint.widthBlocks,footprint.heightBlocks,sides.length===2?2:1,labelHeight):null;
 const cardWidth=adaptive?.cardWidth??width,height=adaptive?.cardHeight??width*paint.height/paint.width;
 const measureLabel=(height:number)=>setLabel(previous=>previous.key===labelKey&&previous.height>=height?previous:{key:labelKey,height});
 return <View testID="card-frontback-artwork" onLayout={event=>setWidth(event.nativeEvent.layout.width)} style={styles.artwork}>
  <View testID="frontback-card-group" style={[styles.group,{flexDirection:adaptive?.direction??'column',gap:adaptive?.gap??16}]}>
   {cardWidth>0&&sides.map(side=><SavedSide key={card.id+side+pair![side]!.assetId} side={side} image={pair![side]!} width={cardWidth} height={height} onLabelHeight={adaptive?measureLabel:undefined}/>)}
   {!sides.length&&cardWidth>0&&<View style={[styles.side,{width:cardWidth}]}><Text style={styles.label}>Front</Text><CardAppearancePreview values={form.values} presentation={{...form.presentation,side:'front'}} appearance={card.appearance} width={cardWidth} height={height}/></View>}
  </View>
 </View>;
}
const styles=StyleSheet.create({artwork:{width:'100%'},group:{alignSelf:'center',alignItems:'flex-start',justifyContent:'center'},side:{gap:6},card:{borderRadius:CARD_CORNER_RADIUS,overflow:'hidden'},label:{...ciTypography.supporting,color:ciColors.text.secondary}});
