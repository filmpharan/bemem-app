# bemem —240 Original Decorate Assets + Paginated Drawer

Date:2026-11-11. Implemented for Samsung review. No Commit, Push, Deploy, reset, reimport or phone-data access.

## Inventory

| Collection | Focal | Mini | Frame | Accent/filler | Total |
|---|---:|---:|---:|---:|---:|
| Pet & Care |10|10|12|8|40|
| Travel Diary |10|10|12|8|40|
| Wellness |10|10|12|8|40|
| Café Day |10|10|12|8|40|
| Shopping & Gifts |10|10|12|8|40|
| Little Savings |10|10|12|8|40|
| **Total** |**60**|**60**|**72**|**48**|**240**|

All34 existing assets retain their original IDs, original image bytes and runtime paths. This includes the first13 approved assets and21 from the prior expansion.206 assets are new:146 individually AI-generated raster illustrations and60 programmatically authored SVG frame masters. No claim of human hand-painting. There are no renamed rotation/mirror/recolor copies used to fill the count.

Previously shared botanical pieces are now listed only under Wellness. Pet & Care and Travel Diary have their own new frame families. The global registry still resolves every previously saved botanical ID, regardless of which collection originally supplied it; no stored record is reclassified or rewritten.

## Review files

Open `artwork-trials/cozy-cute-240-2026-11-11/index.html` by double-clicking it in Explorer, offline. It links every collection, the contact sheets, actual-size simulations and connected-frame examples.

`drawer-preview.html` in the same folder is an interactive browser preview of the exact23+Next / Previous+17+6blank paging. It is a visual review tool, not a substitute for native drag testing.

Within that trial folder:

- `review/{pets,travel,wellness,cafe,shopping,savings}-contact.png`: six40-item contact sheets, enlarged and with source28px light/dark samples.
- `review/{collection}-actual-size.png`: actual-size **simulation** at24/28/32px, using the new safe paint scales, plus3× magnified28px tiles. An image viewer may scale these sheets; they are not physical Samsung measurements.
- `review/{collection}-frames.png`: closed frame, winding path, cross junction, small joined examples and all four rotations of all12 family pieces.
- `review/manifest.json`:240 entries with IDs, collections, categories, footprint, source and runtime paths, rotation/connectors, hashes, bounds, paint scales and byte counts.
- `review/validation.json`, `VALIDATION.md`, `VISUAL-REVIEW.md`: technical results and separate artistic review.
- `generation/`:146 independent generation prompts and source-file provenance records.
- `artist-originals/`:146 preserved high-resolution AI PNG originals.
- `artwork-source/`:146 normalized raster masters and60 editable96×96-viewBox SVG masters.
- `legacy-assets.json`: original34 IDs/paths/SHA-256 snapshot for preservation checks.
- `inventory-plan.json`, `build_library.py`: production plan and reproducible compiler using the existing Illustrator pipeline functions.

Runtime files: the original34 remain in `assets/decorations/cozy-cute-v1/`; the206 new files are in `assets/decorations/cozy-cute-v2/`. The directory suffix is an artwork-pack version, **not a Wallet schema version**.

## Technical and artistic validation

All240 assets decode as nonanimated192×192,8-bit RGBA PNGs with genuine alpha0–255 and transparent corners. Total runtime PNG payload: **3,448,018 bytes**, about3.29MiB. Sources and review sheets are separate and not included in that payload.

-240 unique IDs and240 unique PNG byte hashes.
-240 unique decoded RGBA hashes even after canonicalizing all rotations and mirrors.
-No identical48×48 thresholded silhouettes after all rotations/mirrors; no candidate pair needed investigation on this test.
-Six collections contain exactly40 different IDs each; no cross-collection duplicate ID.
-All72 frames,288 rotated variants and **7,500 within-family edge pairings** pass. Nonconnector edges stay transparent, midpoint coverage and facing alpha match exactly. Maximum facing RGB variation is2/255 in the retained botanical family, due to existing raster antialias rounding; the other families have zero RGB difference.
-SVG sources use exact tile midpoint anchors, full-page export and matched edge tangents/weights. No frame cropping or orientation-copy asset multiplication.

Hash/silhouette tests catch copied, rotated, mirrored or trivially silhouette-identical files; they do **not** prove artistic originality or replace visual judgment. All six40-item contact sheets were visually inspected separately. See `VISUAL-REVIEW.md`. The result is ready for user aesthetic review, not a claim of commercial finalization, legal clearance, physical readability or Samsung performance approval.

