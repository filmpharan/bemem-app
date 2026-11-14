# Canvas page popup spacing and native-window position repair

Status: implementation and automated checks complete; Samsung visual validation pending. Eight-slot Header,50dp height, branding, root Decorate Modal/system-bar settings and existing page permissions are preserved.

## Findings and root-cause limits

The previous selector measured its anchor with measureInWindow and used those coordinates directly in a newly created native Modal. It assumed that the anchor's current-window origin and the popup window's origin were interchangeable. Decorate adds another native window to this path. No explicit coordinate conversion established that assumption. The code also opened immediately with a fallback/cached anchor while asynchronous measurement could still be pending.

These are confirmed code-level defects in coordinate ownership and presentation readiness. They can explain inconsistent Home/Create versus Decorate offsets. The exact offset/composition on the user's Samsung has not been measured, so this report does not claim a proven per-device inset or pixel correction.

The old configured formula itself was not simply a16dp-center-gap mistake: with a48dp anchor it theoretically produced a60dp center distance after wrapper padding, or28dp visible separation. Therefore the reported visual touching cannot honestly be attributed solely to insufficient configured spacing. Cross-window/cached positioning could invalidate the visible result. No arbitrary Samsung compensation was added.

## One spacing contract

| Geometry | Normal value |
| --- | --- |
| Current and choice visible circles |32dp |
| Current target | Existing Header target,48dp high and column-constrained width |
| Choice target |48x48dp |
| Current target bottom -> first choice target top |4dp |
| Centers,48dp anchor and48dp choice |52dp |
| Visible circle edge gap |20dp, minimum16dp enforced |
| Horizontal choice-target gap |8dp |
| Wrapped-row choice-target gap |4dp |
| Host horizontal/bottom edge margin |8dp inside existing SafeArea |

The group has no painted rectangle, border, shadow or vertical padding added to this spacing. For a measured48dp-high anchor:

```text
localAnchorY = anchorWindowY - hostWindowY
firstChoiceTargetTop = localAnchorY + anchorHeight + 4
firstChoiceCircleTop = firstChoiceTargetTop + 8
currentCircleBottom = localAnchorY + 24 + 16
visibleGap = 20
```

If native measured anchor height is different, the gap calculation preserves the16dp visible minimum and nonoverlapping targets. No Safe Area/Status Bar height is added manually.

## Same-window overlay hosts

`CanvasPagePopoverHost` is a small selector-specific UI host, not a new navigation or Wallet system. Main Home/Create has a host inside its existing SafeAreaView. Editable and Locked Decorate each have a host inside the existing native Modal/SafeAreaView. The existing DEV multi-canvas utility has the same host so its selector still works.

The nearest context host always shares the anchor's native window. Both native View frames are measured with measureInWindow; the anchor is converted to host-local coordinates by subtraction exactly once. Inset/window-origin differences cancel within that window. There is no additional popup native Modal, no status-bar compensation and no change to Decorate's own translucency or global StatusBar.

Native measurement callbacks must return valid positive frames and a fitting placement before the popup is shown. Zero/unavailable/off-host frames do not use a fallback position. Pending requests are fenced by a sequence token; stale callbacks cannot reopen an obsolete menu. If measurement is not ready, the user can tap again after layout settles. Host layout changes dismiss the popup rather than repositioning a visible menu unpredictably.

## Multiple choices and interactions

The existing policy/filtering and English accessibility labels remain. The current page is excluded. Up to four alternative choices are arranged horizontally when they fit, wrapping to additional rows only for constrained widths. The first choice is centered under the selector where horizontal bounds permit. The group is clamped within the measured SafeArea host; choices remain below the Header target bounds. Visual overlap with canvas below is intentional, with no overlap over other Header actions.

Outside tap dismisses the overlay without triggering a page change. A choice consumes the request synchronously before navigation, preventing duplicate transitions from rapid/stale taps. Latest props are rechecked for disabled/page/destination changes. Selecting still invokes the existing onSelect callbacks, including Create/Decorate Save/Discard/Stay.

