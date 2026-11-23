# bemem safety invariants

Current working-tree contract, reviewed 2026-11-23. This is documentation of existing code, not permission to change storage or operate on a device. Source locations are project-relative; line references identify the reviewed implementation.

| # | Invariant | Source evidence / required developer constraint |
| --- | --- | --- |
| 1 | One Wallet Owner and Coordinator | `src/components/bemem/WalletRuntimeProvider.tsx:5`, `src/lib/wallet-runtime-owner.ts:30`: Root owns the Runtime; do not construct independent writers in hooks/pages. |
| 2 | Owner generation and revision remain current | `src/lib/wallet-feature-commands.ts:19`, `src/lib/card-history-commands.ts:7`, `src/components/bemem/KeepsSheet.tsx:83`: reject callbacks/capabilities from old Card/Owner/revision/page contexts. |
| 3 | No unsafe v2-to-v1 writer fallback | `src/lib/wallet-coordinator.ts:45`: v2 barrier prevents v1 writer revival after committed/invalid v2 evidence. Corruption is not permission to use an older writer. |
| 4 | Cards and Canvas form one Wallet snapshot | `src/lib/wallet-repository.ts:126`: validate/commit them together. This application-level snapshot contract is not a claim of power-loss or multi-store atomicity. |
| 5 | Pending is not Empty | `src/lib/wallet-repository.ts:77`, `src/lib/card-history-repository.ts:33`: foreign/missing pending evidence blocks writes; never delete it to unlock a Save. |
| 6 | Commit Uncertain requires inspection | `src/lib/wallet-repository.ts:70`, `src/lib/card-history-repository.ts:24`: only explicit successful inspection/readback can acknowledge uncertainty; internal preflight reads do not imply success. |
| 7 | No automatic uncertain mutation retry | `src/lib/wallet-repository.ts:98`, `src/lib/keep-media-files.ts:44`, `src/components/bemem/KeepEditor.tsx:78`: preserve evidence; do not duplicate Save, copy, deletion or notification operations. |
| 8 | History and Wallet are separate stores | `src/lib/card-history-native.ts:12`, `src/lib/card-history-delete-native.ts:8`: do not represent card/history/receipt deletion as one atomic Wallet write. Keep the existing recoverable cross-store order. |
| 9 | Durable recovery intent and verified Readback | `src/lib/keep-recovery.ts:22`, `src/lib/history-recovery-files-native.ts:6`, `src/lib/card-history-deletion.ts`: persist intent, verify cancellation/deletion and Readback before removing recovery evidence. Never recreate missing records blindly. |
| 10 | Picker, Retain and Save are distinct | `src/lib/receipt-picker.ts:38`, `src/components/bemem/KeepEditor.tsx:39`, `src/components/bemem/KeepsSheet.tsx:86`: native selection may create SDK cache media, but must not bypass guarded Documents retention or final Save. |
| 11 | Cleanup needs proven ownership and reference checks | `src/lib/keep-media-files.ts:14`, `src/lib/card-history-native.ts:62`: only exact newly reserved receipt paths; referenced/foreign/original files are preserved. Unknown ownership/cleanup remains Needs Review; no broad sweep. |
| 12 | Native queue absence is not delivery proof | `src/lib/keep-recovery.ts:150`, `src/lib/keep-notifications.ts:3`: absence means not currently pending, not delivered/cancelled/never scheduled. Do not persist an invented delivered outcome. |
| 13 | Timeout does not cancel or release a native mutation | `src/components/bemem/keeps-lifecycle.ts:34`, `src/components/bemem/KeepEditor.tsx:53`: observation deadlines report delay; original promise/lease remains owned until settlement. No second operation based on a timer alone. |
| 14 | Silent Loading must preserve real errors | `src/components/bemem/KeepsSheet.tsx:50`, `src/components/bemem/KeepsSheet.tsx:67`, `src/lib/keep-recovery.ts:150`: list loading is independent of inspection; short checks can be quiet, but stale/failed/uncertain evidence must remain visible and guarded. |

## Additional boundaries

- Preserve stable Card IDs, exact Number/Payload strings, crop/zoom/pan, all nine footprints, 12 columns, full-block collision geometry, 0.1-block visual inset and 14dp corners.
- Read-only viewing/search must not rewrite saved layout. Arrange Save/Discard/Stay and Decorate entry-draft/Undo/Redo behavior are established contracts.
- `src/constants/wallet-release.ts` currently approves the explicit cutover path. That does not authorize automatic Import, reset, or running it on Samsung during handoff.
- Local files are not certified encrypted or excluded from OS backup. Existing JS-process locks do not prevent every multi-process race, crash or power-loss failure.
- Unsaved receipt tickets are process-local. Durable notification/card-deletion intents do not make unsaved image tracking durable. See KNOWN-ISSUES.
- Relevant regression files: `scripts/test-wallet-coordinator.cjs`, `test-repository-safety-gate.cjs`, `test-card-history.cjs`, `test-keeps.cjs`, `test-keep-recovery.cjs`, `test-keep-media.cjs`, `test-photo-performance.cjs`.
