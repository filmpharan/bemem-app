# BEMEM SIGNATURE MINIMAL

Version0.1 · three alternatives · **REVIEW ONLY / NOT APPROVED** ·2026-11-11.

## Principles and scope

Functional symbols should help people recognize actions quickly, complement Pearl Gray — Lagoon Glass, and remain calm beside the270 Cozy Cute decorative artworks. No faces, multicolored fills, sparkles, heavy effects or button backgrounds inside icon SVGs. This is not another sticker collection. All new drawings live here; production icons, layout, tokens, navigation, Wallet, artwork, Journal and Share are unchanged.

Source-backed inventory: **72 context-specific action groups** in `ICON-INVENTORY.md` / `inventory.json`. These consolidate into **43 canonical drawing proposals per direction**, including field/information affordances, with semantic aliases for identical functions. This is not a count of every button instance. **129 editable SVGs** total. All43 are compared across A/B/C, not different representative subsets.

## Shared construction contract

| Rule | Review specification |
|---|---|
| Coordinate grid |24×24, width/height24; nominal silhouette within3–21, a few rounded stroke extremities within~1.5–22.5 |
| Ink | `icon.ink = #263943`, read from Pearl Gray `palettes.pearl-gray.colors.text.primary` |
| Artwork | `fill="none"`, `stroke="currentColor"`; round caps/joins; no embedded text/fonts/raster/external resources |
| Secondary context | Same glyph can inherit inverse `#ffffff`, existing destructive `bemem.error = #b42318`; each individual glyph stays one color |
| Pressed | Same geometry, opacity.72; do not move surrounding layout |
| Selected | Retain selected semantics/checkmark where applicable; review uses existing subdued surface emphasis, not color alone |
| Disabled | Review opacity.38 plus disabled semantics/noninteractive behavior; contrast exemption does not replace a disabled state |
| Preferred visible sizes |20/24dp UI glyphs;32dp when genuinely needed;16dp is a stress test, not a recommendation for important standalone controls |
| Touch area | Keep at least48×48dp Android /44×44pt iOS, independently from the visible glyph |
| Negative space | Aim≥2 source units for meaningful holes; QR receives explicit optical exception below; inspect actual size, not only enlarged outlines |
| Safe export | No edge paint on24×24 page; no shadow, glow or permanent surface background; do not tight-crop path bounds |
| Alignment | Align optically by silhouette, not SVG bounding box alone; keep common baseline/keyline relationship to Manrope labels |
| Motion | No motion required. Future feedback must preserve Reduce Motion and never imply completed Save before readback |

These are proposed review tokens, **not changes to app theme tokens**. Primary ink is existing; pressed/disabled choices here are design proposals. Light/dark boards are contrast previews, not six new app themes.

## Three direction rules

| | A · Precision Rounded | B · Soft Organic | C · bemem Signature |
|---|---|---|---|
| Base stroke |1.85 source units |2.0 source units |1.9 source units |
| Corner language |Regular2.4-unit radii; centered circles |Slightly bowed contour edges, unequal curve tension and soft oval rhythms |Compact squared curves and a longer lower-right turn, derived from card/pocket geometry |
| Search |Circular lens, straight handle |Subtly asymmetric lens and gently curved handle |Rounded-square lens with a continuous pocket-like lower turn |
| Account |Symmetric head/shoulders |Softer head and welcoming shoulder curve |Rounded head; shoulder contour turns inward, leaving intentional lower negative space |
| Card/doc objects |Orthogonal, stable geometry |Soft envelopes, gentle taper |Calm upper corners with larger lower-right curve; information lines can join a useful inner return |
| Optical stance |Most conventional and immediately legible |More welcoming; must guard against loose/sketch-like forms at small sizes |More recognizable brand rhythm; use it where form supports meaning, never add an arbitrary badge/mark |

Universal actions such as Close, familiar arrow directions, warning/info and status dots intentionally remain close to conventional metaphors. A distinctive family does not require making every universal symbol unfamiliar. Direction differences are primarily contour geometry/proportions/curve behavior, not color changes. B/C strokes are deliberately close in weight so comparisons are fair.

### Optical corrections and outline exceptions

- QR finder boxes are deliberately square-ish with small corner radii, not the generic card-body radius: .65(A)/.85(B)/1.05(C). Stroke1.65 preserves their inner holes. A first contact-sheet draft looked like three circles and was corrected.
- Dots in More / info / warning are made from very short strokes or tiny outlined circles. At UI size they read as solid monochrome points; no second fill color is introduced.
- View Image includes a small magnifier and is denser than Gallery; prefer24dp. Do not force it into an already tiny thumbnail.
- Flip Front / Flip Back are **state depictions for the existing single toggle**, not two new adjacent buttons. Keep Front/Back text; internal lines are too similar at16dp to carry the entire meaning.

## Selective icon-only recommendations

**Strong candidates:** Search, Account, navigation chevrons, Close X, contextual Edit/Share, Undo/Redo, contextual Rotate, crop zoom, More. All retain accessible names and state. Contextual Camera/Gallery need recognition testing; Photo Journal keeps their existing text to reduce ambiguity.

