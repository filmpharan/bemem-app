# Phase 2 Step 5 — Real application integration

Status: **Home/Create production integration implemented. Release cutover is locked.
Scannable code encoders remain pending dependency approval.**

Baseline is still `c500a015cfc80bd6a63c88d3848562b33f02faa3`; previous uncommitted
Phase 1/2 work remains present. No reset/revert/commit/push/deploy was performed.

## Real App Root and writer routing

`src/app/_layout.tsx` mounts exactly one `WalletRuntimeProvider`. The Provider lazily
constructs `createDeviceWalletRuntime` once for that root and initializes the
existing resolver/coordinator/owner. Home/Create subscribes through
`useSyncExternalStore`. This is no longer a DEV-only runtime preparation.

`useWalletCanvas` now owns only navigation mode, exit-dialog state and transient
messages. Saved/Draft documents, cards, revision, generation, source and save
admission live in the existing owner. Its direct `canvasStorage.load/save` calls
and duplicate layout reducer state have been removed. The actual storage engine
and original v1 writer are unchanged.

Native composition supplies:

- Existing v1 `canvasStorage` reader/writer in `Documents/bemem-phase1-canvas/`.
- Existing v2 repository/adapter in `Documents/bemem-wallet-v2/`.
- Read-only original raw v1 source + committed filename + pending inventory.
- A lazy exclusive native backup adapter in `Documents/bemem-pre-cutover-backup/`.
- The original preparation/runtime safety layer; no second repository or grid.

Before cutover, the owner routes saves to v1 only. After an approved committed,
verified cutover, it routes to v2 only. Existing DEV diagnostics retain read-only
source access; device test tools retain isolated namespaces. No UI hook holds a
raw writer capability.

Startup and search write no storage. An empty legacy installation under the locked
release uses the existing demo manifest/initial layout in memory at revision 0,
not a fabricated committed v1 file. A narrowly explicit `initialV1` inspection
marker permits that unpersisted state. The first explicitly requested layout Save
still uses original v1 expectedRevision=0. Once v2 activation is approved, a truly
new installation with neither v1 nor v2 resolves to the existing empty v2 document,
without a startup write.

## Hard release gate — still OFF

`src/constants/wallet-release.ts` contains:

```ts
export const PRODUCTION_WALLET_V2_APPROVED = false;
```

It is not an environment variable, route param, checkbox or persisted migration
flag. Opening any screen cannot change it. It guards public cutover requests,
the preparation import capability, native backup writes and v2 runtime activation.
Even bypassing the public request wrapper cannot create a backup or import while
it is false. Existing committed/corrupt v2 never enables a fallback v1 writer; an
unapproved v2 activation locks rather than silently selecting v1.

**No real Samsung backup, import or cutover was executed.** Tests replace native
modules/configuration with synthetic fixture implementations inside Node's loader.
The actual source release constant remains false.

## Add Card → Draft → Save → Home

The real Create FAB now opens `AddCardEditor`, which reuses the approved
`AddCardSheet`, `AddCardForm`, measured labels/icons, layout constants and preview.
There is no duplicate form layout or additional test harness.

`createWalletFeatureCommands` supplies submission-scoped IDs and generation checks
around the existing Form Adapter. New fields, dimensions and payload pass
`validateNewMembershipCard` and existing production placement policy before the
complete candidate document reaches owner Draft admission. Repeated/cancelled or
old-session confirmation tokens cannot add another card.

After approved v2 activation:

1. Add Card validates fields and all seven presets and adds only to Create Draft.
2. Existing row-major automatic placement reserves full logical footprints and
   never moves existing cards. Full 240-row capacity is an explicit error.
3. The card appears on the actual shared WalletCanvas in Create. Add does not save.
4. Save invokes the owner/coordinator and original v2 transaction repository.
5. Only successful committed readback/runtime activation returns navigation Home.
6. Home projects Saved cards and positions from the same owner, including old demos.
7. Startup reopens the committed v2 document after a new application session.

While the source is still v1, the form opens and validates, but valid submission
states that membership cards await Wallet v2 activation. It does not add an
unsaveable membership card into v1 or pretend to save one. Existing v1 layout saves
continue to work through the owner and unchanged v1 writer.

The form maps Country TH, current brand/search choice, YYYY-MM expiration, actual
gradient preset and seven size IDs/dimensions. Independent code values, leading
zeros, whitespace and case are preserved. Gradient selection remains the approved
form's brand/artwork choice; no new picker/redesign is invented.

## Saved/Draft, navigation and search

- Home cannot drag/edit; Create keeps original 350 ms long-press interaction.
- Save/Discard/Cancel retains the existing dialog/navigation semantics. Discard
  restores Saved cards AND layout, including removal of newly added unsaved cards.
- Cancel leaves Create and its Draft intact. Reentering Create after a Home remount
  resumes an owner-held dirty Draft rather than silently replacing it with Saved.
