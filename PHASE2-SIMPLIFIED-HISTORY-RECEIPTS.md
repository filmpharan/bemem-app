# Simplified History & Receipts — Home Add / Create Select & Delete

Implemented, pending Samsung review. No production device data was accessed. No dependencies were added; no commit, push, deployment, Wallet reset or migration.

## Delivered workflow

**Home = View + Add.** Card Detail → History & Receipts → Add Photo. The form contains one image, its existing Take Photo/Gallery/Replace/Remove/Crop controls, one optional multiline note, Save and Cancel. No category/date/time/merchant/amount/currency fields. An image is required; a note is not. No record editor or destructive History controls are available from Home, including inside the entry detail or photo viewer. Membership-card editing remains unchanged/read-only from Home.

**Create = View + Select + Delete.** No Add Photo/Add Record action. Select exposes accessible checkboxes, a live selected-entry count, Select All, Cancel Selection and Delete Selected. Whole rows are 48dp+ touch targets (minimum 88dp row height); the smaller checkbox is decorative. One confirmation shows actual selected-entry and attachment counts, including multiple photos on legacy records. Cancel retains selection and all stored data. Confirm deletes only selected IDs on the selected card; selection clears only after verified persistence. Android Back first cancels selection. Checkbox state is never saved.

**Clear History** is Select → Select All → Delete Selected, using the same expected-revision/readback/cleanup path. It keeps the card and Grid unchanged. No duplicate Clear action is shown.

Save returns to the list, scrolls to offset zero, and displays the new entry first. Full-size viewing and native photo sharing reuse ReceiptViewer without changing the approved Card Sharing workflow.

## Context enforcement

`HistoryAdmission` explicitly carries `context: 'home' | 'create'`. `createHistoryCommands` captures it alongside Wallet generation/revision on load. Admission is checked synchronously and again by the existing repository before commit:

- `savePhoto()` requires the captured/current Home context, matching session, existing membership card, unlocked Wallet and resolved Draft/recovery state.
- `deleteSelected()` and `clear()` require Create under the same guards.
- A changed context cannot reuse the previous session. UI state alone does not authorize writes.
- The previous structured record save/edit API is no longer exposed by these UI commands. New-entry editing is intentionally absent; remove unwanted entries from Create, then recreate from Home.

No History command has a Wallet write port. Delete Card & History continues through the existing separate recoverable deletion policy; that policy and its confirmation/recovery logic were not modified.

## Model compatibility and ordering

Reuse HistoryDocument `schemaVersion: 1` and the existing repository/managed receipt folders. Add only optional `entryKind: 'photo'` to new entries. Existing structured entries without that field still validate and remain unchanged; no migration/backfill runs.

A new entry contains exactly one managed receipt reference, note, stable `createdAt`/`updatedAt` and identity/card association. The established internal record shape remains: `type: 'note'`, empty description, `money: null`, automatic UTC date/time derived from creation time. Those compatibility fields are not shown as accounting inputs. Validation accepts only the declared photo marker and checks its one-image/automatic-time relationships; arbitrary unknown fields remain rejected.

The creation timestamp is generated inside the admitted Save attempt, not taken from photo EXIF and not entered by the user. An entry becomes visible only after the existing writer confirms commit/readback. Display uses the device's local date/time format.

Per-card ordering uses descending `createdAt`, never manual legacy date or `updatedAt`. Equal timestamps use descending persisted append position, then stable ID. Thus newly appended entries with the same timestamp appear first, and the order survives serialization, restart and offline readback. Viewing an entry never writes or changes its timestamp. Deleting keeps the relative order of surviving entries.

Legacy entries open a read-only detail with their original category, manually entered date/time, description, money/currency, full note and **all** attachments. Their list rows use the same creation-time ordering, but original dates remain visible in detail. Records with no photo show an Entry fallback, not a fabricated image. Saving a new entry does not add the marker or discard fields on older records. Older app binaries with validators that reject the new optional field should not be used to write these updated History snapshots.

## Mobile rendering

History uses a bounded FlatList, not a FlatList nested inside the form ScrollView. It receives all entry metadata without a count cap; image rows are virtualized in small batches (`initialNumToRender=6`, `maxToRenderPerBatch=6`, `windowSize=5`). Selection is passed through extraData and stable record IDs are keys.

Thumbnail frames are bounded to 64×80dp and preserve image ratio/crop with the existing artworkFrame calculation. expo-image uses `contentFit="contain"`, downscaling and a recycling key, rather than requesting every original-size bitmap at once. Notes preview at two lines; full notes remain readable in detail. The note input starts around two lines, supports scrolling, and retains a practical 100,000-character validation ceiling. There is no entry-count limit.

AddCardSheet gained an opt-in `virtualized` layout for this History list only: bounded body, shared header and independently scrollable actions for enlarged fonts. Its default Add/Edit Card/form layout, keyboard behavior and spacing remain unchanged. Button labels wrap; checkbox marks use native borders instead of font glyphs.

Existing Camera/Gallery permission handling, compatible image validation/copying, immutable receipt storage, crop controls, full-screen viewer and explicit native sharing are reused. The single-image mode of ReceiptAttachments hides duplicate add controls once a photo is selected. Failed/cancelled replacement preserves the old selection and note; Remove affects only the unsaved form until Save.

Skills used: project `mobile-design` (existing mobile/forms/touch/list guidance) and `ui-ux-pro-max` (local UX search `multiple selection touch feedback`; applied mobile target/spacing guidance). Pearl Gray — Lagoon Glass remains unchanged.

Official API references checked:

