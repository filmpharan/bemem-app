# Phase 2 Step 2 — Form adapter and isolated runtime integration

Status: DEV integration complete; **production cutover/import not approved or enabled**.
Baseline: `c500a015cfc80bd6a63c88d3848562b33f02faa3` remains unchanged.

## Scope and actual data path

`/dev-add-card` checks `__DEV__` before mounting `DevAddCardRuntime`.
The reusable, approved `AddCardForm`, `AddCardSheet`, icons, measured text,
preview geometry, radius and controls remain unchanged.

Explicit Add Card:

1. Controlled `CardFormValues` plus `CardPresentationDraft` enter `adaptCardForm`.
2. Existing `prepareCardForm` validates required strings, color and code rules.
3. Adapter uses the canonical preset for exact dimensions and calls
   `validateNewMembershipCard`, not the permissive legacy-reader contract.
4. The existing `firstFreePosition` scans row-major, using full logical blocks.
5. A complete candidate WalletDocument is validated before `owner.commands.updateDraft`.
6. The existing owner/coordinator keeps the Saved snapshot separate from Draft.
7. Existing `WalletCanvas` renders the detached DTOs; long-press movement uses the
   same geometry and 350 ms interaction implementation. Draft movement is also
   checked before passing the complete document to the owner.

Mapping preserves exact name, membership number, payload, preferred code and
orientation; no trim, number conversion, case conversion or automatic format switch.
Size ID/dimensions come from the same seven presets. Default remains Card Landscape
6×4. Country is TH; brand ID/query and YYYY-MM-or-empty expiration are preserved.
The current form selects its gradient through brand selection: gradient-capable
brands map to their existing ID; other/custom brands map to null. Front/Back is a
transient viewing choice, not a lost persisted field. Payload-tracking state and
color-selection IDs are form state; the resulting actual color values persist.

The current form has no functional image input. Image/Camera remain disabled.
`imageAssetId` is null; unexpected image/extra input fields are rejected explicitly,
not silently dropped. No image persistence or encoding capability is claimed.

IDs are scoped to the DEV runtime and checked against current card IDs. A submission
token is consumed once; cancelled, repeated or old-generation tokens cannot add cards.
All validation failures leave both Draft and Saved unchanged.

## Single owner and writer

One screen owns one `createWalletOwnerScope`, instantiated once with React lazy
state. It is **not** a Provider mounted in the production application.

Composition reuses:

- `resolveWalletStartup`: only reads the synthetic in-memory repository; its v1
  reader returns null. An empty wallet's initial timestamp is stable across failed
  save/reinspection, so the coordinator can recognize the unchanged Saved snapshot.
- `createWalletStorageAdapters`: translates expectedRevision and typed errors.
- `createWalletOwnerScope` / `WalletCoordinator`: synchronous save admission,
  generation checks, immutable whole-session activation, and failure lock.
- `createWalletRepository`: the original pending → validate → exclusive promote →
  committed readback protocol, revision gate and pending/uncertainty handling.
- `createDevWalletMemory`: only a Map transport implementing WalletFiles, **not a
  second repository**. It imports no native filesystem/storage module. The screen
  receives no raw repository/file writer. Its only write command is the owner Save.

No data is written to Documents, Cache, production v1/v2 namespaces or the earlier
device-test sandbox. There are no network, analytics or console payload operations.
Tests additionally use memory-only fault injection and fixture seeding; those
capabilities are not exposed in the screen.

`Test Save` resolves successfully only after the existing repository's final
readback AND successful runtime activation. Concurrent and no-op duplicate saves
are rejected. Failure is never displayed as success. Reinspect reads status and
does not automatically retry a write, promote pending files or delete evidence.
`Verify readback` is allowed only for a clean idle draft and checks the returned
snapshot against Saved. A changed snapshot is reported as changed, not verified.

## Samsung / Expo Go

Run from the app directory:

```powershell
npx.cmd expo start
```

Use the LAN address printed by Expo, e.g.
`exp://<computer-LAN-IP>:8081/--/dev-add-card`, in Expo Go on the same network.
The exact host/port comes from the running server; this task does not start a server
or change the Home navigation to add a shortcut.

Use fictitious values only, e.g. `Synthetic Club`, `000Ab c`, and an independently
edited code value with leading/trailing spaces.

1. Add Card opens with the approved compact form. Invalid fields/code128 payloads
   show feedback. X/backdrop/Android Back cancel the form without adding a card.
2. Submit valid fields: the form closes and a card appears at the first free block
   in the DEV Canvas. Status says `Added to test draft. Not saved.`
3. Add multiple sizes; confirm old cards stay in place and footprints do not overlap.
   Tap opens the existing visual-test preview, not a real QR/Code128 detail screen.
   Hold 350 ms to move a card; normal Canvas scrolling should not start a drag.
4. `Discard Draft` restores Saved, removing unsaved cards and their positions.
5. `Test Save` advances revision and clears dirty status after successful readback.
   `Verify readback` reads the Map snapshot and compares it to Saved. Add another
   card and Discard: the previously saved test cards must remain.
6. Leaving this route or reloading JavaScript loses **all test memory**, including
   simulated Saved snapshots. This is intentional and is not disk persistence.
