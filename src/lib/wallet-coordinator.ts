import type { WalletDocument } from '../types/wallet-document';
import { validateWalletDocument, WalletValidationError } from './wallet-validation';

export type WalletPhase = 'loading' | 'ready_v1' | 'ready_v2' | 'switching' | 'activation_incomplete' | 'blocked' | 'error';
type Source = 'v1' | 'v2';
export type WalletFailureKind = 'revision_conflict' | 'pending' | 'blocked' | 'commit_uncertain' | 'failed';
export type WalletFailure = { kind: WalletFailureKind; code: string; validationCode?: string };
export type CoordinatorResult = { ok: true; code: 'completed' | 'cutover_cancelled' }
  | { ok: false; code: string; kind?: WalletFailureKind; validationCode?: string };
export type WalletInspection =
  | { source: Source | 'empty'; wallet: WalletDocument; pendingCount: number; initialV1?: true }
  | { source: 'invalid_v1' | 'invalid_v2'; pendingCount: number; error?: WalletFailure };
export type RuntimeWalletSession = {
  source: Source; generation: number; revision: number;
  saved: WalletDocument; draft: WalletDocument;
  /** Guarded capability, NEVER the underlying repository writer. */
  repository: { source: Source; save: () => Promise<CoordinatorResult> };
};
export type WalletCoordinatorPorts = {
  inspect: () => Promise<WalletInspection>;
  writers: Record<Source, { save: (draft: WalletDocument, expectedRevision: number) => Promise<WalletDocument> }>;
  importV1: (freshPreparedV2: WalletDocument) => Promise<WalletDocument>;
  /** Must atomically install the WHOLE envelope or reject; never partially mutate the live runtime. */
  activate: (session: RuntimeWalletSession) => Promise<void>;
};
/** Adapters translate known pre-commit failures to this type. Unknown writer failures are uncertain. */
export class WalletCoordinatorFailure extends Error {
  readonly kind: WalletFailureKind;
  readonly reason: string;
  constructor(public readonly code: WalletFailureKind | 'precommit_failure', reason?: string, public readonly validationCode?: string) {
    super(reason ?? code); this.name = 'WalletCoordinatorFailure';
    this.kind = code === 'precommit_failure' ? 'failed' : code;
    this.reason = reason ?? code;
  }
}
const yes: CoordinatorResult = Object.freeze({ ok: true, code: 'completed' });
const no = (code: string, kind?: WalletFailureKind, validationCode?: string): CoordinatorResult => ({ ok: false, code, kind, validationCode });
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const clone = (doc: WalletDocument) => validateWalletDocument(doc);

