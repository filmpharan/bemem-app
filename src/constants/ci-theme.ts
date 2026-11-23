import { lagoon,lagoonFonts,lagoonTokens } from './lagoon-theme';

/** Current production aliases only. Historical geometry/typography tokens stay historical. */
export const ciColors={
 brand:lagoonTokens.brand,
 text:{primary:lagoon.text.primary,secondary:lagoon.text.secondary,supporting:lagoon.text.secondary,onAction:lagoon.text.onAction},
 action:{primary:lagoon.action.primary,positiveSave:'#26734d',neutral:lagoon.text.primary,
  back:lagoonTokens.semantic.status.error,discard:lagoonTokens.semantic.status.error,destructive:lagoonTokens.semantic.status.error},
 status:{error:lagoonTokens.semantic.status.error,success:lagoonTokens.semantic.status.success,disabled:lagoon.text.disabled},
 surface:{canvas:lagoon.canvas.base,sheet:lagoon.surface.reducedTransparency,elevated:lagoon.surface.base},
} as const;

/** Roles carry no margins, dimensions, color or global Text overrides. Local measured exceptions remain explicit. */
export const ciTypography={
 title:{fontFamily:lagoonFonts.latin,fontSize:18,lineHeight:26,fontWeight:'800'},
 section:{fontFamily:lagoonFonts.latin,fontSize:16,lineHeight:24,fontWeight:'700'},
 body:{fontFamily:lagoonFonts.latin,fontSize:14,lineHeight:22},
 supporting:{fontFamily:lagoonFonts.latin,fontSize:12,lineHeight:18,fontWeight:'500'},
 button:{fontFamily:lagoonFonts.latin,fontSize:14,lineHeight:22,fontWeight:'600'},
} as const;

/** Keep approved variants, rather than applying one opacity to glass, artwork and every control. */
export const ciStates={headerDisabled:0.45,headerPressed:0.7,decoratorDisabled:0.4,confirmationDisabled:0.65,confirmationPressed:0.8} as const;

/** Whole mixed UI strings use Noto Sans Thai so combining marks aren't split into separately shaped runs.
 * This does not normalize text, change card content, or intercept native Text/TextInput. */
export function fontForUiText(text:string){return /[\u0e00-\u0e7f]/u.test(text)?lagoonFonts.thai:lagoonFonts.latin;}

/** Current Flat Tonal button roles. Existing brand, text, layout and artwork tokens stay intact. */
export const ciButtons={
 primary:ciColors.action.primary,primaryPressed:lagoon.action.deep,
 secondary:'#D9F4EC',secondaryPressed:'#C6EEE2',neutral:'#F5FCFA',
 selected:lagoon.action.soft,border:'#C5DDD6',ink:ciColors.text.primary,
 disabledPrimary:'#4C716B',disabledSurface:'#E7EFEC',disabledBorder:'#D7E3DE',
 destructive:ciColors.action.destructive,
} as const;
