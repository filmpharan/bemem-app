# Phase 2 — Step 2C.1: Safe startup preparation

Read-only integration building blocks. Not imported by Home/Create, the current startup hook, or the developer FileSystem harness. Existing Step 1/2A/2B code is unchanged.

## Resolution contract

`resolveWalletStartup({ v2: { load, prepareMigration }, readV1, demoCards, now? })`

The injected interface deliberately contains no `save`, `importPhase1`, filesystem writer, recovery restore or cleanup method. The caller will supply the existing repository readers only after runtime adoption is approved.

1. Call v2 `load()`, which validates the latest committed revision. Validate the returned document again before exposing it. Valid v2 wins without reading v1.
2. Only if v2 returns `document: null`, call the existing v1 reader. A valid v1 document passes `prepareMigration` (including original v1 validation again) and becomes a memory-only v2 wallet.
3. If both readers return null, prepare empty schemaVersion 2, revision 0, no demo cards and empty layout. `savedAt` comes from the supplied clock/current time; nothing is persisted.
4. Any v2 failure returns `status: blocked`, `writeBlocked: true` and sanitized error codes. Never silently select older revisions/v1 or invent an empty wallet after an error. Invalid/unreadable v1 similarly blocks rather than resetting data.

Ready results distinguish:

| source | expectedV2Revision | nextPersistence |
| --- | --- | --- |
| `v2` | Existing committed revision | `save`, only on a future explicit user action |
| `v1-memory` | 0 because no v2 commit exists | `explicit-phase1-import` |
| `empty` | 0 | `save`, only on a future explicit user action |

Migrated wallet metadata retains the legacy revision and savedAt. Do NOT call ordinary `save(migratedRevision7, 0)`; the future confirmed import must use the explicit migration API. No import is executed here.

Pending files remain uncommitted. Ready results include their names and `requiresPendingReview: true`; future UI must surface this warning, not claim a pending write succeeded. Empty resolution with pending evidence is not a recovery or permission to discard that evidence.

## Saved / Draft / presentation

- `prepareWalletState(document)` validates/deep-copies the input twice, deep-freezes Saved, keeps Draft mutable and separate, and sets prepared mode to Home.
- `walletCanvasPresentation(document)` returns detached view cards and logical positions for any validated card count. Demo colors and IDs remain exact. Membership appearance, orientation and IDs are preserved; payload/memberNumber do not enter the Canvas view DTO.
- `walletSearchPresentation(document, query, open)` returns another detached, stable matched-first shelf presentation. Clear/closed Search returns a detached copy of original logical positions. It never mutates Saved/Draft or calls repositories.
- v2 preparation supports rows beyond 240 without altering legacy helpers. It is NOT permission to send these rows into the current 240-row Canvas UI. Capacity/virtualization policy needs approval before runtime adoption so long wallets are never silently clipped.

No schema changes, new encoders/forms, startup reads/writes, migration commits or screen behavior changes are introduced in this step.

## Verification and Step 2C.2 gate

The new Node suite uses synthetic cards, mocked storage and real repository/legacy validators. Forbidden writer spies remain at zero. It tests precedence, corrupt/unsupported latest v2, legacy preservation, empty startup, pending evidence, independent Draft, immutable Saved, variable card counts, search isolation and rows beyond 240. Device runtime behavior is not claimed by these tests.

Before Step 2C.2: approve wiring readers into startup, blocked/error UI and pending warnings, explicit first-import consent, separate persistence handling for migrated/new/existing wallets, and Saved/Draft/card-view integration. Define how the existing UI handles v2 wallets exceeding 240 rows (separate dynamic-capacity work or an explicit safe gate; never truncation). Save/Discard/Cancel adoption, real recovery writes and any forms remain subject to their approved scope. Re-read/check revisions on future Save; a read-only startup snapshot is not a storage lock.
