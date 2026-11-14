# Approved reference Card Detail — native implementation

Status: implemented for Expo SDK58 / React Native0.88.1; **awaiting Samsung acceptance**. No production wallet was opened, imported, reset or edited by this work.

## Production changes

- `src/components/bemem/MembershipCardDetail.tsx`: reference bottom sheet, left Name/Share, right circular Close, solid-white real-code panel, one lower-right code toggle, local swipe gesture, centered card stage, left expiry/right flip, exact member string and Coming soon History. Original Create-only Edit placeholder remains.
- `src/components/bemem/CardAppearancePreview.tsx`: optional exact `height` alongside existing width. Detail uses fixed dimensions/mask; the existing Add Card behavior still expands for text when no height is supplied. No existing Add Card caller changed.
- `src/components/bemem/AddCardIcon.tsx`: additional Share, QR, barcode and history UI vector paths, using the same Android-tested Base64 SVG renderer. Existing icons are unchanged; these are control icons, not code symbols.
- `src/lib/card-detail-layout.ts`: read-only geometry projection using existing footprint resolution and Create metrics.
- `src/lib/card-detail-interaction.ts`: code-region swipe recognizer with no timer, animation, network or storage.

Tests: new `scripts/test-card-detail.cjs`; updated the native mocks/expectations in `scripts/test-production-integration.cjs` for the new icon toggle and layout measurements.

No changes to `CardCodeView.tsx`, QR/Code128 encoder, schema, migration, backup, repository, runtime owner, Home/Create, grid, automatic placement, saved cards, package manifests or dependencies. Before/after hashes also show original website source unchanged. Old uncommitted work is preserved. No commit, push or deploy.

## Real codes and interactions

`CardCodeView` receives the original card object and exact stored payload, using the existing offline encoder and native SVG image path. No prototype code graphics or placeholders are imported. Quiet-zone generation, integral physical-pixel module sizing, too-wide error and decoder tests are unchanged. The toggle is a sibling row below the renderer, never an overlay on the symbol/quiet zone.

The preferred format is used initially. Tap the lower-right icon to select the other format. Swipe left over the code for QR, right for Code128. The recognizer does not capture the initial touch, claims only horizontal intent after12dp, switches only on completed48dp displacement, rejects vertical movement above18dp, multitouch, cancellation and starts within24dp of the window edges. It permits responder termination. Vertical scrolling and the toggle's separate hit target remain available; no animation work occurs every drag frame. Hardware-level arbitration still needs physical-device testing.

For payloads not representable in Code128, the destination toggle is disabled, the explanation is visible, and a right swipe leaves QR selected with a clear message. No conversion, trimming, case changes, number parsing or fake success occurs. Membership number text is selectable and retains leading zeros and whitespace.

All principal controls have48×48dp actual Pressable layout, containing36dp visible surfaces and the existing16dp outline icon. Share is disabled with a Coming soon accessibility label. History has a Coming soon subtitle and no action handler. From Home there is no Edit entry; Create keeps the existing Coming soon entry only.

## Seven sizes and legacy

The existing validator resolves a consistent footprint before projection. Dimensioned cards use their stored widthBlocks/heightBlocks; legacy cards resolve6×4 landscape or4×6 portrait in memory. No fields are added to stored cards. Incomplete/inconsistent dimensions are rejected by the existing validator instead of guessed.

Create's existing `canvasMetrics()` supplies the unit for the measured sheet/screen width minus the same16dp margins per side, capped at the Home/Create600dp screen width. A single shared fit factor is calculated using the widest supported preset, not the selected card. Width/height maxima come from the existing seven preset definitions. The stage reserves the largest supported height, keeping different card sizes centered with comparable scale.

