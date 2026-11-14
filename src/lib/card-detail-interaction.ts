import type { DisplayFormat } from '../types/membership-card';

/** A local swipe candidate, never a full-screen responder. No timer/animation or IO. */
export function createCardDetailSwipe(onFormat: (format: DisplayFormat) => void) {
  let rejected = true;
  function move(dx: number, dy: number, touches: number) {
    if (!Number.isFinite(dx) || !Number.isFinite(dy) || Math.abs(dy) > 18 || touches > 1) rejected = true;
  }
  return {
    begin(startX: number, screenWidth: number, touches: number) {
      rejected = touches !== 1 || !Number.isFinite(startX) || !Number.isFinite(screenWidth)
        || startX < 24 || startX > screenWidth - 24;
    },
    shouldClaim(dx: number, dy: number, touches: number) {
      move(dx, dy, touches);
      return !rejected && touches === 1 && Math.abs(dx) >= 12 && Math.abs(dx) > Math.abs(dy) * 1.5;
    },
    move,
    release(dx: number, dy: number, touches: number) {
      move(dx, dy, touches);
      const format = !rejected && Math.abs(dx) >= 48 && Math.abs(dx) > Math.abs(dy) * 1.5
        ? dx < 0 ? 'qr' : 'code128' : null;
      rejected = true;
      if (format) onFormat(format);
    },
    cancel() { rejected = true; },
  };
}
