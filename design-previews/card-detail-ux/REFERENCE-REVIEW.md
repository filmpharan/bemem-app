# Card Detail — user-reference reconstruction, round 02

Status: **awaiting user layout review; prototype only**. A/B/C from round 01 are retained, not used as the layout master and not overwritten.

## Open

- `reference-review.html`: the two user references beside interactive Code 128 and QR initial states.
- `reference.html`: the single proposed layout, initially Code 128.
- `reference.html?format=qr`: the same layout, initially QR.
- `reference.html?orientation=portrait`: portrait 4×6 sample instead of default landscape 6×4. Orientation can also be changed using the desktop preview toolbar; it is not an extra control proposed for Card Detail itself.
- `reference-screenshots/code128.png`, `qr.png`, `comparison.png`: browser screenshots, including source/prototype comparisons.

Open the HTML directly in a browser; fonts and scripts are local, with no installation/build required. For Samsung on the same private Wi-Fi, from the app project use:

```powershell
python -m http.server 8791 --bind 0.0.0.0 --directory design-previews/card-detail-ux
```

Then open `http://<computer-LAN-IP>:8791/reference-review.html`. Stop the temporary preview server with Ctrl+C afterward. This serves only preview assets, not the app project or wallet. Browser Back is ordinary browser navigation; native Android Hardware Back is not simulated.

## Images actually inspected

Both supplied JPG files were opened visually, not inferred from filenames:

- `references/reference-code128.jpg`: horizontal bars, QR-switch icon at lower right of scan panel.
- `references/reference-qr.jpg`: square QR, barcode-switch icon at lower right.

Each image is approximately 869×1883 source pixels. Screenshot coordinates below are manual visual estimates, **not recovered device dp or exact CSS measurements**. No screenshot name/member data is copied into the interactive fixture: only `Test Member`, `00123456`, `No expiry` are used. The original JPGs retain their original source content for visual comparison only.

The app viewport is estimated as y=176–1670; the comparison applies a CSS crop, leaving the original files unchanged. Browser address/status bars and lower browser/system controls are excluded. They are never drawn into the proposed interface.

## Layout measurements and decisions

For comparison, source image measurements are normalized to a 390px browser viewport using 390/869 ≈ 0.449. Source values are approximate:

| Element | Observed source | Reconstructed value / decision |
| --- | --- | --- |
| Sheet | Rounded top corners, bottom anchored. Top around y583 in barcode and y438 in QR | 24px top radius; content-height bottom sheet, grows upward with QR, maximum height leaves top safe-area clearance |
| Horizontal sheet inset | About 44 source pixels | 20px normally; 16px on very narrow screens |
| Header | Name and small Share at left, circular X right | Same order, 18px title, Share immediately after title, right-aligned Close; wraps the title instead of ellipsis |
| Close/flip/toggle visuals | Approximately 80px, about 36 normalized pixels | 36px visible surface with a real 48×48 CSS-pixel button target; native dp verification remains future work |
| Code panel | x44 to824, about 350 normalized px wide; rounded white panel. Barcode about162px high, QR about228px high | Full content width, 20px radius, solid white, black code illustration; approximately186px barcode /258px QR before text scaling |
| Code toggle | Inside scan panel, bottom-right, displays the other code format | Exactly one icon toggle at bottom-right; reserved lower lane prevents even its hit target from intersecting the symbol geometry |
| Card row | Expiry at left, card in middle, flip and Front text at right | 64px expiry / flexible card /48px flip, with 8px gaps, vertical centering |
| Card footprint | In these screenshots the visible card is about499×249 source px, near2:1 | **6×4 per explicit brief**, not changed to2:1 to imitate the image. At390px, sample is about222×148px. Radius14px. Portrait uses4×6 |
| Number | Centered, monospace, bold and letter-spaced | `00123456`, 22px font with proportional letter spacing; never converted to a number |
| History | One wide lower row with history icon | Same placement and icon, honest Coming soon subtitle; not a fake working history action |
| Background | Home blurred/dimmed behind sheet | Synthetic Home with a blue sample card under local blur/dim; no browser or Android chrome |

## What matches / what changes / remaining differences

Matches: hierarchy and grouping, off-white sheet, top rounded corners, white code panel, left Name+Share/right Close, single inset code toggle, middle card/left expiry/right flip, centered member number, lower History row, blue sample artwork with restrained shadow.

Careful touch adjustments: 48px targets around 36px surfaces; 8px card-row gaps; reserved lower code-panel lane; vertical internal scroll instead of smaller code; fixed available Close header while content scrolls; keyboard focus/arrow/Escape alternatives; visible side label and accessible next-action labels; no gesture-only action.

