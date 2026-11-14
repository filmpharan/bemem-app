# Complete Add & Edit Card — Production implementation

Status: code and automated checks complete; awaiting one Samsung end-to-end review. No device wallet or real card was read, reset, imported, edited or deleted during development.

## Implemented

Add and Edit use the existing AddCardForm/AddCardSheet. Production Edit enables the same size, brand, code, color, gradient and artwork controls; the historical restricted-edit mode remains available to existing callers, but is not used by Production Edit.

- Name, exact membership text, separate code value, QR/Code128 preference, optional YYYY-MM expiration (blank means No expiry).
- Local brand search/custom brand text, six existing card colors and the existing gradient definitions, selectable independently of brand.
- All seven original presets, with dimensions from the existing preset definitions.
- Camera and Gallery through expo-image-picker. Camera permission is requested on the camera action. Gallery uses the system image chooser without requesting broad photo-library access upfront.
- Front/Back artwork, replacement via the existing image/camera icons, and an icon-only Artwork options menu for Crop/Remove. Cancel in Crop retains the previous artwork; Use Image applies the pending selection to the form.
- A small non-destructive crop sheet: uniform cover scale, drag offsets, zoom 1–3, visible arrow/zoom alternatives, 14dp mask and the selected card ratio. No bitmap stretching or full image editor.
- Original form values stay in React state while the external picker is open. Main submission/close is synchronously blocked during picking; picker cancellation/permission denial does not clear the form.
- Add still creates exactly one Canvas Draft card; the existing Canvas Save persists it. Edit uses Save Changes to update the original ID through the existing Single Writer and verified readback.
- Unsaved-form Cancel/Close/Android Back confirmation, synchronous double-submit guards, original Saved/Draft failure protection and no automatic write retry.

## Persistence and compatibility

Wallet schemaVersion remains 2. Existing fields, readers and migration are retained. The only persisted extension is optional `appearance.artwork`:

```json
{
  "artwork": {
    "front": {
      "assetId": "art-<unique-id>.jpg",
      "width": 1200,
      "height": 800,
      "byteLength": 123456,
      "md5": "<32 lowercase hexadecimal characters>",
      "crop": { "x": 0.5, "y": 0.5, "zoom": 1 }
    },
    "back": null
  }
}
```

Each side is optional; null explicitly removes that side. Unknown fields and malformed references/crops are rejected. Old cards without artwork, size details or other optional metadata remain readable. Opening Edit does not backfill fields: full-edit patching only changes controls whose values differ from their original display values. The legacy imageAssetId field is preserved; it is not repurposed or erased.

Selections are copied exclusively from the picker URI into `Documents/bemem-card-artwork/` using a new immutable asset ID. The source file is not moved or deleted. Copy readback checks size and MD5 against the source. MD5 is an integrity comparison, not encryption or authentication. Wallet JSON stores references and crop metadata, never temporary URIs or image Base64.

The native v2 repository composition checks every referenced artwork file before Save, then checks again after the repository's existing JSON commit/readback. A known missing/corrupt image before Save blocks the write; an artwork verification failure after commit is commit_uncertain. The existing owner stays locked and requires explicit reinspection; no implicit retry or rollback occurs.

No old artwork is deleted on replace/remove, failure, cancellation or card deletion. Previous revisions/backups can still refer to those files. New selections cancelled before wallet submission can leave unreferenced files; garbage collection/secure deletion is deliberately not implemented in this change. Snapshot retention and OS backup policies are unchanged.

## Size and placement

The existing 12-column Grid, 240-row production boundary, full-block collision engine, 0.1-block paint inset and 14dp radius remain unchanged. Full Edit tries the original position first. If it does not fit, the existing first-free-position function proposes a location for that card only. The Move and Save dialog requires explicit acceptance. Cancel does not change the wallet. Confirmation rechecks owner generation, revision, clean Draft and placement; a stale accepted position cannot force an arbitrary move. No available position means no Save.

Existing unrelated cards, their order, dimensions, artwork and coordinates are compared during readback. The same ID is updated; Edit never adds another card.

## UX and skill use

Reading this as an offline membership-wallet editor for everyday Android/iOS use, retaining the approved Pearl Gray Lagoon Glass form, with Android-first validation. Design variance 1, motion intensity 1, visual density inherited from the approved form.

mobile-design: forms/feasibility guidance applied to keyboard handling, picker interruptions, safe-area scroll, error/cancel states and native permissions. ui-ux-pro-max: local React Native form/image guidance used for visual consistency. Existing fonts, colors, measured labels and form geometry are reused. Compact 36dp tool visuals keep 6dp hitSlop; new action/crop buttons use 48dp minimum targets. Crop has tap alternatives to dragging and no new animated blur/shimmer.

