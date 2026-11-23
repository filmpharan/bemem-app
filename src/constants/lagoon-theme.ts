import tokens from '../../design-system/bemem-vivid-lagoon/TOKENS.json';

export type LagoonThemeId = keyof typeof tokens.palettes;
export const DEFAULT_THEME_ID = tokens.metadata.defaultThemeId as LagoonThemeId;
export const lagoonTokens = tokens;
export function lagoonPalette(id: LagoonThemeId = DEFAULT_THEME_ID) {
  return tokens.palettes[id].colors;
}
export const lagoon = lagoonPalette();
export const core = tokens.core;
export function alpha(hex: string, opacity: number) {
  return `${hex}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`;
}
// Local font aliases registered by the root layout. No network font request.
export const lagoonFonts = { latin: 'BememManrope', thai: 'BememThai' } as const;
