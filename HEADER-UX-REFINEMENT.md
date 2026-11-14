# Header UX refinement — square Canvas selector and relocated Save

Implemented on the current working tree, 2026-11-13. Earlier implementation reports describe historical layouts; this report describes the new mapping. No restore from HEAD or commit was performed.

## Shared geometry and final mapping

The existing `EightSlotHeader.tsx` is unchanged: 50dp below the existing Safe Area, one horizontal row, eight equal logical slots, wordmark spanning slots 1–3. The approximately 24sp wordmark and 22sp narrow-width fallback are unchanged.

| Slot | Home | Create | Decorate |
| --- | --- | --- | --- |
| 1–3 | bemem. | bemem. | bemem. |
| 4 | Empty | Red Back chevron | Red Back chevron |
| 5 | Empty | Empty | Undo |
| 6 | Search | Green Save check only for uncommitted draft changes | Redo |
| 7 | Existing Account menu | Add Card | Green Save check |
| 8 | Canvas selector | Canvas selector | Canvas selector |

Create and Decorate action icons are frameless. Existing Account menu contents, Policy bottom sheet and Login Coming Soon are unchanged.

## Canvas-page icon and popup

- `CanvasPageGlyph.tsx` supplies the same native component for the current selector and every popup choice: 28×28dp rounded-square outline, 5dp radius, 1.8dp Soft Charcoal outline, centered 14sp bold number. The flat Pearl Gray background keeps overlaid choices legible without a glass surface, shadow or surrounding panel.
- Number text retains bounded scaling (maximum 1.3); no global font-scaling setting changed. Native Samsung text rendering remains a device check.
- Popup choices are naturally ordered, omit the current page and form one vertical column, never a horizontal row or wrapping grid.
- Each popup target is 48×48dp, separated by 4dp. Centers are 52dp apart; square visual edges have 24dp vertical clearance. Four choices occupy 48×204dp.
- Position remains anchor-relative, subtracting host coordinates measured in the same native window. No Status Bar/Safe Area offset is added again. The first target begins 4dp below the selector's measured target bottom.
- The column tracks slot 8's center and clamps inside an 8dp host-edge margin. At the right edge this can shift it slightly left to retain the entire 48dp target. The host is already inside the existing Safe Area.
- Same-window Main/Decorate hosts, measurement-before-opening, stale-request invalidation, outside dismissal, Back dismissal and synchronous double-tap consumption are retained.
- If the host cannot fit the whole column safely, it declines presentation rather than clipping or using an unmeasured fallback anchor. Very short split-window layouts remain a limitation.
- With zero eligible alternatives, the current square icon remains visible, with disabled semantics and no popup.

The header retains the approved non-overlapping target strategy: `min(48dp, availableWidth / 8)` wide and 48dp high. At 360dp this is **45×48dp**, not a full 48dp square. At 393dp and 412dp it is 48×48dp. This is the existing eight-slot tradeoff; no overlapping hitSlop or additional row was introduced.

## Create Save and Back

- The root passes the existing owner-backed `wallet.dirty` state to the header; a render itself never marks data dirty.
- Slot 6 is empty when clean. Add/move or any other existing uncommitted wallet draft enables the same canvas-level Save action there.
- Save calls the existing `wallet.save()` pipeline, preserving single writer, revision admission, commit/readback and success navigation. The icon becomes a busy indicator while saving. Runtime-blocked states disable it.
- Success clears dirty state and returns Home through the existing success flow. Failure retains the draft and existing error feedback; no automatic retry was added.
- `CanvasActions` now returns `null` in Create: no floating Save, empty rail, reserved bottom space or invisible hit blocker. Its Home-empty FAB remains unchanged. The obsolete bottom Save callback/props/styles were removed.
- Header Back still uses the same root Back handler as Android Back. Clean exit is immediate; dirty Create retains its Save/Discard/Stay dialog, without automatic Save or Discard.
- Add/Edit form controls and their independent form save behavior were not changed.

## Decorate entry and exit

The only production entry is Home → Account → Decorate. Create's icon was removed and its old primary-action path can no longer open Decorate. No production floating gear or additional entry was found. The isolated DEV simulator remains unchanged.

Home Account prepares the existing editor draft, applies the existing page entitlement checks and opens the same Decorate modal. An editable Home page maps to its corresponding editor page; locked/read-only Home pages route to editable page 1.

