# Membership Card Sharing — Production implementation

Status: implementation and automated checks complete; Samsung native validation remains pending. No real card was shared or changed during development/tests.

## Reused implementation

- Existing qrcode/jsbarcode encoders and Code128 SVG display geometry; no payload/encoder changes.
- Existing runtime validator and legacy footprint resolution; all seven preset definitions remain unchanged.
- CardAppearancePreview, CardArtworkImage and stored normalized crop metadata, original colors/gradients and local artwork.
- AddCardSheet, GlassButton, AddCardText, bundled Manrope font and Pearl Gray Lagoon Glass tokens.
- No repository, coordinator, wallet writer, backend, route or DEV harness was created.

## Workflow

Home → membership Detail → existing Share icon → compact Share Card sheet → exact PNG preview → Share → native Android/iOS share interface → return to the same preview or Cancel back to Detail.

Create retains its pencil/Edit action. The Detail layout, Edit/Delete flow, code controls, saved data and grid are unchanged. Detail's selected code format and Front/Back remain when the Share sheet closes.

Default is Card Image, Front, with no additional scan code or membership-number text. Scan inclusion requires explicitly selecting Card with Scan Code. Front/Back can be chosen when Back artwork exists. Code128 is disabled for unsupported payloads, with a QR alternative. Overlong Code128 export reports a limitation instead of squeezing/clipping bars.

Before sharing, the sheet displays the actual generated PNG, a disclosure of its contents, and (in scan mode) the exact stored number and encoded value. Preview includes no Edit/Delete/navigation controls. No extra confirmation screen is added.

## Export composition

- Lossless PNG only: suitable for sharing an image without a bemem installation. JPEG is not added because lossy compression can damage code modules.
- Card Image exports the selected card appearance. Front retains the existing card-name treatment. Back exports actual Back artwork without automatically printing the membership number. Information already printed in the user's artwork remains visible, including any pre-existing printed code.
- Card with Scan Code adds card identity, original membership-number text when stored, and a real QR/Code128. Raw payload is encoded unchanged; the value may differ from the membership number and is reviewed separately in the UI.
- Only visible share fields and rendering inputs enter the composition. No wallet JSON, internal card ID, revision, timestamp, unrelated card, status bar or system/navigation UI is rendered.
- Actual widthBlocks/heightBlocks are read through the existing validator/legacy resolver. A common integer pixel unit per export gives an exact preset aspect ratio; the longest card edge is approximately 960px. Export resolution is presentation-only and never written back to the wallet.
- Source gradients, colors, photos, normalized crop and the existing rounded-card renderer are reused. Source artwork files are only read/verified.
- QR uses square, integer-sized modules and its existing quiet zone. Barcode retains encoded bar/space proportions, at least three pixels per module and existing quiet zones; export bar height is scaled for image resolution. Maximum output width is 2048px. Oversized Barcode offers QR instead.
- Only the isolated CardShareSurface native View is captured. It waits for layout, local font loading and image/code display, then two drawing frames. Capture deliberately omits resize width/height options so physical code pixels are not resampled.
- PNG signature, dimensions, file size and copied-file digest are checked. The displayed preview and published copy have identical bytes; a changed/missing preview requires explicit regeneration.
- UI text respects font scaling and uses measured button labels; fixed image-composition text is intentionally fixed to export pixels. All Share actions have at least 48dp touch targets. Safe-area, scroll, Android Back, loading and duplicate-request guards reuse the existing sheet patterns.

## Offline, cancellation and temporary files

Image rendering uses local assets/data SVGs and files. No upload, contacts access, cloud service, download or wallet writer is involved. The receiving application handles any network requirement after the native chooser.

- View-shot's raw temporary capture is copied exclusively into `Cache/bemem-share-exports/preview-<random>.png`, checked, and released through view-shot's own release API.
- Owned, unshared preview files are removed on changing options or closing the sheet. Cleanup validates both the dedicated directory and filename; it cannot delete original artwork, wallet snapshots or published copies.
- Share creates a separate immutable `shared-<random>.png` copy, verifies it against the reviewed preview digest, then opens the native sheet.
- Published files are NOT deleted immediately on return/cancel/error: Android does not prove the recipient has finished reading. They remain in the app cache for OS-managed reclamation; there is no guaranteed immediate purge or fixed automatic TTL. This trades cache growth for receiver safety. There is no permanent duplicate in Documents.
- Returning from the chooser is reported neutrally, not as successful delivery. Expo's API does not reliably distinguish all cancellation/delivery outcomes.
- Native errors, unsupported sharing, capture failure, missing artwork and changed previews show recoverable status. No automatic external sharing/retry occurs. Close during preparation invalidates late callbacks and cleans late preview results.
- Sharing locks selection/close while the native request is active. Independent UI and delivery-scope guards reject duplicates. Effect cleanup/replay creates a fresh scope without reopening stale work; invalidated previews offer explicit regeneration.

## Dependencies approved and installed

Installed with `npx.cmd expo install expo-sharing react-native-view-shot`:

- expo-sharing `~58.0.22`
- react-native-view-shot `6.1.1`

Expo install added the standard expo-sharing config plugin. Its incoming-share extensions default to disabled; no receive/import workflow was enabled.

