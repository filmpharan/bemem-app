# Phase 1 — Sandbox Foundation upgrade

Status: safe foundation/runtime presentation changes implemented; awaiting Samsung.
Baseline remains c500a015cfc80bd6a63c88d3848562b33f02faa3. No commit or history edit.

## Audit: what already existed

- `canvas-layout.ts` already uses12 columns and the same unit for x/y:
  `unit = actualCanvasWidth / 12`. There was no logical Grid Gap to remove.
- `WalletCanvas.tsx` uses actual onLayout width. Cards were painted3px inside their
  reserved rectangles; collision used full6×4/4×6 footprints.
- Create's markers were already sparse2px dots (the old cross's vertical line is
  hidden). The dotted renderer, opacity and spacing are retained, not replaced by lines.
- Card geometry used orientation only. Placement, drag clamp, metrics and v1
  validation shared a240-row compatibility boundary.
- Search previously ranked matches first but still displayed nonmatches, using shelves.
- Existing Saved/Draft/Save/Discard/Cancel and file transactions are separate modules;
  no files in that runtime/storage/session path needed modification.

## What changed

### One existing geometry engine

`cardSize()` now reads the existing seven preset dimensions when `sizePresetId` is
present. Mini3×2, Card6×4, Voucher7×3, Boarding Pass8×4, Mini2×3, Card4×6 and
Vaccine5×7 reserve exactly those integer Block footprints, by this latest approval.
No separate aspect-ratio compensation was added to Canvas rendering.

Existing Demo cards have no size ID. They deliberately keep6×4 or4×6 from their
existing orientation. Their IDs, coordinates, colors and fixture source are unchanged.
Optional size/kind fields were added to the display DTO only, not WalletDocument or
CanvasDocument. Existing Add Card UI, preview ratios and state logic are unchanged.

`canvasItemFrame()` is the shared paint calculation for normal and dragging cards:

```
unit = measuredCanvasWidth / 12
cardInset = unit × 0.1
left = col × unit + cardInset
top = row × unit + cardInset
width = WidthBlocks × unit − 2 × cardInset
height = HeightBlocks × unit − 2 × cardInset
```

Thus4×6 reserves4×6 but paints3.8×5.8. Collisions never use the inset rectangle.
At a328-unit canvas, unit≈27.333 and inset≈2.733 instead of the former3px. This is
a small visual-spacing change; it does not move any saved logical coordinate.
Card radius, art, theme and the sparse dotted background are retained.

Future decoration DTOs have kind=`decoration`; footprint is always1×1 and frame has
zero inset. The same collision checker prevents overlap with cards/other pieces.
There is no decoration renderer/editor/PRO state: WalletCanvas does not draw such
objects as fake membership cards. These are geometry/search rules and tests only.

### Placement / dynamic rows

`firstFreePosition()` scans rows from0, columns left-to-right and uses the existing
full-footprint collision checker. Existing item positions are never rewritten.
For a future resize it ignores only the resized item's old slot; other items remain.
It searches through the last occupied row and can place below it. It returns null
if a caller supplies a finite full bound with no fit. Invalid coordinates are rejected.

Metrics, drop snapping and canPlace accept an explicit maxRows option. The DEV
Sandbox passes Infinity (still constrained by valid JS integer coordinates), so
its rows extend beyond240. This is not a claim of infinite device memory/native
scroll dimensions or constant-time performance with very large item counts.

### Important legacy boundary retained

**The existing Phase1 wallet reader/writer still validates a maximum240 rows.**
That contract was not silently changed. Home/Create uses that same default so it
cannot offer a drag/save which its unchanged validator would then reject.
`validateLayout`, repository, file adapter, startup hook, reducer, coordinator,
import gates and Phase2 compatibility diagnostics retain their old behavior.

The unbounded foundation is testable in `/dev-sandbox`, using the SAME WalletCanvas
and geometry functions, not a second Grid Engine or Saved/Draft system. This is the
safe implemented portion. Removing the240 boundary in the real persisted Phase1
wallet requires a separately approved validation/compatibility change and regression
tests before that runtime can store lower rows. No saved coordinates were clamped,
reset, rewritten or migrated to make the upgrade appear successful.

### Search updated in the existing Home

