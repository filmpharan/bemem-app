# Safe Cutover — Step 1: headless WalletCoordinator

Coordinator logic + synthetic tests only. NOT imported by app startup, Home/Create, DEV migration UI or any real storage adapter. Device Import remains locked. No previous Phase 2 file was modified.

## States

| State | Meaning / transitions |
| --- | --- |
| `loading` | Initial inspection or explicit reinspection; no edits/writes. Valid source goes through complete envelope activation before ready. |
| `ready_v1` | v1 runtime installed; generation-checked Save/edit admission, provided no operation/Save is active. |
| `ready_v2` | v2 runtime installed (including an in-memory empty new wallet); v1 writer cannot be re-enabled in this session. |
| `switching` | Synchronous admission barrier; draining Save, checking preview, importing, verifying or retrying activation. |
| `activation_incomplete` | v2 target was verified but activation failed. Only `retryActivation()` may advance; no Save, Import or generic reconcile. |
| `blocked` | Pending, invalid schema, revision conflict, uncertain commit, changed preview or verification problem. Writes stay locked. Explicit `reconcile()` inspects storage without retrying a write. |
| `error` | Startup inspection or v1 activation failed; locked until explicit reinspection. |

Known invalid/corrupt v2 is blocked, never a v1 fallback. If a v2 snapshot was observed or acknowledged, a later v1/missing-v2 observation remains blocked. The instance-local barrier is NOT a persisted `migrationComplete` flag; a new coordinator must inspect snapshots again on startup.

## API / adapters

`createWalletCoordinator({ inspect, writers: { v1, v2 }, importV1, activate })`

- `inspect()` classifies valid v1/v2/empty and invalid v1/v2, with pending count. v1 is represented by the validated memory-migrated v2 shape from previous steps. Adapters MUST report a detected unreadable/corrupt v2 as `invalid_v2`, not as absent or v1.
- Writers and importer return readback-verified committed documents. Known pre-commit/conflict/pending/uncertain errors are translated to `WalletCoordinatorFailure`. Unknown writer failures are treated as uncertain.
- `activate(session)` must atomically install the entire source/repository facade/Saved/Draft/revision/generation envelope or reject without a partial live installation. This adapter contract is still unimplemented and needs runtime tests in the next approved step.
- `initialize()`, `getState()`, `getSession()`, `updateDraft(generation, document)`, `save(generation)`, `cutover(generation, reviewedSnapshot)`, `cancelCutover()`, `reconcile()`, `retryActivation()`.
- Results contain `ok` and fixed `code`. Cancellation returns `ok: true, code: cutover_cancelled`; it must not be presented as a successful import. Public state/error results contain no card payloads; detached session documents are for the future trusted runtime only, never diagnostics/logs.

Runtime gets a generation-bound `repository.save()` facade, never the raw writer. Saved/Draft copies are isolated from caller/adapter mutation. Draft revision must match Saved. During Save, edits and a second Save are not admitted. A session generation changes at cutover/reinspection/retry boundaries; old callbacks cannot write.

## Cutover sequence

1. Require ready_v1/current generation and a valid reviewed snapshot. Unresolved Draft is rejected unless an already admitted Save is draining.
2. Close admission synchronously, advance generation and enter switching BEFORE any await.
3. Wait for the tracked Save, including its activation, to finish. A failed Save blocks; a changed saved revision invalidates the old preview.
4. Reinspect source/pending, validate full current snapshot against both the reviewed document and Saved. Reinspect once more immediately before import.
5. A requested Cancel before import keeps the gate locked until fresh source/pending checks complete, then reinstalls v1 with a new generation. If v2 appeared, cancellation cannot reopen v1.
6. Call only the injected v1-to-v2 importer (no v1 write/delete API exists here). Once it acknowledges a commit, latch the v2 barrier before validating its return value.
7. Inspect again; require matching committed v2 and no pending. Storage Commit and Runtime Activation are separate phases.
8. Activate the full v2 envelope. Only successful activation reopens edits. Failure retains the verified target in activation_incomplete.

After an uncertain outcome, no automatic Save/Import retry occurs. Explicit reconcile reads the actual state: valid v2 can activate without importing again; pending/invalid v2 remains blocked; known absence after a pre-commit failure can restore v1 only after a fresh inspection and generation. Dirty Draft is retained across conflicts and is never silently replaced by differing remote data.

Retry Activation inspects again, checks pending/validity and exact equality with the verified target, then retries only activation. A changed target blocks instead of installing stale Saved/Draft.

## Guarantees and remaining limits

- Instance-local JS admission is deterministic, but not an OS/multi-process lock. The future app must own exactly one coordinator per wallet and route ALL writers and callbacks through it. Other coordinator instances, direct repository calls, old app versions and external processes can bypass this gate.
- Inspection/import are not one cross-file OS transaction. Pending/external writers can race the final check; repository-level coordination must be reviewed before enabling real writes.
- The coordinator relies on truthful adapter error classification, verified commits and atomic runtime envelope installation. It cannot undo a runtime adapter that partially mutated UI then threw.
- No persistence/cleanup, filesystem access, UI effects, migration flags or automatic startup actions are introduced by this module. No device durability claim is made.
- Current Canvas capacity/compatibility, migration consent, recovery UI and actual runtime adapters remain outside this step. Future `inspect`/consent adapters must enforce compatibility before presenting a ready source for installation.

Before Step 2 runtime integration: approve single-owner wiring, revision/error translations, atomic runtime installation, stale callback auditing, migration-consent handoff and cross-repository admission/pending policy. Test adapters in sandbox before enabling device Import. Home/Create, existing Save/Discard/Cancel and Import lock stay untouched until that approval.
