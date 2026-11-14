# Four proposals — design review

Exactly two alternatives per feature. These are isolated offline prototypes; final selection belongs to the user.

## Design read

Personal membership wallet for quick one-handed Samsung use, retaining Pearl Gray — Lagoon Glass. Design variance 2/10, motion intensity 1/10, density 4/10. Keep the existing Manrope typeface and Soft Charcoal outlines, neutral white/gray surfaces and dark action fill. No new decorative family, remote artwork, or animation.

Read mobile-design design-process, forms, visual-system, accessibility-touch and review guidance; ui-ux-pro-max's priority/semantic-icon guidance; and bemem-illustrator's original-asset/preservation contract. Local search on progressive disclosure returned off-topic typography results even after narrowing, so those results were not used as UX evidence. Choices follow the explicit user brief and reviewed skill guidance instead. Playwright was used to inspect real browser output and generate captures.

## Current flow and UX issues

Share currently opens a long sheet, asks mode and side before showing output, adds multiple paragraphs, duplicates Number/encoded value in scan mode, and ends with large vertically stacked Share/Cancel. All controls compete at similar visual weight. Missing Back remains a visible choice followed by a sentence. A new user must read a lot to determine what leaves the device.

Adjust currently presents four word buttons plus +/- and stacked Use Image/Cancel. It offers drag but not pinch. The image alone does not establish its relationship to the selected footprint or final painted boundary. More importantly, source-backed geometry differences exist; a UI-only cosmetic revision cannot ensure WYSIWYG. See TECHNICAL-DIAGNOSIS.md.

## Share A — Preview First

`prototype.html?feature=share&option=a`

- Exact-output preview leads, with side status. Image only / With code is a compact labelled selection; Front/Back stays directly below it. QR/Code128 appears only when a code is included.
- Single sticky Share action; X dismisses. Output summary says either Artwork only or Name, Number & chosen format. Brief privacy details remain available on demand; artwork can already contain personal information.
- If Back is missing, disable it with concise Not saved text. Unsupported Code128 is disabled with an explanation. Preparing/failure prevents sharing; prepare-again retains selections.
- Best for frequent use and fast visual assurance. Cost: mode controls are lower than the preview, and scan output may require scrolling on small screens. Primary action remains visible.

## Share B — Simple Steps

`prototype.html?feature=share&option=b`

- Step 1: two explicit output cards with short inclusion labels and an immediately updating smaller live preview. Review image advances.
- Step 2: final artifact preview, Side and conditional Code choices, Share. Back/Change returns without discarding the selection.
- Same capabilities and output semantics as A; no new code-only export or recipient/account feature.
- Best for hesitant first-time users. Cost: one extra navigation action, and Step 1 is longer than A's compact selector. State must survive Back/Change.

| Share criterion | A | B |
| --- | --- | --- |
| Default Front image: actions to native chooser | 1 Share tap | 2 taps: Review, Share |
| Front QR from default image | With code, Share: 2 | Card + scan code, Review, Share: 3 |
| Back Code128 from default | With code, Back, Code128, Share: 4 | Card + scan code, Review, Back, Code128, Share: 5 |
| Visual comprehension | Output-led | Choice-led, then review |
| One-handed use | Bottom Share, lower selectors | Bottom primary; upper output choices |
| Accessibility | Fewer focus stops; clear text selectors | More focus stops, explicit progress |
| Implementation | Reorder existing controlled state/artifact | Same pipeline plus a local two-step state |

Counts exclude opening Share, loading time and interactions in Android's chooser. “Share” stays text-labelled; an unfamiliar icon alone would conceal the primary task. Side/format labels remain essential. Success should never claim delivery to a recipient.

**Recommendation: Share A.** It makes the actual output the strongest evidence and removes a step while preserving privacy/context. B is a valid alternative if explicit guided choice matters more.

## Adjust A — Direct Card Crop

`prototype.html?feature=adjust&option=a`

