# Future Group Folder contract — proposal only

This is not a production type, repository, schema change or migration. Field names must be aligned with existing production models in a separately approved implementation.

```ts
type FolderFootprint = 'landscape-6x4' | 'portrait-4x6';
type GroupFolderProposal = {
  id: string;
  name: string;
  footprint: FolderFootprint;
  memberCardIds: readonly string[]; // unique, stable order, length 0..6
  canvasPage: 1 | 2 | 3 | 4 | 5;
  position: { col: number; row: number };
};
```

- The footprint maps exactly to 6×4 or 4×6; it does not change any membership card's size.
- Member IDs reference existing cards. Do not copy membership numbers, code payloads, images, histories or receipt data into the folder.
- Shell previews resolve `memberCardIds.slice(0, 4)`. Contents resolve **all** ordered IDs, at most six. Do not derive sheet contents from the preview subset. Never display count badges.
- Folder name is independent of count. Clamp the shell text safely; keep its full accessible label and full sheet title.
- Validate unique/reachable IDs, capacity, footprint, current page access and full-block grid bounds before any future write. No visual-inset collision shortcuts.
- Missing IDs must produce an explicit validation/recovery result in the later implementation, not silently disappear. The prototype contains only internally consistent fixtures.
- Child positioning/ownership, restoring standalone positions when ungrouping, folder deletion, grouping consent, collision occupancy and entitlement interactions require product decisions before production code.
- Future persistence must use the existing Wallet v2 single writer, revision and readback protections. Do not add a parallel folder store or independent writer.

Current fixtures use zero-based display coordinates solely inside the offline preview. Their sheet packing is not saved and does not define production Canvas positioning semantics.
