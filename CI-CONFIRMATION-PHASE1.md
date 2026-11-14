# CI Phase 1 — unified confirmation dialogs

Implemented on the current uncommitted production tree, 2026-11-13. HEAD remains `c500a01`; no commit, restore, push or deployment was performed.

## A. Shared architecture

`ConfirmationDialog.tsx` is the sole visual implementation. A typed `ConfirmationRequest` supplies a unique presentation ID, title, description, actions and safe dismissal callback. Each action has a primary, neutral or destructive role and can return its caller-owned Promise. The component has no Wallet/history/storage imports and performs no mutations.

`UnsavedChangesDialog.tsx` remains a compatibility facade for Create exit. Other callers retain their existing action logic and explicitly control request lifetime. There is no global dialog manager or new provider.

The installed `mobile-design` and `ui-ux-pro-max` guidance was reused for compact readable typography, safe mobile Back handling, action hierarchy, touch targets and state completeness. Design variance remains low; no decorative motion was introduced.

## B. Actual visual values

| Role | Value |
| --- | --- |
| Surface | Existing `lagoon.canvas.base`, Pearl Gray `#eceff1` |
| Title / neutral text | `lagoon.text.primary`, `#263943` |
| Description | `lagoon.text.secondary`, `#4c606c` |
| Primary safe action | Existing action fill `#405764`, white text |
| Destructive text | Existing semantic error/danger red `#b42318`; no filled destructive primary |
| Scrim | Existing Create foundation `rgba(15,23,42,0.5)` |
| Dialog | Radius 20dp, internal padding 20dp, maximum width 400dp |
| Outside clearance | 24dp within the safe content area |
| Title | Manrope 18sp / 26sp, weight 800 |
| Description | Manrope 14sp / 22sp |
| Action label | Manrope 14sp / 22sp, weight 600 |
| Actions | Minimum height 48dp; radius 12dp; horizontal/vertical padding 12dp |
| Busy/disabled | Explicit accessible state, disabled inputs, 0.65 opacity, progress indicator and “Working…” |

Text has no line-count truncation or forced uppercase. Description, long card names and all actions belong to a bounded ScrollView; actions grow with wrapping/font scale. There is no glass, blur, gradient or additional Close X.

## C–D. Exactly five migrated production flows

| Flow | Actions and roles | Existing callback mapping |
| --- | --- | --- |
| Create exit | Save primary; Discard destructive; Cancel neutral | Existing `wallet.save`, `wallet.discard`, `wallet.cancel` via the compatibility facade |
| Create Canvas switch | Save primary when permitted; Discard destructive; Stay neutral | Existing owner Save, explicit restore-to-Saved draft operation and guarded page navigation |
| Decorate exit | Keep Decorating primary; Discard Changes destructive | Keep closes only the confirmation; Discard calls the existing session cancellation and safe exit |
| History selected-entry deletion | Cancel primary; Delete N Entry/Entries destructive | Original `deleteEntries(ids)` → history command/persistence/readback/attachment cleanup |
| Edit Card deletion | Cancel primary; Delete Card destructive | Original deletion token/review and `commands.confirmDelete(token)` pipeline |

Edit Card preserves the previously approved **Delete Card & History** label and actual history/receipt counts when linked data exists. It preserves the saved card name and unsaved-form warning. History confirmation keeps actual selected-entry/photo counts and existing singular/plural wording.

No Save action was added to Decorate exit. No deletion was moved into the shared component. No scanner, permission, resize, recovery, photo-entry editing or other unrelated native confirmation was migrated. Home-only dirty page-switch/re-entry confirmations and Decorate page-switch confirmation remain outside this phase's five integrations.

## E. Native Modal nesting and Safe Area

Create's root confirmations use a transparent native Modal with a safe-area container and a bounded inner host.

Decorate renders the same dialog **inline inside its existing same-window host**, above its editor content. Its native Modal, status/navigation-bar translucency and sticker drawer geometry are preserved. A pending page popup is dismissed before opening the exit confirmation.

History and Edit pass an optional confirmation slot to `AddCardSheet`. The shared dialog is rendered within the existing safe-area-constrained KeyboardAvoidingView, above the sheet. No second native Modal is created. The editor/list remains mounted, and the underlying sheet and backdrop are hidden from accessibility while confirmation is visible.

The optional sheet slot is absent for all unaffected callers. The same-window Canvas popup's measurement, geometry and styles were not changed.

## F. Back, dismissal and accessibility

- Android Back targets the confirmation first; it does not also close the underlying Edit, History or Decorate screen.
- Outside tap uses the same safe callback as Cancel/Stay/Keep, never Save/Discard/Delete.
- Busy operations block dismissal and repeated actions.
- No destructive action is selected or focused by default. A single accessibility focus event targets the dialog title after layout.
- The shared action latch consumes callbacks synchronously; callbacks from unmounted presentations are rejected. Explicit request/token fences also reject stale caller callbacks.
- Parent content remains mounted but is hidden from screen-reader navigation during inline confirmation.

