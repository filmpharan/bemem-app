# Chunky frame reconstruction and fixed drawer

2026-11-11 · implemented locally · awaiting Samsung and visual approval.

## Scope and immutable inputs

Exactly30 latest frame artworks replaced, using the SAME IDs, collections, connection roles and1x1 footprints. Original240 runtime PNGs are byte-identical (SHA-256 independently checked). The total stays270; counts **50 / 40 / 50 / 40 / 40 / 50**. Catalog, static require registry, paint scale map, DecorationImage, WalletCanvas and decorate-session hashes are unchanged; see `protected-files.json`. No IDs/order/coordinates/rotations/schema changed.

The approved six-icon selector's JSX, symbol artwork, sizing, styles, opacity1/.48, accessibility labels and switching logic were retained. Only the surrounding drawer handle/header/footer and resizing machinery were removed. Existing older thin frames stay available among the original240.

## Thirty reconstructed pieces

Prefixes: **pet-rope**, **wellness-sprig**, **savings-chain**. Each prefix retains these10 suffixes:

`straight`, `corner`, `end`, `tee`, `cross`, `short-detail`, `long-detail`, `ornamental-corner`, `connector`, `special-end`.

Complete IDs, source references, labels, hashes and connection sides are in `review/manifest.json`. The previous rejected SVG and PNG for each of these30 is preserved in `before/svg/` and `before/png/`; `before/manifest.json` records those hashes.

References, unchanged:

- Pet: `assets/decorations/cozy-cute-v2/pet-accent-06.png` plus user's matching screenshot.
- Wellness: `assets/decorations/cozy-cute-v2/wellness-accent-02.png` plus user's matching screenshot.
- Savings: `assets/decorations/cozy-cute-v2/savings-accent-07.png` plus user's matching screenshot.

## Reconstructed visual structure

This is newly constructed SVG geometry, **not** a20% paint enlargement or a magnification of the rejected pieces. All runtime paint scales remain1.0 for these frames.

- Rope: a filled25-unit outer contour /21-unit material at96-unit source scale, broad twisted pastel strands and larger tied details on selected pieces. The earlier4.3-unit thin base was discarded. Its cross-section is now comparable to the visually substantial material in the selected source icon.
- Leaves: a filled8-unit stem, newly drawn elongated lobed leaves, larger leaf surfaces distributed along the branches with connected bases. Leaf shape and cream vein treatment follow the selected sprig; tiny scattered decorations were removed.
- Chain: roughly36x27-unit soft oval links with9-unit outer /6.2-unit colored material, spaced along the curve in three pastel colors. Removed the fine decorative connecting string and tiny charms. Large links carry the entire silhouette.

At the same192px tile size, painted area (alpha>32) is **1.673–4.264x** the previous artwork, depending on piece. This is a measured comparison after drawing, not a scaling rule or an artistic quality score. `review/visual-weight.json` lists every piece.

Tools used: existing project-local Python/Pillow, local Inkscape, Illustrator skill SVG-to-transparent-PNG pipeline. Skills read/applied: bemem-illustrator for art production/critique, mobile-design for native interaction/safe-area constraints, ui-ux-pro-max local React Native search for responsive compact layout. No software or runtime dependencies installed. The artwork is code-authored editable vector illustration, not human hand-painted work or new AI raster generation.

## Files and visual reviews

Open `index.html` by double-clicking; all resources are local, with no server/CDN/install required. It shows the fixed drawer concept with unchanged category symbols and pagination, and links to each family.

- `review/before-after.png`: all3 original reference icons + all30 Before/After comparisons, on equal tile sizes, including24/28/32px samples on dark backgrounds.
- `review/pets-comparison.png`, `wellness-comparison.png`, `savings-comparison.png`: separate family comparisons.
- `review/contact-sheet.png`: all30 replacement pieces, enlarged.
- `review/contact-dark.png`: all30 on a dark background.
- `review/actual-size.png`:24/28/32px, plus2x inspection enlargement.
- `review/frame-connections.png`: straight/corner/closed rectangles, rotated ends, T/cross and open paths, also at28px units.
- Editable `artwork-source/*.svg`, runtime-equivalent `review/png/*.png`.