7. Return to Home: the existing real Phase 1 wallet/layout remains on its original
   runtime and writer. No production import/cutover or save entry point changed.

Real Samsung visual/keyboard/touch checks remain for the user. Real filesystem,
process-restart durability and native crash safety are **not verified by this flow**.
The automated restart test constructs a fresh owner/resolver over the same Map,
simulating repository reload; it does not claim persistence after Expo Go closes.

## Visual limitation kept deliberately within scope

Add Card's approved preview displays its existing brand gradient. The complete
gradient ID is preserved by the adapter and repository. The current generic
`walletCanvasPresentation` still projects membership artwork as the stored base
color; the shared Phase 1 renderer and generic preview are unchanged. Thus this
milestone validates gradient **data** and the existing form preview, not full
membership artwork/detail rendering after Save. No fabricated scannable codes exist.

## Verification

- TypeScript: `npx.cmd tsc --noEmit` — passed.
- Read-only ESLint using already installed tools: 63 files, 0 errors / 0 warnings.
- Automated tests: **278/278 passed**, including 28 new adapter/runtime tests and
  an updated existing route assertion. Mock/fixture tests use synthetic data only.
- Android export: passed, `.expo/dev-add-card-runtime-review/metadata.json` and
  Android JavaScript bundle generated offline, without bytecode. This is an export,
  not an installed development build or a physical-device test.

Coverage includes seven presets, exact raw strings, optional brand/expiration,
invalid field types and unsupported image fields, placement/collision, cancellation,
Discard, duplicate submissions/saves, old-generation callbacks, Saved/Draft cloning,
repository readback/reload, write failures, pending-only states, revision conflict,
post-promote readback uncertainty/reinspection, corrupt/unsupported snapshots,
legacy v2 read preservation, v1 demo migration preparation and the still-locked
existing owner import command. Existing coordinator/repository suites additionally
cover commit/activation separation, activation retry and v1/v2 writer barriers.

## Cutover readiness — separate future approval required

This DEV composition does not close any production-writer bypass discovered in the
earlier Writer Audit. Do not enable Import merely because these tests pass.

1. Approve production composition and error UI. One root owner must own every
   startup, Save, exit-save and asynchronous callback capability. Remove direct
   v1/v2 writer access from Home/Create/development import paths. Test Android Back,
   Save/Discard/Cancel and remounts through that owner before enabling cutover.
2. Resolve unsaved Draft explicitly. Synchronously close edit/save admission and
   advance generation; drain any already admitted save before reading final v1.
3. Reinspect latest v2/pending state and reread v1 with its original reader and
   validator. Compare the user's consent preview with fresh revision AND full
   contents. Block on change, pending, corrupt/unsupported v2 or >240-row geometry.
   Never truncate or reposition source data.
4. Prepare v2 in memory using the existing migration. Compare every demo ID,
   color, orientation, coordinate, revision and savedAt to v1. Preserve demo kind;
   do not invent a membership number. New snapshot transaction metadata must be
   distinguished from source metadata. Legacy v1 is never changed, moved or deleted.
5. Only after separate explicit consent may the approved import capability write
   one v2 transaction. Reread and validate the committed v2 snapshot; do not trust a
   flag or a cached preview as the source of truth. A second import is rejected.
6. Install Saved, Draft, source, revision, repository and generation as one runtime
   bundle. Keep edits locked until activation succeeds. If storage committed but
   activation failed, retry verified activation only—never reimport or reopen v1.
7. For commit_uncertain: keep the lock and evidence, explicitly reinspect the
   latest committed/pending state. Never auto-retry or silently fall back to v1 or
   an older v2 revision. Recovery of unresolved pending/corrupt data needs separate
   user-approved recovery procedures. Revision conflicts retain the local draft.
8. Future startup must choose a valid latest v2 authoritatively; corrupt v2 blocks.
   A pending-only namespace is not writable empty data. With neither v1 nor v2,
   prepare an empty wallet in memory and write only on explicit Save.
9. Validate fixture cutovers and failures first (existing coordinator suites), then
   approve a controlled Samsung rehearsal separately. Address old app bundles
   still able to write v1, offline behavior, OS backups, unexpected JS-process
   restarts and the current 240-row production compatibility gate before rollout.

JS-process admission/repository locks do not provide OS/multi-process locking or
guaranteed atomic native crash durability. This memory-only test does not reduce
those previously documented limitations.

## Files in this step

Created:
- `src/lib/card-form-adapter.ts`
- `src/lib/dev-add-card-runtime.ts`
- `src/components/bemem/DevAddCardRuntime.tsx`
- `scripts/test-add-card-runtime.cjs`
- `PHASE2-FORM-RUNTIME-DEV-INTEGRATION.md`

Modified:
- `src/app/dev-add-card.tsx` — DEV guard / isolated screen mount only.
- `scripts/test-card-form.cjs` — route mock/expectation follows the new DEV wrapper;
  existing layout/icon/text/preset/radius tests remain intact.

No approved Add Card layout component, Home/Create, production startup/writer,
wallet schema, repository protocol, import lock, Canvas geometry, search, original
website, dependencies or historical design documents were changed in this step.
No commit, reset, revert, push or deploy was performed. Existing uncommitted Phase
1/2 work is retained.
