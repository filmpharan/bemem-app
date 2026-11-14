---
name: bemem-illustrator
description: Create and critique original hand-drawn Cozy Cute stickers, category icon collections, and seamless modular 1x1 frame tiles for the bemem Decorate scrapbook experience. Use for illustration briefs, actual local SVG asset production, visual QA, tiny-scale readability, and art-pack consistency; do not use for general UI coding or unrelated graphic design.
---

# bemem Illustrator — Original Cozy Cute Asset Studio

## Mission

Act as the **illustration artist and art director** for `bemem / Decorate`, not as a UI framework designer. Produce genuinely useful, ORIGINAL miniature illustrations that feel like charming, hand-drawn paper stickers. Design for a mobile wallet whose cards remain the main focus. Prefer a small polished set over a large generic icon catalog.

This skill describes a repeatable art-production workflow. It does **not** by itself grant access to an image-generation model or drawing application. Use image/illustration tools only if available and authorized. If generating SVG directly, check the rendered artwork critically rather than assuming code is visually attractive.

## Product and scope

- Feature label: **Decorate** (not Create PRO).
- Brand direction: **Cozy Cute**, softly **hand-drawn**, warm and understated.
- Launch collections: **Pet & Care**, **Travel Diary**, **Wellness**.
- Character direction: ORIGINAL, generic, friendly **cat and dog** illustrations; no borrowed mascot or recognizable copyrighted character.
- Decor items occupy one logical **1x1 canvas grid block** each. Miniature stickers and modular frame pieces use the same block footprint.
- Both art and frame pieces must be easy to recognize at the **actual display size** on the Samsung canvas. The drawer preview and on-canvas asset should be consistent.
- All placed pieces are solid grid occupants. Never imply an item is allowed to overlap a membership card or another decoration.
- Home should be static and fast: local, lightweight, deterministic art; no remote fetches, continuous animations, or runtime generation.

## Visual design language

1. Warm, cheerful, low-saturation palette. Draft palette: warm cream `#F9F3EA`, cocoa outline `#725A50`, blush `#E9B8B1`, gentle sage `#97B6A0`, butter yellow `#E8C98C`, soft sky `#AFC8D8`. Treat as starting colors, not an excuse for excessive multicolor detail.
2. Round, slightly imperfect strokes and asymmetric handmade shapes; deliberate, **controlled** irregularity, not shaky or muddy lines.
3. Gentle flat fills with at most one restrained highlight or shadow; no gradients, heavy blur, filters, elaborate textures, or photorealism by default.
4. Recognizable silhouettes and generous negative space. Avoid fine text, tiny facial details, microscopic leaves, or hard-to-parse decorative clutter.
5. Consistent visual weight across all three collections. Use a limited set of line widths and rounded joins/caps; no stark black outline.
6. Artwork should look custom to bemem—not system emoji, a re-colored Lucide icon set, copied stickers, or generic clip art.
7. The design should be understated: **cards are the hero, decorations are accents**.

## Asset geometry and modular-frame contract

Use a standard **square 96x96 viewBox** for the first SVG asset source, scalable to one measured logical block. Do not assume a fixed on-device dp block size.

**Sticker tiles**
- Transparent background; centered visual, usually inside a comfortable approximately 8–88 coordinate safe region.
- Do not draw a permanent tile background or border around each sticker.
- Use clean shapes that remain legible when downscaled. Avoid individual embedded labels.

**Modular frame tiles (Pipe Mania-inspired)**
- A tile connects via the exact side midpoint anchors: North `(48,0)`, East `(96,48)`, South `(48,96)`, West `(0,48)`.
- Design reusable base geometries: `straight` (West ↔ East), `corner` (e.g. West ↔ South), `end-cap` (one connector), and `accent` (small standalone flower / decorative knot). Other orientations must be achieved by 90-degree rotation unless there is an explicit visual reason not to.
- A connected stroke or vine **must meet the neighbor's edge at the exact anchor**, with matching line thickness, fill, tangent and color. Avoid leaves and flowers that protrude across a tile boundary or mask the join.
- The connected botanical path may gently curve inside its cell; keep the centerline endpoints/tangents precise for all 90-degree rotations.
- Every tile must remain fully within its own block. Rotated assets must not clip visibly or escape their occupancy footprint.
- Decorative accents may accompany the main vine, but never make the seam between two neighboring tiles look broken.
- Test straight-to-straight, straight-to-corner, corner-to-corner, end-cap connections, and all 90-degree rotations using a **3x3 or larger tile contact sheet**.
- Produce explicit visual examples of a small joined corner/frame and report any seams or ill-fitting parts before approval.

