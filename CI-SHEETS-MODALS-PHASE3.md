# CI Phase 3 — Bottom Sheet & Modal Consistency

Implemented on the existing uncommitted production tree. CI Phases1 and2 were reported Samsung-approved by the user; **Phase3 still requires Samsung visual acceptance**. No device Wallet data was accessed.

## Approach and ownership

Reading this as an offline membership-wallet utility for everyday Android use, retaining the calm Pearl Gray — Lagoon Glass interface. The installed `mobile-design` and `ui-ux-pro-max` skills were used for modal hierarchy, restrained surfaces, keyboard access, touch targets and responsive review. Variance and motion are low; existing density/layout is retained. No new animation or blur was added.

The current production tree, `CI-CONFIRMATION-PHASE1.md` and `CI-TYPOGRAPHY-COLOR-PHASE2.md` were inspected. No separate full-app CI audit artifact was found locally; the supplied Phase3 findings were checked against actual source rather than treated as historical style instructions.

| Presentation group | Existing owner / route | Changes |
| --- | --- | --- |
| Add / Edit | AddCardEditor / EditMembershipCardEditor → AddCardSheet | Shared sheet color/rim/shadow recipe; elevated Close surface |
| Policy / Login Coming Soon | HomeAccountMenu → AddCardSheet | Same shared chrome; semantic section divider |
| Share Card | MembershipCardDetail → ShareCardSheet → AddCardSheet | Shared chrome; CI text/error aliases, neutral choice rail; Preview First and fixed footer retained |
| History & Receipts / entry screens | MembershipCardDetail → CardHistorySheet → AddCardSheet | Shared chrome; semantic row divider; existing virtualized flow retained |
| Membership / Coming Soon | LockedCanvas → existing native Modal | Shared surface/scrim/shadow; CI title/body; elevated Close |
| EXP | AddCardForm → ExpirationDatePicker → existing native Modal | Shared surface/scrim/shadow and outer typography aliases only |
| Membership Card Detail | Existing MembershipCardDetail Modal | Approved OptionB: Pearl Gray UI chrome, without changing its layout |

`src/constants/sheet-visual.ts` is a small presentation-only recipe. It imports the approved CI colors and existing Lagoon palette. It owns no React state, modal lifecycle, data, navigation, dimensions or global manager. Specialized windows have not been reparented.

## Exact visual values

| Role | Value |
| --- | --- |
| Base sheet | `#eceff1` |
| Elevated controls | `#fafcfd` |
| Primary / secondary interface text | `#263943` / `#4c606c` |
| Safe primary CTA / on-action | Existing `#405764` / `#ffffff` |
| Save / destructive-error semantics | Existing `#26734d` / `#b42318` |
| Shared sheet scrim | `#2b3e4966` (existing AddCardSheet/EXP recipe) |
| Divider / rim | `#8299a6` / `#8299a699` |
| Sheet shadow | `0 -6px 28px -10px #293e4838` |
| Detail control shadow | `0 1px 2px #293e4821` |

The existing CI typography roles remain the foundation, including existing Manrope/Noto Sans Thai handling. No font registration, selection helper or global Text behavior was changed.

| Context | Geometry / typography retained or explicitly adjusted |
| --- | --- |
| AddCardSheet and consumers | Top radius22dp, content padding20dp, max-height92%; title18/28; header marginBottom10 with6dp hit-area padding; close36dp circle + existing6dp hitSlop; footer gap/modes unchanged |
| Card Detail | Top radius24dp; max-height92%, max-width600dp; top/header/content padding20dp; header bottom gap16dp; content gap8dp; title18/26; controls36dp within48×48dp targets |
| EXP | Top radius24dp; max-height96%, max-width600dp; padding16dp, gap12dp; title18/28 weight700; existing button14/22 weight700 |
| Membership | Top radius24dp; padding24dp, gap16dp, close48dp at existing top/right16dp; title now18/26 and body14/22 instead of local22sp title /16/25 body; content-driven height may change with these approved typography roles; locked-Canvas Unlock remains16/25 |
| Policy | Existing15/24 body, section gaps8dp, paddingBottom18dp and marginBottom10dp |
| Share | Existing14/21 UI text,12/18 hints,13/20 error,48dp minimum controls; no preview dimensions changed |
| History | Existing CI roles,88dp minimum rows,20dp list gutters, thumbnail dimensions and list positions unchanged |

Membership typography is the deliberate local size change. Other migrated styles retain their existing typography metrics through explicit local overrides. No modal height, width, footer layout or animation is forced to match another screen.

## Card Detail: classified migration

| Classification | Before | After |
| --- | --- | --- |
| A: outer sheet | `#f4f4fa` | `sheetVisual.surface` → `#eceff1` |
| A: backdrop | `#20253366` | Shared `#2b3e4966` |
| B: Close / Flip / code-toggle / History control surface | `#f4f4f9` | `#fafcfd` |
| B: control shadow | `#11182722` | Palette-tinted `#293e4821` |
| C: title / member-number UI / History text | `#10121c` | `#263943` |
| C: EXP / side label / notices | `#596577` | `#4c606c` |
| C: icons | Existing semantic primary ink | Unchanged; already uses Lagoon primary text |
| D: card artwork and rendered card content | CardAppearancePreview and appearance data | Unchanged |
| E: code panel / code label / generated codes | Solid white panel, black label and actual encoders | Unchanged |
| F: full-view images, share/export raster surfaces | Existing independent rendering | Unchanged |

The Detail layout, card-name/value strings, expiry interpretation, membership-number monospace formatting, all seven footprints, inset.1, radius14dp, image pixels/cropping, code geometry/quiet zones, Tap/Swipe, Front/Back, Full View, Share, Journal entry, Android Back and Scroll behavior are retained. The white code panel and its existing shadow/padding remain separate from the Pearl Gray sheet recipe.