Decorate's red Back replaces the Cancel X, calling the existing cancellation/dirty-confirmation handler. Android modal Back first dismisses an open page popup, then uses the same safe cancellation behavior. Cancel restores the session entry draft; verified Save uses its existing success callback. Both exits now return Home.

Home's selected page is retained independently for **all** editor entries, including after switching pages inside Create/Decorate. Restoring Home selection never overwrites a draft. If a retained draft belongs to another page, re-entry asks Save/Discard/Stay when that page remains editable; an unauthorized page never offers Save. Changes in entitlement retain the previous safe-exit and draft protections.

The Decorate drawer, six categories, 270 artwork assets, pagination, placement, rotation and history logic were not changed. Its old bottom action toolbar was not restored.

## Entitlements and persistence

`canvasAccess`, owner admission, transaction logic and schema were not changed in this task.

| Entitlement | Home destinations | Editor destinations |
| --- | --- | --- |
| Free | 1 plus locked preview 2 | 1 only |
| Active, selected count N | Existing readable range 1–N | 1–N only |
| Expired, retained count N | Readable 1–N plus next locked preview if applicable | 1 only |

Hidden data does not grant permission. Premium records, selected count and assignments remain intact. No test accessed or changed a Samsung wallet.

## Changed files

Production:

- `src/components/bemem/CanvasPageGlyph.tsx` — new shared visual component.
- `src/components/bemem/CanvasPageSelector.tsx`
- `src/components/bemem/CanvasPagePopoverHost.tsx`
- `src/lib/page-popover-geometry.ts`
- `src/components/bemem/HomeHeader.tsx`
- `src/components/bemem/DecorateMode.tsx`
- `src/components/bemem/CanvasActions.tsx`
- `src/app/index.tsx`
- `src/hooks/use-wallet-canvas.ts`

Tests:

- `scripts/test-header-layout.cjs`
- `scripts/test-canvas-page-ui.cjs`
- `scripts/test-page-popover.cjs`
- `scripts/test-home-account.cjs`
- `scripts/test-decorate.cjs`
- `scripts/test-production-integration.cjs`

This report and `output/header-refinement-*` contain local documentation/validation artifacts.

## Skills and verification

Used the installed `mobile-design` and `ui-ux-pro-max` skills for mobile navigation, targets, accessible icon labels, layout and consistency. Design variance 2/10, motion 1/10, density 4/10; no additional animation. No illustration asset or icon package was needed.

- TypeScript: passed.
- Focused tests, including production activation/Add/Save/readback/restart simulations: **219/219 passed**.
- Full regression suite: **920/920 passed**.
- Android Hermes export: passed, exit 0, approximately 3.9MB `.hbc` bundle generated locally.
- Lint: not run because ESLint/configuration is not installed/configured. The package's lint script alone does not establish a configured linter; nothing was installed.
- Whitespace diff check: passed.

Test evidence is in `output/header-refinement-focused.txt`, `output/header-refinement-all-tests.txt` and `output/header-refinement-android.txt`. Pre-edit hashes in `output/header-refinement-baseline.json` preserve the safety inventory. The shared header geometry, artwork, DEV simulator, Wallet storage/model and other approved components remain unchanged from those hashes.

## Samsung verification still required

1. Reload the current Expo Go bundle without clearing data. Check Home Search6, Account7, square selector8, normal and enlarged text, and both popups near the right edge.
2. Enter Create via Account → Add Card. Confirm Back4, blank5, clean blank6, Add7 and selector8; there must be no Decorate shortcut or bottom Save rail.
3. Move/add a test card. Check the green Save6 appears, busy state blocks repeat submission, verified save clears it, and Home returns to its independently selected page. Test dirty Back → Stay/Discard/Save and hardware Back.
4. Open Decorate only via Home Account. Verify Back4, Undo5, Redo6, Save7, selector8, unchanged drawer, dirty-exit confirmation and Home return after Cancel or Save.
5. Use the existing memory-only `/dev-multicanvas` simulator for Active counts 2/3/5 and Expired/Free policy checks. Do not change device Wallet data to simulate entitlement.
6. Where multiple pages are actually authorized, check vertical choices, current-page exclusion, outside tap, Back, rapid selection and Modal offsets. Free/Expired editors must never open an empty or forbidden-page popup.

Samsung appearance, actual native hit testing, TalkBack focus and enlarged-font rendering have not been verified in this session. No data reset, dependency installation, original website modification, Commit, Push or Deploy was performed.
