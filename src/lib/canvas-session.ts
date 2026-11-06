import type { CanvasDocument, CanvasLayout, Position, PreviewCard } from '../types/wallet-ui';
import { canPlace, cloneLayout, sameLayout } from './canvas-layout';

export type CanvasSession = {
  mode: 'home' | 'create';
  saved: CanvasLayout;
  draft: CanvasLayout;
  revision: number;
  exitPrompt: boolean;
};
export type CanvasAction =
  | { type: 'load' | 'saved'; document: CanvasDocument }
  | { type: 'enter' | 'leave' | 'discard' | 'cancel' | 'saveFailed' }
  | { type: 'move'; id: string; position: Position; cards: PreviewCard[] };

export function initialSession(layout: CanvasLayout): CanvasSession {
  return { mode: 'home', saved: cloneLayout(layout), draft: cloneLayout(layout), revision: 0, exitPrompt: false };
}

export function canvasSession(state: CanvasSession, action: CanvasAction): CanvasSession {
  switch (action.type) {
    case 'load':
    case 'saved':
      return { mode: 'home', saved: cloneLayout(action.document.layout), draft: cloneLayout(action.document.layout), revision: action.document.revision, exitPrompt: false };
    case 'enter':
      return { ...state, mode: 'create', draft: cloneLayout(state.saved), exitPrompt: false };
    case 'leave':
      return sameLayout(state.saved, state.draft) ? { ...state, mode: 'home' } : { ...state, exitPrompt: true };
    case 'cancel':
    case 'saveFailed':
      return { ...state, exitPrompt: false };
    case 'discard':
      return { ...state, mode: 'home', draft: cloneLayout(state.saved), exitPrompt: false };
    case 'move': {
      const card = action.cards.find(c => c.id === action.id);
      if (state.mode !== 'create' || !card || !canPlace(card, action.position, action.cards, state.draft)) return state;
      return { ...state, draft: { ...state.draft, [card.id]: { ...action.position } } };
    }
  }
}
