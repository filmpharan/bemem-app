import { ciColors } from './ci-theme';
import { alpha, lagoon } from './lagoon-theme';

/** Presentation only. Each sheet retains its own sizing, insets, scroll and native window. */
export const sheetVisual = {
  surface: ciColors.surface.sheet,
  elevated: ciColors.surface.elevated,
  scrim: alpha(lagoon.action.deep, 0.4),
  border: lagoon.rim.boundary,
  rim: alpha(lagoon.rim.boundary, 0.6),
  shadow: `0 -6px 28px -10px ${alpha(lagoon.shadow.tint, 0.22)}`,
  controlShadow: `0 1px 2px ${alpha(lagoon.shadow.tint, 0.13)}`,
} as const;
