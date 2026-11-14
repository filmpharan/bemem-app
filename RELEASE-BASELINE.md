# bemem — Samsung Accepted Baseline — 2026-11-14

**Development baseline, not a public app-store release.** Acceptance is reported by the product owner in the latest task. It is not a new runtime version or a claim of independent device certification. No app version, build number, commit, tag or remote was changed.

Start with [DEV-HANDOFF.md](DEV-HANDOFF.md), [ARCHITECTURE.md](ARCHITECTURE.md), [CLEANUP-REPORT.md](CLEANUP-REPORT.md) and [GITHUB-READY-CHECKLIST.md](GITHUB-READY-CHECKLIST.md).

## Acceptance inventory

| Area | Current owner-reported Samsung-accepted behavior |
| --- | --- |
| Wallet | Offline-first Wallet v2; single writer, revision and readback; explicit recovery safeguards |
| Canvas | 12 columns, seven footprints, five logical pages, Free/Active/Expired access rules; no Home horizontal swipe |
| Home | View-only card/folder use, Search Reflow, Account menu, page selector, Detail, QR/Code128, Full View and Share |
| Create | Add/Edit, safe Delete, Name/Number/EXP, Scanner, Gallery/Camera, front/back crop, long-press drag/drop, Save/Discard; grouping by card-on-card drop |
| Default artwork | Seven Lagoon Glass fronts and seven Soft Pastel Minimal backs; stable random matched pair per new Add session; personal photos take priority; saved cards never rerandomize |
| Group Folder | 2–6 membership cards; 6×4 or 4×6; Lagoon Stack shell, first-four upright Front cover previews, responsive approximately4dp gaps, separate name, no count badge; Sheet shows every member |
| Folder management | Home view-only; Create Rename with inline pencil, circular48dp Close, red text Ungroup Cards; safe Ungroup keeps every card on the same page; singleton dissolution |
| Decorate | Existing270 assets/drawer; cards/stickers and Folder movement; 350ms hold; Folder tap never opens Sheet; Back/Undo/Redo/Save and Discard |
| Detail/journal | Existing scannable codes, Share/export, photo journal/history and receipt workflows preserved |

Final new-card pairings: Blush Pink→Pink, Warm Brown→Brown, Fresh Green→Green, Golden Yellow→Yellow, Sky Blue→Blue, Dream Purple→Purple, Coral Orange→Orange. Existing saved Coral/Brown references remain Brown. See [artwork manifest](assets/card-faces/MANIFEST.json).

## Identity and stack

Lagoon Glass is the approved card/folder visual language; Pearl Gray is the interface foundation. The [current-approved CI master](design-system/bemem-lagoon-glass-rc2/BEMEM-CI-CURRENT-APPROVED.md), [token mapping](design-system/bemem-lagoon-glass-rc2/CURRENT-TOKEN-MAPPING.md) and [developer guide](design-system/bemem-lagoon-glass-rc2/BEMEM-CI-DEVELOPER-GUIDE.md) remain unchanged.

Installed declarations: Expo~58.0.23, React Native0.88.1, React19.3.0, Expo Router~58.0.30, TypeScript~6.0.3. Exact resolution remains in package-lock.json. No packages were installed for handoff.

## Data and scope limits

Data is local to native Documents: Wallet snapshots, immutable artwork references, history/receipts and recovery information. No account or Cloud sync is required. Local storage is not a promise of encryption, secure erasure, OS-backup exclusion, multi-process transaction isolation or native-crash atomicity. Keep those limitations explicit when planning distribution.

Existing release approval enables only the explicit Review→Consent path; it does not authorize automatic backup/import/cutover. This cleanup did not use those controls or access Samsung data. Existing v1 is preserved. Saved/Draft separation and all current writer safeguards are unchanged.

| Evidence class | Meaning |
| --- | --- |
| Samsung accepted | Owner's latest acceptance covers the functionality listed above, including the latest Folder visual and Decorate/Sheet work |
| Automated validation | Fresh post-cleanup results are recorded in CLEANUP-REPORT and HANDOFF-VALIDATION.json; historical counts are not substituted |
| Browser/composited prototypes | Retained design evidence only; not additional native feature implementations |
| Deferred/not implemented | Login/account backend, Cloud sync, billing/subscriptions, Theme Picker and production marketplace are not delivered by placeholders or entitlement simulations |
| Still unverified | iOS device acceptance, crash/power-loss guarantees, store distribution and full visual/privacy review of retained historical binary references |

## Git and handoff status

Last existing commit at preparation: `c500a015cfc80bd6a63c88d3848562b33f02faa3`. The accepted app is the **current working tree**, including substantial untracked production source/assets/tests. HEAD-only archive is incomplete. No accepted-baseline commit/tag exists yet; no remote is configured. Do not upload until the checklist's review gates are complete. Prefer a private repository.

Generated exports, tool caches and unreferenced capture sheets were removed only after verified external quarantine. Required fixtures, editable masters, production files and historical evidence remain; retained preview/trial folder names do not imply they are safe to delete. See CLEANUP-REPORT for exact recovery and privacy review limitations.
