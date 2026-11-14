# Home header, Account popup and informational notices

Implemented locally, awaiting Samsung review.2026-11-11. No Commit/Push/Deploy, new dependencies, authentication/cloud/payment implementation, real-wallet IO, or Expo Go reset. Existing uncommitted work preserved.

## Existing behavior inspected

- `HomeHeader.tsx`: measured wordmark/label widths, async Manrope readiness and responsive wrapping prevent the earlier Samsung text-clipping regression. Existing Create header uses Back + Decorate.
- `src/app/index.tsx` + `useWalletCanvas()`: Home/Create are existing local modes within the Expo Router index route; there is no separate Create route to duplicate. Search query/open state and reflow are owned by this screen. Create initializes the existing owner's in-memory draft, preserving an already-dirty draft.
- `DecorateMode.tsx`: existing modal/session with protected Cancel/Back, Undo/Redo, fixed8x3 picker and verified single-writer Save. Successful Save invokes the existing `finishDecorate()` callback to return Home.
- `AddCardSheet.tsx`: established Pearl Gray bottom-sheet surface, safe areas, scroll/keyboard sizing, outside dismissal and native Android `onRequestClose`. Reused directly for informational Policy/Login; component implementation unchanged.

## Changes and navigation

**Home only:** wordmark and frameless48x48 Search are grouped on the left, gap4dp; default outline-person Account control48x48 with1dp circular border sits at the right. Existing wordmark font, metrics probes, full text and no-ellipsis behavior remain. Header wraps at unusually narrow/scaled widths rather than clipping. Create retains its Back/Decorate controls and appearance.

**Account:** component-local state controls exactly one overlay at a time. Compact popup is measured near the Account button, clamped within top/side/bottom safe insets. It contains only these four visible labels, in order, no header/subtitles:

1. Add Card
2. Decorate
3. Policy
4. Login

Each row has at least48dp touch height and an accessibility name. Outside tap and native Back close the popup. Synchronous ref guards reject repeated/stale item callbacks. State changes are inside Account, so opening notices does not schedule a Home screen/canvas state update. No frame-rate/performance benchmark is claimed. Account opening dismisses the keyboard without clearing the existing Search query.

- **Add Card:** closes popup → existing `openCreate()` → existing Create mode, **not** an Add form. No new route or writer.
- **Decorate:** closes popup → checks the live runtime for active/unlocked v2, non-saving state and an existing session → existing `wallet.enter()` when coming from Home → mounts the existing Decorate editor immediately. No intermediate user tap. No alternative editor, state owner or repository. Existing dirty draft initialization remains the hook's responsibility.
- **Decorate Cancel/Back:** retains the established return to Create and unsaved-change protections. Successful verified Decorate Save returns Home through the existing callback. Merely selecting a menu action never saves.
- **Policy:** replaces popup with existing bottom-sheet component, title Policy, exact requested three sections/body copy, Close footer and existing header X. No acceptance checkbox, agreement button or persisted consent flag. Outside tap/native Back/Close return to Home. Informational copy only, not a complete legal policy.
- **Login:** existing sheet pattern titled Coming Soon, body “Login and cloud backup are not available yet.”, Back to Home footer; outside/header/native Back also dismiss. No login fields/account/avatars/storage state added.

Menu popup and notices do not change the underlying Search query, Saved/Draft or canvas. Existing Add/Create/Decorate navigation clears Search using the existing screen behavior.

## Files changed in this workstream

- `src/components/bemem/HomeHeader.tsx`: Home-specific layout/Search and Account wiring; Create branch retained.
- **New** `src/components/bemem/HomeAccountMenu.tsx`: circular person control, local popup state and informational Policy/Login rendered with existing sheet/button components. No storage imports.
- `src/app/index.tsx`: share the existing Decorate opening path with Home Account; live runtime admission checks; pass callback to Header.
- `scripts/test-header-layout.cjs`: retain Create typography/clipping coverage; update Home tests for wordmark + frameless Search + Account and font-readiness measurements.
- **New** `scripts/test-home-account.cjs`: actual UI modules with hook/native mocks; menu actions/dismissal/repeated callbacks, exact policy copy, Login notice, safe-area placement, disabled state, existing Create/direct Decorate flow and Search query/reflow wiring.
- This report and generated logs/bundle under `output/`.

No changes in this workstream to Wallet runtime/storage/repository/coordinator/schema/backup/migration, hooks, Canvas/Grid/search engine, decoration assets or registries, Decorate editor, Card Detail, encoders, Sharing, Journal/History, original website, dependency/config/skill files.

## Checks

- TypeScript: PASS (`tsc --noEmit`).
- Full automated suite: **732/732 PASS**,0 failures/skips; synthetic/mock data only. Log `output/home-account-tests.txt`.
- Android Hermes bundle: PASS,1809 modules,299 bundled assets,3.8MB HBC; `output/home-account-android/`, log `output/home-account-android-build.txt`. Sandbox initially blocked child-process launch with `spawn EPERM`; running the installed compiler outside that restriction succeeded without software installation/deployment.
- ESLint: no existing config; not run or installed. This is not a lint-pass claim.
- Existing artwork tests still verify all270 runtime images/IDs and original240 hashes.

Checked installed Expo58 / React Native0.88 types and official [Safe Area SDK58](https://docs.expo.dev/versions/v58.0.0/sdk/safe-area-context/) / [React Native Modal](https://reactnative.dev/docs/modal) behavior. Applied project mobile-design and ui-ux-pro-max; local skill search for icon-only popup/touch-target guidance. No website source modification or production-data operations.

## Samsung workflow and limitations

Run `npx.cmd expo start`, open the existing project in Expo Go. If an old bundle appears, restart Metro with `--clear` only; do not clear Expo Go data.

1. On Home inspect the full “bemem.” wordmark, adjacent frameless Search and right Account at normal/enlarged font settings. Open Search, enter a name, close/reopen and verify existing reflow/restored positions.
2. Open Account: exactly4 labels, no subtitles. Test outside tap, Android Back and rapid taps. Check popup anchoring with Search open, portrait/landscape and any split-screen size used.
3. Add Card must open existing Create without automatically opening a form. Back should preserve existing Save/Discard/Cancel rules.
4. From Home choose Decorate: existing editor opens directly with270 artwork entries and unchanged fixed drawer. Test Cancel back to Create first; Save only changes you want to retain and verify Home appears after readback.
5. Policy: verify all3 supplied sections, scrolling with enlarged fonts, Close/X/outside/native Back. Login: Coming Soon + Back to Home, no sign-in form. Confirm underlying card positions and query remain unchanged after notices.
6. Smoke-test existing card tap/detail/QR/barcode, Share and Photo Journal.

Native popup anchoring, TalkBack focus, OS Back delivery, modal transitions and real-device touch/performance remain **Not Verified** until Samsung testing. Very small widths may wrap Account below the wordmark/Search group to keep all text intact. Short/large-font popup content can scroll; informational sheets reuse existing scroll behavior. No real purchase, cloud backup or login service exists.

Stop and wait for Samsung review.
