# Multi-Canvas Foundation — implementation review

Historical implementation record: Home Swipe and its diagnostics were subsequently removed. See `HOME-SWIPE-REMOVAL.md` for current behavior. The page-aware data and editor foundation remain.

Status: implemented; physical Samsung review pending. No commit, push, deployment, installation, device migration, or phone-data reset performed.

## 1. Five pages, one Wallet

The existing Wallet v2 repository, transaction snapshots, revision checks, coordinator and runtime owner remain authoritative. Pages are logical projections of that one document, not five repositories or copied cards. Card and decoration IDs remain global. Each page has its own card positions, decoration positions and rotations. Collisions are checked within a page; identical coordinates on different pages are valid.

Optional additive metadata inside `canvas`:

```json
{
  "pages": {
    "version": 1,
    "assignments": { "existing-item-id": 2 },
    "selectedCount": 3
  }
}
```

Page IDs are 1–5; selectedCount is optional and, when present, must be 2–5. Assignments must reference existing cards or decorations. Unknown fields, invalid counts, invalid pages and dangling assignments are rejected by validation. Entitlement is not stored in this metadata.

## 2. Legacy compatibility and preservation

Wallet schemaVersion remains 2. A record without an assignment resolves to page 1. Reading a legacy document does not inject metadata or rewrite disk. There is no startup migration, duplicate-card creation, automatic page reassignment or layout reset. Existing card fields, media references, membership numbers, expiration, dimensions, IDs and coordinates remain unchanged. Decoration positions and rotations remain unchanged.

Tests verify repeatable legacy validation/projection without modifying the input, page-local mutations, unrelated-page preservation, failed-write preservation, and hidden card/decoration restoration. File hashes taken before this task confirm zero changes to existing artwork assets. No Samsung wallet was used for automated tests.

## 3. Central access policy

`src/lib/canvas-pages.ts` distinguishes existence, navigation visibility, locked preview, readability, editability and editor destinations.

| Status | Home | Create / Decorate | Page count |
| --- | --- | --- | --- |
| Free | Page 1 usable; neutral locked page 2; 3–5 hidden | Page 1 editable; page 2 locked destination | Unavailable; effective 1 |
| Active N | Pages 1…N readable/editable; higher pages hidden | Pages 1…N editable | Editable 2–5 |
| Expired N | Pages 1…N readable; next page locked if N<5 | Page 1 editable; 2…N locked; higher destinations hidden | Last N retained, disabled |

Expired 5 has no sixth preview. Invalid/missing entitlement fails closed to Free. Invalid persisted metadata produces a validation failure rather than deleting data. A trusted future Active/Expired provider without a preference derives a bounded count from stored assignments, at least 2; this fallback does not write a new preference. Hidden pages remain stored.

## 4. Public Free app — functional now

- Home has no visual page numbers, dots, arrows or upgrade banner on page 1.
- Rightward finger swipe from page 1 opens locked page 2. Reverse swipe returns. The pager does not wrap beyond available pages.
- Direction locking separates horizontal movement from vertical scrolling. Switching requires at least 64 dp horizontal travel and 2.2× horizontal dominance. The outer 24 dp screen edges are excluded to preserve native edge navigation. Card taps do not initiate page switching.
- Paging is disabled during Create, search and existing modal/editor interactions. Screen-reader page actions are attached to the existing Home wordmark button without adding visual navigation.
- Independent scroll offsets are retained in memory per page/mode and restored after content mounts. Fresh owner/startup begins on page 1. Successful editing returns Home on the edited page.
- Locked previews render a neutral canvas and restrained translucent layer, lock icon and Unlock action. Private cards are never rendered underneath this promotional surface.
- Unlock opens Membership / Coming soon with close and Android Back support. It grants no access and offers no checkout.
- Create's circular number follows the wordmark. Its compact popover lists other relevant destinations only. Free page 2 opens the locked presentation, with no Add/move/delete/editor access.
- Decorate uses the same number-selector family and access policy. A locked Decorate page does not construct a writable decoration session.

## 5. Future subscriber foundation

The application root owns one runtime/coordinator. The owner accepts an injected synchronous entitlement source; production composition retains the Free default. No account, login, billing or public entitlement toggle was added. The provider interface is a composition boundary, not proof of a purchase: a real trustworthy entitlement source is still required.

