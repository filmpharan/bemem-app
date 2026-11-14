# Share Card and Adjust Image — technical diagnosis

2026-11-12 · design/diagnosis only. No Production fix was implemented.

## Evidence boundary

The supplied Samsung screenshots establish the current text-heavy Share UI and arrow/zoom crop UI, plus the user's reported composition mismatch. They do not expose the original image bytes, EXIF orientation, saved crop metadata, or before/after captures of the same image. No phone Wallet, saved member files or personal artwork were read. The exact cause and magnitude of that particular Samsung mismatch cannot be conclusively identified from these screenshots alone.

Source-backed inconsistencies below are verified. Native decoder/EXIF behavior remains a hypothesis requiring a controlled device case. The existing Adjust viewport already follows the selected preset; it is NOT a universal square crop box. Its 260dp maximum width alone does not cause a crop mismatch when ratios and source orientation match.

## Current pipeline, traced from the rendered form

| Stage | Source and observed behavior |
| --- | --- |
| Entry | `src/components/bemem/AddCardForm.tsx:147` mounts CardArtworkControls with `simpleReplacement={editing}`; both forms reuse it. The current Add flow opens Adjust; the Edit replacement branch skips Adjust. |
| Camera / Gallery | `CardArtworkControls.tsx:23–47`: image-only picker, `allowsEditing:false`, quality .9, compatible representation; camera permission requested when needed. The selected side is captured before asynchronous selection. |
| Retain original | `src/lib/card-artwork-store.ts:27–38`: validate type/size, copy exclusively, retain picker width/height, byte length and MD5, initialize x=.5/y=.5/zoom=1. No bitmap crop or orientation-normalization export. Original picker output is kept as an immutable local file. |
| Editor ratio | `CardArtworkControls.tsx:62`: selected preset's nominal ratioWidth / ratioHeight. `ArtworkCrop` starts with local image state; max width 260, height width/ratio; drag updates normalized overhang offsets, zoom buttons constrain zoom to 1–3. |
| Renderer | `src/components/bemem/CardArtworkImage.tsx:12–18` measures the actual clip rectangle, computes `artworkFrame`, renders the source with fill into that already-proportional frame, clips at radius 14. It uses the same helper during adjustment and card rendering. |
| Transform math | `src/lib/card-artwork.ts:28`: cover scale = max(viewportW/sourceW, viewportH/sourceH) × zoom. Position uses x/y fractions of overhang, NOT source center coordinates. |
| Confirmation | `CardArtworkControls.tsx:63,92`: Use Image commits metadata to the form's captured Front/Back slot. There is no newly baked/cropped image export at this point. Cancel does not replace the form artwork. A retained, unused source copy may already exist; Cancel is not a guarantee of zero filesystem activity in the current picker pipeline. |
| Form preview | `src/components/bemem/CardAppearancePreview.tsx:26`: nominal preset height may grow to accommodate measured text. Form previews without explicit height are therefore not always geometrically fixed. |
| Persistence | Existing form adapter/editor commands carry appearance/artwork into the existing Wallet writer/readback. This phase did not change or execute them. |
| Home / Create | `src/lib/canvas-layout.ts:90–94`: whole-block footprint is reserved, but painted bounds subtract .1 block on each edge. MembershipCard fills these painted bounds with the artwork renderer. |
| Detail / Full | `src/lib/card-detail-layout.ts:19–23`, `src/lib/full-card-view.ts:4–9`: same painted aspect ratio `(widthBlocks-.2)/(heightBlocks-.2)`. Both pass explicit width/height to CardAppearancePreview. |
| Share | `src/lib/card-share-plan.ts:19–21` sizes export from full nominal blocks. CardShareSurface renders it with explicit dimensions; Share therefore currently differs slightly from painted Canvas/Detail geometry. |

## Verified causes of cross-surface divergence

