# Card image and shared Add/Edit refinement

Completed the image/form/data-handling work and the approved real camera scanner. `expo-camera` 58.0.14 is the only newly added direct dependency in the scanner continuation; its required transitive packages were installed by Expo/npm. No nonfunctional scanner or placeholder was introduced.

## Image rendering

The existing Canvas card renderer kept a one-unit border and blue gradient/fallback behind uploaded artwork, applied a rim overlay, and used a green-tinted shadow. The absolute artwork child is laid out inside that bordered container, leaving colored underpainting at the perimeter. Photo cards now have zero border, transparent/no-gradient underpainting, no rim overlay, and a neutral charcoal shadow. Gradient-only/demo cards keep their existing styling. Radius 14, card footprint, crop/cover geometry, images and Grid coordinates are unchanged.

This is the source-level cause and correction. No new annotated Samsung screenshots were available for this request, and native pixel rendering has not been verified on Samsung.

## Shared Add/Edit form

- Removed Country, Brand search/suggestions, and their form-only state/handlers/styles. The old catalog remains only for legacy field validation and the existing gradient presets; it is not a selectable Brand workflow.
- Add inputs show `Name` and `Number` placeholders. Edit shows the exact existing values with small gray identifiers inside the fields above the values. Values remain strings with spaces, case and leading zeros intact.
- Expiration is still optional and uses the same validation/storage representation; its placeholder is `EXP YYYY-MM`.
- Removed the external number/expiration headings, QR/code explanation and draft helper sentence. Existing errors and safety confirmations remain. `More options` opens the retained code/color/gradient controls.
- Footer buttons are one flexible horizontal row: Cancel left, Add Card or Save Changes right. Text can wrap, touch targets remain at least 48dp, and the existing keyboard-aware scrolling sheet is reused. Edit Delete remains separate with existing confirmation/History safeguards.
- Edit Gallery/Camera directly replaces the side selected when the picker opens; the other side and latest form metadata are preserved. No three-dot options or separate crop/remove menu in Edit. Add's existing image-crop workflow remains available. Old image files are not deleted by replacement or cancellation.

## Controlled Brand metadata removal

There are no startup writes or direct file edits. A successful explicit Add submission prepares a draft with obsolete `brandId`/`brandQuery` removed from membership cards; it is persisted only when the user presses the existing Canvas Save. A successful explicit Edit Save removes those fields from the active snapshot through the existing Single Writer, expected revision, commit/readback and activation flow. Both full-form and earlier edit-command entry points apply the policy.

Names, IDs, member numbers, payloads, image references, appearance, legacy country, dimensions, positions, decorations and unrelated fields are preserved. Demo cards are untouched. The schema version remains 2; old Brand/Country fields are still validated when reading older snapshots. New-card validation still requires explicit size dimensions, expiry and gradient metadata, but no longer requires retired Brand/Country fields. Unknown fields are not admitted.

Earlier immutable snapshot revisions remain unchanged for recovery; they can still contain the historical Brand fields. This is not a secure purge of revision history. Cancellation/opening a form does not clean data or write anything. Existing records remain unchanged until an explicit Add/Save or Edit Save completes. A failed/uncertain write does not report success or retry automatically; existing reinspection rules apply.

## Real scanner

The user approved `npx.cmd expo install expo-camera`. Installed SDK-compatible version **58.0.14**. The initial restricted-network attempt failed; the same approved command succeeded with network access. No unrelated package install or automatic audit fix was performed. npm reported four moderate advisories in the dependency tree; these were not investigated or modified in this focused task.

The Number field in both modes now has a 48dp Scan button using the existing rounded-outline QR glyph. It opens a dedicated CameraView modal with a wide transparent aiming window, dark surrounding mask, thin horizontal red guide line, corner markers, Close, concise English instructions and a requested Torch toggle. The window also responds to measured Safe Area content space when enlarged text or landscape reduces available height. The red line/window are visual guides, not a laser or a guaranteed native region-of-interest filter.

The installed SDK's native Android format mappings were inspected. Configured formats: QR, Code 128, EAN-13, EAN-8, UPC-A, UPC-E, Code 39, ITF (`itf14` maps to Android ML Kit Interleaved 2 of 5), Code 93, Codabar, PDF417, Data Matrix and Aztec. This is API-level configuration; real Samsung decode success for each format is not asserted. [Expo SDK 58 Camera documentation](https://docs.expo.dev/versions/v58.0.0/sdk/camera/).

Permission is checked only when the scanner mounts, with caught inspection/request errors. The user can grant access, open Settings after permanent denial, retry camera initialization, or return to manual entry. Native mount errors and a camera-start timeout provide recovery. Closing or Android Back emits cancellation only. Backgrounding unmounts the camera and turns off Torch; foregrounding refreshes permission before resuming. Old preview callbacks, repeated frame events, stale form sessions and callbacks after unmount are rejected.

