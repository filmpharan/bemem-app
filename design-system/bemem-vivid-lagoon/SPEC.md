# bemem — Vivid Lagoon Phase 2

Date: 2026-11-20. **Implemented; awaiting physical Samsung acceptance.**

Membership wallet for everyday Android use: fresh teal accents, white Canvas and quiet,
original matte geometric card artwork. Layout variance 2/10 (approved navigation locked),
new motion 1/10 (none), density unchanged. This is colour/artwork adoption, not a redesign.

## Brand and semantic tokens

| Role | Value | Use |
|---|---|---|
| Brand Primary | `#00B5A6` | Turquoise accent reference; not small text on white |
| Brand Deep | `#00786F` | Wordmark, primary action fill, footer navigation labels, page glyph outline |
| Brand Light | `#C6F5EB` | Current page in expanded footer; selected utility controls |
| Brand Ink | `#073F3C` | Brand ink / documentation and review palette |
| Canvas | `#FFFFFF` | Home, Create and Decorate; high/low also white |
| Sheet / reduced-transparency surface | `#F5F8F8` | Sheets, dialogs, utility fills, Decorate drawer |
| Elevated surface | `#FFFFFF` | Fields and supporting controls |
| Primary text | `#263943` | Existing soft-charcoal functional icon family and reading text |
| Secondary text | `#4C606C` | Helper text and static mode labels |
| On action | `#FFFFFF` | Labels on the accessible dark teal action fill |
| Deep action | `#075B55` | Existing button/sheet recipes |
| Grid guides | `#DCE5EA` | Existing 2dp dots, full colour opacity; editors only |
| Save | `#26734d` | Existing positive Save controls |
| Status success | `#176b4a` | Existing success distinction |
| Back / discard / destructive / error | `#b42318` | Existing semantic distinctions preserved |
| Disabled | `#65777E` | Disabled text token; existing component opacities retained |

`TOKENS.json` is the current adoption snapshot. `lagoon-theme.ts` imports it; CI,
compatibility aliases and existing shared components keep using their established API.
The six historical palettes and core geometry/material/font contracts are preserved.
No theme picker. Historical Pearl Gray / Lagoon Glass documents are untouched.

Primary-action white text, Deep wordmark and body/helper text pass the automated
normal-text contrast checks (4.5:1). Bright Primary is deliberately not used for body text.
Disabled composited controls and physical screen/glare appearance still need device review.

## Matte card collection

| Colour | Front base | Middle | Focal shape | Composition |
|---|---|---|---|---|
| Gray | `#E1DEDF` | `#C8C4C6` | `#B7B4B8` | Large cropped circles + circular accent |
| Brown | `#EED2C2` | `#D9AE98` | `#CD9E86` | Two diagonal capsule bands |
| Red | `#F7CDCF` | `#ECA5AA` | `#DF9197` | Overlapping arches and semicircles |
| Green | `#DBE7D5` | `#B3CDB1` | `#9ABD9A` | Interlocking soft-corner blocks |
| Blue | `#D3DDF4` | `#B3C5EA` | `#A0B8E3` | Tilted ellipses |
| Purple | `#E1D7EE` | `#C7B4DD` | `#B7A1D4` | Offset concentric circles |
| Pink | `#F7D7E1` | `#F0B7CB` | `#E9A7BF` | Rounded triangles and circular intersection |
| Orange | `#FFE0C5` | `#FFC392` | `#F6AF7B` | Four curved petal modules |

Each matching back uses a 32%-white blend of its base and a smaller echo of its own
geometry. Exact back base values and original SVG paths are recorded in the asset
manifest. Backs are individually authored, not a single white design or recoloured front.
Artwork contains no labels, membership data or machine-readable codes.

These are **original programmatically authored SVG compositions**, exported by the
already-installed Inkscape 1.4.2. They are not hand-painted, screenshot crops, AI raster
generation, or remixed sticker assets. Pillow 13 in the isolated artwork environment
performs PNG normalization, decode/crop validation and contact-sheet assembly.

Locations:

- Editable SVGs: `design-system/bemem-vivid-lagoon/artwork/{colour}-{front|back}.svg`
- Runtime PNGs: `assets/card-faces/vivid-lagoon-v1/art-bemem-vl1-{front|back}-{colour}.png`
- Production manifest: `assets/card-faces/vivid-lagoon-v1/MANIFEST.json`
- Eight pairs: gray, brown, red, green, blue, purple, pink, orange.
- PNGs: 1536x1536, opaque RGB sRGB fills, 16 files, 397,639 bytes in total.
  Opaque backgrounds are intentional for card faces; sticker transparency rules do not apply.