1. **Nominal versus painted ratio.** Adjustment uses `w/h`; Canvas/Detail/Full use `(w-.2)/(h-.2)`. A uniform cover transform must reveal a different source rectangle when these aspect ratios differ. This is deterministic, not a decoder guess. It is usually a modest difference and does not alone explain every large mismatch in the user's report.
2. **Text-driven preview height.** Form preview can increase its image boundary when long/enlarged text no longer fits. The editor and fixed Canvas do not grow the same way. Thus even a nominally matching form ratio can diverge under certain text conditions. The supplied short-name screenshot does not prove that this was its specific cause.
3. **Edit bypass.** The existing simple-replacement Edit branch applies a fresh centered cover image without showing Adjust. This does not explain a just-confirmed Add crop changing; it does explain inconsistent Add/Edit composition control.
4. **Export geometry differs.** Share uses nominal geometry; the current output and Canvas cannot both show an identical edge-to-edge crop from the same normalized offsets when their ratios differ. This phase preserves Production output semantics; a future geometry decision is required.

| Preset | Editor nominal ratio | Painted Canvas ratio |
| --- | ---: | ---: |
| Mini 3×2 | 1.500000 | 1.555556 |
| Card 6×4 | 1.500000 | 1.526316 |
| Voucher 7×3 | 2.333333 | 2.428571 |
| Boarding Pass 8×4 | 2.000000 | 2.052632 |
| Mini 2×3 | .666667 | .642857 |
| Card 4×6 | .666667 | .655172 |
| Vaccine Passport 5×7 | .714286 | .705882 |

Concrete reproduction with a synthetic 1600×1000 source, zoom 1.65, x=.70, y=.35: nominal 6×4 shows source rectangle approximately `(483.64,137.88,909.09,606.06)`. The painted 6×4 ratio shows `(472.47,137.88,925.04,606.06)`. Identical metadata is not sufficient unless the viewport contract also matches.

## Suspected, not verified

- EXIF-rotated JPEGs: selection width/height versus the decoder's upright pixel dimensions may differ for certain assets. Code copies bytes and trusts picker dimensions, but has no explicit EXIF normalization/verification stage. This is a risk, not proof of an Expo defect. Do not rotate all images or swap dimensions speculatively.
- Gesture/layout timing, asynchronous onLayout and pixel rounding need device observation. Current floating-point cover math is resolution-independent at equal aspect ratios; 260dp versus a larger display is not intrinsically wrong.
- Image fill is applied after proportional frame calculation. `contentFit="fill"` by itself is not a confirmed distortion bug when actual decoded dimensions match metadata. Thumbnail contain uses a different policy but is not the normal full card path.
- Source orientation and very long names may combine with the confirmed geometry differences. Camera originals and metadata were not available in this review.

## Proposed WYSIWYG contract (both designs)

1. Resolve actual card footprint from saved dimensions / existing legacy resolver. Keep all seven presets and full-block collision geometry. Do not change Inset or saved positions.
2. Establish the **painted image boundary** as the proposed crop viewport. Outer margins and toolbars do not participate in geometry. Both mockups and the proof gallery use `(w-.2)/(h-.2)` and radius 14px as a browser approximation of 14dp.
3. Decode source into a known upright coordinate system, verifying dimensions. Preserve original bytes. If normalization is needed, create a separate derived asset, verify it, and commit its reference only after explicit confirmation. Do not overwrite the original or assume EXIF=1.
4. Reuse the existing crop representation: x/y are normalized overhang offsets in [0,1], zoom in [1,3]. No new schema field is inherently required. Capture source, target footprint and side for a single editor session.
5. Use one transform calculation for editing, confirmed preview and all eventual consumers. Image shape cannot expand to fit text; place text in a separate overlay. A footprint change must trigger an explicit new composition review, not an invisible reset/recolor.
6. Drag and pinch update the same transform; pinch anchors the source point beneath the fingers. Provide accessible position/zoom controls. Cancel restores entry metadata; Use Image confirms exactly the current transform to the intended side, without writing the Wallet itself.
7. Keep originals and immutable artwork references. Save through existing single writer/revision/readback only. A cancelled picker may leave an unused retained file under the existing pipeline; cleanup design is separate and must not delete referenced assets.

For oriented source W×H, viewport Vw×Vh, zoom z, normalized offsets x/y:

