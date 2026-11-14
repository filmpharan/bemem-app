# Step 2C.5B — Writer audit, Storage/Runtime Adapter preparation

No production hook, route, repository, storage adapter, Coordinator, schema or transaction protocol was changed. New preparation modules are not imported by the app. Import remains disabled in both the existing DEV screen and the new owner factory.

## Current wallet paths (disk versus memory)

| File / function | Operation | Version / scope | Coordinator today? | Bypass risk | Integration action |
| --- | --- | --- | --- | --- | --- |
| `use-wallet-canvas.ts` mount effect / `canvasStorage.load` | Disk read at Home startup; async reducer update | v1 | No | Startup can select v1 independently of v2 | Replace reader selection with the single owner; retain blocked/no-fallback policy |
| `use-wallet-canvas.ts` `save()` | Disk write through `canvasStorage.save`, then async state update | v1 | No | Main production writer; `savingRef` only covers this hook instance | Replace direct writer with generation-bound owner command; drain admitted Save before cutover |
| `use-wallet-canvas.ts` `enter/leave/move/discard/cancel` | Memory state only | v1 session | No | Draft commands can arrive during a future switch | Route commands through owner admission while preserving behavior; do not call these disk writes |
| `src/app/index.tsx` `CanvasActions.onSave`, `UnsavedChangesDialog.onSave` | Delegates to hook Save | v1 | No | Both UI save entry points bypass future coordinator today | Both must use the same guarded command, never rely only on disabled UI |
| `index.tsx` `handleBack`, logo/back callbacks; `phase1-navigation.ts` | Memory mode/prompt/search changes; Back may expose Save dialog | v1 session | No | Stale Back/dialog callbacks can trigger old hook Save | Session-generation guards at command level; block switching exit until safe |
| `UnsavedChangesDialog.tsx` Save / Discard / Cancel, `onRequestClose` | Save delegates disk write; other actions memory only | v1 | No | A modal closure retains callbacks after a source switch | Rebind or reject stale generation; keep Cancel/Discard distinct from Save |
| `WalletCanvas.tsx`, `card-interaction.ts` | Timer/PanResponder/accessibility moves update Draft; tap opens preview | Memory only | No | Hold timer or responder callback could fire during cutover | Keep cancellation on unmount; future owner must deny stale edits as well as writes |
| `CardPreview.tsx`, Create PRO modal close/back/backdrop | Memory visibility only; Edit disabled | Memory only | No | No disk write today | Preserve; do not invent storage effects |
| `canvas-session.ts`, `canvas-layout.ts`, `search-reflow.ts` | Reducer, grid validation/placement and detached search presentation | Memory only | No | No direct writer; future use of stale state is possible | Keep pure geometry/presentation; use owner-selected session |
| `canvas-repository.ts` `load/save` | Read committed v1; validate revision; commit layout | v1 | No | Exported factory permits extra repository instances; lock is per instance | Privileged adapter/composition-root use only; never hand raw writer to hooks |
| `canvas-storage.ts` files `list/read/commit` and exported singleton | Native list/read/create/write/readback/move | v1 Documents | No | Direct singleton imports remain possible; original commit lacks final-destination readback | Audit/remove runtime direct imports in Integration; keep adapter readback verification; no v1 protocol change here |
| `wallet-repository.ts` `load/inspect/readRevisionForRecovery` | Disk reads only | v2 | No | Readers can bypass selected runtime; recovery preview does not restore anything | Allow explicit diagnostics/recovery reads; do not silently select a historical snapshot |
| `wallet-repository.ts` `save/importPhase1/commit` | Pending write/readback, final revision check, move, final readback | v2 | No | Direct calls bypass Coordinator; scope lock does not serialize v1 | Privileged storage capability only; import needs approved consent/coordinator handoff |
| `wallet-storage.ts` factories / native file methods | Native v2 list/read/create/write/move; no delete API | real v2 Documents | No | Factory can create additional privileged writers | Only one application composition root receives these capabilities |
| `wallet-startup.ts`, `wallet-startup-diagnostics.ts`, `wallet-migration.ts`, `wallet-preparation.ts` | Injected reads, memory migration, validation/preparation | v1/v2, no disk writes | No | Their results must not be mounted independently alongside an owner | Adopt through owner; preserve pure helpers and explicit read-only diagnostics |
| `dev-startup-readers.ts` / `dev-wallet-startup.tsx` | Explicit real v1/v2 reads only; writer stubs forbidden | DEV, real roots | No | Reads selected independently, but cannot mutate disk | Keep diagnostics read-only and explicit; avoid confusing its source with active runtime |
| `dev-migration-preview.ts` / `dev-wallet-migration.tsx` | Manual Preview/Consent reads; no device import writer | DEV, real roots | No | Device import is currently locked; future unlock could bypass coordinator | Do NOT unlock independently; consent must call owner cutover in a later approved step |
| `wallet-migration-consent.ts` optional writer path | Mock-tested explicit `importPhase1` call; readback | Prepared/mock only | No | A future caller could supply a real writer directly | Hand off consent to owner; resolve pending/transaction guard first |
| `WalletTestHarness.tsx`, `dev-wallet-checks.ts`, `dev-wallet-sandbox.ts` | Explicit synthetic snapshot writes/moves and confirmed cleanup; cleanup deletes recognized test files/empty folders only | DEV `bemem-wallet-v2-test` only | No, intentionally sandbox | Test root must never become configurable to production wallet roots | Keep namespace/DEV guards and manual run; never expose cleanup to production roots |
| `wallet-coordinator.ts` injected writers/importer, `updateDraft` | Guarded disk capabilities via ports; Draft memory mutation | Not mounted, mock only | Inside Coordinator | Other callers can still use raw repository exports | All future app commands must flow through one owner; no globally enforced security boundary exists yet |
| New `wallet-storage-adapters.ts` read/save methods | Privileged injected reader/writer delegation + preflight/readback | Not mounted, mocks only | Owner bridge prepared | Raw adapter methods are privileged and could bypass owner if leaked | Keep adapters private to composition root; owner exposes no raw adapters |
| New `wallet-runtime-owner.ts` | Memory bundle installation, owner commands and guarded callbacks | Not mounted | Yes, within prepared owner | Creating multiple scopes still creates multiple owners | One root-owned scope, one Provider later; hooks consume it, never create scopes |
| `scripts/test-*.cjs` | New suites use mocks; legacy canvas suite uses app-local `.expo` temp JSON | Node synthetic tests, not phone wallet | Not applicable | Legacy `test-canvas --read/--verify-restart` accepts a path and may print test JSON | Never point it at private real data; consider restricting paths before real-card tooling adoption |