- An immersive card-shaped boundary in a quiet neutral stage. Drag repositions; pinch anchors the image under the fingers. Grid is optional. Compact zoom +/- and range remain visible.
- Fine adjustment reveals Horizontal/Vertical controls for users who cannot drag/pinch comfortably. Reset returns to the session's entry framing. Cancel / Use Image remain visible in one bottom row.
- Use Image displays an isolated draft result plus identical adjustment/confirmed crop examples, clearly marked as not saved to Wallet.
- Best for direct manipulation and visual framing. Cost: pinch/drag discovery and hidden fine controls need clear accessible hints and native gesture testing.

## Adjust B — Guided Controls

`prototype.html?feature=adjust&option=b`

- Card-shaped preview above always-visible Zoom and Horizontal/Vertical controls. A small full-source overview shows which region is visible.
- Drag/pinch still work; controls provide the primary predictable adjustment path. Reset and the same Cancel / Use Image footer remain.
- Best for users who prefer deliberate controls or have motor difficulties. Cost: more visual controls and scrolling on compact devices; the visible preview stage is smaller.

| Adjust criterion | A | B |
| --- | --- | --- |
| Entry → confirmed composition | Drag/pinch, Use Image | Adjust visible ranges/gestures, Use Image |
| Essential taps after positioning | 1 Use Image | 1 Use Image |
| No-gesture alternative | Open Fine adjustment, adjust ranges | Position controls immediately visible |
| Source context | Final boundary dominates | Boundary plus overview |
| One-handed ergonomics | Zoom/confirmation near bottom | Controls below preview; may scroll |
| Native complexity | Gesture arbitration + shared math | Same math/gestures plus range/overview UI |
| WYSIWYG | Same proposed source-region contract | Same contract; not a separate crop engine |

**Recommendation: Adjust A with its accessible fine controls.** It makes the card itself the editing surface. Choose B if explicit position controls should always be visible. Neither is approved or implemented in the app yet.

## Cross-option details

- At least 48 CSS px primary/button targets in browser, intended as 48dp in native implementation. Labels wrap naturally; sheet bodies scroll independently while actions remain reachable. No fabricated Android status/navigation bar. Footer includes safe-area CSS; native SafeArea still requires actual device verification.
- No dependency added. Reuse existing icons, encoders, artifact verification and temporary-file cleanup. The static sample codes use the unchanged encoder with synthetic Number only.
- Review docks sit outside the proposed UI. They select source shape/card preset, missing Back and error/QR-only fixtures. They are not proposed Production controls. All seven footprints are included with correct painted shape; editing at another scale does not resize the actual card.
- The mock crop Reset/Cancel uses the sample centered entry. Production must restore the actual card's original entry crop, and changes to Front/Back/preset must be scoped explicitly. Do not copy the fixture reset behavior into real form state.
- Browser range keyboard support and CDP pinch are demonstrated. Native TalkBack, OS Back, Android edge gestures, contrast under glare, and safe-area behavior are not certified by browser tests.
- Close/Escape in the review returns a closed mockup. The native implementation must preserve established dirty-edit/discard protections. A confirmed crop updates a draft, never an independent Wallet write.

## Review entry points

- `index.html`: offline gallery.
- `share-comparison.html`, `adjust-comparison.html`: interactive A/B comparison at matching frame sizes.
- `screenshots/share-comparison.png`, `screenshots/adjust-comparison.png`: two comparison sheets.
- `crop-proof.html`: seven footprints × two matching states, wide/portrait/square fixture sources.
- `screenshots/*`: default, scan, Back/barcode, portrait, large-footprint, confirmation and large-text captures.

Open index.html directly on a computer. All scripts/assets are local. For Samsung browser review on the same private network, optionally serve this project locally with `python -m http.server 8768 --bind 0.0.0.0` and open `http://<computer-LAN-IP>:8768/design-previews/share-and-image-adjustment/`. This is a local review server, not deployment; only do this on a trusted network and stop the server afterward. The validation server used by the agent was bound to 127.0.0.1 only.

Awaiting separate selection for Share and Adjust. No design selection, crop fix or Production integration has been made on the user's behalf.
