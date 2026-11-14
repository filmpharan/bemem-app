# bemem — Lagoon Glass Group Folder

**Design review v0.1 · 14 November 2026 · Awaiting visual approval**

This directory is an isolated design prototype. It contains no production route, Wallet integration, persisted folder data or grouping workflow.

## Open the review

Open `gallery/index.html` in Edge/Chrome directly from the filesystem. It uses relative local SVG, image, script and font files; no CDN, backend or install is required. Keep the directory together when copying it. A browser may substitute its system font if local-file font loading is restricted.

The top two boards compare the concepts, enlarged using a common block unit. The interactive canvas below uses a 12-column unit derived from its **actual** inner width. On a narrow browser the embedded device shrinks to fit; its viewport buttons are width limits, not a claim that the available space is always that wide. The full-width links remove the review controls: use browser responsive mode at the matching 360, 393 or 412 CSS-pixel width. These represent dp geometry, not measured Samsung pixels.

1. Choose A/B/C, landscape/portrait, and 0/1/4/6 sample members.
2. Enter a folder name or try the long-name fixture. This changes memory only.
3. Tap the folder. Scroll to see every member, including the fifth and sixth.
4. Close with X, outside tap, Escape or browser Back. Focus returns to the folder.

**Browser Back is simulated modal navigation. Native Samsung Back, insets, TalkBack and Expo rendering have not been tested.** No native route was created because this phase must leave production navigation intact.

## Concepts

| Concept | Visual structure | Strength | Tradeoff |
|---|---|---|---|
| A — Lagoon Folder | Mint/teal gel folder, compact tab, inset four-window well, calm name strip | Clearest reading of separate card miniatures at actual canvas size | More orderly and less expressive than the pocket |
| B — Lagoon Stack | Deep blue folder, slightly tilted layers contained inside the shell, low retaining lip | Most pronounced hierarchy and depth | Rotation adds visual activity and reduces alignment precision |
| C — Lagoon Pocket | Teal glass sleeve, translucent retaining front and curved reflective lip | Strongest physical sense of cards being contained | The lip deliberately veils part of the lower row; individual artwork is less exposed |

**Recommendation: A as the first implementation candidate.** It is the clearest small folder and keeps all four artworks visible. C is the stronger material alternative if the sleeve appearance is preferred. This recommendation does not select a concept on the user's behalf.

All concepts are original SVG geometry with layered gradients, restrained rim/specular highlights and small static shadows. They are not hand-painted illustrations, native glass or live backdrop blur. The shell itself has no expensive blur. The browser sheet scrim uses a single optional blur with a solid dim fallback. The old pastel card faces and decorative frame compositions are not used.

## Footprints and composition

- Exactly two folder footprints: **6×4** and **4×6**. Existing membership-card presets are unchanged.
- Paint inset: **0.1 block on each side**. Paint rectangles are 5.8×3.8 or 3.8×5.8 blocks. SVG viewBoxes are 580×380 and 380×580 respectively.
- Portrait has a narrower tab/body, taller content well, different window offsets and name clearance. It is not the landscape image stretched vertically.
- Each folder mini image fits its cell without changing its card's painted aspect ratio, `(widthBlocks−0.2)/(heightBlocks−0.2)`. Miniatures are thumbnails, not a second literal Canvas grid. Photographs use deliberate `object-fit: cover` cropping within that preserved card shape.
- A uses an orderly two-by-two arrangement. B uses the same limited roster with small alternating rotations. C uses a two-by-two arrangement behind the translucent lip. A single member is centered; zero members shows an empty well.
- Selection is always the first **four** ordered members. Five or six members still show four thumbnails. There is **no count badge** or hidden-count label on any shell. Counts on the review controls/state-board captions identify test fixtures only.
- Names use up to two lines with controlled truncation on the shell. The full name is available in its accessible button label, tooltip and opened sheet heading. Small canvas folders use 12/16 type; enlarged objects use 14/18. These are preview-local choices, not changes to global CI.

## Folder contents sheet

Pearl Gray `#eceff1`, Soft Charcoal `#263943`, Manrope, 24px top corners and a 48×48 Close target reuse the approved visual foundation. The shell name becomes the sheet heading. The header and short bottom note stay outside the scrolling content.

