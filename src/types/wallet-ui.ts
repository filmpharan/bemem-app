export type Orientation = 'landscape' | 'portrait';
export type Position = { col: number; row: number };
export type CanvasLayout = Record<string, Position>;
export type PreviewCard = {
  id: string;
  name: string;
  orientation: Orientation;
  colors: readonly [string, string];
};

export type CanvasDocument = {
  schemaVersion: 1;
  dataset: 'bemem-phase1-demo-v1';
  revision: number;
  savedAt: string;
  columns: 12;
  layout: CanvasLayout;
};