Android Back closes a page popup first. With no popup, Home's existing Back handler and Decorate's original exit/dirty confirmation continue. Modal onRequestClose must delegate to its local host first because native Modal Back does not rely on ordinary Main-window BackHandler delivery. Underlay accessibility descendants are temporarily hidden while the menu is visible and restored on dismissal; native TalkBack behavior remains a device-review item.

## Files

New:

- `src/lib/page-popover-geometry.ts` — pure shared geometry and explicit spacing constants
- `src/components/bemem/CanvasPagePopoverHost.tsx` — same-window overlay, measured placement and request/Back handling
- `scripts/test-page-popover.cjs` — geometry plus actual Host/Selector tests with native measurement mocks

Modified:

- `src/components/bemem/CanvasPageSelector.tsx` — keeps current circle/target visuals; requests local host instead of opening another Modal
- `src/app/index.tsx` — host wrapper and popup-first Back delegation
- `src/components/bemem/DecorateMode.tsx` — hosts in existing editable/locked Modal windows and popup-first onRequestClose
- `src/app/dev-multicanvas.tsx` — same host around existing DEV utility
- `scripts/test-canvas-page-ui.cjs` — request-based selector assertions, policies and production Modal Back delegation
- `scripts/test-decorate.cjs` — local-host dependency stub; existing drawer/session assertions retained

Documentation: this report plus a superseding popup note in the eight-slot report.

## Preserved

Hash comparison confirms EightSlotHeader, HomeHeader, WalletCanvas, root layout/StatusBar, decorate-session, wallet owner/repository and decoration pagination are unchanged. Existing assets have zero changed hashes. No Header slot mappings,50dp height, wordmark typography, action targets, decoration commands, drawer styles,270 artworks, page policy, schema, storage, encoders, Share/crop or original-website changes. Existing uncommitted work is retained. No dependencies were installed; no Wallet reset/import or device-data write was performed.

## Validation

| Check | Result |
| --- | --- |
| TypeScript | Passed |
| Focused geometry/Header/Selector/Decorate/Account/Multi-Canvas |117/117 passed |
| Full automated regression |902/902 passed,0 failed/skipped |
| Android Hermes export | Passed, exit0; local3.9MB HBC |
| Lint | No configured ESLint tooling/config; not run, none installed |
| Samsung pixels/native interaction | Pending |

New geometry tests vary common-window origins, including top offsets24/87/120 and horizontal origins, and verify identical local separation without an inset addition. Bounds tests use360/393/412dp and1–4 choices, with a wrapped narrow case. Actual Host/Selector tests cover asynchronous measurement, unavailable anchors, stale requests, rapid double selection, outside dismissal, accessibility restoration and Back ordering. Existing regressions cover policies, dirty drafts and decoration behavior. These are mocked native-frame/interaction tests, not physical Samsung visual verification.

Evidence: `output/page-popup-baseline.json`, `output/page-popup-geometry-tests.txt`, `output/page-popup-focused-tests.txt`, `output/page-popup-all-tests.txt`, `output/page-popup-android.txt`. Local export: `output/page-popup-android/`.

## Limitations and Samsung checklist

The exact original native offset remains unmeasured; the repair removes the cross-window assumption instead of asserting a device-specific cause. TalkBack focus, measured frame availability and physical anchor spacing must be checked on Samsung. If an extremely short/narrow SafeArea cannot fit the menu below the selector, presentation is deferred rather than overlapping controls or showing a wrong fallback.

Reload Expo Go without clearing data. In Home, Create and Decorate, open the page selector and compare the first-circle distance (expected20dp visible gap) and absence of a rectangular panel. Try outside tap, Back, rapid double selection, and return to page1. In Create/Decorate test dirty Save/Discard/Stay; Back while the popup is open should dismiss only the popup first. Check unchanged Decorate Status Bar, toolbar, drawer and drag/drop. Use the isolated DEV fixture for multi-choice Active/Expired cases. No Home Swipe, data reset, Commit/Push/Deploy. Stop for user review.
