import type { CardSizePresetId } from '../lib/card-size-presets';

export type Orientation = 'landscape' | 'portrait';
export type Position = { col: number; row: number };
export type CanvasLayout = Record<string, Position>;
export type PreviewCard = {
  id: string;
  name: string;
  orientation: Orientation;
  colors: readonly [string, string];
  /** Display/geometry DTO only, not an extension of either persisted schema. */
  sizePresetId?: CardSizePresetId;
  kind?: 'demo' | 'membership' | 'decoration' | 'folder';
  folder?: { members: PreviewCard[] };
  decoration?: Pick<import('./decoration').Decoration, 'assetId' | 'rotation'>;
  appearance?: import('./membership-card').MembershipCard['appearance'];
};

export type CanvasDocument = {
  schemaVersion: 1;
  dataset: 'bemem-phase1-demo-v1';
  revision: number;
  savedAt: string;
  columns: 12;
  layout: CanvasLayout;
};