Active nonblank Search now shows only matching card names, preserves input tie
order, excludes all future decorations and first-fits visible cards from the origin.
No matches gives an empty presentation. Closing/clearing/whitespace Search returns
the exact Saved Layout and original items. No storage action is called.

The unmounted Phase2 `walletSearchPresentation()` delegates to the same pure helper
with unbounded presentation rows, instead of retaining the old conflicting rule.
This does not activate Wallet v2 or alter its startup/storage path.

## Samsung test route

Run `npx.cmd expo start --clear`, then open in Expo Go:

`exp://<computer-LAN-IP>:<Metro-port>/--/dev-sandbox`

This route is DEV-only and redirects to Home in production before mounting fixtures.
It has no wallet readers/writers and no Save action. It begins with seven synthetic
cards placed by first-fit. All fixture state is discarded when the route unmounts.

1. In Arrange, inspect7 shapes and sparse dots. Tap opens the existing Phase1 Card
   Preview; hold350ms to drag. Verify snapping, horizontal bounds and rejected overlaps.
   No resize handles were introduced. Detail/preview modal redesign is out of scope.
2. Tap Add7samples. Each batch auto-places without moving earlier samples. Repeating
   eventually grows below row240; scroll down to inspect. This adds no real card and
   does not write disk. Existing artificial IDs are distinct from Phase1 Demo IDs.
3. Switch View: cards are not draggable. Search Mini/Card/Voucher; only corresponding
   samples should remain from the top-left. Clear query to restore the memory layout.
4. Leave via Back. Real Home must keep its original four cards at saved coordinates.
5. On real Home Search, query one demo name; nonmatches should disappear. Clear or
   close Search and verify the exact previous saved arrangement returns.
6. On real Create verify tap,350ms hold, scroll, discard/cancel and a deliberately
   chosen Save. Restart the app and verify that user-initiated Save persists. No
   automated tool in this task reads/writes your Samsung wallet files.

DEV View/Arrange are inspection controls, not a second implementation of real
Home Saved/Draft. There is one temporary layout and no pretend Save-success state.

## Tests and safety evidence

- TypeScript passed.
- Read-only lint:60 files,0 errors/0 warnings; no package installation.
- Automated tests:224/224 passed, including15 new Sandbox tests. Existing phase1
  persistence/failure/Save/Discard/Cancel and350ms gesture tests remain passing.
- New tests cover square/zero-gap units, seven footprints, card/decor inset,
  full-block collision, row-major/resize placement, growth past240, bounded legacy
  validator, snapping, search filtering/decor hiding, clear restoration, fixture
  immutability and DEV-only routing/no wallet imports.
- Android bundle exported offline to `.expo/sandbox-foundation-review`, with bytecode
  disabled for review. This is not Samsung rendering/performance validation.
- Protected non-scope source hashes before/after match, including Add Card UI,
  Demo fixtures, Home entry, session/hook/storage, coordinator, migration, theme and
  original website source. No commit, push, deploy, dependency or real migration.

## Files

- `src/lib/canvas-layout.ts`
- `src/lib/search-reflow.ts`
- `src/lib/wallet-preparation.ts` (pure future search presentation only)
- `src/lib/card-size-presets.ts` (dimension semantics comment only)
- `src/types/wallet-ui.ts` (optional geometry DTO metadata only)
- `src/components/bemem/WalletCanvas.tsx`
- `src/lib/sandbox-preview.ts` (new memory fixture)
- `src/app/dev-sandbox.tsx` (new DEV route)
- `scripts/test-sandbox-foundation.cjs` (new)
- `scripts/test-search-reflow.cjs`
- `scripts/test-wallet-startup.cjs` (updated search expectations only)
- This report

## Before real membership Save

Approve persisted size IDs and versioned validators/migration policy, explicit
Card+Layout snapshot serialization, legacy footprint preservation and a coordinated
dynamic-row validation policy. Then integrate placement/search/edit with the same
footprints. Current v2 import remains locked and real Add Card Save is not enabled.

Large-count first-fit latency, very tall native ScrollView behavior, sparse-dot
appearance, resize/orientation and hardware-back interactions still need Samsung
tests. Decoration rules are prepared only; no decoration UI or PRO purchase feature.

Stop here and wait for Samsung review.
