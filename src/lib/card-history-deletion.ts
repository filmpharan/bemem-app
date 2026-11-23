import type { MembershipCard } from '../types/membership-card';
import { cloneHistory, HistoryError, validateHistoryRecord, type HistoryDocument, type HistoryRecord } from './card-history';
import type { createHistoryRepository } from './card-history-repository';

export type DeleteHistoryReview = { token: string; records: number; receipts: number };
export type CardDeleteResult = { ok: true; warning?: string } | { ok: false; message: string; requiresReinspection: boolean };
export type CardHistoryDeletePolicy = {
  review: (card: MembershipCard) => Promise<DeleteHistoryReview>;
  cancel: (review: DeleteHistoryReview) => void;
  execute: (review: DeleteHistoryReview, card: MembershipCard, writer: () => Promise<CardDeleteResult>) => Promise<CardDeleteResult>;
};
export type HistoryDeleteIntent = { schemaVersion: 1; id: string; cardId: string; cardName: string; historyRevision: number; records: HistoryRecord[] };
export function validateDeleteIntent(value: unknown): asserts value is HistoryDeleteIntent {
  const item = value as HistoryDeleteIntent;
  if (!item || typeof item !== 'object' || item.schemaVersion !== 1 || !/^[a-zA-Z0-9-]{1,80}$/.test(item.id)
    || typeof item.cardId !== 'string' || !item.cardId || typeof item.cardName !== 'string' || !Number.isSafeInteger(item.historyRevision)
    || item.historyRevision < 0 || !Array.isArray(item.records) || !item.records.length
    || Object.keys(item).some(key => !['schemaVersion', 'id', 'cardId', 'cardName', 'historyRevision', 'records'].includes(key))) throw new HistoryError('blocked', 'The deletion recovery file requires review.');
  const ids = new Set<string>();
  for (const record of item.records) { validateHistoryRecord(record); if (record.cardId !== item.cardId || ids.has(record.id)) throw new HistoryError('blocked', 'Invalid recovery association.'); ids.add(record.id); }
}
export function createHistoryDeletion(ports: {
  repository: ReturnType<typeof createHistoryRepository>; nextId: () => string;
  intents: { list: () => Promise<HistoryDeleteIntent[]>; write: (intent: HistoryDeleteIntent) => Promise<void>; remove: (id: string) => Promise<void> };
  verify: (document: HistoryDocument) => void;
  canRecoverCard?: (cardId: string) => boolean;
  cleanup: (before: HistoryDocument, after: HistoryDocument) => Promise<void>;
  wallet: () => { ready: boolean; generation: number; revision: number; cards: readonly Readonly<MembershipCard>[] };
}) {
  const locked = new Set<string>(), unresolved = new Set<string>();
  const reviews = new Map<string, { document: HistoryDocument; card: MembershipCard; generation: number; revision: number }>();
  const equal = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
  async function list() {
    const intents = await ports.intents.list(); unresolved.clear();
    for (const item of intents) { validateDeleteIntent(item); unresolved.add(item.cardId); }
    return intents;
  }
  const allowed = (id: string) => !locked.has(id) && !unresolved.has(id);
  const policy: CardHistoryDeletePolicy = {
    cancel(review) { reviews.delete(review.token); },
    async review(card) {
      await list();
      if (!allowed(card.id)) throw new HistoryError('blocked', 'An interrupted deletion needs review in My Keeps before deleting again.');
      const state = ports.wallet(), document = await ports.repository.load();
      if (!state.ready || !equal(state.cards.find(item => item.id === card.id), card)) throw new HistoryError('blocked', 'Check wallet status before deleting this card.');
      ports.verify(document);
      const records = document.records.filter(record => record.cardId === card.id), token = ports.nextId();
      reviews.set(token, { document, card: cloneHistory(card), generation: state.generation, revision: state.revision });
      return { token, records: records.length, receipts: records.reduce((count, record) => count + record.receipts.length, 0) };
    },
    async execute(review, card, writer) {
      const prepared = reviews.get(review.token); reviews.delete(review.token);
      if (!prepared || !allowed(card.id) || ports.repository.isBusy() || !equal(prepared.card, card)) return { ok: false, message: 'Deletion review expired or history is saving. Review the current history again.', requiresReinspection: false };
      locked.add(card.id);
      const admission = () => {
        const state = ports.wallet(); return state.ready && state.generation === prepared.generation && state.revision === prepared.revision
          && equal(state.cards.find(item => item.id === card.id), card);
      };
      try {
        const before = await ports.repository.load();
        if (!admission() || before.revision !== prepared.document.revision || !equal(before.records, prepared.document.records)) throw new HistoryError('revision_conflict', 'Wallet or history changed after the confirmation preview. Nothing was deleted.');
        ports.verify(before);
        const records = before.records.filter(record => record.cardId === card.id);
        if (!records.length) return await writer(); // Preserve the original card-only workflow.
        const intent: HistoryDeleteIntent = { schemaVersion: 1, id: ports.nextId(), cardId: card.id, cardName: card.name, historyRevision: before.revision, records: cloneHistory(records) };
        validateDeleteIntent(intent); unresolved.add(card.id);
        await ports.intents.write(intent); // Durable + readback verified BEFORE removing history.
        const after = await ports.repository.save({ ...before, records: before.records.filter(record => record.cardId !== card.id) }, before.revision, admission);
        if (!admission()) throw new HistoryError('blocked', 'Wallet changed after history removal. Preserved history is available for recovery.');
        const result = await writer(); // Existing Wallet Single Writer + exact readback.
        if (!result.ok) return { ...result, message: `${result.message} Preserved history is available in My Keeps recovery.`, requiresReinspection: true };
        if (ports.wallet().cards.some(item => item.id === card.id)) throw new HistoryError('commit_uncertain', 'Card deletion readback is not confirmed.');
        try {
          await ports.cleanup(before, after); await ports.intents.remove(intent.id); unresolved.delete(card.id);
          return result;
        } catch { return { ok: true, warning: 'Card and history deletion were verified. Receipt cleanup is incomplete or unconfirmed. Open My Keeps on another card to review recovery status.' }; }
      } catch (error) {
        return { ok: false, requiresReinspection: true, message: `${error instanceof HistoryError ? error.message : 'Deletion could not be confirmed.'} No automatic retry was made. Open My Keeps to review recovery.` };
      } finally { locked.delete(card.id); }
    },
  };
  return { policy, allowed, list,
    async recover(intentId: string) {
      const intents = await list(), intent = intents.find(item => item.id === intentId);
      if (!intent || locked.has(intent.cardId)) throw new HistoryError('blocked', 'Recovery is unavailable or already running.');
      const state = ports.wallet(); if (!state.ready) throw new HistoryError('blocked', 'Reinspect wallet and resolve canvas changes before recovery.');
      locked.add(intent.cardId);
      const unchanged = () => { const current = ports.wallet(); return current.ready && current.generation === state.generation && current.revision === state.revision
        && (!state.cards.some(card => card.id === intent.cardId) || !ports.canRecoverCard || ports.canRecoverCard(intent.cardId)); };
      try {
        const current = await ports.repository.load(), existing = current.records.filter(record => record.cardId === intent.cardId);
        if (state.cards.some(card => card.id === intent.cardId)) {
          if (ports.canRecoverCard && !ports.canRecoverCard(intent.cardId)) throw new HistoryError('blocked', 'Unlock the parent canvas before restoring its history.');
          if (existing.length && !equal(existing, intent.records)) throw new HistoryError('blocked', 'History changed. Recovery will not overwrite existing records.');
          if (!existing.length) {
            if (intent.records.some(record => current.records.some(item => item.id === record.id))) throw new HistoryError('blocked', 'A preserved record identifier conflicts. Nothing was restored.');
            await ports.repository.save({ ...current, records: [...current.records, ...intent.records] }, current.revision, unchanged);
          }
          const readback = await ports.repository.load(); ports.verify(readback);
          if (!equal(readback.records.filter(record => record.cardId === intent.cardId), intent.records))
            throw new HistoryError('commit_uncertain', 'Restored history readback was not confirmed. Recovery was preserved.');
          if (!unchanged()) throw new HistoryError('blocked', 'Wallet changed during recovery. Review again.');
          await ports.intents.remove(intent.id); unresolved.delete(intent.cardId);
          return 'Preserved history restored. The membership card is unchanged.';
        }
        if (existing.length) throw new HistoryError('blocked', 'History still exists for the removed card. No automatic deletion was attempted.');
        await ports.cleanup({ ...current, records: [...current.records, ...intent.records] }, current);
        if (!unchanged()) throw new HistoryError('blocked', 'Wallet changed during cleanup. Review again.');
        await ports.intents.remove(intent.id); unresolved.delete(intent.cardId);
        return 'Verified deletion cleanup completed.';
      } finally { locked.delete(intent.cardId); }
    },
  };
}
