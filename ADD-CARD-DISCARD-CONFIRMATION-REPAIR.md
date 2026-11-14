# Add Card discard confirmation repair

Implemented for Samsung review, preserving the user-approved CI Phases1–3. No physical Samsung verification is claimed.

## Root cause and scope

The independent `close()` handler in `src/components/bemem/AddCardEditor.tsx` still called native `Alert.alert('Discard changes?', ...)` directly (pre-repair lines36–39). Add and Edit share `AddCardForm`, `editorChanged()` and the sheet UI, but **do not share this discard handler**.

Only Add's discard presentation was migrated. The separate Edit native discard/reinspection handler, resize prompt, approved Delete/Delete & History confirmation, transactions and other Alerts are unchanged.

## Approved dialog reuse

AddCardEditor now supplies a typed `ConfirmationRequest` to the existing `ConfirmationDialog` with `presentation="inline"`, through AddCardSheet's existing `confirmation` slot. No dialog styles, sheet dimensions, font handling or new modal framework were added.

| Event/action | Callback and outcome |
| --- | --- |
| Clean exit | Original `editorChanged(initial, {values,presentation})` check; directly invokes original `finishClose()` |
| Dirty Cancel / Close / parent sheet Android Back | Opens `Discard changes?` with body `Your unsaved card changes will be discarded.` |
| Keep Editing (primary safe action) | Clears only the confirmation; retains the mounted form and every field/image selection |
| Confirmation Android Back | Existing sheet's `onRequestClose` dispatches to the same safe confirmation dismissal |
| Confirmation outside tap | Shared dialog's existing backdrop calls the same safe dismissal |
| Discard Changes (destructive red text) | Invokes original `finishClose()`: `Keyboard.dismiss(); commands.cancel(token); onClose();` |

No action creates or saves a card. `commands.cancel(token)` ends only this Add capability; it does not discard the surrounding Canvas draft.

Each confirmation gets a per-editor sequence ID. Its callbacks act only while that ID is current. Keep Editing, repeated close requests, stale dismissed dialogs, repeated Discard taps and queued dismissal callbacks cannot execute a second destructive exit. The existing Add submission guard also rejects a stale Add CTA while confirmation is open. Existing submitting/image-processing exit guards remain in place.

## Nested presentation

Confirmation content is a sibling above the retained AddCardSheet surface inside its existing KeyboardAvoidingView/native Modal. The shared overlay intercepts form touches. AddCardSheet's existing accessibility masking and disabled parent backdrop remain active while confirmation is present; Android Back targets the confirmation rather than closing the form.

There is no second native Modal or Back listener, no form unmount/reset before explicit discard, and no StatusBar/SafeArea/translucency change. All approved shared components remain unchanged.

## Files

- `src/components/bemem/AddCardEditor.tsx`: narrowly scoped presentation migration and confirmation admission guard.
- `scripts/test-production-integration.cjs`: seven new checks; existing artwork-Cancel test updated to select the shared confirmation instead of native Alert actions.
- This report.

## Verification

| Check | Result |
| --- | --- |
| TypeScript | Passed |
| Focused production/form/dialog/sheet tests | **167/167 passed** |
| Full regression | **964/964 passed** |
| Android Hermes export | Passed; `.hbc` in `output/add-card-discard-android/` |
| `git diff --check` | Passed |
| Lint | Not run: no installed ESLint/config; no installation attempted |

New tests cover dirty/clean exits, role/copy mapping, retained Name/Number/EXP/size/orientation/front/back images, Keep Editing, Back/dismissal dispatch, stale/duplicate requests, image-busy admission, stale Add submission, and unchanged Saved/Storage/previously modified Canvas draft using the actual owner with mock storage.

Existing tests cover the actual shared dialog backdrop/Back/double-callback behavior and its same-window AddCardSheet layering, the five Phase1 flows, independent Edit behavior, Delete safety and the Phase2/3 foundations. Full regression also retains Save/readback, Share, QR/Barcode and other approved features.

Logs: `output/add-card-discard-focused.txt`, `output/add-card-discard-all-tests.txt`, `output/add-card-discard-android.txt`. Pre-edit hash manifest: `output/add-card-discard-baseline.json`. Only the two code/test files above changed within captured src/scripts/assets/design-system; none was deleted. Existing unrelated uncommitted work is preserved.

## Samsung acceptance

Reload the latest Expo Go bundle without clearing data:

1. Open untouched Add Card and Cancel: clean exit remains immediate.
2. Change Name/Number/EXP/size or images, then Cancel/X/Android Back: inspect the Pearl Gray dialog and safe primary Keep Editing versus red Discard Changes.
3. Choose Keep Editing; repeat with dialog Back and outside tap. Confirm every form value/image remains and no card is created.
4. Explicitly choose Discard Changes once. Confirm Add closes and existing saved cards and any unrelated Create draft remain unchanged.

Native touch layering, keyboard/focus behavior and visual appearance still need Samsung acceptance. Do not delete cards, migrate data or clear Expo Go for this test. No dependencies, original-website changes, Wallet writes on a device, Commit, Push or Deploy were performed.
