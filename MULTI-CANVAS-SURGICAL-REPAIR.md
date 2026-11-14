# Surgical Multi-Canvas repair

Historical repair record: Home Swipe and its diagnostics were subsequently removed. See `HOME-SWIPE-REMOVAL.md`. Approved selector, Decorate visual and draft-safety work remains.

Status: implementation and automated validation complete; Samsung validation pending.

## Scope and baseline

Read the approved repair request, both conversation audits, existing implementation reports, local mobile-design and ui-ux-pro-max skills, current SDK 58 documentation, RN Modal/PanResponder documentation, and installed RN implementation. No new illustration work was needed. Preserved prior uncommitted work; did not use Git HEAD as a restoration source.

Before editing, recorded working-tree status and SHA256 hashes under `output/multicanvas-repair-*`. The source inspected matched the audited failure points; no additional implementation changes were identified in those primary locations. The baseline JSON's Windows root-path encoding was normalized using its unchanged relative paths and original hashes before comparison.

## Home swipe correction

The old capture callback required `gestureState.x0 >= 24`. Installed React Native initializes x0 to zero and assigns the real coordinate only after responder grant. Consequently Home could never claim an ordinary swipe. React Native also resets dx/dy at grant, so merely removing the initial gate would leave a second displacement problem.

HomeCanvasPager now records native pageX/pageY in touch-start capture without claiming the touch. Capture still requires clear horizontal intent, a single touch and a start outside the 24dp system-edge region. Release measures total displacement from the original native touch coordinates rather than the reset gesture dx/dy. The 64dp minimum and 2.2x horizontal dominance remain. Vertical intent, termination, multitouch and live disabled/modal state prevent paging. Card taps are not claimed. No visible Home pagination or dependency was added.

A new regression loads the installed RN PanResponder and TouchHistoryMath implementations through existing Babel tooling. It exercises start, capture with x0=0, grant/reset, move and release, then verifies Free page 1 -> locked page 2 -> page 1 without storage writes. This is real JS responder lifecycle coverage, not physical Android touch arbitration coverage.

## Selector and Header

CanvasPageSelector now uses a local Pressable with a 48x48dp effective target and a separate centered 32dp visual circle, 1dp subtle gray border and neutral Pearl surface. It does not use the global GlassButton material. The popover, current number, labels/role/expanded state and entitlement-filtered destinations remain. Number text scales up to 1.5x within the compact visual circle.

Create and Decorate both continue to reuse this same component. HomeHeader itself did not require modification because its reserved target space is already 48dp.

Both Decorate branches now use a grouped bemem. + selector, with Decorate at the far right. The wordmark uses Create's 30sp size, 38sp line height, weight 800 and letter spacing -1.2. Decorate increases from 13sp to 16sp/24sp, weight 600. Header minimum/padding follow Create (70dp minimum, 14dp top, 8dp bottom, 20dp horizontal). The brand group does not shrink; a narrow layout can wrap the right-hand label rather than clipping or overlap. Header text has the same 1.25x maximum scaling strategy as Create. Native font measurement and appearance still require Samsung review.

The extra red Close Decorate button was removed entirely from the locked Header. It was not relocated or replaced. Android Back retains onRequestClose -> onClose, and the number selector can return to page 1. The normal editable toolbar still has its original red Cancel X, Undo, Redo and green Save check with unchanged geometry and handlers.

## Local Modal/system-bar correction

Kept React Native Modal, opaque presentation, existing onRequestClose and SafeAreaView in both branches. Added statusBarTranslucent and navigationBarTranslucent locally to both Decorate Modals. In installed RN, the latter selects its edge-to-edge dialog path; the existing opaque Pearl SafeArea surface can paint beneath system bars while insets reserve content space. No transparent/backdrop semantics, global StatusBar, theme tokens or native source were changed. Existing native dim-behind behavior was not patched.

This targets system-bar continuity; it does not establish that Samsung's scrim/color is fixed. The darker status bar existed in older screenshots and is not described as a confirmed Multi-Canvas regression. Physical Expo Go behavior, edge-to-edge compatibility, navigation-bar appearance and measured drag offsets remain pending device validation.