Async audit: the existing load effect has an `active` unmount guard, but an already-started Save is not cancelled on page unmount and can dispatch its completion afterwards. Gesture timers are cancelled on cleanup; modal/native Back callbacks are memory-only except when their Save callback is invoked. Admission therefore must live above page/hook lifetimes, not in UI state alone.

## Prepared APIs

`createWalletStorageAdapters({ v1, v2, demoCards, now? })` is dependency-injected, imports no native filesystem module, and performs no I/O at construction.

- `readV1()`: existing v1 reader + original migration validator, memory-normalized v2 shape.
- `saveV1(document, expectedRevision)`: only unchanged demo-card metadata plus a changed layout is representable by the existing v1 writer. Refuses card edits rather than silently losing them; preflights absence of committed v2/pending and checks legacy revision; delegates the original writer unchanged; reads its result back afterwards.
- `readV2()`: existing v2 repository load, including pending evidence.
- `saveV2(document, expectedRevision)`: validates/detaches input, checks inventory/pending and latest revision, then delegates cards + layout as one repository transaction. No retries.
- `inspect()`: produces `WalletInspection` for Coordinator, never hides unreadable v2 as v1/empty.
- `coordinatorWriters`: privileged bridge for composition-root wiring only.

Results are `{ok:true,value}` or `{ok:false,kind,code}`. Kinds distinguish `revision_conflict`, `pending`, `blocked`, `commit_uncertain`, `failed`; no raw exception/payload text is returned. The current Coordinator failure contract lacks a blocked subtype: the bridge maps blocked/failed to `precommit_failure` (which locks Coordinator) while preserving detailed classification in direct adapter results. Richer UI reason propagation needs a reviewed interface change later.

## Runtime bundle and single ownership

`createRuntimeBundleStore().install(session)` validates source/repository agreement, generation and Saved/Draft/revision consistency, clones and freezes the bundle, then publishes it via one synchronous pointer assignment. Failed validation leaves the prior bundle untouched. A whole-bundle swap is atomic within this JS execution, not an OS transaction.

`createWalletOwnerScope(makeAdapters).getOwner()` lazily creates exactly one Coordinator for that scope. No global mutable registry, React Provider or app mount is introduced. Future integration creates one scope at the root and supplies its owner via Context/useSyncExternalStore; hooks/routes consume that owner.

Owner exposes `getSnapshot`, `subscribe` and guarded commands. Saved/Draft view snapshots are immutable; edits go through `commands.updateDraft`. Source/repository facades and revisions are installed together. Repository callbacks go through generation/admission checks and publish gate changes synchronously, then publish completion. Listener exceptions are counted without throwing after publication or logging data. Raw adapters, Coordinator ports and import writer are not exposed. Owner import is unconditionally denied in this step.

## Unresolved races / required approval before Integration

1. Existing Home/Create still bypass the new owner by design. Their behavior has NOT been replaced in this step. Removing/re-routing every direct writer and retaining in-flight ownership is essential before unlocking Import.
2. Adapter preflight is not a transaction. New pending/v2 files can appear between checks and repository calls. v2 repository rechecks revision before promotion, but does not reject other pending files inside the same transaction gate. Do not claim this gap is closed.
3. v1 repository exposes no pending inventory/error taxonomy; v1's own leftover pending cannot be inspected through its current reader API. New adapter checks v2 pending, not proof of absence of all v1 pending. v1 conflict mapping relies on one exact existing fixed message; unknown v1 write failures are conservatively uncertain.
4. Coordinator ownership and v2 repository scope locks are JS-process-local. Multiple owner scopes, direct raw writers, old app versions and other OS processes can bypass them. A factory/type boundary is not malicious-code isolation.
5. Approve shared cross-v1/v2 admission, pending-aware repository admission under the same lock, explicit error mapping, migration-consent handoff, runtime Provider ownership and callback audit before actual Integration. No schema/protocol or storage implementation changes were made here to disguise these limitations.
6. Native crash durability, OS backup policy, real cutover, Canvas capacity and activation verification on Samsung remain separate approvals/tests. Existing Import lock stays in place.
