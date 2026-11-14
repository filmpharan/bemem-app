# bemem — existing icon family refinement

**Design preview only · seven target actions · awaiting review.**2026-11-11.

Open `index.html` directly in a browser. It includes reference anchors, Before/After, seven SVG/PNG downloads,16/20/24/32 samples and three placement studies. All resources/fonts are local; no server or installation needed. Keep this directory inside `design-previews/` so the local Manrope font resolves.

## Reference decision

The current **production** icons are the primary source. No direction from the previous A/B/C exploration was selected, imported or used as the new style baseline. That older exploration remains untouched as history.

| Existing anchor | Actual source | Treatment in review |
|---|---|---|
| Search | `src/components/bemem/BememIcon.tsx` | SVG reconstruction of the20×20 Native View circle/handle, including1.8-unit material |
| Account | `src/components/bemem/HomeAccountMenu.tsx` | SVG reconstruction of24×26 Native head/shoulder borders; corner normalization approximated,1-unit export breathing room |
| Camera | `src/components/bemem/AddCardIcon.tsx`, `camera` path | Existing path copied as reference only |
| Front/Back | Same file, `flip` | Existing path copied as reference only |
| Share / Close | Same file, `share` / `close` | Existing paths copied as reference only |
| Existing Delete / Rotate | `src/components/bemem/DecorateIcon.tsx` | Source-based Native View reconstructions for Before; Rotate gets transparent export padding around its transformed arrow |
| Existing Edit | `src/components/bemem/AddCardIcon.tsx`, `edit` | Existing path copied for Before |

Native View reconstructions are not device screenshots or pixel-identical captures. The Camera/Flip/Share/Close/Edit reference paths carry the existing project's Lucide attribution; its license is retained at `references/LUCIDE-LICENSE.txt` and applies also to the copied Before/Edit path. No reference paths or production code were changed. Delete is shown in charcoal in the comparison to isolate geometry; its existing destructive context color is not removed from the app.

## Extracted style rules — continuation, not a replacement system

- Existing AddCardIcon uses a24×24 grid,2-unit stroke, round caps and joins, modest rounded corners. Search/Account native outlines are slightly lighter at1.8; existing22px Decorate tools use approximately1.8–2.0. The seven proposals use the same24×24 /2-unit basis.
- Existing ink is **#263943**, read from current Pearl Gray `text.primary`; no new app color token. Individual SVGs use a default charcoal color and `stroke="currentColor"` for later contextual recoloring. Inverse previews use identical alpha, not extra colors.
- Preserve quiet, familiar silhouettes, simple circles/rectangles and2–3-unit corner turns. No organic/sketch distortion, exaggerated asymmetric corners, proprietary signature mark, stickers, sparkle badges or3D effects.
- No button background is baked into a new glyph. Keep icon artwork separate from existing48dp touch targets. The glyph at16/20/24/32 is not the touch area.
- Current `addCardLayout.iconSize` is16. Dense Edit/Policy/Decorate details should be reviewed at that exact size; do not silently enlarge Production controls to accommodate a design.

## Seven proposals and clarity rationale

| Target | Change / intended clarity improvement | Remaining interpretation risk |
|---|---|---|
| Delete | Separate lid, tapered body and two vertical slots make the trash-can silhouette more explicit than the existing rounded container. | Destructive meaning still needs scope/confirmation. Keep Delete Card / Delete Selected text where currently present. |
| Rotate | Integrated clockwise circular arrow is larger and more continuous; an inner right angle hints at the90-degree step. | The glyph alone does not communicate a precise numeric angle. Keep accessible name “Rotate decoration90degrees”; snapping remains existing logic. |
| Edit | Pencil enters a partial page/card frame, making “modify this item” more explicit than the isolated diagonal pencil. | At16px the frame/pen intersection is dense.20/24px are easier to parse; any size change needs separate approval. |
| Add Card | Rounded card shape, clear plus and short identity line; deliberately no image mountains/sun. | Preserve Add Card label in the Account menu; existing menu entry opens Create, not an immediate form. |
| Decorate | Card outline with two adjustment controls communicates card styling/customization, avoiding a generic drawing brush. | May also suggest settings. Keep Decorate text. The illustrated controls are a metaphor, not permission to add actual sliders or change editor functionality. |
| Policy | Rules document with two short checklist lines makes the information/rules intent more explicit than a blank document. | Can also mean a checklist; retain Policy. Checkmarks do not mean user agreement or create a consent workflow. |
| Login | Inward arrow enters a rounded doorway, distinct from the Account portrait. | Retain Login text and current Coming Soon notice; no authentication is implemented. |

