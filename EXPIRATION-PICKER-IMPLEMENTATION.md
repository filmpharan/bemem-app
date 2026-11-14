# Shared Add/Edit expiration picker

More Options, its collapse state/handler and toggle-only styling are removed. The existing custom code, preferred format, color and gradient controls remain directly available in the shared form; saved settings are neither discarded nor reset. These retained controls still use the form's normal scrolling. Name, Number, scanner, image replacement, size/orientation, footer and Delete behavior are preserved.

## Picker behavior

EXP is a 48dp-minimum pressable selection field, not a TextInput. Empty: `EXP YYYY-MM-DD`; full date: `EXP 2028-06-15`; legacy month-only: `EXP 2028-06`. Opening dismisses the keyboard.

One shared bottom-sheet component provides exactly three independent native ScrollView wheels: **Day / Month / Year**. Each has three visible rows, a centered selection band, native interval snapping, fixed row geometry, momentum completion and an idle fallback for slow Android drags. Tap selection is also supported. Month names are English. Row heights grow with font scaling, and the sheet content can scroll on short/enlarged layouts. Parent content scrolling is disabled while a wheel is moving; the sheet itself has no drag-to-dismiss gesture. Initial positions are applied after layout/content measurement.

The year list covers current year minus 10 through current year plus 50, plus an existing saved year outside that interval. Outliers remain selectable without rendering thousands of intermediate years. No future-only constraint is introduced.

- Cancel, backdrop and Android Back close without changing the form.
- Clear explicitly sets the optional date to empty and closes.
- Confirm validates and emits `YYYY-MM-DD`, then closes. It is blocked while wheels are moving, including synchronous callback checks.
- Wheel changes are picker-local; only Confirm/Clear update the form. The existing Add/Save actions still control Wallet persistence.
- The form locks its outer dismissal/actions while the picker is open, reusing its existing overlay-busy mechanism. Stale picker callbacks are ignored.

## Data compatibility

The existing `expiryMonth` field name and schema version 2 remain unchanged. Validation accepts empty strings, legacy `YYYY-MM`, and exact `YYYY-MM-DD` calendar dates. Gregorian leap-year and month-length checks use integer rules, not timestamp parsing. Day clamps when Month/Year changes. No trimming, UTC conversion or timezone shifting occurs.

Legacy dates retain their exact string when opened/cancelled or saved after unrelated edits. The picker highlights a provisional Day 1 for month-only dates, with a short notice; that day becomes real only through explicit Confirm. Card Detail already displays the stored string directly and therefore supports both formats without a layout rewrite. No migration, startup write or disk edit is performed.

## Files

New production files:

- `src/lib/expiration-date.ts`
- `src/components/bemem/ExpirationDatePicker.tsx`

Updated production files:

- `src/components/bemem/AddCardForm.tsx`
- `src/lib/card-presentation.ts`: existing validation entry point delegates to dual-format calendar validation.
- `src/lib/membership-card-edit.ts`: validation error copy.
- `src/types/membership-card.ts`: date-format documentation only.

Tests: new `scripts/test-expiration-picker.cjs`; updated `test-card-form.cjs`, `test-wallet-schema-extension.cjs`, `test-production-integration.cjs`, and scanner-test UI dependency mocks in `test-membership-scanner.cjs`.

No dependency added. Uses existing React Native, Safe Area and GlassButton components. Wallet Repository/Coordinator/storage, headers, Grid, scanner implementation, History, images and all decorative assets are unchanged.

## Validation and Samsung checks

TypeScript passed; automated suite **772/772 passed**; Android Hermes export passed (approximately 3.8MB). Lint is not configured, and no tooling was installed to add it. Tests cover calendar/leap rules, clamping, timezone-independent strings, real wheel event handlers, snapping, slow-drag fallback, Cancel/Clear/Confirm/Back, busy admission, shared field behavior, legacy preservation and full-date Save/readback/restart with synthetic storage. Evidence is under `output/expiration-*`.

These checks do not verify native Samsung wheel inertia, nested-touch arbitration, visual clipping or accessibility focus. On Samsung, open EXP from Add and Edit; flick each wheel, test January 31 → February and leap/non-leap years, then test Cancel, Android Back, Clear and Confirm. Check a legacy month-only card remains unchanged after Cancel and unrelated Edit Save. Save a synthetic full-date card, reopen/restart, and confirm the exact day and unchanged layout. Repeat with enlarged text and a short/landscape window; scroll outside the wheels if needed to reach actions. Also check scanner and image tools. Do not reset Expo Go or Wallet data.

No website changes, Commit, Push or Deploy.
