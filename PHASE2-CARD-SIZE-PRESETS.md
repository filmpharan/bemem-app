# Add Card — seven size presets

Status: implemented in the development form only; awaiting Samsung review.

## Definitions and preview sizing

`src/lib/card-size-presets.ts` is a small, native/IO-free definition module. IDs,
labels, orientation, ratio dimensions and preview scale are separate from UI rendering.
No definition is a Canvas footprint, physical measurement or storage schema.

| ID | Exact UI label | Orientation | Aspect ratio | Preview width |
| --- | --- | --- | --- | --- |
| mini-landscape | Mini 3×2 | Landscape | 3/2 | Half of landscape Card |
| card-landscape | Card 6×4 | Landscape | 6/4 = 3/2 | 2/3 of available form width |
| voucher-landscape | Voucher 7×3 | Landscape | 7/3 | Same landscape baseline width |
| boarding-pass-landscape | Boarding Pass 8×4 | Landscape | 8/4 = 2 | Same landscape baseline width |
| mini-portrait | Mini 2×3 | Portrait | 2/3 | Half of portrait Card (72 at normal widths) |
| card-portrait | Card 4×6 | Portrait | 4/6 = 2/3 | 144, bounded by available width |
| vaccine-passport-portrait | Vaccine Passport 5×7 | Portrait | 5/7 | Same portrait baseline width |

Default: Landscape / `card-landscape`.

The original web `CardForm.tsx` uses a two-axis selector and 2/3 landscape versus
144px portrait preview widths. `CardDisplay.tsx` uses1.586 for its default card,
7/3 voucher,2 boarding pass,2/3 portrait and5/7 vaccine passport.
**This request explicitly specifies ratios from the displayed dimensions:** the
new Card6×4 is therefore1.5, not1.586. Its width is unchanged, but height increases
slightly. Mini scale0.5 is a presentation choice reflecting half the Card dimensions;
it does not assign logical grid cells or real-world units.

At content width372, landscape Card is248×165.33, Mini124×82.67, Voucher248×106.29,
Boarding Pass248×124; portrait Card144×216, Mini72×108, Vaccine144×201.6.

## Interaction and state preservation

- Only current-orientation options appear, in the exact requested order (4/3).
- The active axis displays the full selected label and exposes it through
  accessibilityValue. Its menu has full accessible names, selected state, themed
  selected surface/border and48-unit minimum option targets.
- Popup content scrolls when enlarged text needs more space. Labels use existing
  font-aware AddCardText; no ellipsis, text-size reduction or scaling cap.
- Mini switches to the Mini on the other axis; Card switches to Card.
- Voucher/Boarding Pass → Portrait Card. Vaccine Passport → Landscape Card.
  Switching back stays in the Card family; no hidden remembered special selection.
  Asking for the same orientation preserves the current special preset.
- `selectCardSize` returns copies changing only `values.orientation` and
  `presentation.sizePresetId`. Name, original member/code strings, payloadEdited,
  preferred format, color, country, brand, expiry, side and other properties remain.
- Both controlled callbacks run in the same React event; only the visual preview
  remounts on preset/width/side changes. This avoids reusing text-height measurements
  from the preceding shape; the form and entered data do not remount/reset.
- Choosing an option closes the menu. Opening size selection dismisses the keyboard
  so it does not hide available options.

Existing Sheet/header/X, icon rendering fix, text measurement, Pearl Gray tokens,
GlassButton, fields, country/brand row, source-flow CTA, dismissal and navigation
remain. No new system or dependencies were added.

## State versus persisted model — important boundary

The new selection lives in controlled `CardPresentationDraft.sizePresetId`, the
same in-memory form state that holds country/brand/expiry/side. It is not a change
to MembershipCard, WalletDocument, runtime validation or storage.

The development Add Card action still validates only and reports Nothing saved.
The current `prepareCardForm().card` does not contain sizePresetId and MUST NOT
be wired to a real Save as if it serialized all seven sizes. A future integration
must explicitly include and validate the selection; silently dropping it is invalid.

## Before real Save: changes requiring separate approval

