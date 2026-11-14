# Phase A — floating page choices and DEV Home gesture evidence

Historical investigation record: the tracing system and Home Swipe have been removed. These diagnostic instructions are obsolete. See `HOME-SWIPE-REMOVAL.md`. Floating page choices remain in Create/Decorate.

Status: implemented and automated validation complete. Home swipe is NOT claimed fixed. Await physical Samsung trace before choosing any repair.

## Popover-only visual correction

Removed backgroundColor, borderWidth, borderColor and borderRadius from CanvasPageSelector's local popover wrapper. No replacement shadow/material was added. Kept the invisible positioning wrapper, anchor measurement and clamp, maxWidth, gap and padding, so this does not redesign the arrangement. Existing 32dp visible circles, 48x48dp Pressables, current Header selector, choice order, entitlement filtering, transparent Modal and outside-dismiss Pressable remain. Create and Decorate reuse the same component. No global GlassButton changes.

Tests check the absence of painted outer surface, preserved dimensions and filtering, page selection and outside-dismiss. Native placement/clipping still requires Samsung review; structural tests do not validate physical pixels.

## Diagnostic integration points

- `src/lib/home-gesture-trace.ts`: one controlled JS-session-local DEV trace, disabled by default. Explicit enable clears and starts a session. Disable clears and stops. Nothing is persisted, logged to Console, uploaded or transmitted.
- `src/components/bemem/HomeCanvasPager.tsx`: observations inside the existing callbacks for start, move capture/decision, grant, rejection, termination request, termination, release, release decision and page-selection attempt. Original admission expression, direction/threshold rules, origin handling and termination return are retained. No touch-catching overlay or new gesture library.
- `src/app/index.tsx`: state-transition-only effect captures current page, destinations, paging-enabled state and the ready/saving/dirty/editing/dragging/search/modal/exit-prompt booleans. Later Home state after a selection attempt provides observable render-state evidence. No extra storage queries or navigation changes.
- `src/components/bemem/WalletCanvas.tsx`: Home-opt-in scroll begin/end, momentum begin/end and throttled offset observations. Existing scrollEnabled, event throttle, offset callbacks and scrolling behavior remain. Create/Decorate and the synthetic fixture do not opt into scroll tracing.
- `src/components/bemem/HomeGestureDiagnostics.tsx`: DEV-only viewer mounted only inside the existing `/dev-multicanvas` utility; never overlays Home. Controls enable, open real Home, finish/refresh and disable/clear. The report is selectable text for manual copying; no Clipboard dependency.
- `src/app/dev-multicanvas.tsx`: mounts that viewer inside its existing development controls. Real Home navigation uses the existing router; fixture entitlements remain unrelated to the production owner.

## Privacy/performance boundary

Runtime whitelist accepts fixed event types, boolean technical flags, page IDs/destinations, finite coordinate/displacement/offset values and fixed decision enums only. Unknown fields are discarded even if accidentally supplied. Card names, numbers, payloads, photos, journal content, accounts and Wallet snapshots are never passed by instrumentation and cannot be retained through arbitrary extra fields.

The ring buffer retains at most 180 events. Coordinates are quantized to 4dp. Repeated capture decisions are throttled to 120ms, with decision changes and each new touch's first capture retained. Offset events are throttled to 250ms and at least 16dp change. There are no trace subscriptions, timers or React state updates per event; the viewer refreshes only on explicit button presses. Records survive route navigation within one JS session and disappear on reload. The production singleton cannot enable itself when __DEV__ is false, and the viewer renders nothing outside DEV.

## Interpretation

The report summarizes the latest observed touch and displays the bounded timeline:

- No start observed: INSUFFICIENT EVIDENCE. Absence of JS observation does not prove where a native touch went.
- B: start observed, no capture observed; short/tap input and missing delivery remain distinguishable only with further evidence.
- C: observed captures rejected with technical decision reasons.
- D: grant, then termination without release observed.
- E: release observed without selection attempt; inspect release decision and flags.
- F: selection attempted, target Home state not observed afterward; rejection, delay/unmounting and incomplete trace remain possible.
- G: scroll activity observed without selection; correlation only, not proof of native gesture ownership.

