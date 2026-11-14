# Phase 2 Step 4 — Cutover safety implementation

Status: **Implemented and fixture-tested; not activated in production.**
Baseline remains `c500a015cfc80bd6a63c88d3848562b33f02faa3`.
Prior uncommitted Phase 1/2 changes are preserved.

## What exists after this step

`createPreparedWalletRuntime(ports)` is an unmounted composition of the EXISTING
startup resolver, storage adapters, repository, coordinator and runtime owner.
It creates no native adapters, registers no Provider, imports no production
storage module, and performs no reads/writes at construction. It introduces no
second coordinator/state manager/repository implementation.

Privileged ports, provided once by a future approved composition root:

```ts
{
  v1: { load, save },       // existing reader/writer contract
  v2: existingRepository,
  readSource,              // { filename, raw, pendingCount }
  demoCards,               // corresponding original manifest
  backups: { writeExclusive, read },
  nextBackupId,
  beforeInstall?,         // optional validation/binding check; must not partially install UI state
}
```

Returned interface:

```ts
{
  getSnapshot,
  subscribe,
  commands: {
    initialize, updateDraft, save, cutover, cancelCutover,
    reconcile, retryActivation
  }
}
```

The snapshots, generation, revision, source, Saved/Draft and admission all come
from the original owner/coordinator. Raw writers and source/backup ports are not
returned to UI consumers.

The existing `createWalletOwnerScope(makeAdapters)` remains import-locked by
default. An explicit second composition argument can supply a guarded import
capability and pre-install check; only the new unmounted preparation composition
uses it. No current app/DEV route passes that capability. The existing real-device
migration preview still has forbidden writer stubs and no supplied import writer.
This is executable preparation for fixture tests, not an enabled production gate
or a route parameter that can unlock Import.

## Writer routing and cutover sequence

Before a fixture cutover, ready_v1 permits only the existing v1 adapter to write.
Membership-card changes are rejected at Draft admission while source is v1;
only representable Phase 1 layout changes are accepted. The v1 writer checks
pending/source revision and v2 evidence before delegating to the unchanged writer.
After successful fixture cutover, only the v2 coordinator writer is selected.

The implemented sequence is:

1. Resolve v1/v2 with the original resolver, validate the whole wallet and current
   production canvas compatibility. For v1, compare the decoded source with a fresh
   raw source read, including filename/revision and pending inventory.
2. Reject cutover with unresolved dirty Draft. Close admission synchronously and
   advance generation through the existing coordinator before awaiting any I/O.
3. Drain an already admitted save. If its result changes the reviewed revision or
   contents, stop and require a new review rather than importing a stale preview.
4. Reinspect source/v2/pending through the coordinator's existing checks. The
   import capability is invoked only while the coordinator is switching/locked.
5. Reread exact raw v1 source. Validate using the original decoder and migration;
   require equality to the reviewed complete v2 preparation.
6. Write an EXCLUSIVE source-copy envelope into the supplied separate backup
   boundary; read it back and compare exact serialized bytes, raw source string,
   source metadata, demo manifest and independently re-prepared wallet.
7. Reread v1 after backup. Reject changed filename, revision, raw bytes, pending
   count or prepared data, even if a same-revision file was reformatted.
8. Reinspect repository v2 revision/pending/uncertainty. Reject existing v2, pending
   or a reinspection requirement. The original repository performs its own gated
   destination checks again when import starts.
9. Invoke original `importPhase1`. It writes pending, validates readback, promotes
   exclusively, and validates the committed destination without changing v1.
10. Explicitly load v2 again and compare the entire returned snapshot to both the
    expected preparation and committed result; require no pending evidence.
11. Existing coordinator verifies v2 again and installs the complete owner bundle.
    Source, revision, repository capability, generation, Saved and Draft change as
    a unit. Admission remains closed until activation succeeds.

No old v1 save capability survives the generation transition. The backup operation
has no source-write/delete capability. Original v1 files and historical revisions
are never deleted, overwritten or moved by the import path.

### Additional barrier hardening

Committed v2 can appear after the coordinator's last inspection, e.g. during
backup or before a v1 Save. The preparation layer reports `v2_already_exists`;
the coordinator now records a sticky observed-v2 barrier from either Save or
cutover failure. A later lost-visibility/empty/v1 inspection cannot reopen v1 as
writer in that coordinator instance. All existing default production hooks remain
unchanged; this is headless safety logic only.

## Backup integrity and recovery

`backupPhase1Source(source, demoCards, files, id)` preserves:

- Exact original JSON string including whitespace and all supported raw metadata.
- Source committed filename and pending inventory (must be zero).
- Complete supplied demo manifest needed because v1 layout JSON does not contain
  card names/colors/orientations itself.
- An independently validated migration result for comparison.

Backup envelopes use a distinct `format: bemem-phase1-source-copy-1` identifier;
this is not another Wallet schema. Wallet schemaVersion remains 2.
IDs reject path separators and are bounded; supplied files must implement
exclusive creation. Existing backup IDs are never silently replaced. Any write,
read or byte mismatch blocks import as `backup_not_verified`; evidence is retained.

**No backup of the actual Samsung wallet was created.** This step implements the
algorithm against fixture ports only. A native private backup adapter/path and
permission to read/copy the actual source must be approved separately. A future
adapter must preserve the same exclusive-write/readback/no-delete contract; a
path option alone is not a verified backup.

| Failure | Implemented outcome |
|---|---|
| Invalid legacy data, incompatible metadata, source/preview change | Block before import; no source edits or guessed conversion |
| Failed backup | Block; retain any partial/failed backup; no import or overwrite/retry |
| Known precommit failure with no v2/pending | Keep source/backup. Remain locked until an explicit reinspection; fresh valid v1 may be reactivated, never silently resumed |
| Pending | Block and retain evidence. No promotion, deletion, import retry or older-snapshot fallback |
| `commit_uncertain` | Block; explicit reconcile reads status. If expected v2 committed with no pending and passes validation, activation can proceed without another import; unresolved evidence stays blocked |
| Commit succeeded, activation failed | `activation_incomplete`, writers locked. Retry Activation verifies the same target, then installs it; no second backup/import |
| Corrupt/unsupported v2 | Block; no fallback to valid v1 |
| v2 observed but subsequently invisible | Sticky v2 barrier prevents v1 writer recovery |
| Source changes after backup | Stop before import, retain old copy and all source revisions; require fresh inspection/consent |

Cancelling before import uses the existing coordinator cancellation transition;
it does not cancel a native write already admitted. Backup/import preparation
begins only after that transition has entered its locked import phase.

Returning to v1 is not recovery of new v2 data. After committed v2 has been
observed, the coordinator cannot choose v1 writer. Recovery from corrupt/pending
data needs a separately approved explicit procedure. This task implements no
automatic restore, old-revision selection, two-way synchronization or cleanup.

## Migration compatibility

Original `migratePhase1Wallet` is unchanged in this step. It keeps the previous
fail-closed check for unrepresentable root metadata. The source reader/validator
and writer are unchanged.

Tests independently compare IDs, kind=demo, name, color, orientation, card order,
coordinates, revision and savedAt. No placement occurs during migration; no new
IDs, fake membership numbers or payloads are created. Preparation is idempotent;
imports are not repeated. Old optional-field-free membership v2 data still reads
without adding fields or rewriting the file.

The historical demo manifest must be confirmed for a real import. If an earlier
app binary used different artwork/orientations, that cannot be reconstructed from
layout JSON alone. Unsupported metadata or an unknown manifest requires review,
not silent loss or a schema bump.

## 240-row compatibility end to end

No existing schema/production writer/grid contract or limit was loosened.

`validateProductionWallet(input)` applies existing strict v2 validation and then
requires every full footprint to satisfy `row + heightBlocks <= 240`, resolving
legacy landscape 6×4 / portrait 4×6 when new dimensions are absent.

The UNMOUNTED prepared runtime uses this same policy at:

- Initial resolution/activation of Saved.
- Draft admission, before any save attempt.
- v1/v2 writer routing, before repository writes.
- Migration preparation/import expectation.
- Pre-install validation both before and after the optional composition callback.
- Future Home/Create display projection.

`prepareProductionCardDraft(wallet, card)` validates the new card, uses the
existing first-free-position engine with MAX_ROWS=240 and returns a validated
complete Draft. Full capacity produces `canvas_capacity_reached`, not a moved,
shrunk, overlapping or out-of-bounds card. Duplicate IDs are rejected. These
helpers are not connected to the actual Add Card form or live Canvas yet.

`productionCanvasPresentation(session, mode, query, searchOpen)` accepts frozen
owner snapshots directly. Home projects Saved; Create projects Draft. Home search
uses the same matching-only reflow engine with the same limit. Clearing search
returns saved logical coordinates; searching never mutates the wallet. A search
presentation capacity failure is typed explicitly rather than silently truncating.

V2 schema validation/repository can still represent rows beyond 240, and DEV
Sandbox still uses dynamic rows. The preparation compatibility policy blocks
such wallets before production activation; it does not clamp, repair or rewrite
them. A future production dynamic-row change requires separate coordinated
approval across read/write/placement/search/drag/recovery, not a single-limit patch.