`CanvasPageCountSetting` is a reusable isolated future Profile component. There is no production Profile to replace. It is only exposed in the development fixture. Active preference changes save selectedCount through the existing Wallet snapshot writer, preserving all other page data. Free/Expired controls cannot change it.

Active 5 → 2 hides pages 3–5 without removing or rewriting their entities. Expiry keeps count 2. Reactivation keeps count 2; choosing 5 restores the original hidden contents. Tests include both cards and decorations.

Login Coming Soon and Policy remain unchanged. Cloud consent is separate: no cloud APIs, upload, sync, automatic backup or personal-data transmission were introduced.

## 6. Mutation, draft and writer safety

Page authorization is checked at action admission, runtime draft updates and guarded writer boundaries. A live admission callback is checked in the repository gate before pending creation and again immediately before promotion. Raw bundle-save paths are guarded as well; disabling a button is not the security mechanism.

The owner rejects changes to another page, reassignment of an existing item to a different page, and unrelated card ordering/content changes. Add placement uses only the current editable page. Edit preserves its original page and all unchanged fields. Delete removes only the selected item's assignment. Obsolete-brand cleanup is scoped to the current page so it cannot mutate hidden records.

Page/session generations invalidate stale Add/Edit/Delete callbacks. Existing revision conflicts, blocked, pending and commit-uncertain results remain distinct. No automatic write retries or pending deletion were added. Denial after pending creation retains the pending evidence and prior committed snapshot; reinspection/recovery is required through the existing flow.

Dirty Create and Decorate page switches offer Save / Discard / Stay. Save navigates only after verified success; failure keeps the original page and draft. Discard is an explicit memory rollback to Saved before navigation. Stay retains the draft. Explicit discard remains possible after entitlement expiry, but saving premium changes is blocked. Undo/Redo sessions are rebuilt per page and cannot affect another page.

## 7. Search, detail and Photo Journal

Search aggregates only readable pages. Reflow remains temporary and never changes saved positions. Opening a result focuses its source page. Hidden/locked-preview pages are excluded. When access disappears, detail lookup no longer returns that hidden card.

Readable expired Home pages retain existing card detail, flip, real QR/Code128, Full Card View, Share and journal viewing. Journal mutation admission and destructive-history preflight consult the live page policy. Add/delete/clear journal mutations on read-only premium pages are denied. Encoders, crop geometry and Share export logic were not rewritten.

## 8. Development-only simulation

Open `/dev-multicanvas` in Expo Go, for example `exp://<Metro-LAN-address>:8081/--/dev-multicanvas`. Start Metro with `npx.cmd expo start` and use its actual host/port. A non-DEV bundle redirects this route to Home.

The fixture seeds five synthetic cards into an in-memory file adapter and uses the real repository/owner logic. It does not read or write native wallet, history or media files. Switching fixture status cannot change the production owner's entitlement. The surrounding app provider retains its normal startup behavior; the fixture does not override it.

Available controls: Free / Active / Expired, Active page counts 2–5, Home/Create simulation, page selector, memory Save/Discard and memory decoration placement. Choose Active before changing the count. Expired retains the saved count. Card tap intentionally reports a synthetic fixture rather than opening native journal/media paths. Reloading recreates fixture data. Full production Decorate/Add/Edit flows are covered by command/component regression tests, not duplicated inside the fixture screen.

## 9. Files changed in this task

New production/foundation modules:

- `src/lib/canvas-pages.ts`
- `src/components/bemem/CanvasPageSelector.tsx`
- `src/components/bemem/CanvasPageCountSetting.tsx`
- `src/components/bemem/HomeCanvasPager.tsx`
- `src/components/bemem/LockedCanvas.tsx`

New isolated development modules:

- `src/lib/dev-multicanvas.ts`
- `src/app/dev-multicanvas.tsx`

Extended existing source files:

