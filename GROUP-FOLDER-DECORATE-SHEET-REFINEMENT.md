# Group Folder — Decorate drag and Sheet refinement

## Why movement was unavailable

Two confirmed production blockers:

1. `WalletCanvas.tsx` special-cased folders in Decorate into a `pointerEvents="none"` View, bypassing its existing DraggableCard.
2. `decorate-session.ts` stored non-sticker moves in `canvas.layout`. Folder positions actually live in `canvas.folders.items[].position`. Removing only the View special case would therefore not safely implement Folder movement.

Both are fixed without another gesture handler, movement model, writer, schema or modal system.

## Movement and mode boundaries

- Folder now uses the existing DraggableCard and `createCardInteraction`: same **350ms** hold, touch slop, native responder ownership, scrolling cancellation and release behavior.
- The transient drag offset paints the whole existing Folder. On release, existing `canPlace` checks full footprint, integer grid positions, 12 columns, 240 rows and other visible Canvas occupants before invoking the existing Decorate move callback.
- The Decorate Session checks placement again, updates only the selected Folder's `position` in its existing item, validates the complete Wallet and installs it through `owner.commands.updateDraft`.
- Member IDs/order, hidden member placement hints, appearance, dimensions, card fields and page assignment are untouched. No persistent write occurs during dragging or a completed draft move.
- Folder tap is explicitly suppressed inside the Decorate responder, including accessibility activation. Directional accessibility movement remains available; the misleading open/select activation action is omitted for Decorate folders. No Sheet, Rename, Ungroup or member-detail route is opened.
- Home remains a non-draggable Pressable opening the contents Sheet; Create retains its existing tap/hold behavior, grouping callback and management controls. Ordinary card/sticker branches and thresholds are unchanged.
- Invalid transient offsets may show the existing invalid-drag feedback; releasing them cannot commit an invalid position. No new clamping or placement rule was introduced.

## Save, Discard, Undo/Redo and Back

The existing Decorate Session records **one history step for each accepted completed move**. Undo restores the prior whole document; Redo restores the moved document. An unchanged-position release returns without adding a history step. Invalid placement also adds none.

Cancel/Discard restores the Decorate **entry draft**, including any Create changes that already existed when Decorate opened. It does not replace that entry with an older Saved snapshot. Android Back still uses the existing shared dirty-exit confirmation; Keep Decorating preserves the draft/history. None of these changes introduce writes.

Save remains the existing Single Writer call, synchronous busy protection, revision admission, commit/readback comparison and uncertainty handling. Tests save/reload/recreate the owner with in-memory files and verify only the Folder position changed, the revision advanced and all member records remained identical. No retry or persistence bypass was added.

## Folder Sheet

- Header now contains a flexible name/pencil group followed by a separate Close. The title has natural width with `flexShrink:1`; the pencil follows immediately with **4dp gap**. The group has `minWidth:0`, and the pencil/Close cannot shrink.
- Long titles use at most two lines with native truncation; the pencil remains present. Full title remains in the existing Rename form. The header may consume more vertical space for long/enlarged text while the overall Sheet stays at its existing 86% height/maxWidth600 and the contents remain scrollable.
- Rename keeps the approved standalone pencil, existing callback and Create draft semantics. It is absent on Home.
- Close is the same X inside the existing GlassButton, now **48×48dp, borderRadius24**. GlassButton already propagates the supplied radius into its material/rim layers. Label remains `Close folder`; handler, Modal flags, SafeArea, outside dismissal, nested confirmation and Back handling are unchanged.
- The existing unfilled destructive text action is now **Ungroup Cards**, retaining `ciColors.action.destructive`. No trash icon or filled red CTA was added.
- Shared ConfirmationDialog wording:
  - Title: **Ungroup this folder?**
  - Body: **The folder will be removed. All cards will be kept.**
  - Actions: **Cancel** (neutral, first) / **Ungroup** (destructive).

Ungroup still invokes the original guarded Create callback. It removes the container only, preserves every card and finds valid positions on the same page. Insufficient space is rejected without mutating the draft; the existing error remains visible. Cancel never invokes Ungroup; explicit Create Save is still required to persist a successful Ungroup. No internal handler renaming/refactor was performed.

## Exact changes and preservation

Production files changed:

