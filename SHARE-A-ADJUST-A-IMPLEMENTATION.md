# Share A + Adjust Image A — production implementation

2026-11-12. Ready for Samsung testing; no commit, push, deployment, Wallet reset or media migration.

## Delivered UI

Share uses Preview First on one screen. The actual prepared PNG is displayed before the compact Image Only / With Code and Front / Back selections. QR/Code128 appears only when needed. One Share action stays in a fixed footer above the sheet's SafeArea; the body scrolls for smaller screens or larger text. Close and Android Back use the existing guarded close behavior. AddCardSheet's new fixedFooter option is opt-in for Share; Add/Edit retain their existing sheet structure.

Removed Choose what to share, Sharing preview, Artwork only, What's included, long mode explanations, duplicate Number/Encoded value blocks, and the redundant Share Cancel button. Functional loading, unavailable-Code128 and error feedback remain. Back is disabled when there is no saved Back artwork; no Back image is invented.

Share still uses the original captureRef → verified PNG cache → exact artifact preview → digest-verified published copy → expo-sharing pipeline. Modes change the same plan used for capture. Image Only adds no scan code or Number; text/codes printed in user artwork remain. With Code uses the unchanged Number-derived encoders and existing quiet zones. Uploaded artwork receives no app-generated name overlay in the export. Scan output has one external card-name heading rather than a second name painted over the card. No surrounding sheet or drawer is captured; user-selected artwork itself can legitimately contain such imagery.

Adjust Image now uses a large card-shaped viewport, actual one-/two-finger drag/pinch, a native adjustable zoom slider, +/- controls, Reset, optional Grid (off initially), closed-by-default Fine adjustment, and a horizontal Cancel / Use Image footer. Fine adjustment provides accessible Horizontal/Vertical controls. All three zoom methods operate on one transform state; pinch anchors the source point under the fingers, rebases when finger count changes, and clamps to full cover. The crop responder prevents the surrounding scroll view from taking over while adjusting. No image processing occurs on a touch frame.

Use Image is blocked until the artwork is visibly loaded, and remains blocked on decode failure. Grid is a separate UI overlay, never part of stored image or Share output. Reset restores the entry crop while retaining corrected decoded dimensions. Cancel/Android Back leave the existing form artwork unchanged. A stale confirmation after cancellation is ignored.

Camera/Gallery are still direct entry points. Both Add and Edit now review the replacement in the shared crop editor before applying it to the intended side. No three-dot image menu is reintroduced. The opposite side and non-image draft fields remain intact. Final persistence still follows the existing Add/Edit single writer and readback; Use Image itself does not save the Wallet.

## Confirmed functional fix

The old editor used nominal preset ratio, while actual Canvas/Detail/Full View subtract 0.1 block on every edge. Form previews could also grow with measured text. Share export used nominal blocks again. These were deterministic cross-surface mismatches; a different preview scale alone was not the cause.

`cardPaintSize()` now expresses the existing Canvas rule once. Crop, form preview, Detail, Full View and Share use that same painted geometry. Canvas calls the helper with its previous exact arithmetic; reserved footprints, collision rules, 12 columns, placement, coordinates and inset values are unchanged. All seven existing preset definitions remain authoritative.

The preview's image boundary no longer expands to fit text. Name overlays are bounded separately, matching fixed-card behavior rather than changing the crop. Form field text and stored names are not changed.

`artworkFrame()` remains the one cover transform. `artworkRegion()` exposes its visible source-pixel rectangle for gestures/validation. Stored x/y retain their existing meaning: normalized overhang offsets, zoom 1–3. No new schema or parallel renderer/storage was introduced.

Share card dimensions now use the painted ratio too. Five-pixel block units keep the 0.1-per-edge subtraction integral in exported pixels, so integer rounding cannot introduce a second crop ratio. This intentionally changes exported card proportions slightly from the previous nominal-block export to match the approved visible card boundary; PNG format and data inclusion remain unchanged. Example: Card 6×4 exports its card area as 957×627 rather than a nominal 3:2 rectangle.

## Source orientation / existing media

Expo Image's loaded source dimensions are used when the decoded aspect differs from recorded dimensions. All normal artwork surfaces use the same renderer, with downscaling disabled to keep a consistent decoded geometry contract. This accommodates decoder-applied orientation in memory without attempting a second speculative EXIF rotation or mirror. When a user explicitly confirms a replacement, its decoded dimensions can be carried with the existing crop metadata. Merely reading old artwork does not write corrected dimensions to Wallet.

The original selected image remains an immutable local file; no repeated crop/recompression or destructive EXIF normalization is performed. The persisted result is still source reference + crop metadata, not a newly baked cropped bitmap. Share creates its normal derived PNG. Source MD5/size verification, safe copy handling and original media files are unchanged. A retained but cancelled selection can leave an unused source copy under the existing lifecycle; it does not delete saved media.

