export const CARD_HOLD_MS = 350;
export const CARD_TOUCH_SLOP = 8;

type Callbacks = {
  onTap: () => void;
  onDragStart: () => void;
  onDragMove: (dx: number, dy: number) => void;
  onDrop: (dx: number, dy: number) => void;
  onDragEnd: () => void;
};
type Clock = { schedule: (callback: () => void, ms: number) => () => void };
const clock: Clock = {
  schedule(callback, ms) {
    const timer = setTimeout(callback, ms);
    return () => clearTimeout(timer);
  },
};

// Shared by the native responder and deterministic tests. No layout or storage writes.
export function createCardInteraction(callbacks: Callbacks, scheduler: Clock = clock) {
  let phase: 'idle' | 'pressing' | 'dragging' | 'cancelled' = 'idle';
  let stopTimer: (() => void) | undefined;
  function clearTimer() { stopTimer?.(); stopTimer = undefined; }
  function cancel() {
    clearTimer();
    const dragging = phase === 'dragging';
    phase = 'idle';
    if (dragging) callbacks.onDragEnd();
  }
  function move(dx: number, dy: number, touches = 1) {
    if (touches > 1) { cancel(); return; }
    if (phase === 'pressing' && Math.hypot(dx, dy) > CARD_TOUCH_SLOP) {
      clearTimer(); phase = 'cancelled';
    }
    if (phase === 'dragging') callbacks.onDragMove(dx, dy);
  }
  return {
    start() {
      cancel(); phase = 'pressing';
      stopTimer = scheduler.schedule(() => {
        stopTimer = undefined;
        if (phase !== 'pressing') return;
        phase = 'dragging'; callbacks.onDragStart();
      }, CARD_HOLD_MS);
    },
    move,
    release(dx: number, dy: number) {
      // Also check the final displacement when a fast swipe had no move callback.
      move(dx, dy);
      clearTimer();
      const released = phase;
      phase = 'idle';
      if (released === 'pressing') callbacks.onTap();
      if (released === 'dragging') {
        try { callbacks.onDrop(dx, dy); } finally { callbacks.onDragEnd(); }
      }
    },
    cancel,
    isDragging: () => phase === 'dragging',
  };
}
