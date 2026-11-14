/** Original web CardDisplay.Face uses rounded-xl:
 * styles.css --radius-xl = --radius + 4px; --radius = .625rem.
 * At the web's default 16px root this is 14 CSS px -> 14 RN logical units.
 * Fixed across card sizes. Do not scale by PixelRatio, fontScale or footprint. */
export const CARD_CORNER_RADIUS = 14;
