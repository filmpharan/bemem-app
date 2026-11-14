# Unified eight-slot Header and Decorate action relocation

Popup update: the Header geometry remains current, but the separate page-menu Modal/anchor description below has been superseded by the same-window overlay in `CANVAS-PAGE-POPOVER-REPAIR.md`.

Status: implementation/automated validation complete; physical Samsung review pending. No subscription activation, phone-data reset, commit, push or deployment.

## Architecture and dimensions

`EightSlotHeader.tsx` is the one shared layout used by HomeHeader (Home/Create) and both Decorate branches. A 37.5% unified wordmark region represents columns 1–3; five subsequent 12.5% cells represent columns 4–8. There are no layout gaps or external horizontal paddings changing the column ratios, no visible grid, and no wrapping row. The wordmark has 12dp internal left padding and 4dp right breathing room within its own region.

The Header is 50dp high below the parent SafeArea, with 48dp-high targets vertically centered. Existing app content's 600dp maximum width is retained. Percent columns use the real SafeArea-constrained parent width. Native onLayout measures available width and selects 22sp branding below 320dp; normal representative widths use 24sp. Wordmark is Manrope weight800, lineHeight30, letterSpacing-0.8, exact bemem. text and shared subdued dot color. Branding is single-line, max text multiplier1.15, with native fit-to-region and minimumFontScale0.7 for constrained windows; global text scaling is unchanged. Existing actionable wordmark callbacks remain, while Decorate's noninteractive wordmark exposes the mode through accessibility.

Touch targets are width100% of their slot capped at48dp, height48dp. No hitSlop enlarges them over neighbors. Compact circular surfaces are32dp with a subtle1dp gray border, neutral Pearl background and no heavy rim/shadow. Search/Create icons remain frameless and reuse existing geometry.

| Usable Header width | Column width | Wordmark region | Single-column target | Header height |
| --- | --- | --- | --- | --- |
| 360dp | 45dp | 135dp | 45x48dp | 50dp |
| 393dp | 49.125dp | 147.375dp | 48x48dp | 50dp |
| 412dp | 51.5dp | 154.5dp | 48x48dp | 50dp |

These are calculated representative usable widths, not measurements of the user's Samsung. At360dp the width is deliberately below48dp to honor nonoverlapping equal slots. Below352dp, slot widths fall below44dp; below256dp a32dp circle cannot fit every column. Extremely narrow windows prioritize bounded controls over overlap, and may reduce branding/clip visuals. Native font fitting, accessibility and touch usability still need physical review.

## Slot mapping

| Slots | Home | Create | Editable Decorate |
| --- | --- | --- | --- |
| 1–3 | bemem. | bemem. | bemem. |
| 4 | Page number | Page number | Page number |
| 5 | Empty | Empty | Red Cancel X |
| 6 | Search / Close search | Back | Undo |
| 7 | Empty | Decorate | Redo |
| 8 | Account | Add Card | Green Save check / busy indicator |

No visible Decorate title or Cozy Cute row remains. The shared Header exposes the mode to accessibility. Locked Decorate renders only wordmark/selector and empty action slots; the unwanted Header X does not return. Android Back and selector navigation remain its exit paths.

## Home numeric navigation

The owner-selected page is again used for Home presentation. Selection is explicit through slot4; no swipe, dots, arrows or bottom navigation were restored. Page switching changes only owner/navigation state and presentation, not saved coordinates or Wallet records.

- Free: page1 contents; page2 neutral locked preview; menu returns to1. Unlock remains Membership / Coming Soon and never grants access.
- Active: existing selected count2–5 determines destinations. Higher pages stay hidden and stored.
- Expired: previously enabled pages readable; premium pages read-only. The next locked Home preview is offered when policy permits. Page-count preference is unchanged.

The central policy was not changed. CanvasPageSelector now accepts a Home/editor presentation context: Home includes all visible destinations; editors retain editorDestination filtering. Accessibility says Locked preview / Read-only on Home, and Locked for editing in editors. Saved/Draft admission, guards, search filtering and stale callback protections remain.

Home keeps direct native ScrollView/card Pressable rendering. Search, card detail, QR/Code128, Full View, Share and journal behavior remain under the existing readable/editable policy. Add operates through the existing owner on the current editable page.

## Floating page menu

The Header selector uses its column's nonoverlapping target; floating choices retain32dp circles and48dp targets with8dp gaps/padding. The currently selected number is excluded. Eligible choices are ordered as before.

Anchors are measured on layout and refreshed on press. The first choice is centered below the measured target where window boundaries permit; the transparent positioning wrapper is clamped inside8dp window margins. Width is calculated from the actual choice count (up to four choices for five pages), rather than always reserving a large panel. There is no rectangular painted background/border/shadow. Outside tap and Android Back dismiss it.

The selector's transparent menu Modal uses statusBarTranslucent/navigationBarTranslucent so its screen-coordinate anchor shares the same system-bar coverage convention as the existing Account popup. Root Decorate Modal and global StatusBar settings remain unchanged. Native placement in both windows still requires Samsung verification.

