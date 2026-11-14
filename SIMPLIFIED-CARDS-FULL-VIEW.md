# Simplified Card Form, Number-only Codes, and Full View

Implementation report — 2026-11-12. Awaiting Samsung verification; no commit, push, deployment, Wallet reset, or on-device migration was performed.

## Delivered behavior

- Shared Add/Edit form removes Code Value, same-as-number helpers/reset, Preferred Code, color palette, and gradient controls completely. No More Options replacement. Preview, media tools, size/orientation, Name, Number/scanner, expiration wheel, and existing horizontal actions remain.
- Number is the sole QR/Code128 source for Detail, sharing, and code exports, including previously saved cards with a different custom payload. Leading zeros, spaces, case, punctuation, and supported Unicode are preserved. Unsupported Code128 values show an honest unavailable result; empty legacy Numbers never fall back to old URLs or custom values. Demo cards do not receive fake codes.
- Existing v2 schema compatibility fields remain because they are required by the current schema. They are no longer independent form settings or rendering sources. Explicit Add/Edit saves derive the compatibility payload from Number and use a fixed QR preference. Legacy empty-Number records retain their required stored compatibility value for readability, but cannot render a code from it. Reading a card does not rewrite it.
- New Add sessions sample existing palette/gradient presets once. The selection survives rerenders, Front/Back, validation, and Save; persisted appearance is stable on reopening. Existing cards retain saved appearance and uploaded artwork. New gradient cards use white foreground to match their preview; solid cards retain palette text contrast.
- QR no longer has the former 176dp size ceiling. It uses the largest integral physical-module square within available width and a practical screen-height budget. Code128 uses available integral-module width and a 140–180dp bar-height budget. QR four-module and Code128 ten-module quiet zones remain. A separate measured bottom control band keeps labels/toggle away from symbols and quiet zones. Oversized payloads are not clipped or squeezed. Encoder algorithms are unchanged.
- Front/Back label is above the flip icon; Full icon is below it. Existing Detail permissions, tap/swipe code toggle, expiration, Number, and History/Photo Journal remain.
- Full View displays the actual current saved artwork/side using the existing renderer. It resolves all seven footprints, preserves the painted ratio after 0.1-block inset per side, fits with one scale, and retains 14dp radius. Portrait cards request portrait with bottom Flip/Home controls; landscape cards request landscape with right-side controls. Targets are at least 48dp.
- Full View flips the same card without editing it. Android Back returns to Detail and preserves the selected side. Home closes Detail and returns Home; a dirty Create session still invokes existing Save/Discard/Cancel protection instead of discarding its draft.
- A serialized temporary orientation lease restores the previous policy before explicit exit, on background, and on unmount as far as native APIs allow. Resume reapplies the temporary card policy. Rapid taps do not stack views. Explicit restoration failure keeps Full View open with a retryable error rather than reporting a completed exit.

## Dependency and skills

Used the installed mobile-design and ui-ux-pro-max instructions for mobile interaction and visual consistency. Installed only the separately approved `expo-screen-orientation` 58.0.4 using Expo's installer. No other direct dependency or lint tooling was added. Existing app orientation configuration remains unchanged.

Checked SDK 58 documentation and installed API types: https://docs.expo.dev/versions/v58.0.0/sdk/screen-orientation/ and https://docs.expo.dev/versions/v58.0.0/sdk/image/ .

## Files changed in this workstream

Production:

- `src/components/bemem/AddCardForm.tsx`
- `src/components/bemem/AddCardEditor.tsx`
- `src/components/bemem/AddCardIcon.tsx`
- `src/components/bemem/MembershipCardDetail.tsx`
- `src/components/bemem/CardCodeView.tsx`
- `src/components/bemem/CardPreview.tsx`
- `src/components/bemem/ShareCardSheet.tsx`
- `src/components/bemem/FullScreenCardView.tsx` (new)
- `src/lib/card-form.ts`
- `src/lib/card-presentation.ts`
- `src/lib/card-form-adapter.ts`
- `src/lib/card-editor-state.ts`
- `src/lib/membership-card-edit.ts`
- `src/lib/card-code.ts`
- `src/lib/code128-display.ts` (comment only)
- `src/lib/card-detail-controls.ts`
- `src/lib/card-share-plan.ts`
- `src/lib/full-card-view.ts` (new)
- `src/lib/full-view-orientation.ts` (new)
- `src/lib/dev-cutover-checks.ts` (existing synthetic check expectation)
- `src/app/index.tsx` (Full View Home callback only)
- `package.json`, `package-lock.json` (approved orientation package)

