import type { DisplayFormat } from '../types/membership-card';

/** A separate bottom band keeps labels and hit targets out of all code/quiet-zone pixels. */
export function cardDetailControls(_format: DisplayFormat, width: number, fontScale = 1, measuredLabelHeight = 0) {
  const budget = Math.max(0, Number.isFinite(width) ? width : 0);
  const scale = Number.isFinite(fontScale) ? Math.max(1, fontScale) : 1;
  const headerHeight = Math.max(48, Math.ceil(17 * scale) + 8, Math.ceil(measuredLabelHeight) + 8);
  return { sideBySide: false, headerHeight, codeTop: 4, codeBottom: headerHeight + 8, labelWidth: Math.max(1, budget - 56) };
}
