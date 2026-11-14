# Phase 2 — Step 2A: Wallet Storage v2

Status: repository/adapter only, not connected to app startup or UI. Step 1 files remain intact. No dependencies added.

## API

`createWalletRepository(files, { token, now? })` takes a filesystem port. `createExpoWalletRepository()` supplies the lazy Expo adapter; constructing either performs no file I/O.

| Method | Result / contract |
| --- | --- |
| `load()` | `{ document: WalletDocument \| null, pendingFiles: string[] }`; validates highest committed revision only; never silently falls back |
| `inspect()` | Committed revision numbers and pending filenames; read-only, does not validate snapshot contents |
| `save(document, expectedRevision)` | Detached snapshot of cards + layout; first save expects 0 and commits 1, subsequent saves commit expected + 1 |
| `prepareMigration(v1Json, demoCards)` | Pure Step 1 migration, no file reads/writes |
| `importPhase1(v1Json, demoCards)` | Explicit future import to EMPTY v2 only; preserves v1 revision/savedAt, IDs, coordinates, colors and demo kind; no startup caller exists |
| `readRevisionForRecovery(revision)` | Explicit read-only preview; does not restore, replace, select or delete any file |

All saving/importing instances for the same adapter `scope` share an in-process lock. Expected revision and input revision must agree. A stale caller is rejected instead of merging or overwriting cards/layout.

## Files and transaction

- Private directory: `Paths.document/bemem-wallet-v2/`, separate from both Phase 1 namespaces.
- Final filename: `wallet-<16-digit revision>.json` (positive safe integer).
- Pending filename: `wallet-<revision>.<unique token>.pending`.
- No HEAD file, separate cards transaction, cleanup job, deletion API or v1 write capability.

Save sequence:

1. Acquire process-scope lock and clone/validate caller data before yielding.
2. Load/validate newest snapshot and compare expected revision. Corrupt latest blocks saving.
3. Generate next revision/time (explicit import instead retains source revision/time).
4. Create a unique pending file with overwrite disabled; await its JSON write.
5. Read pending bytes back, validate schema and compare exact serialized contents.
6. Re-read latest revision immediately before promotion and reject conflicts.
7. Await move within the same directory to a final revision name with `overwrite: false`.
8. Read the final destination again, validate schema/revision and compare exact contents.
9. ONLY after step 8 resolves does Save return success. Release the process lock in all cases.

Final-name publication in step 7 makes the snapshot discoverable by a fresh load. Step 8 is the application acknowledgement boundary. A process can terminate between these points: the next load may find a valid new snapshot even if the previous caller never received success.

## Failure and recovery policy

- Before promotion: report a fixed error code; leave existing committed snapshots intact. Pending evidence is retained and is never automatically promoted or removed.
- During/after promotion: `commit_uncertain`. Do not claim either success or an unchanged latest revision. Re-load before any retry. A native operation may finish before its promise rejects, or final readback may fail after a successful move.
- Newest corrupt/unsupported/unreadable snapshot: fail closed; do not load an earlier revision or v1 automatically. `invalid_snapshot` can carry a sanitized `validationCode`, e.g. `unsupported_schema`.
- Errors contain fixed codes, not raw JSON/payload/native exception text. No network/log/analytics calls.
- Old revisions are not purged and can retain previous membership values. Retention needs a separate approved policy.

Future recovery UI (NOT implemented): explain the failure, list/validate candidates read-only, preview the chosen revision and obtain explicit confirmation before restoring it as a NEW snapshot. Never delete/overwrite the damaged revision. This will need a separately designed recovery write API because ordinary Save deliberately refuses to bypass a corrupt latest revision. Pending-only files require explicit review, not automatic success.

## Expo SDK 58 and guarantees

Checked installed `expo-file-system ~58.0.13` types, Android/iOS source, and [SDK 58 documentation](https://docs.expo.dev/versions/v58.0.0/sdk/filesystem/). Uses `Directory`, `File`, `Paths.document`, `File.create({overwrite:false})`, awaited `write`, `text` and `move(destination,{overwrite:false})`; no legacy methods or Cache persistence.

The SDK move API exposes overwrite control, not a documented database transaction, durability barrier, exclusive multi-process CAS or fsync guarantee. Its native implementations use platform filesystem operations. We do NOT claim 100% atomicity or survival of every power loss/device/storage failure. A post-move validation failure may leave a damaged new revision while preceding revisions remain intact.

The shared lock only covers repositories in one JS process using the same scope. Rechecks plus no-overwrite reduce accidental lost updates; they are not a proof against concurrent OS processes, manual filesystem modifications or a native check/move race. Such writers are not supported. Strengthening this requires a native lock/transaction mechanism reviewed separately.

Mock tests inject failures before/after promotion and cover adapter paths/overwrite options, but do not establish native crash/power-loss durability. No real Samsung wallet is touched. Android export checks the unchanged app entry; because v2 is intentionally not imported there, it does not execute the new adapter. TypeScript checks the adapter API and mock tests exercise its wiring.

Private Documents is not application-level encryption and does not automatically exclude OS backup. Backup/privacy configuration remains a separate approval/build-validation task.

## Step 2B approval boundary

Before runtime adoption: approve startup selection/migration confirmation, Wallet Saved/Draft integration and user-visible conflict/uncertain-commit states. Validate real filesystem behavior in an isolated test namespace/development build, never by corrupting a live wallet. Dynamic Canvas capacity/placement and any native backup configuration remain separately scoped; Step 2A does not change the current 240-row UI limit.
