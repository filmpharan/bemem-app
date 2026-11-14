# bemem Illustrator v2 — first artwork trial

Date: 2026-11-09. Status: **Technical checks passed; awaiting human visual approval.** Not integrated into Decorate or production app assets.

## Skill and tools actually used

The project skill `.agents/skills/bemem-illustrator/SKILL.md`, its supporting README and `scripts/prepare_assets.py` were read and used. It is discoverable at the requested project path; its included export pipeline successfully executed. This does not claim that a new skill was installed or that the current session's global skill catalog refreshed.

User-approved artwork tooling is isolated in `.artwork-tools/`:

- Python 3.12.10, virtual environment `.artwork-tools/.venv/`.
- Pillow 13.0.0, installed **only in that venv**; import verified.
- Inkscape 1.4.2 (`f4327f4`, 2025-05-13), CLI verified at `.artwork-tools/inkscape-1.4.2/bin/inkscape.com`.
- Built-in AI image generation created the nine raster sticker illustrations. Inkscape and Pillow are conversion/geometry/QA tools, not AI illustration generators.
- Krita was not found and was **not installed**. No layered `.kra` masters exist.

Inkscape came from the official media.inkscape.org distribution, extracted as a project-local portable application without executing the MSI, Administrator/UAC, PATH changes or security changes. See `../../.artwork-tools/TOOLING.md` for official URLs, locally computed hashes, extraction method and the Authenticode verification limitation. Temporary cabinet, raw extracted duplicates and unusable 7z were removed only from the tooling downloads directory; the official MSI is retained. No other software or Node/Expo/React Native dependencies were installed.

## Production methods and sources

Nine original AI-generated raster subjects use the first cat as a style reference. The four botanical pieces are original programmatically authored SVG vectors, rendered with Inkscape. These are **not human hand-painted illustrations**. No system emoji, icon library, commercial sticker pack or existing mascot was used as source material. Visual review did not identify a recognizable existing mascot, but this is not an exhaustive similarity or legal clearance search.

`artist-originals/` preserves the nine high-resolution AI PNGs. `artwork-source/` holds nine normalized 768×768 PNG masters and four editable 96×96-viewBox SVG masters. `provenance.json`, `normalization.json` and `build_sources.py` record sources, prompts and preparation. Original raster masters are editable bitmaps, not layered brush files or vector illustrations.

Sticker normalization uniformly fits the alpha bounds inside approximately 80% of the square. It removes only fully transparent outer margin and adds a consistent transparent canvas, with no white-background removal and no change to aspect ratio. **Frame sources and frame outputs are never cropped.**

## The 13 handoff PNGs

All paths below are relative to `review/png/`. They remain review-only files.

| Collection | Files |
| --- | --- |
| Pet & Care | `pet-cat.png`, `pet-dog.png`, `pet-paw.png` |
| Travel Diary | `travel-suitcase.png`, `travel-plane.png`, `travel-cloud.png` |
| Wellness | `wellness-flower.png`, `wellness-leaf.png`, `wellness-teacup.png` |
| Modular Botanical Frame | `vine-straight.png`, `vine-corner.png`, `vine-end.png`, `vine-flower-accent.png` |

Each file represents one logical 1×1 tile. Rotate the same frame tile by multiples of 90° rather than storing orientation duplicates. The flower accent has no edge connector.

## Automated results

| Check | Result |
| --- | --- |
| Skill's actual export pipeline | PASS, all 13 assets |
| Actual file signature and complete PNG decoding | PASS, 13/13 |
| Dimensions, format, channels | PASS, 192×192, nonanimated, 8-bit RGBA PNG, 13/13 |
| Genuine alpha, not opaque white background | PASS, alpha extrema 0–255; transparent pixels and transparent corners, 13/13 |
| Sticker outer-border transparency | PASS, 9/9 |
| Total handoff PNG payload | **184,086 bytes** (179.77 KiB); excludes editable sources, tooling and review sheets |
| Frame required midpoint anchors and nonconnector edges | PASS, 12 rotated variants |
| Horizontal seam pairings | PASS, 25/25 |
| Vertical seam pairings | PASS, 25/25 |
| Facing-edge alpha difference | 0 for all checked pairings |
| Facing-edge RGB difference | At most **2/255**, caused by SVG raster antialias rounding at the corner's south edge |
| Offline HTML source/image links | PASS, all resolve locally; no remote dependencies |
| Production source preservation | SHA-256 comparison: all **121 src files unchanged**, no src files added |
| TypeScript (`tsc --noEmit`) | PASS |
| Lint (`expo lint`) | **Not completed**: no ESLint config; Expo attempted automatic setup, then network request failed with ECONNREFUSED. No dependencies/config were added to fix it. |

