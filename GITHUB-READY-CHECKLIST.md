# bemem developer-review GitHub handoff checklist

Historical preparation follows below. Current 2026-11-23 owner instruction authorizes the verified review branch, explicit staging, commits and review-branch push, accepts existing visibility, and preserves history. No force push, main/master update, deployment, source refactor or device operation is authorized. The current status section at the end supersedes historical blockers.

## Current facts

- Branch: master. HEAD: `3ec5a45bd9765594f5901b8ab196ba2f8950bde4`.
- Before this phase: 90 modified tracked files and 113 untracked files, including 34 source files. Current counts and every candidate path are in HANDOFF-INVENTORY / HANDOFF-STAGING-MANIFEST.
- Existing origin: GitHub repository `filmpharan/bemem-app`; URL has no embedded credential observed. Do not add/replace it.
- Private visibility: NOT VERIFIED. Existing non-interactive credential lookup returned no usable credential; no interactive login or remote modification was attempted. Owner must verify private visibility and intended recipients before upload.

## File and privacy gates

- [ ] Review INCLUDE/REVIEW/EXCLUDE/UNKNOWN classifications and exact paths in `HANDOFF-STAGING-MANIFEST.json`. This is not permission to execute it.
- [ ] Include all approved required Source, Tests, lockfile, production assets and referenced fixtures. HEAD-only export misses the current app.
- [ ] HUMAN APPROVAL REQUIRED: `design-previews/card-detail-ux/references/reference-code128.jpg` and `reference-qr.jpg`. Do not reproduce decoded codes or private data in documents.
- [ ] HUMAN APPROVAL REQUIRED: Original artwork and historical screenshots/mockups; bundled skills/third-party materials and redistribution scope. Preserve font/artwork licenses and attribution. Root LICENSE is the existing Expo MIT notice, not a new rights determination for every asset.
- [ ] Already-tracked REVIEW/EXCLUDE material is in HEAD/history. Merely omitting it from staging does not exclude it from a push. Any removal/history remediation requires separate approval; do not rewrite history here.
- [ ] Keep node_modules, .expo, .artwork-tools, browser profiles, local databases/device exports, secrets and generated outputs excluded. Never force-add output trees.
- [ ] Preserve tracked `output/artwork-wysiwyg-fixtures.json`: it is required input to the optional raster validator, not a generic build artifact.
- [ ] `.vscode/settings.json` is already tracked although ignored now; it contains editor settings, not a detected credential. Decide relevance explicitly rather than assuming the ignore rule removes it.
- [ ] Scan the final staged paths and relevant Git history for secrets/privacy before pushing. Basic filename/text checks are not whole-history or binary privacy certification.

No .gitignore change was necessary in this phase: existing local tooling, output and secret exclusions cover the observed generated material. A future policy for device dumps/databases should use exact approved paths, not broad exclusions that hide required fixtures.

## Validation gates

- [ ] Follow DEV-HANDOFF toolchain and lockfile instructions; fresh `npm ci` has not been executed here.
- [ ] Review newly executed TypeScript, focused/full test, Hermes and diff-check results in HANDOFF-VALIDATION.json. Lint unavailability must be explicit, never auto-installed.
- [ ] Preserve Safety invariants, recorded owner acceptance and Known issues. In particular, do not label Reminder delivery or durable unsaved-media recovery as complete.
- [ ] Refresh manifest hashes/status if any source, test, asset or document changes after preparation. Verify asset requires and no omitted untracked inputs.

## Future approval sequence ? NOT executed

1. Owner approves privacy/rights decisions and exact candidate manifest, plus any necessary exclusions of existing tracked material.
2. Owner verifies the existing private repository, recipients and access scope.
3. Only after separate staging approval, stage the exact approved delta. Review cached diff, diff-check, inventory completeness and no secrets/data.
4. Obtain separate commit/branch approval. Preserve existing history; no reset, force, tag or branch switch is implicit in preparation.
5. Reconfirm final commit and private remote, then obtain explicit push approval. Do not use `git add .`, force-push or create a replacement repository as a shortcut.
6. Developer receives source map, test evidence, Safety invariants and known issues. Repository access is not permission to reset/migrate the owner's Samsung Wallet.

Current readiness: documentation and reviewable inventory prepared; upload remains blocked on human approvals and private-visibility verification.

## Current owner-authorized review upload

- Existing remote main verified at 3ec5a45bd9765594f5901b8ab196ba2f8950bde4, identical to local master before review work. No history rewrite is needed.
- Dedicated branch: developer-review/2026-11-23-motion-handoff; verify it does not exist before creation and push only that branch.
- Owner accepts repository visibility. Preserve inherited tracked material and all license notices; no new broad historical-rights audit or permission changes.
- Current exact delta comes from HANDOFF-STAGING-MANIFEST.json. Former REVIEW delta is reclassified by actual runtime/test dependencies; generated/optional previews remain untracked locally. Current SVG masters are necessary test inputs, not incidental editable extras.
- Validate source/assets/lock agreement and fresh isolated install; capture reports without overwriting existing output. Exclude only geometry export from full regression.
- Stage application/tests/required assets explicitly and commit; stage handoff docs/inventories explicitly and commit separately. Review staged paths/check and verify source tree content before push.
- Push only the named review branch after validation; verify remote SHA and unchanged remote main. Stop on regression, unexpected history, or authentication failure. Do not deploy.
