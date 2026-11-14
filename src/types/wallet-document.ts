import type { WalletCard } from './membership-card';
import type { CanvasLayout } from './wallet-ui';
import type { CanvasDecorations } from './decoration';
import type { CanvasPageMetadata } from '../lib/canvas-pages';

/** Persisted-shape contract only; Step 1 does not read/write this in the app. */
export type WalletDocument = {
  schemaVersion: 2;
  dataset: 'bemem-wallet';
  revision: number;
  savedAt: string;
  cards: WalletCard[];
  canvas: {
    columns: 12;
    // Rows grow with content, independent of screen pixels; no stored row ceiling.
    layout: CanvasLayout;
    /** Optional additive extension. Absent legacy snapshots remain absent on reads. */
    decorations?: CanvasDecorations;
    /** Additive v1 page extension; absent records belong to Canvas 1. */
    pages?: CanvasPageMetadata;
    /** Additive relationship extension; absent legacy snapshots remain absent. */
    folders?: import('./group-folder').CanvasFolders;
  };
};
