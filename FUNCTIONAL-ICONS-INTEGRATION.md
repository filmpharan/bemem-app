# Functional icon refinement — completed

## Recovered progress

The approved preview sources were already present. Production Edit already used the correct original standalone pencil. Delete/Rotate still used older native geometry, and Account menu rows still had no icons. Existing Phase 1/2 work was preserved; baseline HEAD remains `c500a015cfc80bd6a63c88d3848562b33f02faa3`.

## Final production mapping

| Action | Drawing | Location |
| --- | --- | --- |
| Delete | Exact approved trash SVG, semantic danger color | Existing Decorate delete control |
| Rotate | Exact approved turn SVG | Existing clockwise 90-degree Decorate control |
| Edit | Unchanged original standalone pencil | Existing Card Detail edit control |
| Decorate | Monochrome artist palette | Home Account menu |
| Policy | Rounded document, three text lines, no checks | Home Account menu |
| Login | Same original native Account/Profile geometry | Home Account menu |
| Add Card | Exact approved card-plus SVG | Home Account menu |

The existing SVG Base64/expo-image renderer is reused. Defaults remain 16dp for existing form/detail glyphs; contextual Decorate glyphs remain 22dp. Menu glyphs are 20dp with existing 48dp minimum row touch targets. Account's original 24×26 geometry is extracted unchanged and uniformly scaled for the Login row. Menu labels retain text scaling and may wrap rather than truncate.

## Files

Production changes:

- `src/components/bemem/AddCardIcon.tsx`: five mappings plus optional size/context color.
- `src/components/bemem/DecorateIcon.tsx`: existing contract delegates to approved SVG mappings.
- `src/components/bemem/HomeAccountMenu.tsx`: icons beside the same four labels; existing handlers, policy text and overlays untouched.
- `src/components/bemem/AccountIcon.tsx`: shared original Account drawing.
- `assets/icons/bemem-functional/`: five editable SVGs and provenance README. Delete/Rotate/Add Card are byte-for-byte approved copies; Decorate/Policy are new local vectors.

Validation: `scripts/test-home-account.cjs`, `scripts/test-functional-icons.cjs`. No changes to existing action handlers, Wallet, History, encoders, Grid or decorative assets. No runtime PNGs or dependencies added.

## Validation

- TypeScript: passed.
- Full automated suite: **739/739 passed**, including seven added mapping/rendering checks and existing menu navigation, editing, decoration deletion, clockwise rotation and Undo/Redo coverage.
- Android Hermes: passed; local `.hbc` output, approximately 3.8MB. Initial restricted-process Hermes launch failed with EPERM; the same export passed with permission to launch the local compiler.
- Lint: not run; an `expo lint` script exists, but no ESLint configuration or ESLint dependency is installed. Nothing was installed to add linting.
- New SVGs rendered using the installed Inkscape CLI and decoded using Pillow: 192×192 RGBA with genuine transparency; inspected at 20dp. Fontconfig/recent-file warnings did not prevent export. QA output is in `output/functional-icons-qa/`, separate from production.
- Session baseline comparison: only the three intended existing production icon/menu files and the existing menu test changed. All other previously existing files under `src`, `scripts`, and `assets` retain their pre-resume hashes, including all decorative assets. Added files are listed above. Validation evidence: `output/functional-icons-validation.json` and `output/functional-icons-all-tests.txt`.
- No native wallet files were accessed, and no membership cards or decorations were deleted during validation. No Commit, Push or Deploy.

## Samsung check

Reload the existing Expo Go session without clearing data. Open Account and check the four labeled icons: Add Card enters Create; Decorate opens Decorate Mode; Policy opens the existing sheet; Login opens Coming Soon. In Create, open a membership card and check the original Edit pencil opens the existing editor, then Cancel. In Decorate, add a temporary decoration, rotate it once (90 degrees), delete only that temporary decoration, and check Undo/Redo; Cancel to discard this test draft. Check normal and enlarged font settings.

Actual Samsung rendering, optical balance and touch behavior still require that device check. Automated tests and local SVG rendering do not establish native visual approval.
