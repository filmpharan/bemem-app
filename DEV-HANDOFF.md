# bemem — Developer Handoff
**Current entry point · Samsung Accepted Baseline · 2026-11-14.** Owner-reported Android acceptance is documented in [RELEASE-BASELINE.md](RELEASE-BASELINE.md). This replaces the earlier handoff; its original is preserved in the new external quarantine's previous-documents directory.

Read [ARCHITECTURE.md](ARCHITECTURE.md), current `src/constants/ci-theme.ts`, [Vivid Lagoon specification](design-system/bemem-vivid-lagoon/SPEC.md), and the historical [CI master](design-system/bemem-lagoon-glass-rc2/BEMEM-CI-CURRENT-APPROVED.md), [token mapping](design-system/bemem-lagoon-glass-rc2/CURRENT-TOKEN-MAPPING.md), [developer guide](design-system/bemem-lagoon-glass-rc2/BEMEM-CI-DEVELOPER-GUIDE.md), [cleanup report](CLEANUP-REPORT.md) and [GitHub checklist](GITHUB-READY-CHECKLIST.md). The current working tree is authoritative; current HEAD is 3ec5a45bd9765594f5901b8ab196ba2f8950bde4. Never substitute an archive of HEAD.

## What works
Home provides read-only card/folder use, search, page selection, account menu, scannable Detail, Full View and Share. Create provides Add/Edit/Delete, scanner, front/back photos and crop, nine sizes, long-press placement, safe Save/Discard and folder management. Decorate provides270 local assets, card/sticker/Folder movement,350ms hold, Undo/Redo, dirty Back protection and Save. Folder taps in Decorate do not open management.

Folders hold2–6 membership IDs, render first-four upright previews with responsive gaps and show all members in the Sheet. Create Rename uses an inline pencil; Close is circular48dp; red text Ungroup Cards removes only the container and preserves cards with safe same-page placement. Home has no management. Current visuals use Vivid Lagoon matte card faces, yellow top-flap folders and Flat Tonal controls. Use runtime source plus current design-system specifications; older Lagoon Stack references are retained history.

## Ownership and source map
See ARCHITECTURE for the complete table and data contract.

| Area | Owner / entry |
| --- | --- |
| Startup/provider | src/app/_layout.tsx → WalletRuntimeProvider.tsx → wallet-device-runtime.ts |
| Home/Create | src/app/index.tsx and src/hooks/use-wallet-canvas.ts |
| Saved/Draft + writer admission | wallet-runtime-owner.ts / wallet-coordinator.ts / wallet-cutover-runtime.ts |
| Filesystem transaction | wallet-repository.ts / wallet-storage.ts / wallet-storage-adapters.ts; legacy canvas-storage.ts remains |
| Create features | wallet-feature-commands.ts; AddCardEditor.tsx / EditMembershipCardEditor.tsx share AddCardForm.tsx |
| Canvas/page rules | canvas-layout.ts / canvas-pages.ts / card-size-presets.ts / search-reflow.ts |
| Decorate | DecorateMode.tsx and decorate-session.ts |
| Folders | group-folder.ts / group-folder-visual.ts / GroupFolderCard.tsx / GroupFolderSheet.tsx |
| Card images | card-artwork-store.ts / CardArtworkImage.tsx / artwork-adjustment.ts |
| Default pairs | src/constants/default-card-artwork.ts; src/lib/default-card-artwork.ts, default-card-artwork-assets.ts, default-card-artwork-native.ts |
| Detail/codes/share | MembershipCardDetail.tsx / card-code.ts / ShareCardSheet.tsx / CardShareSurface.tsx / card-share-native.ts |
| Photo journal/receipts | CardHistorySheet.tsx / card-history*.ts / ReceiptAttachments.tsx / ReceiptViewer.tsx |

Unless prefixed, component files are under src/components/bemem and logic files under src/lib. Existing dev-* routes under src/app are guarded diagnostics/previews, not normal startup or permission to operate on real data. Do not remove them merely because this is a handoff.

## Data, pages and save safety
WalletDocument schemaVersion2 saves Cards+Canvas together. Optional pages/decorations/folders preserve legacy absence. Stable card/folder IDs and exact string numbers/payloads are required. Member cards stay in cards; folder relations contain IDs and a container position. All five pages are currently visible/readable/editable for functional testing (`canvasAccess`). This is not Login or Premium entitlement. Existing page-scoped writer rules still apply.

