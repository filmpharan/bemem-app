# Phase 2 Step 8 — Samsung Wallet v2 activation

Status: release path enabled by explicit Step 8 approval; real Samsung cutover and acceptance results are **not yet verified**.

## What starts a write

`PRODUCTION_WALLET_V2_APPROVED` is now `true`. This permits the existing guarded path, not automatic migration. Startup, opening the migration panel, read-only Review, checking consent and Cancel do not create a backup or import v1. An already valid v2 is selected on restart; a new installation with neither version starts with an empty v2 in memory and writes only on explicit Save.

For an existing v1 wallet, the first write starts only after a current read-only review, checked consent, and pressing **Back up, import and activate**. The source revision/card count are read from the device, never hardcoded from the earlier revision-10 review. The coordinator closes writer admission synchronously, drains admitted saves, rejects unresolved Draft and stale generation/review, and reinspects storage.

## Backup and transaction sequence

1. Read and validate the latest v1 source and demo manifest; require exact equality with the reviewed Saved wallet.
2. Exclusively create `Paths.document/bemem-pre-cutover-backup/source-<uuid>.json`. An existing backup is never overwritten or removed.
3. The envelope contains the exact raw v1 JSON, original filename/pending metadata and demo manifest. Read it back, compare the entire serialized string and original raw string, re-run the migration validator, and compare IDs, types, colors, orientation, coordinates, revision and savedAt through full document equality. This is application readback validation, not a claim of cryptographic signing or power-loss durability.
4. Re-read v1 and require the same source and prepared document. Recheck v2 inventory for pending, uncertainty and any committed snapshot.
5. Call the existing repository `importPhase1()` once. Validate pending readback, promote exclusively, then validate committed readback. Preserve v1 revision and savedAt rather than inventing new source metadata.
6. Re-read v2, compare the entire migrated document, then install one coherent v2 Runtime Bundle. Success requires `ready_v2`, source v2, admitted editing and a v2 session.
7. The review panel remains open with **Backup integrity passed. Import readback passed. Wallet v2 is active.** Press **Back to Create** to close it. This success text is emitted only for the current operation after verified activation.

Backup failure explicitly reports failed/unverified integrity and prevents import. Source v1 is never a write/move/delete target of migration. Partial backup/pending evidence is retained. Commit uncertainty locks writes; only explicit read-only reinspection can resolve the outcome. Activation failure permits verified activation retry, never a second import. A corrupt/unsupported v2 blocks without fallback. New v2 saves use the same coordinator/repository, expected revision and committed readback; v1 never becomes writer again after v2 is observed.

## Run on Samsung — first checkpoint

From `C:\ฉันจะทำเว็บไซด์\bemem-app`:

```powershell
npx.cmd expo start --lan
```

Open the project in Expo Go using the same project installation/storage used for Phase 1. Do not clear Expo Go storage or uninstall it. Reload the updated JavaScript if Metro was already running.

1. Verify Home still shows the original demo cards and their positions. Enter Create without moving a card.
2. Tap **Wallet v1 · Review Wallet v2**, then **Review migration · Read only**.
3. Check the fresh source, revision, card count, Pending 0 and Canvas compatible. If these are unexpected, or a lock/error appears, stop before confirming and report the displayed status. Do not use prior revision/card counts as defaults.
4. To inspect without changing files, press Cancel. For the approved cutover, check the consent checkbox and press **Back up, import and activate** once.
5. Wait for the explicit backup/readback/v2-active result. Cancel and Android Back are blocked during the operation. Do not interpret a spinner or a backup file alone as success.
6. If any failure occurs, retain all files. Use **Reinspect wallet · No import retry** or **Retry verified activation**, as offered. Do not retry Import, manually promote/delete Pending, or restore v1 over v2.
7. On verified success press **Back to Create**. Confirm the same demo cards, colors, shapes and coordinates. The v1 review entry disappears when v2 is active.

## First real membership card — acceptance after activation

1. In Create, tap the lower-left FAB. Use synthetic test data, for example name `Samsung Test`, membership number `000123456789`, and Code value `000123456789`. Choose a preset and color.
2. Add to Draft: the new card appears without moving existing cards; it is not saved yet.
3. Tap Save. Wait until successful committed readback returns to Home. On failure, the draft remains and the writer locks for explicit reinspection.
4. Open the new card. Verify its original payload in both QR and Code 128, and physically scan each with a separate scanner/device. Compare every character including leading zeros. Demo cards must not acquire fake codes.
5. Close Detail. Confirm positions remain unchanged. Search for the new card, then clear Search and compare saved coordinates.
6. Close and reopen the app/project without clearing storage. It must enter Home, select v2 without import/backup, and retain the membership card and exact layout.
7. Separately test Create changes followed by Cancel (retain Draft), Discard (restore Saved), and Save, including Android Hardware Back. Repeat with other presets as needed; the 240-row production limit remains.

Report the actual result after the first checkpoint before assuming the device migrated successfully. Do not send membership payloads or private wallet JSON in diagnostics.

## Verification and limits

- TypeScript passed. Read-only ESLint: 78 files, zero errors/warnings.
- Automated tests: **384/384**. Production integration: **26/26**, including approval-on startup/Review/consent without writes, a new empty installation, all seven presets, the existing UI-to-repository-to-fresh-owner flow, backup failures, pending, uncertainty, activation recovery and duplicate-import rejection.
- QR/Code 128 independent test decoder coverage remains in the full suite; this is separate from physical Samsung scan results.
- Android offline bundle export: `.expo/wallet-v2-step8-activation/` (1493 modules).
- Automated filesystem tests use synthetic, isolated mock data. A fresh owner readback is not proof of an OS process restart or crash safety on Samsung.
- Native move/readback does not guarantee fsync, power-loss atomicity or multi-process exclusion. Backup is a private local copy within the same app storage, not a separate-device disaster backup. OS backup policy and development/release-build acceptance remain separate work.
- No dependencies, schema, production grid/layout, storage protocol or website files were changed in this step. No commit, push or deploy.

Changed this step: `src/constants/wallet-release.ts`, `src/components/bemem/WalletMigrationPanel.tsx`, `scripts/test-production-integration.cjs`, and this report. Historical Step 7 readiness documents are retained unchanged.
