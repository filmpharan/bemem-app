import type { CanvasLayout, PreviewCard } from '../types/wallet-ui';

// Developer-only fixture switch. Empty search results must NEVER enable Home's FAB.
export const PREVIEW_EMPTY_WALLET: boolean = false;

export const PREVIEW_CARDS: PreviewCard[] = PREVIEW_EMPTY_WALLET ? [] : [
  { id: 'demo-coffee', name: 'Coffee Club', orientation: 'landscape', colors: ['#292d38', '#843348'] },
  { id: 'demo-everyday', name: 'Everyday Club', orientation: 'portrait', colors: ['#008a86', '#49bba0'] },
  { id: 'demo-travel', name: 'Travel Club', orientation: 'landscape', colors: ['#244eab', '#189ac0'] },
  { id: 'demo-weekend', name: 'Weekend Club', orientation: 'portrait', colors: ['#6c3c9b', '#bc65a9'] },
];

export const INITIAL_LAYOUT: CanvasLayout = PREVIEW_EMPTY_WALLET ? {} : {
  'demo-coffee': { col: 0, row: 0 },
  'demo-everyday': { col: 7, row: 0 },
  'demo-travel': { col: 0, row: 5 },
  'demo-weekend': { col: 7, row: 7 },
};