These are **recognition hypotheses**, not a validated user comprehension study. Visual consistency does not establish legal exclusivity. User review determines whether they are clearer enough to proceed.

## Placement studies

1. **Home Account menu:** current wordmark/Search/Account arrangement, same four menu labels with the proposed leading Add Card / Decorate / Policy / Login glyphs. No additional labels/actions.
2. **Decorate contextual controls:** Delete remains left, Rotate remains right;22px glyphs sit in48px targets. Existing Cancel/Undo/Redo/Save remain text. The schematic canvas is only context; no new drawer/grid/navigation is built.
3. **Create Card Detail:** Edit stays beside the name in the current Create-only slot. Front/Back and Close remain reference anchors. Default Edit rendering is16px to reflect the actual component. Synthetic Test Member/00123456 only; code panel is an explicitly nonscannable layout placeholder, not a changed encoder.

These are source-informed HTML placement studies, not screenshots. Mockup button taps display review feedback and never navigate, save, delete, authenticate or access Wallet data.

## Assets and comparison files

- `svg/`: exactly **7 target SVGs**: delete, rotate, edit, add-card, decorate, policy, login.
- `png/`: corresponding **7 transparent192×192 PNGs** for review, not proposed runtime raster assets.
- `references/`: six reference SVG/PNG pairs plus existing Lucide license; not additional proposed designs.
- `before/`: three current-source SVG/PNG examples; not alternative new designs.
- `sheets/comparison.png`: existing anchors, three Before/After pairs, four additions.
- `sheets/seven-icons.png`: light-background contact sheet.
- `sheets/actual-size.png`: all seven at16/20/24/32 physical pixels in a1× board, light/inverse. HTML uses CSS logical sizes; neither is a measured native Samsung dp screenshot. View at100% zoom.
- `manifest.json`, `validation.json`, `production-baseline.json`: target mapping and technical/protection evidence.

## Tools, checks and limits

Applied project `mobile-design` for touch/context/label decisions, `ui-ux-pro-max` for consistency/ambiguity review with local search, and `bemem-illustrator` for editable vector craft/export/visual inspection. User's functional-icon brief takes priority over the skill's Cozy Cute sticker palette/template; no skill file was edited.

Used existing isolated Python/Pillow, local Inkscape and the Illustrator pipeline's SVG renderer. These are code-drawn vector refinements, not a human hand-drawn illustration claim. No software/dependencies installed.

Validated XML, PNG decoding,192px RGBA transparency, bounds and target uniqueness. Visually inspected comparison and actual-size boards. At16px Rotate's inner angle and the Edit/Policy/Decorate interiors lose some separation; larger size and retained labels help, but final Samsung/device rendering is **not verified**. Browser/native antialiasing can differ. No renderer, token or production icon replacement is implemented here.

Before/after SHA-256 guards cover **432 production source/assets/config files**, including current UI,270 decoration images and package files. They remain identical to this task's starting state. No Wallet/card/history/receipt files were accessed, no phone data was cleared and no original-website file was changed. Existing uncommitted work preserved. No Commit/Push/Deploy.

Next: review the seven proposals beside the existing anchors. Refine any ambiguous shapes here; only after explicit approval consider replacing the selected Production icons.