Tests:

- `scripts/test-full-card-view.cjs` (new)
- `scripts/test-add-card-runtime.cjs`
- `scripts/test-card-codes.cjs`
- `scripts/test-card-detail.cjs`
- `scripts/test-card-form.cjs`
- `scripts/test-card-management.cjs`
- `scripts/test-card-share.cjs`
- `scripts/test-expiration-picker.cjs`
- `scripts/test-membership-scanner.cjs`
- `scripts/test-production-integration.cjs`

Prior uncommitted work is preserved. Scope hashes verify existing artwork assets and protected Header, Canvas, scanner, date-wheel, Coordinator, Repository, storage-adapter, and artwork-store implementations were not changed in this workstream. Wallet schema, transaction protocol, Grid, decorations, History storage, and original website were not modified.

## Validation

| Check | Result |
| --- | --- |
| TypeScript | Passed |
| Full automated suite | 786 passed; 0 failed/skipped |
| Independent code readback | Existing ZXing tests decode Number exactly, including conflicting legacy payload fixtures and resized code output |
| Full View tests | All seven footprints, saved artwork/side, orientation locks/restoration/failure, background/resume, stale leases, repeated taps, exit ordering, and dirty-Create Home guard covered with mocks |
| Android Hermes export | Passed |
| Lint | Not run: no configured ESLint tooling; nothing installed for lint |
| Physical Samsung rotation/scanning | Not verified |

Artifacts: `output/full-view-all-tests.txt`, `output/full-view-android-build.txt`, `output/full-view-scope.json`. Latest Android Hermes artifact: `output/full-view-android/_expo/static/js/android/entry-a9bf9ca508d898c4d88815140ffa34b8.hbc`.

## Remaining limitations

- Software decoding verifies generated geometry and payload, not camera performance on a physical display. Very long codes may remain unavailable at safe module sizes; values are never altered to fit.
- Native orientation can be refused by OS/window modes. JS cleanup cannot guarantee restoration after process termination or native crashes. Unexpected unmount cleanup is best effort. No status/navigation-bar policy is changed manually.
- Samsung system-bar insets, rotation transition, larger fonts, real image rendering, and scanning need physical validation. No new annotated screenshots accompanied this request, so screenshot-specific visual parity is not claimed.
- Existing npm audit output reported four moderate advisories; no unrelated package updates or automatic fixes were performed.

## Samsung workflow

1. Start the latest bundle with `npx.cmd expo start` and open this project in Expo Go without clearing data. Reload if an older bundle is still open.
2. Add a test card: verify the removed section is gone, scan/type a Number such as `0012 Ab 34`, choose expiration, and save via the existing flow. Reopen Edit: Number and saved automatic appearance must be unchanged. Cancel an edit and confirm no data change.
3. Open Detail from Home and Create. Switch QR/Code128 by tap and swipe; scan both using another device and compare exact Number. Test an old card whose former custom payload differs, and a QR-only Number unsupported by Code128. Check larger text and ensure controls never cover codes.
4. Open Full on landscape and portrait cards, including uploaded Front/Back images. Confirm automatic orientation, whole-card fit, correct bottom/right controls, Flip, Android Back returning to Detail, and Home returning Home. Repeat quickly; background/resume; confirm normal orientation is restored. From dirty Create, confirm Home preserves Save/Discard/Cancel.
5. Reopen the app and check saved card appearance, layout, decorations, History, and sharing remain intact. Do not reset Expo Go or Wallet data to perform these checks.
