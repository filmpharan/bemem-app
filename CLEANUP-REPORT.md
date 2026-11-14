# bemem — Samsung Accepted Baseline cleanup and handoff
Completed 2026-11-14. **Current baseline: bemem — Samsung Accepted Baseline — 2026-11-14.** This is development acceptance reported by the owner, not an app-store version, new commit or release tag.

Read [RELEASE-BASELINE.md](RELEASE-BASELINE.md), [DEV-HANDOFF.md](DEV-HANDOFF.md), [ARCHITECTURE.md](ARCHITECTURE.md), [GITHUB-READY-CHECKLIST.md](GITHUB-READY-CHECKLIST.md) and [HANDOFF-VALIDATION.json](HANDOFF-VALIDATION.json). The previous cleanup report is retained verbatim below as historical evidence, and the original README/DEV-HANDOFF/CLEANUP-REPORT/.gitignore were verified/copied before editing.

## Actual cleanup — REMOVED and QUARANTINED
**1,637 files / 124,780,210 bytes (119.0 MiB)** removed from project paths after verified copies. All selected files were copied and size/SHA-256 verified **before any deletion**; source hashes were rechecked immediately before each individual unlink. No recursive Git clean/reset or broad source restoration was used. Resolved paths were constrained to this app and copied outside it.