Create mutations are Draft-only until explicit Save. Decorate owns action history but uses the same owner; Cancel restores its entry draft, including any unsaved Create work. Folder moves update only their position. Search Reflow never changes Saved/Draft. Save uses expectedRevision, source/generation admission, pending checks, immutable snapshot commit and readback; uncertainty blocks normal progress and requires reinspection, not automatic retry.

Native Documents directories include bemem-wallet-v2, bemem-card-artwork, history/receipts/deletion recovery and pre-cutover backup. Existing v1 is preserved. Never copy mock fixtures into the phone, force a new empty wallet, manually delete pending files or treat an old revision as an automatic recovery. The current explicit release gate is in src/constants/wallet-release.ts; no migration/backup/cutover was performed in handoff.

## Artwork and recoverable originals
- Current 16 faces: assets/card-faces/vivid-lagoon-v1/ and its MANIFEST.json; source SVGs/specification under design-system/bemem-vivid-lagoon/. Legacy 14 faces and older sources remain for saved references/test provenance. Stable per-new-session random paired defaults; no saved-card rerandomization; personal photos win.
- Front masters: design-previews/lagoon-glass-card-face-v2/masters/ (including original PNG masters).
- Six original Back sources: design-previews/card-face-and-group-frame/masters/A-*.svg and PNG. New Orange: design-previews/soft-pastel-minimal-orange-back/masters/A-orange.svg and PNG.
- Legacy Stack originals: design-previews/lagoon-glass-group-folder/assets/shells/B-*.svg and PNG; bundled copies in assets/group-folders/.
- Functional icon originals: design-previews/functional-icon-system and icon-family-refinement, including before/svg/edit.svg.
- Decoration originals/provenance: artwork-trials/, especially first-trial,240/270 and chunky-frame collections; production assets/decorations and registry remain unchanged.
- Existing font/artwork license files remain beside their sources. Do not assume a folder called trial/preview is disposable or licensed for redistribution beyond the owner's terms.

These sources stay in the repository at their existing paths because tests/generators use them. No approved master was moved or regenerated. Only obsolete capture/output files were quarantined. Preview UI is historical evidence, not another production implementation.

## Run and verify
On a fresh developer checkout: install the existing lockfile with `npm ci` (not executed during handoff). Use a Node version supported by the installed Expo/TypeScript; this handoff did not alter toolchains.

```powershell
npm run start -- --go
node node_modules/typescript/bin/tsc --noEmit
node --test --test-isolation=none scripts/test-group-folder.cjs scripts/test-decorate.cjs scripts/test-default-card-artwork.cjs
node --test --test-isolation=none scripts/test-*.cjs
node node_modules/expo/bin/cli export --platform android --output-dir output/local-android --max-workers 1
git diff --check
```

Current package scripts: start, android, ios, web, lint and the inherited reset-project. **Do not run reset-project** on this established app. Lint points to expo lint but ESLint/config are absent; do not auto-install without approval. The test-isolation flag avoids the observed Windows subprocess restriction; tests use in-memory/native mocks, not Samsung Wallet files. Hermes export verifies bundling, not native device behavior.

The optional raster validator reads output/artwork-wysiwyg-fixtures.json, which is deliberately kept visible to Git. Other local output is ignored. Artwork tooling is optional and isolated: Inkscape/Pillow are not application dependencies; machine-local .artwork-tools is not a repository deliverable.

## Limits and review
No account backend, Cloud sync, billing/subscription, Theme Picker or store release is added by placeholders. iOS, power-loss/native-crash behavior and binary screenshot privacy are not newly certified. Local files are not guaranteed encrypted or excluded from OS backups. Existing multiple-store receipt cleanup uses recovery information; do not simplify it to blind deletion.

Never reset Expo Go, Wallet or existing user imagery. Preserve12 columns,240-row validation, all nine footprints,0.1-block inset,14dp corners,current NavigationHeader responsive geometry, five pages, owner guards and removed Home swipe. Changes to data admission, artwork/source identity, crop/export, Delete/history recovery or folder dissolve/placement need regression review.

Final post-cleanup results are in HANDOFF-VALIDATION.json and CLEANUP-REPORT. Basic secret-pattern checks do not certify historical photos; two retained Card Detail JPEG references require owner privacy review. An origin already exists for filmpharan/bemem-app. A non-interactive credential lookup could not verify private visibility; no interactive login was attempted. Do not replace the remote or assume it is private. No commit/tag/push/deploy or external developer invitation was performed.


