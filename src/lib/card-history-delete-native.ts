import { Directory, File, Paths } from 'expo-file-system';
import { uuid } from 'expo';
import { createHistoryDeletion, validateDeleteIntent, type HistoryDeleteIntent } from './card-history-deletion';
import { deviceHistoryRepository, deviceReceiptStore, removeRetiredReceipts } from './card-history-native';
import type { createPreparedWalletRuntime } from './wallet-cutover-runtime';
import { HistoryError } from './card-history';

export const HISTORY_DELETE_DIRECTORY = 'bemem-history-deletions';
export function createDeviceHistoryDeletion(owner: ReturnType<typeof createPreparedWalletRuntime>) {
  const folder = () => new Directory(Paths.document, HISTORY_DELETE_DIRECTORY);
  function file(id: string, pending = false) {
    if (!/^[a-zA-Z0-9-]{1,80}$/.test(id)) throw Error('Invalid recovery reference.');
    return new File(folder(), `${id}.${pending ? 'pending' : 'json'}`);
  }
  return createHistoryDeletion({
    repository: deviceHistoryRepository, nextId: () => uuid.v4(), cleanup: removeRetiredReceipts,
    verify(doc) { for (const record of doc.records) for (const receipt of record.receipts) deviceReceiptStore.verifyArtwork(receipt); },
    wallet() {
      const current = owner.getSnapshot();
      return { ready: current.state.source === 'v2' && current.state.editsAllowed && !current.state.dirty && !current.state.saving,
        generation: current.state.generation, revision: current.session?.revision ?? -1,
        cards: current.session?.saved.cards.filter(card => card.kind === 'membership').filter(card=>owner.pages?.canEditCard(card.id)??true) ?? [] };
    },
    intents: {
      async list() {
        const entry = Paths.document.list().find(item => item.name === HISTORY_DELETE_DIRECTORY);
        if (!entry) return [];
        if (!(entry instanceof Directory)) throw new HistoryError('blocked', 'Deletion recovery is unreadable. No data was changed.');
        const result: HistoryDeleteIntent[] = [];
        for (const item of entry.list()) {
          if (!(item instanceof File) || !/^[a-zA-Z0-9-]{1,80}\.json$/.test(item.name)) throw new HistoryError('pending', 'Pending or unreadable deletion recovery requires review. No deletion was retried.');
          const parsed: unknown = JSON.parse(await item.text()); validateDeleteIntent(parsed);
          if (item.name !== `${parsed.id}.json`) throw Error('Invalid deletion recovery name.');
          result.push(parsed);
        }
        return result;
      },
      async write(intent) {
        validateDeleteIntent(intent); const raw = JSON.stringify(intent);
        folder().create({ idempotent: true, overwrite: false });
        const pending = file(intent.id, true); pending.create({ overwrite: false }); await pending.write(raw);
        if (await pending.text() !== raw) throw Error('Recovery readback failed.');
        await pending.move(file(intent.id), { overwrite: false });
        if (await file(intent.id).text() !== raw) throw Error('Recovery commit could not be verified.');
      },
      async remove(id) { await file(id).delete(); },
    },
  });
}
