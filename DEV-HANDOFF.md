# bemem — Developer Handoff
**Current entry point · Samsung Accepted Baseline · 2026-11-14.** Owner-reported Android acceptance is documented in [RELEASE-BASELINE.md](RELEASE-BASELINE.md). This replaces the earlier handoff; its original is preserved in the new external quarantine's previous-documents directory.

Read [ARCHITECTURE.md](ARCHITECTURE.md), the [CI master](design-system/bemem-lagoon-glass-rc2/BEMEM-CI-CURRENT-APPROVED.md), [token mapping](design-system/bemem-lagoon-glass-rc2/CURRENT-TOKEN-MAPPING.md), [developer guide](design-system/bemem-lagoon-glass-rc2/BEMEM-CI-DEVELOPER-GUIDE.md), [cleanup report](CLEANUP-REPORT.md) and [GitHub checklist](GITHUB-READY-CHECKLIST.md). The current working tree is authoritative; last committed baseline is c500a015cfc80bd6a63c88d3848562b33f02faa3. Never substitute an archive of HEAD.

## What works
Home provides read-only card/folder use, search, page selection, account menu, scannable Detail, Full View and Share. Create provides Add/Edit/Delete, scanner, front/back photos and crop, seven sizes, long-press placement, safe Save/Discard and folder management. Decorate provides270 local assets, card/sticker/Folder movement,350ms hold, Undo/Redo, dirty Back protection and Save. Folder taps in Decorate do not open management.

Folders hold2–6 membership IDs, render first-four upright previews with responsive gaps and show all members in the Sheet. Create Rename uses an inline pencil; Close is circular48dp; red text Ungroup Cards removes only the container and preserves cards with safe same-page placement. Home has no management. Current Lagoon Stack visuals and default artwork repair are included in the owner's latest Samsung acceptance.

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
WalletDocument schemaVersion2 saves Cards+Canvas together. Optional pages/decorations/folders preserve legacy absence. Stable card/folder IDs and exact string numbers/payloads are required. Member cards stay in cards; folder relations contain IDs and a container position. Page1 is editable; additional pages follow current Free/Active/Expired access and local selected-count policy. Local access simulation is not billing.

Create mutations are Draft-only until explicit Save. Decorate owns action history but uses the same owner; Cancel restores its entry draft, including any unsaved Create work. Folder moves update only their position. Search Reflow never changes Saved/Draft. Save uses expectedRevision, source/generation admission, pending checks, immutable snapshot commit and readback; uncertainty blocks normal progress and requires reinspection, not automatic retry.

Native Documents directories include bemem-wallet-v2, bemem-card-artwork, history/receipts/deletion recovery and pre-cutover backup. Existing v1 is preserved. Never copy mock fixtures into the phone, force a new empty wallet, manually delete pending files or treat an old revision as an automatic recovery. The current explicit release gate is in src/constants/wallet-release.ts; no migration/backup/cutover was performed in handoff.

## Artwork and recoverable originals
- Production14 faces: assets/card-faces/ and MANIFEST.json. Stable per-new-session random paired defaults; no saved-card rerandomization; personal photos win.
- Front masters: design-previews/lagoon-glass-card-face-v2/masters/ (including original PNG masters).
- Six original Back sources: design-previews/card-face-and-group-frame/masters/A-*.svg and PNG. New Orange: design-previews/soft-pastel-minimal-orange-back/masters/A-orange.svg and PNG.
- Stack originals: design-previews/lagoon-glass-group-folder/assets/shells/B-*.svg and PNG; bundled copies in assets/group-folders/.
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

Never reset Expo Go, Wallet or existing user imagery. Preserve12 columns,240-row validation, all seven footprints,0.1-block inset,14dp corners,50dp/eight-slot header, five pages, square selector, owner guards and removed Home swipe. Changes to data admission, artwork/source identity, crop/export, Delete/history recovery or folder dissolve/placement need regression review.

Final post-cleanup results are in HANDOFF-VALIDATION.json and CLEANUP-REPORT. Basic secret-pattern checks do not certify historical photos; two retained Card Detail JPEG references require owner privacy review. Prefer a private GitHub repository; no remote is currently configured. No commit/tag/push/deploy or external developer invitation was performed.
