import { decodeDocument } from './canvas-repository';
import { validateWalletDocument, WalletValidationError } from './wallet-validation';
import type { PreviewCard } from '../types/wallet-ui';
import type { WalletDocument } from '../types/wallet-document';

/** Pure conversion of caller-supplied JSON. No storage imports or implicit migration on startup. */
export function migratePhase1Wallet(text: string, demoCards: PreviewCard[]): WalletDocument {
  let legacy;
  try {
    // A v1 reader may retain unknown root metadata. v2 cannot represent it: fail
    // closed rather than silently dropping it during conversion. v1 reader is unchanged.
    const source = JSON.parse(text);
    const keys = ['schemaVersion', 'dataset', 'revision', 'savedAt', 'columns', 'layout'];
    if (!source || typeof source !== 'object' || Array.isArray(source)
      || Object.keys(source).some(key => !keys.includes(key))) throw new Error('Unsupported legacy metadata');
    // Keep Phase 1's own schema/dataset/layout/collision rules as the first gate.
    legacy = decodeDocument(text, demoCards);
  } catch {
    throw new WalletValidationError('invalid_legacy_document', 'wallet');
  }
  return validateWalletDocument({
    schemaVersion: 2,
    dataset: 'bemem-wallet',
    revision: legacy.revision,
    savedAt: legacy.savedAt,
    cards: demoCards.map(card => ({ kind: 'demo', id: card.id, name: card.name,
      orientation: card.orientation, colors: [...card.colors] })),
    canvas: { columns: 12, layout: legacy.layout },
  });
}