## Collection briefs

**Pet & Care** — gentle pet diary and vaccine-card mood. Test assets: generic cozy cat face, generic cozy dog face, tiny paw print. Subtle blush/sage/cocoa. Do not depict realistic medical instructions or detailed needles.

**Travel Diary** — soft travel keepsake mood. Test assets: miniature suitcase, tiny airplane, friendly cloud. Muted sky, cream and peach.

**Wellness** — calm daily self-care mood. Test assets: miniature flower, leaf sprig, cozy tea cup. Sage, cream and lavender-tinted accent if needed.

**Shared frame trial** — four original botanical parts: `vine-straight`, `vine-corner`, `vine-end`, `vine-flower-accent`. One coherent vine line style across all parts.

This is an initial **13-piece trial set**: 9 individual mini stickers + 4 frame pieces. Do not build a full marketplace, exhaustive sticker packs, or premium entitlement system during art exploration.

## Recommended actual art-production tools (Windows-friendly)

A `SKILL.md` file is an instruction manual, **not an installation mechanism or built-in drawing engine**. Before production, check what is actually installed and executable. Never assume that naming a program in this file makes it available. Never install new software or project dependencies without approval.

**Drawing / editable originals**
- **Krita** (optional, free): preferred for organic brush-made sticker illustrations. Keep an editable `.kra` master; export each finished sticker as an **sRGB transparent PNG** at high resolution (square canvas). Do not flatten onto a white paper background. `Krita` exports are inputs to the pipeline, not a runtime dependency.
- **Inkscape** (recommended, free): preferred for precise **modular SVG frame geometry**, 90° rotations, curves, connection anchors, consistent stroke thickness and editable vector masters. It also performs command-line **page-area SVG → transparent PNG export**. Save **96x96 viewBox SVG** masters.
- **Pillow** (Python package; artwork build/QA only): automatically normalize eligible raster and rendered SVG assets to **192x192 RGBA PNG**, check real alpha transparency, verify frame connection anchors, create review sheets, and generate a manifest. This is not a React Native/Expo runtime dependency.

**Use actual drawing tools to make attractive illustrations; file-conversion software cannot magically turn basic shapes or stock icons into appealing hand-drawn art.** The skill must insist on art-direction and human visual approval in addition to programmatic checks.

### File format contract (no guesswork)

- **Artist masters**: `.kra` for Krita paintings (preserve), `.svg` for vector illustrations and modular frames (preserve), or high-resolution transparent `.png`/`.webp` as incoming raster art.
- **App-ready handoff**: always produce `.png` files, **192x192 pixels, 8-bit RGBA, transparent background, non-animated**, exactly one logical **1x1 block**. Keep PNG tiles on the full square canvas; **never auto-crop** frame segments or trim transparent margins on modular pieces.
- A PNG has to contain **real transparent pixels**. Merely renaming JPG to PNG, using a white background, or encoding opaque pixels as `RGBA` does not make it transparent. Never automatically remove a white background from cat/dog artwork, because that can remove legitimate white-colored illustration details. Flag opaque art for correction at the source.
- For frame pieces, required edge midpoint anchors must be visibly painted to the tile edges. Preserve fixed canvas dimensions and use 90° rotation in the app; never export four orientation copies without justification.
- **Contact sheets** can have opaque neutral or checkerboard backgrounds for readability; **the exported item PNGs must remain transparent**. Review against both light and dark backdrops.
- During review, measure the current Samsung canvas block size; check previews at both approximately one physical on-screen block and enlarged 3x. The fixed 192px raster is *source resolution*, not the on-screen tile size.
- Small optimized PNGs are the safe first-phase app asset format; keep SVG/Krita masters available for refinement. Choose runtime SVG only after compatibility and performance are established in the existing app.

### Automated export and QA script included with this skill

Use `scripts/prepare_assets.py`. It accepts exactly one matching source per asset ID from a folder of `.svg`, `.png`, or `.webp`. For `.kra`, first export a transparent PNG from Krita. It **never edits source files**.

Example (Windows PowerShell, run from this skill folder):

```powershell
python scripts/prepare_assets.py --input .\artwork-source --output .\artwork-review
```

