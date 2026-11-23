/** Admission refused before any persistent operation started. The in-memory draft remains editable. */
export class KeepAdmissionBlockedError extends Error {}
export class KeepsInspectionStaleError extends Error {}
export type KeepDraftAccess = { canSave: boolean; canUseArtwork: boolean; canWrite: () => boolean; canPick?: () => boolean; canRetain?: () => boolean; message?: string; messageTone?: 'info' | 'error'; onReview?: () => void; reviewLabel?: string };
/** My Keeps presentation coordination only. Never cancels a native operation or releases its lock on a deadline. */
const sessions = new WeakMap<object, { inspection?: Promise<unknown>; mutation?: object }>();
function state(owner: object) {
  let value = sessions.get(owner);
  if (!value) { value = {}; sessions.set(owner, value); }
  return value;
}
export function inspectKeepsOnce<T>(owner: object, inspect: () => Promise<T>, requireFresh = false): Promise<T> {
  const value = state(owner);
  if (value.inspection) {
    // A caller arriving after its metadata read cannot certify an older queue read.
    if (requireFresh) return value.inspection.then(() => { throw new KeepsInspectionStaleError('An earlier notification inspection finished. Check status again.'); });
    return value.inspection as Promise<T>;
  }
  const pending = Promise.resolve().then(inspect);
  value.inspection = pending;
  void pending.then(() => { if (value.inspection === pending) delete value.inspection; },
    () => { if (value.inspection === pending) delete value.inspection; });
  return pending;
}
export function keepsMutationPending(owner: object) { return !!state(owner).mutation; }
export function admitKeepsMutation(owner: object) {
  const value = state(owner);
  if (value.mutation) return null;
  const token = {}; value.mutation = token;
  return () => { if (value.mutation === token) delete value.mutation; };
}
/** Observation only: callers retain the original promise and mutation admission. */
export function observeKeepsWait(onUnknown: () => void, delay = 20000) {
  const timer = setTimeout(onUnknown, delay);
  return () => clearTimeout(timer);
}

/** One native picker lease across editor instances; only its settled promise releases it. */
let pickerToken:object|null=null;
const pickerListeners=new Set<()=>void>();
export function subscribeKeepPicker(listener:()=>void){pickerListeners.add(listener);return()=>{pickerListeners.delete(listener);};}
export function admitKeepPicker(){
 if(pickerToken)return null;const token={};pickerToken=token;
 return()=>{if(pickerToken===token){pickerToken=null;for(const listener of pickerListeners)listener();}};
}