Detailed per-asset size, visible bounds, hashes, alpha counts and all 50 seam comparisons are in `review/validation.json`; the skill's original handoff manifest is `review/asset-manifest.json`.

The source vine centerline anchors are exactly N(48,0), E(96,48), S(48,96), W(0,48), with matching tangents, outer stroke 3.8 and inner stroke 2.1 SVG units. At 192px, all connectors occupy edge indices 92–99 and have identical alpha coverage. The small RGB raster rounding difference is disclosed rather than described as pixel-identical color. Rendered joined previews show no gap. All nonconnector edges remain fully transparent after rotation; leaves do not escape their tiles.

## Visual review materials

- `index.html`: offline gallery of all 13 assets, individual PNG/source links, light/dark tiny samples, responsive grid-size simulation.
- `review/collection-review.png`: labeled collection sheet, enlarged and 28px samples on light and dark.
- `review/contact-sheet.png`: unchanged output of the skill's own QA pipeline.
- `review/actual-size-preview.png`: all 13 assets at 24, 28 and 32px, dark-background 28px samples, and a 3× magnification of the downsampled 28px tile.
- `review/frame-connections.png`: 3×3 and 5×4 closed frames, 2×2 corner-to-corner frame, horizontal and vertical end caps, and all 12 base-piece rotations. Each joined layout is shown enlarged and at 28px/tile.

## 1×1 size: what is verified and what is simulated

Source inspection: `src/lib/canvas-layout.ts` uses 12 columns and `unit = width / 12`; `WalletCanvas.tsx` measures its viewport with 16dp horizontal margin; the app content is capped at 600dp width. Decorations use zero inset. No production source was modified.

| Simulated phone viewport | Approximate block |
| --- | --- |
| 320dp | 24dp |
| 360dp | 27.33dp |
| 390dp | 29.83dp |
| 412dp | 31.67dp |

The HTML tiny samples follow `(min(viewport,600) - 32) / 12` CSS pixels, with an optional fixed 28px reference. These are size simulations based on the current source, **not a measurement of the user's Samsung**. Browser zoom, display density, physical screenshot scaling and image viewers can change apparent size. Native Samsung appearance, actual measured viewport/unit and color reproduction remain **Not Verified**. No artwork was placed into the production canvas to test it.

## Illustrator critique and limitations

- Cat and dog have distinct, gentle generic expressions; the palette and organic cocoa contours form a coherent small collection. Tiny silhouettes remain recognizable in the simulated range.
- At 24–28px, fine facial marks and suitcase strap details soften. Recognition relies on the silhouette rather than those details. Please judge charm and legibility on the target Samsung before approval.
- AI raster pieces retain subtle tonal variation/highlights despite the flat-color prompt. They are softer and more painted-looking than the precise flat SVG vine. This is an honest trial difference, not a claim of perfect hand-painted or palette-locked consistency.
- Botanical lines are deliberately quiet. They look continuous in the review frames but may be too delicate for the user's preferred tiny-scale appearance. Further simplification/line weight changes should follow visual feedback.
- There is genuine transparent space around the objects, not a baked checkerboard. Opaque cream/white pixels inside the cat, cloud and cup are intentional artwork. Both light and dark contact sheets were inspected.
- No color-calibrated device review, human illustrator pass, layered painting master, production performance test or app integration is claimed. A human illustrator/Krita brush pass would be useful if stricter handmade texture and fully controlled flat fills are desired; no additional tool is needed to review this trial.

## Re-run the approved QA workflow

From the project root, using the isolated tools already installed:

```powershell
$env:PYTHONUTF8='1'
.artwork-tools/.venv/Scripts/python.exe .agents/skills/bemem-illustrator/scripts/prepare_assets.py --input artwork-trials/illustrator-v2-first-trial-2026-11-09/artwork-source --output artwork-trials/illustrator-v2-first-trial-2026-11-09/review --inkscape .artwork-tools/inkscape-1.4.2/bin/inkscape.com
.artwork-tools/.venv/Scripts/python.exe artwork-trials/illustrator-v2-first-trial-2026-11-09/build_review.py
```

The tool sandbox in this session restricted Python temporary-directory access; the export script ran successfully outside that tool sandbox as the same standard user. This did not use Administrator privileges or alter Windows permissions. Do not rerun `build_sources.py` over existing masters; it deliberately refuses to overwrite their directories.

No Wallet, Home, Create, Card Detail, History, production assets, app dependencies/configuration or original website files were changed by this artwork trial. Existing uncommitted Phase 1/2 work was preserved. HEAD remains `c500a015cfc80bd6a63c88d3848562b33f02faa3`. No Commit, Push, Deploy or data reset was performed.

**Stop here for visual approval.** No Decorate interface or asset integration is authorized by this trial.
