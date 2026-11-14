# Three-direction desk review

Status: awaiting user selection. No direction chosen on the user's behalf.2026-11-11.

| Criterion | A Precision Rounded | B Soft Organic | C bemem Signature |
|---|---|---|---|
| Small-size recognition | Strongest straightforward geometry | Good; bowed contours need more care at16px | Good at20/24; squared lens and inner turns need user testing |
| Cross-screen consistency | Regular spacing and stroke | Consistent soft curve rhythm | Consistent longer lower-right corner/return |
| Distinctiveness | Restrained; less branded | Warm, less mechanical | Strongest recognizable family cue among these proposals |
| Minimal clutter | Low | Low to moderate on dense symbols | Low; avoid adding returns where unnecessary |
| Action meaning | Familiar conventional metaphors | Same metaphors; softer proportions | Same metaphors; no signature marks without a structural reason |
| Accessibility | Clear silhouette; still needs labels on ambiguous/destructive actions | Slightly heavier ink helps; no permission to shrink targets | Good hierarchy; test curve/negative-space recognition |
| Pearl Gray harmony | Calm, neutral | Friendly, close to soft-glass feel | Most intentional link to rounded card/pocket forms |
| Expansion | Easiest regular-grid continuation | Requires careful optical editing | Requires a shared corner rule, not arbitrary logo stamping |
| Runtime weight | Basic vector geometry | More curves, still small | More selective curves/returns, still small |
| Android / future iOS | Feasible source format; renderer/device work remains | Same | Same |

This is an agent design critique, not a user comprehension study, measured performance result or artistic approval.

## Recommendation

**C is the recommended direction for the next refinement round** if bemem wants a recognizable signature without ornament. Its squared Search lens, open-return Account shoulders and lower-right card/document curves connect to the existing interface. Keep A as the usability baseline when a C variation hurts recognition; do not mix full families casually. The user may prefer A's clarity or B's softer character, and final selection remains theirs.

Before approving C, inspect Search, Account, Save, Edit, Decorate, Flip states and QR/Barcode toggles at actual20/24px. Keep16px as a stress check. The familiar Close/Previous/Next shapes intentionally remain conservative; novelty does not justify confusing navigation.

## Actual-size findings

- Inspected all three contact sheets and same-action board. Original QR finder corners were too round; corrected to small-radius boxes with1.65-unit stroke to preserve inner holes.
- Search, Account, Close, navigation, Undo/Redo and Save stay recognizable at20/24px.16px has much less internal negative space, especially QR, View Image, Select All and Flip.
- Flip Front/Back differences are too subtle to replace their state text; the mockup keeps Front/Back. QR/Barcode toggle retains current format label and destination accessible name.
- Decorate brush may be mistaken for Edit/artwork editing; keep Decorate text. Save disk is conventional but not universally understood; keep Save/Save Changes. No icon-only destructive dialog choices.
- B feels warmer; at very small size organic contours can appear less aligned. C gives more character but may feel less familiar, particularly its Account opening and lens shape. User review matters more than pixel-difference counts.
- The existing8-column pagination targets are smaller than48dp on narrow phones; this design phase does not change grid geometry. Larger glyphs cannot solve an undersized hit area. Report it for a separately authorized UX decision, not a hidden layout change.
- Inverse samples use identical alpha/geometry in white on Soft Charcoal. Disabled opacity is intentionally lower but requires disabled semantics; not a contrast pass for an active control.

## Mockups and boundaries

Six source-informed HTML mockups: Home header, four-label Account menu, Decorate toolbar,8×3 pagination, Card Detail, Home Photo Journal controls. Local Manrope font and current theme primary ink are used. Cancel stays text-only in its60dp rail slot; Undo/Redo remain56dp; Save consumes the remaining width. Front/Back and format switches are review-only interactions; sample data and mock scan area are not real stored cards/codes.

These mockups are manually reconstructed for visual comparison, not actual app captures. Short/narrow windows can require scroll in the review page; this is not a production layout implementation. No new controls are inserted into the real app. Existing illustrated category symbols are intentionally not converted into this functional family.

## Next step after selection

1. User chooses A/B/C and flags confusing or visually weak glyphs.
2. Refine only that direction, especially dense20px symbols and label-retention decisions, without replacing Production icons yet.
3. After separate final approval, plan a small integration using existing rendering components and current Expo APIs; first verify Samsung rendering, text scaling, TalkBack, tap areas and state handling.

No production integration is authorized by these review files.