Eligible capture without grant and grant without a terminal event are explicitly described as incomplete evidence. Buffer truncation is reported. A later new touch requires finishing that attempt again. The diagnostic does not inspect Android native owners or claim a root cause from missing events.

## Samsung procedure — no ADB

1. Reload the new code once, without clearing Expo Go or Wallet. Open the existing `/dev-multicanvas` route. For Expo Go, use the current Metro URL with `/--/dev-multicanvas`, for example `exp://<Metro-LAN-address>:8081/--/dev-multicanvas` (use the actual Metro host/port).
2. In **Real Home gesture diagnostics**, tap **Enable & clear**. Do not use the synthetic membership toggles for this test.
3. Tap **Open real Home**. This pushes the actual Home route and keeps the memory trace alive; it does not change entitlement.
4. Attempt ONE swipe, preferably starting near the center on empty canvas space. Test card/decoration/vertical/diagonal/edge areas in separate sessions so the latest-touch summary is unambiguous.
5. Press Android Back to return to the DEV route. If paging unexpectedly reached page 2, the first Back returns page 1 and the next returns to the DEV route. Do not reload or restart JS between capture and inspection.
6. Tap **Finish attempt / Refresh**. Long-press the selectable report, Select all and Copy, then paste it into the conversation. Copying is manual; the application does not send the trace anywhere.
7. Tap **Disable & clear** after inspection. Re-enable for a fresh separate attempt. Reloading also removes the memory trace.

If Android Back does not return to the viewer as described, report that navigation observation; do not clear/reload data to recover a trace. The DEV viewer's navigation/copy usability itself remains subject to Samsung validation.

## Files changed

Existing production/DEV files:

- `src/components/bemem/CanvasPageSelector.tsx` — popover surface only
- `src/components/bemem/HomeCanvasPager.tsx` — observations only
- `src/components/bemem/WalletCanvas.tsx` — Home scroll observations only
- `src/app/index.tsx` — technical state observation/opt-in props only
- `src/app/dev-multicanvas.tsx` — existing utility viewer entry

New files:

- `src/lib/home-gesture-trace.ts`
- `src/components/bemem/HomeGestureDiagnostics.tsx`

Tests:

- `scripts/test-canvas-page-ui.cjs` — seven new tests; privacy, bounded/throttled events, summaries, production/off defaults, viewer, observation parity, ScrollView opt-in and floating choices
- `scripts/test-card-form.cjs`, `scripts/test-home-account.cjs` — observation-only import stubs in existing isolated component harnesses; existing assertions retained

No DecorateMode, HomeHeader, root StatusBar, draft/session logic, policy, repository, schema, storage, artwork, encoders, crop, Share, journal, card forms or dependency changes. Hash comparison against `output/phase-a-baseline.json` confirms zero changed existing artwork assets. Existing uncommitted work was preserved and no commit/staged change was created.

## Validation

| Check | Result |
| --- | --- |
| TypeScript | Passed |
| Focused checks | Passed; initial Multi-Canvas/UI/Decorate group 94/94, later UI/form/account recheck 89/89; final added ScrollView case also passed in full regression |
| Full automated regression | 896/896 passed, zero failures/skips |
| Android Hermes export | Passed, exit 0; local 3.9MB HBC |
| Lint | No existing configured ESLint tooling/config; not run, none installed |
| Samsung native event delivery / popover pixels | Not verified |

An initial full run exposed five mock-harness import rejections caused by the new observer import. Only the two harness dependency stubs were extended; assertions and application behavior were not relaxed. Final full regression passed.

Evidence: `output/phase-a-ui-tests.txt`, `output/phase-a-focused-tests.txt`, `output/phase-a-recheck-tests.txt`, `output/phase-a-all-tests.txt`, `output/phase-a-android.txt`; local export `output/phase-a-android/`.

No threshold/ownership repair, ScrollView disabling, data reset/import, phone Wallet mutation, dependency installation, original-website modification, commit, push or deployment. Stop for Samsung diagnostic results and a separate approved repair instruction.
