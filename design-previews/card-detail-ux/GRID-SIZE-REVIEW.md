# Card Detail — real grid size projection, prototype round 03

Status: **awaiting user review; no native implementation or wallet access**.

Open `grid-sizes.html` for a size lineup and all seven interactive Reference-based Card Details. `reference.html` remains the same single layout; its desktop-only preview selector now chooses records for all seven sizes plus two legacy records. On Samsung use each Open link from the size comparison; no size-picker was added inside the proposed Detail sheet. Code-state selection on the comparison changes all seven frames together.

The existing local server can serve this folder, or open the HTML directly:

```powershell
python -m http.server 8791 --bind 0.0.0.0 --directory design-previews/card-detail-ux
```

Use `http://<computer-LAN-IP>:8791/grid-sizes.html` on the same private Wi-Fi, then stop the server with Ctrl+C. No dependency/build/Expo route is required. For `file://` browsers that restrict cross-frame reads, individual cards still work; the live lineup/metrics may require the local server.

## What is actually read

This is still a static prototype. It reads **synthetic card records**, not saved device cards or Wallet storage. `grid-fixtures.js` contains records with the same dimension fields as the current schema: `widthBlocks`, `heightBlocks`, `sizePresetId`, orientation and existing card metadata. Seven records were generated from `src/lib/card-size-presets.ts`, with a SHA-256 source fingerprint checked by the local test. No preset definition was changed.

The renderer takes width/height directly from each record. The ID chooses a record; it does not calculate dimensions. It does not use a portrait/landscape guess for dimensioned cards. Production must continue validating preset/dimension/orientation consistency **before** rendering; this helper is a presentation projection, not a replacement schema validator.

For old membership records with the entire size triple absent, the existing rule from `resolveWalletCardFootprint()` is mirrored in memory: landscape6×4, portrait4×6. Partial dimensions or invalid numbers fail instead of falling back. No default dimensions are inserted into the original fixture, serialized or saved.

## Shared grid and scale

Sources read-only:

- `src/lib/canvas-layout.ts`:12 columns, gap0; `canvasMetrics()` uses width/12; `canvasItemFrame()` applies0.1 Block inset on each side.
- `src/components/bemem/WalletCanvas.tsx`:16px horizontal margins per side.
- `src/app/index.tsx`:screen maximum width600.
- `src/lib/wallet-validation.ts`:existing legacy footprint resolution.

For one preview viewport:

```text
createCanvasWidth = min(viewportWidth, 600) - 32
blockUnit = createCanvasWidth / 12
maxWidthBlocks = maximum width across the seven supported footprints (currently 8)
scale = min(1, availableCardSlotWidth / (maxWidthBlocks * blockUnit))
displayUnit = blockUnit * scale

logicalWidth  = card.widthBlocks  * displayUnit
logicalHeight = card.heightBlocks * displayUnit
paintInset   = 0.1 * displayUnit per side
paintWidth   = (card.widthBlocks  - 0.2) * displayUnit
paintHeight  = (card.heightBlocks - 0.2) * displayUnit
```

The same scale is used for all selected records at that viewport. It is not recalculated from the currently selected card's width. The shared stage reserves the maximum height (currently7 blocks) so selecting Mini does not enlarge it or change the stage height. Each footprint is centered on both axes. Vertical overflow is handled by the sheet's existing content scroll. A stable scrollbar gutter avoids code-mode overflow unexpectedly changing card width.

Radius stays14 CSS px in the prototype, without scaling the DOM subtree. Native adoption must use14dp. No artwork image is introduced; a future image's CSS policy is `object-fit: contain`, rather than stretching it to a different ratio.

### Important: footprint is not painted surface

The exact2×3 /4×6 ratio and “half on both axes” assertions apply to the **full block footprint**. The visible painted surfaces are1.8×2.8 and3.8×5.8 blocks because Create already applies a fixed0.1-block inset. They are therefore not exactly half-sized on both axes, and their visible outline ratio differs slightly from the full footprint. This is exposed in the comparison instead of being silently normalized. The prototype retains Create's current inset; it does not propose changing the grid or its collision footprint.

| Footprint | Relative logical width vs6×4 | Relative logical height vs6×4 |
| --- | --- | --- |
|3×2|0.5|0.5|
|6×4|1|1|
|7×3|7/6|3/4|
|8×4|8/6|1|
|2×3|2/6|3/4|
|4×6|4/6|6/4|
|5×7|5/6|7/4|

The dashed lineup outlines full footprints; blue areas show the painted card. Each interactive example reports Create unit, shared scale, full pixel footprint and painted pixel size. Side/format buttons keep their independent48px hit areas; they are not scaled with cards. Barcode/QR graphics remain explicitly non-scannable placeholders and keep their previous sizes.

## Verification

- `node design-previews/card-detail-ux/test-grid-sizes.cjs`: **7/7 passed**. Checks source fingerprint, all seven dimensions, uniform scaling, key ratios, dimensions independent of labels, legacy fallback, invalid/partial dimensions and nonmutation.
- Browser geometry tests: all seven at320×640,390×844 and844×390. Actual DOM sizes matched full and painted formulas, were centered, and retained radius14. Scale did not vary by selected preset. QR toggle, Front/Back geometry and Close worked.
- Both legacy examples, seven-frame comparison, single-unit lineup and switching all frames to QR passed. No page errors during the final grid verification (including hidden-sheet ResizeObserver notifications).
- Existing Reference interaction browser checks were rerun: tap/touch swipe/diagonal rejection, keyboard alternative, Front/Back, Close/Reopen, internal scroll,200% title and reduced-motion Close passed. Its portrait ratio check now measures the full footprint rather than incorrectly treating the paint inset as a footprint.
- JavaScript syntax check passed. Before/after source hashes for app/src, app/scripts and original-site/src are unchanged.

Screenshots: `grid-size-screenshots/relative-sizes.png` and `grid-size-screenshots/all-seven.png`. Raw captures are in the existing `output/playwright/` location. Historical Reference screenshots and A/B/C remain intact; the live Reference page now uses this size rule.

Not verified: physical Samsung, native dp/pixel/font metrics, image artwork behavior with a real image, actual wallet loading or scan performance. No production TypeScript/bundle change was made or required for these isolated design assets.

## Files

Updated only preview files: `reference.html`, `reference.js`, `reference.css`, `reference-review.html`, and the footprint assertion in `reference-verify.js`.

New preview files: `grid-fixtures.js`, `grid-size-model.js`, `grid-sizes.html`, `test-grid-sizes.cjs`, `grid-verify-browser.js`, this report and two screenshots.

No changes to Home/Create grid logic, saved cards, schema, Wallet storage, encoder or original website. No dependency install, commit, push or deploy. Native implementation awaits approval of this rule and its visual result.
