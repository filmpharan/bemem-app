# Phase 2 Step 7 — Production UI activation readiness

Status: **Activation flow connected and verified through production UI callbacks
with isolated fixtures. Real release gate remains FALSE.**

No real Samsung backup, import, cutover, owner switch or wallet mutation was
executed. Baseline remains `c500a015cfc80bd6a63c88d3848562b33f02faa3` and all prior
uncommitted work is retained.

## Changes that complete the existing flow

The existing Review/Consent sheet now:

- Shows current source, saved revision/card count and coordinator status without
  displaying membership payloads or raw exception messages.
- Allows review only when v1 is ready, clean and not saving. Opening the sheet
  still performs no readback/migration/backup action by itself.
- Invalidates displayed review/consent when generation, full Saved snapshot,
  revision, source, draft or save admission changes. A stale event callback checks
  the latest owner again before invoking cutover.
- Uses a synchronous UI operation ref to reject duplicate taps and block Close/
  Android Back while a requested operation is running. The existing coordinator,
  not this UI ref, remains the authoritative writer/admission lock.
- Invokes the existing `requestCutover` only after current review, explicit consent
  AND release approval. The actual release flag remains false.
- Closes the sheet after a verified ready_v2 owner/session is installed. Home/Create
  immediately projects the same owner's new Saved/Draft; no secondary wallet state
  or migration-complete flag is introduced.
- Shows pending/commit-uncertain/activation-incomplete status and the appropriate
  explicit Reinspect or Retry verified activation action. Neither retries import.
  Activation retry is disabled when release approval is absent.
- After a precommit failure and successful reinspection of v1, requires a fresh
  review/consent before another import attempt. Existing evidence is retained.

The Home recovery button also reflects the release lock rather than inviting an
unapproved activation retry. Existing geometry/styles and button locations are
unchanged; new text/actions communicate the required activation states.

The native runtime's existing read-only review now preserves typed reasons for
dirty/saving, pending, existing-v2, uncertainty and source-change failures instead
of reducing them to one generic Error. No new writer/storage mechanism was added.

## Existing activation sequence used, not recreated

The same root owner, coordinator, resolver, source reader, backup adapter and
repository from Steps 4–6 perform:

`Review → consent → synchronous v1 admission closure → drain in-flight save →
fresh v1/revision validation → exclusive backup → backup readback/integrity →
source bytes/revision recheck → memory migration and collision/policy validation →
repository pending/commit/readback → verified complete v2 runtime activation`.

After activation only the v2 writer is selected. Old v1 capabilities cannot write
through that owner. v1 source bytes/IDs/types/colors/orientations/coordinates/order/
revision/savedAt and the source manifest are retained. Unknown metadata still
fails closed. No existing cards are auto-placed, renamed, resized or converted to
memberships during migration.

Restart selection remains snapshot-based: a valid committed latest v2 is loaded;
there is no new import or demo creation. Corrupt/unsupported v2 and pending evidence
remain blocked, not silently replaced by v1/older revisions. Uncertain outcomes
require explicit reinspection; activation retry verifies its committed target and
does not rerun the backup/import transaction.

## End-to-end evidence

Seven focused tests were added to the EXISTING production-integration suite; no
new DEV route/harness, package, encoder/decoder or wallet engine was created.

1. **Actual Review/Consent with release=false:** opening/reviewing/acknowledging and
   even directly invoking a disabled execute callback write nothing. Cancel keeps v1.
2. **Actual production UI chain:** Home → Create → existing Review panel → consent
   → native backup readback paused at a controlled fixture boundary → duplicate tap
   and Android Back refused → verified activation → panel closes → actual Add Card
   editor → validated portrait 5×7 Draft → Save → Home → fresh owner reads saved v2
   → Home opens membership detail → QR/Code128 toggle → Close. Duplicate import is
   refused. Original source/manifest/demos/positions and exact strings are checked.
3. **Stale consent:** dirty Draft and completed v1 Save invalidate review, including
   a same-generation revision change and a previously captured execute callback.
4. **Backup failure:** UI stays locked, source bytes remain, no v2 commit; explicit
   reinspection does not write/retry and returns to a fresh-review requirement.
5. **Pending before review or after backup:** import is blocked, UI reports pending,
   and reinspection retains every evidence file without promotion/deletion.
6. **Commit uncertain after native move:** the panel does not report success or
   retry import. Explicit reinspection reads the committed snapshot and activates
   it without another backup/write.
7. **Commit succeeded, activation binding failed:** writer stays locked in
   activation_incomplete. The UI's verified activation retry installs v2 without
   writing/reimporting again.