Full footprint = widthBlocks×unit×scale by heightBlocks×unit×scale. Painted dimensions subtract0.1 Block per side, matching Create. As reviewed in the prototype, the visible inset rectangle is distinct from the full logical ratio:2×3 and4×6 full footprints are exactly half on both axes, while their fixed-inset painted surfaces are not exactly half. Radius remains14dp rather than scaling with the frame. Text cannot grow the fixed Detail artwork frame. No image loading/resizing subsystem was added; the existing appearance renderer and stored appearance fields remain in use.

## Native presentation and limits

The sheet uses the approved Reference's local off-white/text/control values, Manrope, spacing and rounded geometry; global Lagoon tokens are unchanged. It has a top header and internally scrollable content, so large text/small windows do not require shrinking a code. SafeAreaView from the already installed safe-area library protects system insets; a transparent Modal delegates Android Back to the same Close callback. Backdrop and sheet are sibling hit regions, so inside taps do not dismiss it. The static presentation adds no motion that requires a reduce-motion exception.

**Backdrop currently uses dimming, not native background blur.** The existing Modal cannot blur its underlying Home subtree with its own View filter; adding a blur module or altering Home was outside this change. No dependency was installed and no fake screenshot backdrop is used. Native text metrics, TalkBack/VoiceOver focus behavior, insets/scroll bounds and final visual parity need Samsung/iOS review.

## Verification

- TypeScript: passed.
- Read-only ESLint:80 files, zero errors/warnings.
- All automated app tests:406/406. New Card Detail tests:19/19. Existing independent encoder/ZXing tests:30/30, including exact payload round-trips, unsupported characters, leading zeros/spaces/case and quiet zones. Existing production integration:29/29.
- Android offline export: `.expo/approved-card-detail-native-final/`,1495 modules. This is bundle compilation, not an installed-phone or physical scan test.
- New tests cover all seven sizes at several widths, common scaling, inset/radius, relative2×3/4×6/5×7/6×4 footprints, legacy/no-mutation, partial-size rejection, gesture admission/cancellation, real renderer binding, disabled Code128, Close/outside/modal Back,48dp controls, edit scope and exact artwork height without changing Add Card defaults.

Tests use synthetic fixtures and mocked native/filesystem ports. They do not establish physical Samsung gesture or scanner reliability. The Expo test-only decoder stays outside app code.

## Samsung test without changing saved data

Start Metro from this project with `npx.cmd expo start --lan`; open the same project in Expo Go. Reload JavaScript if needed; never clear application storage, uninstall Expo Go or reset the wallet.

If Wallet v2 is already active and has a membership card, tap that card from Home. Demo cards retain their existing truthful non-scannable preview; this change does not give them fake payloads or activate v2 automatically.

If you want to exercise all sizes without creating saved cards, use the existing DEV route `/dev-add-card` (for example `exp://<Metro-IP>:8081/--/dev-add-card`, using the actual Metro address/port). Fill synthetic data, choose a preset and Add Card into its **memory-only test draft**, then tap it on the existing DEV canvas. Repeat sizes as needed. This route uses the same production Card Detail; it was not modified and no new harness was created. Its Test Save writes only its test memory.

Check:

1. Title, Share/Close, code-panel toggle and History match the approved hierarchy. No text clipping at normal and enlarged Samsung font settings.
2. Toggle QR↔Code128 with taps and code-region swipes. Scroll vertically over the panel and confirm it does not switch accidentally. Check system-edge Back and Android Hardware Back.
3. Physically scan both codes using another device/scanner and compare every source character. Try an ineligible Code128 payload and confirm QR remains available with the honest restriction.
4. Compare all seven footprints, especially2×3 vs4×6,5×7 and6×4. Front/Back must not alter geometry; Mini must not grow to fill the stage. Check fixed14dp corners and inset.
5. Close with X, outside tap and Android Back; reopen. Verify the card's Saved position and any Create Draft remain unchanged. Check safe-area clearance in portrait/landscape and scroll to the last row.
6. Share and History must remain Coming soon. Create-only Edit is still Coming soon. No real save/import/cutover is required to review this UI.

Await user acceptance before further design or implementation changes.
