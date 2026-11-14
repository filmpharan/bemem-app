# Private GitHub developer handoff checklist

This is a **future user-approved workflow**, not an executed upload. No commit/tag/remote/push was performed. Baseline: [RELEASE-BASELINE.md](RELEASE-BASELINE.md).

## Review gates before staging

- [ ] Review the current working tree, not a HEAD-only ZIP: `git status --short --untracked-files=all`, `git diff --stat`, `git diff`, `git diff --check`.
- [ ] Confirm project root: `git rev-parse --show-toplevel`; preserve existing history including `c500a015cfc80bd6a63c88d3848562b33f02faa3`.
- [ ] Read current CI, ARCHITECTURE, DEV-HANDOFF, CLEANUP-REPORT and HANDOFF-VALIDATION.json.
- [ ] Include current `src`, tests/scripts, config, package.json+package-lock.json, AGENTS.md, project skills, production assets/licenses, required output fixture, editable sources and referenced preview/trial fixtures. Do not use blanket staging as a substitute for review.
- [ ] Exclude node_modules, .expo, native/export outputs, tool installations/profiles, Python/browser caches, machine settings, quarantine, secrets and private device files. `.gitignore` preserves `output/artwork-wysiwyg-fixtures.json` because the raster validator reads it.
- [ ] Inspect retained historical images for privacy/rights. In particular, the two JPEGs under `design-previews/card-detail-ux/references/` need owner review before sharing. A private repo still discloses files to invited developers. No blanket binary privacy certification was performed.
- [ ] Review hard-coded local paths in old documentation/tooling; do not publish workstation credentials or assume local artwork-tool paths work on another machine. Runtime asset references must remain portable.
- [ ] Check filenames and tracked files for `.env`, keys/credentials/private photos/Wallet dumps; run an approved secret scanner if available. No scanner was installed here. A basic pattern scan is not proof that all secrets are absent. If a secret is found, stop, remove it from the proposed upload and consider rotation/history remediation before publishing; never print its value.
- [ ] Verify sizes and that no file exceeds GitHub limits. This handoff found no proposed file above10MB; the original tooling cache is excluded, not uploaded.

## Fresh verification

Use the locked dependency tree (`npm ci` on the developer's machine), then the commands in DEV-HANDOFF. Do not run `reset-project` or reset Expo Go/Wallet. Existing lint has no installed ESLint/config; do not let Expo auto-install lint packages without approval.

Confirm TypeScript, focused tests, full suite, local Android Hermes export, JSON, documentation links, static asset references and `git diff --check`. Do not run tests against the Samsung filesystem. Keep test/build outputs local; external quarantine is not a repository deliverable.

## Stage and commit only after separate approval

1. User approves the reviewed file set and privacy decisions.
2. Stage explicit reviewed paths with `git add -- <path1> <path2> ...`; include necessary untracked modules/assets/fixtures, not only historically tracked files. Check `git check-ignore -v <required-path>` if something expected is missing.
3. Inspect `git diff --cached --stat`, `git diff --cached --name-status`, `git diff --cached --check`, `git diff --cached`. Inspect binary paths separately. Recheck that forbidden files were not already tracked (ignore rules do not untrack them).
4. Only when approved: `git commit -m "bemem Samsung Accepted Baseline - 2026-11-14"`. Record the returned hash and file count. This is a normal new commit preserving old history, not a history rewrite.
5. Only if separately approved, create an annotated development-baseline tag such as `git tag -a samsung-accepted-2026-11-14 -m "Samsung accepted development baseline"`. Verify the tag does not already exist. Do not invent a public release version.

## Private remote and external developer

1. Owner creates the intended **private** empty GitHub repository after review. Confirm owner/organization, visibility, artwork/source rights and collaborator scope. No repository is created by this task.
2. Inspect `git remote -v` and current branch (`git branch --show-current`). At handoff there is no remote. Do not assume `origin` belongs to the user.
3. After explicit approval, add the verified URL with `git remote add origin <verified-private-url>` only if no origin exists. If it exists unexpectedly, stop and review; do not replace it blindly. Authenticate using approved Git credential handling, never commit a token or put it in documentation.
4. Review the exact outgoing branch/commits. Then, only when approved, `git push -u origin <reviewed-current-branch>`. No force push. Push the specific approved tag separately if desired; avoid blindly publishing all local tags.
5. Owner invites the developer through repository access settings with minimum required permissions. Enable branch protection/review rules as appropriate; no direct messages/invitations are sent by this task.
6. Developer clones privately, uses npm ci, runs verification and reviews regression-sensitive boundaries before changing data/UI. Do not grant permission to reset/migrate a user's Samsung Wallet merely by granting repository access.

**Remaining decisions:** retained image/privacy review, final staged file approval, private repository ownership/URL, commit/tag approval and explicit push approval. The project is prepared for review, not silently certified or published.