- `src/app/index.tsx`
- `src/hooks/use-wallet-canvas.ts`
- `src/components/bemem/HomeHeader.tsx`
- `src/components/bemem/WalletCanvas.tsx`
- `src/components/bemem/DecorateMode.tsx`
- `src/components/bemem/AddCardIcon.tsx` — lock outline only
- `src/components/bemem/CardHistorySheet.tsx`
- `src/lib/card-history-delete-native.ts`
- `src/lib/card-editor-state.ts`
- `src/lib/card-presentation.ts`
- `src/lib/decorate-session.ts`
- `src/lib/wallet-cutover-runtime.ts`
- `src/lib/wallet-feature-commands.ts`
- `src/lib/wallet-preparation.ts`
- `src/lib/wallet-production-policy.ts`
- `src/lib/wallet-repository.ts`
- `src/lib/wallet-runtime-owner.ts`
- `src/lib/wallet-storage-adapters.ts`
- `src/lib/wallet-validation.ts`
- `src/types/wallet-document.ts`

New tests: `scripts/test-multicanvas.cjs`, `scripts/test-canvas-page-ui.cjs`.

Existing test harnesses adjusted for the header/editor composition: `scripts/test-header-layout.cjs`, `scripts/test-decorate.cjs`. `scripts/test-decoration-frames.cjs` retains artwork/catalog/renderer integrity checks, exempting only the two intentionally extended behavior files from the old trial's frozen source hashes.

Existing unrelated uncommitted work is preserved. No dependencies or package/config changes were made by this task. The original website was not edited. Reports/logs and local bundle artifacts are under `output/multicanvas-*` and this document.

## 10. Validation

| Check | Result |
| --- | --- |
| `npx.cmd tsc --noEmit` | Passed |
| Focused Multi-Canvas model/command/component tests | 40/40 passed |
| `node --test --test-isolation=none scripts/test-*.cjs` | 884/884 passed; 0 failed/skipped |
| Android Hermes export | Passed, exit 0; 3.9 MB HBC |
| Lint | Not run: no configured ESLint package/config; no tooling installed |
| Existing artwork hash comparison | 0 changed assets |
| Physical Samsung gestures/performance | Pending user test |

Logs: `output/multicanvas-focused-combined.txt`, `output/multicanvas-all-tests.txt`, `output/multicanvas-android-bundle.txt`. Local bundle: `output/multicanvas-android/`. The first export completed but an unrelated npm update notice caused a PowerShell error result; the confirming export suppressed that notice and returned exit 0 with an empty stderr file.

## 11. Limitations and remaining work

- PanResponder direction thresholds, ScrollView cooperation, TalkBack custom actions, enlarged fonts, popover positioning and Android Back must be checked on physical Samsung. Automated interaction tests cannot establish native gesture performance.
- Page transitions switch the displayed surface without a native animated paging track. No new animation/gesture dependency was installed.
- Scroll offsets are session memory only; launch intentionally returns to page 1.
- Page metadata is readable by this build and additive for legacy documents. Older builds with strict unknown-field rejection may not accept a newly saved multi-page document; do not downgrade to an old writer after future premium activation.
- Admission guards and the existing repository lock operate inside the JS process. They do not guarantee multi-process exclusion or 100% crash atomicity. An already issued native move cannot be revoked by a later entitlement change. Existing uncertain-commit recovery remains necessary.
- Retaining hidden content is a data-preservation policy, not encryption of local files or protection against a modified client. Billing verification, expiry/offline entitlement caching, account lifecycle and explicit Cloud consent require separate future implementation.
- No physical wallet backup/import/cutover, paid activation or cloud workflow was performed as part of this task.

## 12. Samsung review workflow

1. Reload the latest Expo Go bundle without clearing data. Confirm existing cards/artwork/decorations remain in their old positions on Home page 1. Verify tap, vertical scroll and search.
2. Swipe right from the central canvas area to locked page 2. Verify no private card content appears. Tap Unlock → Membership / Coming soon; close with X and Android Back. Swipe left to page 1.
3. Enter Create. Check the circular current-page number after bemem. Select page 2: Add/drag/edit are locked. Return to page 1, move a test card and exercise Stay/Discard/Save when switching. Failed save must retain its draft.
4. Open Decorate and check its number selector, locked page behavior and unchanged circular controls/drawer. Exercise dirty confirmation and verify Undo/Redo remains local to the current page.
5. Open `/dev-multicanvas`. Choose Active and 5, inspect synthetic pages, reduce to 2, choose Expired (page 2 readable in Home but editing locked, page 3 neutral preview), then Active and 5. Confirm hidden contents return. This simulation uses memory only and does not grant production membership.

Stop here for user review. No subsequent feature implementation or production entitlement activation is authorized by this delivery.
