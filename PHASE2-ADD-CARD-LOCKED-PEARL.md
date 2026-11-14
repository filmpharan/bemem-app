# Add Card — Locked original layout / Pearl Gray Lagoon Glass

Status: native development preview ready for Samsung visual review. No wallet writes.

## Approved references

- `design-previews/add-card-original-parity/index.html` and `draft-412x915.png`.
- `UI_REVERSE_ENGINEERING.md` and `UI_PARITY_CHECKLIST.md` in that folder.
- Existing `design-system/bemem-lagoon-glass-rc2/TOKENS.json` and runtime `lagoon-theme.ts`.

The user's latest decision selects the **original source-flow footer** as default.
The approved browser reference defaults to sticky; this implementation deliberately
uses its `?footer=source` structure instead. The reference files were not changed.

## Layout contract and visual adoption

| Element | Native contract | Verification |
| --- | --- | --- |
| Sheet | max92%, padding20, radius22; header/body/CTA scroll together | Component-tree tests; native appearance awaiting Samsung |
| Header | Add Card18/28/800; circular GlassButton36 with X16 | Component tests; uses installed Manrope alias |
| Preview | landscape=(contentWidth × 2/3), aspect1.586; portrait144×216 | Pure geometry tests at content widths280/320/372 |
| Tools | Flip, side label, Image, Camera; icons16, visuals36, gap12 | Component and SVG tests; Image/Camera disabled with Coming soon labels |
| Card styling | original brand composition, 14-radius, dark edge shading and soft shadow | Source review; no native screenshot available |
| Size controls | two axes, 36 minimum active selector, compact current size | Component implementation; unsupported special sizes say Coming soon |
| Country/brand | one row at default font/normal width; wraps only when constrained | Native layout requires device review |
| Fields | name placeholder, number label, optional expiration; gap12; input minimum44, radius14 | Component contract tests; no ellipsis/numberOfLines limit |
| Footer | source flow, primary GlassButton44 minimum, short Preview-only status | Tree tests verify footer inside ScrollView |

The 6-unit hitSlop on icon controls has corresponding parent padding and cancelling
margins so it is not clipped to a 36-unit parent or allowed to change visual positions.
Its real touch behavior must still be checked on Samsung.

Geometry values are a small presentation contract derived from the approved draft,
not a second theme system. Colors/materials continue to come from Lagoon tokens.

Reused values/components:

- `GlassButton` unchanged: utility/action/selected/disabled recipes, specular,
  inner rim, depth and static soft shadow. Compact dimensions are caller overrides.
- `lagoon.canvas.base`, `surface.base/reducedTransparency`, `text.*`, `action.*`,
  `rim.*`, `highlight.specular`, `shadow.tint` and `alpha()`.
- `core.typography.styles.wordmark/button/secondary` and `lagoonFonts.latin`.
  Original component sizes18/14/12 and compact line heights are retained where needed.
- Existing `expo-image`58.0.18 renders local inline Lucide SVG icons; no new package.
  SVG uses palette text color, no URL, no disk cache. Lucide license remains in the
  original-parity preview folder.

Card artwork is not recolored by app theme. Existing membership/color/payload data
and gradient presets remain unchanged. The Seven middle stop is positioned at60%
as in the approved original composition.

## UI cleanup and preserved behavior

- Removed the large development banner, blur API explanation, wallet-write paragraph,
  extended encoder explanation and repeated Coming soon paragraphs.
- The only default preview notice is `Preview only · Not saved` below the action.
- Pressing Add Card validates existing controlled values; success reads
  `Preview checked. Nothing saved.` It never calls a repository or reports Save success.
- Current Code & color controls remain behind a small disclosure link, preserving
  custom-code editing, reset-to-member-number and preferred QR/Code128 selection.
  A payload error reveals those fields even when the disclosure is collapsed.
- Same original helper functions validate exact strings; no trimming, numeric parsing,
  normalization or silent format substitution was added.
- Front/Back, orientation, brand and expiry remain memory-only. No member data is
  included in logs, network calls or analytics.
- Close/backdrop/Android Back share the original route dismissal. No navigation
  provider, Home/Create entry, FAB, coordinator or import setting was changed.

## Known differences / still awaiting device review

1. Manrope from the approved Lagoon system replaces the browser draft's available
   font/fallback, as requested. Font metrics can differ; no pixel-perfect claim.
2. Native month is a text field with `YYYY-MM`, not the HTML browser month picker.
   Existing validation is unchanged; no date-picker dependency was installed.
3. Brand dropdown uses the existing six local suggestions, rather than expanding
   the catalogue to the reference's fifty. It opens on focus instead of permanently
   adding chips/rows. Country remains fixed to Thailand.
4. Extra card shapes remain Coming soon because the model only supports two
   orientations. Selecting them does not pretend to change the saved card geometry.
5. The compact Code & color disclosure and the required preview status are present;
   they add a small amount of vertical space compared with the bare web form.
6. Large text/long names may increase card or field height to show complete text;
   normal short text follows the approved aspect ratio. Country/Brand may wrap on
   narrow/large-font layouts. TextInput scrolls long entered text horizontally as a
   native single-line editor; it does not modify the text or use ellipsis.
7. Backdrop retains existing Android31+ background-subtree blur. Older Android/iOS
   use translucent scrim fallback. No BlurView package or live Home capture added.
8. No accessible Android SDK/ADB/emulator was found, so no emulator screenshot was
   produced. Geometry/JSX tests and Android export are not proof of Samsung visuals,
   IME scrolling, text clipping, dropdown layering, SVG rendering or touch behavior.

Country, brand, expiry and image/preset serialization still need an approved future
model contract before real Save. This change does not discard them into a partial
wallet document because there is no persistence action.

## Validation

- TypeScript: passed.
- Read-only ESLint:56 source files,0 errors/0 warnings; no lint dependencies installed.
- Automated tests:189/189 passed; Add Card suite24 tests (five additional layout/icon tests).
- Android bundle exported to `.expo/add-card-locked-pearl-review` in offline mode,
  with bytecode disabled for review; not a development build or physical-device test.
- Protected source-tree hashes checked before/after: all other Phase2 logic,
  Home/Create, storage, coordinator, model/validation and existing theme files unchanged.
- No commit, push, deployment, import unlock or dependency change.

## Samsung / Expo Go review

1. Run `npx.cmd expo start --clear` from bemem-app.
2. Open `exp://<computer-LAN-IP>:<Metro-port>/--/dev-add-card` in Expo Go.
3. Compare with `index.html?footer=source` and the approved PNG: look at sheet/header,
   preview2/3, portrait144, the16/36 tool rail, Country+Brand row and form density.
4. Check Front/Back, orientation selectors, local brand search/selection and expiry.
   Image/Camera remain disabled. No camera/photo permissions should appear.
5. Open Code & color; use synthetic leading-zero/space/case text and custom code.
   Membership changes must not overwrite a custom code. Unsupported Code128 input
   must show the existing validation error, without changing input or preferred format.
6. Open Samsung keyboard on every field; Next should reach number and expiration.
   Scroll down to Add Card. Header and CTA intentionally scroll with the form.
7. Enlarge system text and use long names. Check wrapping, focus borders, dropdown
   visibility and whether text ever clips. No ellipsis should replace content.
8. Press Add Card: only validation/Not saved status. Close using X/backdrop/Android
   Back and reopen; form clears. Confirm Home/Create layout remains unchanged.

Stop after this review; no additional feature implementation is authorized here.
