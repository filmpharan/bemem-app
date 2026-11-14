# 270-artwork refinement — technical and visual review

Status: implemented locally; awaiting Samsung / visual approval. 2026-11-11.

## Artwork and preservation

| Collection | Existing, in original order | Appended frames | Total |
|---|---:|---:|---:|
| Pet & Care | 40 | 10 | 50 |
| Travel Diary | 40 | 0 | 40 |
| Wellness | 40 | 10 | 50 |
| Café Day | 40 | 0 | 40 |
| Shopping & Gifts | 40 | 0 | 40 |
| Little Savings | 40 | 10 | 50 |
| **Total** | **240** | **30** | **270** |

`existing-240.json` records the original runtime paths, collection order, stable IDs and SHA-256 hashes. All 240 source PNGs remain byte-identical. Their existing paint scales are unchanged. The three unaffected collections retain exactly the same membership/order. The six selector symbols reuse existing assets and add no decorative IDs.

New stable IDs: combine each prefix **pet-rope**, **wellness-sprig**, **savings-chain** with each suffix below (30 total). Complete labels, source references and hashes are in `review/manifest.json`.

| Suffix | Role | Base connections |
|---|---|---|
| straight | Straight segment | W / E |
| corner | Rounded 90° corner | W / S |
| end | End cap | W |
| tee | T-junction | W / E / S |
| cross | Four-way junction | N / E / S / W |
| short-detail | Short-detail straight | W / E |
| long-detail | Long-detail arched straight | W / E |
| ornamental-corner | Decorative curved corner | W / S |
| connector | Ornamental connector | W / E |
| special-end | Decorative end cap | W |

Artistic references: the actual `pet-accent-06`, `wellness-accent-02`, `savings-accent-07` PNGs and the three matching screenshots supplied during this task. The Samsung drawer screenshot mentioned in the brief was not supplied; existing production layout/code was used for that context.

## Production method and honesty

Read and applied project `bemem-illustrator`, `mobile-design` and `ui-ux-pro-max`. Used existing isolated Python/Pillow, local Inkscape and the Illustrator skill's `read_and_normalize` SVG export path. No software/dependencies installed. These are original **code-authored editable SVG illustrations**, not hand-painted work, not newly AI-generated images, not stock emoji and not stretched copies of the selected PNGs. The approved reference PNGs are unchanged.

Rope uses cream strands, sage wraps and blush tied details; leaves use lobed sage silhouettes and cream veins; chain uses alternating pastel linked loops following the curved path, with occasional small attached charms. Review the visual quality separately from technical validity.

## Format / connections

- 30 non-animated **192×192 PNG**, **8-bit RGBA**, alpha range **0–255**, transparent corners; decoded independently with existing `pngjs` in tests and Pillow during build.
- New runtime images total **277,296 bytes** (~271 KiB); full library **3,725,314 bytes** (~3.55 MiB). Editable 96×96 SVG masters retained.
- Each tile occupies logical **1×1**, paint scale **1.0**. No 20% enlargement or card inset. Anchors N(48,0), E(96,48), S(48,96), W(0,48). No art on undeclared edges.
- All 120 quarter-turn variants checked. Across each family, 882 facing-edge combinations; **2,646 total**. Final boundary samples match exactly (max alpha/RGB difference **0**).
- Export normalizes **one outermost raster pixel** at declared connector edges using a symmetric profile derived from the same family's straight segment. This removes Inkscape rotational anti-alias rounding; it does not resize/crop tiles or change interior SVG geometry. Re-export through `build_frames.py`, not Inkscape alone, to reproduce the delivered PNG seams.
- 270 distinct canonical decoded RGBA hashes under all rotations/mirrors. No new exact silhouette/recolor duplicates; the additional 48px thresholded silhouette review found no candidates. These checks do not establish artistic originality or legal clearance by themselves.
- New families connect **within their own family**. They are not promised to match widths/colors of previous unrelated frame families. Placement and rotation remain manual; collision policy unchanged.

## Review files

Open `index.html` directly in a browser, with all adjacent files present. No server, CDN, network or install needed. It contains the six-icon selector and all 270 assets with interactive pagination, plus all new pieces.

- `review/contact-sheet.png`: all 30, labeled by functional role; stable IDs shown in gallery.
- `review/contact-dark.png`: all 30 against a dark background.
- `review/actual-size.png`: 24 / 28 / 32px units, plus 2× pixel enlargement for inspection.
- `review/frame-connections.png`: closed rectangles, crossings and open T paths, enlarged and at 28px.
- Per-family `*-contact.png`, `*-actual-size.png`, `*-connections.png` are also available.
- `review/validation.json`: measured results.

## Visual review / remaining limitations

Inspected all contact sheets and connection layouts. Corrected the rotated rectangle demonstration and replaced disconnected/floating chain loops with path-following linked rings. Leaf attachments now join their stems. The figures preserve the reference palettes and subjects, while their clean SVG linework is more regular than the reference raster illustrations. Fine knots/veins/highlights lose detail at 24px; the frame silhouettes and directional connections remain visible. Final charm/readability at Samsung density is for user approval, not claimed verified.

Exact raster edges do not guarantee zero physical-device filtering artifacts at fractional dp coordinates or GPU sampling boundaries. Device-level seamlessness, touch behavior, TalkBack, large-font drawer fit, and drag performance remain **Not Verified** until Samsung testing. No claim of measured FPS or production aesthetic approval.

## Selector and pagination

Six equal transparent square `Pressable` controls, one row, no horizontal ScrollView, no visible labels/background/border/pill/underline. Symbols are paw, suitcase, flower, coffee, shopping bag and piggy bank. Selected opacity **1**, other controls **0.48**, no animation. Screen-reader names, button role and selected/disabled state remain exposed. Artwork has no drag responder and is not decoration data.

The row uses the available width minus 16dp total padding. At 320dp window width the square is approximately 50.3dp, at 390dp approximately 62dp. Below approximately **306dp available drawer width**, six squares cannot all reach 48dp in one row; this task preserves the user's one-row/no-scroll constraint and reports that limitation rather than overlapping hit areas. Icons stay inside their cells and the 56dp visual cap. Actual touch response still needs Samsung review.

8 columns × 3 rows remains unchanged. 50 assets: 23+Next, Previous+22+Next, Previous+5+18 inactive blanks. 40 assets: 23+Next, Previous+17+6 inactive blanks. Collection change resets page 1. Navigation cells never have asset IDs or drag handlers. Synchronous existing drag refs guard both paging and category switching. On short windows drawer may exceed the ~40% target to preserve all three rows.

Only six selector images and the visible asset page render in the picker. Home still mounts no picker and paints only saved local decorations, without animation, remote fetch or live vector work. Existing single-writer, verified readback, Undo/Redo, Cancel and Back protections are reused without modifications. No wallet/schema/storage/coordinator/card/detail/history/share/search changes.

API verification: inspected installed Expo 58.0.23 / React Native 0.88.1 and official [Expo Image SDK58](https://docs.expo.dev/versions/v58.0.0/sdk/image/), [React Native Pressable](https://reactnative.dev/docs/pressable). Local skill search on icon-only selection/touch targets was used as guidance; local typings and official docs govern API details.
