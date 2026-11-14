# Group Folder — Lagoon Stack visual repair

## Findings: code evidence versus device hypotheses

Confirmed from the task-start production source:

- `src/components/bemem/GroupFolderCard.tsx` generated a simplified single SVG through a URL-encoded `data:image/svg+xml;utf8,` URI. It did not use the approved **B / Lagoon Stack** back/front assets. Its palette, tab geometry and depth differed, and it omitted the separate front pocket layer. The approved design was therefore only partially implemented (scenario F).
- `folderPreviewRegions()` returns contiguous normalized partitions. Production painted them edge-to-edge, with no intentional gutters. The old `bottom:44` and height-based top also differed from the approved Stack geometry.
- `MembershipCard.tsx` immediately delegates folders to `GroupFolderCard` before ordinary-card background/rim/text styles. Both Home's Pressable path and Create's DraggableCard path in `WalletCanvas.tsx` render this same MembershipCard. Decorate also uses it. There is no separate Home-only folder renderer.
- Create only adds a two-dp outer border while dragging; it does not replace the shell with a filled selection layer. The common Canvas card style does not clip the folder. No evidence of a higher opaque Canvas layer covering the shell was found (B/D not supported by code).

The user's reported outlined-container appearance is consistent with the member previews/title remaining visible while the single SVG shell fails to display. **Actual failure of that native SVG data URI is a hypothesis, not a reproduced Samsung diagnosis.** A/C/E require the user's device observation. There is no evidence here of a Wallet persistence failure; no data repair was attempted.

## Rendering changes

Production now uses the exact existing approved PNG exports, byte-for-byte:

| New bundled path | Approved source |
| --- | --- |
| `assets/group-folders/lagoon-stack-landscape-back.png` | `design-previews/lagoon-glass-group-folder/assets/shells/B-landscape-back.png` |
| `assets/group-folders/lagoon-stack-landscape-front.png` | `design-previews/lagoon-glass-group-folder/assets/shells/B-landscape-front.png` |
| `assets/group-folders/lagoon-stack-portrait-back.png` | `design-previews/lagoon-glass-group-folder/assets/shells/B-portrait-back.png` |
| `assets/group-folders/lagoon-stack-portrait-front.png` | `design-previews/lagoon-glass-group-folder/assets/shells/B-portrait-front.png` |

No shell or card artwork was regenerated. The four PNGs total **75,609 bytes** and have genuine transparent backgrounds. Landscape is 580×380; portrait is 380×580, matching the existing painted 5.8×3.8 / 3.8×5.8 block aspect ratios. Static literal requires avoid relying on runtime SVG data-URI decoding for the shell. The decoder's behavior on the user's Samsung is not claimed to be proven.

Explicit paint order inside the unchanged folder footprint:

1. Approved teal/blue-green back, tab, rim and shine (`zIndex:0`).
2. Upright Front-only preview cells (`zIndex:1`).
3. Approved translucent pocket lip/front (`zIndex:2`).
4. Existing white folder name in the bottom name area (`zIndex:3`).

No second full-size card outline or new selection overlay was added. Canvas touch targets, drag responder, saved positions, block inset, silhouette allocation and opening behavior are unchanged. The existing name stays at 12/16, two lines, maximum font multiplier 1.3; overflow beyond two lines uses native truncation. The full folder name remains in the existing parent accessibility label and Folder Sheet.

## Exact spacing and geometry

`src/lib/group-folder-visual.ts` is a presentation-only helper. It does not modify `src/lib/group-folder.ts` or any persisted records.

- Measured painted width/height come from the folder root's `onLayout`.
- Gap = **min(4dp, 0.04 × min(painted width, painted height))**. Representative 360/393/412dp windows all yield 4dp; a compact 80×120dp example yields 3.2dp.
- Interior horizontal boundary remains 7% on each side. No additional per-cell outer margin or individual frame was added.
- Preview top: 24% of height for landscape, 18% for portrait, following Stack placement.
- Bottom reservation = max(24% of height, 7% of height + 32dp × clamped font scale + gap). Font scale is clamped to 1–1.3 to match the existing title maximum. This keeps two title lines separate from the preview well.
- Cell width = (well width − gap × (columns−1)) / columns. Height follows the same row formula. Gaps occur only between adjacent cells; equal cells remain equal, including three-member layouts.
- Landscape: two or three equal columns; portrait: two or three equal rows. Four to six members: 2×2, first four in unchanged member order.
- FrontRegion still uses each member's actual Front source with `contentFit="cover"`, centered, no tilt, text, count, +2 badge or separate border. It does not rewrite the saved crop. Legacy/no-image gradient fallback remains unchanged.