| Area | Required future work; not implemented here |
| --- | --- |
| MembershipCard | Add an approved stable sizePresetId field; define orientation consistency, legacy rendering and explicit default behavior. Preserve demo kind and exact payload. |
| Wallet validation | Accept only seven known IDs, reject orientation/size mismatches, validate legacy documents separately; test unknown IDs and unsupported schemas. Current strict validator is unchanged. |
| Wallet v2 storage | Decide a versioned schema change/migration contract before adding fields; current strict schema2 cannot silently acquire new properties. Save card size together with cards/layout in the existing snapshot transaction, retaining revisions/recovery rules. No protocol change or migration is made now. |
| Canvas placement/collision | Define independent logical footprints for each size and a compatibility policy. Do NOT treat3×2/6×4/etc as grid coordinates automatically. Keep existing card positions and legacy footprints; never resize/repack old cards merely because new presets exist. Define overflow/capacity behavior before new shapes reach runtime. |
| Search Reflow | Use the same approved footprint rules as placement to avoid overlap. Search positions stay transient and never modify Saved/Draft/storage. |
| Preview and Edit Card | Restore exact saved ID and shape on both front/back; preserve payload and all fields through edit. Legacy cards keep their approved appearance/placement until an explicit edit/migration policy is approved. |

Country/brand/expiry/images also still need the previously identified serialization
contract. No existing Wallet v1/v2 data or Saved Layout is changed in this milestone.

## Verification

- TypeScript passed; read-only lint58 files,0 errors/0 warnings.
- All automated tests209/209 passed. Add Card suite44 tests (15 added for presets).
- Coverage: seven IDs/labels, 4/3 order, every ratio, Mini scale, preview component
  geometry, pairs/fallbacks, actual control callbacks, immutable form preservation,
  raw member/custom payload, selected state, narrow/enlarged label budgets and
  unknown IDs. Module loading rejects unapproved native/network/IO dependencies.
- Android bundle exported offline to `.expo/add-card-seven-presets-review` with
  bytecode disabled for review. This is not a physical-device or crash-safety test.
- Protected source hashes match before/after: existing runtime, storage, validation,
  coordinator, migration, theme files and original website source remain unchanged.
- No dependency install, commit, push or deployment.

## Samsung review

Run `npx.cmd expo start --clear` in bemem-app, then open
`exp://<LAN-IP>:<Metro-port>/--/dev-add-card` in Expo Go.

1. Confirm initial Landscape / Card6×4. Tap the active selector and inspect all4
   landscape labels/order; select each and inspect the preview.
2. Switch to Portrait and inspect its3 labels/order. Check front and back at every size.
3. Select Mini, switch axes twice: it must stay Mini. Repeat for Card.
4. Select Voucher or Boarding Pass → Portrait: Card4×6. Switch back: Card6×4.
   Select Vaccine Passport → Landscape: Card6×4.
5. Enter synthetic name/member number with leading zeroes, spaces and case. Edit
   a separate custom code, country/brand/expiry/format/color/side where available.
   Cycle through all sizes and verify all values remain. Country remains Thailand.
6. Repeat with enlarged Samsung text. Long preset names may wrap within the existing
   selector; popup scrolling must expose every option, without ellipsis or overlap.
7. Inspect tools/keyboard/scroll/Close/backdrop/Android Back. Add Card remains a
   validation-only action; Home/Create and saved positions must remain unchanged.

Remaining limits: no actual Samsung rendering/performance test from this environment.
Existing long-text accessibility behavior may grow preview height if text cannot
fit its nominal ratio, especially Mini with enlarged text; normal short text follows
the declared ratio. Natural sheet height changes between shapes are expected;
unexpected bouncing/clipping/overlap needs device feedback. No ticket/voucher
functionality, real QR/barcode, image upload or persistent size setting is added.

Files: new `src/lib/card-size-presets.ts`; updated `src/lib/card-presentation.ts`,
`src/components/bemem/add-card-layout.ts`, `AddCardForm.tsx`,
`CardAppearancePreview.tsx`, `scripts/test-card-form.cjs`; this report.

Stop and await Samsung results before further implementation.