## Current toolchain and reproducible setup boundaries

- Installed/reference toolchain: Node 24.22.1, Expo 58.0.23, React Native 0.88.1, React 19.3.0, TypeScript 6.0.3. Installed Expo declares Node `^22.13.0 || ^24.3.0 || ^26.0.0 || >=27.0.0`; prefer the observed Node 24 line for handoff comparison.
- Use npm with package-lock.json (lockfile v3); run `npm ci` only on the receiving developer's checkout. No install or fresh-checkout verification was performed in this phase.
- `expo-asset` is imported directly but currently comes transitively from Expo. The current lock resolves it; explicit dependency declaration is follow-up work requiring approval, not a change made here.
- The local-only app has no required backend secret environment variables identified. Do not invent `.env` credentials for Login, Cloud or Premium placeholders.
- Start Metro with `npm run start -- --go`, then open the existing project in compatible Expo Go on Android. Verify LAN access/device compatibility. Do not uninstall Expo Go or clear its data to troubleshoot.
- Native Camera/Notifications/Wallet behavior must be tested on-device. Web preview is not native parity. Hermes export is not an APK/AAB, EAS build or delivery certification.
- Python/Pillow/Inkscape are optional artwork regeneration tools isolated under ignored local tooling; they are not Node runtime requirements. Preserve generator sources and required fixture paths.

## Current focused validation

```powershell
node node_modules/typescript/bin/tsc --noEmit
node --test --test-isolation=none scripts/test-keeps.cjs scripts/test-keep-media.cjs scripts/test-keep-recovery.cjs
node --test --test-isolation=none scripts/test-*.cjs
node node_modules/expo/bin/cli export --platform android --output-dir output/local-android --max-workers 1
git diff --check
```

On restricted Windows environments where child test workers cannot spawn, use the existing per-file alternative: enumerate `scripts/test-*.cjs` in PowerShell, run `node <file>` sequentially, capture every exit code and sum results. Do not weaken assertions or add forced exit merely to conceal hanging work. New output belongs in ignored `output/`; do not clear older artifacts. The last recorded pre-phase baseline is 1,504/1,504 across 60 files; current execution evidence is in HANDOFF-VALIDATION.json.

## Keeps / media handoff

Home Card Detail opens My Keeps/Add Keep; `KeepsSheet` reads records independently from native notification inspection. All-in-One/Note/Reminder can prepare safe drafts before Save readiness. Gallery/Camera also open early when Card/Owner and picker admission are safe, but selected SDK cache URIs remain temporary until guarded Retain succeeds. `KeepEditor` does not automatically Save.

Persistent retention requires current capability/generation/revision and the original History/Recovery checks. Save has its own admission and verified repository persistence. Copy failure, unmount and stale callbacks use exact owned receipt cleanup; uncertain operations preserve evidence without retry. The JS-memory ticket limitation is an accepted testing boundary, not completed durable orphan recovery.

Keep reminders use local date/time conversion, commit History before scheduling and store the actual scheduling outcome. Queue inspection and labels never establish delivery. Complete/Delete preserve durable intent, cancellation checks and Readback. Do not simplify these steps to fix visual loading.

## Review queue before staging

Use HANDOFF-STAGING-MANIFEST.json for the exact candidate paths; it is a proposal, not an executed Git command. REVIEW assets/references/third-party materials require human rights/privacy decisions, including already-tracked files in HEAD. Omitting them from `git add` does not remove them from a future push. Do not delete LICENSE/attribution, broad-ignore required artwork, or remove retained reference files without checking test/generator dependencies.

## Developer review branch ? 2026-11-23 (current authority)

Owner authorizes the existing repository visibility and a dedicated `developer-review/2026-11-23-motion-handoff` branch, not a release or changes to main/master. Earlier private-only/upload-blocked statements above are historical. Required runtime/test artwork is included; optional new preview exports remain local. Existing tracked history and licenses/notices are preserved.

Motion is complete: M2 `CardPreview`/`MembershipCardDetail` (16dp, 220ms open / 180ms close); M3-A `keeps-motion` (Sheet 16dp, 220/180ms; Page 12dp, 200/160ms); M3-C `keeps-navigation-motion` and M3-B `keeps-editor-motion` (incoming ?8dp, 160/140ms); M4-A `CanvasSelectorVisual` (opacity-only 120ms cubic-out). Context/Owner/branch identity, animation epochs, unmount cancellation and Reduce Motion guards are presentation safeguards, not writer authorization. M4-A preserves the confirmed-page pill and 200ms tail. No animation completion performs Save or Recovery. M4-B Add Card and M4-C Decorate intentionally retain existing behavior.