Preview edges and gutters expose the approved shell. No free-resize, auto-placement, logical footprint or membership change was introduced.

## Files changed in this task

- Modified: `src/components/bemem/GroupFolderCard.tsx` and `scripts/test-group-folder.cjs`.
- Added: `src/lib/group-folder-visual.ts` and the four shell PNG copies listed above.
- Added this report, `GROUP-FOLDER-VISUAL-VALIDATION.json`, and local validation/review artifacts under `output/group-folder-repair*`.

Task-start SHA-256 comparison of all existing `src`, `scripts`, `assets` files and package/config files found **only the two modified files above**. Add Card artwork/lifecycle, all 14 Card Face PNGs and manifest, 270 decorative assets, Wallet types/schema/repository/owner, Group Folder business logic/sheet, Header, Canvas, membership ordering, Save/Discard and dependencies are unchanged. Existing uncommitted work was preserved; no real Wallet/device file was accessed or changed.

## Validation results

- TypeScript: **passed**, `node node_modules/typescript/bin/tsc --noEmit`.
- Focused Group Folder + default artwork tests: **76/76 passed**. Group Folder alone now has 53 tests; 13 tests added in this task.
- Full regression: **1,040/1,040 passed**, zero skipped, using `node --test --test-isolation=none scripts/test-*.cjs`.
- Android Hermes: **passed**, local export at `output/group-folder-repair-android`; bundle `entry-b2b62838100218da863018d87e4143e4.hbc`.
- Lint: not run; the existing `expo lint` script has no installed ESLint executable/configuration. No dependency installation was attempted.
- All four PNGs decode and have alpha=0 background pixels; copied bytes match approved sources. `output/group-folder-repair/asset-validation.json` records size/alpha/hash details.

Added tests cover both orientations/counts 2–6 at representative 360/393/412dp widths and font scales 1/1.3/2 (title uses the existing cap), positive/equal cells, non-overlap, exact gutter separation, title clearance, stable first four, two actual shell layers, byte equality with approved masters, layer order, long title, no badges/extra text, unchanged pointer handling and shared production call sites. Existing functional tests cover Home view-only, Create management, persistence/readback, membership capacity, sheets, opening details, ungroup/dissolution, confirmation and Cancel.

These are mocked native component/geometry and in-memory persistence tests, not proof of native image decoding, physical touch sizes or Samsung visual acceptance. Expo 58 Image support was checked against the official [versioned reference](https://docs.expo.dev/versions/v58.0.0/sdk/image/).

## Visual review and Samsung checklist

`output/group-folder-repair/landscape-portrait-review.png` shows both orientations with two through six members, using the production PNG layers and exact helper output at one common block scale. It is a **Pillow-composited review, not a browser or Samsung screenshot**; font rendering and native pixel rounding can differ. `visual-geometry.json` records its exact geometry.

On Samsung, reload this same project without clearing Expo Go or Wallet:

1. Inspect existing folders in Home, then Create. Confirm the teal tab, rim, shell and bottom name area appear in both.
2. Inspect existing two/three/four-member landscape and portrait folders; five/six must show only the same first four. Confirm small gutters, upright full-cell cover, and no count badges.
3. Check a long name and enlarged font setting. Confirm title/preview separation and full name in the existing Sheet.
4. Hold/move a folder only if desired; confirm the existing drag border does not hide the shell. Cancel/Discard should preserve the saved layout. Verify opening the sheet/detail still works.
5. If you explicitly change a draft, use the existing Save and return Home; verify the same folder rendering, then reopen the app. No automatic Save, group recreation or data reset is part of this repair.

Design read: existing offline membership wallet for Samsung users, retaining approved Lagoon Glass Stack material and all interactions. Design variance 1, motion 0, density unchanged except intentional preview gutters. `mobile-design` guided native adaptivity/accessibility; `ui-ux-pro-max` was checked for layout consistency (generic touch-spacing guidance is inapplicable to noninteractive preview cells); `bemem-illustrator` was read for source/material consistency and asset validation, without creating new artwork.

No dependency installs, website edits, reset, migration, commit, push or deployment. Stop for Samsung review.