Android SDK 58 provides both parsed display text and `raw` decoded text. The scanner prefers `raw` when available and otherwise preserves the SDK's `data` string. No trimming, number parsing, case conversion or UPC/EAN reconstruction is performed. Existing nonempty Number values require replacement confirmation, defaulting to Cancel. The camera closes before that confirmation. The user can edit the result before saving. Custom code values keep the existing independent-payload behavior; otherwise the Number/code value track together. Unsupported Code 128 text remains unchanged and uses the existing validation error/QR choice.

Scanning only updates the controlled form. It never saves a Wallet, captures/persists a photo/frame, uploads data or logs payloads. The regular CameraView analyzer uses the installed bundled ML Kit barcode-scanning dependency on Android; no system/modern scanner route or cloud decoder was added.

`app.json` configures camera usage for scanning and existing card photography, barcode scanning enabled, no microphone permission and `recordAudioAndroid: false`. These plugin settings apply to a native development/release build; Expo Go uses its own host permission declarations. Torch behavior depends on physical hardware; the native implementation ignores Torch requests when there is no flash unit.

## Changed files

Production UI:

- `src/components/bemem/MembershipCard.tsx`
- `src/components/bemem/AddCardForm.tsx`
- `src/components/bemem/CardArtworkControls.tsx`
- `src/components/bemem/AddCardEditor.tsx`
- `src/components/bemem/EditMembershipCardEditor.tsx`

Shared data preparation and compatible validation:

- `src/lib/card-presentation.ts`
- `src/lib/card-form-adapter.ts`
- `src/lib/card-editor-state.ts`
- `src/lib/wallet-feature-commands.ts`
- `src/types/membership-card.ts`
- `src/lib/wallet-validation.ts`

Existing DEV verification fixture: `src/lib/dev-cutover-checks.ts` now expects the simplified new-card contract, without requiring retired Brand fields. No new harness was created.

Tests:

- `scripts/test-card-form.cjs`
- `scripts/test-add-card-runtime.cjs`
- `scripts/test-wallet-schema-extension.cjs`
- `scripts/test-production-integration.cjs`
- New `scripts/test-card-image-controls.cjs`
- New `scripts/test-membership-scanner.cjs`

Scanner continuation: added `src/components/bemem/MembershipNumberScanner.tsx`, updated the shared `AddCardForm.tsx` and its test mocks/integration tests, and changed only `app.json`, `package.json`, `package-lock.json` for camera configuration/dependency integration. No new route or DEV harness.

## Validation

- TypeScript: passed.
- Automated suite: **762/762 passed**, including photo/gradient rendering branches, Name/Number/EXP fields, all seven presets, footer ordering, direct Gallery/Camera replacement on both sides, picker cancellation, Brand cleanup/readback/restart, prior revision preservation and cleanup write failure/no retry, scanner permissions/error recovery, exact-text events, raw/display precedence, replacement confirmation, background resume, stale callbacks, Android Back, duplicate prevention and scan-filled Add/Save/Edit/readback.
- Android Hermes export: passed, approximately 3.8MB `.hbc`; output in `output/scanner-android/`.
- Lint: not run; no installed ESLint/configuration. Nothing was installed to add linting.
- `git diff --check`: passed. Scope evidence: `output/form-scan-scope.json` and `output/scanner-scope.json`. All assets and the existing Home/Create headers, Grid renderer, Coordinator, Repository and storage adapters retain their pre-task hashes.
- Automated tests use synthetic data and mock/test filesystems. Scanner tests use mocked native events and do not establish real camera decode performance or Samsung visual approval. The existing independent QR/Code128 encoder-decoder tests still pass.
- No phone Wallet/History data was accessed/reset, no website files changed, and no Commit, Push or Deploy.

## Samsung workflow

Reload the existing Expo Go session. In Create, open Add Card and check compact fields, color/gradient options, expiration and horizontal buttons; cancel once to verify no write. Add a disposable test card with front/back images and an alphanumeric Number with leading zeros; Save through the existing Canvas flow, then check the Home image edge and Card Detail. In Edit, directly replace one side, confirm the other side remains, cancel once, then explicitly Save a test edit and reopen/restart to check readback and layout. Repeat with enlarged fonts and the keyboard open. Use existing Reinspect behavior if saving is not confirmed; do not retry uncertain writes automatically or clear app data. Test the Number Scan button in both Add and Edit: grant/deny permission, scan a synthetic QR/Code128 with leading zeros and spaces, confirm/cancel replacement, manually amend it, test Torch/Android Back/backgrounding, and repeat in airplane mode. Scan retail formats as available. Verify the exact Number and generated codes after explicit Save/readback. Real camera decoding, Torch hardware, UPC/EAN return behavior, offline operation and Samsung/iOS visual/accessibility behavior remain device tests; no device data should be reset.
