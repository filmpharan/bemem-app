# Add Card — Samsung visual bug fixes

Status: ready for Samsung retest; approved layout/design remains locked.

## Confirmed icon cause

`AddCardIcon.tsx` previously supplied `data:image/svg+xml;utf8,` followed by
percent-encoded SVG. In installed expo-image58.0.18, Android
`dataurls/Base64ModelLoader.kt` accepts every `data:` source and
`Base64DataFetcher.kt` Base64-decodes the bytes after the comma unconditionally.
The previous source was not Base64, so it could not reach SVG decoding correctly.

All six icons now use `data:image/svg+xml;base64,` with an ASCII-only encoder scoped
to static icon SVG. This is unrelated to QR/barcode/member payload encoding.
Explicit SVG width/height24 are included; visible icon dimensions remain16.
Lucide paths, stroke2 and Pearl Gray foreground color are unchanged. No dependency,
network URL, disk cache, icon font or replacement artwork was added.

Tests decode each generated URI with Node's independent Base64 implementation,
check round-trip bytes, SVG dimensions, paths and foreground stroke. They do not
claim that a native SVG decoder was executed on Samsung.

## Text constraints addressed

- Size controls had a `width:100%` row inside GlassButton's intrinsic-width content
  View. That did not provide a definite inner width for label/icon measurement.
  The Add Card caller now supplies a numeric budget derived from the existing
  two-column width, padding, border, icon16 and gap4. Shared GlassButton is untouched.
- Text previously relied on intrinsic/fallback font widths without measuring the
  final Manrope glyphs. The scoped `AddCardText` measures with a wide hidden probe,
  observes existing font readiness and system font scale, and invalidates stale
  measurements when they change. It reserves2 units on each side for glyph bearings
  and rounding. Actual Samsung clipping may have additional device-specific causes;
  this has not been independently reproduced on a phone here.
- Android font padding is enabled for these labels. Font sizes are unchanged,
  font scaling remains enabled, and no ellipsis, line limit, font-size shrinking or
  scaling cap was introduced. Labels wrap only within their available width.
- Applied to Add Card title/CTA, Front/Back, current size/Portrait/Landscape,
  Thailand, Code & color and the existing advanced button labels.
- The title retains its accessibility header role; measurement probes are hidden
  from accessibility and do not accept touch events.

Normal text can use a few additional units inside the existing control to prevent
glyph clipping. Expanded fonts may wrap and increase label height as necessary.
Icon button36, icon16, preview proportions, spacing constants, field order, sheet
shape, colors and source-flow footer remain unchanged.

## Files

- `src/components/bemem/AddCardIcon.tsx`
- `src/components/bemem/AddCardText.tsx` (new, Add Card only)
- `src/components/bemem/AddCardForm.tsx`
- `src/components/bemem/AddCardSheet.tsx`
- `src/app/dev-add-card.tsx`
- `scripts/test-card-form.cjs`
- This report

Home/Create, shared GlassButton, layout constants, card preview, model/validation,
storage, coordinator, migration and import lock are not changed.

## Verification and limitations

- TypeScript passed.
- Read-only lint passed:57 files,0 errors/0 warnings.
- All automated tests passed:194/194; Add Card suite29 tests, including5 new text
  measurement/scale/accessibility/budget tests and stronger icon encoding checks.
- Font scale1,1.5,2 is covered using synthetic measurement events in component
  tests, not Android text rendering or Samsung accessibility settings.
- Android export: `.expo/add-card-final-polish-review`, offline review export,
  bytecode disabled. No physical Samsung or emulator screenshot is claimed.
- Protected non-UI source hashes before/after match; no dependencies, commit,
  push, deployment or original website changes.

## Samsung retest

Run `npx.cmd expo start --clear`, then open
`exp://<LAN-IP>:<Metro-port>/--/dev-add-card` in Expo Go.

1. At normal font size inspect X, Flip, Image, Camera, Chevron and Country pin.
   Icons should remain centered at16 inside the approved36-unit visuals.
2. Confirm Image/Camera remain visibly disabled and cannot request permissions.
3. Inspect Add Card, Front/Back, Card6x4/4x6, Portrait/Landscape, Thailand,
   Code & color and CTA after fonts finish loading. No missing ending glyphs.
4. Repeat at enlarged Samsung font settings. Labels may wrap; important text
   must not disappear or become ellipsis. Preview/button visual sizes stay locked.
5. Switch orientation, flip the card and open code/color options; inspect labels
   after each change. Close using X, backdrop and Android Back.
6. Add Card still validates only and says Nothing saved; no real card or layout is
   written. Return Home and verify the existing wallet remains unchanged.

Wait for Samsung results before further changes.