```text
s = max(Vw/W, Vh/H) * z
Dw = W*s; Dh = H*s
left = -(Dw-Vw)*x; top = -(Dh-Vh)*y
sourceRect = ((Dw-Vw)*x/s, (Dh-Vh)*y/s, Vw/s, Vh/s)
```

Preview-to-export mapping: at another size with **the same aspect ratio**, multiply Vw/Vh, Dw/Dh and left/top by one scale k. The sourceRect remains exactly the same. If baking a derivative later, sample this sourceRect once from oriented source pixels; apply one documented pixel-rounding policy to both preview and output. Preserve sensible output resolution; do not upsample small originals without warning.

### Important decision before implementation

Different edge-to-edge viewport ratios cannot reveal the exact same source rectangle without distortion. Future Share must either render the canonical painted card shape inside the existing export canvas with intentional containment/margins, or the user must approve a change to exported card dimensions. This review does NOT change current export semantics. No independent crop logic should be added to Share to hide the inconsistency.

Radius remains 14dp in native displays; pixel comparisons should use equivalent viewport sizes/densities or account for the corner mask separately. A fixed 14dp corner naturally occupies a different fraction of a differently sized card.

## Share pipeline and screenshot interpretation

`ShareCardSheet → prepareCardShare → CardShareSurface → captureRef(surface) → adoptCapture/PNG width verification → exact artifact preview → digest-verified publish copy → expo-sharing`.

Current code captures only the collapsable=false CardShareSurface ref; no evidence of capturing the entire app root or drawer was found. The supplied screenshot contains drawer/system-bar imagery inside the card's output region, but that could be part of selected user artwork. It must not be classified as an accidental capture without inspecting that source image and captured bounds with consent. This review never reads user artwork files.

Image-only retains selected appearance (including information already printed in artwork and front name overlay); no extra Number/code is added. Scan output includes appearance, card name, exact Number and its selected QR/Code128. Back requires saved Back artwork; unsupported Code128 remains unavailable. Review must always show the actual final artifact, not an independently recomposed approximation. Native chooser cancellation is not delivery confirmation.

## Dependencies / feasibility

No dependencies installed. Existing Expo Image, ImagePicker, FileSystem, view-shot, sharing, encoders and gesture tools cover the likely metadata-only path. Reuse them. Native range controls should have accessible increase/decrease or arrow alternatives; HTML range controls do not imply installing a React Native slider.

If controlled EXIF tests prove that a normalized/baked image is required, assess an approved compatible image-processing API separately. `expo-image-manipulator` is not currently installed; do not install it or promise it is necessary before evidence. No Wallet schema/repository/Coordinator change appears necessary for the proposed metadata contract.

Official API checks: [Expo SDK58 Image](https://docs.expo.dev/versions/v58.0.0/sdk/image/) and [ImagePicker](https://docs.expo.dev/versions/v58.0.0/sdk/imagepicker/). The picker has its own optional EXIF metadata output; the current code does not request/verify it. Documentation alone does not establish the behavior of the user's particular JPEG.

## Verification plan for eventual implementation

- Seven footprints × Front/Back × wide/portrait/square sources × centered/edge crops × zoom 1/1.65/3. Include small images, large permitted images, EXIF 1/3/6/8 and mirrored 2/4/5/7, plus PNG without EXIF. Use synthetic landmarks and permitted sample photos, never real Wallet mutations in tests.
- Compare sourceRect coordinates independently of screen resolution. At equal geometry, native editor and final renderer must select the same region within a documented pixel tolerance. Compare screenshot landmarks and mask boundaries; code should not be able to pass merely because two mock images call the same function.
- Confirm on device before Use Image, after form confirmation, after Wallet readback/restart, Home/Detail/Full View, and final exported PNG. Compare shared-file digest to the reviewed artifact. Test all sides, cancellations, stale callbacks, unsupported payloads, failed image loads and orientation changes.
- Include original image MD5 before/after; saved references, other side, Number, layout and history unchanged. No full Wallet reset required.

44 isolated model tests and browser source-viewBox equality checks validate this proposal, not the existing Production renderer end to end. Samsung EXIF/bitmap/native export behavior remains unverified.
