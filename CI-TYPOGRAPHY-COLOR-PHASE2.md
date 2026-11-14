# CI Phase 2 — Typography & Semantic Color Consistency

Implemented for Samsung review. This phase has **not** received Samsung visual approval.
Scope: focused presentation changes on top of the existing uncommitted production tree; no new dependencies.

## Shared roles

`src/constants/ci-theme.ts` adds aliases over the existing Pearl Gray palette. Historical TOKENS.json geometry is not applied.

| Role | Font size / line height | Weight |
| --- | --- | --- |
| title | 18 / 26 | 800 |
| section | 16 / 24 | 700 |
| body | 14 / 22 | existing/default |
| supporting | 12 / 18 | 500 |
| button | 14 / 22 | 600 |

Roles supply typography only, without margins, dimensions, colors, or a global Text override. Local approved overrides remain explicit. Most migrations replace equivalent literals; intentional readability changes include explicit Manrope on loading/error/empty/scroll feedback and semibold History button labels.

## English, Thai and mixed UI text

- Existing root registration remains unchanged: bundled Manrope as `BememManrope`, bundled Noto Sans Thai as `BememThai`.
- `fontForUiText()` selects Noto for an entire UI string containing Thai, including mixed Latin/Thai strings. It does not split combining-mark sequences, normalize text, or modify payloads.
- Confirmation titles, descriptions and action labels use this selection; measured AddCardText labels load both existing fonts and measure using the selected family.
- AddCardText retains system fallback until its local font registration is ready, scaling, glyph measurement, Android font padding and wrapping. No ellipsis or forced shrinking was added.
- Tests inspect the actual bundled font cmap: Noto contains the tested Thai base/combining characters and Latin glyphs, with GSUB/GPOS tables. Manrope lacks the tested Thai glyph. This verifies font coverage, **not native Samsung shaping**.
- Card artwork, membership numbers, journal user content, TextInput formatting and fixed export typography remain intentional exceptions. This is not an app-wide user-content font rewrite.

## Semantic color values

| Role | Current value |
| --- | --- |
| text.primary / action.neutral | `#263943` |
| text.secondary / text.supporting | `#4c606c` |
| text.onAction | `#ffffff` |
| action.primary | `#405764` |
| action.positiveSave | `#26734d` |
| action.back / action.discard / action.destructive / status.error | `#b42318` |
| status.success | `#176b4a` |
| status.disabled | `#263943` (existing token; control opacity supplies the disabled treatment) |
| surface.canvas / surface.sheet | `#eceff1` |
| surface.elevated | `#fafcfd` |

Aliases keep semantic roles separate even where values coincide. Existing Header Save green is not replaced with the success token. Edit and History destructive text now share the approved red instead of legacy `#9c3434` / `#a12d38`. Selected surfaces and artwork colors are unchanged.

## Production files changed

All component paths below are under `src/components/bemem/` unless stated otherwise.

| File | Focused change |
| --- | --- |
| `src/constants/ci-theme.ts` (new) | Roles, palette aliases, existing state recipes, safe UI font selection |
| `ConfirmationDialog.tsx` | Equivalent shared roles/colors; dynamic whole-string font selection |
| `AddCardSheet.tsx` | Title alias with approved 18/28 local override |
| `AddCardText.tsx` | Register both existing fonts and select matching measurement/render font |
| `AddCardForm.tsx` | Labels, hints, expiration text and validation feedback aliases |
| `AddCardEditor.tsx` | Existing action typography through button role, retaining 14/20 bold |
| `EditMembershipCardEditor.tsx` | Same action role; semantic Delete red and semibold text |
| `HomeAccountMenu.tsx` | Menu, Policy, Coming Soon and CTA roles; retain 15/24 reading size |
| `CardHistorySheet.tsx` | Heading/body/supporting/button roles and destructive text |
| `HomeHeader.tsx` | Existing Save/Back/state values through semantic aliases |
| `DecorateMode.tsx` | Existing Save/Back/disabled aliases; explicit error typography |
| `WalletEmptyState.tsx` | Explicit UI font/supporting role; existing copy unchanged |
| `WalletCanvas.tsx` | English scroll-hint font family only; no layout or Grid changes |
| `src/app/index.tsx` | Loading, search status and error typography |