- Async save completion cannot send an unmounted screen Home or navigate after a
  successful save from an obsolete generation.
- Existing Android Back/overlay ordering remains in place. Add/detail/consent
  sheets handle their own native `onRequestClose`.
- Search operates on Saved cards, shows only matches, and reflows from top-left.
  Clear restores saved coordinates. No search write occurs. An impossible bounded
  presentation reports an error and explicitly displays Saved layout instead of
  truncating/mutating data or crashing the screen.
- Header, FAB locations, radius 14, inset 0.1, square grid, dots, 12 columns, no
  overlap and 240-row production bounds remain unchanged.

## Consent and native backup readiness

Create in v1 has a small `Wallet v1 · Review Wallet v2` entry. Review is a manual
read-only action. It requires clean/ready v1 with a committed revision, no existing
v2/pending/uncertainty, and fresh raw source equal to owner Saved. It displays only
source, revision, card count, pending/compatibility status, never code payloads.

The panel explains source preservation, supports explicit acknowledgement and
Cancel, and contains the wired future backup/import/activation action. That
action remains disabled by the release gate even after acknowledgement. Consent
alone never writes a file.

When separately approved later, the existing Step 4 sequence performs the actual
exclusive native source-copy write, byte readback, fresh source/revision comparison,
repository import/readback and complete activation. The filename-validated backup
adapter has no delete/source-write capability and never overwrites an existing
backup. Failed backups are retained; no automatic retry or cleanup exists.

Pending or uncertain writes lock the owner. Reinspect explicitly reads current
status; it does not retry Save or Import. Activation failure exposes verified
activation retry rather than reimport. Existing v2 remains authoritative after
commit; going back to v1 is not recovery of new v2 data.

## Card Detail source parity and implementation

Original website was read only:

- `src/routes/index.tsx:795` — Scan sheet title, Share, Close and conditional Edit.
- `src/routes/index.tsx:1016` — `ScanView` order and behavior: white code area,
  Barcode/QR toggle, expiry/card/flip row, raw membership number, history action.
- `src/components/Barcode.tsx` — JsBarcode CODE128 encoder.
- `src/components/QRCode.tsx` — qrcode encoder.
- `Sheet` in `src/routes/index.tsx:34` — bottom aligned, 92% maximum, scroll, padding20.

`CardPreview` keeps original demo preview behavior and dispatches membership cards
to `MembershipCardDetail`. It receives the actual saved/draft MembershipCard from
the owner; no payload is placed into Canvas DTOs. The detail uses the same source
order, a white code area, 144-unit portrait preview, actual card appearance/gradient,
front/back flip, expiration and exact selectable membership string. Close, outside
tap and Android Back use the same dismissal. Only Create shows Edit coming soon.

Share and History/Receipts are clearly non-interactive Coming soon labels. There
is no false working button, fabricated history, code image or scan-success message.
No new visual concept replaces the original; compact source geometry and current
Pearl Gray controls remain the basis. Native text wraps instead of ellipsis.

### Encoder boundary — NOT completed

No working QR/Code128 encoder is currently a direct dependency of the mobile app.
Installed `toqr@0.1.1` is an Expo toolchain transitive package, not a stable declared
application dependency; it does not provide Code128. The website's encoder
packages are only in the read-only sibling project. They were not copied/vendored
into this application or installed implicitly.

The detail therefore states `Code display is not available yet. No scannable code
is shown.` Switching format changes the requested display mode only; it does not
claim generation. Unsupported Code128 payloads disable that choice and retain the
original payload. **This milestone cannot yet be used for checkout scanning.**

Proposed minimal established encoder pair, matching the original website:

- `qrcode`: use its matrix/create API, not browser canvas/network rendering.
- `jsbarcode`: retrieve CODE128 encoded values for app-side rendering, not DOM SVG.