## Format and connectivity

All30 decode as non-animated192x192,8-bit RGBA PNGs, alpha0–255, transparent corners. Runtime replacement bytes: **363,946** (~355KiB); full270 library now **3,811,964** (~3.64MiB). No full-background rectangle is baked into an asset.

All270 decoded artwork hashes remain distinct under rotation/mirroring. No new exact recolor/silhouette duplicate was found. Every declared edge is centered at the side midpoint; undeclared edges remain clear. All120 quarter-turn variants were checked. **882 facing-edge pairs per family,2646 total**, match exactly at the exported boundary (alpha/RGB difference0).

As in the previous export pipeline, one outermost raster sample at each declared connector edge is symmetrized to remove Inkscape rotational antialias rounding. The SVG geometry, full tile and interior art remain intact; reproduce through `build_chunky.py` to retain exact delivered raster edges. New family seams are checked within that family, not against unrelated older thin frames.

Artwork must remain inside its occupied tile. Endpoint paint reaching a declared connector edge is intentional. Interior motifs are contained to keep nonconnecting edges clear. Numeric transparency/edge checks do not by themselves establish an attractive illustration or physical-device seamlessness.

## Drawer behavior

`DecorateMode.tsx` no longer has height state, initial40% sizing, expand/collapse thresholds, height refs/effects, parent resize PanResponder, grabber button, or helper/page footer. Natural content height is fixed against manual resizing: toolbar → unchanged selector → unchanged8x3 grid, with8dp top/bottom padding. No reserved helper/header area. SafeAreaView still handles system insets; existing canvas flex/scroll remains separate.

An actual error appears as an accessible alert above the toolbar **only when an error occurs**. Normal pages and armed tap-placement show no bottom helper, replacement instructions or visible counter. Accessibility control names and the tap-placement alternative remain available. Error messages are not silently hidden.

8x3 pagination remains23/22/5 for50 assets and23/17 for40. Existing navigation locks during drag, contextual Delete-left/Rotate-right, long-press pickup, card movement, Undo/Redo, Cancel/Back protection, single-writer Save/readback are reused unchanged. No automatic placement, rotation or saving added.

## Validation and remaining limitations

- TypeScript PASS.
- Automated suite **721/721 PASS**,0 failures/skips. Mock/synthetic wallets only. PNGs decoded independently with the already-installed `pngjs` test dependency.
- Android Hermes bundle PASS; see project `output/decorate-chunky-android-build.txt`.
- No ESLint config exists; lint not run and no configuration/dependency installed.
- Local preview script/link check is a DOM-shim smoke test, not a real-browser rendering test.

Visually reviewed reconstructed families, contacts, actual-size and connection proofs. The material is substantially fuller; no tiny decorative string substitutes for the chain. The vector curves/outlines are cleaner and more regular than the original raster icons, so exact painterly parity is not claimed. T/four-way pieces are deliberately dense and need user judgment at small sizes.

Physical Samsung rendering, touch latency, TalkBack, font scaling and exceptionally short landscape/split windows remain **Not Verified**. Intrinsic drawer height preserves the grid; extremely short windows can leave little canvas height. Fractional-dp GPU filtering can differ from source-pixel seam tests. Existing one-row selector targets fall below48dp in widths below approximately306dp; the approved selector was intentionally not redesigned.

Official API references checked against installed Expo58 / React Native0.88: [Expo Image SDK58](https://docs.expo.dev/versions/v58.0.0/sdk/image/), [React Native View](https://reactnative.dev/docs/view). Safe-area and touch architecture remain existing components.

No Wallet/History/receipt data was read or changed on Samsung. No original website changes, dependency additions, Commit/Push/Deploy or Expo Go reset.
