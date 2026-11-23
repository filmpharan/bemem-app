import { uuid } from 'expo';
import { createHistoryDeletion, validateDeleteIntent, type HistoryDeleteIntent } from './card-history-deletion';
import { deviceHistoryRepository, deviceReceiptStore, removeRetiredReceipts } from './card-history-native';
import type { createPreparedWalletRuntime } from './wallet-cutover-runtime';
import { recoveryFiles, HISTORY_DELETE_DIRECTORY } from './history-recovery-files-native';
export { HISTORY_DELETE_DIRECTORY };

export function createDeviceHistoryDeletion(owner: ReturnType<typeof createPreparedWalletRuntime>) {
  return createHistoryDeletion({
    repository: deviceHistoryRepository, nextId: () => uuid.v4(), cleanup: removeRetiredReceipts,
    canRecoverCard: cardId => owner.pages?.canEditCard(cardId) ?? true,
    verify(doc) { for (const record of doc.records) for (const receipt of record.receipts) deviceReceiptStore.verifyArtwork(receipt); },
    wallet() {
      const current = owner.getSnapshot();
      return { ready: current.state.source === 'v2' && current.state.editsAllowed && !current.state.dirty && !current.state.saving,
        generation: current.state.generation, revision: current.session?.revision ?? -1,
        cards: current.session?.saved.cards.filter(card => card.kind === 'membership') ?? [] };
    },
    intents: recoveryFiles<HistoryDeleteIntent>(false, validateDeleteIntent),
  });
}
