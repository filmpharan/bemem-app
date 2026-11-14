# Card History & Receipts

Implemented for device review; native Samsung validation is pending. No device data was accessed during development. No new dependencies, commits, pushes or deployment.

## Features and permissions

- Home → Membership Card → **View Card History & Receipts**: viewing only, including opening/sharing receipt images. Card Detail's selected code format and side survive returning.
- Create → Membership Card → History: add/edit/delete Visit, Purchase and Note records, plus **Clear History**. Resolve Canvas Draft through the existing Save/Discard/Cancel first. Demo cards remain unchanged.
- Date uses validated `YYYY-MM-DD`; optional time `HH:mm`; merchant/description, notes and optional currency/amount. User-entered, never merchant-verified. Newest record dates/times first, stable tie order.
- Supported currencies THB/USD/EUR/GBP (2 decimal places), JPY (0). Amounts persist as canonical integer **strings** in minor units; no floating-point money calculations. Empty amount means no monetary value.
- Forms preserve input on error, confirm dirty Cancel/Android Back, and synchronously reject repeated submissions. After an unconfirmed save, close without retry then explicitly Reload History.
- Camera/Gallery receipts: multiple (up to 20 per record), replace, remove, open, optional non-destructive crop. Original aspect ratio is the default. Crop offers original ratio or an explicit square crop, pan/zoom and accessible directional alternatives. No OCR.
- Full-screen receipt viewer scrolls long images at readable width. Share exports only the displayed receipt bitmap to PNG, without record labels, Wallet metadata or EXIF. Uniform export downsampling fits 960×3500 pixels; original managed files are unchanged. Returning from the native chooser does not claim successful delivery.

## Existing code reused

Read `.agents/skills/mobile-design/SKILL.md`, its design-process/forms/accessibility-touch/feasibility-risk references, and `.agents/skills/ui-ux-pro-max/SKILL.md`. Ran its local UX search `form validation error feedback`; applied relevant cross-platform submission feedback guidance. Design read: an offline membership wallet with user-managed receipts, existing Pearl Gray — Lagoon Glass, Android-first/Samsung with iOS support.

Reuse: AddCardSheet (Safe Area, keyboard avoidance, scroll, native Back), GlassButton, Lagoon typography/tokens; createArtworkStore + validateImageSelection + artworkFrame; exported existing ArtworkCrop with an optional local source URI; CardArtworkImage with optional source URI/corner radius (existing defaults preserved); installed image picker; existing cardShareNative/createCardShareSession/view-shot; existing membership deletion through the one Wallet Runtime Owner and its existing save/readback checks.

Official API checks against installed Expo 58 versions:

- https://docs.expo.dev/versions/v58.0.0/sdk/filesystem/
- https://docs.expo.dev/versions/v58.0.0/sdk/imagepicker/
- https://docs.expo.dev/versions/v58.0.0/sdk/image/
- https://docs.expo.dev/versions/v58.0.0/sdk/sharing/

## Storage and transaction boundary

**No Wallet schema extension, migration, startup read/write change, new Wallet writer, or Grid change.** Constructing the History adapters performs no disk IO. Only an explicit History entry/review loads this feature's files.

Private Documents directories:

| Directory | Contents |
| --- | --- |
| `bemem-card-history/` | `HistoryDocument {schemaVersion:1,dataset:"bemem-history",revision,savedAt,records}` snapshots |
| `bemem-receipts/` | Immutable copies of selected JPEG/PNG/WebP files, isolated from card artwork |
| `bemem-history-deletions/` | Recovery intent containing affected records/receipt references until cross-store deletion finishes |

Each record contains `id, cardId, type, date, time, description, notes, money, receipts, createdAt, updatedAt`. Receipt metadata reuses CardArtwork's asset ID, dimensions, size, MD5 and crop, adding receipt `id` and optional explicit `cropRatio`. No camera/gallery URI or Base64 is persisted. Limits: 10 MiB/24 megapixels per image. Header/type checks, native decoder validation before retention, copy digest/size verification, and pre/postcommit receipt integrity checks.

