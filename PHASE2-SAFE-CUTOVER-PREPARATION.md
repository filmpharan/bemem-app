# Phase 2 Step 3 — Safe production cutover preparation

Status: **Prepared for isolated device validation; production cutover/import remains locked.**
Git baseline remains `c500a015cfc80bd6a63c88d3848562b33f02faa3`.
All previous uncommitted work is retained.

## Production data flow — verified from the code

| File / function | Read/write and source | Coordinator today | Before production cutover |
|---|---|---|---|
| `src/app/index.tsx` / `useWalletCanvas()` | Home/Create renders packaged PREVIEW_CARDS + v1 saved/draft layout | No | Supply the complete owner session, including dynamic card data; do not keep a second hook-owned writer |
| `src/hooks/use-wallet-canvas.ts` mount effect | Calls `canvasStorage.load()` once per hook mount | No | Resolve through the sole root owner; protect late load callbacks with session generation |
| Hook `save()` | Calls `canvasStorage.save(layout, revision)`; after await dispatches `saved` | No | Route every save/exit-save through the owner; late completion must not dispatch into another source/session |
| Hook `move/enter/leave/discard/cancel` + `canvasSession` | Draft/Saved **memory only**, no direct filesystem calls | No | Preserve behavior but make owner bundle authoritative; dirty layout is not a storage transaction |
| `CanvasActions` / `UnsavedChangesDialog` callbacks in index | Both call the same hook `wallet.save()` | No | Both must receive the same guarded capability; disabled UI is not a writer lock |
| `handleBack` / Android Back / logo | Closes overlays or requests leaving Create; dirty state opens the same dialog | No | Preserve navigation ordering and drain admitted writes before cutover |
| `src/lib/canvas-storage.ts` | v1 native adapter, private `Paths.document/bemem-phase1-canvas/` | No | Retain source files, but remove direct writer access from active UI after approved integration |
| `src/lib/canvas-repository.ts` | Reads latest `layout-##########.json`; validates expected revision; writes a new immutable revision via pending file | Local repository lock only | Existing v1 writer does **not** inspect v2 and can bypass a future coordinator unless callers are replaced |
| `src/lib/wallet-storage.ts` | v2 adapter: `Paths.document/bemem-wallet-v2/`, `wallet-################.json` and separate pending files | Not mounted in production | Lazy construction; explicitly connect only after approved runtime integration |
| `src/lib/wallet-repository.ts` | v2 load/inspect/recovery-read/save/import transaction API | Privileged API | Keep raw writer capability at the composition root; never hand it to screens |
| `src/lib/wallet-storage-adapters.ts` | v1/v2 reads and typed guarded writers; expectedRevision/pending checks | Prepared, unused by production hook | Use with sole owner; v1 adapter rejects changed card data and existing v2/pending evidence |
| `src/lib/wallet-startup.ts` | Read-only v2-first resolution; v1 migration preparation/empty document in memory | Prepared, unused by production startup | Latest corrupt/unsupported v2 must block; pending must block writes; no automatic import |
| `src/lib/wallet-runtime-owner.ts` | One scope lazily owns coordinator and immutable session bundle | Not mounted in production | Actual root owner choice has not happened. Owner import port currently throws, intentionally |
| `/dev-wallet-startup`, `dev-startup-readers.ts` | Explicit manual reads of real v1/v2; writes replaced with forbidden stubs | Diagnostic only | Leave read-only; no automatic startup action |
| `/dev-wallet-migration`, `dev-migration-preview.ts` | Real-data preview/consent, memory-only prepareMigration; no writer supplied | Import locked | Do not unlock via route parameters or a UI flag |
| `/dev-wallet-test`, `dev-wallet-checks.ts` | Synthetic read/write/move/explicit cleanup only in `bemem-wallet-v2-test/` | Earlier repository tests | Separate from both production and the new cutover sandbox |
| `/dev-add-card`, `dev-add-card-runtime.ts` | Form → owner → repository over a Map | Yes, isolated DEV owner | Production namespaces inaccessible through this default composition |
| `/dev-sandbox` | Synthetic layout and drag state in memory only | Not a wallet writer | No persistence/import capability |
| New `/dev-wallet-cutover` | Manual synthetic form/owner/repository/native FileSystem checks in fixed dedicated namespace | Same owner/coordinator logic | No production read, backup, import or activation |

Current production startup reads v1 and does not write automatically. A failed
read displays protected demo state and blocks save; it does not repair/reset disk.
The empty Phase 1 fixture uses separate `bemem-phase1-empty-canvas` if the packaged
demo array is empty. This task changes neither namespace nor fixture contents.