SDK58 Image/ImagePicker and installed types were checked, plus React Native PanResponder. No dependency was installed. Actual Samsung JPEG/EXIF decoding, mirrored-source behavior, native rasterization and touch performance still require device verification; automated coordinate/raster checks do not certify those native behaviors.

References: https://docs.expo.dev/versions/v58.0.0/sdk/image/ , https://docs.expo.dev/versions/v58.0.0/sdk/imagepicker/ , https://reactnative.dev/docs/panresponder .

## Production files

New:

- `src/lib/card-geometry.ts` — shared established painted bounds.
- `src/lib/artwork-adjustment.ts` — source region, pan, anchored zoom, gesture transition math.
- `src/components/bemem/ArtworkSlider.tsx` — real native touch + accessible adjustable control; no dependency.

Updated:

- `src/components/bemem/ShareCardSheet.tsx`
- `src/components/bemem/AddCardSheet.tsx` — optional fixed Share footer only.
- `src/components/bemem/CardShareSurface.tsx`
- `src/components/bemem/CardArtworkControls.tsx`
- `src/components/bemem/CardArtworkImage.tsx`
- `src/components/bemem/CardAppearancePreview.tsx`
- `src/components/bemem/add-card-layout.ts`
- `src/lib/card-share-plan.ts`
- `src/lib/card-detail-layout.ts`
- `src/lib/full-card-view.ts`
- `src/lib/canvas-layout.ts` — reuse identical inset/paint calculation, no placement/gesture change.

Tests/tools: updated `test-card-form`, `test-card-detail`, `test-card-image-controls`, `test-card-management`, `test-card-share`; added `scripts/test-artwork-wysiwyg.cjs`, `scripts/test-artwork-controls.cjs`, `scripts/validate-artwork-raster.py`.

Existing Phase1/2 uncommitted work is preserved. No changes to Wallet schema, Repository, Coordinator, writer protocol, image store, History, encoders, decorative assets, original website or packages. No real card/phone data was accessed for automated tests.

## Verification and evidence

- TypeScript: passed.
- Full regression: **844/844 passed**, zero failures or skipped tests (`output/share-adjust-all-tests.txt`).
- New WYSIWYG content checks cover all seven presets × three source sizes/aspects × Front/Back, four transforms, and three viewport scales. They validate exact source regions against independently derived expectations and compare asymmetric raster samples, plus schema-valid metadata roundtrip. Separate UI tests exercise actual responder callbacks, pinch, finger transitions, slider accessibility, Reset, Grid, Fine, Cancel, visible-image guard and decoded-dimension correction.
- Independent Pillow raster run: **84 cases, maximum differing-pixel fraction 0.000000**. Production preview matrices are rendered using affine sampling; confirmed/readback regions are rendered using a separate source-extent sampling path. Tolerance is at most 1% boundary pixels for nearest-neighbor tie rounding; observed difference was zero. These synthetic software rasters are not captured native screenshots.
- Existing encoder/independent ZXing and Share byte/digest/readback tests continue to cover exact Number strings, output integrity, no original-file deletion, close/cancellation and duplicate submission guards.
- Android Hermes export: passed; `output/share-adjust-android/`.
- Lint not run: no existing ESLint configuration/tooling; none added.

Evidence: `output/share-adjust-implementation-start.txt`, `output/share-adjust-implementation-baseline.json`, `output/share-adjust-implementation-scope.json`, `output/share-adjust-final-focused.txt`, `output/artwork-controls-tests.txt`, `output/artwork-wysiwyg-raster/results.json`, its seven before/after PNGs, `output/share-adjust-android-build.txt`.

## Samsung workflow and remaining limits

1. Start/reload the latest Expo Go bundle with `npx.cmd expo start`. Do not clear Expo Go or reset/reimport Wallet.
2. Add a test image with asymmetric landmarks. Try a landscape and portrait card, then remaining presets as convenient. Drag, pinch, slider, +/-; toggle Grid (initially off), open Fine adjustment, Reset. Confirm Use Image and compare the exact composition in the form. Cancel a replacement and verify both sides remain unchanged.
3. Save through the normal flow. Compare Home, Detail and Full View before/after restart. Test a camera JPEG and a rotated Gallery image, plus small/square/wide/portrait sources and enlarged system text. Verify Front replacement leaves Back intact and vice versa. Android Back must cancel adjustment without saving.
4. From Home Detail open Share. Preview should appear first. Switch Image Only / With Code, Front / Back, QR / Code128. Inspect the received PNG from the native chooser against the reviewed preview, including crop, no app-name overlay on uploaded artwork, exact Number and readable code. Rapid Share taps must open only one chooser. Back/Close must preserve card state.

Native decode/EXIF orientation, safe-area layout at device-specific navigation settings, very large image memory behavior, native anti-aliasing, enlarged text and smoothness remain physical-test items. The mathematical/raster correction is implemented; Samsung appearance/scannability/performance has not been claimed as tested. Stop here for user verification.