## Draft Discard scope

The previous Decorate page-switch Discard restored Saved, potentially deleting Create edits made before Decorate opened.

The repaired action calls the established session.cancel(), restoring the entry snapshot instead. Its confirmation explains the scope:

- Stay retains everything on the current page.
- Save persists the complete current draft through the existing writer/readback and navigates only after confirmed success.
- Discard removes only the work made since entering Decorate.
- If the restored entry is clean, Discard can navigate to the requested canvas.
- If the restored entry still contains earlier Create edits, Discard returns to Create on the original canvas with those edits intact. The dialog explicitly explains this before confirmation. The user must resolve that Create draft there before switching pages.

This deliberate exception avoids moving the earlier draft across pages, inventing a second writer, or silently discarding it. Existing Cancel semantics are unchanged. Save failure retains both earlier Create work and later Decorate edits. Owner page/session fences, revision checks, locked-page protections and per-page Undo/Redo remain unchanged.

## Files changed

Production:

- `src/components/bemem/HomeCanvasPager.tsx`
- `src/components/bemem/CanvasPageSelector.tsx`
- `src/components/bemem/DecorateMode.tsx`

Tests:

- `scripts/test-canvas-page-ui.cjs`

Documentation: this report. Local evidence/logs/bundle: `output/multicanvas-repair-*`.

Hash comparison confirms these four existing source/test files changed and zero artwork assets changed. Did not modify HomeHeader, RootLayout, Wallet schema/storage/coordinator/owner, grid, placement, form, crop, Share, encoders, journal storage, pagination helper, dependencies or the original website. Existing dirty-work status was preserved; no staged changes or commit was created.

## Validation

| Check | Result |
| --- | --- |
| TypeScript | Passed |
| Focused Multi-Canvas/UI/Decorate tests | 88/88 passed |
| Full automated regression | 889/889 passed, zero failures/skips |
| Android Hermes export | Passed, exit 0; local 3.9MB HBC |
| Lint | Not run: no configured ESLint tooling/config; none installed |
| Artwork preservation | Zero changed asset hashes |
| Samsung gestures/system bars | Not yet verified |

Five new tests cover installed RN lifecycle, selector visual/target separation, locked exit/Header/system-bar configuration, scoped Discard with/without an earlier Create draft, and Save failure preserving nested draft work. Existing tests continue to cover permissions, hidden page preservation, revision/readback, normal toolbar Cancel/Back, Undo/Redo and unrelated features. Component tests are not a pixel-layout or native gesture test.

Logs: `output/multicanvas-repair-focused.txt`, `output/multicanvas-repair-all-tests.txt`, `output/multicanvas-repair-android.txt`. Bundle: `output/multicanvas-repair-android/`. No build was published.

## Samsung workflow

1. Reload Expo Go without clearing data. Home: tap a card, scroll vertically/diagonally, then swipe right from the central area to locked 2 and left back to 1. Check search/detail block paging and system-edge Back still works.
2. Create: verify the subtle circle/number and touch target. Decorate: compare wordmark/title alignment and status/navigation-bar continuity at normal and enlarged fonts.
3. On locked Decorate 2, verify no Header X exists; return with page selector or Android Back. On editable 1, verify toolbar Cancel X still works.
4. Move a test card in Create, enter Decorate and add a temporary decoration. Try switching pages: Stay retains all; Discard returns to Create on the same page, keeps the earlier card move and removes the temporary decoration. Resolve the Create draft explicitly afterward. Test a clean-entry Decorate Discard separately: it may switch to locked 2.
5. If intentionally saving a test change, wait for confirmed return/readback, reopen and verify placement. Check drag/drop alignment near top/bottom safe areas and the unchanged fixed drawer/270 assets. Automated failure tests do not require corrupting or editing device files.

No Wallet reset/import, Expo Go clearing, dependency installation, commit, push or deployment was performed. Stop for Samsung review.
