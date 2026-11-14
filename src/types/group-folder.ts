import type { Orientation, Position } from './wallet-ui';

/** Relationships only. Member cards, photos and history keep their existing IDs. */
export type GroupFolder = {
  id: string;
  name: string;
  orientation: Orientation;
  position: Position;
  memberCardIds: string[];
};
export type CanvasFolders = { version: 1; items: GroupFolder[] };