**There is currently no application-wide barrier between the direct production v1
writer and a hypothetical production v2 writer.** The prepared owner/adapters have
barriers, but the production hook does not use them. Consequently neither device
test success nor a valid v2 file authorizes enabling Import in the present runtime.

## Migration preparation and preservation

The existing `migratePhase1Wallet` / repository `prepareMigration` are reused.
They call the unchanged Phase 1 decoder first (including collision/bounds checks),
then validate a complete WalletDocument v2. There is no placement call, ID
generation, I/O, source rewrite or demo-to-membership conversion.

- v1 stores layout, revision and savedAt, not per-card name/color/orientation.
  Demo identity, name, colors and orientation come from the existing supplied
  `PREVIEW_CARDS` manifest. Tests compare against that manifest independently.
  Historical artwork cannot be reconstructed from layout JSON alone if an older
  binary used a different manifest; confirm the manifest/version before import.
- Original IDs, card ordering, coordinates, revision and savedAt are retained.
  Schema/dataset/columns are translated to the existing v2 document structure.
  No membership number or payload is invented for a demo.
- Legacy footprints remain landscape 6×4 / portrait 4×6. New dimensions are not
  backfilled into demos or old membership cards.
- A necessary small hardening was added: the old decoder retains unknown root
  properties, but migration cannot represent extra metadata in strict v2. Migration
  now rejects such input as `invalid_legacy_document`, rather than silently dropping
  it. The v1 reader/writer is unchanged. Unsupported metadata requires review,
  not a guessed mapping or automatic schema-version change.
- Repeated preparation of identical source produces identical v2 data. Explicit
  repository import with a nonempty destination is rejected; idempotent preparation
  does not mean repeatedly writing imports is allowed.

## Isolated FileSystem validation

Fixed native path:

`Paths.document/bemem-wallet-cutover-test/`

Recognized children are `main`, `pending`, `corrupt`, and root `run-info.json`.
The new test uses `main` for two committed revisions and the root marker for
readback expectations. Other case folders are empty unless separately tested.

The earlier `createWalletTestSandbox` now accepts only its original fixed namespace
or this new literal namespace. Production names and path traversal are rejected.
Every operation retains DEV, platform, relative-child and filename guards. No
caller-provided arbitrary root is accepted. Existing test directory behavior is
unchanged. Construction does not create/list/read/write test files; only buttons do.

The existing DEV runtime now accepts a `WalletFiles` transport boundary instead of
requiring Map-only test helper methods. Its default remains in-memory, so
`/dev-add-card` is unchanged. No repository/coordinator/state manager was duplicated.

The manual runner:

1. Creates the dedicated folders; refuses a populated main folder before new writes.
2. Resolves an empty test wallet through the existing startup resolver/owner.
3. Adapts seven fixed fictitious membership cards, validates them, and places them
   into Draft with the existing first-free-block engine.
4. Saves through the coordinator; rejects an overlapping save command. Observes
   pending write, pending readback, move and committed readback.
5. Moves only the first synthetic card to row 50, saves revision 2, and checks that
   revision 1 bytes and the other card data remain unchanged.
6. Constructs a fresh isolated runtime over the same filesystem and compares the
   **entire** Saved snapshot. Writes a marker containing only synthetic expected
   data and the test-session identifier. Raw payloads are never displayed/logged.
7. After manual Expo Go closure/reopening, Verify After Restart reads the marker
   and the same native files through the resolver/owner again. IDs, membership
   strings/leading zeros/spaces, code strings, dimensions, positions, revision and
   metadata must match exactly. It does not save or repair anything.

Same-session verification reports Not Verified for restart even if file reads
match. A changed harness session reports successful file readback with an explicit
warning: Fast Refresh/module-session changes do not prove native process death.
Full Expo Go closure is a manual device-test procedure, not automatically detected.

Run errors retain files and never automatically retry/promote/delete. Recognized
repository error codes are displayed without raw exceptions or card data.
Reinspect is read-only and reports revision/pending count; it is not a recovery or
permission to resume writing. Clear Test Files requires explicit confirmation,
preflights all entries, rejects unknown files before deleting, and keeps the empty
test root. No protected production paths are read even for before/after checksums.

## Backup and recovery plan — not executed on device

Before future production import, separately approve this bounded procedure:

1. Resolve Draft via Save/Discard/Cancel, synchronously stop new edits/saves and
   advance generation, then drain all in-flight saves. Inspect v2 and pending
   evidence first; reread the latest v1 using its original reader and validator.
2. Confirm consent against current full v1 contents, revision and savedAt. Inventory
   pending files; do not treat their contents as committed data. Do not guess how to
   import unsupported metadata or an incompatible manifest/layout.