##20% artwork enlargement

The runtime scales the artwork paint, not the1×1 logical footprint or the192px source file. All168 non-frame images safely use **1.2×** centered width/height. All72 edge-connecting frames remain **1.0×**: enlarging them would move/crop the connection anchors. Those exceptions are enumerated in `review/validation.json`.

Alpha bounds were checked against the centered transform, and all scaled images were also rendered into a larger384px QA canvas using bicubic sampling. **Zero nontransparent pixels escaped the intended192px tile bounds** in that QA render. The frame roots on the editor canvas now explicitly use radius0; membership cards retain radius14dp. This prevents membership-card rounding from ever becoming a frame mask.

Only `DecorationImage` paint changes. Canvas positions, dimensions, collision rectangles,0.1block card inset and12-column grid do not change. Drawer thumbnails, drag ghosts and saved Home decorations use the same paint recipe. Full square tile canvases and genuine transparent margins are retained; no original artwork bytes were edited.

## Drawer

The existing editor, drawer and responder are reused. Only the collection selector scrolls horizontally. The asset area consists of three native rows with eight cells each; **there is no vertical or horizontal ScrollView inside the asset grid**.

Each40-item collection:

- Page1:23 assets; bottom-right cell24 is Next.
- Page2: top-left cell1 is Previous; assets24–40 occupy cells2–18; cells19–24 are empty and inactive. No Next.
- A different collection always starts at Page1. Page navigation clears armed placement/context selection but does not modify the wallet draft or Undo history.
- Previous/Next are typed navigation cells, with no asset ID or drag responder, so they cannot be persisted. Empty cells have no actions and ignore touches.
- Pagination also supports larger libraries: first page23, middle pages22 with both arrows, last page up to23 after Previous.

Actual cell widths use available drawer width,8columns,8dp outer gutters and2dp gaps. Rows are rectangular gesture areas, with enough height for the measured square canvas-unit image. This keeps three rows near the requested initial40% height. On a320dp viewport, targets are roughly36×32dp; on390dp, roughly44.75×33.83dp. It is physically impossible to fit eight nonoverlapping48dp-wide targets plus gutters on those widths. Primary Cancel/Undo/Redo/Save controls remain at least48dp high; the handle is a full-width32dp gesture/tap control. Tap-to-arm then tap an empty cell remains available in addition to350ms hold-and-drag.

The drawer initially uses approximately40% of usable height, but raises its minimum when the measured controls, text or grid need more room. No grid row is intentionally hidden to force an exact percentage. Expanded/collapsed state uses the actual min/max midpoint, so a taller required minimum is not mistaken for the expanded state. Very short windows or unusually large text can exceed the preferred40%; portrait Samsung testing is still required. Extremely short landscape windows are not claimed verified.

Synchronous drag refs protect page and collection callbacks immediately, including callbacks captured before the latest React render. Paging is refused while a drawer drag, canvas drag or Save is active. Existing new-item drag, existing-decoration drag, card movement, selection, rotation, deletion and invalid-drop restoration keep the prior interaction model. One completed drag remains one Undo action.

## Data safety and performance

No Wallet schema, storage protocol, coordinator, runtime owner, migration, release gate or backup change. No automatic migration, startup write, automatic placement or new Save path. Only the existing asset-ID whitelist grows monotonically. All34 prior IDs remain valid. No persistent page, collection or paint-scale setting is introduced.

All modifications still go through the existing draft and Wallet v2 single writer, revision gate and readback. Save navigates Home only after confirmation. Cancel/Android Back and their draft protections remain unchanged. No Card ID, membership number, image reference, QR/Code128 payload, History or journal data is touched by this toolchain. No actual phone wallet was opened or modified by tests.

Home uses the same static local image renderer for saved instances only. Importing a240-entry Metro registry registers file references; it does not mount240 Image components. The drawer mounts at most23 artwork components per page. No remote image loading, continuous animation, runtime SVG generation, per-decoration filesystem reads or new editor mounted on Home. Search still hides decorations and uses the existing filtered-card reflow, and clearing restores exact saved layout.

## Files changed in this workstream

