import type { DecorationAssetId } from '../lib/decoration-catalog';
import type { Position } from './wallet-ui';
export type Decoration = { id: string; assetId: DecorationAssetId; position: Position; rotation: 0 | 90 | 180 | 270 };
export type CanvasDecorations = { version: 1; items: Decoration[] };