Native TalkBack focus entry/return and actual OEM Modal rendering still require Samsung testing. The accessibility API was checked against installed RN 0.88 types/source and the official AccessibilityInfo documentation.

## G–H. Data and draft safety

Save/Delete confirmations remain visible and busy while their caller awaits its existing transaction/readback. On handled failure, callers preserve the draft/form/selection, close the confirmation as appropriate and expose their existing error/reinspection UI. No false-success path or automatic retry was added.

Create page-switch consent captures its original target, page epoch, runtime generation and revision. Rapid repeated requests cannot replace the consent. It rechecks live eligibility and context before Save/Discard, and rechecks context after successful Save before navigation. Changed/expired targets are rejected without silently discarding or navigating. The independently selected Home page remains unchanged.

Keep Decorating does not reconstruct or unmount the session: draft and Undo/Redo history remain. Discard retains the existing entry-draft restoration behavior, including protection for prior Create work.

History deletion keeps selected IDs frozen for the consent and retains existing command admission, verified persistence and cleanup. Cancel preserves selection and data. Separate request identity prevents an old consent from acting on a later selection.

Edit deletion preserves its original review token, card/history policy, single Writer, revision/readback and recovery/error handling. Cancel releases the deletion token without saving or discarding the unsaved form. Form fields, scanner, images and expiration picker were not changed.

## I. Files changed

Production:

- New: `src/components/bemem/ConfirmationDialog.tsx`
- `src/components/bemem/UnsavedChangesDialog.tsx`
- `src/components/bemem/AddCardSheet.tsx`
- `src/components/bemem/DecorateMode.tsx`
- `src/components/bemem/CardHistorySheet.tsx`
- `src/components/bemem/EditMembershipCardEditor.tsx`
- `src/hooks/use-wallet-canvas.ts`
- `src/app/index.tsx`

Tests:

- New: `scripts/test-confirmation-dialog.cjs`
- `scripts/test-canvas-page-ui.cjs`
- `scripts/test-decorate.cjs`
- `scripts/test-card-history.cjs`
- `scripts/test-production-integration.cjs`

This report and local `output/confirmation-ci-*` artifacts are additional outputs.

## J–L. Validation

- TypeScript: passed, `npx.cmd tsc --noEmit`.
- Focused tests: **326/326 passed**.
- Full regression suite: **938/938 passed**, including existing Header/selector/entitlement, Wallet and history safety tests.
- Android Hermes: export exit 0; local `.hbc` bundle generated, approximately 3.9 MB.
- Whitespace diff check: passed.
- Lint: not run because ESLint/configuration is not installed/configured. No dependencies were installed.

Mocks and isolated synthetic fixtures were used for deletion and persistence tests. No production Samsung card or history entry was deleted. Coverage includes dynamic counts, Cancel, duplicate and stale callbacks, delayed Save/readback, failed/uncertain writes, changed entitlement, preserved editor fields and History recovery.

Responsive checks assert source constraints/scrollability at representative 360/393/412dp widths, short heights and enlarged text; they do not run a native Yoga layout or constitute screenshot/device approval.

The pre-edit SHA256 inventory is `output/confirmation-ci-baseline.json`. Existing changed files are listed in `output/confirmation-ci-changed-files.txt`. The 270 artwork assets, Header geometry/mapping, Canvas popup, forms, schema, repositories, coordinator, encoders and reference website were not modified.

Logs: `output/confirmation-ci-focused.txt`, `output/confirmation-ci-all-tests.txt`, `output/confirmation-ci-android.txt`, `output/confirmation-ci-android-stderr.txt`.

## M. Remaining limitations

Samsung visual approval has not been performed. Device checks are still needed for long text at large font/screen zoom, short windows, keyboard transitions, TalkBack focus and nested-window Back behavior. Other native alerts intentionally remain native pending later approval. No additional feature or CI phase was started.

## N. Samsung acceptance workflow — no real deletion required

1. Reload the current Expo Go bundle without clearing data. In Create move a test card, press red Back, inspect Save/Discard/Cancel; choose Cancel and confirm the draft remains. Check hardware Back as well.
2. Where multiple editable pages are available, request another Canvas while dirty; inspect Save/Discard/Stay. Choose Stay. Free/Expired editors must continue to offer only page 1.
3. Home → Account → Decorate: add/move a decoration, press Back, inspect Keep Decorating/Discard Changes. Choose Keep; confirm Undo still works. Back should first close the confirmation while preserving the editor.
4. In Create → Card → History, select entries and press Delete Selected. Inspect actual entry/photo counts, then choose Cancel. Selection, photos and card must remain unchanged.
5. Open Edit Card → Delete Card. Inspect saved card name, unsaved-form warning and linked-history counts if applicable. Choose Cancel; the editor/form must remain intact. Do not delete real data merely to verify appearance.
6. Repeat safe dismissal with Android Back, long names and enlarged fonts. Confirm the Header, popup, drawer and Status Bar remain as approved.
