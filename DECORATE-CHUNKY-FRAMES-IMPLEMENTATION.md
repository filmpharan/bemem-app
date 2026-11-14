# Chunky frames + fixed Decorate drawer

Implemented locally, awaiting Samsung review.2026-11-11. Existing uncommitted Phase1/2 work preserved; no Commit/Push/Deploy, new dependencies, website changes, Expo Go reset or real-wallet IO.

## Focused changes

1. **30 PNG replacements** in `assets/decorations/cozy-cute-v3/` (pet-rope, wellness-sprig and savings-chain,10 each). Same IDs, same paths,1x1 footprints,1.0 paint scales, unchanged memberships and edge roles. All270 IDs retained; counts50/40/50/40/40/50.
2. **`src/components/bemem/DecorateMode.tsx`**: remove drawer height state/effects/refs, resize responder, grabber/header area, helper footer and page counter. Drawer wraps toolbar, unchanged6-icon selector and unchanged8x3 grid. No reserved footer/header height. Existing real-error feedback remains an accessible alert above toolbar only when necessary. SafeAreaView and independent canvas scrolling retained.
3. **`scripts/test-decorate.cjs`**: replace expand/collapse expectation with fixed-layout/no-handle/no-responder/no-helper assertions; verify armed placement has no visible instructions and real errors still surface. Existing selector/paging/gesture/Save/Back/regression tests retained.
4. **`scripts/test-decoration-frames.cjs`**: target replacement manifest; verify exactly30 changed PNGs with stable IDs/membership, previous rejected PNG preservation, fuller painted area, immutable original240 and catalog/registry/paint/renderer/session hashes, decode/duplicate/2646 seam combinations.
5. **`artwork-trials/cozy-cute-270-chunky-2026-11-11/`**: new editable SVGs and reproducible builder, previous30 before-images/sources, reference/before/after and actual-size/light/dark/connection sheets, manifests, local gallery and validation report. Old review folders retained as history.

Production catalog/registry/order, paint scaling, DecorationImage, WalletCanvas, decorate-session, Home/Create routes, Add/Edit, Card Detail/encoders, Sharing/Journal/History, Wallet repository/coordinator/schema/storage were not changed in this task. Protected code hashes verify the directly relevant shared files.

## Artwork approach and review

Rope now has a filled broad twist structure; leaves have larger lobed bodies and attached stems; chain has large rounded linked loops without thin string/charms. Geometry was reconstructed from the selected3 reference icons, not simply enlarged from the rejected frames. All use existing isolated Python/Pillow/Inkscape; these are code-authored SVG illustrations, not hand-painted work. Sources remain editable.

See [full validation and30 ID roles](artwork-trials/cozy-cute-270-chunky-2026-11-11/VALIDATION.md). Open [interactive offline gallery](artwork-trials/cozy-cute-270-chunky-2026-11-11/index.html) directly in a browser; no installation/server required.

- [Reference + Before/After](artwork-trials/cozy-cute-270-chunky-2026-11-11/review/before-after.png)
- [Actual24/28/32px previews](artwork-trials/cozy-cute-270-chunky-2026-11-11/review/actual-size.png)
- [Frame connections](artwork-trials/cozy-cute-270-chunky-2026-11-11/review/frame-connections.png)
- [Dark background](artwork-trials/cozy-cute-270-chunky-2026-11-11/review/contact-dark.png)

## Verification

- TypeScript PASS.
- **721/721 automated tests PASS**,0 failed/skipped; synthetic wallets/mock filesystem only. `output/decorate-chunky-tests.txt`.
- All30 PNGs192x192,8-bit RGBA, genuine alpha; original240 SHA-256 unchanged.270 D4-canonical artworks distinct; no new exact recolor/silhouette duplicates. New frames363,946 bytes total.
- **2646** facing-edge pairs across all120 rotated variants pass with exported edge alpha/RGB difference0. Frame paint scales stay1.0; no logical geometry or collision change.
- Android Hermes PASS: `output/decorate-chunky-android/`,1808 modules,299 bundled assets, HBC3.8MB. Build log `output/decorate-chunky-android-build.txt`. The process sandbox blocked Hermes child spawning; rerun outside it succeeded without admin install/deploy.
- No existing ESLint config: lint not run; no lint config/dependencies introduced.
- Offline preview JS/link check uses a DOM shim, not real-browser/Samsung rendering.

## Remaining physical-device checks

Artistic acceptance and Samsung touch/performance are NOT claimed. The enlarged material is technically fuller but SVG contours remain more regular than the selected raster artwork. Dense T/cross junctions need user review. Fractional-dp native image filtering can differ from pixel seam proofs. Very short split/landscape windows may leave limited canvas height because the grid is retained without scrolling. Approved selector sizing below~306dp remains unchanged and can be below48dp per target.

## One Samsung workflow

Run `npx.cmd expo start`, open existing project in Expo Go (if old artwork is cached, restart Metro with `--clear`; never clear Expo Go app data). Home → Create → Decorate:

1. Confirm no grabber/top empty area/footer instruction. Six approved icons remain the same, grid8x3, pages23/22/5 or23/17. Tap/hold thumbnails and swipe near the former handle area: drawer must never resize.
2. Visit page2/page3 of Pet, Wellness and Savings. Place the replacement straight/corner/end pieces in unused draft cells, rotate into rectangles and compare against reference images. Inspect24–32dp line weight and seams; test collisions, move a card, Undo/Redo, Delete-left/Rotate-right.
3. Test Cancel/Android Back first and confirm draft protection. Reopen and Save only changes you want to keep; Home should appear after verified persistence. Confirm saved positions/rotations, Search hide/restore, existing card/detail/share/journal behavior and reopen readback. Any previously saved instance of a replacement ID should retain its coordinates/rotation and show its new artwork.

Stop for user review before further changes.
