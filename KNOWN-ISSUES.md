# bemem known issues and developer review

Reviewed 2026-11-23 against the uncommitted working tree. Automated mocks, Hermes export and owner acceptance are different evidence. This file does not authorize changing scheduling, storage or device data.

## A. Samsung Reminder delivery ? unresolved observation

Owner-reported issue: native Reminder notification delivery has not been confirmed on Samsung/Expo Go. The root cause is not established. `src/lib/keep-notifications-native.ts:4` configures a handler/channel and calls native permission/scheduling APIs; `keep-notifications.ts:9` records scheduled/denied/failed outcomes. Queue inspection does not acknowledge delivery. A successful schedule call is not proof the user received an alert.

Receiving developer: reproduce with explicit owner permission; record local timestamp/timezone, device/OS/Expo Go versions, permission/channel state, returned identifier, queue evidence and foreground/background behavior. Treat power restrictions, native configuration and development-runtime behavior as investigation candidates, not proven causes. Compare an approved development build if needed. Never reset Expo Go, cancel all notifications, reschedule old reminders or change real data as a diagnostic shortcut.

## B. Unsaved-media durability ? confirmed design limitation

`src/lib/keep-media-files.ts:10` keeps exact unsaved receipt ownership tickets in a JS Map. It reserves destinations before copy, checks integrity and cleans only owned/unreferenced files. Uncertain cleanup preserves the file and evidence in the live process. A process kill can lose those in-memory associations; durable cross-process orphan recovery is NOT implemented. SDK cache selections are ephemeral and are not saved drafts. Recovered picker results are not automatically imported without verified originating Card/Owner/session.

Do not claim zero orphan files after native crash/process death. A durable journal/recovery design is separate work requiring approval and failure-injection/device tests; never substitute a directory sweep.

## C. Pending native promises ? confirmed operational limitation

Notification enumeration/cancellation, media permission/picker/copy or cleanup may remain pending. `keeps-lifecycle.ts` observation timeout is not cancellation. Actual mutation/picker leases cannot be released on the timer to allow unsafe retries. Read-only Keeps loading and safe in-memory draft interaction remain separate from Save readiness. A pending unsafe operation can still require a guarded wait/Needs Review state.

## D. Untested conditions ? not established failures

- Fresh checkout plus `npm ci` has not been performed in this phase; passing on the existing installation is not fresh-install certification.
- Complete Android Activity recreation, process-kill, power-loss and multi-process behavior remain unverified.
- iOS device behavior, release-native binary/EAS build and store readiness are not certified by Android Hermes export.
- Native notification delivery remains open even when JS tests pass.
- Local-storage encryption/OS backup behavior and whole-history binary privacy are not certified.

## E. Handoff/tooling follow-ups

- `expo-asset` is directly imported in `src/lib/default-card-artwork-assets.ts:1` but currently provided transitively by Expo/lockfile. Current installation resolves it; explicit declaration is recommended later, not installed here.
- `package.json` has `expo lint` but no local ESLint/config. `scripts/lint-readonly.cjs` needs another existing tool directory. Do not auto-install dependencies during validation.
- Root LICENSE is an Expo MIT notice; Original bemem artwork and bundled third-party skills/fonts need explicit distribution-scope review. Preserve all attribution/notices.
- `KeepsSheet`/`KeepEditor` mix orchestration and presentation in compact code. Incremental separation may help later; broad refactoring before handoff adds risk.
- README/ARCHITECTURE/DEV-HANDOFF now describe current behavior. Older phase documents, RELEASE-BASELINE and design previews remain historical; do not implement their stale 7-size/header/entitlement rules over current code.

## Upload checkpoints

HUMAN APPROVAL REQUIRED for the two Card Detail reference JPEGs, unresolved artwork/third-party distribution rights, final candidate file manifest and private repository/collaborator scope. `origin` exists; private visibility could not be verified non-interactively. Already-tracked material remains in HEAD/history even if not staged now. Do not rewrite history or remove reviewed material without a separate plan and approval.

## Current accepted motion limitations ? 2026-11-23

M2, M3-A, M3-C, M3-B and M4-A are the completed owner-accepted motion scope. M3-B retains minor native Modal flicker explicitly accepted by the owner; no flicker-free claim is made. M4-B Add Card and M4-C Decorate intentionally receive no new transition.

ProfileSheet.tsx initial accessibility Promise and CardSizeCarousel.tsx initial accessibility Promise lack the eventSeen ordering guard present in M2?M4. An older result can override a newer Reduce Motion event. A deterministic in-memory Profile probe demonstrated an immediate reduced-motion open followed by a 250ms close after the older false result resolved. This is a known unmodified risk, not authorization to alter the accepted components.

Current owner instruction accepts existing repository visibility for developer review. Earlier private-only/human-review upload gates in this document reflect previous phases; preserve historical source/license notices, do not knowingly publish secrets or personal data, and do not interpret review access as a grant of unrestricted artwork redistribution rights.
