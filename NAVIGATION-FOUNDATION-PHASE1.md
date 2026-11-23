# Phase 1 — navigation foundation

Local, uncommitted implementation against `3ec5a45bd9765594f5901b8ab196ba2f8950bde4`. Current Pearl Gray CI is reused. This phase supersedes historical eight-slot Header placement for production navigation; it does not replace the Design System, assets or Wallet contract. No Samsung acceptance is claimed.

## Components and file scope

New:

- `src/components/bemem/NavigationHeader.tsx`: shared three-part Header.
- `src/components/bemem/ContextualFooter.tsx`: shared five-slot action footer and inline page-selector state.
- `src/lib/footer-navigation.ts`: presentation-only page choices, preserving existing entitled/current access.

Updated production bindings:

- `src/components/bemem/HomeHeader.tsx`: small Home/Create facade over NavigationHeader.
- `src/components/bemem/HomeAccountMenu.tsx`: optional navigation-actions filtering; production Header Profile offers only Policy/Login. Login's Close wording works in all modes, without implying a Home navigation.
- `src/app/index.tsx`: footer bindings, selector outside-dismissal/Back, normal-flow Canvas space and explicit exit-save callback.
- `src/components/bemem/DecorateMode.tsx`: same native Modal/session/drawer, new Header and Footer inside its existing SafeArea; wording accurately describes legacy draft restoration.
- `src/hooks/use-wallet-canvas.ts`: normal Create Save stays in Create; exit-confirmation Save explicitly requests exit; exits adopt the owner's current Canvas page.

Tests updated: `scripts/test-header-layout.cjs`, `test-home-account.cjs`, `test-canvas-page-ui.cjs`, `test-decorate.cjs`, `test-production-integration.cjs`, `test-group-folder.cjs`. Existing local component mocks follow the moved callbacks; test infrastructure/dependencies are unchanged. Obsolete slot-placement/return-to-original-page expectations were replaced with the new approved contracts, preserving underlying writer/readback/error tests.

## Header

Height remains50dp. Equal left/right28% regions and central44% region mathematically center the wordmark independently of side-content width. The wordmark is text with existing Manrope alias, bounded fitting and font scaling; no new font/logo/mascot was added. Profile uses the existing Account icon/32dp circle within a48dp target. Right side is Home Search/Close Search or the static Create/Decorate label. No Header Back, Save, selector or Create→Decorate action remains.

Profile keeps the existing anchored menu and Policy/Login sheets. There is no avatar upload or authentication implementation. Search, clear, query/Reflow and keyboard behavior retain existing handlers.

## Footer and selector

| Mode | Slot1 | Slot2 | Slot3 | Slot4 | Slot5 |
| --- | --- | --- | --- | --- | --- |
| Home | Canvas N | Decorate | Create | Empty | Empty |
| Create | Canvas N | Back | Add Card | Empty | Save |
| Decorate | Canvas N | Back | Undo | Redo | Save |

All slots are20% of available width. Reserved slots are noninteractive Views, with no fake button or accessibility action. Functional targets have minimum60dp height and fill their slot (64dp wide at a320dp window); labels can grow/wrap without an absolute rail covering content. Footer minHeight72dp includes its own vertical padding, but excludes the parent's system SafeArea inset. Create Save is disabled when clean/read-only/busy; unavailable Undo/Redo are visibly muted and disabled. Back remains available after an uncertain Save where the existing session permits safe exit.

The Footer is a normal-flow sibling below the Canvas region, not an absolute overlay. Decorate's existing drawer stays directly above it. Existing SafeAreaViews apply system insets once; Footer does not add a second bottom inset. Existing native Modal status/navigation translucency flags are unchanged.

Tapping Canvas N replaces the same row with five page positions. Current-page tap, eligible selection, outside tap and Android Back collapse it. Outside dismissal uses an overlay only over the content area **while expanded**; it cannot intercept ordinary Canvas taps/dragging while closed. Underlying content is hidden from accessibility while choosing pages. The selector closes on page/mode/access/disabled changes and validates against latest props before submitting a selection. No horizontal swipe, new global responder, floating popover or elaborate animation was introduced. The existing DEV selector/Popover components remain for their original guarded callers; they are not mounted by production Home/Create/Decorate navigation now.

## Entitlement compatibility

Typical Free presentation: Canvas1 works; Canvas2 shows a lock and opens **Login Coming Soon**, without submitting a page change or granting access; Canvas3–5 are disabled/muted.

Compatibility exception required by the brief: current/readable/entitled content is not silently hidden. Existing readable pages remain selectable in Home; existing editable pages remain selectable in Create/Decorate. The current page always remains represented and can be tapped to collapse. This can mean pages2–5 remain available for an existing entitled wallet rather than applying the temporary Free-only restriction. Existing Owner admission is still the authority; the helper changes no entitlements, page assignments, schemas or stored content. Locked/read-only destinations are never promoted to writable editor pages.

## Saved/Draft and page behavior

