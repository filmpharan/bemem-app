# Decorate 270 — implementation and Samsung review

Status: awaiting Samsung review. Original uncommitted Phase1/2 work retained; Git HEAD unchanged at `c500a015cfc80bd6a63c88d3848562b33f02faa3`. No Commit/Push/Deploy, no dependency installation, no wallet/History/Expo Go reset or real-device IO.

## Changes in this task

- `src/components/bemem/DecorateMode.tsx`: only the category selector replaces text GlassButtons/horizontal ScrollView with six frameless artwork Pressables. Existing session, toolbar, placement, grid, paging, Cancel, Back and Save behavior reused.
- `src/lib/decoration-catalog.ts`: exactly 30 new stable IDs; append 10 each after existing40 in Pet, Wellness and Savings, preserve other three collections.
- `src/constants/decoration-images.ts`: 30 additional literal static PNG requires.
- `src/constants/decoration-paint.ts`: new frames explicitly1.0, existing240 scales unchanged.
- `assets/decorations/cozy-cute-v3/`: 30 new transparent192px PNGs. No old image modified.
- `scripts/test-decorate.cjs`: update library/page expectations; add frameless icon/accessibility/responsive and new30 command/save/readback regressions.
- `scripts/test-decoration-pagination.cjs`: explicit50-asset three-page test; pagination implementation unchanged.
- `scripts/test-decoration-frames.cjs`: independently decode PNGs, verify original240 hashes, rotated/mirrored/recolor uniqueness and all2646 facing-edge combinations.
- `artwork-trials/cozy-cute-270-2026-11-11/`: editable SVGs, immutable240 baseline, pipeline scripts, JSON manifests, offline interactive gallery, contact sheets, tiny-scale/dark/connection reviews and detailed `VALIDATION.md`.

No edits in this task to WalletCanvas, Home/Create routes, Wallet schema/repository/coordinator/storage, Add/Edit, membership detail, QR/Code128, Sharing, Photo Journal, original website, package/config files, AGENTS or skills. Their earlier uncommitted work remains present.

## Deliverables / constraints

See [artwork report](artwork-trials/cozy-cute-270-2026-11-11/VALIDATION.md) for30 role IDs, counts50/40/50/40/40/50, 240-image preservation, tool provenance, seam correction, renderer/performance safeguards, accessibility and limitations. Open [offline gallery](artwork-trials/cozy-cute-270-2026-11-11/index.html) by double-clicking in Explorer. No server required. This HTML tests visual selection/pagination only, not native drag or real Save.

## Checks

- TypeScript: PASS.
- Automated suite: **719/719 PASS**,0 failed/skipped. Synthetic wallets/mock filesystem only; `node --test --test-isolation=none scripts/test-*.cjs`.
- Android Hermes export: PASS,1808 modules; `output/decorate-270-android/`, entry HBC3.8MB, metadata19KB. The installed Hermes compiler needed execution outside the process sandbox after `spawn EPERM`; no administrator/software installation/deployment.
- ESLint: no existing configuration; not installed or run. This is not a lint pass.
- `git diff --check`: PASS (existing CRLF normalization warnings only).
- Offline gallery JavaScript/local links: PASS via `check_preview.cjs` DOM shim across all6 collections/pages. This is not a real-browser rendering test.
- Artwork:30 decode;270 canonical unique;original240 SHA-256 unchanged;2646 exact edge-profile combinations;new bytes277,296.

Full logs: `output/decorate-270-tests.txt`, `output/decorate-270-android-build.txt`. Samsung touch/performance/visual approval is still pending.

## One end-to-end Samsung workflow

1. From the project run `npx.cmd expo start` (use `--clear` only for Metro cache if an old bundle appears; never clear Expo Go app data). Open the existing Expo Go project on Samsung.
2. Home → Create → Decorate. Confirm all six frameless icons are visible together. Tap each: only selected opacity strengthens; the grid resets to page1. Check normal/large system text and narrow window if used.
3. Pet/Wellness/Savings: visit pages1/2/3 and confirm23/22/5 artworks. Other collections retain two pages23/17. Empty and Previous/Next cells must never drag.
4. Use an empty area of the existing draft to place new straight/corner/end pieces; rotate to close a rectangle. Test a T/cross and all three new families. Inspect at actual zoom, reject collisions, move a card, Undo/Redo and contextual Delete-left/Rotate-right. Switch/click page while holding a drag: navigation must stay locked.
5. Cancel first and confirm previous Create draft returns unchanged. Reopen Decorate, make only changes you want to retain, then explicitly Save. It should return Home only after verified Save. Confirm static saved positions, Search hide/restore, reopen app and inspect readback. No test automatically performs any phone write or deletion.

Wait for the user's Samsung review before further changes.