- Generated metadata: `src/constants/matte-card-artwork.ts`
- Reproducible tool: `scripts/build-vivid-lagoon-artwork.py` (uses existing tools only).

Versioned IDs are immutable after publication. The tool refuses different output bytes
under an existing ID. Its explicit `--refine-unreviewed` switch permits local iteration
only for newly created files absent from the phase-start hash inventory. Do not use it
to revise approved artwork; publish new IDs instead.

## Seven footprints / cropping

Unchanged presets: 3x2, 6x4, 7x3, 8x4, 2x3, 4x6, 5x7. Unchanged 12-column square Grid,
0.1 block inset per side, uniform cover scale, centred crop at x=.5/y=.5 and zoom=1,
and runtime 14dp corner radius. There are no footprint-specific duplicate files.

All square masters deliberately retain their identifying geometry in the centre crop.
112 crops (8 colours x front/back x 7 sizes) decode successfully and retain non-solid
geometry. This is structural validation, not a claim of Samsung aesthetic approval.
Contact-sheet thumbnails are scaled review representations; their decorative clipping
does not define the runtime card radius or physical block size.

## Runtime adoption and compatibility

Only the lazy new-Add initializer samples the eight new faces. Its existing one-session
state and asynchronous preparation pipeline are unchanged. Front and Back always pair;
typing, flipping and preset changes do not sample again. Gallery/Camera override only
the selected side. New faces use the existing `sky` form colour for persisted dark ink
(`#143f3c`); this does not recolour the raster artwork. It passes contrast on all front fills.

`DEFAULT_CARD_ARTWORK` retains all 14 legacy entries and adds the 16 matte entries.
`LEGACY_CARD_FACES` keeps the old mapping, including the original soft-back ink override.
Every old static require and asset byte is preserved. Existing saved cards are neither
loaded through the random initializer nor rewritten. No Wallet schema migration.

Use the new artwork build script for this collection. The original
`prepare-default-card-artwork.py` is a historical seven-pair generator; it must not be
used to regenerate the current aggregate registry over the new adoption.

Navigation behaviour, owner/writer, Save/Discard/Stay, Undo/Redo, Search, Grid, gestures,
page entitlement and device data are untouched. Header remains 48dp with no Canvas top
margin; Footer retains five slots, minHeight 56dp, paddingVertical 4dp and targets >=48dp.
Only shared colour roles and the current page's selection fill change in the Footer.
Safe Area / system bars and native sheet/window behaviour are unchanged.

## Review and validation

- `design-previews/vivid-lagoon/index.html`: actual production images; Front/Back and colour review.
- `collection-and-footprints.png`: eight front/back pairs and all seven front footprints.
- `crop-validation.json`: 112 front/back crop checks.
- `asset-validation.json`: dimensions, byte sizes, checksums, palette and source paths.
- `ui-color-mockups.png`: illustrative HTML colour placements, **not runtime/Samsung screenshots**.
- `output/vivid-lagoon-validation/`: local test/export logs and protected-file hash checks.

Automated coverage includes the existing theme, confirmation/sheet, navigation,
artwork pairing, Gallery/Camera independence, stale callback, preparation reuse,
Save/readback/restart and Wallet safety tests, plus new matte/contrast tests.
Android Hermes export is local. ESLint remains unconfigured: no lint dependencies or
configuration were installed. Physical Samsung acceptance is pending.

## Samsung checklist

1. Open existing Wallet normally; compare saved card artwork/photos and positions.
2. Check white Canvas in Home/Create/Decorate, guides only in editors, and teal balance.
3. Check Profile/Search, centred wordmark, 48dp Header, compact Footer and system insets.
4. Open Add Card; inspect the selected matte Front and matching calmer Back.
5. Type, flip and change all seven sizes: selected pair stays fixed; no old-image flash.
6. Across new Add sessions inspect eight colour families (random selection is not guaranteed
   to visit all eight in eight opens). Use the HTML collection to review every family directly.
7. Replace one side from Gallery/Camera; the other side must stay unchanged.
8. Save a synthetic test card through the existing flow, return Home, reload, open Detail.
   Verify artwork, exact number and real QR/Code128; do not reset or migrate Wallet.
9. Check Group Folder shells, existing decorations, drag/scroll, selector and Undo/Redo.
10. Check normal/enlarged fonts and navigation-bar clearance. Report any faded, overly
    glossy, cropped or insufficiently distinct artwork before acceptance.

Deferred: Motion Phase 3, new features, theme picker. No commit/push/deploy or device
Wallet mutation was performed. Stop for Samsung review.
