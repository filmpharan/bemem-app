# bemem
Offline-first membership wallet and personal Canvas, built with React Native / Expo.

Current handoff preparation: **2026-11-23, uncommitted working tree**. HEAD is `3ec5a45bd9765594f5901b8ab196ba2f8950bde4`; HEAD alone does not contain the current app. The interface uses Vivid Lagoon / Flat Tonal controls, current card artwork and yellow top-flap folders. This is a development baseline, not a store-ready release.

## Start here

- [Developer setup and commands](DEV-HANDOFF.md)
- [Current architecture and data ownership](ARCHITECTURE.md)
- [Safety invariants](SAFETY-INVARIANTS.md)
- [Known issues and investigation boundaries](KNOWN-ISSUES.md)
- [Owner-reported Samsung acceptance](SAMSUNG-ACCEPTANCE.md)
- [Readable file inventory](HANDOFF-INVENTORY.md), [complete inventory](HANDOFF-INVENTORY.json), [proposed staging manifest](HANDOFF-STAGING-MANIFEST.json)
- [Current validation evidence](HANDOFF-VALIDATION.json)
- [Private handoff checklist](GITHUB-READY-CHECKLIST.md)
- [Vivid Lagoon artwork specification](design-system/bemem-vivid-lagoon/SPEC.md); runtime control tokens are in `src/constants/ci-theme.ts`

`RELEASE-BASELINE.md`, `CLEANUP-REPORT.md` and older CI/phase documents remain historical records of the 2026-11-14 baseline. Their old test counts, remote statements, seven-size limits and header geometry are not current specifications.

## Run

Use Node 24.x compatible with the declared Expo toolchain (locally observed: 24.22.1), npm and the existing lockfile. See DEV-HANDOFF for the supported Node range and environment limitations.

```powershell
npm ci
npm run start -- --go
node node_modules/typescript/bin/tsc --noEmit
node --test --test-isolation=none scripts/test-card-detail-motion.cjs scripts/test-keeps.cjs scripts/test-footer-motion.cjs scripts/test-header-layout.cjs scripts/test-profile-sheet.cjs
```

Fresh isolated install and review validation are recorded in HANDOFF-VALIDATION.json; do not assume an old validation record certifies a new lockfile. Native Wallet persistence is Android/iOS functionality; the web script is not proof of native feature parity.

## Handoff status

The app has nine card footprints, five currently active Canvas pages, Add/Edit, Card Detail, Share, My Keeps and Add Keep. Owner-confirmed Samsung results and their limits are listed separately in SAMSUNG-ACCEPTANCE. Completed motion includes M2, M3-A/C/B and M4-A. Latest closeout: 1,575/1,575 tests (one geometry exporter excluded); current review verification is in HANDOFF-VALIDATION.json.

Native Reminder delivery on Samsung remains unconfirmed. Unsaved media ownership tracking is JS-process-local; durable cross-process recovery is incomplete. Scheduling success is not delivery evidence.

No backend/account secrets are required by the current local-only implementation. Do not put credentials, device Wallet/Keep exports or private media into Git. The owner accepts existing repository visibility for developer review; this is not a deployment or app release.

The current owner instruction authorizes only the dedicated review branch upload. main/master remain unchanged. Preserve local optional previews and all user data; never reset Expo Go, reimport data or run `reset-project`. Read the current review section in DEV-HANDOFF and the exact manifest. Existing tracked history is retained, not independently relicensed. The quick command runs motion-focused tests. Full verification retains report-test assertions with isolated output capture as documented in DEV-HANDOFF.
