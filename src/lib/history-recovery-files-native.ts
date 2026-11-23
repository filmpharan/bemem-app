import { Directory, File, Paths } from 'expo-file-system';
import { HistoryError } from './card-history';

// Both recovery types use the existing deletion-intent directory, not a second history store.
export const HISTORY_DELETE_DIRECTORY = 'bemem-history-deletions';
export function recoveryFiles<T extends { id: string }>(notification: boolean, validate: (value: unknown) => asserts value is T) {
  const folder = () => new Directory(Paths.document, HISTORY_DELETE_DIRECTORY);
  const prefix = notification ? 'notification.' : '';
  const name = (id: string) => `${prefix}${id}.json`;
  const file = (id: string, pending = false) => {
    if (!/^[a-zA-Z0-9-]{1,80}$/.test(id)) throw Error('Invalid recovery reference.');
    return new File(folder(), pending ? `${prefix}${id}.pending` : name(id));
  };
  return {
    async list(): Promise<T[]> {
      const entry = Paths.document.list().find(item => item.name === HISTORY_DELETE_DIRECTORY);
      if (!entry) return [];
      if (!(entry instanceof Directory)) throw new HistoryError('blocked', 'Recovery storage is unreadable. No action was retried.');
      const result: T[] = [];
      for (const item of entry.list()) {
        if (!(item instanceof File) || !/^(notification\.)?[a-zA-Z0-9-]{1,80}\.(json|pending)$/.test(item.name))
          throw new HistoryError('blocked', 'Unrecognized recovery evidence requires review.');
        if (/^notification\.[a-zA-Z0-9-]{1,80}\.(json|pending)$/.test(item.name) !== notification) continue;
        if (item.name.endsWith('.pending')) throw new HistoryError('pending', 'An incomplete recovery intent needs storage review. No action was retried.');
        let parsed: unknown;
        try { parsed = JSON.parse(await item.text()); }
        catch { throw new HistoryError('blocked', 'Recovery evidence is unreadable. No action was retried.'); }
        validate(parsed);
        if (item.name !== name(parsed.id)) throw new HistoryError('blocked', 'Recovery identity mismatch.');
        result.push(parsed);
      }
      return result;
    },
    async write(intent: T) {
      validate(intent); const raw = JSON.stringify(intent);
      folder().create({ idempotent: true, overwrite: false });
      const pending = file(intent.id, true); pending.create({ overwrite: false }); await pending.write(raw);
      if (await pending.text() !== raw) throw Error('Recovery readback failed.');
      await pending.move(file(intent.id), { overwrite: false });
      if (await file(intent.id).text() !== raw) throw Error('Recovery commit could not be verified.');
    },
    async remove(id: string) {
      await file(id).delete();
      if (file(id).exists) throw Error('Recovery cleanup could not be verified.');
    },
  };
}
