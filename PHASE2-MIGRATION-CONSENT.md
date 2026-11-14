# Step 2C.3 — Migration Preview & Consent review

Device Import is LOCKED in this step. Only synthetic/mock tests execute the writer path. No normal startup, Home/Create, Phase 1 Save or Saved/Draft runtime changes.

## Open on Samsung

Run `npx.cmd expo start --clear`, then open `exp://<LAN-IP>:<PORT>/--/dev-wallet-migration` in Expo Go.

1. Press **Preview Migration** manually. No reads/imports run automatically on page open.
2. Review source, card count, revision, Canvas compatibility, pending count and readiness. Given the last reported Samsung state, expect Wallet v1 / 4 cards / revision 10 / compatible / pending 0, provided no data has changed.
3. Press **Review Consent** to review the proposed confirmation wording.
4. **Import locked · awaiting approval** remains disabled, with no press handler. Cancel clears consent and invalidates the preview; repeat Preview to continue reviewing.

The device factory only supplies read methods and forbidden writer stubs to the repository. It hands NO import writer to the consent coordinator. A URL parameter cannot enable Import. Production redirects to Home and the device factory rejects outside DEV.

## Prepared writer flow (mock-tested only)

`createMigrationConsent(readers, writer?, now?)` provides `preview`, `requestConsent`, `cancel`, `confirm`. The writer is optional and absent on-device. Preview and outcomes contain metadata/status only, not source JSON, card objects, IDs, names, numbers or code payloads. Source comparison data remains inside the coordinator's memory.

After explicit confirmation in a future approved UI:

- Re-read v2 inventory/load and v1 through the existing reader; prepare migration again.
- Refuse existing v2, corrupt/unsupported/unreadable state, pending files, missing v1 or incompatible Canvas.
- Compare complete freshly read v1 JSON with the reviewed source, including revision, savedAt and layout. If changed, require a new Preview instead of importing old data.
- Check pending inventory again immediately before `importPhase1`. Repository checks that v2 is still empty and uses its existing Pending → Validate → Commit pipeline.
- Read v2 through `load()` after import; compare both the repository result and readback against freshly prepared expected v2.
- Preserve IDs/colors/orientations/coordinates, demo kind, source revision and source savedAt. No fake membership numbers are created.
- Return separate confirmation/verification times in outcome metadata. These are not added to WalletDocument or written back to v1; no schema change occurs.
- Known pre-commit failures return `failed`. Ambiguous failures during/after commit return `commit-uncertain`. Never retry automatically; the same coordinator refuses a second attempt. Inspect storage, then create a newly reviewed flow only after an explicit decision.

There is no v1 write/move/delete API in this flow. Existing v1 files stay unchanged. A new v2 import preserves v1's revision/time rather than inventing a new source timestamp.

## Remaining approval and verification

- Owner must approve the displayed Preview/Consent and safety gates BEFORE a native writer is connected.
- No actual import has been performed on Samsung by this implementation. Mock import success is not a device import result.
- Rechecks are not an OS transaction spanning v1, v2 inventory and final promotion. Concurrent external writers can race checks; atomic multi-process guarantees are not claimed. Before enabling imports, review in-process operation coordination and whether pending admission must be enforced inside a shared repository transaction gate.
- Readback failure/commit uncertainty requires diagnostics/recovery review, not silent rollback, duplicate import or v1 fallback.
- The current v1 validator already refuses layouts beyond its legacy 240-row limits. Such invalid v1 input is blocked before migration; the additional compatibility gate also checks prepared documents. Dynamic Canvas is not implemented here.
- Home/Create will continue using Phase 1 even after a future separately approved test import, until runtime adoption is explicitly approved.

Automated tests use synthetic v1 revision 10, mock v2 storage, failed writes and uncertain moves. Real device validation for this step is Preview/Consent review only. Do not alter real wallet files to simulate errors.