Every ordered member is resolved independently of the shell's four-thumbnail selection. All six fictional cards are present. Their seven-preset system is not changed: the six fixtures demonstrate 6×4, 4×6, 7×3, 2×3, 5×7 and 8×4. No membership data or code payload is included. The seventh existing preset, 3×2, is not removed or redefined.

The sheet's **prototype-only display packing** uses twelve columns and reserves caption rows. This algorithm does not import or replace production placement, collisions or persisted positions. Card paint dimensions share one block unit and 0.1-block inset; full-card previews keep 14px corners. The sheet is display-only: no detail navigation, rename, move, delete, regroup or membership edits.

Touch/keyboard: 48px Close and control targets, inert background, focus return and contained keyboard focus between Close and the scroll region, outside dismissal, browser Back/Escape, safe-area bottom padding and reduced-motion support. The scroll region is keyboard-focusable. Scroll stays inside the sheet. Physical safe-area/keyboard behavior remains a native integration check.

## Skills and provenance

- `mobile-design`: modal navigation, reachable Close, scrolling, focus, safe-area intent and native/browser distinction.
- `ui-ux-pro-max`: visual hierarchy, layout, consistent typography, contrast, small-scale legibility and restrained glass effects. Existing approved CI overrides generic palette suggestions.
- `bemem-illustrator`: original geometry, editable SVG masters, Inkscape transparent PNG exports, decode/alpha and small-scale visual review. Its Cozy Cute sticker/192px square tile conventions do not apply to these rectangular folders; the explicit Lagoon Glass brief takes precedence.
- Image-generation tooling: one newly generated, unbranded ceramic-cup still life without people, text or membership information. It represents a user-photo card safely; it is **synthetic**, not a real user's photo.
- Existing Inkscape 1.4.2 and isolated Pillow 13 tooling were reused. No tools or app dependencies were installed.
- Manrope and its OFL license are copied locally from the existing project. Four stronger sample gradient faces are original, preview-only SVGs and are not an approved production Card Face collection.

## Review images

- `sheets/comparison-landscape.png` — A/B/C, common enlarged unit.
- `sheets/comparison-portrait.png` — A/B/C, same enlarged unit as landscape.
- `sheets/empty-one-four-six.png` — capacity-state comparison, shell preview stops at four.
- `sheets/gallery-overview.png` — full review gallery.
- `sheets/canvas-{360,393,412}.png` — full-width browser canvas geometry.
- `sheets/contents-{360,393,412}-{top,bottom}.png` — sheet top and scrolled bottom; sixth member reachable.
- `sheets/{A,B,C}-six-member-sheet.png` — each concept opens the same six-member contents sheet.
- `sheets/long-name-{360,393,412}-{canvas,sheet}.png` — safe truncation/full heading.
- `sheets/enlarged-heading-simulation.png` — browser CSS enlargement approximation, **not native font-scale certification**.

## Validation and limits

`tools/browser_check.js` completed **407 assertions, 0 failures** across 126 combinations (3 concepts ×2 footprints ×7 counts ×3 widths), including miniature limits, dimensions/insets, actual thumbnail/contents aspect ratios, all members, last-member scrolling, long-name/Close separation, dismissal, capacity rejection and offline interaction after loading. `tools/focus_check.js` adds **5 passing checks** for the keyboard scroll region, forward/reverse focus containment, focus return and horizontal overflow. Total: **412 browser assertions**. `tools/capture_final.js` captures settled states, avoiding translucent mid-animation screenshots.

`ASSET-VALIDATION.json` records twelve SVG/PNG shell layers, decoded PNG dimensions and genuine alpha ranges. Front overlays are intentionally semitransparent, so their maximum alpha may be below 255. A zero-alpha background is verified, not inferred from extensions.

`VALIDATION.json` records the checks and SHA-256 comparison of existing source/assets/documents/previews. Existing project TypeScript validation (`tsc --noEmit`) passed. The package has a lint script but no installed ESLint CLI; no dependency was installed to run it. No production integration is claimed. Full Expo builds were deliberately not run for static HTML artifacts. Native shadows, native font measurement, TalkBack, actual Samsung density, Android Back and production performance need testing only after a concept is approved for integration.

## Next approval

Choose/refine A, B or C and its small-scale name/miniature balance. Then approve a separate production phase for folder data representation, grouping/moving interaction, occupancy and child-position rules, single-writer persistence and navigation. The proposed interface in `FUTURE-CONTRACT.md` is documentation only. No Wallet schema, migration, entitlement or runtime gate is changed here.
