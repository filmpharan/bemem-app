# Yellow Group Folder — thin integrated top flap

2026-11-20 — **WAITING FOR SAMSUNG ACCEPTANCE**.

Primary reference: the user's yellow-folder board (landscape / portrait folders with
a thin top flap and name inside). The attached card collection is contextual only;
all 16 matte card PNGs, 14 legacy card PNGs and their mappings are unchanged.

## Presentation change only

`GroupFolderCard.tsx` still draws a background shell, dynamic member fronts, foreground
shell and dynamic name in that order. The old foreground was a bulky lower lid, with
a two-line bottom title and a reserved lower band. The new foreground is a thin top
flap. It uses the same production component in Home, Create and Decorate.

No new folder model, interaction wrapper, sheet, migration, asset loader or Wallet writer.
Existing folders adopt the new presentation without rewriting any stored data.
Home remains read-only. Sheet, Rename, Ungroup, card detail entry, 350ms Decorate drag,
collision, Undo/Redo and Save/Discard are unchanged.

## Colours and source assets

| Role | sRGB |
|---|---|
| Main warm yellow | `#FFE09B` |
| Body top / bottom | `#FFE4A8` / `#FFDA89` |
| Flap top / bottom | `#FFE09B` / `#FFD17B` |
| Fine edge / lower flap seam | `#F2C45F` |
| Dynamic name ink | `#60451D` |

The only gradient is a restrained vertical yellow tone change; no metallic, specular,
glossy, bevel or filter effect. Names and sample cards are not baked into shell assets.
Four original programmatically authored SVGs, exported using existing Inkscape 1.4.2
and checked with Pillow 13 in the isolated artwork environment:

| Production PNG | Dimensions |
|---|---|
| `assets/group-folders/yellow-top-flap-v1/landscape-back.png` | 1200 × 800 |
| `assets/group-folders/yellow-top-flap-v1/landscape-front.png` | 1200 × 150 |
| `assets/group-folders/yellow-top-flap-v1/portrait-back.png` | 800 × 1200 |
| `assets/group-folders/yellow-top-flap-v1/portrait-front.png` | 800 × 150 |

Editable masters: `design-system/bemem-yellow-folder/artwork/`, same four base names,
`.svg`. Production manifest: `assets/group-folders/yellow-top-flap-v1/MANIFEST.json`.
27,946 bytes total. Real RGBA PNGs; transparent corner pixels, alpha range 0–255.
No screenshots used as production assets. These are vector-authored, not hand-painted.

`scripts/build-yellow-folder-artwork.py` is the reproducible export source. It refuses
to overwrite an existing versioned PNG. Revisions should publish a new version.
The four original `lagoon-stack-*` PNGs and their historical source bytes remain intact.

## Unchanged outer geometry

- Landscape footprint: 6 × 4 blocks.
- Portrait footprint: 4 × 6 blocks.
- Existing square Grid, 0.1-block visual inset, positions and collision rules unchanged.
- No protruding tab or extra component outside the footprint.

The body fills the existing visual bounds. The flap PNG fills the width and only the
computed flap height, anchored at top=0; it is not stretched over the whole folder.

## Internal geometry and dynamic name

Production source of truth: `folderVisualLayout()` in `src/lib/group-folder-visual.ts`.
For measured visual width W, height H, and system font scale S:

- Label line height T = 16 × clamp(S, 1, 1.3).
- Flap height F = min(0.26H, max(0.1875 × min(W,H), T + 4)).
- Label top = max(0, (F − T)/2), label height = T, horizontal insets = 0.075W.
- Preview gap G = min(4dp, 0.04 × min(W,H)), same rule as before.
- Preview well left = 0.055W; width = 0.89W; top = F + G.
- Bottom clearance = 0.055 × min(W,H).
- Preview well height = max(0, H − well top − bottom clearance).

At representative 360dp screen width (328dp Canvas width), the existing inset gives
landscape 158.53 × 103.87dp and portrait 103.87 × 158.53dp. Both use a 20dp flap at
normal text scale, 24.8dp at the existing 1.3× maximum label scale. These are calculated
values, **not physical Samsung measurements**.

The label is still the original `card.name`, rendered once, 12dp / 16dp, bold, using
the existing `fontForUiText()` Manrope / Noto Sans Thai choice. It stays a single line
with tail ellipsis and the existing maxFontSizeMultiplier=1.3. It is not normalized or
saved differently. Long English/Thai names truncate on a narrow folder; full names stay
available in the existing folder sheet and parent accessibility label. There is no
bottom label band. `pointerEvents="none"` still delegates all interaction to the
existing Canvas folder wrapper.

## Member previews

Existing `folderPreviewRegions()` and member ordering are unchanged:

| Members | Landscape | Portrait |
|---|---|---|
| 2 | Two across | Two stacked |
| 3 | Three across | Three stacked |
| 4–6 | First four, 2 × 2 | First four, 2 × 2 |

The previews still use upright `cover` with centred positioning, no labels, added
borders, count badges or rotations. Only the internal well moves/enlarges to accommodate
the top flap. Opening a folder still shows all members in the existing sheet.

## Review package and validation

- `design-previews/yellow-group-folder/index.html`: normal/enlarged text, 1× logical-size
  preview and enlarged inspection; 2–6 members and short/long English/Thai names.
- `contact-sheet.png`: static browser composition of actual production PNGs, **not a
  React Native / Samsung screenshot**.
- `asset-validation.json`: actual PNG decoding, dimensions, transparency and checksums.
- `fixtures.js`: generated by `scripts/yellow-folder-preview.cjs` from the actual
  production geometry function; no independent approximation of the layout rules.
- `VALIDATION.json`: results, modified-file inventory and scope checks.

TypeScript, folder/geometry/component/management tests, Decorate session tests and the
full existing regression suite are run with synthetic fixtures only. Android Hermes
is a local bundle check. No real Wallet, Expo Go data or original website is accessed.

Physical Samsung checks still required: normal/enlarged font rendering (especially
Thai marks), real asset decoding, visual flap balance, touch/drag alignment and sheets.
No Samsung acceptance is claimed. No Motion Phase 3 or unrelated feature was started.

## Samsung acceptance workflow

1. Open existing landscape and portrait folders in Home; check yellow body, thin top
   flap, one name above previews, correct positions and all original cards.
2. Open the folder sheet and a member's Card Detail; Close/Android Back must behave as before.
3. In Create, use synthetic test cards to check 2, 3, 4, 5 and 6 members; only four
   fronts show on the folder shell, but all members show in the sheet.
4. Check 4dp gaps, upright crops, a short English name, a long English name and a long
   Thai name at normal and enlarged fonts. A one-line ellipsis is intentional.
5. Test creating, adding a member, Rename and Ungroup; Ungroup must keep all cards.
   Do not delete real cards or reset the Wallet for testing.
6. In Decorate, Tap must not open a folder. Hold ~350ms, drag, Undo/Redo, then test
   Save and Discard independently. Check Android Back and unchanged Footer/drawer.
7. Reload normally and verify names, members, orientation, card artwork and saved positions.

No commits, tags, pushes, deployments, dependency installs or device-data resets.
