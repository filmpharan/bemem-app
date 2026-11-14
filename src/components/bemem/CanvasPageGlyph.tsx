import { StyleSheet,Text,View } from 'react-native';
import { lagoon,lagoonFonts } from '../../constants/lagoon-theme';
import { PAGE_POPOVER } from '../../lib/page-popover-geometry';
import type { CanvasPage } from '../../lib/canvas-pages';

/** Shared page outline: visual only; its parent owns the accessible tap target. */
export function CanvasPageGlyph({page}:{page:CanvasPage}){
 return <View accessible={false} pointerEvents="none" style={styles.page}>
  <Text maxFontSizeMultiplier={1.3} style={styles.number}>{page}</Text>
 </View>;
}
const styles=StyleSheet.create({
 page:{width:PAGE_POPOVER.glyph,height:PAGE_POPOVER.glyph,borderRadius:5,borderWidth:1.8,borderColor:lagoon.text.primary,backgroundColor:lagoon.canvas.base,alignItems:'center',justifyContent:'center'},
 number:{fontFamily:lagoonFonts.latin,fontSize:14,lineHeight:20,color:lagoon.text.primary,fontWeight:'700',includeFontPadding:false},
});
