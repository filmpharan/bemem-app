import { Directory, File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

import { PREVIEW_CARDS } from '../data/wallet-preview';
import { createCanvasRepository, type CanvasFiles } from './canvas-repository';

// The empty fixture has a separate namespace; it cannot overwrite the populated fixture.
const directoryName = PREVIEW_CARDS.length ? 'bemem-phase1-canvas' : 'bemem-phase1-empty-canvas';

function documents() {
  if (Platform.OS === 'web') throw new Error('Phase 1 storage requires Android or iOS');
  return Paths.document;
}

function canvasDirectory() { return new Directory(documents(), directoryName); }

const files: CanvasFiles = {
  async list() {
    // List the readable parent rather than trusting exists=false (which also means no access).
    const folder = documents().list().find(entry => entry.name === directoryName);
    if (!folder) return [];
    if (!(folder instanceof Directory)) throw new Error('Canvas path is not a directory');
    return folder.list().map(entry => entry.name);
  },
  async read(name) { return new File(canvasDirectory(), name).text(); },
  async commit(name, text) {
    const directory = canvasDirectory();
    directory.create({ idempotent: true });
    // Pending files are never loaded. A failed/interrupted write leaves the last commit intact.
    const pending = new File(directory, `${name}.${Date.now()}-${Math.random().toString(36).slice(2)}.pending`);
    pending.create();
    await pending.write(text);
    if (await pending.text() !== text) throw new Error('Canvas verification failed');
    // SDK 58 async API; never overwrite a committed revision.
    await pending.move(new File(directory, name), { overwrite: false });
  },
};

export const canvasStorage = createCanvasRepository(files, PREVIEW_CARDS);
