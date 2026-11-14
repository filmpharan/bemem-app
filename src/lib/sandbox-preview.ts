import { CARD_SIZE_PRESETS } from './card-size-presets';
import { canPlace, cloneLayout, firstFreePosition } from './canvas-layout';
import type { CanvasLayout, Position, PreviewCard } from '../types/wallet-ui';

/** Synthetic, memory-only fixture. No wallet readers, repository, migration or storage. */
export type SandboxPreview = { cards: PreviewCard[]; layout: CanvasLayout };
export function appendSandboxSamples(state: SandboxPreview): SandboxPreview {
  const cards = [...state.cards], layout = cloneLayout(state.layout);
  for (const preset of CARD_SIZE_PRESETS) {
    const card: PreviewCard = { id: `sandbox-${cards.length}-${preset.id}`, name: preset.label,
      orientation: preset.orientation, sizePresetId: preset.id, kind: 'demo', colors: ['#244eab', '#189ac0'] };
    const position = firstFreePosition(card, cards, layout);
    if (!position) throw new Error('No valid sample placement');
    layout[card.id] = position; cards.push(card);
  }
  return { cards, layout };
}
export function initialSandboxPreview(): SandboxPreview { return appendSandboxSamples({ cards: [], layout: {} }); }
export function moveSandboxSample(state: SandboxPreview, id: string, position: Position): SandboxPreview {
  const card = state.cards.find(candidate => candidate.id === id);
  if (!card || !canPlace(card, position, state.cards, state.layout, Infinity)) return state;
  return { ...state, layout: { ...state.layout, [id]: { ...position } } };
}
