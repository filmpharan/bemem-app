# Edit saved Membership Card — implementation

Status: implemented; awaiting Samsung acceptance with Test Member. Automated tests use synthetic data only. No real wallet was read/written/reset during development.

## User path

Home remains read-only. Enter **Create**, tap a saved membership card, then **Edit Card** below the existing History area. The approved Detail layout and code controls remain in place. The form preloads the selected card's name, exact membership number and optional expiration month. It has Save, Cancel and No expiry, English labels, existing Lagoon buttons/fonts and48dp minimum input/action areas.

Editing requires active/unlocked Wallet v2 and a **clean Canvas Draft**. Save or discard earlier canvas/add-card changes before opening Edit. This avoids the existing snapshot writer unintentionally committing an unrelated layout change together with an edit. Unsaved/new cards and Demo cards cannot enter this saved-card editing path. V1 is not imported or activated automatically.

Save returns to Card Detail only after the existing coordinator save/readback and verification have succeeded. The detail reads the updated card from the same owner; returning Home shows the updated name/number. Existing Create/Home navigation is unchanged. No new DEV route/harness, repository, owner, provider, schema or transaction protocol was added.

## Data and code rules

- `membership-card-edit.ts` patches only changed name, membership number or expiry; updatedAt advances for an actual edit. ID, createdAt, preferred format, dimensions, orientation, artwork/image reference, brand/country and other fields remain intact.
- A changed membership number is stored as the exact string and becomes the exact code payload. The form explains that this also updates QR/Code128. Zeros, whitespace and case are never trimmed or parsed as a number.
- If only name/expiry changes, an existing custom payload is preserved. If a preferred-Code128 card's new number contains unsupported characters, validation reports it; no format/payload conversion occurs silently.
- Optional expiration uses the existing YYYY-MM/empty validator. No expiry is stored as empty only when the value actually changes. Legacy fields that were absent stay absent; existing legacy size resolution is unchanged. A legacy null member number remains null when its field is not changed.
- The edit capability captures current generation/revision/card at form opening and checks them again before admission. Cancel or a stale form cannot write. Save uses a synchronous duplicate-submit barrier, replaces the matching ID in the current saved snapshot, and calls the existing owner's updateDraft/save commands.
- Cards and Canvas remain one repository transaction. No card is appended and no position/size is changed. Success verifies v2 ready state, revision+1, the edited card, unchanged canvas and unchanged other cards after the existing repository/coordinator readback.

## Failure and Cancel behavior

Before Save, edits exist only in local form state. Cancel/Close/Android Back on a dirty form offers Keep editing or Discard changes; no file write occurs. Save/busy closes admission synchronously and blocks dismissal/duplicate presses. Existing KeyboardAvoidingView, safe area and scroll support are reused from AddCardSheet; no keyboard flags or native settings are changed.

A failed/uncertain Save never invokes success. Typed input remains visible, write retry is disabled, and the user can close toward the existing wallet Reinspect flow. The owner may retain the attempted edit in Draft, exactly as its existing save-failure policy requires; closing is not a rollback or a disk restore. Precommit failures keep the previous Saved snapshot. Commit uncertainty may mean disk contains the new revision, so explicit reinspection is required. There is no automatic retry, reset, reimport or migration. No failures are induced against Samsung files for testing.

## Files

Production additions:

- `src/lib/membership-card-edit.ts`: three-field patch/validation, preserving legacy and unrelated fields.
- `src/components/bemem/EditMembershipCardEditor.tsx`: controlled native form, confirmation, busy/double-submit guard and honest failure UI.

Production updates:

- `src/lib/wallet-feature-commands.ts`: openEdit/saveEdit/cancelEdit capabilities using the existing owner/writer.
- `src/components/bemem/AddCardSheet.tsx`: optional title, close lock and modal-only rendering; default Add Card callbacks/layout remain unchanged.
- `src/components/bemem/MembershipCardDetail.tsx`: replaces the Create-only edit placeholder with the actual entry; returns to verified updated Detail or closes toward wallet recovery after failure.
- `src/components/bemem/CardPreview.tsx`: forwards the existing feature-command capability.
- `src/app/index.tsx`: one prop wires that capability; no Canvas/navigation logic change.

Tests updated: `scripts/test-production-integration.cjs`, `scripts/test-card-codes.cjs`, `scripts/test-card-detail.cjs` (new editor leaf mock only). This report is new.

Unchanged: Wallet schema, v1/v2 storage adapters/repository/transaction gate/coordinator/backup/migration, grid/automatic placement, encoder and barcode aspect-ratio fix, original website, package manifests/dependencies. Before/after source hashes confirmed the limited file scope. No commit, push, deploy, device data clearing or Expo Go uninstall.

## Verification

- TypeScript passed; read-only ESLint83 files, zero errors/warnings.
- Automated suite **422/422 passed**. Production integration40; code/decoder35; native Card Detail19; existing form47.
- Added11 integration/UI cases and1 independent encoder/decoder edit round-trip. Covered same-ID/count preservation, exact metadata/layout, save/readback/fresh-owner restart, Cancel and validation with no writes, custom payload preservation, legacy size fields remaining absent, dirty/v1/demo/stale blocking, duplicate save, pending, write failure, commit uncertainty without retry, actual editor prefill/dirty confirmation/Save, and failure input retention/recovery exit.
- Both real encoders decoded back to the edited value with zeros/spaces/case intact. The app still uses the existing encoder; the test decoder remains dev-only.
- Android offline export succeeded: `.expo/edit-membership-card-review/` (1498 modules).

This does not establish physical Samsung keyboard, native alert/Back behavior, scanner reliability or OS restart durability. Those remain the device acceptance step.

## Samsung acceptance

1. Reload the same Expo Go project. Do not clear app storage, reinstall or reset anything. Use active Wallet v2 with a saved synthetic **Test Member** card; Demo and memory-only DEV cards are not this production saved-card path.
2. Enter Create without moving cards. Tap Test Member, then Edit Card. Confirm original values, including leading zeros.
3. Change name, number (for example `000987654321`) and expiration month or No expiry. Tap Save once, then try a quick second tap. Wait for the form to close and the updated Detail to appear.
4. Confirm the same card/position/size/artwork, updated number/expiry and no extra card. Scan both QR and Code128 with a separate scanner/device and compare the new exact number. Return Home and confirm updated display; close/reopen the app to verify persistence without reimport.
5. Reopen Edit, change a field and press Cancel or Android Back. Keep editing must retain the field; Discard changes must return without modifying Saved. Try invalid month/blank name and confirm field errors with no success.
6. Test normal/enlarged fonts and Samsung keyboard; inputs and Save/Cancel must remain reachable by scrolling. Verify Home offers no Edit action, and existing Create Draft changes require Save/Discard before editing a saved card.

Stop after device testing and collect feedback before adding any other feature.
