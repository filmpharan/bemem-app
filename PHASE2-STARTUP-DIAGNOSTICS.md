# Step 2C.2 — Read-only runtime diagnostics

Prepared for manual Samsung validation, not a switch to v2 startup. Home/Create and their existing Saved/Draft, Save/Discard/Cancel and Phase 1 storage remain unchanged. No code in the ordinary startup calls this inspection.

## Open and run

1. Start `npx.cmd expo start --clear` from bemem-app.
2. In Expo Go open `exp://<LAN-IP>:<PORT>/--/dev-wallet-startup`, using the host/port shown by Expo CLI.
3. Press **Inspect Wallet Startup** manually. Opening the page performs no wallet I/O. Outside `__DEV__`, the page redirects to Home and the reader function rejects before reading files.
4. Keep a screenshot of the status/metadata. No automatic export, console logging or analytics exists.

Unlike `/dev-wallet-test`, this page is authorized to READ the real v1/v2 folders. It cannot create test data, corrupt snapshots, migrate to disk, clear files or invoke Save. Do not create corrupt fixtures in real wallet folders to exercise statuses. Automated synthetic tests cover those cases separately.

## Status interpretation

- `v2 valid`: latest committed v2 validated; v1 is not read.
- `v1 available / migration ready in memory`: no committed v2; the existing v1 reader and validator plus `prepareMigration` prepared v2 only in memory. IDs/colors/positions/revision/savedAt are retained.
- `Empty wallet (memory only)`: no committed v2 or v1; no file is created. A Phase 1 demo screen does not itself imply an existing saved v1 file.
- `v2 corrupt / unsupported / unreadable`: blocked, no fallback to earlier revisions or v1. Error codes distinguish unsupported schema, invalid snapshot, revision mismatch and read errors.
- `Pending transaction detected (not committed)`: inventory finds pending files, even if the newest committed v2 is corrupt. Pending files are not read as successful commits or promoted. If inventory cannot be read, pending status is Not Verified.
- `Canvas compatibility blocked`: at least one card's bottom edge exceeds the existing 240-row limit. Portrait occupies 6 rows, landscape 4. No coordinates are clamped, moved, dropped or supplied to the actual Canvas.

UI receives only source, revision, card count, pending count, compatibility and safe error/status strings. It receives no wallet document, card IDs/names, membership numbers or code payloads.

## Read-only evidence and limits

The native facade wraps the existing v2 adapter's list/read methods and provides forbidden-write stubs to the repository; it passes only load/prepareMigration to the resolver. v1 uses the existing `canvasStorage.load()` method. Neither path calls write/move/delete/import. No directory creation occurs.

For a selected nonempty snapshot, diagnostics resolves a second time and compares the complete validated document in memory. `unchanged` means selected source/content, including revision and savedAt, were equal across the two reads; `changed` warns about a concurrent modification. No raw content is displayed or logged. This is not an all-files checksum, a filesystem lock, or proof that another actor did not write between reads. Empty/blocked states cannot give this readback guarantee.

Tests use synthetic snapshots and mocked native methods that throw on create/write/move/delete. Both ordinary Phase 1 regression suites and these diagnostics tests must pass. Real Samsung results remain Not Verified until the user presses Inspect.

## Before v2 adoption

Approval is still needed for runtime reader selection, migration consent and first persistence, blocked/pending/recovery UX, revision-conflict/uncertain-commit handling, and Saved/Draft/card-detail integration. Existing demo fixtures must not replace a selected v2 wallet.

Dynamic Canvas proposal for a later scope: preserve every existing logical coordinate; derive content rows from maximum card bottom plus an editing margin; use sparse viewport-based grid/card rendering and chunked/windowed scrolling for long content; place new cards in available cells or append rows without moving existing cards. Handle Search presentation with the same dynamic bounds and add tests for scroll limits/performance. Do not increase a hard cap and assume every native scroll coordinate is safe. Until approved and implemented, any incompatible wallet must remain blocked from the current Canvas rather than truncated.