API references checked: [SDK 58 Sharing](https://docs.expo.dev/versions/v58.0.0/sdk/sharing/), [SDK 58 captureRef](https://docs.expo.dev/versions/v58.0.0/sdk/captureRef/), [SDK 58 FileSystem](https://docs.expo.dev/versions/v58.0.0/sdk/filesystem/), the installed package declarations and the view-shot README. No other dependency was installed.

## Validation results

- TypeScript: passed.
- Read-only ESLint: 94 files, zero errors/warnings.
- Automated tests: 522/522 passed, including 33 sharing tests and 26 Detail tests.
- Tests cover Home entry/Create pencil, default privacy mode, QR/Code128, exact zeros/spaces/case, differing member number/payload, all seven ratios, Front/Back, original-file byte preservation, unavailable sharing/native cancellation or errors, duplicate/late requests, failed capture, safe cache paths, digest changes and effect replay.
- The actual SVG produced for export is rasterized at its intended physical module geometry into a valid in-memory PNG and independently decoded with the existing test-only ZXing library. This verifies planned code geometry/payload; it is NOT a decode of a Samsung view-shot capture.
- Native FileSystem, capture and share APIs in automated tests are mocked. Mock PNGs used for lifecycle tests are clearly synthetic; production uses real encoders/capture.
- Android bundle generated 1520 modules: `.expo/membership-card-sharing/`. The CLI remained alive after printing Exported, so it was interrupted after artifact generation; this was not a clean CLI exit.
- Hash comparisons confirmed 25 protected wallet/schema/storage/encoder/grid source files remained unchanged against the earlier captured baseline. No wallet data, migration, backup or grid source was edited.

## Remaining limitations

- Actual Expo Go capture fidelity (including SVG/gradient/photo rendering), Android chooser behavior, receiving-app compatibility and physical scanning must be verified on Samsung. No native device success is claimed.
- Destination applications may compress/re-encode images or require connectivity. PNG generation and opening the chooser do not prove delivery.
- Local-file sharing is implemented for Android/iOS, not a web/cloud-upload fallback. iOS is not physically tested here.
- Demo cards do not expose this membership-sharing flow and never receive invented codes. Legacy membership cards without size metadata use the existing footprint rules unchanged. An unresolved legacy imageAssetId-only reference is reported unavailable rather than fabricating missing artwork; the original data is preserved.
- Only one selected side/format is shared at a time; no multi-file package, invitation link, history/receipt, export of wallet JSON or account system is added.
- Published exports may remain in cache until the OS reclaims them. Cache eviction/process termination can affect delayed receiver reads; no cross-app crash/delivery guarantee or secure-erasure claim is made.
- Unsaved Share UI state is not restored after process termination. Saved wallet data is never changed by sharing.

## Files in this request

New Production files:
- src/components/bemem/ShareCardSheet.tsx
- src/components/bemem/CardShareSurface.tsx
- src/lib/card-share-plan.ts
- src/lib/card-share-session.ts
- src/lib/card-share-native.ts

Existing Production/config files updated:
- src/components/bemem/MembershipCardDetail.tsx — activate Home Share and retain Detail state.
- src/components/bemem/CardAppearancePreview.tsx — optional text visibility/artwork readiness callbacks, with original defaults preserved.
- src/components/bemem/CardArtworkImage.tsx — optional display/failure callbacks.
- src/lib/card-artwork-store.ts — expose the existing read-only artwork verifier.
- app.json
- package.json
- package-lock.json

Tests/report:
- scripts/test-card-share.cjs (new)
- scripts/test-card-detail.cjs
- scripts/test-production-integration.cjs (child-component mock for unchanged integration paths)
- PHASE2-MEMBERSHIP-CARD-SHARING.md

Skills used: mobile-design for permission/availability fallback, native return/Back, touch targets, loading and cancellation; ui-ux-pro-max for existing-component consistency and loading/disabled feedback. Reading this as a privacy-conscious offline membership wallet, with Pearl Gray Lagoon Glass controls, targeting Android/iOS. Design variance 1, motion 1, density inherited from approved sheets.

No original website changes, reset, real sharing operation, commit, push or deployment was performed. Earlier uncommitted work is preserved.

## One Samsung end-to-end review

1. Run `npx.cmd expo start --clear` in bemem-app and reload the SDK 58 project in Expo Go. This clears Metro cache only; do not uninstall Expo Go or clear its data.
2. From Home open a disposable test membership, select a code format and Front/Back, then tap Share. Check default Card Image, no added number/code, correct appearance/ratio and Back availability. Cancel back and confirm the original Detail state remains.
3. Reopen Share, choose Card with Scan Code and inspect the exact number/code value. Try QR then Code128; unsupported/overlong Code128 must explain the limit and allow QR. The actual PNG preview must show complete, unclipped codes with white quiet zones.
4. Enable Airplane Mode, tap Share once, choose a local image-capable target or cancel the Android chooser. Return to bemem: no delivery-success claim, no card/grid changes, and the preview remains usable. Repeat to share the selected PNG to the intended application when appropriate.
5. Open the received/exported image on another screen and scan with readers that support QR/Code128. Compare the decoded synthetic value exactly, including leading zeros, spaces and case. Do not treat a screenshot or compressed destination preview as proof of the original file's quality.
6. For cards with Front/Back artwork, verify both selected sides and representative portrait/landscape presets. Check small-screen/larger-font scrolling and Android Back, then open Create: pencil/Edit/Delete should still work as before and Share should not replace the pencil.

Use synthetic/disposable membership data. No existing Test Member is shared automatically.