- https://reactnative.dev/docs/flatlist (React Native 0.88)
- https://docs.expo.dev/versions/v58.0.0/sdk/image/

## Persistence and safety retained

The History repository, native filesystem adapters, receipt directories, transaction protocol and deletion recovery implementation are unchanged. New images still copy into managed Documents storage, never persist picker/cache URIs in JSON. Money parsing survives only for legacy compatibility; no new financial UI/calculation was added.

Pending/corrupt/uncertain states block writes, retain evidence and never auto-retry. Save/Delete double-tap guards, expected revision, Wallet generation/context checks, exact readback and postcommit reference-aware cleanup remain. A failed form save preserves input; closing without retry exposes Reload History. Receipt deletion runs only after verified persistence and keeps files referenced by other records/cards. No artwork/export/Wallet backup cleanup is introduced.

The prior Delete Card & History procedure remains: actual-count consent → verified recovery intent → verified History removal → existing Wallet Single Writer delete/readback → receipt cleanup. Regression coverage includes new photo markers mixed with legacy records and explicit restoration after a Wallet deletion failure.

## Files changed

Production (5):

1. `src/components/bemem/CardHistorySheet.tsx` — minimal Home photo form, virtualized list, legacy detail and Create selection workflow.
2. `src/components/bemem/ReceiptAttachments.tsx` — opt-in single-photo presentation using existing image interactions.
3. `src/components/bemem/AddCardSheet.tsx` — opt-in bounded virtualized body; default form layout retained.
4. `src/lib/card-history.ts` — optional strict photo marker, photo preparation, creation-time sorting/local display; legacy reader retained.
5. `src/lib/card-history-commands.ts` — explicit context admission, savePhoto/deleteSelected and Create-only Clear.

Tests: `scripts/test-card-history.cjs` updated for the new contract and expanded.

New document: this report. The earlier History report remains as implementation history.

SHA-256 comparison against this task's initial source snapshot: exactly the five Production files above changed; **116 other source files unchanged**. Home/Create, Card Detail, Add/Edit editors, Wallet schema/storage/migration/backup/coordinator/owner, Grid, encoders, sharing implementation and card-delete policy are unchanged. Existing uncommitted work is preserved. Git HEAD remains `c500a015cfc80bd6a63c88d3848562b33f02faa3`.

## Validation

- TypeScript: passed.
- Read-only ESLint: 104 files; zero errors/warnings.
- History/receipts automated suite: **122/122 passed**. Includes Home Camera/Gallery save, optional/long note, replacement/cancellation/removal, context bypass rejection, stable creation-time ties, restart/offline readback, no entry cap (1,200-entry fixture), virtualized list configuration, checkbox/multi-select/deselect/Back/cancel/batch-delete/Select All, legacy metadata/multiple photos, errors, duplication, corrupt/pending states, readback/cleanup and recoverable card deletion.
- Full suite: **645/645 passed**, including Add/Edit/Delete/Share/QR/Code128/runtime regressions.
- Android export: **1,530 modules**, artifacts generated at `.expo/simplified-history-receipts/`. The CLI stays alive after reporting `Exported` in this environment and is stopped after artifact generation; this is not a clean CLI exit, installation or a Samsung device test.
- All fixtures are synthetic and filesystem/native APIs mocked. No existing Samsung records or files were used for tests.

## Known limits / device checks

- The existing filesystem protocol is not a guarantee of OS-level fsync/crash atomicity or multi-process locking. Ambiguous pending files remain blocked for inspection; no destructive pending-file repair was added.
- Time comes from the device clock, not a server/merchant. Local display follows device locale/timezone.
- Virtualized image rendering reduces simultaneous bitmap work, but History JSON metadata still loads as one snapshot. Large real albums, enlarged text, keyboard/safe area, capture/crop/share and Samsung memory behavior need device verification.
- Existing image limits remain 10 MiB/24 megapixels, JPEG/PNG/WebP. Legacy records retain their existing multiple attachments (up to the previously supported limit). New entries require one image each.
- Cancelled selections can leave an unreferenced managed image, as before. Cleanup failures retain files and report a warning rather than broadly sweeping storage. Existing last-card-deletion cleanup recovery limitations remain documented in the earlier report.
- Receipt viewer/sharing behavior and possible uniform PNG downsampling remain as implemented previously; this task does not promise original-byte photo export.

## One Samsung workflow

1. Run `npx.cmd expo start`, open the existing Expo Go app and Reload. Do not clear app data or reinstall.
2. Home → a disposable membership test card → History → Add Photo. Choose Gallery, add an optional note, Save. Repeat using Camera with no note. Both entries must appear at the top in creation order.
3. Begin another entry: change the note, cancel Gallery, Replace/Remove a selected photo, then Cancel/Android Back. Confirm no new history entry was saved and the existing entries remain.
4. Open a saved photo/full note and share/cancel sharing. Confirm Home offers Add Photo but no Select/Delete/Clear/Edit controls. Open an old structured record if one exists and check its original fields/all photos.
5. Close/reopen in Airplane Mode. Order, photos and notes must remain. Create → same card → History: Add is absent. Select two entries, deselect one, Cancel Selection, then select again and cancel the delete dialog; nothing should be removed.
6. Confirm Delete Selected for disposable entries only. Check unselected entries and another card's history are unchanged. Test Select All as Clear History on the disposable card; its identity, appearance and Grid position must remain. Return Home and add a new entry again.
7. With larger system fonts, check note input/keyboard, wrapping controls, selection count, scrolling and Android Back. Existing Add/Edit Card and QR/Code128/Share should behave as before.

Stop after this implementation and user device review. No next feature begins automatically.