3. Copy the selected original v1 JSON **bytes**, its filename/revision and the
   corresponding demo manifest into an exclusively created private local directory,
   e.g. `Documents/bemem-pre-cutover-backup/<unique-id>/`. This is a future proposed
   local safety copy, not cloud backup or a new export feature. No backup code or
   backup of the actual Samsung wallet was executed in this step.
4. Read the copy back, compare exact bytes, validate it with the original v1
   decoder, and compare the manifest. Reread source afterward to reject a changed
   revision/content. Keep the original v1 and historical committed revisions intact.
5. Prepare v2 in memory and compare IDs, kinds, colors, orientation, card ordering,
   layout, revision and savedAt independently. Validate collisions and current
   production canvas compatibility. No automatic placement of migrated cards.
6. Only separately approved explicit consent may invoke the existing import
   transaction. Keep admission closed through final committed v2 readback and
   complete runtime-bundle activation. The committed snapshot is authoritative,
   not a separate migrationComplete flag.

Failure decisions:

| Situation | Required behavior |
|---|---|
| Validation/source/consent changed before commit | Stop; retain source and draft; require fresh review |
| Proven failure before any v2 commit, no unresolved pending/uncertainty and no observed committed v2 | Returning to the existing v1 writer may be considered only after a fresh inspection and explicit cancellation; never assume this from an exception alone |
| Pending file | Lock writes; retain evidence; inspect latest committed state; no automatic promotion, cleanup or import retry |
| `commit_uncertain` | Keep locked; explicitly reinspect/read back; determine whether the expected v2 committed. Retry activation only if validated; unresolved evidence requires approved recovery |
| Commit succeeded, activation failed | Never reopen v1 writer. Retain lock; verify same committed v2 then retry activation, not import |
| Latest v2 corrupt/unsupported | Block; no silent old-revision/v1 fallback. `readRevisionForRecovery` is a read-only review capability, not automatic selection/restore |
| Revision conflict | Preserve draft/source, block write, reread and request conflict resolution; no overwrite or auto-merge |
| New v2 cards/edits exist after cutover | Switching back to v1 loses visibility of those changes; it is **not recovery**. This system deliberately has no permanent two-way sync |

After any committed v2 has been observed, the approved coordinator invariant
prohibits v1 as writer. Retaining an intact v1 file provides a source copy, not
permission to roll the runtime back. Restoring a recovered v2 snapshot is a future
explicit recovery transaction with its own approval, validation and readback.

Immutable committed revisions and untouched v1 limit application-level damage
from interrupted writes, but Expo move/readback is not proof of atomicity or
durability across power loss. OS backup, app uninstall/data clearing and device
loss remain separate risks. No backup policy or native configuration changed.

## Compatibility / 240 rows

| Layer | Current contract |
|---|---|
| Production v1 reader/writer/Canvas | 12 columns; default 240 rows; fixed demo manifest with legacy orientation footprints |
| Wallet v2 validator/repository | 12 columns; safe-integer positions; full-footprint collision checks; extended seven dimensions; legacy size resolution; can represent rows beyond 240 |
| DEV Sandbox / this DEV runtime | Shared Grid engine with dynamic rows (`Infinity` configuration), not a production contract change |
| Existing startup diagnostics/consent preview | Reports/blocks production canvas incompatibility; does not clamp or reflow |

For today's production compatibility, require `row + heightBlocks <= 240` (using
legacy footprint where dimensions are absent). A v2-valid wallet can still be
incompatible with the current production Canvas. All seven sizes must fit full
blocks without overlap; the visual 0.1 inset never reduces collision area.

The smallest safe first cutover keeps the cap: check compatibility before runtime
activation and reject new-card placement outside the cap without moving other
cards. When all slots are occupied, show an explicit capacity error and preserve
the draft. This is a proposal, not implemented production behavior in this step.
Later dynamic production rows need a coordinated read/write/placement/drag/search/
recovery review. Do not increase only one validator or clamp saved coordinates.
No schema version, production bounds, geometry, radius or inset changed here.

## Test results / evidence boundaries

- TypeScript passed.
- Read-only ESLint: 66 files; 0 errors / 0 warnings; no dependency installation.
- Automated tests: **295/295 passed**, including 17 new preparation tests.
- Android bundle export passed: `.expo/cutover-preparation-review/metadata.json`.
- Mock-native tests run the same manual runner against strict sandbox path guards;
  protected v1/v2 sentinel files remain untouched.
- One new automated test uses **real host filesystem** files under a uniquely
  created app-local `.expo/cutover-host-*/bemem-wallet-cutover-test/`. It executes
  the same coordinator/repository runner and fresh-runtime readback, then removes
  only its verified temporary root. This is Windows/Node evidence, not Expo native
  filesystem evidence or OS process-restart proof.