M3-B has minor native Modal flicker accepted by the owner; it is not flicker-free. Profile/Carousel initial Reduce Motion Promise ordering remains an acknowledged unmodified technical risk. See KNOWN-ISSUES. The latest prior closeout passed 1,575 tests, TypeScript and Hermes; current review verification is recorded in HANDOFF-VALIDATION.json. Mocks cannot establish device smoothness, native notification delivery, or crash durability.

Install using the committed package-lock with Node 24.x/npm 11.x: `npm ci`, then `npm run start -- --go`. Use compatible Expo Go on Samsung without clearing data. For a separate Android development build, configure the Android SDK/JDK and run `npx expo run:android` (generates ignored native folders); connect it with `npx expo start --dev-client`. This handoff does not build/install an APK, change the owner's Expo Go, or run EAS/deploy. Camera, notifications and native persistence require device verification.

Safe tests (do not run the geometry exporter on existing previews):

```powershell
node node_modules/typescript/bin/tsc --noEmit
node --test --test-isolation=none scripts/test-card-detail-motion.cjs scripts/test-keeps.cjs scripts/test-footer-motion.cjs scripts/test-header-layout.cjs scripts/test-profile-sheet.cjs
```

The quick command runs the motion-focused tests; for a complete safe run retain every assertion and redirect only report writes in `test-render-performance.cjs`, `test-default-card-artwork.cjs` and `test-card-photo-action.cjs` to a new temporary output directory (or capture them in memory). Exclude only the single `Export a geometry-only review` test. On Windows, enumerate files and run each with `node --test --test-isolation=none --test-skip-pattern "Export a geometry-only review" <file>` with that report-write redirection. Never run `--fixtures` against the retained raster fixture. Other artifacts must not overwrite existing output. Hermes export must use a new output directory.

`expo-asset` is locked at 58.0.20 and supplied transitively; verify root resolution after `npm ci`. Do not add or upgrade packages casually. The app has no backend login/cloud/billing credentials. Respect all SAFETY-INVARIANTS; viewing, motion or repository access is not permission to migrate/reset the owner's data.

### Fresh Expo environment and non-destructive full regression

`expo-env.d.ts` and typed routes are generated, ignored files. After `npm ci`, start Expo once (`npm run start -- --go`, or `node node_modules/expo/bin/cli start --offline --port 8089` for an offline host check), wait for Metro readiness and stop it normally. Then run TypeScript. Before that step a pristine checkout can report missing CSS declarations from inherited web template files. No source patch is needed. The isolated review install verified `expo-asset` 58.0.20 resolves at the project root without adding a direct dependency.

This PowerShell full run keeps normal test assertions, captures four incidental JSON reports in memory, rejects unexpected output writes, and excludes exactly one geometry export. It does not use `BEMEM_PROFILE_CAPTURE` (which would disable performance assertions). Test storage fixtures still use their own isolated temporary directories.

```powershell
$guard = @'
const fs=require('node:fs'),path=require('node:path');
const output=path.resolve('output'), reports=new Set(['render-performance-after.json','saved-photo-performance-after.json','minimal-photo-action-review.json','default-card-artwork-validation/mock-performance.json'].map(p=>path.resolve(output,p)));
const write=fs.writeFileSync,mkdir=fs.mkdirSync,memory=new Map();
fs.writeFileSync=function(file,...args){const full=path.resolve(file);if(reports.has(full)){memory.set(full,args[0]);return;}if(full.startsWith(output+path.sep))throw Error('Unexpected output write: '+full);return write(file,...args);};
fs.mkdirSync=function(file,...args){const full=path.resolve(file);if(full===output||full.startsWith(output+path.sep))return;return mkdir(file,...args);};
require(path.resolve(process.argv[1]));
'@
foreach ($file in (Get-ChildItem scripts/test-*.cjs | Sort-Object Name)) {
  & node --test-skip-pattern 'Export a geometry-only review' -e $guard $file.FullName
  if ($LASTEXITCODE -ne 0) { throw "Regression failed: $($file.Name)" }
}
```

Use a new unique `--output-dir` for `node node_modules/expo/bin/cli export --platform android --max-workers 1`. No test or build here touches a Samsung device. Fresh-install validation does not certify Reminder delivery, an Android native development build, iOS, process-kill recovery or store readiness.
