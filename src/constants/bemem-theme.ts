import { lagoon, core } from './lagoon-theme';

// Compatibility bridge for existing Phase 1 views; no Canvas/storage dependency.
export const bemem = {
  background: lagoon.canvas.base,
  foreground: lagoon.text.primary,
  primary: lagoon.action.primary,
  white: '#ffffff',
  muted: lagoon.text.secondary,
  border: lagoon.rim.inner,
  grid: lagoon.grid.line,
  error: '#b42318',
  radius: core.radius.card,
} as const;
