# Edit Card — shared Add Card UI

Status: implemented; awaiting Samsung visual and keyboard review.

## Scope

- `AddCardForm` defaults to create mode; edit mode uses the same form tree, field components, styles, preview and tool rail.
- Both editors use the existing `AddCardSheet`, including safe area, keyboard avoidance, scroll and Close/Android Back handling.
- Edit passes the opening membership snapshot for its original appearance and prefilled size/brand/expiration. Legacy missing country/brand remains visibly unspecified.
- Editable fields: Card / Store name, Membership number / Phone number, Expiration date (optional). Leave expiration blank for no expiry.
- Size/orientation, country, brand, artwork, preferred code and color are read-only in Edit. Short read-only notes are shown. Front/Back is a local preview interaction only.
- The existing code value is preserved until the membership number changes; then the preview reflects the exact new membership number. No trimming, number conversion or case conversion.
- Main Edit action: Save Changes. Cancel remains explicit. The existing dirty confirmation, busy lock and failure/reinspection behavior remain in the editor.

## Persistence

No changes to feature commands, Single Writer, repository, schema, migration, backup, grid or encoders. Edit still uses the existing edit token, original card ID, validation, Save and verified readback. Unsupported visual fields never become editable, and the shared form also restricts callback updates in edit mode.

## Validation

- TypeScript: passed.
- Read-only ESLint: 83 files, 0 errors, 0 warnings.
- Automated tests: 428/428 passed, using synthetic data and mocked storage.
- Android export: bundle and metadata generated, 1498 modules; `.expo/edit-card-shared-ui-review/`. CLI remained open after reporting `Exported`, so it was interrupted; this was not a clean CLI exit.
- No device wallet files were accessed by these tests. Native keyboard behavior and visual parity on Samsung remain manual checks.

## Samsung review

1. Reload the current Expo Go bundle. In Create, open a saved membership card and tap Edit Card (save/discard existing canvas changes first if the current edit admission guard requires it).
2. Compare the form with Add Card: preview, tool rail, size/orientation controls, country/brand, field spacing and sheet scrolling should match. Read-only values must remain visible.
3. Edit name, raw member number (for example a synthetic value with leading zeros/spaces/mixed case) and expiry. Save Changes must update the existing card without changing its count, grid position, size or artwork. Reopen Detail and confirm the number/code payload.
4. Open Edit again, change a field, then Cancel, Close or Android Back. Keep editing must preserve the form; Discard changes must not write it.
5. Check Samsung normal/enlarged fonts and keyboard focus: name → member number → expiry. Scroll to Save Changes with the keyboard open. Try both portrait and landscape card previews.
6. Check Add Card still supports normal size/brand/color/code editing and its original Add Card → draft → Save flow.

No dependencies, commit, push, deployment, wallet reset or website edits were performed.