- `src/lib/decoration-catalog.ts`:240-item metadata and six exclusive40-item collections; Set lookup for known IDs.
- `src/lib/decoration-pagination.ts`:new headless pagination/geometry helper.
- `src/constants/decoration-images.ts`:explicit static Metro registry for240 PNGs, preserving all original paths.
- `src/constants/decoration-paint.ts`:new safe paint-scale table.
- `src/components/bemem/DecorationImage.tsx`:safe centered paint scale inside the unchanged square tile.
- `src/components/bemem/DecorateMode.tsx`:8×3 paginated grid, measured height, navigation guards and collection reset.
- `src/components/bemem/WalletCanvas.tsx`:decoration-only radius0 paint root; card radius and geometry unchanged.
- `scripts/test-decorate.cjs`:240-count/distribution/hash preservation, both pages, drag locks, paint bounds and square-frame-root tests.
- `scripts/test-decoration-pagination.cjs`:new pure pagination/geometry tests.
- New206 runtime PNGs and the trial/review folder above; this report and local validation outputs.

Other existing uncommitted Phase1/2 work was preserved. No dependency or application-config installation/edit, no website modification. Git HEAD remains `c500a015cfc80bd6a63c88d3848562b33f02faa3`.

## Verification

| Check | Result |
|---|---|
| TypeScript |PASS, `tsc --noEmit`|
| Full automated suite |**712/712 PASS**, zero skipped/failing|
| PNG decode/transparency/identity |240/240 PASS|
| Frame edge pairings |7,500/7,500 PASS|
| Expanded paint clipping |0 failures|
| Android Hermes bundle |PASS, `output/decorate-240-android/`|
| Lint |Not configured; no automatic ESLint setup/install was attempted|
| Physical Samsung drag/legibility/frame seams/performance |Not Verified; user review needed|

`output/decorate-240-tests.txt` and `output/decorate-240-android-build.txt` retain command results. Existing QR/Code128 encoding/decoding, Card Detail, Sharing, Photo Journal, Add/Edit/Delete, persistence/recovery, Home/Search and legacy compatibility tests are included. Tests use synthetic data/mocked device storage. UI tests simulate responder callbacks and layout contracts, not physical native hit testing.

The project-local `bemem-illustrator`, `mobile-design` and `ui-ux-pro-max` instructions were read/applied. The UI/UX skill search ran for touch targets, pagination and compact React Native grids. Design read: offline Cozy Cute wallet for one-handed Samsung use, Pearl Gray — Lagoon Glass, dense artwork picker with low motion. Dials: variance4, motion2, density7. Official [Expo58 Image](https://docs.expo.dev/versions/v58.0.0/sdk/image/) and [React Native PanResponder](https://reactnative.dev/docs/panresponder) documentation were checked; installed packages are reused. No new runtime dependency or artwork software was installed.

## One Samsung workflow

1. Run `npx.cmd expo start --lan` from the project root. Reload/open the same existing project in Expo Go. Do not uninstall Expo Go, clear data or reset/reimport the wallet.
2. Home → Create → Decorate. Confirm all six collection names. In each, Page1 shows23 assets plus bottom-right Next; Page2 shows top-left Previous,17 assets and six inactive blanks. Switching collections returns to Page1. Swiping the asset area must not scroll it.
3. Expand/collapse the drawer. Check three complete rows, safe areas, normal/enlarged fonts and the larger illustrations. Frame pieces intentionally retain their original edge-aligned size. On short screens the minimum drawer can be taller than40% to avoid cutting rows.
4. Hold and drag an asset from **each page** into an empty cell; also test tap-to-arm placement. While holding it, page/collection controls must not change. Try occupied/card/outside drops; they must not move other items. Existing decorations and membership cards must still move with the existing hold gesture.
5. Select a decoration, rotate four times, delete it, Undo/Redo each action, and confirm a new edit after Undo clears Redo. Manually assemble a few family frames to inspect joins at actual screen size. Check an original saved decoration still looks like the same artwork and retains position/rotation.
6. Cancel/Android Back with and without changes, then re-enter and Save a desired draft. Save must show busy and return to Home only after readback. Check saved card/decor positions; Search hides decorations and clearing restores them. Reload the same project and verify persistence.
7. Confirm normal Home card taps, Add/Edit, real QR/Code128, Sharing and Photo Journal still work. Use only deliberately disposable fixtures if testing destructive actions; no real card/history was deleted by automated tests.

No additional feature work follows this delivery. Await Samsung and artwork feedback.
