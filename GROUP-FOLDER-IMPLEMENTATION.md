# Lagoon Glass Group Folder — production implementation

14 November 2026. Implemented in the existing uncommitted working tree. Awaiting Samsung acceptance. No device Wallet files were accessed, no migration/import was run, and no Commit/Push/Deploy was performed.

## Implemented behavior

- Create, editable page, active v2 owner: the existing 350ms long-press drag can end on a different membership card to open the name/orientation sheet. Grouping runs only at drop release; taps and scrolling keep their original paths. Cancel/Android Back do not modify the draft.
- Confirmation creates a stable Folder ID and a **draft-only** relationship for those two cards. Choose 6×4 landscape or 4×6 portrait. Placement prefers the target card's location and otherwise uses existing collision-safe first-free placement; the folder may be farther down the canvas if that location cannot fit. Existing cards/decorations are not shifted.
- Drag an ungrouped membership card onto a folder to append it in stable order. Capacity six, no duplicate membership, no Demo cards, no nesting and no cross-page grouping. Full folders show compact English feedback and reject the drop.
- Folder movement uses the existing Create drag/move path and full-block collision rules. No global responder, new gesture threshold, Home drag or Home swipe was added.
- Home opens a display-only contents sheet. All members can open the existing Card Detail. There are no Folder management controls on Home.
- Create's sheet adds a pencil for Rename and a secondary destructive **Delete Folder** action. Delete Folder is **Ungroup only**: its shared ConfirmationDialog explains that all cards/photos/history are kept. Cancel changes nothing. Confirmation updates the draft and returns every member to that same page, using retained positions where available and collision-safe first-free positions otherwise. If placement fails, the original folder/draft remain unchanged.
- Create Save/Discard/Stay remains authoritative for create/add/rename/move/ungroup. Saved and Draft are separate snapshots. Revisions/readback and the single writer are unchanged.
- The existing **Delete Card** workflow keeps its own explicit confirmation/history policy and verified save. Deleting a member from three or more updates that folder in the same snapshot. Deleting one of two dissolves the folder and returns the last card, preferring the former folder location, then the closest valid location. This is part of the already confirmed Card deletion transaction, **not an extra automatic Save** or permission to delete another card.
- Placement for dissolution is preflighted **before history removal**. Failure leaves the Wallet and history untouched. Existing history recovery/attachment cleanup is not redesigned.

## Visual implementation

`GroupFolderCard.tsx` refines the existing Lagoon Stack foundation: consistent teal/blue-green tabbed shell, glass rim/highlight, upright full-bleed image occupancy and the established lower name area. Static SVG is displayed through the existing Expo Image module; no new dependency, animated material or native blur was added.

The source is each member's actual `appearance.artwork.front`. Its immutable local asset URI is rendered with centered `contentFit="cover"`; no member image, EXIF/source bytes or saved crop is rewritten. The miniature intentionally center-crops the original front source to its region. The full card in the sheet continues using the existing saved card presentation/crop. Existing default/gradient appearances are reused where no front image exists. No new seven-color default is forced onto saved cards.

| Members | Landscape 6×4 preview | Portrait 4×6 preview |
|---|---|---|
| 2 | Two equal vertical regions | Two equal horizontal regions |
| 3 | Three equal vertical regions | Three equal horizontal regions |
| 4–6 | First four, 2×2 | First four, 2×2 |

Regions have no miniature border, card frame, repeated text, rotation or internal empty margins. Names use controlled two-line truncation and full accessible labels. No count badge or hidden-count label exists.

The contents sheet uses the approved Pearl Gray/modal foundation and existing MembershipCard components. It is a small read-only canvas, not a labeled gallery. Deterministic first-fit packing is centered as a set; a shared block unit preserves all seven card footprints, 0.1-block inset and 14dp corners. Narrow sheets use ten packing columns rather than twelve to preserve readable/tappable sizes; this is **display-only**, not a change to the production 12-column Canvas. The sheet scrolls and never allows manual dragging. Close/outside/Android `onRequestClose` dismiss it. Opening Card Detail temporarily unmounts the folder modal and restores it on return, avoiding a stack of two visible native modals.

## Data contract and preservation

The existing WalletDocument stays schemaVersion 2 with one optional, strict additive extension:

```ts
canvas.folders?: {
  version: 1;
  items: {
    id: string;
    name: string;                 // nonblank, max 120 characters
    orientation: 'landscape' | 'portrait'; // exactly 6×4 / 4×6
    position: { col: number; row: number };
    memberCardIds: string[];       // 2..6, unique, ordered membership-card IDs
  }[];
};
```

Page ownership uses the existing `canvas.pages.assignments[folderId]`; all member assignments must match. No duplicate card records or alternate repository/store are created. Every member remains in `cards` with its original ID, payload, name, expiry, size and artwork. Its original `canvas.layout` coordinate remains as a restoration hint while hidden inside a folder. Hidden members are not active Canvas collision occupants; the full Folder rectangle is. Ungroup validates new active positions before installing a draft.

The validator rejects orphan IDs, Demo/nested members, duplicate membership across folders, singleton/empty/seven-member objects, unknown fields, cross-page membership, invalid bounds and collisions with active cards/folders/decorations. Existing v2 documents without folders remain absent/unchanged when read. No automatic backfill/migration occurs. Empty extension arrays are permitted; empty Folder objects are not.

The existing repository serializes Cards + Layout + Folders in **one** pending/validate/promote/readback snapshot. Existing expectedRevision, pending, single-JS-process gate and commit-uncertain protections remain in force, without retry. No stronger OS atomicity or multi-process/crash guarantee is claimed. The v1 adapter explicitly refuses folder data so it cannot silently strip the extension.