History Repository uses the existing WalletFiles adapter shape without changing Wallet repository logic. A shared JS-process gate checks pending evidence and expected revision, writes an exclusive Pending snapshot, validates exact readback, rechecks revision/pending/session, moves exclusively, reads committed bytes back, then verifies image integrity. Only then is save confirmed. Pending is never deleted automatically; uncertain writes latch until explicit inspection. A corrupt latest snapshot never falls back to an earlier version or an empty document. Independent capability sessions capture Wallet generation/revision/context and a cloned History snapshot. History commands cannot write Wallet data.

Postcommit cleanup only considers exact retired receipt references, preserves files still referenced by any other record/card, and never visits card artwork or Wallet backups. After latest readback, obsolete **History-only** JSON snapshots are removed so deleted private records are not deliberately retained there. Failed cleanup is reported; orphan files from cancelled selections or interrupted cleanup are retained safely, not broadly swept. Cleanup is outside transaction success and never triggers an automatic save retry.

## Approved card-delete and Clear History policy

The user explicitly approved cascading removal on a separate **Delete Card & History** confirmation, not a history-based Delete block.

1. Existing Delete entry in Edit and confirmation layout remain. Preflight reads actual history/receipt counts. With no history the existing card-only wording/action/writer remains.
2. With history: one confirmation names actual counts and **Delete Card & History**, with Cancel preferred. Cancelling performs no writes.
3. Confirmation consumes a single-use review token. Recheck Wallet identity, generation/revision, History revision/records and image integrity. A per-card admission lock rejects new History saves; an existing History write prevents starting deletion.
4. Persist and verify a deletion recovery intent **before** removing any history. This preserves affected records and receipt metadata. No large images are embedded.
5. Remove only that card's history through verified History snapshot persistence. Keep receipt image files.
6. Run the existing Wallet v2 Single Writer deletion; verify expected revision, exact remaining cards and unchanged other Grid positions.
7. Only after both stores are verified, clean unused receipts/obsolete History snapshots and remove the recovery intent. Cleanup failure reports a warning and leaves recovery evidence when still present. It does not rerun card deletion.

**Recovery:** Opening History lists interrupted deletion intents. From Create, after Wallet reinspection/resolving Draft, explicitly **Restore Preserved History** if the card is still present. Restore validates current revision and refuses to overwrite different records/ID conflicts. If the card is confirmed absent and its records absent, **Finish Receipt Cleanup** only cleans unused receipt files and the intent. No automatic deletion/restore/retry on startup. Other cards' history is unchanged.

**Clear History** is a separate action within the selected card's History screen, with actual record/attachment counts and Cancel first. It removes only that card's records using expected revision and readback, then safe cleanup. Wallet/Card ID/number/appearance/size/Grid remain untouched. Recording can resume normally.

## Files in this workstream

New:

- `src/lib/card-history.ts`: types, strict validation, dates/money, sorting, form mapping.
- `src/lib/card-history-repository.ts`: History-only snapshot gate/readback/revision handling.
- `src/lib/card-history-commands.ts`: scoped UI commands, single submission admission, CRUD/Clear.
- `src/lib/card-history-native.ts`: dedicated Documents adapters, managed receipt copies/integrity/retired file cleanup.
- `src/lib/receipt-picker.ts`: cancellable selection orchestration through injected ports.
- `src/lib/card-history-deletion.ts`: review/consent, recoverable cross-store deletion, explicit recovery.
- `src/lib/card-history-delete-native.ts`: immutable recovery-intent filesystem adapter.
- `src/components/bemem/CardHistorySheet.tsx`: History list/detail/editor, Clear and recovery controls.
- `src/components/bemem/ReceiptAttachments.tsx`: picker, thumbnails, replace/remove/crop/view.
- `src/components/bemem/ReceiptViewer.tsx`: scrolling viewer and receipt-only native sharing.
- `scripts/test-card-history.cjs`: synthetic filesystem/decoder/native/React fixtures; no phone data.
- This report.

Updated:

- `src/components/bemem/MembershipCardDetail.tsx`: functional History entry only.
- `src/components/bemem/CardArtworkControls.tsx`: export crop UI with optional source URI; existing Add/Edit defaults unchanged.
- `src/components/bemem/CardArtworkImage.tsx`: optional local source URI and corner radius, retaining existing card defaults.
- `src/components/bemem/EditMembershipCardEditor.tsx`: read-only preflight and approved counts/confirmation/warning for Delete; form layout unchanged.
- `src/lib/wallet-feature-commands.ts`: optional deletion policy, review token/cancellation and recheck before the original writer.
- `src/lib/wallet-device-runtime.ts`: supply one History deletion policy from the existing owner.
- `scripts/test-card-detail.cjs`: History navigation/return regression.
- `scripts/test-production-integration.cjs`: isolate the new History policy in existing Wallet-only regressions. Real History filesystem and history-aware Wallet command integration are covered separately by the new suite.

## Validation

- TypeScript: pass.
- Read-only ESLint: 104 files, zero errors/warnings.
- Automated tests: 611/611 passed; 88 History-specific. All use synthetic data/mock native APIs. Existing Add/Edit/Delete/Share regressions included.
- Android export: 1,530 modules, generated `.expo/card-history-receipts/`. Metro export prints `Exported` but leaves the CLI alive in this environment; it is stopped after artifacts are generated. This is not a clean CLI exit, installation or a native Samsung test.
- SHA-256 comparison: 23 protected Wallet schema/repository/coordinator/migration/backup/Grid/encoder files unchanged. Only the approved delete-policy integration touches device runtime/feature commands. Existing work remains uncommitted. Original website was never written.

## Remaining limits

- Filesystem move + readback is not a guarantee of native power-loss/fsync atomicity, nor an OS/multi-process lock. Separate History and Wallet deletion is recoverable, not an all-or-nothing cross-store transaction.
- Ambiguous/corrupt pending History files or partial recovery-intent files block writes and are preserved. This release deliberately does not offer destructive pending-file repair; such cases require inspection/recovery planning rather than automatic cleanup.
- Interrupted deletion recovery appears inside History on any membership card. If the last card was successfully deleted and only cleanup remains, files are preserved until History can next be opened from a membership card; no startup sweep runs.
- If cleanup itself fails, historical JSON copies/unused receipt files can remain. Cancellation can retain an unreferenced newly selected receipt. No broad storage reclamation is implemented.
- Image files/JSON use the existing app-private filesystem and OS backup policy; this is not new encryption or an end-to-end encrypted backup claim.
- Native camera permissions, HEIC-to-compatible picker behavior, crop gestures, enlarged fonts, keyboard/safe area, long receipt capture and chooser cancellation require Samsung verification. Receipt share is a PNG rendering (possibly downsampled), not a guaranteed original-resolution/byte-for-byte export. Very large/malformed images can still fail decoding/capture; the UI reports failure and keeps data.
- No OCR, merchant verification, cloud, analytics or new permissions unrelated to the camera. No real member/receipt data is logged.

## One Samsung end-to-end workflow

1. Run `npx.cmd expo start` in `bemem-app`, open the existing app in Expo Go and Reload. Do not clear app data or reinstall.
2. Use a disposable membership test card, enter Create, and Save/Discard any Canvas Draft before opening its Card Detail → History.
3. Add a Purchase with date, time, `19.95 THB`, merchant/notes. Add a Gallery photo and a Camera photo; cancel one picker/failed replacement and confirm the existing attachments remain.
4. Open a receipt, scroll it, Share and cancel the native chooser. Try an explicit crop and Cancel first, then apply it. Save Record once/tap twice rapidly; exactly one record must appear after readback.
5. Edit the record. Cancel/Android Back must ask about dirty changes and leave the saved record unchanged. Reopen, edit and Save; record count/ID stay stable. Check another card has independent empty/different history.
6. Return to Home → same Card → History. Records/receipts can be viewed/shared; management actions are absent. QR/Code128 and Canvas placement remain unchanged.
7. Enable Airplane Mode, close/reopen the app and read the same record/photos. No network is needed; compare saved date/amount/notes.
8. From Create choose Clear History: inspect counts and Cancel, then explicitly Clear on the disposable card. The card and Grid position remain; add another record to confirm recording resumes.
9. Add records/receipts again. From Edit → Delete Card inspect the actual counts, Cancel and verify everything remains. Only on the disposable card explicitly choose Delete Card & History. After verified deletion/restart, unrelated cards, histories and positions must remain unchanged.

Do not inject filesystem corruption or delete real saved cards merely to test failures on the phone. Those cases are exercised with isolated fixtures. Stop for user review after this workstream.