- `src/components/bemem/WalletCanvas.tsx`: remove the noninteractive Decorate Folder branch; add Folder-specific tap/accessibility suppression.
- `src/lib/decorate-session.ts`: write a Folder move to the correct existing position field inside the current Session action.
- `src/components/bemem/GroupFolderSheet.tsx`: inline pencil, circular Close, approved Ungroup text and confirmation copy.

Tests changed:

- `scripts/test-decorate.cjs`: actual Canvas/responder and Decorate screen mode/hold/release/Back/history coverage.
- `scripts/test-group-folder.cjs`: folder movement/save/readback/cancel/collision and Sheet rendering/confirmation tests; update old Delete label assertions.

Task-start SHA-256 comparison of existing `src`, `scripts`, `assets` and package/config files found only these **five** changed files, with no added production modules. All assets, including four Stack shells, 14 Card Faces and 270 decorations, are unchanged. GroupFolderCard and `group-folder-visual.ts` are unchanged: the approved shell, upright cover cells, approximately4dp gaps, title area and footprint remain exactly as in the visual repair. That visual repair is **still awaiting Samsung acceptance**; automated results do not approve it.

Add Card registry/randomization/store/lifecycle, photos/crop/Share, Header geometry, Canvas geometry, membership rules, Wallet schema/repository/owner, migration/backup, website and all real saved data were not edited. Existing uncommitted work was preserved.

## Validation

| Check | Result |
| --- | --- |
| TypeScript | Passed: `node node_modules/typescript/bin/tsc --noEmit` |
| Focused Folder + Decorate + default-artwork tests | **133/133 passed** |
| Full regression | **1,053/1,053 passed**, zero failed/skipped |
| Android Hermes export | Passed: `output/group-folder-drag-android` |
| Bundle | `entry-5f7b7904da065af6faa869149b468383.hbc` |
| ESLint | Unavailable: existing lint script, but no installed ESLint executable/configuration; no installation attempted |

Thirteen tests were added. Coverage includes both footprints, boundaries/collisions, unchanged member records/order/layout hints, draft-only operations, entry-draft restoration, Undo/Redo, verified Save/readback/restart, actual tap versus350ms responder release, Home/Create/Decorate branches, existing dirty Back confirmation, inline pencil/long title constraints, circular Close, exact red text/confirmation, and nested Back/outside Cancel. Existing tests cover safe Ungroup/no-space rejection, Rename/Discard and normal card/sticker gestures. Fixtures and mock native filesystem only; no Samsung Wallet file was read or changed.

Skills: `mobile-design` for native touch/scroll/Back/mode boundaries; `ui-ux-pro-max` for constrained inline layout and existing CI consistency. Design read: preserve the existing offline membership wallet on Samsung, with Pearl Gray/Lagoon Glass, no redesign. Variance1; existing motion and density retained. No new design tokens. Native responder API checked against the official [React Native PanResponder reference](https://reactnative.dev/docs/panresponder); existing Expo58 modules/configuration were reused.

## Samsung verification

Reload the same project in Expo Go; do not clear data or reinstall.

1. **Home:** tap a Folder → all members shown → member opens Detail. No Rename/Ungroup and no dragging.
2. **Create:** inspect short/long names: pencil immediately after name; X round. Test Rename then Discard (old name retained), and Rename then explicit Save if desired.
3. **Ungroup:** verify wording and Cancel leaves everything unchanged. Only if you choose to test it, confirm Ungroup; every member must return to the same page without overlap. Discard restores the Folder; Save is required to retain Ungroup.
4. **Decorate:** quick Folder tap does nothing; hold350ms and drag to empty space. Confirm the whole Folder moves, no Sheet opens, occupied/out-of-bounds release is rejected. Test Undo/Redo and Android Back → Keep/Discard.
5. If desired, move then explicit Save; return Home and reopen the app. Verify position, member order/data and appearance, then inspect normal cards/stickers and the unchanged Folder shell/gaps.

Remaining device-only checks: actual Samsung touch/ScrollView arbitration, enlarged-font wrapping, native circular material rendering, native Back/modal accessibility, visual shell acceptance and real-device Save/relaunch. No claim of Samsung acceptance is made.

No dependencies, device reset, card deletion, import, commit, push or deployment. Stop here for Samsung testing.