Tests use actual production components/hooks/runtime/repository code. Native files
are replaced with a strict in-memory filesystem, native visual leaf components
with host mocks, and separate UI hook-state instances share the same root runtime.
The approved branch exists **only inside the fixture module loader**; the real
release file is never changed. This is functional code integration evidence, not
a physical React Native rendering/OS-process-restart/Samsung scan result.

The existing suites still cover all seven footprints and 240-row capacity,
Save/Discard/Cancel, Android Back, search/clear, independent ZXing decoding of
actual SVG geometry, legacy schemas, single-writer/revision guards, isolated host
filesystem readback, and production-gate protection.

## Validation

- TypeScript: passed.
- Read-only ESLint: 78 files, 0 errors / warnings.
- Automated tests: **382/382 passed** (production integration: 24 tests).
- Android export: passed, `.expo/wallet-v2-activation-readiness-review/metadata.json`.
- No dependency install or version/lockfile change in this step.
- No wallet schema, grid/preset/inset/radius, encoder, theme or original website change.

## Samsung checks now — no production mutation

```powershell
cd C:\ฉันจะทำเว็บไซด์\bemem-app
npx.cmd expo start
```

1. Open normal Home and confirm original saved cards/positions. Enter Create
   without dragging/saving, then open `Wallet v1 · Review Wallet v2`.
2. Confirm source/revision/count/status; press **Review migration · Read only**.
   It must display current metadata and `Review ready. No files were written.`
3. Acknowledge consent. **Back up, import and activate must remain disabled**.
   Cancel or Android Back returns to Create without changes; leave Create cleanly.
4. For synthetic card/scan testing, use the EXISTING `/dev-add-card` memory-only
   route: add a fictitious card, tap detail, switch QR/Code128, scan with another
   device and verify exact original payload, then Close/outside tap/Android Back.
   Its Test Save remains memory-only and is not evidence of production persistence.
5. Do not press normal production layout Save, perform real source-copy operations,
   change release flags, or attempt real import as part of this read-only acceptance.

This step did not run Samsung. Physical screen/scanner readback and actual cold
app restart remain separate acceptance items. The fixture restart proves the fresh
owner loads committed storage, not that Expo Go or the OS was physically restarted.
Expo Go cold-launch development bundle availability is also separate from offline
wallet/code operation in an installed build.

## Final separate approval and supervised cutover

After accepting the UI and synthetic scan results, explicitly authorize opening
the production release gate and making the real native source copy/import on
Samsung. Only then change the release approval in a separately authorized change;
the flag cannot be enabled by a route parameter or consent checkbox.

On the approved run:

1. Resolve Draft with Save/Discard/Cancel; finish any admitted save.
2. Freshly review source revision/count/pending/compatibility, then explicitly consent.
3. Let the connected flow create/read back the exclusive source copy, revalidate
   source, commit/read back v2 and activate. Retain v1 and every source copy.
4. Confirm Home/Create has v2; add a fictitious membership, Save, inspect Detail,
   scan both formats, fully close/reopen the app and verify data/positions remain.
5. Record results before any further migration/recovery action. If uncertain or
   pending, stop writing and use explicit reinspection; never repeat import blindly.

The code path is connected; no additional repository/owner/activation architecture
needs to be built before that acceptance. Actual data mutation still requires the
separate authorization expressly withheld in this request.

## Remaining limits

JS-process locks cannot exclude another native process/old app binary. Native move
and readback do not prove fsync/power-loss durability. Keep other writers/old bundles
out of the supervised activation. Unsupported metadata, corrupt v2 or >240-row
data must remain blocked for explicit review, never clamped or silently restored.
Share, History/Receipts, Edit and image picking remain explicitly unfinished, as
before. No actual Samsung backup is claimed.

## Files changed

- `src/components/bemem/WalletMigrationPanel.tsx` — current-review/consent validation,
  duplicate-tap/unmount/close protection, explicit states, recovery and verified close.
- `src/lib/wallet-device-runtime.ts` — preserve typed read-only review failure reasons.
- `src/app/index.tsx` — prevent unapproved activation retry from Home recovery control.
- `scripts/test-production-integration.cjs` — existing fixture UI runner and seven
  end-to-end/recovery scenarios extended; no production flag mutation.
- `PHASE2-ACTIVATION-READINESS.md` — this evidence and device acceptance procedure.

Release gate remains false. No production backup/import/cutover, actual owner
switch, reset/revert, commit/push/deploy or website edit was performed.
