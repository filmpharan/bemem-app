# bemem CI — Developer entry guide

Read [BEMEM-CI-CURRENT-APPROVED.md](BEMEM-CI-CURRENT-APPROVED.md) first. It is the sole current-approved specification; [CURRENT-TOKEN-MAPPING.md](CURRENT-TOKEN-MAPPING.md) explains compatibility with historical declarations.

## Before changing UI

1. Read the current task approval and inspect Git status/diff. The working tree contains approved work newer than HEAD; never restore whole files from historical snapshots.
2. Trace the actual rendered component, current owner/callback and local overrides. Current source is the runtime authority; if it conflicts with owner-approved behavior, stop and report the specific discrepancy.
3. Reuse ciColors/ciTypography/ciStates, sheetVisual, GlassButton, AddCardSheet, ConfirmationDialog and approved custom icons where they fit. Do not create parallel modal, theme, writer or icon systems.
4. Treat rc2 TOKENS.json and existing theme adapters as runtime-consumed. Do not rename keys, replace the file or delete aliases to make documentation tidy.
5. Keep visual edits separate from data, navigation, entitlement and business logic. Approval to restyle chrome does not authorize persistence or release-gate changes.

## Protected implementation boundaries

- Preserve master §§4–5 Header/selector geometry, single row, exact slot assignments, same-window popup measurement and removed Home Swipe. Do not revive historical CreatePRO or bottom Create Save examples.
- Preserve master §9 grid, all seven footprints, fixed radius, inset, page-local positions and logical collision rules. Never normalize Detail cards to one width.
- Preserve user card artwork, images, decorations, WYSIWYG crop and Share export pixels. App-owned chrome and user-owned content are different scopes.
- Use restrained static glass only where established. No global blur, new glare/motion or heavy border/shadow treatment.
- Keep semantic Back/Save/destructive/neutral meanings, accessibility labels/states, disabled/busy admission and explicit safe confirmation. Caller owns mutations; dialog owns presentation only.
- Nested confirmation belongs in its existing presentation host. Do not add another native Modal or competing Back listener merely for style reuse.
- Preserve Saved/Draft separation, offline Wallet v2 single writer, revision/conflict/readback, backup/recovery and photo-cleanup safety. No Reset/Reimport/testing against real data.
- Preserve Name/Number/payload strings, including leading zeros, spaces and case. Preserve code eligibility and white/black scannable output.
- Phase4 is deferred audit evidence, not a backlog automatically authorized for implementation. Login/Cloud/billing placeholders are not implemented services.

## Component checklist

- [ ] Choose an existing typography role; document any justified local size/line-height exception.
- [ ] Choose semantic colors; preserve card/photo/code/export exceptions.
- [ ] Cover pressed, disabled, selected, busy and error states without changing action meaning or bounds.
- [ ] Check actual touch target and parent clipping; distinguish icon size from target. Do not overlap neighboring hitSlop.
- [ ] Check available width, long text and increased fontScale, including whole-string Thai shaping where applicable.
- [ ] Check SafeArea, system bars, keyboard, scroll and footer reachability in the actual window/context.
- [ ] Consider existing component reuse before adding a new primitive.
- [ ] Preserve gesture ownership and tap/hold/scroll alternatives; never introduce Home horizontal swipe implicitly.
- [ ] Verify no unauthorized data mutation, schema/storage change or user-image recoloring.
- [ ] Plan screenshots/device acceptance for meaningful visual changes; headless tests do not prove Samsung rendering or TalkBack behavior.

## Validation and reporting

For runtime UI work, run TypeScript and affected behavior tests; use full regression/Hermes export where the task requires it. Run lint only when configured; do not install dependencies to satisfy a documentation task. Follow local AGENTS.md and current official docs before version-specific Expo/RN API changes.

For documentation-only work, validate references, exact values, historical notices, internal consistency and final diffs. No runtime migration/build is needed merely to update prose. If a required edit becomes runtime-affecting, stop for separate approval.

Report changed files, actual tests performed, remaining limitations and a short device checklist. Require owner Samsung acceptance for meaningful new visual behavior; never claim physical verification from mocked tests or an earlier approval. Preserve the task's Commit/Push/Deploy restrictions.

Historical notices/archives are for explanation. Do not follow old examples automatically; the master records intentional current exceptions and deferred concerns.