New, unique external quarantine:
`C:\ฉันจะทำเว็บไซด์\bemem-handoff-quarantine\20261114-samsung-baseline-899d0bf7\`

The older quarantine remains intact. This new quarantine is not an in-project backup, GitHub deliverable or backup of the Samsung Wallet.

| Removed category F | Original project paths |
| --- | --- |
| Five reproducible native exports | output/artwork-repair-android/, output/default-card-artwork-android/, output/group-folder-android/, output/group-folder-drag-android/, output/group-folder-repair-android/ |
| Capture/tool caches | .tools/, .playwright-cli/ and __pycache__ files nested under design-previews/ |
| 58 unreferenced generated comparison/capture images | Individual files under design-previews/*/sheets/; no source, docs, galleries or test text referenced their filename/path |

Exact original relative paths, byte sizes, SHA-256, verified-copy/removal status and quarantine destinations for **every removed file** are in external `MANIFEST.json`. `CLEANUP-PLAN.json` records selection reasoning and referenced sheets retained. `CLASSIFICATION.json` categorizes the complete inspected pre-cleanup file inventory. `PRE-CLEANUP-INVENTORY.json`, `GIT-STATUS-BEFORE.txt`, `TRACKED-FILES.txt` and `TRACKED-WORKING-DIFF.patch` record initial state. Local dependency/tool installations were excluded from hashing; no reparse-point targets were selected for deletion.

## Recovery
1. Read the external MANIFEST and select only the needed original path.
2. The copy is at `<quarantine>/files/<original relative path>`. Verify its byte size and SHA-256 match the manifest (PowerShell `Get-FileHash -Algorithm SHA256 -LiteralPath <file>`).
3. Confirm the destination is inside this app and absent. Copy only that selected verified artifact back; never overwrite a newer file or restore all of HEAD/the Wallet.
4. Previous documents are in `previous-documents/`. Inspect/diff before any selective restoration. Do not replace the current accepted source with an old report.
5. If validation ever shows a required input was removed, restore that input from its verified copy and rerun checks. Post-cleanup validation found no such missing input.

## PRESERVED / NOT SAFE TO REMOVE
- All production src, scripts/tests, package/lock/config files, CI specifications/tokens, fonts/icons,270 decorations,14 Card Faces and four Stack shells: unchanged bytes from task-start inventory.
- Editable Front sources in design-previews/lagoon-glass-card-face-v2/masters, original six Backs in card-face-and-group-frame/masters, Orange Back in soft-pastel-minimal-orange-back/masters and Stack SVG/PNG originals in lagoon-glass-group-folder/assets/shells: **preserved in place**, not merely recoverable from a temporary folder.
- Artwork trial masters/manifests/legacy PNGs, approved functional-icon SVGs and folder source PNGs remain because existing tests/generators read them. No path rewriting or rerendering.
- All27 referenced preview sheets were retained, along with galleries/approval history/reference images. Removing their enclosing preview folders is not safe without a separate source/fixture/documentation plan.
- output/artwork-wysiwyg-fixtures.json is a required raster-validation input and remains explicitly unignored.
- Other historical output logs/raster captures remain local for evidence, excluded from proposed Git upload. Their presence is not a reason to remove a test fixture or production source.
- node_modules, .expo, .artwork-tools and browser/Python caches remain local as appropriate; no tools or dependencies were installed or removed.

Runtime/asset references and tests were checked against the post-cleanup tree. No approved production or test input had to be restored. No source code, runtime version/build number, schema, writer, gestures, Folder rendering/gaps, entitlement, crop, Share or user data was changed.

## Documentation and repository hygiene
Created RELEASE-BASELINE, ARCHITECTURE, GITHUB-READY-CHECKLIST and HANDOFF-VALIDATION. Updated README and the single DEV-HANDOFF entry point; current CI master/token mapping/developer guide and historical implementation reports are unchanged. Documentation now distinguishes owner-reported Samsung acceptance, automated results, prototypes and deferred capabilities.

Added narrowly scoped ignores for local artwork/browser tools, caches, machine settings and output, with an exception for the required raster fixture. No src/tests/assets/approved masters or skills are hidden. No forbidden tracked node_modules/.expo/.env was found. No Git remote is configured; nothing was staged, committed, tagged or uploaded. Initial Dev review should use a private repository only after the user's review.

A basic proposed-file filename/text scan found **zero high-confidence private-key/GitHub/AWS/Google token patterns**, no proposed forbidden dependency/env paths and no proposed file over10MB. This is not a comprehensive secret or binary-image audit. **Two retained JPEG references under design-previews/card-detail-ux/references/ require owner privacy/rights review before external access.** Existing workstation paths in historical documentation/artwork tooling are not runtime secrets, but are machine-specific and require portability review. No live device Wallet/photos were inspected. Do not publish by blindly ZIP-ing the working directory.

## Fresh post-cleanup validation
- TypeScript: passed.
- Focused Folder/Decorate/default artwork tests: **133/133** passed.
- Full regression: **1,053/1,053** passed, zero failed/skipped.
- Android Hermes: passed, bundle `entry-5f7b7904da065af6faa869149b468383.hbc`. Build/logs kept outside the app in the new quarantine's `validation/`; no new export clutter was added to the repository.
- Markdown local links: **298 checked, zero missing**, including all authoritative handoff documents and retained historical documentation.
- JSON: **270 parsed, zero invalid**.
- Static relative require targets: **288 checked, zero missing**.
- Card artwork manifest/source verification: **14**; Folder approved-source equality: **4**.
- Production src/scripts/assets/CI comparison to task-start: **zero changes**.
- git diff --check: exit0. Existing LF/CRLF advisories are informational, not whitespace errors.
- ESLint: unavailable (script exists, CLI/config do not); no installation attempted.

Logs and detailed inventory/security/link/asset reports are in the external quarantine. Machine-readable summary is HANDOFF-VALIDATION.json. Android/iOS physical-device behavior was not retested by this cleanup; Samsung acceptance comes from the owner.

## Final Git and next step
HEAD is still c500a015cfc80bd6a63c88d3848562b33f02faa3. Final expanded status: **26 modified tracked files,2,346 untracked files,0 staged,0 tracked deletions**. These include the existing accepted uncommitted production work; unchanged source bytes do not imply a clean Git status. The baseline label is documentation only, not a commit/tag.

Review GITHUB-READY-CHECKLIST, retained image privacy and the final file set. Then give separate approval for an explicit baseline commit, optional development tag and a verified private GitHub destination. Do not run push/remote actions before that approval. No blocker remains for local automated validation; external publishing remains gated on those decisions.

## Historical cleanup report — preserved prior evidence
The following text describes the earlier cleanup, not this run. Its old preservation decisions and older test results do not supersede the current sections above.

# bemem — Cleanup & Handoff Report

Completed2026-11-14. Scope: regenerable project-local exports plus three new handoff documents. No runtime, source import, Wallet schema, device-data or CI changes were authorized or made.

## Completed quarantine

**25 Android export folders /7,259 files /221,890,314 bytes (211.6MiB)** were copied outside the application project, checked with SHA-256 for every file, then removed from their original project-local paths. Source hashes were rechecked against the initial copy manifest before removal. Candidate paths were resolved and constrained to direct children of this app's output directory, with no reparse points accepted.

Local-only quarantine:

`C:\ฉันจะทำเว็บไซด์\bemem-handoff-quarantine\20261114-000023-552\`

`MANIFEST.json` in that directory records original project root, original relative path, byte size and SHA-256 for **every** file, selected folders and verified-copy/removal completion. Quarantined files retain their original `output/<folder>/...` layout below that directory. This is a backup of removed artifacts, not a backup of the complete app or Samsung Wallet.

Original project paths removed, all under `output/`:

- `add-card-discard-android/`
- `ci-phase2-android/`
- `ci-phase3-android/`
- `confirmation-ci-android/`
- `create-header-android/`
- `decorate-240-android/`
- `decorate-270-android/`
- `decorate-android/`
- `decorate-chunky-android/`
- `decorate-controls-android/`
- `editor-eligibility-android/`
- `eight-slot-android/`
- `expiration-android/`
- `form-scan-android/`
- `full-view-android/`
- `functional-icons-android/`
- `header-refinement-android/`
- `home-account-android/`
- `home-swipe-removal-android/`
- `multicanvas-android/`
- `multicanvas-repair-android/`
- `page-popup-android/`
- `phase-a-android/`
- `scanner-android/`
- `share-adjust-android/`

Each candidate contained Expo `metadata.json` and a Hermes `.hbc` bundle. Runtime/test reference searches found no consumer of these export directories. They are reproducible local validation artifacts, not source inputs, required test fixtures, original assets, device Wallet snapshots or developer deliverables. Existing historical reports may still mention the original export paths; those references describe earlier runs, while this manifest documents their new location. No historical report was rewritten.

To inspect an old binary locally, use the retained quarantine. If restoration is necessary, review the manifest and copy only the selected export folder to its original empty location; do not overwrite production files, restore HEAD or restore an entire project/Wallet. Do not transmit the quarantine automatically to an external developer.

## Handoff inventory and preservation decisions

| Category | Material | Decision |
| --- | --- | --- |
| A: production source/config | src/, package.json, lockfile, app.json, TypeScript config, AGENTS.md and theme adapters | Preserve; include current working tree in review, not only HEAD |
| B: production assets | assets/ fonts, custom icons, app images, all270 decoration assets | Preserve byte-for-byte; include necessary licenses/source provenance |
| C: approved CI | design-system/ including all Phase5 documents and current runtime TOKENS.json | Preserve exactly; link from DEV-HANDOFF rather than regenerate |
| D: tests/fixtures | scripts/, referenced artwork manifests/PNGs and approved SVG sources | Preserve; required for regression, regardless of `trial`/`preview` filenames |
| E: demo/DEV data | src/data/wallet-preview.ts, guarded dev-* routes, in-memory fixtures | Preserve behavior; distinguish demos from real membership cards |
| F: temporary generated exports | The25 directories listed above | Verified quarantine outside app, removed from project |
| F: retained previews/exports | output/artwork-wysiwyg-raster/, output/functional-icons-qa/, output/playwright/, existing output logs/JSON, design-previews/ | Preserve: fixture/pipeline inputs, visual evidence, approval history or uncertain provenance. Review privacy before external delivery |
| G: local personal/test data | Samsung native Documents; possible imagery in historical screenshots/logs | No phone access/deletion. Do not claim a filename or card name distinguishes test from real data. Sensitive exports must not be shared blindly |
| H: historical documents | Root implementation/CI reports, old design specs, artwork-trials/ editable sources/provenance | Preserve established paths; current entry point is DEV-HANDOFF |
| I: caches/machine files | node_modules/, .expo/, .artwork-tools/, .playwright-cli/, .vscode/, Python caches | Not needed in external handoff; retained locally to avoid unnecessary environment changes |

Important concrete dependencies found:

- `scripts/test-decorate.cjs` reads artwork-trials legacy assets and manifests, including first-trial PNGs.
- `scripts/test-decoration-frames.cjs` reads the chunky-frame artwork trial.
- `scripts/test-functional-icons.cjs` reads approved SVGs under design-previews/functional-icon-system and icon-family-refinement, including the original pencil.
- `scripts/validate-artwork-raster.py` reads `output/artwork-wysiwyg-fixtures.json`; its raster output was retained. No fixture generator was run.

Do not move these inputs or change imports to make a smaller handoff. This task did not create a new archive or send anything externally. Review images, logs, licenses and credentials before preparing a distribution; it is not a certification that every retained local artifact is publishable.

## Device data and test cards

FileSystem adapters use Expo's native `Paths.document`, including Wallet v2, preserved v1 files, artwork/history/receipts, deletion recovery and pre-cutover backups. Live Samsung cards are not a project-folder database and were not removed by export cleanup. Seed definitions and regression fixtures are separate and retained.

Use [SAMSUNG-TEST-CARD-CLEANUP.md](SAMSUNG-TEST-CARD-CLEANUP.md) for the Thai existing-UI procedure. Only the owner can identify and explicitly delete unwanted membership cards. Demo cards are not deletable through Membership Delete. History can be removed independently through Select/Select All/Delete Selected; card+history deletion uses its existing count-aware confirmation and recoverable workflow. No reset button, bulk reset or real-data test was added.

## Feature status / items requiring future confirmation

See [DEV-HANDOFF.md](DEV-HANDOFF.md) for completed/limited/unimplemented capabilities and actual startup/test commands.

**Pending: Add Card face-template collection and optional random-design selection, subject to future design approval.**

Production currently randomizes a color and an existing gradient/null when a new form initializes. That limited default behavior is confirmed in source, but it is not a selectable card-face library, template artwork collection or a complete random-design generator. No such new feature or artwork was implemented here. Seven sizes remain seven footprints, not seven face designs.

Retain uncertain screenshots, caches/tool environments and earlier materials. Before external sharing, the owner must identify personal reference images/logs and agree on whether Git history, optional skills/tooling or historical visual materials should be delivered. No approval is inferred to delete them or transmit them.

## Git changes and validation

New documents only:

- [DEV-HANDOFF.md](DEV-HANDOFF.md)
- [CLEANUP-REPORT.md](CLEANUP-REPORT.md)
- [SAMSUNG-TEST-CARD-CLEANUP.md](SAMSUNG-TEST-CARD-CLEANUP.md)

The removed export directories were untracked project-local artifacts. Existing unrelated modified/untracked production work is retained. No files were staged, committed, pushed or deployed. No .gitignore/config/source import changes were made. Phase5 CI documentation was not rewritten.

Validation completed:

- All7,259 quarantined files match MANIFEST byte sizes and SHA-256; all25 original export directories are absent.
- All61 local links in the three new handoff documents resolve.
- Hashes and counts match before cleanup for src/, scripts/, assets/, design-system/, design-previews/ and artwork-trials/:2,116 protected files total. All68 pre-existing root files also match. Only the three named handoff documents were added at root.
- Final Git status/diff inspected; HEAD remains `c500a015cfc80bd6a63c88d3848562b33f02faa3`. Existing tracked changes are earlier approved work, not edits introduced by cleanup. The quarantined exports were untracked.
- Documentation diff whitespace check passed. No runtime-consumed files or Phase5 documents changed. Expected runtime impact: **none**.

No test inputs were changed, so no new build/regression cycle was necessary. Last known successful results remain TypeScript passed, focused167/167, full964/964 and Android Hermes passed, from the approved Add-discard work. Those are historical results, not a new Samsung or regression run in this cleanup.

Original website, production Wallet/cards/history/receipts, user drafts, artwork, schemas and release gates remain untouched. No dependencies, environment resets or device-storage cleanup were performed.
