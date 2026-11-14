/** Read-only delivery scope; deliberately has no Wallet/Writer dependency. */
export function createCardShareSession(ports: {
  available: () => Promise<boolean>; publish: (previewUri: string, expectedDigest?: string) => Promise<string>;
  open: (uri: string) => Promise<void>; removePreview: (uri: string) => Promise<void>;
}) {
  let busy = false, closed = false;
  const previews = new Map<string, string | undefined>();
  return {
    track(uri: string, digest?: string) {
      if (closed) { void ports.removePreview(uri).catch(() => {}); return false; }
      previews.set(uri, digest); return true;
    },
    async share(uri: string) {
      if (busy || closed) return { ok: false as const, message: 'This preview is not ready to share.' };
      if (!previews.has(uri)) return { ok: false as const, needsPreparation: true, message: 'Prepare this preview again before sharing.' };
      busy = true; // Synchronous duplicate barrier before any await.
      let stage: 'availability' | 'publish' | 'open' = 'availability';
      try {
        if (!await ports.available()) return { ok: false as const, message: 'Native image sharing is unavailable on this device.' };
        if (closed) return { ok: false as const, message: 'Sharing was cancelled.' };
        stage = 'publish';
        const published = await ports.publish(uri, previews.get(uri));
        if (closed) return { ok: false as const, message: 'Sharing was cancelled.' };
        stage = 'open'; await ports.open(published);
        // Android's chooser result does not prove delivery or distinguish every cancellation.
        return { ok: true as const, message: 'Returned from sharing. Delivery or cancellation is handled by the selected app.' };
      } catch { return { ok: false as const, needsPreparation: stage === 'publish', message: 'Sharing was closed or could not be opened. Your card is unchanged. You can try again.' }; }
      finally { busy = false; }
    },
    async discard(uri: string) { if (previews.delete(uri)) { try { await ports.removePreview(uri); } catch { /* Cache can be reclaimed by the OS. */ } } },
    async close() { closed = true; for (const uri of previews.keys()) { try { await ports.removePreview(uri); } catch { /* Never broaden cleanup to permanent files. */ } } previews.clear(); },
    isBusy: () => busy,
  };
}