Official APIs checked against [Expo SDK 58 ImagePicker](https://docs.expo.dev/versions/v58.0.0/sdk/imagepicker/) and [FileSystem](https://docs.expo.dev/versions/v58.0.0/sdk/filesystem/), and the installed package types. Added direct dependency: expo-image-picker ~58.0.10 via expo install, with its required transitive package. App config includes permission descriptions and disables the picker's microphone permission for future native builds; Expo Go uses its own host app permissions.

## Validation

- TypeScript: passed.
- Read-only ESLint: 88 files, 0 errors, 0 warnings.
- Automated tests: 478/478 passed; synthetic data, mock FileSystem and native picker only (the final added camera-cancel test was rerun with its complete 21-case feature suite after the 477-case full run).
- Added coverage includes both editor modes, all seven resize/save/readback paths, Front/Back, copy integrity, missing/corrupt assets, post-commit uncertainty, permission/cancel, crop/zoom/tap alternatives, replacement/remove, cancellation without wallet writes, collision/relocation consent and full-grid rejection.
- Actual QR and Code128 SVG output from the full editor is independently decoded with the existing test-only decoder, preserving zeros, spaces and case.
- Android bundle generated: 1507 modules, `.expo/complete-card-management-final/`. Expo CLI remained alive after printing Exported, so it was interrupted after bundle/metadata generation; this was not a clean CLI exit.

## Remaining limits

- JPEG, PNG and WebP only, up to 10 MiB and 24 megapixels. Oversized/unsupported images are rejected, not silently discarded or uploaded. No automatic downsampling/HEIC encoder was added.
- Crop is portable rendering metadata; it does not produce a separately cropped physical file.
- Real Samsung camera/gallery permissions, EXIF orientation, keyboard, photo memory usage and system activity recreation still require the end-to-end device review. Mock tests and Android export do not prove native behavior.
- Normal picker round trips retain the mounted form. Unsaved form restoration after an OS process kill, Expo Go reload or application termination is not implemented or claimed. Android activity/process-death recovery needs a separate lifecycle test/solution; saved Wallet data and image files are not reset.
- Old imageAssetId-only references remain unchanged; this feature does not invent paths or reconstruct unavailable historical image files.
- Image cleanup, OS-backup policy changes, encryption, cloud, sharing and a more complex image editor are outside this change.
- File copy checks and Wallet readback do not establish an OS-level fsync/native-crash guarantee across multiple files. No such atomicity claim is made.

## Files changed in this request

Config/dependencies:
- app.json
- package.json
- package-lock.json

Types and existing persistence/form integration:
- src/types/membership-card.ts
- src/types/wallet-ui.ts
- src/lib/card-presentation.ts
- src/lib/card-form-adapter.ts
- src/lib/wallet-validation.ts
- src/lib/wallet-feature-commands.ts
- src/lib/wallet-storage.ts
- src/lib/wallet-preparation.ts

New feature helpers:
- src/lib/card-artwork.ts
- src/lib/card-artwork-store.ts
- src/lib/card-editor-state.ts

UI:
- src/components/bemem/CardArtworkControls.tsx (new)
- src/components/bemem/CardArtworkImage.tsx (new)
- src/components/bemem/AddCardIcon.tsx
- src/components/bemem/AddCardForm.tsx
- src/components/bemem/AddCardEditor.tsx
- src/components/bemem/EditMembershipCardEditor.tsx
- src/components/bemem/CardAppearancePreview.tsx
- src/components/bemem/MembershipCard.tsx

Tests:
- scripts/test-card-management.cjs (new)
- scripts/test-card-form.cjs
- scripts/test-card-detail.cjs
- scripts/test-production-integration.cjs
- scripts/test-card-codes.cjs

Report: PHASE2-COMPLETE-CARD-MANAGEMENT.md.

No new repository/owner/harness, migration, cutover, website change, commit, push or deployment was introduced. Earlier uncommitted work is retained.

## One Samsung end-to-end review

1. From bemem-app run `npx.cmd expo start --clear`, then reload the SDK 58 project in Expo Go. This clears Metro's bundle cache, not Expo Go or Wallet data. Do not uninstall or clear app data.
2. In Create, Add a disposable test membership. Enter a name and a raw number such as ` 000Test Ab `; verify Code value tracks the number until explicitly changed. Choose brand/color/gradient and a size.
3. Choose Gallery for Front, adjust zoom/position and tap Use Image. Switch Back, Take Photo, then Use Image. Check both previews, use Artwork options to recrop/remove, and the image/camera icons to replace. Deny permission/cancel a picker once and verify all other fields remain.
4. Tap Add Card, then the original Canvas Save. Return Home, open Detail and check Front/Back plus QR/Code128. Native photo acquisition and physical scanning are device checks, not automated-test claims.
5. In Create, open the same saved card → Edit Card. Check every original value/image is prefilled. Replace a side, change expiry/appearance and try a larger size next to another card. Cancel the relocation proposal first, then accept it. Verify only the edited card moves. Save Changes and check its ID/count, data, images and other cards.
6. Edit again, change something, and cancel using Android Back/Discard changes. Confirm saved data did not change. Restart the project without clearing data, enable Airplane Mode and confirm saved images, card details and codes still display.

Use synthetic/disposable membership data. No existing Test Member is changed or deleted automatically.
