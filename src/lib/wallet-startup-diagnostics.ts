import { resolveWalletStartup, type WalletStartupReaders } from './wallet-startup';
import { MAX_ROWS, cardSize } from './canvas-layout';

export type StartupDiagnostics = {
  states: string[];
  source: 'v2' | 'v1-memory' | 'empty' | 'blocked-v2' | 'blocked-v1' | 'blocked-empty';
  revision: number | null;
  cardCount: number | null;
  pendingCount: number | null;
  canvas: 'compatible' | 'blocked' | 'not-verified';
  readback: 'unchanged' | 'changed' | 'not-applicable' | 'not-verified';
  errorCode: string | null;
};

/** Returns metadata/status only. No card objects, IDs, names, numbers or payloads. */
export async function diagnoseWalletStartup(readers: WalletStartupReaders,
  inspectV2: () => Promise<{ pendingFiles: string[] }>): Promise<StartupDiagnostics> {
  let pendingCount: number | null = null;
  try { pendingCount = (await inspectV2()).pendingFiles.length; } catch { /* Resolver supplies the authoritative error below. */ }
  const result = await resolveWalletStartup(readers);
  const states: string[] = [];
  if (pendingCount) states.push('Pending transaction detected (not committed)');
  if (pendingCount === null) states.push('Pending transaction status not verified');
  if (result.status === 'blocked') {
    states.unshift(result.source === 'v2' ? 'v2 corrupt / unsupported / unreadable' : 'Startup data unavailable');
    return { states, source: `blocked-${result.source}`, revision: null, cardCount: null, pendingCount,
      canvas: 'not-verified', readback: 'not-verified',
      errorCode: [result.error.code, result.error.validationCode].filter(Boolean).join(' / ') };
  }
  states.unshift(result.source === 'v2' ? 'v2 valid' : result.source === 'v1-memory'
    ? 'v1 available / migration ready in memory' : 'Empty wallet (memory only)');
  const wallet = result.wallet;
  const compatible = wallet.cards.every(card => {
    const position = wallet.canvas.layout[card.id];
    // Only geometry is inspected: never clamp, reflow or pass the document into UI.
    const size = cardSize({ ...card, colors: ['#000000', '#ffffff'] });
    return position.row + size.rows <= MAX_ROWS;
  });
  states.push(compatible ? 'Canvas compatible with current 240-row limit' : 'Canvas compatibility blocked');
  let readback: StartupDiagnostics['readback'] = 'not-applicable';
  if (result.source !== 'empty') {
    const again = await resolveWalletStartup(readers);
    readback = again.status === 'ready' && again.source === result.source
      && JSON.stringify(again.wallet) === JSON.stringify(wallet) ? 'unchanged' : 'changed';
    if (readback === 'changed') states.push('Data changed during inspection; run diagnostics again');
  }
  return { states, source: result.source, revision: wallet.revision, cardCount: wallet.cards.length,
    pendingCount, canvas: compatible ? 'compatible' : 'blocked', readback, errorCode: null };
}