Remaining visual differences are deliberate and visible in the comparison, not claimed as pixel parity:

- Card is taller because the required6×4 differs from the screenshot's apparent2:1.
- The separate toggle lane and larger target/header/history sizing increase the sheet's height; at the normalized390×670 comparison viewport, more of the blurred Home is covered. In QR mode a short viewport may need internal scrolling. Lower row positions are not guaranteed identical after reaching the maximum sheet height.
- Barcode/QR patterns are **non-encoded illustrations**, not copies of the reference codes. Their geometry/pattern differs. Barcode is256×110 CSS px at every tested width; QR is198×198 including illustrative four-module white margins. They are never squeezed for compact mode. Future implementation must keep the existing encoder's actual payload-dependent module/quiet-zone behavior, not reuse these mock patterns.
- The mock warning, Coming soon subtitle and longer synthetic name alter small details. Share is disabled with an explicit accessible label/title; History is a noninteractive Coming soon row.
- Blue artwork uses the website's PTT-style gradient direction (`styles.css:158`) plus top/bottom shading, not a screenshot crop or real saved-card art. It does not recolor user cards.
- Manrope is the already installed bemem font; exact original device font rasterization, blur, shadow and display scaling are not guaranteed.

## Interaction

- Tap the lower-right code toggle to switch both ways. Icon/accessible label always describes the destination.
- Swipe left within the code area for QR, right for Code128; threshold48px with horizontal dominance1.5×. Vertical movement above18px cancels the candidate. No full-screen gesture or touch preventDefault; browser/system edges24px are excluded. Pointer cancellation clears the gesture. Starting on the toggle button does not also start a swipe.
- Flip toggles Front/Back, next-action label and aria-pressed, and displays the synthetic member number on the back.
- Close X, exposed backdrop or Escape dismiss. Reopen restores the local prototype state and returns focus into the sheet. Tab is contained among active controls. No second in-sheet Close button or segmented control was added.
- The warning `Placeholder · Not scannable` is always beside the symbol; Share/History do not pretend to succeed.
- Safe-area environment insets and reduced-motion/reduced-transparency fallbacks are present. CSS browser support does not prove native OS behavior.

## Skills actually used

Reading this as: a reference-led membership wallet detail for quick checkout and one-handed use, retaining the user's screenshot hierarchy, targeting Android first and iOS next. Dials: variance2, motion1, density6; no creative redesign.

- `mobile-design`: read installed SKILL, design-process and accessibility-touch. Applied large invisible target geometry, limited swipe region, scroll/gesture separation, focus order, safe areas and wrapping text.
- `ui-ux-pro-max`: read installed SKILL and pro-rules; ran its Python search for `swipe gesture alternative --domain ux`. Gesture Conflicts and Dragging Movements were relevant. Applied visible tap alternative and retained screenshot order/spacing rather than generating a different design system.
- Original web `src/routes/index.tsx:33` Sheet and `ScanView` around1016, plus `src/styles.css:158`, were read-only supporting references. The supplied images are the visual master. Current `MembershipCardDetail.tsx` remains unchanged.

## Browser verification

Existing cached Playwright CLI + installed Chrome, isolated test profile, local preview server; no new dependency. `reference-verify.js` contains repeatable design checks and screenshot capture:

- Both initial formats, toggle in both directions, CDP-emulated touch swipe left/right, diagonal gesture rejection, keyboard format alternative.
- Toggle measured48×48 or larger, with its entire hit area below the symbol geometry.
- Front/Back label/content, Close/Reopen, Escape; synthetic name/number; unavailable Share and History status.
-320×568,375×812,390×844 and844×390; portrait4×6 ratio, QR not shrunk, no horizontal page overflow, History reachable via internal scroll.
-200% CSS root text with no title clipping/page overflow; reduced-motion Close.
-390×670 initial-state PNGs and a source/prototype comparison at1100px wide.
- JavaScript syntax passed. Before/after hashes of app/src, app/scripts and original-site/src show no changes.

Not verified: physical Samsung touch/scroll, thumb comfort, native TalkBack/VoiceOver, OS safe areas/Hardware Back, actual scan performance. This design does not invoke the app, decoder/encoder, wallet storage, migration, consent or Cutover.

## Files for this round

`reference.html`, `reference.css`, `reference.js`, `reference-review.html`, `reference-verify.js`, this report, and three PNGs under `reference-screenshots/`. Original JPGs and earlier A/B/C files remain intact. Font is reused from the earlier preview's local licensed font asset. Raw test captures/logs remain under the existing workspace output locations.

No production/UI/schema/encoder edits, dependency installs, commit, push or deploy. Await user review of this single direction before another iteration or native implementation.