## Intentional exceptions and runtime protection

- The existing AddCardSheet remains the owner of its keyboard avoidance, SafeAreaView, backdrop and Close handling. Normal scroll, virtualized content and fixed-footer variants are retained.
- Detail and EXP remain separate native Modals, with the same translucent system-bar props and SafeAreaView. Detail keeps92%/600dp limits; EXP keeps96%/600dp limits.
- Membership keeps its existing Modal props, including its previous default system-bar translucency. No global StatusBar change was made.
- Decorate's Modal, approved system-bar appearance, Header, drawer and nested-confirmation ownership are unchanged.
- Existing ConfirmationDialog source, CI roles/font helper, AddCardText and GlassButton are byte-identical to pre-task files. Busy/disabled/dismissal behavior is unchanged.
- No second overlay, Back listener, window manager or Provider was introduced.
- EXP wheels retain rowHeight/fontScale calculation, styles, positions, native snap settings, settling timers, date validation and callbacks.
- Share still shows the exact prepared PNG before sharing. Capture arguments, card-share plan/session/native adapter and CardShareSurface are unchanged. Outer Share errors now use semantic red; these controls do not enter the capture surface.
- Actual card data, user copy, Policy wording, entitlement rules and all persistent operations remain unchanged.

## Files

Production additions:

- `src/constants/sheet-visual.ts`

Production changes, all under `src/components/bemem/`:

- `AddCardSheet.tsx`
- `MembershipCardDetail.tsx`
- `ShareCardSheet.tsx`
- `CardHistorySheet.tsx`
- `HomeAccountMenu.tsx`
- `LockedCanvas.tsx`
- `ExpirationDatePicker.tsx`

Test additions: `scripts/sheet-visual-fixture.cjs` and `scripts/test-sheet-ci.cjs` (ten checks).

Existing headless loaders updated for the actual new recipe: `test-canvas-page-ui.cjs`, `test-card-detail.cjs`, `test-card-form.cjs`, `test-card-history.cjs`, `test-card-share.cjs`, `test-ci-theme.cjs`, `test-confirmation-dialog.cjs`, `test-expiration-picker.cjs`, `test-home-account.cjs` (all under `scripts/`). They evaluate actual production aliases against the real palette instead of adding production fallbacks for incomplete native mocks.

## Verification

| Check | Result |
| --- | --- |
| TypeScript (`npx.cmd tsc --noEmit`) | Passed |
| Focused sheets/Detail/Share/History/form/EXP/confirmation/account/page tests | **360/360 passed** |
| Full regression suite | **957/957 passed** |
| New presentation checks within those totals | **10/10 passed** |
| Android Hermes export | Passed; `.hbc` generated in `output/ci-phase3-android/` |
| `git diff --check` | Passed |
| Lint | Not run: no installed ESLint or config; user requested lint only when configured. No installation attempted. |

Logs: `output/ci-phase3-focused.txt`, `output/ci-phase3-all-tests.txt`, `output/ci-phase3-android.txt`, `output/ci-phase3-android-stderr.txt`.

Pre-edit SHA256 manifest: `output/ci-phase3-baseline.json`. Comparison found only the seven production files and nine existing test files listed above changed within captured `src/scripts/assets/design-system`; no captured file was deleted. Existing assets, fonts, Wallet logic, Header, Grid, encoder, full-view/crop/export components, ConfirmationDialog and CI Phase2 foundations match their pre-task hashes.

Additional local before/after presentation audit: `output/ci-phase3-presentation-audit.json`. Function bodies match after allowing only Membership's text-style binding and Share's equivalent ActivityIndicator color alias. Evaluated pre-existing geometry properties match except Membership title font size, as documented above. This is supporting evidence, not a substitute for native visual testing.

Official [Expo SDK58 reference](https://docs.expo.dev/versions/v58.0.0/) was checked against the installed SDK. No new native API/dependency or modal behavior was introduced.

## Samsung acceptance still required

Automated tests validate native-free trees and presentation contracts, not Samsung rasterization, actual Safe Area measurements, hardware Back dispatch, keyboard height or physical scanner quality. Available-width checks cover360/393/412dp; the existing font tests include scaling1/1.5/2. These do not prove no clipping on a physical phone. Preserved compact11sp Detail labels,22dp/24dp sheet corners and local line-height exceptions remain intentional. No blanket layout changes were made for extreme accessibility settings.

Reload the current Expo Go bundle without clearing app data, then:

1. Open a saved card from Home and Create: verify Pearl Gray chrome, readable controls, unchanged white QR/Code128 panel, Tap/Swipe, Front/Back, Close/backdrop and Android Back.
2. Check small/large and portrait/landscape cards already available; confirm relative card sizes and pixels remain unchanged. Inspect a long card title at normal and enlarged font settings.
3. Open Add/Edit, then EXP; with the keyboard open verify field scrolling and access to actions. Cancel test edits. Verify EXP wheels and Cancel/Confirm behavior, without changing real saved data solely for review.
4. Open Policy/Login and an existing History/Journal screen: check long text, footer reachability, scrolling and nested confirmation presentation. Cancel destructive confirmations.
5. Open Share: confirm Preview First, toggles, accurate artwork/code preview and reachable single Share CTA. The app's prepared image should remain unchanged despite the surrounding sheet color.
6. Open Membership from a locked Canvas if available: verify honest Coming Soon, Close/Back and no access-rule changes. Spot-check Decorate's system bars and the five approved confirmation flows.

Repeat on a short viewport and enlarged font scale where practical. Phase3 approval is pending this physical review. No original-website changes, dependencies, data reset/import, Commit, Push or Deploy were performed.