Tests updated: `test-confirmation-dialog.cjs`, `test-canvas-page-ui.cjs`, `test-production-integration.cjs`, `test-header-layout.cjs`, `test-card-history.cjs`, `test-decorate.cjs`, `test-home-account.cjs`, `test-card-form.cjs`, `test-expiration-picker.cjs`, `test-membership-scanner.cjs` (all in `scripts/`). Their headless module loaders now support the CI module; Decorate asserts the actual semantic red instead of an old mock-only red.

New test files: `scripts/ci-theme-fixture.cjs` loads the real CI module against the actual palette; `scripts/test-ci-theme.cjs` adds nine focused checks.

## Approved exceptions and states preserved

- 50dp eight-slot Header, slot assignments, 24sp/22sp wordmark, square selector and vertical popup unchanged.
- ConfirmationDialog: 20dp radius/padding, 18/26 title, 14/22 body/buttons, action order, placement, inline/nested presentation, callbacks and existing busy guards unchanged.
- Sheet title stays 18/28; form label line height stays 16; compact labels/notices stay 10/15; Add/Edit actions stay 14/20. No approved control is enlarged.
- Policy stays 15/24; supporting feedback with an existing 19dp line height keeps 19dp.
- Header disabled/pressed opacity remains .45/.7; Decorate disabled remains .4; confirmation disabled/pressed remains .65/.8. These are named recipes, not one global opacity.
- Busy indicators, accessibility labels, actual disabled behavior and duplicate-action protection are preserved. Global GlassButton is unchanged; no new async timing or transaction handling.
- Card Detail, QR/Code128, Share, Crop, Full View, membership-number formatting and card-specific palette remain untouched.
- Seven card footprints, radius14, inset.1, Canvas/background/grid colors, 270 decorative assets, Wallet schema/writers, saved layouts and entitlement logic are unchanged.
- The obsolete Empty Wallet Phase1 wording is deliberately left for the separate copy task.

## Validation performed

| Check | Result |
| --- | --- |
| `npx.cmd tsc --noEmit` | Passed |
| Focused CI/form/confirmation/header/account/history/decorate/integration tests | **408/408 passed** |
| Full `node --test --test-isolation=none scripts/test-*.cjs` | **947/947 passed** |
| New CI checks within those totals | **9/9 passed** |
| Android export | Passed; generated `.hbc` Hermes bundle |
| `git diff --check` | Passed |
| Lint | Not run: package has an Expo lint script, but no ESLint installation/configuration. No dependency was installed. |

Logs: `output/ci-phase2-focused.txt`, `output/ci-phase2-all-tests.txt`, `output/ci-phase2-android.txt`, `output/ci-phase2-android-stderr.txt`.
Bundle: `output/ci-phase2-android/`.

SHA256 comparison with the pre-edit manifest (`output/ci-phase2-baseline.json`) found only the 13 existing production files and ten existing test files listed above changed within the captured `src`, `scripts`, and `assets` trees. Existing artwork assets and all other captured source files match their pre-task hashes. The new CI module/tests/report are additions. Existing unrelated uncommitted work is retained; no Commit, Push, Deploy, rollback or device-data operation was performed.

## Samsung review and limits

Automated label tests exercise widths360/393/412dp and fontScale1/1.5/2 with mocked native rendering. They check available-width bounds, wrapping configuration, font selection and preserved text. They do **not** prove native Yoga layout, actual glyph rasterization or no clipping on Samsung. Font weight realization and Thai mark placement still need visual review on the phone.

1. Reload the current Expo Go bundle without clearing data. Inspect Home/Create/Decorate: same Header positions, green conditional Save and red Back.
2. Open the five existing confirmation flows and Cancel each first. Check title/body/action visibility, nesting, safe/destructive hierarchy and unchanged actions.
3. Open Add/Edit, Account→Policy/Login and History. Check readable headings, labels, status/error text and buttons; Cancel without saving test edits.
4. Repeat with enlarged Android fonts. Where existing UI includes Thai/mixed text, inspect vowels/tone marks and line endings. Compact 10/15 labels and fixed Header slots are retained constraints, not newly guaranteed to fit arbitrary scaling.
5. Spot-check Card Detail, Share/Crop and QR/Barcode remain visually unchanged. Do not delete or migrate real data to perform this visual review.

Deferred: obsolete Empty Wallet copy correction; any compact-label redesign or structural accessibility layout work; broader native Alert migration; Card Detail visual changes; authoritative reconciliation of historical Design System geometry tokens. These are separate approval scopes.