Historical committed revisions are not rewritten. A pre-folder app binary has a strict older validator and cannot safely interpret new folder snapshots; do not downgrade and write from that older reader. Its fail-closed behavior is preferable to silently dropping relationships. Any future downgrade/recovery procedure requires separate approval.

Group-aware compatibility changes are limited to Canvas projection/page mutation checks, grouped-member resize planning and the existing selected-card deletion preparation. Existing search algorithm is unchanged: active search receives a detached presentation including grouped members, so their names remain searchable without exposing them as duplicate saved Canvas objects. Decorate treats folders as passive full-footprint obstacles; its artwork/undo/redo/gesture infrastructure is unchanged.

## Files changed in this task

New:

- `src/types/group-folder.ts`
- `src/lib/group-folder.ts`
- `src/components/bemem/GroupFolderCard.tsx`
- `src/components/bemem/GroupFolderSheet.tsx`
- `src/components/bemem/FolderNameSheet.tsx`
- `scripts/test-group-folder.cjs`

Existing integration files:

- `src/types/wallet-document.ts`, `src/types/wallet-ui.ts`
- `src/lib/wallet-validation.ts`, `wallet-preparation.ts`, `canvas-pages.ts`, `wallet-production-policy.ts`, `wallet-storage-adapters.ts`
- `src/lib/card-editor-state.ts`, `wallet-feature-commands.ts`
- `src/hooks/use-wallet-canvas.ts`
- `src/components/bemem/MembershipCard.tsx`, `WalletCanvas.tsx`
- `src/app/index.tsx`
- `scripts/test-card-form.cjs` — add the new component to the existing isolated render fixture; keep existing style/radius assertions.

Protected file hashes were compared with the pre-task working tree: production assets (including all 270 decorations), original previews, current design-system files, package/lockfile, app.json and AGENTS.md are unchanged. The website was not modified. No Add/Edit UI, Header component, Search algorithm, encoder, History store, backup, release gate or runtime owner was replaced.

## Validation and tools

See `output/group-folder-validation/` for focused/full test logs and Android export log. `GROUP-FOLDER-VALIDATION.json` records the final counts: **TypeScript passed, focused 40/40, full regression 1004/1004, Android Hermes export passed**. Mock storage/native UI fixtures use only synthetic records. Node's default test subprocess was denied by the sandbox, so the tests used `--test-isolation=none`; the existing installed Hermes compiler required a process-spawn sandbox escalation. Neither action changes OS security settings or installs dependencies. Android export is local at `output/group-folder-android/`; it did not launch the app or operate on Samsung data. Lint could not run because the configured package script has no installed ESLint CLI; no dependency was installed.

Used the installed mobile-design and ui-ux-pro-max guidance for mobile controls, safe modal transitions, typography and CI; bemem-illustrator guidance for static original shell geometry/material consistency. No new illustration pack, sticker changes or design exploration was introduced. Confirmed installed Expo 58/RN 0.88 module usage against [Expo Image SDK 58](https://docs.expo.dev/versions/v58.0.0/sdk/image/), [RN PanResponder](https://reactnative.dev/docs/panresponder) and [RN Modal](https://reactnative.dev/docs/modal).

## Samsung acceptance — not executed by Codex

From this project run `npm.cmd start -- --go`, then open the same project in Expo Go. Keep existing app data. Use membership cards you have chosen for testing; Demo cards intentionally cannot group.

1. Create → tap opens Card Detail; scroll before the hold threshold does not group. Hold 350ms and move a card normally: existing drag remains usable.
2. Drag A onto B → setup; Cancel and Android Back each leave both positions/draft unchanged.
3. Repeat → name + Landscape 6×4 → confirm. Folder appears in the draft, potentially in the next free space. Discard restores both cards and prior layout.
4. Repeat and Save → Home → folder opens; no Rename/Delete controls. Close/outside/Back work. Reload the project and verify the same folder/members.
5. Repeat with Portrait 4×6. Test a long name, portrait members and personal front photos; images fill their regions without borders, tilt or distortion.
6. In Create, add members by drag to reach 3/4/5/6. Check the approved region partitions, first-four ordering and no badge. A seventh is rejected and remains outside.
7. Open a six-member sheet, scroll to every card, then open and close real Card Detail. QR/Code128 and existing card tools still use the same saved member data. Sheet members cannot drag.
8. Create → pencil Rename → Cancel / Save Name. Discard versus Create Save restores/persists the expected name.
9. Delete Folder → confirmation explicitly keeps cards. Cancel leaves everything unchanged; confirm Ungroup returns all members to the same page without moving unrelated objects. Test Discard and Save separately.
10. With two deliberately disposable test memberships in a saved folder, exercise the **existing Delete Card confirmation** for one member. Confirm only that intended card is deleted, the final member returns safely and its data/history remain intact. Do not confuse this with non-destructive Delete Folder.
11. Verify locked/read-only page restrictions, page switching with dirty drafts, ordinary card drag/scroll, Home Search for a grouped member, and Decorate collision/Undo/Redo/Save.

Remaining device checks: actual Samsung drop accuracy/scroll arbitration, SVG/image decoding, font scaling/name clipping, keyboard/safe-area sizes, modal transitions, Back behavior and native FileSystem persistence across a real process restart. Tests and Hermes compilation do not establish those physical-device results.

Ungroup uses retained hints followed by deterministic first-free placement without rearranging unrelated objects. It can conservatively reject a tightly packed draft rather than attempting an exhaustive global repack. Rejected operations keep the prior draft intact. No individual remove-member/reorder UI, folder orientation editor or standalone Create Folder button was added.
