# Step 2C.5C — Repository Safety Gate and typed failures

Supersedes the pending-admission/error-collapse limitations recorded in Step 2C.5B **for cooperating v2 repository writers in one JS process**. No snapshot schema, filenames, Pending → Validate → Move → Readback protocol, native storage implementation, v1 storage or app runtime was changed. Import remains locked.

## Gate and pending ownership

The existing scope lock is acquired synchronously before transaction work. While holding it, Save and explicit future Import:

1. Read/validate the latest committed snapshot, reject all existing pending files and check expected revision.
2. Create a unique pending file exclusively; write and read it back as before.
3. Recheck latest snapshot/revision and pending inventory inside the SAME lock immediately before promotion.
4. Permit only the exact pending name created by this transaction. Any other pending blocks promotion. Missing own pending also blocks.
5. Promote without overwrite and verify the final destination before acknowledging success.

Rejected transactions never delete pending evidence, overwrite earlier revisions or retry automatically. A newly discovered foreign pending after our write leaves both pending files for explicit review. The UI must not interpret that as a successful Save.

## Uncertain outcomes and reinspection

An ambiguous promotion/final-readback error records a process-local uncertainty token keyed by storage scope. Other repository instances sharing the scope see the same barrier.

- `inspect()` includes additive metadata `requiresReinspection`; it does not acknowledge uncertainty.
- A new Save/import is rejected with `reinspection_required` while the barrier remains.
- Public `load()` is the explicit readback path. It clears the barrier only if the latest snapshot validates and no pending evidence remains. Internal transaction reads never clear it.
- Load captures the observed token before reading; a read started before a later uncertain failure cannot acknowledge that newer failure.
- Adapter Save preflight checks the flag BEFORE calling load, so pressing Save cannot automatically acknowledge uncertainty and retry the write in the same call. `readV2()`/owner reconcile remains an explicit read-only action.

If pending or a corrupt latest snapshot remains, reinspection cannot clear the barrier. No recovery deletion/restore is implemented. Across a JS restart this in-memory token is gone; filesystem pending and validation rules still apply, but no claim is made that a previous unacknowledged UI success/failure survives as a durable flag.

## Error mapping

| Repository/adapter condition | Typed kind | Code/detail retained |
| --- | --- | --- |
| Stale expected revision | `revision_conflict` | `revision_conflict` |
| Foreign/orphan pending | `pending` | `pending_requires_review` |
| Corrupt/unsupported/unreadable snapshot | `blocked` | e.g. `invalid_snapshot` + `validationCode: unsupported_schema` |
| Ambiguous commit | `commit_uncertain` | `commit_uncertain` or `reinspection_required` |
| Known pre-commit write/verification failure or busy save | `failed` | e.g. `pending_write_failed`, `pending_verification_failed`, `save_in_progress` |

Previously the adapter bridge mapped blocked/failed to generic `precommit_failure`. It now sends `WalletCoordinatorFailure(kind, code, validationCode?)` without collapsing categories. The legacy `precommit_failure` constructor remains supported for existing tests/callers and maps to failed.

Coordinator results return `ok:false` plus kind/code/detail. `getState().failure` preserves the same typed issue; Runtime Owner publishes it through its existing immutable snapshot. Invalid-source inspection results can also carry typed errors, so startup schema reasons are not lost at `invalid_v2`. Successful activation clears the previous failure. All five storage error categories close write admission; none are successful Save results.

Codes/details are structural constants, not raw native error messages, card names, membership numbers or payloads. No new error UI is implemented.

## Verification / boundaries

New mock tests cover pre-existing pending, pending injected after Adapter preflight, two same-scope writers, revision conflicts, own/foreign pending, unchanged committed bytes, uncertain retry barriers, stale reinspection races and end-to-end error reasons through Owner. Previous repository, model, diagnostics, consent, coordinator, runtime-adapter and Phase 1 suites are retained.

Concurrency limits remain: different scopes for the same folder, raw FileSystem writes, direct v1 writers, multiple app processes and native move races bypass this JS-process gate. No multi-process lock, fsync or complete crash/power-loss guarantee is claimed. v1 storage behavior is unchanged and its own pending/error API limitations remain as documented in the Writer Audit.

Single-owner runtime integration can now use these typed errors and the v2 repository gate, but still needs approval to replace all direct runtime writers, mount exactly one owner, connect Consent through that owner and validate actual activation/failure UI on Samsung. Do not unlock Import or connect Home/Create as part of this preparation step.
