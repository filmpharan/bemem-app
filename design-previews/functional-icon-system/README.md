# bemem Signature Minimal — Phase1 review

**DESIGN ONLY · awaiting selection ·2026-11-11.**

Open **`index.html`** directly in your browser. No server, install, CDN or connection required. Keep the folder inside the project so the existing local font and six category symbols resolve. Review at browser100% zoom for the small-size checks. Click A/B/C to update the same glyphs across the gallery and six mockups.

## Contents

- **72 source-backed functional action groups**: [inventory](ICON-INVENTORY.md), `inventory.json`. Distinct contexts are counted separately; recurring functions share canonical symbols.
- **43 canonical proposals ×3 directions =129 editable SVGs**, under `svg/a`, `svg/b`, `svg/c`. Total SVG bytes38,416; largest450 bytes. No runtime icon renderer/library added.
- Three contact sheets: [A](sheets/a-contact.png), [B](sheets/b-contact.png), [C](sheets/c-contact.png).
- [Same-action comparison](sheets/comparison.png), prioritized16 key actions including two flip states. Cancel maps to Close drawing; visible Cancel remains explicit.
- Actual1× PNG pixel checks: [A](sheets/a-actual-size.png), [B](sheets/b-actual-size.png), [C](sheets/c-actual-size.png). Each includes16/20/24/32px, light and inverse. These are **not physical Samsung dp screenshots**. The HTML shows corresponding CSS logical sizes.
- [Default/Pressed/Selected/Disabled/Destructive/Inverse](sheets/states.png).
- Six HTML screen mockups: Home header, Account popup, Decorate rail,8x3 pagination, Card Detail, Home Photo Journal controls. Synthetic sample only; mock scan area explicitly not scannable. Manually source-informed layouts, not captured native screens.
- [Design specification](DESIGN-SPEC.md), [direction evaluation/recommendation](DESIGN-REVIEW.md).
- `manifest.json`, `validation.json`, [independent final validation](VALIDATION-RESULTS.json), transparent review PNGs under `renders/`, source/review generators. `production-baseline.json` is a hash-only safety record, not user wallet data.

## Direction read

| Direction | Character | Primary tradeoff |
|---|---|---|
| A Precision Rounded | Centered, orderly geometry | Clearest conventional baseline, less distinctive |
| B Soft Organic | Softly bowed contours and gentle proportions | Friendly; needs disciplined small-size alignment |
| C bemem Signature | Squared lens and longer pocket-like lower-right curves | Recommended for next refinement if brand distinction is preferred; test unfamiliar curves |

Recommendation is **C for further review**, not a selection or artistic approval on behalf of the user. A stays the clarity baseline. All are single-color rounded outline with proposed primary ink **#263943**, taken from current Pearl Gray primary text.

## Validation / limitations

-129 SVGs parse, use currentColor/round caps/joins, contain no scripts, fonts, raster images or external resources.129 unique file hashes; intentional navigation mirrors and semantic aliases are documented.
-129 review PNGs decode as192x192,8-bit RGBA with genuine alpha0–255; no painted edge clipping detected.516 additional downsample/decode checks at16/20/24/32px. This confirms valid output, not comprehension.
- Primary ink versus the light review canvas is approximately11.01:1. Disabled opacity is not an active-control contrast pass. Each vector stays monochrome, including optional semantic destructive/inverse tinting.
- All432 protected production source/assets/config file hashes match before/after. Production icons, navigation, theme, Wallet,270 decorations, History/Share and original website unchanged. No account/user data accessed, no Commit/Push/Deploy or dependency installation.
- TypeScript `tsc --noEmit`: PASS. No existing ESLint config; lint not installed/run. App tests/bundle were not repeated for this design-only phase; no app code changed. Gallery JavaScript passed Node syntax checking and local resource targets were verified.
- Not verified: real-browser rendering screenshots, Native SVG/Expo rendering, Samsung density/touch/Back/TalkBack behavior or user recognition study. No claim that vector novelty establishes legal exclusivity.
- Dense QR/View Image/Select All/Flip symbols need20/24dp and context. Keep Front/Back, current code-format label, Save, Cancel, Add Card, Decorate, Policy, Login and destructive/recovery text. Do not shrink hit targets to icon size.
- `Clear History` currently is not a rendered production control; no new one was invented. ReceiptViewer likewise gets no invented previous/next/zoom controls. Cloud symbol is a Policy information concept only.

## Reproduction

Use existing `.artwork-tools/.venv/Scripts/python.exe` and local Inkscape. Run `build_inventory.py`, `build_icons.py`, `build_gallery.py`, then `validate.py`; `node --check gallery-script.js` validates extracted gallery JS. No tools are installed by these scripts. Inkscape CLI can require execution outside the restricted process sandbox; it does not require an administrator installation. Files stay inside this review folder and hashes guard against production changes.

Next: user chooses A/B/C and identifies weak glyphs; refine that direction and label decisions here. Wait for explicit final approval before any production integration.
