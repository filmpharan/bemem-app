# Card Detail & Edit UX refinement

Status: all three parts implemented; awaiting Samsung review. No production wallet data was accessed or changed during development/tests.

## 1. Pencil after card name

The shared MembershipCardDetail now displays a 48×48dp pencil entry immediately after the name when opened from Create with edit commands. It opens the existing EditMembershipCardEditor. Share remains disabled/Coming soon in Home; Home does not render Edit or Delete. Changing the Detail context to Home cannot retain an Edit screen. The header title can wrap without truncation, with the pencil and Close targets kept separate.

The former bottom Edit/Delete actions were removed from membership Detail. No second Detail UI was created.

## 2. Delete inside Edit

Delete Card is below Cancel, with 12dp additional separation plus the existing footer gap, a 48dp minimum target and the existing destructive color. It is rendered only when the Create Detail supplies the deletion-completion capability for a membership editor. Add has no Delete action; Demo deletion remains rejected by the existing command layer.

The old openDelete/confirmDelete/cancelDelete flow is reused without changing the feature commands, repository, coordinator or storage. Confirmation retains its original title, saved card name, warning and Cancel/Delete buttons. If the local form is dirty, the same confirmation explicitly says those edits will not be saved and Cancel retains them; there is no additional confirmation step.

Only confirmDelete is called: unsaved form values are never applied to Wallet Draft or saved before deleting. The synchronous guard blocks Save/Delete/Close during the deletion, and blocks queued Save callbacks while confirmation is open. Cancel retains all inputs and writes nothing. Verified success invokes onDeleted, which closes both Edit and Detail. Failure/commit uncertainty retains form inputs, reports the existing error and disables further Save/Delete when reinspection is required; no automatic retry/rollback occurs.

## 3. Compact Detail

- Code Panel's unused 24dp top padding and the separate 52dp lower controls row were removed.
- On a sufficiently wide screen, QR label and toggle occupy the left/right spaces beside the existing QR image. Bounds leave at least 8dp between controls and the existing maximum 176dp QR viewport, including its quiet zone.
- Full-width Barcode, narrow screens and enlarged labels use a populated upper edge outside the SVG instead. The edge is at least 48dp tall and grows with font scaling and measured multiline label height; SVG content starts below it with a 4dp gap. This deliberately prioritizes safe scanning over placing controls over bars or quiet zones. No separate lower action row remains.
- Normal-width QR top/bottom padding is 8dp. For normal-font Barcode, the panel's former 80dp surrounding vertical allocation becomes 60dp; the 126dp SVG/110dp bars are unchanged.
- Main content gaps changed from 20dp to 8dp, with the preview-row extra top margin removed.
- Preview slot height now uses the selected card's footprintHeight instead of the reserved maximum-preset stageHeight. The existing cardDetailGeometry function, shared scale, paint size, 0.1-block inset and 14dp radius are unchanged for every preset. The membership number therefore follows the actual card footprint, without compensating blank space elsewhere.
- Scroll, safe area, Close/outside tap/Android Back, tap/swipe code toggling, Front/Back, expiration, number and History/Receipts remain.

There was no change to CardCodeView, SVG encoders, payloads or their image-fit logic. Long-code error handling and all encoder/decoder tests still run unchanged.

## Skill use and scope

Reading this as incremental offline membership-wallet refinement on Android/iOS, preserving Pearl Gray Lagoon Glass and prioritizing existing touch/data behavior. Design variance 1, motion 1, visual density adjusted only as requested.

mobile-design accessibility/touch guidance was used for 48dp targets, destructive-action spacing and cancellation. ui-ux-pro-max's local touch-target/confirmation/spacing search was used for consistency. No tokens, fonts, materials, dependencies, prototypes or DEV harnesses were added or redesigned.

Source hashes were compared before/after: only these four Production source files changed:

1. src/components/bemem/MembershipCardDetail.tsx
2. src/components/bemem/EditMembershipCardEditor.tsx
3. src/components/bemem/AddCardIcon.tsx
4. src/lib/card-detail-controls.ts (new pure display-bounds helper)

Tests updated/extended:

5. scripts/test-card-detail.cjs
6. scripts/test-production-integration.cjs

Report:

7. PHASE2-CARD-DETAIL-EDIT-UX-REFINEMENT.md

AddCardForm, AddCardEditor, AddCardSheet, Home/Create source, grid logic, wallet schema/storage/migration/backup and encoders were not edited in this request. Prior uncommitted changes remain intact. The original website was not edited. No commit, push, deployment, reset or Expo Go data clearing occurred.

## Validation

- TypeScript: passed.
- Read-only ESLint: 89 files, 0 errors, 0 warnings.
- Automated tests: 488/488 passed (25 Detail tests and 73 Production integration tests included). Synthetic records and mock storage only; no real membership card was deleted.
- New coverage: contextual pencil/Share, hidden lower Detail actions, Delete footer order, dirty Delete Cancel, queued Save rejection, closure of both screens only after readback, uncertainty retention, Add without Delete, safe code-control bounds across widths/font scales, and all seven footprints without reserved stage whitespace.
- Android export generated 1508 modules and metadata at `.expo/card-detail-edit-ux-refinement/`. As in earlier exports, CLI remained alive after printing Exported and was interrupted after artifact generation; this is not a clean CLI exit.

## Samsung review

1. Reload Expo Go. From Home, open a membership card: Share remains Coming soon, and Edit/Delete are absent. Tap/swipe between QR and Code128; verify the physical codes still scan.
2. Open the same card from Create: pencil follows the name and opens the original full Edit form. No bottom Edit/Delete action should remain in membership Detail.
3. In Edit, change a field, tap Delete below Cancel, then cancel confirmation. Verify the typed values remain and no save/deletion occurred. Check Android Back/Close still uses the unsaved-form dialog.
4. Use a disposable test card for confirmed Delete. Verify both Edit and Detail close only after saving; only that card disappears and other cards keep their positions.
5. Check normal/enlarged fonts, long names, narrow screens, QR and full-width Code128. Controls must stay outside code/quiet zones and remain tappable. Preview/number spacing should be smaller for Landscape and Mini cards; all seven actual card sizes must remain proportional. Keyboard/Scroll/Safe Area require native-device confirmation.

No real Samsung rendering, touch or physical scanning result is claimed by the automated suite.
