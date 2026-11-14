import type { WalletDocument } from '../types/wallet-document';
import type { Position } from '../types/wallet-ui';
import type { CardFormValues } from './card-form';
import type { CardPresentationDraft } from './card-presentation';
import { adaptCardForm } from './card-form-adapter';
import { canPlace, firstFreePosition } from './canvas-layout';
import { walletCanvasPresentation } from './wallet-preparation';
import { createWalletRepository, type WalletFiles } from './wallet-repository';
import { createWalletStorageAdapters } from './wallet-storage-adapters';
import { createWalletOwnerScope } from './wallet-runtime-owner';
import { resolveWalletStartup } from './wallet-startup';
import { validateWalletDocument } from './wallet-validation';

/** Isolated memory transport for the EXISTING repository, not another repository implementation. */
export function createDevWalletMemory() {
  const entries = new Map<string, string>();
  let fault: 'write' | 'promote' | 'readback' | null = null;
  let promoted = false;
  const files: WalletFiles = {
    scope: {}, list: async () => [...entries.keys()],
    read: async name => {
      if (fault === 'readback' && promoted && name.endsWith('.json')) { fault = null; throw Error('Synthetic readback failure'); }
      const text = entries.get(name); if (text === undefined) throw Error('Missing test snapshot'); return text;
    },
    writeExclusive: async (name, text) => {
      if (fault === 'write') { fault = null; throw Error('Synthetic write failure'); }
      if (entries.has(name)) throw Error('Test snapshot exists'); entries.set(name, text);
    },
    promoteExclusive: async (pending, committed) => {
      if (fault === 'promote') { fault = null; throw Error('Synthetic move failure'); }
      if (entries.has(committed) || !entries.has(pending)) throw Error('Invalid test move');
      entries.set(committed, entries.get(pending)!); entries.delete(pending);
      promoted = true;
    },
  };
  return { files, failNext: (kind: NonNullable<typeof fault>) => { fault = kind; promoted = false; },
    // Test fixtures only: never exposed by the screen and never connected to a native filesystem.
    seed: (name: string, text: string) => { entries.set(name, text); },
    inspectBytes: () => [...entries.entries()] };
}

/** One DEV scope; callers supply only the storage boundary, never another writer/owner. */
export function createDevAddCardRuntime(memory: { files: WalletFiles } = createDevWalletMemory()) {
  let sequence = 0, submission = 0;
  const prefix = `dev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  const receipts = new Set<string>();
  const submissions = new Map<string, number>();
  const now = () => new Date().toISOString();
  const emptySavedAt = now();
  const repository = createWalletRepository(memory.files, { token: () => `test-${++sequence}`, now });
  const v1 = { load: async () => null, save: async (): Promise<never> => { throw Error('DEV v1 writer forbidden'); } };
  const scope = createWalletOwnerScope(() => {
    const adapters = createWalletStorageAdapters({ v1, v2: repository, demoCards: [], now });
    return { ...adapters, inspect: async () => {
      const resolved = await resolveWalletStartup({ v2: repository, readV1: v1.load, demoCards: [], now: () => emptySavedAt });
      if (resolved.status === 'blocked') return { source: 'invalid_v2' as const, pendingCount: 0,
        error: { kind: 'blocked' as const, code: resolved.error.code, validationCode: resolved.error.validationCode } };
      return { source: resolved.source === 'v2' ? 'v2' as const : 'empty' as const,
        wallet: resolved.wallet, pendingCount: resolved.pendingFiles.length };
    } };
  });
  const owner = scope.getOwner();
  const clone = (value: unknown) => validateWalletDocument(value);
  const snapshot = () => owner.getSnapshot();
  function draft(): WalletDocument | null {
    const session = snapshot().session; return session ? clone(session.draft) : null;
  }
  return {
    getSnapshot: snapshot, subscribe: owner.subscribe,
    initialize: owner.commands.initialize,
    beginSubmission() {
      const token = `${prefix}-${++submission}`, state = snapshot().state;
      submissions.set(token, state.phase === 'loading' ? state.generation + 1 : state.generation);
      return token;
    },
    cancelSubmission: (token: string) => { submissions.delete(token); },
    add(token: string, values: CardFormValues, presentation: CardPresentationDraft) {
      if (!submissions.has(token) || receipts.has(token)) return { ok: false as const, errors: {}, message: 'This submission has already been used or is no longer valid.' };
      const current = draft(), state = snapshot().state;
      if (!current || !state.editsAllowed) return { ok: false as const, errors: {}, message: 'The test wallet is not ready for changes.' };
      if (submissions.get(token) !== state.generation) return { ok: false as const, errors: {}, message: 'The wallet session changed. Close and reopen Add Card.' };
      const time = now(), adapted = adaptCardForm(values, presentation, { id: token, createdAt: time, updatedAt: time });
      if (!adapted.ok) return adapted;
      if (current.cards.some(card => card.id === token)) return { ok: false as const, errors: {}, message: 'This card already exists.' };
      const view = walletCanvasPresentation(current), addedView = walletCanvasPresentation({ ...current, cards: [adapted.card],
        canvas: { columns: 12, layout: { [token]: { col: 0, row: 0 } } } }).cards[0];
      const position = firstFreePosition(addedView, view.cards, view.layout, Infinity);
      if (!position) return { ok: false as const, errors: {}, message: 'No valid placement was found.' };
      const next = clone({ ...current, cards: [...current.cards, adapted.card],
        canvas: { columns: 12, layout: { ...current.canvas.layout, [token]: position } } });
      const result = owner.commands.updateDraft(state.generation, next);
      if (!result.ok) return { ok: false as const, errors: {}, message: 'The draft is locked. Inspect the test wallet before continuing.' };
      receipts.add(token);
      submissions.delete(token);
      return { ok: true as const, card: adapted.card };
    },
    move(id: string, position: Position) {
      const current = draft(); if (!current) return false;
      const view = walletCanvasPresentation(current), card = view.cards.find(c => c.id === id);
      if (!card || !canPlace(card, position, view.cards, view.layout, Infinity)) return false;
      return owner.commands.updateDraft(snapshot().state.generation, clone({ ...current,
        canvas: { columns: 12, layout: { ...current.canvas.layout, [id]: position } } })).ok;
    },
    discard() {
      const saved = snapshot().session?.saved;
      return saved ? owner.commands.updateDraft(snapshot().state.generation, clone(saved)) : { ok: false as const, code: 'not_ready' };
    },
    save() {
      const state = snapshot().state;
      if (!state.dirty) return Promise.resolve({ ok: false as const, code: 'nothing_to_save' });
      return owner.commands.save(state.generation);
    },
    reinspect: owner.commands.reconcile,
    retryActivation: owner.commands.retryActivation,
    async reload() {
      // Reload is admitted only with a clean, idle draft. It never imports or retries a write.
      const state = snapshot().state;
      if (state.dirty || state.saving || !state.editsAllowed) return { ok: false as const, code: 'resolve_draft_before_reload' };
      const saved = JSON.stringify(snapshot().session?.saved);
      const result = await resolveWalletStartup({ v2: repository, readV1: v1.load, demoCards: [], now: () => emptySavedAt });
      if (result.status === 'blocked' || result.requiresPendingReview) return { ok: false as const, code: 'reload_blocked' };
      if (state.generation !== snapshot().state.generation || snapshot().state.saving || snapshot().state.dirty
        || JSON.stringify(result.wallet) !== saved) return { ok: false as const, code: 'readback_changed' };
      return { ok: true as const, code: 'readback_verified', wallet: clone(result.wallet) };
    },
  };
}