- Normal Create Save uses the existing owner save/readback, clears properly committed dirty state and stays on the current Create page. Users can continue Add Card.
- Back with a dirty draft retains the existing Save/Discard/Cancel dialog. Its Save passes `exitAfterSave:true` and exits only after success. Failure retains the draft and stays in Create.
- Clean exit and confirmed exit return Home on the **current owner page**, not the Home page remembered before entering the editor. No card positions are changed by navigation.
- Eligible Create page switches retain Save/Discard/Stay with existing generation/revision/page-epoch checks. Failed Save cannot navigate.
- Decorate retains its existing session, per-completed-action Undo/Redo, Save/readback, uncertainty lock and dirty Back confirmation. Successful normal Save closes the Modal and returns Home on its current page; failure leaves it open.
- A fresh runtime owner already initializes page1; no new page-reset effect was added. Modal open/close, foreground/background and Fast Refresh do not deliberately reset the current page. Existing Provider ownership/state is retained.

### Explicit legacy limitation — not silently resolved

If Decorate starts with an earlier unsaved Create draft, Discard must restore that **entry draft**. The Owner refuses a page switch while that earlier draft is still dirty. The existing safe behavior is retained: Discard exits Decorate to Home on the current page with the earlier draft preserved, rather than discarding it or switching anyway. The message now says Home, matching the real callback.

Therefore the general “Discard then switch” request has this legacy exception. Save all current changes can switch; Stay retains the session. Supporting simultaneous retained drafts across pages would require a separately approved draft/navigation contract; it was not introduced in this phase. Normal clean-entry Decorate Discard can switch to the eligible destination through the existing flow. No direct Create→Decorate control was added.

## Preserved boundaries

No diff in approved assets, Card Detail, GroupFolderCard/Sheet, Group Folder logic/visual helper, Grid engine,350ms interaction engine, Wallet owner/repository/schema/types, source artwork/crop/share, package/lock/config, runtime version or Design System files. Header/Footer changes reduce visible Canvas height only; logical positions, width-based block unit, collision footprint and native viewport measurement remain in the existing Canvas implementation. No real Samsung data was read, migrated, reset or written by tests.

## Validation

- TypeScript: passed.
- Focused navigation/Folder/Decorate/production integration tests: **260/260 passed**; final Profile/Header checks **22/22 passed** after the contextual Close wording change.
- Full regression after final code: **1,056/1,056 passed**, zero skips/failures.
- Android Hermes: passed, `output/navigation-foundation-android`, bundle `entry-f62427036ecbbac02c4d9a056e4abdd9.hbc`.
- `git diff --check`: passed; LF/CRLF advisory only.
- ESLint unavailable: no installed CLI/configuration. No packages were installed.

Tests verify centered/equal regions, all real/reserved footer slots, temporary lock/no-write behavior across all modes, entitled-page exceptions, disabled/busy controls, collapse behavior, owner save/readback, stay-in-Create, exit-save, return-current-page, fresh-owner page1, failed-save retention, page-switch stale/revision/expiry handling, and existing card/Folder/sticker contracts. They mock native rendering/filesystems and cannot certify physical Samsung layout, keyboard resize, focus, Android Back or touch arbitration.

API references checked: [Expo SDK58 Safe Area](https://docs.expo.dev/versions/v58.0.0/sdk/safe-area-context/) and [React Native Modal](https://reactnative.dev/docs/modal). `mobile-design` guided native navigation/SafeArea/touch ownership; `ui-ux-pro-max` guided clear grouping and non-obstructing navigation. Existing user-approved contextual action slots take precedence over generic tab-bar advice. No CI or elaborate Motion implementation was performed.

## Samsung verification — preserve data

1. Run `npm run start -- --go` from this project and reload the same Expo Go project; do not clear/uninstall/reset. Check Home: avatar / centered wordmark / Search, Footer Canvas–Decorate–Create–empty–empty.
2. Open Profile → Policy/Login → Close. Check Search typing/clear/Back and card/folder taps. The controls must not cover the Android navigation bar or produce an extra white strip.
3. Expand Canvas selector in every mode. Tap current number, tap outside, and use Android Back. In a normal Free wallet, Canvas2 must show Login Coming Soon and keep the page/data unchanged;3–5 must not navigate. If existing entitled/readable pages exist, verify the compatibility exception instead of hiding them.
4. Enter Create. Add a test card only if desired, move a card/Folder and Save: remain in Create on the same page, dirty state clears, Add Card remains usable. Back exits cleanly; after another edit test Cancel/Discard/Save in the exit dialog.
5. For existing eligible alternate pages, test dirty Create page-switch Stay/Discard/Save and verify failed/locked Save never switches. Do not simulate billing or change entitlements on real data to manufacture the case.
6. Enter Decorate from Home. Confirm drawer above Footer, Undo/Redo initially disabled,350ms card/Folder/sticker gestures unchanged, Folder tap does not open its Sheet, and the selector does not steal Canvas gestures while collapsed. Test Undo/Redo/Back/Discard and Save→Home. Check current-page retention.
7. Verify Card Detail/Folder sheets cover the Footer and close normally. Check enlarged Samsung fonts, keyboard open/closed, both navigation-button/gesture configurations if available, and background/foreground without page reset. A genuinely fresh app launch should start Home1 while retaining all stored pages/content. Distinguish this from Fast Refresh.

No commit, tag, push, deploy, repository-setting change or dependency install. Stop for Samsung review; CI/Motion and final legacy-draft UX remain separate approval work.
