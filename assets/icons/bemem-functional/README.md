# bemem functional icons

Editable 24-unit SVG sources for the existing `AddCardIcon` renderer; tests check source/path parity.

- Delete, Rotate, Add Card: exact approved SVG files copied from `design-previews/icon-family-refinement/svg/`.
- Decorate: minimal monochrome artist palette, drawn as SVG paths.
- Policy: rounded document and three horizontal lines, drawn as SVG paths.
- Edit: unchanged original pencil in `AddCardIcon.tsx`, not the rejected card-pencil.
- Login: shares the original native Account geometry in `AccountIcon.tsx`; no separate Login drawing.

Default Soft Charcoal comes from the existing theme. Decorate Delete retains semantic danger red. Glyph dimensions do not change control hit areas.

Production reuses the existing offline Base64 SVG / expo-image renderer; no PNG exports or extra runtime dependencies are required. Existing unrelated Lucide paths retain their ISC attribution in `design-previews/add-card-original-parity/LUCIDE-LICENSE.txt`.