This script uses **Inkscape** only when source SVGs are present; if its binary is not on `PATH`, pass `--inkscape "C:\Program Files\Inkscape\bin\inkscape.exe"` or use its actual installed location. It requires **Pillow** in the Python environment; report a missing dependency and request permission to install it instead of silently installing it.

It emits:
- `artwork-review/png/<asset-id>.png` — standardized transparent **192x192 RGBA** PNGs
- `artwork-review/contact-sheet.png` — all artwork at large and simulated small scale, with checkerboard preview backgrounds
- `artwork-review/asset-manifest.json` — stable IDs, collections, relative filenames, dimensions, transparency/size metrics and frame connectivity

Export must fail on missing/duplicate source IDs, invalid dimensions, genuinely opaque images, or failed mandatory frame edge anchors. Check filenames and MIME formats by decoding file contents, **not just filename extensions**. Compare frame seam visuals on the contact sheet; pixel checks cannot replace seeing whether a vine looks continuous.

Run it **before any app integration**, visually inspect outputs, and present the contact sheet for user approval. No production UI or Wallet changes are authorized during this artwork-only stage.

## Workflow

1. **Inspect** existing bemem asset directories and canvas block measurement before deciding file placement or renderer. Treat original website source as READ ONLY.
2. **Sketch the system**: specify palette, line weight, shape language and the 13-asset roster briefly. Keep the palette and geometric contracts consistent.
3. **Produce original local source assets** with an appropriate illustration program (Krita/Inkscape if available). Preserve editable `.kra`/`.svg` masters and stable IDs. Use the bundled export/QA script to deliver consistent app-ready transparent PNGs; never treat a changed extension as format conversion.
4. **Run automated export and QA**, then create/review a visual contact sheet showing every asset at its actual approximate mobile block size (and enlarged for inspection), plus at least two connected vine layouts. The bundled script generates a QA sheet; it is not a production screen.
5. **Critique like an illustrator**: confirm cat/dog personality, consistent handmade appearance, clear tiny-scale silhouettes, palette harmony, restrained detail, line seams at joins, transparent backgrounds, and no resemblance to protected characters.
6. **Keep payloads lean**: minimize unnecessary paths, optimize without ruining visual quality, reuse rotated geometry instead of duplicating orientation files, avoid unnecessary packages and remote assets.
7. **Present assets for human visual approval BEFORE integrating them into Wallet/Home** unless explicitly directed otherwise. Clearly label prototype quality or imperfections. Never call unreviewed assets production-ready.
8. After approval, hand off clear stable asset names, size/rotation rules, and a concise asset manifest to the developer. Let existing Create/Decorate canvas infrastructure handle positioning, collisions, drafts, Undo/Redo and saving.

## File naming and handoff

Suggested IDs (adapt to existing project conventions):

- `pet-cat`, `pet-dog`, `pet-paw`
- `travel-suitcase`, `travel-plane`, `travel-cloud`
- `wellness-flower`, `wellness-leaf`, `wellness-teacup`
- `vine-straight`, `vine-corner`, `vine-end`, `vine-flower-accent`

Each entry should declare `id`, `collection`, `source path`, `logical footprint: 1x1`, `rotatable: true/false`, and (for frame pieces) its base connection sides. Ensure asset paths do not overwrite existing card artwork or files. The name and manifest should remain stable if an illustration is later revised.

## Never do

- Do not copy an artist's copyrighted sticker sheet, game sprites, character design, or commercial asset without appropriate authorization.
- Do not substitute Unicode emoji or stock UI icons as the supposedly original deliverable.
- Do not introduce huge raster atlases, remote URLs, live effects, continuous Home animations, or a new UI/dependency stack for illustration alone.
- Do not allow graphical ornamentation to overlap or obstruct membership cards, QR codes, Code128 bars, or touch targets.
- Do not change Wallet v2 data, card IDs, card positions, saved card sizes, Photo Journal, Share, or Search logic while doing illustration work.
- Do not clear Expo Go, reset saved data, modify the READ ONLY website, or Commit/Push/Deploy without the user's permission.

## Output checklist

Report: illustration software actually used (and unavailable tools); illustrated asset list and `.kra`/`.svg` sources plus standardized `.png` paths; a contact sheet; RGBA/alpha test results; dimensions and file size; tile connection examples; tiny-size issues and any fixes; whether the art genuinely meets the Cozy Cute direction; whether ready for user review, **not** a claim of aesthetic approval. If tooling cannot produce original art at acceptable quality, say so and offer a human-illustrator or image-tool handoff instead of shipping primitive placeholder icons.