Primary API references: [node-qrcode](https://github.com/soldair/node-qrcode#api),
[JsBarcode object encoding](https://github.com/lindell/JsBarcode#retrieve-the-barcode-values-so-you-can-render-it-any-way-youd-like).

After separate dependency approval, inspect Metro/Hermes entry points and lockfile,
then render crisp black codes on solid white with quiet zones using the installed
expo-image SVG capability or another already available renderer. No WebView, no
server or browser DOM is needed by this proposed rendering path. Exact scan
reliability, byte/ECI handling, capacity and Code128 width must still be verified;
do not claim SDK58 compatibility or scan success solely from Node encoder tests.
No package was installed or added to package.json in this step.

Image references are preserved by the model, but importing/resolving arbitrary card
artwork and image picking remain unimplemented. The generic Canvas currently shows
stored base colors; the form/detail preview uses stored gradient data. No new
gradient-rendering system was introduced.

## Verification

- TypeScript passed.
- Read-only ESLint passed: 75 source files, 0 errors / warnings.
- Automated tests **345/345 passed**, including 17 new production-integration tests.
- Android export succeeded: `.expo/production-feature-integration-review/metadata.json`.
- Existing regression tests were updated only where their old assertion required
  the now-removed direct v1 hook writer or omitted the new membership-detail branch.

New tests execute the actual native composition against a strict mock filesystem,
the actual React hook against controlled hook state/context, and the actual Home
component with host-native leaf components mocked. They cover startup-no-write,
release gate/bypass blocking, revision-zero legacy bootstrap, unchanged v1 saves,
exclusive native backup adapter behavior, all seven form→draft→save→Home→reload
sizes, duplicate confirmation prevention, Saved/Draft, Discard/Cancel, preserved
dirty remount, Android Back/dialog binding, search/clear, real detail props and
flip/dismiss, commit uncertainty/reinspection and v2 non-fallback before approval.

The approved=true branch is substituted **inside the fixture loader only**, never
the real release file. All data is fictitious. No actual Samsung wallet was read,
backed up, imported or modified by the automated tests. No new DEV harness exists.

These are code integration/mock-native results, not Samsung production validation
or a real native process-restart/scan result. The user's earlier Samsung Step 3
filesystem evidence remains separate from this new integration.

## Samsung checks available now (without authorizing cutover)

```powershell
cd C:\ฉันจะทำเว็บไซด์\bemem-app
npx.cmd expo start
```

1. Open normal Home through Expo Go. Verify original four demos, saved positions,
   Header, search, tap preview and Create PRO remain correct.
2. Enter Create, move a demo after 350 ms hold, then test Cancel/Discard/Save as
   before. An explicit layout Save still writes v1, exactly as the authorized old
   functionality; it does not create v2 or a backup.
3. Press the actual Create FAB. The approved Add Card form opens. Test all fields,
   seven sizes, keyboard and validation. Valid Add must honestly say Wallet v2
   activation is pending; no membership card is added to v1 and no fake Save occurs.
4. Close the form. Enter Review Wallet v2, explicitly press read-only review and
   acknowledge consent if desired. Verify the execution action stays disabled.
   Cancel must return to Create without changing Saved/Draft or writing files.
5. To review membership detail appearance without production data changes, use
   the existing `/dev-add-card` route, add a fictitious in-memory card and tap it.
   That existing route now passes its actual memory card to the shared production
   detail component. Its Test Save is still memory only, clearly labelled.
6. Do not change the release flag or attempt real import without separate approval.

Full production membership persistence on Samsung remains pending release approval
and a separately supervised native backup/import/cutover run. Full scanning remains
pending approved encoders and actual scanner tests.

## Files changed in this step

New:
- `src/constants/wallet-release.ts`
- `src/lib/wallet-device-runtime.ts`
- `src/lib/wallet-feature-commands.ts`
- `src/components/bemem/WalletRuntimeProvider.tsx`
- `src/components/bemem/AddCardEditor.tsx`
- `src/components/bemem/WalletMigrationPanel.tsx`
- `src/components/bemem/MembershipCardDetail.tsx`
- `scripts/test-production-integration.cjs`
- `PHASE2-PRODUCTION-FEATURE-INTEGRATION.md`

Modified:
- `src/app/_layout.tsx` — sole root Provider.
- `src/app/index.tsx` — owner cards, real FAB/editor, detail data, consent/reinspection.
- `src/hooks/use-wallet-canvas.ts` — owner-backed navigation/actions; remove raw writer.
- `src/lib/wallet-coordinator.ts` — explicit unpersisted v1 revision-zero inspection.
- `src/lib/wallet-cutover-runtime.ts` — release authorization and initial-v1 composition.
- `src/components/bemem/CanvasActions.tsx` — correct functional Add Card accessibility label.
- `src/components/bemem/CardPreview.tsx` — real membership detail branch; demos unchanged.
- `src/components/bemem/CardAppearancePreview.tsx` — optional persisted appearance input;
  approved form geometry unchanged, stored gradient highlight rule retained.
- `src/components/bemem/DevAddCardRuntime.tsx` — one shared-detail data binding.
- `scripts/test-card-interactions.cjs` — mock new detail leaf for existing demo tests.
- `scripts/test-cutover-safety.cjs` — assert owner routing instead of old direct save.

Grid engine, preset definitions, radius/inset, HomeHeader, approved AddCardForm and
AddCardSheet, theme/tokens, storage protocol/schema and original website are unchanged.

## Separate approvals / remaining risks

Approve encoder dependencies and real scanner testing before treating Card Detail
as usable at a shop. Separately approve opening the release gate and running the
actual private backup/import/activation procedure, with fresh source review and
explicit consent; then verify production Save/restart/Airplane Mode on Samsung.

JS-process locks still do not exclude another native process/old binary or guarantee
power-loss fsync/atomicity. Native backup exclusive creation/readback must be
device-verified. Local Documents OS-backup policy and uninstall/device loss remain
development-build/privacy checks. No schema/version bump, new network/cloud path,
dependency install, real-data cutover, website change or commit/deployment occurred.
