# bemem
Offline-first membership wallet and personal Canvas, built with React Native / Expo.

Current development baseline: **bemem — Samsung Accepted Baseline — 2026-11-14**. Lagoon Glass card/folder visuals with Pearl Gray interface. This is not a public app-store release.

Start here:

- [Accepted features and limits](RELEASE-BASELINE.md)
- [Developer handoff and commands](DEV-HANDOFF.md)
- [Architecture and data contract](ARCHITECTURE.md)
- [Approved Design System](design-system/bemem-lagoon-glass-rc2/BEMEM-CI-CURRENT-APPROVED.md)
- [Cleanup and recovery](CLEANUP-REPORT.md)
- [Private GitHub handoff checklist](GITHUB-READY-CHECKLIST.md)
- [Latest validation](HANDOFF-VALIDATION.json)

For a fresh developer checkout, use the existing lockfile with `npm ci`, then `npm run start -- --go`. Typecheck with `node node_modules/typescript/bin/tsc --noEmit`; run tests with `node --test --test-isolation=none scripts/test-*.cjs`. See DEV-HANDOFF for focused tests and Android Hermes validation.

The current accepted application includes important uncommitted/untracked files newer than the last commit. Do not export only HEAD, reset/restore source, clear Expo Go, reimport demo data or use the template reset-project script on this working app.

No commit, tag, upload or deployment was performed during this handoff. Review the proposed files, retained historical image privacy and private remote before authorizing upload.
