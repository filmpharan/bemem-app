# Photo Journal — 1–4 Photos Per Entry

Implemented for Samsung review. No dependencies, commits, pushes or deployments. No phone data or original website files were modified.

## Behavior

- One entry contains **1–4 photos, one automatic creation timestamp and one optional note**. Zero/five photos are rejected. There is no new limit on the number of separate entries.
- Camera adds one photo per capture. Gallery enables multi-selection with the remaining slot count. Results append to the current array in returned selection order; nothing replaces an existing photo.
- A compact two-column grid immediately shows the selected photos at their original aspect ratios, with `0/4` through `4/4 photos`. Camera/Gallery remain available below four; at four, the maximum message replaces those controls.
- Add Photo has **no Replace, Crop or Remove controls** and never launches a crop editor. The entry can be abandoned through the existing dirty Cancel/Android Back confirmation.
- Save persists one History item containing all references through the existing writer/readback. The first photo remains the list thumbnail; the list shows the photo count when greater than one. Entry detail opens every photo in the existing full-screen viewer/share workflow.
- Home remains View + Add; Create remains View + Select + Delete. Newest-first ordering, notes/timestamps, selected-entry deletion and recoverable Delete Card & History are unchanged.

## Selection and failure safety

`pickReceipts()` checks capacity before copying anything. Gallery requests `allowsMultipleSelection`, `selectionLimit` equal to remaining slots, and `orderedSelection` where supported; editing is disabled. If a native picker returns too many photos, the UI explains the actual remaining slots and adds none. It does not silently slice the result.

Each selection is staged as a complete batch. Managed copies use the existing receipt store and integrity checks. If a later image copy fails, none of that batch enters the form; already selected photos and the note remain. Save is blocked until another explicit selection succeeds or the entry is cancelled. Cancelling the picker itself retains the draft and does not resolve an earlier failed batch. No automatic retry occurs.

Synchronous busy/error/current-form refs prevent duplicate submissions, stale Save callbacks using an earlier one-photo form, saves while a picker is active, or a stale close callback discarding a newly appended draft without confirmation. History writes remain under the existing expected-revision/session/Single Writer gate. No partial successful History entry is reported.

If an image copy succeeded before a later batch failure or Cancel, that new unreferenced managed copy may remain, consistent with existing conservative cleanup. This change does not sweep files or remove existing user photos.

## Compatibility

The existing History schemaVersion and repository are retained. Only validation for `entryKind: 'photo'` is widened from one to **1–4** attachments; preparation now consumes an ordered image array. Previously saved one-photo entries still validate unchanged. Legacy structured records retain the established attachment rules (including more than four), metadata and all photos. No backfill/migration/rewrite runs.

New entries retain the existing compatibility fields and creation timestamp semantics. No Wallet schema, migration, layout or membership-card fields change. Existing cleanup is reference-aware: deleting a selected entry removes its photo references, then removes only files not used by other records/cards after verified persistence.

Journal grid images opt into existing image rendering with `contentFit="contain"` and downscaling at thumbnail size. Other card/artwork rendering keeps its previous defaults, preserving card geometry and appearance.

Official API check: installed Expo SDK 58 / image-picker ~58.0.10; [versioned ImagePicker documentation](https://docs.expo.dev/versions/v58.0.0/sdk/imagepicker/). Selection limits are also enforced in JavaScript, not trusted solely to the native picker. Project mobile-design and ui-ux-pro-max guidance were reused for 48dp+ touch targets, spacing and existing Pearl Gray — Lagoon Glass styling; no new design direction.

## Changed files

Production:

1. `src/lib/card-history.ts` — 1–4 validation and ordered-array form preparation.
2. `src/lib/receipt-picker.ts` — all-or-nothing multi-photo selection and explicit capacity errors; existing single-receipt wrapper retained.
3. `src/components/bemem/ReceiptAttachments.tsx` — journal-only compact grid/counter/append controls with no image-edit actions.
4. `src/components/bemem/CardHistorySheet.tsx` — multi-photo draft, failed-selection admission, latest-form Save guards and saved-photo grid.
5. `src/components/bemem/CardArtworkImage.tsx` — opt-in downscaled thumbnail rendering; existing default unchanged.

Tests: `scripts/test-card-history.cjs` updated/expanded.

New document: this report. Earlier reports were not overwritten.

SHA-256 comparison to this task's starting snapshot: the five Production files above changed; **116 other source files unchanged**, including History repository/native storage, Wallet, Home/Create, Card Detail, Add/Edit Card, Grid, encoders, sharing and deletion policy.

## Validation results

- TypeScript passed.
- Read-only ESLint: 104 files; zero errors/warnings.
- History tests: **141/141 passed**.
- Full automated suite: **664/664 passed**.
- Android export: **1,530 modules**, artifacts at `.expo/photo-journal-four-photos/`. The CLI remains alive after printing `Exported` in this environment and is stopped after generation; this is not a clean CLI exit or Samsung runtime validation.

Coverage includes 1/2/3/4-photo roundtrips, append order, native picker options/remaining limits, oversized results with zero copies, partial batch copy failure, Save blocking/stale callbacks, max-state/no edit controls, all four viewer bindings and individual share captures, Cancel, one newest item for four images, legacy compatibility, reference-aware multi-image deletion and existing Wallet/UI regressions. All tests use synthetic fixtures/mock native APIs and filesystem.

## Samsung checks remaining

1. Run `npx.cmd expo start`, Reload the existing Expo Go app without clearing data. Home → disposable membership test card → History → Add Photo.
2. Capture one photo, then select two from Gallery. Check three thumbnails remain in order and `3/4 photos`. Select the last image; verify `4/4`, the max message, and absence of Replace/Crop/Remove. Gallery should offer only the remaining count. Some system picker versions may behave differently; over-cap results must show an error and leave the draft unchanged.
3. Add a note, Save once/double-tap. Check exactly one newest entry with four photos. Open/share each image, return, restart in Airplane Mode and confirm all four/note remain.
4. Try another unsaved entry and Cancel/Android Back. Existing history must remain. From Create, Add must be absent; Select/Delete that disposable entry after checking the confirmation's four-photo count. Other entries/card positions must remain unchanged.
5. With enlarged fonts, check button wrapping/counter, keyboard/scroll and grid touch targets. Check Camera permission denial and Gallery cancellation preserve the note. Real capture order, OEM picker selection limits, memory usage with four large photos and native sharing still require device verification.

Existing limits remain 10 MiB/24 megapixels per image with supported JPEG/PNG/WebP. OS picker selection order is preserved as returned; the exact Samsung picker behavior must be checked on-device. Pending/corrupt/uncertain History snapshots remain blocked for explicit inspection, with no new destructive recovery or automatic cleanup introduced.

Stop for Samsung review after this refinement; do not start another feature automatically.