- Fixture tests cover lossless migration, idempotent preparation, duplicate import
  rejection, unsupported metadata/schema/collision rejection, source backup byte
  equality, pending/revision gates, single-owner save admission, uncertain commit,
  read-only recovery, cleanup confinement and import/runtime locks. Existing suites
  retain their detailed coordinator, failure and seven-size compatibility coverage.
- **Samsung Step 3 Save/readback/restart: Not Verified by this coding session.**
  The user's passed Step 2 Samsung run was in-memory and is not reclassified as
  device persistence. Earlier Step 2B filesystem evidence also does not establish
  this new seven-preset coordinator flow. Test the new route on Samsung separately.
- Native crash/power-loss durability, fsync and cross-process races: Not Verified.
  Locks are JS-process/module scoped; Fast Refresh or process death can reset them.

SDK check: installed Expo 58.0.23 / expo-file-system 58.0.13. Existing API calls
remain `Directory`, `File`, `Paths.document`, `create`, `text`, `write` and async
`move(...,{overwrite:false})`; verified against installed types and the
[SDK 58 FileSystem documentation](https://docs.expo.dev/versions/v58.0.0/sdk/filesystem/).
Those API contracts do not establish cross-process exclusive/atomic crash safety.

## Samsung acceptance steps

```powershell
cd C:\ฉันจะทำเว็บไซด์\bemem-app
npx.cmd expo start
```

Open the running Expo URL with `/--/dev-wallet-cutover`, for example
`exp://<computer-LAN-IP>:8081/--/dev-wallet-cutover`. Use the actual LAN host/port
printed by Expo; Samsung and computer must be able to reach one another.

1. Confirm the displayed path ends in `/bemem-wallet-cutover-test`, not either
   production directory or the old device sandbox. Opening alone runs no test.
2. Press **Run Test** once. Expect seven Passed steps and two Not Verified notices.
   Keep a screenshot. If the test directory is populated, preserve its results and
   inspect it; only Clear Test Files can remove it for a new run.
3. Fully close Expo Go, reopen the same project/route, and press **Verify After
   Restart** BEFORE Run Test. Expect successful different-harness-session readback.
   Report whether Expo Go was actually closed; do not substitute Fast Refresh.
4. Press **Reinspect · Read only**: expect revision 2, pending 0. This writes nothing.
5. Return to Home and confirm the existing Phase 1 cards/layout remain normal.
6. After recording results, optionally **Clear Test Files → confirm**. Only the
   dedicated test files are removed; the empty test root stays. An unknown file
   blocks cleanup instead of being deleted.

## Exact changes in this step

Modified:
- `src/lib/dev-wallet-sandbox.ts`: add one explicit allowed DEV namespace; keep
  existing adapter/path/cleanup rules and old namespace default.
- `src/lib/dev-add-card-runtime.ts`: accept the existing WalletFiles transport;
  default Map runtime and owner business logic unchanged.
- `src/lib/wallet-migration.ts`: reject unrepresentable root metadata before pure
  migration; leave original v1 decoder/storage unchanged.

Created:
- `src/lib/dev-cutover-checks.ts`: fixed synthetic coordinator/repository filesystem
  checks, restart comparison and read-only reinspection.
- `src/components/bemem/CutoverTestHarness.tsx`: manual DEV controls/results only.
- `src/app/dev-wallet-cutover.tsx`: DEV guard; no production navigation changes.
- `scripts/test-cutover-preparation.cjs`: mock/native-boundary and host-file tests.
- `PHASE2-SAFE-CUTOVER-PREPARATION.md`: this audit, evidence and recovery plan.

## Separate approval still needed

1. Accept Samsung Step 3 persistence/readback/restart evidence.
2. Approve routing **all** production saves/startup/async callbacks through one
   owner and closing every v1 direct-writer bypass, while keeping Import locked.
3. Approve production 240-row compatibility gating, existing-v2 handling and
   fail-closed error/reinspection/activation-retry UI; test with fixtures first.
4. Approve and verify the bounded local source-copy procedure, then separately
   approve explicit real import consent and production runtime activation.
5. Recheck expected revision, v2/pending evidence, fresh source and source manifest
   immediately before import. Old JS bundles still able to write v1 must not run
   concurrently with the newly activated production owner.

This step does not import/backup/recover real Samsung data, mount a production
owner, change Home/Create/Add Card layouts, unlock Save or Import, change storage
schema/protocol, alter Grid/search/drag, install dependencies, edit the original
website, reset/revert, commit, push or deploy.
