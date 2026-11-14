# Decorate circular controls — implementation report

2026-11-12. Focused production refinement, awaiting Samsung visual/touch review.

## Design and scope

Reading this as a personal wallet decoration tool for one-handed Samsung use, retaining Pearl Gray — Lagoon Glass and the approved rounded-outline icon family. Design variance 1/10, motion intensity 1/10, visual density unchanged. No new animation or native API was introduced.

Applied the installed mobile-design guidance on accessibility/touch targets and ui-ux-pro-max icon-label guidance. Read bemem-illustrator's scope and artwork-preservation rules; no illustration generation/export was needed or performed. Existing 270 assets remain unchanged.

## Changes

- Header keeps only `Decorate`; removed `Cozy Cute` and subtitle-only spacing. Existing title typography, header height, Canvas, and SafeArea remain.
- One toolbar, in order: Cancel / Undo / Redo / Save. All four neutral GlassButton circles are 48×48dp with 24dp radius, 12dp gaps, restrained 1dp gray outlines, and no external shadow. All icons are 22dp. No visible action labels or captions.
- Cancel uses existing Close in theme error red `#b42318`; Undo/Redo use Soft Charcoal `#263943`; Save uses Check in `#26734d` green. Undo/Redo/Check reuse geometry from the existing bemem Signature SVG sources through the established Android-safe icon renderer. No icon library or design exploration added.
- Disabled controls have reduced opacity. Save exposes busy/disabled state through existing GlassButton, with a green progress indicator while saving. Accessible labels stay `Cancel`, `Undo`, `Redo`, `Save`; Undo/Redo retain descriptive hints.
- Previous/Next paint a circle of up to 28dp inside the existing full-cell Pressable, light-gray `#d5dce0` 1dp outline, neutral surface, no shadow, and centered existing arrows. Accessible labels are `Previous page` and `Next page`. No expanded hitSlop overlaps neighboring draggable assets.
- Existing pagination helper, 8×3 structure, cell positions, collection order/opacity, drag guards, and fixed drawer remain. Toolbar and drawer height are not increased.

## Behavior preserved

Original Cancel/requestClose, Undo, Redo, session.save, and successful onSaved handlers remain. Dirty confirmation, Android Back, single-writer revision/readback, saving lock, and error handling are unchanged. No new storage path, transaction, or navigation mechanism was introduced. Double Save remains rejected by the existing session even if a stale callback is invoked.

The second supplied screenshot was used only as the circular-close surface reference. Add/Edit UI, scanner, date picker, Detail, code renderers, Full View, Home, and History were not modified.

## Files changed

Production:

- `src/components/bemem/DecorateMode.tsx`
- `src/components/bemem/AddCardIcon.tsx`

Tests:

- `scripts/test-decorate.cjs`
- `scripts/test-functional-icons.cjs`

Prior uncommitted changes were retained. Before/after hashes for existing `src`, `assets`, and `scripts` identify only these four changes. Evidence: `output/decorate-controls-baseline.json` and `output/decorate-controls-scope.json`. No original-website changes, dependencies, commits, push, deployment, on-device Wallet writes, migration, or reset.

## Validation

| Check | Result |
| --- | --- |
| TypeScript (`npx.cmd tsc --noEmit`) | Passed |
| Focused Decorate/pagination/icon tests | 55/55 passed |
| Full regression suite | 793/793 passed, zero failures or skipped tests |
| Android Hermes export | Passed; local 3.8MB HBC |
| Lint | Not run; no existing ESLint configuration/tooling, none installed |
| Physical Samsung appearance, TalkBack, touch accuracy | Not verified |

Seven new tests cover icon-source parity, clean header/equal geometry at narrow widths and enlarged text, Undo/Redo branching, clean/dirty Cancel, busy and duplicate Save, Save failure, and nonoverlapping circular pagination cells. Existing mock-based regression covers movement, rotation, deletion, drag, Android Back, persistence/readback, Search, Detail/Full View, and History.

Logs: `output/decorate-controls-focused-tests.txt`, `output/decorate-controls-all-tests.txt`, `output/decorate-controls-android-build.txt`.

Hermes: `output/decorate-controls-android/_expo/static/js/android/entry-64c8af39aabb96232fbc148b2c24ec41.hbc`.

Initial sandboxed export could not spawn Hermes (`EPERM`); rerunning the same local validation with process permission succeeded. No build was published.

## Limitations and Samsung workflow

The toolbar meets 48dp touch targets. Pagination deliberately retains the existing cell dimensions: on narrow phones those full-cell hit areas are below 48dp. Increasing them to 48dp would require changing the approved eight-column geometry or overlapping adjacent assets; neither was done. Physical touch accuracy still needs review. Hit areas are constrained to their cells, following React Native Pressable guidance: https://reactnative.dev/docs/pressable . SDK reference checked: https://docs.expo.dev/versions/v58.0.0/ .

Reload the latest project bundle in Expo Go without clearing data. Open Create → Decorate. Check title-only header and four equal circles at normal/enlarged text. Add/move/rotate a trial decoration; verify Undo/Redo, a new action clears Redo, and Cancel/Android Back retain the discard prompt. Visit first/middle/last artwork pages; ensure small Previous/Next circles remain easy to tap without selecting nearby assets. Save and wait for verified return Home; reopen Decorate and check saved placement. Recheck Detail/Full View and Photo Journal normally. Do not reset or reimport the Wallet for testing.