## Decorate relocation and drawer preservation

Moved the four command expressions from the drawer into slots5–8. The bottom command row and its unused styles were removed; only one command set exists. Neutral local Pressables replace the oversized GlassButton surfaces; global GlassButton was not changed.

Cancel still calls requestClose and the original entry-snapshot session cancellation, including dirty confirmation/Android Back and prior Create-draft protection. Undo/Redo still operate on the existing page-local session. Save still invokes session.save, retains synchronous duplicate-submit protection, exposes busy/disabled accessibility and a green spinner, and calls onSaved only after verified success. Failure/error handling and the writer are unchanged.

The existing bottom drawer remains the same View with its original styling, six collection controls, artwork/opacity,8x3 cells, pagination and drawer asset responders. No categories/assets were moved beneath the Header. Removing the old action row eliminates roughly52dp from drawer height, while the compact Header saves roughly20dp compared with the previous single-row Header: about72dp additional Canvas room under normal geometry. This is a calculation, not a Samsung measurement. No blank placeholder is retained.

Drag/drop still derives origins and grid units from measured native geometry. Logical coordinates, footprints, inset and artwork remain unchanged. Physical finger/drop alignment after the new layout must be checked on-device.

## Safe area and preserved state

Home/Create remain in the same Main Window. Decorate remains a native Modal with its approved statusBarTranslucent/navigationBarTranslucent props and SafeAreaView. No root Modal backdrop or global status configuration was changed. The50dp Header excludes the safe-area/status-bar inset.

The previous temporary Home-page-1-only behavior was intentionally superseded by numeric navigation. Returning from successful edits keeps the selected page, now visible through the Home number. Draft dialogs, Discard scope, locked-page data safety and page-local session lifecycle were preserved.

## Files

New:

- `src/components/bemem/EightSlotHeader.tsx`

Modified production:

- `src/components/bemem/HomeHeader.tsx`
- `src/components/bemem/HomeAccountMenu.tsx` — compact column-contained target; popup/actions unchanged
- `src/components/bemem/CanvasPageSelector.tsx`
- `src/components/bemem/DecorateMode.tsx`
- `src/hooks/use-wallet-canvas.ts` — use owner page for Home numeric navigation

Tests:

- `scripts/test-header-layout.cjs` — replaced obsolete70dp/wrapping assertions with actual shared8-slot geometry/mapping/handlers
- `scripts/test-canvas-page-ui.cjs` — Home selection/policy, compact target, popover bounds, retained draft semantics
- `scripts/test-decorate.cjs` — command discovery in Header slots and updated surface assertions; functional session tests retained
- `scripts/test-home-account.cjs` — shared-style dependency stub; existing popup/action assertions retained

Documentation: this report and a superseding note in `HOME-SWIPE-REMOVAL.md`. Existing uncommitted work was preserved. No app/package configuration or dependencies were modified. No artwork assets changed. WalletCanvas, grid/placement, storage/repository/coordinator/schema, encoders, forms, Share/crop, journal and the original website were not changed.

## Validation

| Check | Result |
| --- | --- |
| TypeScript | Passed |
| Focused Header/UI/Decorate/Account/Multi-Canvas | 108/108 passed |
| Full automated regression | 893/893 passed,0 failed/skipped |
| Android Hermes export | Passed, exit0; local3.9MB HBC |
| Lint | No configured ESLint tooling/config; not run and none installed |
| Existing asset hashes |0 changed |
| Samsung visual/touch/system-bar validation | Pending |

Evidence: `output/eight-slot-start-status.txt`, `output/eight-slot-baseline.json`, `output/eight-slot-focused-tests.txt`, `output/eight-slot-all-tests.txt`, `output/eight-slot-android.txt`; current local export `output/eight-slot-android/`.

Tests cover exact percentage spans,50dp height, representative/compact widths and bounded branding, nonoverlapping target calculations, slot assignments, disabled callbacks, Home Free locked2/return1, Active/Expired destinations, floating menu bounds, locked Decorate absence of actions, single relocated command set, original Cancel/Undo/Redo/Save/readback/drag behavior and all previous regressions. Native Yoga/font pixels, Pressability accuracy and performance are not established by mocked layout tests.

## Samsung workflow

Reload Expo Go without clearing data. Compare all three50dp Headers at normal/enlarged fonts. Home: check slots4/6/8, select locked2, Unlock/close, return1, then tap/scroll/search. Create: check Back/Decorate/Add in6/7/8 and Save/Discard/Stay. Decorate: verify one Cancel/Undo/Redo/Save set in5–8, no bottom command row, unchanged collections/grid at the bottom, and aligned drag/drop/rotate/delete. Check busy Save and readback using an intentional test change; locked Decorate has no extra X. Confirm status/navigation bars and floating menu placement. Use the existing isolated DEV fixture for Active/Expired scenarios; do not change real entitlement or reset/import Wallet.

Stop for user testing. No Commit/Push/Deploy.