**Keep visible text:** Add Card, Decorate, Policy, Login, Save/Save Changes, Cancel/Discard, Delete Card, Delete Selected, destructive cleanup/recovery, Use Image, Back to Card/History, share-output choices, preset names/dimensions, form fields and gradient/swatches. In the Decorate mockup, Cancel stays text-only in its existing60dp slot; Undo/Redo fit56dp slots with glyphs, Save remains glyph+text in the remaining rail width.

**Needs testing:** code-format destination toggle; flip states; Select / Select All; Add Photo; contextual remove decoration. Current code-format label remains visible, and the accessible name describes the destination (“Show QR Code” / “Show Code128”). Tap remains the alternative to swipe. No signature glyph may enter a QR/barcode scan region or reduce its quiet zone.

**Never replace:** bemem. wordmark, user card artwork, membership number/payload, existing six illustrated collection symbols. Country is currently a noninteractive label; no Country picker is invented. Cloud is informational only, not a new backup action. Clear History is not currently rendered; its reserved alias is not permission to add a button.

## Canonical naming and semantic mapping

Files: `svg/<a|b|c>/<kebab-case-action>.svg`. `manifest.json` maps every SVG and stroke strategy; `aliases` maps semantic contexts without duplicating drawing files. Examples:

- back→previous, forward→next; redo is the intentional horizontal counterpart of undo.
- cancel→close as a drawing mapping only; **the Cancel label and cancellation behavior stay explicit**.
- remove-decoration/delete-selected/clear-history/discard→delete glyph, each with its own action name and safety rules. Sharing a symbol never shares deletion permissions or transaction logic.
- use-image→check; reinspect→refresh. Recovery labels remain visible; never imply a safe automatic retry.

Navigation previous/next and Undo/Redo are intentional mirrored pairs. Crop up/down can rotate the directional glyph in context, with correct accessible names. Do not mirror arbitrary symbols (QR, text/data, card art) or use rotation to imply new functionality. Landscape/Portrait are meaningful orientation states, not accidental duplicate artwork. C object corners stay visually grounded instead of indiscriminately rotating the whole family.

## Accessibility and native feasibility

SVGs are editable source proposals, not a new renderer. They use basic path/rect/circle/group commands suitable for later native rendering review. No Expo/RN code was changed. After selection, test the selected renderer with current installed Expo58 / React Native types; do not assume browser `currentColor` automatically maps through expo-image. Existing AddCardIcon uses Base64 SVG and expo-image; rendering/theming options must be evaluated in a separately approved integration.

Inline review SVG inherits the surrounding text color. A raw standalone currentColor SVG may fall back to black in a generic viewer; the HTML gallery and PNG boards deliberately show the chosen Soft Charcoal. Future integration must supply the foreground explicitly. No icon-font dependency is proposed (avoids missing Samsung font glyphs).

Decorative icons next to visible labels should be hidden from the accessibility tree; icon-only buttons expose action names, not filenames. Preserve selected, disabled, expanded and busy states. Account focus should enter the existing modal and return to its trigger; real TalkBack verification remains future work. Dynamic text expansion must not shrink touch areas or cause label ellipses. Native Android Back and dirty-form safeguards are unchanged.

## Production / validation pipeline

Existing local Python/Pillow/Inkscape only. `build_icons.py` draws source SVGs, parses XML, renders a transparent sheet per direction and crops192px review rasters. `build_inventory.py` checks evidence strings against current source lines. `build_gallery.py` embeds SVGs into an offline A/B/C gallery with six source-informed mockups and local Manrope font.

For this functional-icon task,24×24 replaces the Illustrator skill's96×96 **sticker** template; no skill file was edited. The user specifically requested monochrome functional icons and takes priority over Cozy Cute sticker directions. Artwork is code-drawn original geometry using familiar concepts, not hand-painted or a stock pack recolor. Legal exclusivity/trademark clearance is not claimed.

Review SVGs are lightweight vector originals; PNGs/contact sheets are evidence only, not a proposed runtime raster icon library. Future expansion must use the chosen direction's keylines/corner/negative-space rules, record source context and label recommendation, and pass small-size/contrast/RTL/disabled/accessibility review before integration. Preserve canonical IDs and avoid inventing a second symbol for the same action.

## Review deliverables

- `index.html`: offline gallery, same43 proposals, exact CSS-size checks, inverse sizes, state controls, six current-layout mockups. A/B/C buttons update all glyphs. Card Detail mockup toggles format and Front/Back; no app/wallet commands run.
- `sheets/a-contact.png`, `b-contact.png`, `c-contact.png`: labeled design-only contact sheets.
- `sheets/comparison.png`: prioritized same-action A/B/C board.
- `sheets/*-actual-size.png`:16/20/24/32 **physical pixels in a1× PNG**, useful for reference, not Samsung dp or density-correct screenshots. View at100%, no image zoom; browser CSS px likewise are logical review units, not measured native dp.
- `sheets/states.png`: all three direction rows, default/pressed/selected/disabled/destructive/inverse.
- SVGs/renders/manifest/inventory and validation reports.

Manual mockups preserve screen hierarchy and relevant control order/slots; they are not pixel-perfect native screenshots. Synthetic Test Member/00123456 only; code-panel glyph is explicitly a nonscannable mockup, not an encoder result. No screenshot or mockup is a claim that production UI changed.
