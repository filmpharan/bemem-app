import type { CanvasDocument, CanvasLayout, PreviewCard } from '../types/wallet-ui';
import { cloneLayout, validateLayout } from './canvas-layout';

// Storage interface allows failure/restart tests without pretending Node is Android.
export type CanvasFiles = {
  list: () => Promise<string[]>;
  read: (name: string) => Promise<string>;
  commit: (name: string, text: string) => Promise<void>;
};
export const COMMIT_PATTERN = /^layout-(\d{10})\.json$/;

export function decodeDocument(text: string, cards: PreviewCard[]): CanvasDocument {
  const doc = JSON.parse(text) as CanvasDocument;
  if (!doc || doc.schemaVersion !== 1 || doc.dataset !== 'bemem-phase1-demo-v1'
    || doc.columns !== 12 || !Number.isSafeInteger(doc.revision) || doc.revision < 1
    || doc.revision > 9999999999 || typeof doc.savedAt !== 'string' || !Number.isFinite(Date.parse(doc.savedAt))) {
    throw new Error('Unknown or damaged Canvas document');
  }
  return { ...doc, layout: validateLayout(doc.layout, cards) };
}

export function createCanvasRepository(files: CanvasFiles, cards: PreviewCard[]) {
  let writing = false;
  async function load(): Promise<CanvasDocument | null> {
    const names = (await files.list()).filter(name => COMMIT_PATTERN.test(name)).sort();
    const name = names.at(-1);
    if (!name) return null;
    // Deliberately fail closed on a corrupt latest version, retaining every file.
    const doc = decodeDocument(await files.read(name), cards);
    if (doc.revision !== Number(COMMIT_PATTERN.exec(name)![1])) throw new Error('Revision mismatch');
    return doc;
  }
  return {
    load,
    async save(layout: CanvasLayout, expectedRevision: number): Promise<CanvasDocument> {
      if (writing) throw new Error('A save is already in progress');
      writing = true;
      try {
        const valid = validateLayout(layout, cards);
        // Re-read before committing: never silently overwrite unreadable/newer data.
        const previous = await load();
        if ((previous?.revision ?? 0) !== expectedRevision) throw new Error('Saved Canvas changed; reopen the app');
        const doc: CanvasDocument = {
          schemaVersion: 1, dataset: 'bemem-phase1-demo-v1', columns: 12,
          revision: expectedRevision + 1, savedAt: new Date().toISOString(), layout: cloneLayout(valid),
        };
        const text = JSON.stringify(doc, null, 2);
        decodeDocument(text, cards);
        await files.commit(`layout-${String(doc.revision).padStart(10, '0')}.json`, text);
        return doc;
      } finally {
        writing = false;
      }
    },
  };
}
