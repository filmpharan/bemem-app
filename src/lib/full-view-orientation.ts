import type * as ScreenOrientation from 'expo-screen-orientation';

type Port = Pick<typeof ScreenOrientation, 'getOrientationLockAsync' | 'getPlatformOrientationLockAsync' | 'supportsOrientationLockAsync' | 'lockAsync' | 'lockPlatformAsync' | 'unlockAsync' | 'OrientationLock'>;
// Serialize presentation-only native operations, including cleanup from a replaced/unmounted view.
// This queue has no Wallet capability and prevents a late old restore overriding the next view's lock.
let pending = Promise.resolve();
function schedule<T>(work: () => Promise<T>): Promise<T> {
  const result = pending.then(work); pending = result.then(() => {}, () => {}); return result;
}
export function fullViewOrientation(port: Port, portrait: boolean) {
  let previous: Awaited<ReturnType<Port['getOrientationLockAsync']>> | undefined;
  let platform: Awaited<ReturnType<Port['getPlatformOrientationLockAsync']>> | undefined;
  let wanted = true, closed = false, applied = false;
  const desired = portrait ? port.OrientationLock.PORTRAIT_UP : port.OrientationLock.LANDSCAPE;
  async function restore() {
    if (!applied || previous === undefined) return;
    if (previous === port.OrientationLock.OTHER && platform) await port.lockPlatformAsync(platform);
    else if ([port.OrientationLock.DEFAULT, port.OrientationLock.UNKNOWN, port.OrientationLock.OTHER].includes(previous)) await port.unlockAsync();
    else await port.lockAsync(previous);
    applied = false;
  }
  function resume() {
    if (closed) return Promise.resolve(); wanted = true;
    return schedule(async () => {
      if (closed || !wanted) return;
      if (previous === undefined) {
        previous = await port.getOrientationLockAsync();
        if (previous === port.OrientationLock.OTHER) platform = await port.getPlatformOrientationLockAsync();
      }
      if (closed || !wanted) return;
      if (!(await port.supportsOrientationLockAsync(desired))) throw Error('orientation_not_supported');
      if (closed || !wanted) return;
      applied = true; // A rejected native request may still have partially changed policy.
      await port.lockAsync(desired);
    });
  }
  return { resume, pause() { wanted = false; return schedule(restore); },
    release() { closed = true; wanted = false; return schedule(restore); } };
}
