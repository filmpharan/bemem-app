# Home Swipe removal — current implementation

Update: the temporary Home-page-1-only presentation in this record has been superseded by the approved numeric navigation in `EIGHT-SLOT-HEADER-IMPLEMENTATION.md`. Home Swipe and diagnostics remain permanently removed.

Status: removal and automated validation complete. Await Samsung review. Horizontal Home paging is permanently canceled; no replacement Home navigation was added.

## Removed code

Deleted:

- `src/components/bemem/HomeCanvasPager.tsx` — wrapper, horizontal PanResponder, touch origin, direction lock, capture/release/termination and selection callbacks
- `src/components/bemem/HomeGestureDiagnostics.tsx` — temporary viewer, navigation/copy report controls
- `src/lib/home-gesture-trace.ts` — recorder, bounded memory buffer, whitelist, throttling, summary classification and enable/disable state

Removed `homeSwipeDirection` and its thresholds from `canvas-pages.ts`. Removed Home pager imports/mounting and all instrumentation from HomeScreen. Removed trace props and scroll-observer hooks from WalletCanvas. Removed the diagnostics and pager from `/dev-multicanvas`, replacing the fixture wrapper with an ordinary flex View. The DEV entitlement fixture, page selector and count controls remain.

Removed Home-only wordmark accessibility page actions and the obsolete Home logo/Back page-return fallback. This changes no visible Header style and does not modify the Create branch's approved controls. There is no hidden alternate Home paging gesture or new numeric Home control.

Removed eight UI swipe/trace tests, their installed-PanResponder/Babel test helper and diagnostic-only route/mode mocks; removed one swipe-only policy-helper test. Removed observer import stubs from form/account harnesses. Added four focused tests for direct Home rendering/tap, native vertical-scroll props, page-1 presentation with retained editor draft, and absence of retired modules/source references. Existing multi-page/editor/permission tests remain.

## Current Home behavior and editor context

HomeScreen directly mounts WalletCanvas, whose Home cards remain ordinary Pressables inside its native vertical ScrollView. No horizontal responder wraps the canvas. Card tap invokes the existing detail-opening callback directly; no new delay or timer was introduced.

`useWalletCanvas` now selects page 1 for Home presentation. Create continues to use the runtime owner's selected page. This is a memory-only rendering distinction: returning Home after Save, Discard, normal exit or Decorate completion displays page 1 without resetting the owner, reassigning entities, rewriting another page, or silently dropping a draft. Re-entering the editor retains its owner page and any protected existing draft. Existing dirty exit dialogs remain.

Search retains its existing readable-page aggregation and temporary reflow. Opening a result still preserves its source-page context; closing detail returns to the temporary Home page-1 presentation. Search behavior was not replaced with a new page-navigation UI.

Per-mode/page scroll-offset memory remains because it is shared with Create page selection and Search restoration. Likewise `focusCard`, page access, page assignments, selectors, locked surfaces, placement and mutation guards remain for active Multi-Canvas functionality.

## Modified files

Source:

- `src/app/index.tsx`
- `src/app/dev-multicanvas.tsx`
- `src/components/bemem/HomeHeader.tsx` — remove Home-only hidden accessibility navigation; approved visible styles/Create controls unchanged
- `src/components/bemem/WalletCanvas.tsx` — remove diagnostics only
- `src/hooks/use-wallet-canvas.ts` — temporary page-1 Home presentation
- `src/lib/canvas-pages.ts` — remove swipe-only helper only

Tests:

- `scripts/test-canvas-page-ui.cjs`
- `scripts/test-multicanvas.cjs`
- `scripts/test-home-account.cjs`
- `scripts/test-card-form.cjs`

The three earlier Multi-Canvas implementation/repair/diagnostics reports were marked historical/superseded, preserving their original records. This report describes current behavior. Old validation logs/ignored export artifacts are historical evidence, not source or current runtime entrypoints.

## Preserved

All five logical Wallet pages, Legacy page-1 fallback, card/decor IDs and assignments, positions, rotations, images, page-local collision/placement, Free/Active/Expired rules, count preference, hidden-page retention, read-only protections and single writer/revision/readback remain.

Create/Decorate numeric selectors retain 32dp circles, 48dp targets and floating choices with no rectangular surface. DecorateMode, its Status Bar props, toolbar X/Undo/Redo/Save, locked Header without extra X, drawer, 270 assets and draft-session implementation were not changed.

Remaining PanResponder/gesture code is legitimate shared functionality: held card dragging in Create/Decorate, drawer asset dragging, Card Detail QR/Code128 switching, and image adjustment/crop gestures. These were not removed or replaced.

No schema, migration, repository, coordinator, storage, membership forms, Share, code encoders, Full View, Photo Journal, crop, camera/scanner, EXP picker, dependencies or original-website changes. No phone data was accessed, reset, imported or deleted. Local source-file deletions are not card or media deletions.

## Verification

| Check | Result |
| --- | --- |
| TypeScript | Passed |
| Focused UI/Multi-Canvas/Account/Decorate tests | 101/101 passed |
| Full automated regression | 891/891 passed, zero failures/skips |
| Android Hermes export | Passed, exit 0; local 3.9MB HBC |
| Lint | No configured ESLint tooling/config; not run, none installed |
| Retired identifiers in application source | None |
| Retired identifiers in tests | Negative assertions proving deletion/absence only |
| Existing artwork hashes | Unchanged |
| Physical Samsung performance/interaction | Pending user verification |

The previous suite had 896 tests. Nine retired feature tests were removed and four removal-regression tests added, resulting in 891 tests; no unrelated assertions were disabled.

Evidence: `output/home-swipe-removal-start-status.txt`, `output/home-swipe-removal-baseline.json`, `output/home-swipe-removal-focused.txt`, `output/home-swipe-removal-all-tests.txt`, `output/home-swipe-removal-android.txt`. Current local export: `output/home-swipe-removal-android/`.

## Samsung workflow

Reload Expo Go without clearing data. Confirm Home shows the original page-1 cards/decorations; tap a card to open/close Detail and scroll vertically. Horizontal swipes must not change pages. Verify Search, then Create/Decorate selectors, floating choices, locked page and Back, Save/Discard/Stay, and unchanged toolbar/drawer. Returning Home must show page 1. In DEV simulation, confirm all Free/Active/Expired/count controls remain and the Real Home gesture diagnostics section is gone. Verify other pages' data through existing editor/DEV facilities; do not reset or reimport Wallet to test.

No Commit, Push or Deploy. Stop here; the next Home header/navigation design requires a separate user-led instruction.