## Verification and evidence

- TypeScript: passed.
- Read-only ESLint: 69 files, 0 errors / 0 warnings, no installs.
- Automated tests: **328/328 passed** (33 new tests in `test-cutover-safety.cjs`).
- Android export passed: `.expo/cutover-safety-review/metadata.json`; no bytecode.
- Prior suites still cover the original forms, 7 presets, radius/inset/grid,
  interaction, repository protocol, DEV FileSystem confinement and source locks.
- New tests cover one writer before/after fixture cutover, synchronous admission,
  save draining, old capabilities, dirty/cancel transitions, byte-preserving
  exclusive backups, raw/revision change, pending, typed write uncertainty,
  activation failure/retry, duplicate import, fresh runtime readback, corrupt v2,
  legacy compatibility, all 7 exact 240-row boundaries, full capacity, early v1
  card-change rejection, post-callback activation checks and read-only projections.
- All Step 4 cutover/backup tests use isolated in-memory fixture storage. The
  existing full suite additionally includes Step 3's isolated **host** filesystem
  test; this is not a new Samsung cutover/backup test.

The user reported Samsung Step 3 filesystem Save/readback, fresh harness open,
revision 2 and pending 0. That is accepted as user-provided Step 3 evidence, not
misrepresented as agent-run Step 4 backup or production cutover evidence.

No new Samsung route is necessary for this headless implementation. The existing
`/dev-wallet-cutover` remains a filesystem smoke test with synthetic data, and
`/dev-add-card` remains in-memory. Neither invokes the prepared import composition.
Do not expect either route to create a backup or migrate the actual wallet.

## Files in this step

Modified:
- `src/lib/wallet-runtime-owner.ts`: optional explicit composition capability and
  pre-install check; original default import lock retained.
- `src/lib/wallet-storage-adapters.ts`: export the existing typed error mapper for
  reuse by the import capability; no storage protocol changes.
- `src/lib/wallet-coordinator.ts`: remember committed-v2 evidence reported during
  Save/import failures and retain the one-way writer barrier.

Created:
- `src/lib/wallet-cutover-backup.ts`: validated exclusive source-copy algorithm.
- `src/lib/wallet-production-policy.ts`: shared bounded admission/placement/display
  helpers; does not change persistent schema or live Canvas.
- `src/lib/wallet-cutover-runtime.ts`: unmounted single-owner composition and guarded
  cutover sequence using original components.
- `scripts/test-cutover-safety.cjs`: 33 isolated fixture tests.
- `PHASE2-CUTOVER-SAFETY-IMPLEMENTATION.md`: this implementation/limitations report.

## Approval / integration still required before actual production import

1. Approve installing the single owner at the real app root and routing EVERY
   Home/Create save, exit-save and async callback through its generation capability.
   Remove direct `canvasStorage.save` bypasses from the active hook only in that
   approved integration step. This task intentionally leaves the live v1 writer
   and Home/Create unchanged.
2. Approve native source-reader and private exclusive backup boundary wiring;
   validate a synthetic native backup round-trip before reading/copying real data.
3. Approve error/consent UI that exposes source change, capacity, pending, uncertain
   commit, reinspection and activation retry honestly. Do not unlock the old DEV
   Import button as a shortcut around owner routing.
4. Confirm real source manifest/compatibility, resolve Draft and take/read back the
   separately approved source copy before explicit actual import consent.
5. Rehearse root ownership, Android Back, Save/Discard/Cancel, restart and the
   post-commit/activation boundary on Samsung before enabling real Add Card Save.

## Remaining limits

The prepared composition only controls writers that actually use that owner.
The current production hook is deliberately still a direct v1 writer, so executing
this prepared import against production ports now would be unsafe and unauthorized.
No application-wide production cutover is claimed until the future hook/root
integration removes those bypasses.

JS-process admission/repository locks do not exclude another native process,
old app bundle, arbitrary privileged adapter caller or uncontrolled source writer.
A writer outside the coordinator could change v1 after the final read and during
the import's asynchronous native operations. The controlled fixture sequence
prevents owner-routed saves then; it cannot supply an OS-level cross-folder lock.
Old bundles/writers must be excluded operationally at real activation.

Exclusive move and successful readback are not 100% atomicity, fsync or power-loss
durability guarantees. OS backup policy, uninstall/device loss and crash behavior
still require development-build/device validation. No new native dependency,
schema version, production path, backup of real data or destructive recovery was
introduced. No UI redesign, website edit, reset, revert, commit, push or deploy.
