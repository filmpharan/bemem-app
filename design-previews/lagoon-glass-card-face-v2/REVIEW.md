# bemem — Lagoon Glass Card Face Collection

**Design review 0.1 · 14 November 2026 · Awaiting visual approval**

Seven new, original abstract card-face artworks, one shared Lagoon Glass family. “v2” in this directory name means the artwork exploration iteration; it does not change the Wallet schema or release state.

## Open locally

Open `gallery/index.html` directly in Edge/Chrome. Keep this directory together: fonts, artwork, scripts and reference evidence are local. No CDN, network service, package install or app route is needed. Browser font restrictions may cause a system-font fallback when opening from the filesystem.

Select a color to inspect its square master, large card preview and all seven crops. Scroll the footprint strip horizontally to compare actual relative sizes at one shared block unit. The full-width page remains vertically scrollable without document-level horizontal overflow at 360, 393 and 412 CSS pixels.

Open `folders/gallery/index.html` for the existing interactive A/B/C review with the new artwork. The color-start links at the top choose a different ordered set of six fictional cards from the seven-color collection. The first four form shell miniatures; all six appear in the sheet. Use the existing concept/orientation/count/name controls. Close, outside tap, Escape and browser Back are preserved. This is a browser simulation, **not a native Samsung test**.

## Seven color expressions

| Stable preview artwork ID | Name | Depth | Body | Light | Glint |
|---|---|---|---|---|---|
| blush-pink | Blush Pink | `#8C284E` | `#CE547C` | `#EF91AA` | `#FFD6DB` |
| warm-brown | Warm Brown | `#603B2C` | `#9C6243` | `#CC9968` | `#F3D9B0` |
| fresh-green | Fresh Green | `#20583F` | `#469060` | `#8CC477` | `#E0ECAF` |
| golden-yellow | Golden Yellow | `#99651D` | `#D59B32` | `#F2CB62` | `#FFF0AF` |
| sky-blue | Sky Blue | `#194D84` | `#287FB5` | `#70C7DB` | `#C8F1F2` |
| dream-purple | Dream Purple | `#463477` | `#7857AF` | `#B098DB` | `#E4D9FF` |
| coral-orange | Coral Orange | `#9A3E2B` | `#D47547` | `#F5B077` | `#FFE0BD` |

Pink retains a visible rose body instead of white. Brown uses caramel highlights and chocolate depth rather than gray. Green carries both fresh leaf light and forest depth. Yellow stays golden with an ochre base. Blue moves between deep lagoon blue and luminous cyan. Purple stays violet rather than drifting into pink. Orange has coral/copper depth and a warm apricot reflection, distinct from yellow's gold.

These are card content colors, **not replacements for the Pearl Gray application theme or its six UI palettes**.

## Material and authorship

All seven editable SVG masters share identical path geometry and gradient roles. An oblique soft lens sits behind a curved glass ribbon. The ribbon has a restrained reflective crest, transparent-looking light overlap and a darker return surface. The visual language is original vector artwork authored programmatically and exported through the existing Inkscape CLI; it is **not claimed to be hand-painted** or physically rendered glass.

The faces are baked backgrounds. Translucency is represented by composed colors and gradients, not a runtime blur, live shader or dependency. No noise, stock illustration, merchant logo, name, membership number, QR or decorative text is embedded in the artwork. SVG `<title>` elements are accessibility metadata and do not render onto the card.

Masters are intentionally **opaque square** PNGs. Transparent masters would allow uncontrolled Canvas colors to change their appearance. Rounded crop previews have genuine transparent corner pixels. Corners are not baked into the square masters, so the same source works for all card shapes.

The first tiny-scale review exposed overly thin highlights breaking into flecks. The shared master was refined with a broader, lower-opacity highlight and a softer outer rim, then all seven colors were re-exported. Lossless local WebP review copies avoid lossy compression artifacts. Thin reflections inevitably soften at the smallest miniature sizes; the broad colored body and lens remain the primary cues.

## Geometry and crop safety

The builder reads the definitions directly from `src/lib/card-size-presets.ts`, without importing app runtime code or editing that file:

| Preset ID | Logical footprint |
|---|---|
| mini-landscape | 3×2 |
| card-landscape | 6×4 |
| voucher-landscape | 7×3 |
| boarding-pass-landscape | 8×4 |
| mini-portrait | 2×3 |
| card-portrait | 4×6 |
| vaccine-passport-portrait | 5×7 |

Source contracts: `src/lib/card-geometry.ts` has a **0.1-block inset on each side**; `src/constants/card-appearance.ts` has **14dp** corners. Painted ratio is `(widthBlocks−0.2)/(heightBlocks−0.2)`, rather than the whole-block footprint ratio. `src/lib/card-artwork.ts::artworkFrame` uses one uniform cover scale, normalized offsets and zoom. This preview uses its centered case, `x=.5, y=.5, zoom=1`.

There are exactly seven masters, not 49 independent designs. The 49 PNG crops are derived review outputs. They use a raster block unit of 64px and a 28px corner radius, corresponding to a 2× export of a 32dp-block display with 14dp corners. Integer raster dimensions introduce only the expected subpixel rounding. The gallery's live images use the unrounded logical dimensions and CSS `object-fit: cover` with 14px corners.

