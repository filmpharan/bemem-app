# Delete Membership Card

Status: implemented; awaiting Samsung validation. No production card was deleted during development or automated tests.

## Flow

- Create → saved Membership Card → Card Detail → Delete Card (secondary destructive action below Edit).
- Home has no Delete action. Demo cards remain on their existing detail path and are rejected by the command layer.
- Confirmation: `Delete this card?`, the selected card name, and `This card will be permanently removed from your wallet.` Cancel is first and marked preferred on supporting platforms; Delete requires a separate explicit tap. Dismissal cancels the consent token.
- Dirty Canvas blocks deletion, just as Edit does. Close Detail and use the existing Save / Discard / Cancel flow before requesting deletion again.

## Existing writer integration

The existing feature command object adds `openDelete(id)`, `cancelDelete(token)` and `confirmDelete(token)`; no repository, coordinator or owner is duplicated.

Consent captures the saved membership card, revision and owner session generation in memory. Confirmation rechecks unlocked v2 admission, a clean draft, revision, generation and exact saved card identity. A synchronous attempted flag prevents duplicate submissions. Only the selected card and its canvas-layout entry are removed; all remaining card records, order, sizes, appearance and coordinates are preserved.

The existing owner receives this one Cards + Canvas draft and performs its original Save/readback. Success requires ready v2, revision +1 and an exact saved cards/canvas match. Only then does Detail close. Failure/commit uncertainty is not success and never retries automatically; existing blocked-wallet and Reinspect behavior applies. A failed operation can retain the proposed deletion in Draft under the existing owner failure policy; the committed Saved snapshot remains the source of confirmed data until reinspection resolves the result.

Home retains the selected membership snapshot while Detail is open, so its identity does not fall through to the Demo UI when an in-flight deletion removes it from Draft. This cache is presentation-only and is never written back.

Existing immutable revision retention and backups are unchanged. Removal from the current wallet is not secure erasure of historical snapshots or backups.

## Files

- `src/lib/wallet-feature-commands.ts`: deletion admission, consent, guarded Save/readback.
- `src/components/bemem/MembershipCardDetail.tsx`: confirmation, secondary action, busy/error/close handling.
- `src/app/index.tsx`: selected-detail snapshot fallback during deletion.
- `scripts/test-production-integration.cjs`: synthetic command/UI/storage integration tests.
- `scripts/test-card-detail.cjs`: hook mock support for the Detail action guard.

Add/Edit forms, schema, migration, backup, storage protocol, grid engine and code encoders were not changed.

## Validation

- TypeScript: passed.
- Read-only lint: 83 files, zero errors and warnings.
- Automated tests: 440/440 passed (12 added cases). All deletion tests use mock/in-memory storage and synthetic membership cards.
- Covered: cancel/dismiss/stale callbacks; Demo/missing IDs; same-ID removal; other members and coordinates unchanged; double confirmation; dirty draft, stale revision/generation, pending; write failure and commit uncertainty; readback and fresh-owner restart; Create-only UI; Home/Create/Search updates; final-card deletion leaves a genuinely empty wallet.
- No device wallet, network deployment or new dependency was used. No commit/push was made.

## Samsung manual validation

1. Reload the app; verify no Delete action on Home or Demo detail.
2. In Create, open a disposable membership card, tap Delete Card, then Cancel. Check the card/layout is unchanged. Repeat with Android Back dismissing the confirmation.
3. With unsaved Canvas changes, request deletion: confirm it is blocked, then use the original Save/Discard/Cancel flow.
4. Reopen a disposable saved member, confirm Delete Card. While saving, the action/Close/Android Back must not start another operation or dismiss Detail. Only confirmed success closes it.
5. Verify only that card is gone from Create, Home and Search. Other cards must retain their exact positions and dimensions. Restart without clearing Expo Go data and confirm the same result.
6. Native confirmation appearance, screen-reader focus and touch behavior still require real-device review. Use a card intentionally created for deletion testing; no existing Test Member is deleted automatically.
