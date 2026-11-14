# Card Detail & Photo Journal — screenshot-based UI refinement

Implemented for Samsung visual review. Primary references are the two user-supplied images `1794203367634.jpg` and `1794204037591.jpg`. Their red rectangles are annotations and are not rendered. No alternate designs or prototypes were created.

## Card Detail

- QR remains centered at the existing renderer's size, within the rounded white panel. The QR label and barcode toggle now sit at the lower left/right. When the existing 176dp QR viewport leaves safe side gutters, controls use those gutters rather than a new external row.
- Code 128 remains horizontal and uses the existing full-width/integer-module SVG rendering. Its label/QR toggle sit at the bottom inside the same white panel. A lower white safety band prevents visible controls from covering the SVG or its quiet zones. Narrow screens/enlarged QR labels use the same lower-band fallback.
- Control targets remain 48×48dp. Their smaller visible 36dp surfaces remain unchanged. Measured multiline label heights grow the lower band; Android font padding is disabled for the code label to keep the measured line budget predictable.
- QR preparation/error messages are constrained to its centered code viewport so bottom side-gutter tools do not paint over status text.
- Encoder, payload, SVG bytes, viewBox, module widths, barcode height and image fit are unchanged. Tap/Swipe, eligibility checks, Close/Android Back, seven card presets, preview/Front-Back/expiry/member number and Home Share/Create Pencil behavior are unchanged.

**Scannability geometry:** for the lower-band layout, padding above the code is 8dp; bottom padding equals the measured tool-height budget (at least 48dp). The transparent tool container's top reaches only the SVG's final 4dp. Visible surfaces begin at least 2dp below the SVG's lower edge; text begins at or below that edge. QR side controls are separated from the entire QR bounding box by horizontal gutters. No encoded bars/modules or required quiet zones are masked. Existing encoder/decoder regressions still pass; native optical scanning remains a device test.

## History & Receipts

- Each existing virtualized chronological row now shows up to four compact thumbnails horizontally on the left, maintaining attachment order and aspect ratios. Timestamp, short note/legacy description preview and actual photo count are on the right. A row remains one tappable target, with the same selection/checkbox behavior in Create.
- The thumbnail width budget adapts to list width and selection checkbox space. Full metadata remains available through entry detail. Legacy rows preview at most four images but display the total count.
- Home bottom actions are now **Back to Card on the left / Add Photo on the right**, in one horizontal layout. Wrapping labels, the existing footer scrolling and safe-area handling accommodate small screens/larger fonts.
- Create has no Add Photo action. Select, Select All, Cancel Selection and Delete Selected retain their previous behavior. Clear History remains Select All + confirmed Delete Selected.

## History Entry

- The existing entry identification, timestamp, note and legacy metadata remain.
- Photos use a read-only horizontal strip within the reference's photo region. Normal 1–4-photo entries fit four 48dp+ targets across common Samsung portrait widths, preserving image ratios and top alignment. The region reserves 220dp below the heading/count, matching the reference's photo region, with Back to History beneath it.
- All legacy attachments remain in the strip; more than four can be reached by horizontal scrolling, with a scrollbar and short hint. Very narrow panes also permit horizontal scrolling instead of shrinking touch targets below 48dp.
- Tapping a thumbnail opens the existing full-screen viewer/share flow for that exact photo. No Add/Edit/Delete controls were added to entry detail.
- Add Photo's existing 1–4-photo grid, Camera/Gallery, automatic timestamp/note, no Replace/Crop/Remove, Save/readback and Cancel behavior are unchanged.

## Files changed

Production:

1. `src/lib/card-detail-controls.ts` — bottom control placement/safe lower-band geometry.
2. `src/components/bemem/MembershipCardDetail.tsx` — apply shared bottom layout and measured code-label typography.
3. `src/components/bemem/CardCodeView.tsx` — centered QR status-text width only; actual encoded rendering unchanged.
4. `src/components/bemem/CardHistorySheet.tsx` — horizontal multi-thumbnail rows, right-side metadata, Home action row, entry photo-strip option.
5. `src/components/bemem/ReceiptAttachments.tsx` — read-only horizontal strip reusing the existing viewer, all-attachment access and safe targets; Add form defaults untouched.

Tests updated: `scripts/test-card-detail.cjs`, `scripts/test-card-history.cjs`.

New document: this report. Earlier reports/previews are preserved.

SHA-256 comparison against this task's starting source snapshot: only those five Production files changed; **116 other source files unchanged**. This includes all encoders, Wallet/History model/validation/storage/writers/revisions/recovery/deletion policies, Grid/placement and Add/Edit Card. Existing uncommitted work remains. No saved images/records were read or changed on a phone.

## Validation

- TypeScript passed.
- Read-only ESLint: 104 files, zero errors/warnings.
- Card Detail tests: **30/30** passed, including actual lower-control coordinates, SVG/quiet-bound separation across width/font/label-height budgets, unchanged inputs, Home/Create headers, Swipe/Back and all seven sizes.
- History tests: **146/146** passed, including compact four-thumbnail composition, left/right Home actions, Create restrictions, 48dp photo targets, correct viewer association, every legacy attachment, unchanged metadata and previous 1–4-photo/storage/deletion/sharing regressions.
- Full automated suite: **672/672 passed**, including existing independent QR/Code128 encoder/decoder tests.
- Android export generated **1,530 modules** at `.expo/reference-detail-journal-refinement/`. In this environment the export CLI remains alive after `Exported`; it is stopped after artifacts are produced. This is not a clean CLI exit or a native Samsung test.

All automated data/native/filesystem fixtures are synthetic/mocked. No new dependencies, backend, migration, app-data clearing, commit, push or deployment. Original website files were never written.

## Reference differences / remaining device verification

- Barcode needs more lower white space than the screenshot's overlapping example: the original bars and quiet zones are kept entirely clear rather than painting buttons on them. Barcode height/module proportions are not reduced to force a closer screenshot match.
- Narrow screens/larger text may wrap metadata/actions and increase panel/row height. QR tools use the safe lower band if side gutters are insufficient. No extra external code-control row or segmented control is added.
- Legacy attachments beyond four scroll horizontally. Add Photo retains its approved grid; only saved entry detail changes to the reference strip.
- Exact native font metrics, white-panel/shadow proportions, horizontal vs vertical touch handling, Android navigation inset and physical scanner performance require Samsung review. No new native screenshot was generated or claimed verified.

Project mobile-design and ui-ux-pro-max guidance were applied to existing Pearl Gray — Lagoon Glass, 48dp targets, spacing, reflow and safe areas. The local UX search `touch spacing overlay controls` returned applicable mobile target/spacing guidance. Existing APIs were checked against [React Native 0.88 ScrollView](https://reactnative.dev/docs/scrollview) and [Expo SDK 58 Image](https://docs.expo.dev/versions/v58.0.0/sdk/image/).

## One Samsung visual verification workflow

Run `npx.cmd expo start`, Reload the existing Expo Go app without clearing data. Open the same saved membership card from Home: compare QR lower-left label/lower-right toggle, Tap/Swipe to Code 128, check the bars/quiet zones and scan using another device. Verify Share remains and Front/Back/expiry/member number/card size remain unchanged. Open History: check four thumbnails left, metadata/count right and Back to Card left/Add Photo right. Open an existing entry: check its horizontal photos, each full-screen viewer/share and Back to History. Open the same path from Create: verify Pencil, no Add Photo, and Select/Cancel Selection without deleting real data. Repeat with a small portrait window/larger system font, checking wrapping, scroll and Android Back. If an existing legacy entry has more than four images, swipe the strip to its final attachment.

Stop for user review after this UI workstream. Do not start another feature automatically.