`sheets/all-49-crops.png` uses a common **24px block unit** and fixed 14px display corners: Mini remains smaller than Card, and portrait/landscape remain physically different. The overview color comparison uses a uniform 6×4 crop to compare hues, not to assert equal card sizes. The miniature canvas derives its unit from its actual width and twelve columns. Its display packing is isolated and never calls production placement or saves coordinates.

The broad reflection passes through the central crop-safe region. Voucher and portrait crops intentionally remove different outer portions of the lens; they retain the ribbon/material identity. No orientation-specific logo or motif is required to survive cropping.

## Folder compatibility

The twelve SVG shell layers in `folders/assets/shells/` are byte-identical copies of the existing Group Folder A/B/C. The existing `style.css` and `prototype.js` are also copied unchanged. `data.js` supplies only fictional new-artwork cards; `combined.js` adds review links and reads initial display options. The original folder directory is untouched.

- A: orderly miniature windows keep all four colors most exposed.
- B: the existing slight tilts and deeper shell add contrast without changing card aspect ratios.
- C: the existing translucent lip deliberately veils part of the lower cards. This is containment, not an artwork crop defect.
- Only 6×4 and 4×6 folders exist. Capacity stays six, miniatures stay four, names stay independent of member count, and no count badge is introduced.
- The six-card sheet resolves the full list separately from shell thumbnails and reaches the sixth member through scrolling. Choosing another starting color can include Coral Orange, which is seventh in the default collection order.

Sample card names are HTML labels, not part of the masters. **Production card-name contrast still requires approval and testing**, especially over Golden Yellow and luminous parts of other colors. Do not assume white labels are universally accessible; a suitable existing dark-label/scrim treatment may be needed in the later implementation. This phase does not change production text or impose that treatment.

## Before / after

`assets/before/A-{pink,brown,blue}.png` are exact copies of actual rejected Soft Pastel Minimal masters from `design-previews/card-face-and-group-frame/masters/`. Their SHA-256 values are checked against the originals. Before and after use the same centered cover and display dimensions.

The new family has a colored body across the entire card, a deeper lower region and more apparent lens/ribbon separation. The old collection had no Coral Orange master, so no historical orange comparison is fabricated.

## Files and comparison sheets

- `masters/svg/` — seven editable 1536-square SVG sources.
- `masters/png/` — seven 1536×1536 PNG masters.
- `previews/faces/` — seven lossless 640-square WebP review copies.
- `previews/crops/` — seven colors × seven existing presets, 49 transparent-corner PNG crops.
- `gallery/` — offline artwork review and live crop/canvas demonstration.
- `folders/` — isolated copy of the existing folder review with new fictional artwork.
- `sheets/seven-color-overview.png`, `seven-square-masters.png` — hue and master comparisons.
- `sheets/all-49-crops.png` — shared-scale crop matrix.
- `sheets/before-after.png`, `before-after-browser.png` — actual rejected/new comparisons.
- `sheets/combined-folder-overview.png` and `folder-{landscape,portrait}-comparison.png` — A/B/C compatibility.
- `sheets/folder-{A,B,C}-{landscape,portrait}.png` — six individual folder composites.
- `sheets/folder-six-{top,bottom}.png` — sheet contents and last-member scroll.
- `sheets/miniatures-<color>.png` — each color beginning a four-thumbnail folder preview.
- `sheets/gallery-{360,393,412}.png`, `master-{360,393,412}.png`, `canvas-{360,393,412}.png` — representative CSS-pixel browser widths.
- `tools/` — reproducible artwork export, static validation and browser screenshot/check scripts. They operate in the isolated preview; no production integration.

## Skills and installed tools used

- **mobile-design**: touch targets, focus/Close behavior, vertical scrolling, small mobile layout and the explicit browser/native boundary.
- **ui-ux-pro-max**: consistent hierarchy, typography, material balance and contrast/legibility review using the existing CI as authority.
- **bemem-illustrator**: original editable geometry, rendered visual inspection, decoding, alpha/crop checks and tiny-scale iteration. Its square 192px Decorate-tile and Cozy Cute defaults are superseded by this explicit 1536-square Lagoon Glass card-face brief; no sticker assets are changed.
- Existing Inkscape 1.4.2, isolated Pillow 13 and cached Playwright/Edge. No software or dependencies were installed. No image-generation tool or stock artwork was used for these seven vector masters.

## Validation / recommended next step

`LOCAL-VALIDATION.json` records master dimensions, decoding, opaque-master/transparent-corner behavior, all 49 crops, source geometry, byte-identical folder references and rejected reference files. `BROWSER-VALIDATION.json` records color switching, seven-size geometry, 360/393/412 layouts, folder dimensions, six-member sheet contents, last-member scrolling and loaded offline controls. `VALIDATION.json` records the protection baseline and final results.

Visually inspect the collection as a family before approving production. **Recommendation: retain all seven for review, with Sky Blue as the material benchmark.** It most closely expresses the lagoon identity; Warm Brown and Golden Yellow provide useful warm contrast rather than being discarded as less “lagoon.” Final approval still belongs to the user.

Remaining approval: palette/material quality, production card-label contrast, file-format/resolution budget, mapping onto the existing appearance model and future Add Card session selection behavior. `FUTURE-RANDOMIZATION.md` documents stable per-new-session selection; it implements nothing.

There is no Add Card randomization, Group Card workflow, schema change, Wallet write, native route or app startup change. No real card images are accessed. No Samsung test is claimed. No Commit, Push or Deploy is performed.