/** Instance-local, headless state machine. No UI, storage adapter or automatic migration imports. */
export function createWalletCoordinator(ports: WalletCoordinatorPorts) {
  let phase: WalletPhase = 'loading', reason: string | null = null, generation = 0;
  let source: Source | null = null, saved: WalletDocument | null = null, draft: WalletDocument | null = null;
  let v2Barrier = false, committedV2 = false, dirty = false, operation = false;
  let saving: Promise<CoordinatorResult> | null = null;
  let cancelled = false, importStarted = false;
  let activationTarget: WalletDocument | null = null;
  let failure: WalletFailure | null = null;
  function rememberObservedV2(error: unknown) {
    if (error instanceof WalletCoordinatorFailure && error.reason === 'v2_already_exists') {
      committedV2 = true; v2Barrier = true;
    }
  }
  function state(next: WalletPhase, code: string | null = null) { phase = next; reason = code; }
  function allowed(session: number) {
    return session === generation && (phase === 'ready_v1' || phase === 'ready_v2') && !operation && !saving;
  }
  function block(code: string, kind?: WalletFailureKind, validationCode?: string) {
    const category = kind ?? (code === 'revision_conflict' ? 'revision_conflict'
      : code.startsWith('pending') ? 'pending' : code === 'commit_uncertain' ? 'commit_uncertain' : 'blocked');
    failure = { kind: category, code, validationCode };
    generation++; state('blocked', code); return no(code, category, validationCode);
  }
  async function inspect() {
    const result = await ports.inspect();
    if (result.source === 'v2' || result.source === 'invalid_v2') { committedV2 = true; v2Barrier = true; }
    if (!Number.isSafeInteger(result.pendingCount) || result.pendingCount < 0) throw new Error('invalid_inspection');
    if ('wallet' in result) {
      try {
        const wallet = clone(result.wallet);
        if (result.source !== 'empty' && wallet.revision < 1
          && !(result.source === 'v1' && result.initialV1 && wallet.revision === 0)) throw new Error('invalid_revision');
        return { ...result, wallet };
      } catch (error) {
        const detail = error instanceof WalletValidationError ? error.code : 'invalid_document';
        if (result.source === 'v2') return { source: 'invalid_v2' as const, pendingCount: result.pendingCount,
          error: { kind: 'blocked' as const, code: 'invalid_v2', validationCode: detail } };
        if (result.source === 'v1') return { source: 'invalid_v1' as const, pendingCount: result.pendingCount,
          error: { kind: 'blocked' as const, code: 'invalid_v1', validationCode: detail } };
        throw new Error('invalid_empty_wallet');
      }
    }
    return result;
  }
  function inspectionProblem(result: WalletInspection) {
    if (result.source === 'invalid_v2') return 'invalid_v2';
    if (result.source === 'invalid_v1') return 'invalid_v1';
    if (result.pendingCount) return 'pending_requires_review';
    if (v2Barrier && result.source !== 'v2' && !(result.source === 'empty' && !committedV2)) return 'v2_required_no_v1_fallback';
    return null;
  }
  function blockInspection(result: WalletInspection, fallback: string) {
    return 'error' in result && result.error ? block(result.error.code, result.error.kind, result.error.validationCode) : block(fallback);
  }
  async function activate(nextSource: Source, document: WalletDocument, nextDraft = document): Promise<CoordinatorResult> {
    if (nextSource === 'v1' && v2Barrier) return block('v2_required_no_v1_fallback');
    const nextSaved = clone(document), nextDraftCopy = clone(nextDraft), session = generation;
    if (nextDraftCopy.revision !== nextSaved.revision) return block('draft_revision_mismatch');
    if (nextSource === 'v2') { v2Barrier = true; activationTarget = clone(document); }
    try {
      await ports.activate({ source: nextSource, generation: session, revision: nextSaved.revision,
        saved: clone(nextSaved), draft: clone(nextDraftCopy), repository: { source: nextSource, save: () => save(session) } });
      const draining = session !== generation && phase === 'switching' && reason === 'draining_save' && nextSource === 'v1' && !v2Barrier;
      if (session !== generation && !draining) return block('stale_activation');
      source = nextSource; saved = nextSaved; draft = nextDraftCopy; dirty = !same(saved, draft);
      activationTarget = null;
      failure = null;
      if (!draining) state(nextSource === 'v1' ? 'ready_v1' : 'ready_v2');
      return yes;
    } catch {
      state(nextSource === 'v2' ? 'activation_incomplete' : 'error', 'runtime_activation_failed');
      return no('runtime_activation_failed');
    }
  }
  async function finishCancellation(document: WalletDocument): Promise<CoordinatorResult> {
    const result = await activate('v1', document);
    if (!result.ok) return result;
    state('ready_v1', 'cutover_cancelled');
    return { ok: true, code: 'cutover_cancelled' };
  }
  async function initialize(): Promise<CoordinatorResult> {
    if (phase !== 'loading' || operation) return no('invalid_transition');
    operation = true; generation++;
    try {
      const fresh = await inspect(), problem = inspectionProblem(fresh);
      if (problem) return blockInspection(fresh, problem);
      if ('wallet' in fresh) return await activate(fresh.source === 'v1' ? 'v1' : 'v2', fresh.wallet);
      return block('invalid_inspection');
    } catch { state('error', 'startup_inspection_failed'); return no('startup_inspection_failed'); }
    finally { operation = false; }
  }
  function save(session: number): Promise<CoordinatorResult> {
    if (!allowed(session) || !source || !saved || !draft) return Promise.resolve(no('save_not_admitted'));
    const writerSource = source, expected = saved.revision, snapshot = clone(draft);
    // Admission is closed by assigning the Promise synchronously before this method returns.
    saving = Promise.resolve().then(async (): Promise<CoordinatorResult> => {
      try {
        const written = await ports.writers[writerSource].save(snapshot, expected);
        if (writerSource === 'v2') { committedV2 = true; v2Barrier = true; }
        const result = clone(written);
        if (result.revision !== expected + 1 || !same(result.cards, snapshot.cards) || !same(result.canvas, snapshot.canvas)) return block('save_readback_mismatch');
        // A pre-cutover Save may finish during draining. Never reopen admission then.
        if (phase === 'switching') { saved = result; draft = clone(result); dirty = false; return yes; }
        return await activate(writerSource, result);
      } catch (error) {
        rememberObservedV2(error);
        return error instanceof WalletCoordinatorFailure ? block(error.reason, error.kind, error.validationCode)
          : block('commit_uncertain');
      } finally { saving = null; }
    });
    return saving;
  }
  function cutover(session: number, reviewed: WalletDocument): Promise<CoordinatorResult> {
    if (session !== generation || phase !== 'ready_v1' || operation || v2Barrier) return Promise.resolve(no('cutover_not_admitted'));
    if (dirty && !saving) return Promise.resolve(no('draft_unresolved'));
    let expected: WalletDocument;
    try { expected = clone(reviewed); } catch { return Promise.resolve(no('invalid_preview')); }
    const pendingSave = saving;
    operation = true; cancelled = false; importStarted = false;
    generation++; state('switching', 'draining_save'); // Synchronous barrier BEFORE awaiting anything.
    return (async (): Promise<CoordinatorResult> => {
      try {
        if (pendingSave && !(await pendingSave).ok) return block('prior_save_failed_reinspect_required');
        if (dirty) return block('draft_unresolved');
        state('switching', 'revalidating_preview');
        const fresh = await inspect(), problem = inspectionProblem(fresh);
        if (problem) return blockInspection(fresh, problem);
        if (fresh.source !== 'v1') return block('v2_already_exists');
        const current = clone(fresh.wallet);
        if (cancelled) return same(current, saved) ? await finishCancellation(current) : block('revision_conflict');
        if (!same(current, expected) || !same(current, saved)) return block('preview_changed');
        // Final admission check: pending/v2 may have appeared while preparing source data.
        const last = await inspect(), lastProblem = inspectionProblem(last);
        if (lastProblem) return blockInspection(last, lastProblem);
        if (last.source !== 'v1' || !same(last.wallet, current)) return block('preview_changed');
        if (cancelled) return await finishCancellation(current);
        importStarted = true; state('switching', 'importing');
        const written = await ports.importV1(clone(current));
        committedV2 = true; v2Barrier = true;
        const imported = clone(written);
        if (!same(imported, current)) return block('import_readback_mismatch');
        state('switching', 'verifying_commit');
        const verified = await inspect(), verifyProblem = inspectionProblem(verified);
        if (verifyProblem) return blockInspection(verified, verifyProblem);
        if (verified.source !== 'v2' || !same(verified.wallet, imported)) return block('commit_uncertain');
        return await activate('v2', imported);
      } catch (error) {
        // The import capability may observe a committed v2 after our last inspect.
        // Retain that one-way writer barrier even if a later inspection loses visibility.
        rememberObservedV2(error);
        return error instanceof WalletCoordinatorFailure ? block(error.reason, error.kind, error.validationCode)
          : block(importStarted ? 'commit_uncertain' : 'cutover_inspection_failed');
      } finally { operation = false; }
    })();
  }
  async function retryActivation(): Promise<CoordinatorResult> {
    if (phase !== 'activation_incomplete' || operation || !activationTarget) return no('invalid_transition');
    const target = clone(activationTarget);
    operation = true; generation++; state('switching', 'retrying_activation');
    try {
      const fresh = await inspect(), problem = inspectionProblem(fresh);
      if (problem) return blockInspection(fresh, problem);
      if (!('wallet' in fresh) || (fresh.source !== 'v2' && !(fresh.source === 'empty' && !committedV2)) || !same(fresh.wallet, target)) return block('activation_snapshot_changed');
      return await activate('v2', target);
    } catch { return block('activation_verification_failed'); }
    finally { operation = false; }
  }
  async function reconcile(): Promise<CoordinatorResult> {
    if (!['blocked', 'error'].includes(phase) || operation || saving) return no('invalid_transition');
    operation = true; generation++; state('loading', 'reinspecting');
    try {
      const fresh = await inspect(), problem = inspectionProblem(fresh);
      if (problem) return blockInspection(fresh, problem);
      if (!('wallet' in fresh)) return block('invalid_inspection');
      const document = clone(fresh.wallet), nextSource = fresh.source === 'v1' ? 'v1' : 'v2';
      if (dirty && draft && saved) {
        if (same(document, saved)) return await activate(nextSource, document, draft);
        if (!same(document.cards, draft.cards) || !same(document.canvas, draft.canvas)) return block('revision_conflict_draft_retained');
      }
      // Inspection, not a retry of Save/Import. Any subsequent write needs a new explicit call.
      return await activate(nextSource, document);
    } catch { return block('reinspection_failed'); }
    finally { operation = false; }
  }
  return {
    initialize, save, cutover, retryActivation, reconcile,
    getState: () => ({ phase, reason, generation, source, revision: saved?.revision ?? null, dirty,
      saving: saving !== null, committedV2, editsAllowed: allowed(generation), failure: failure ? { ...failure } : null }),
    getSession: () => saved && draft ? { saved: clone(saved), draft: clone(draft) } : null,
    updateDraft(session: number, value: WalletDocument): CoordinatorResult {
      if (!allowed(session) || !saved) return no('edit_not_admitted');
      try {
        const next = clone(value);
        if (next.revision !== saved.revision) return no('draft_revision_mismatch');
        draft = next; dirty = !same(saved, draft); return yes;
      } catch { return no('invalid_draft'); }
    },
    cancelCutover(): CoordinatorResult {
      if (phase !== 'switching' || importStarted || v2Barrier) return no('cancel_not_admitted');
      cancelled = true; return yes; // Remain locked until draining/revalidation reaches a safe boundary.
    },
  };
}
