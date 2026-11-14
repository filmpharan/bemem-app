# bemem — Card Detail UX exploration, round 01

Status: **design review only; no production adoption**. All examples use Test Member / `00123456` / No expiry / Card 6×4, with the same sample artwork. The comparison's orientation control changes all three to Card 4×6 together; this changes only the demonstration, not a saved card.

## Open and try

Open `index.html` in a desktop browser. Everything, including the licensed Manrope font, is local; no build, install or internet is required. Individual `a.html`, `b.html`, `c.html` also work as local files.

For Samsung on the same trusted Wi-Fi, serve **only this preview folder**, from the app directory:

```powershell
python -m http.server 8791 --bind 0.0.0.0 --directory design-previews/card-detail-ux
```

Open `http://<computer-LAN-IP>:8791/` in Samsung Internet/Chrome. Use the actual IPv4 address shown by `ipconfig`; `localhost` on the phone would mean the phone itself. Allow the local server through the private-network firewall only if needed. Stop it with Ctrl+C after review. This is a temporary local preview, not an Expo route or online deployment.

On mobile, open A/B/C individually from the comparison page for full-width interaction. The orientation selector on the comparison changes all samples. The individual desktop toolbar also offers orientation selection. Browser Back returns to comparison; it does not emulate React Native Hardware Back. Close, the exposed backdrop strip, or Escape dismisses the detail. Reopen preserves the prototype's current side/format; it writes nothing.

1. Compare the initial screen before doing anything.
2. In B, tap Show code. A/C already show Code 128.
3. Tap QR Code / Code 128; swipe left for QR, right for Code 128 **inside the white code area**, away from browser edges. A horizontal gesture changes only at 48px with horizontal dominance; vertical movement above 18px cancels recognition. There is no full-screen swipe handler or preventDefault on normal scrolling.
4. Flip Front / Back, scroll down to Share and History, then close and reopen.
5. Change orientation, enlarge browser text, and repeat. The code area can require more scrolling at large text sizes; code geometry is not squeezed to avoid scrolling.

All code graphics are **visual placeholders, not scannable**. The notice appears immediately beside the code. They do not use or change the production QR/Code 128 encoder, and do not encode a membership payload. No storage, network API, clipboard, analytics, runtime or wallet access exists in the prototype JavaScript. Ordinary local HTML/font/asset loading is the only browser resource access.

## UX alternatives and actions

Counts begin **after opening Card Detail** and exclude physically scanning. All three default to Code 128 for a fair comparison; production should keep the existing preferred-display-format behavior.

| Option | First Code 128 | First QR | Front/Back | Main benefit | Main tradeoff |
| --- | --- | --- | --- | --- | --- |
| A — Scan First | 0 extra actions | 1 tap or 1 swipe | 1 tap, after scrolling if necessary | Closest to original scan-first task; visible format buttons directly below code | Large card/Front-Back and secondary information may be below the fold |
| B — Card First | 1 tap: Show code | 2 taps, or 1 tap + 1 swipe | 1 visible tap before scanning | Identify/inspect the full card before exposing its code; Show code stays in the bottom dock | Deliberately adds a step compared with today's scan-first detail; therefore weaker for repeated checkout use |
| C — Compact & Swipe | 0 extra actions | 1 tap or 1 swipe | 1 visible tap | Card identity + number + code together, format buttons in thumb-reachable bottom dock | Smaller artwork; dock uses vertical space, and history/large text still require scroll |

Recommendation for consideration: **A** best matches “open card → staff scans” and the original site's order. **C** is a useful alternative if easy one-handed switching is more valuable than larger artwork. **B** suits recognition/inspection, but its extra action conflicts with the fastest scan path. The user chooses; none is selected or implemented in production.

## Sources inspected, read-only

- Original website `src/routes/index.tsx`, `Sheet` at line 33, card detail invocation at approximately 795–830, and `ScanView` at 1016–1060. Original order: code on white (Code 128 initially), expiry/card/flip row, membership number, History. Code 128 uses height 110; QR uses Tailwind h-44/w-44 (176 CSS px at the normal 16px root). Share is a header action. The old web History/Share implementations are not reproduced as working features here.
- Original `src/components/CardDisplay.tsx`: Face, CardFace and CardBack; title on front and number on back. The old website landscape ratio is 1.586. These drafts deliberately use the approved current native Card footprint 6×4, portrait 4×6, and fixed radius 14px to match the current app foundation.
- Current native `src/components/bemem/MembershipCardDetail.tsx`: bottom sheet, white code panel, QR/Code128 controls, expiry/preview/flip, number, Coming soon Share/History. No production component was edited.
- `design-system/bemem-lagoon-glass-rc2/TOKENS.json`, Pearl Gray palette: canvas `#eceff1`, high `#fafcfd`, low `#d6dfe4`, primary text `#263943`, secondary `#4c606c`, action `#405764`, deep `#2b3e49`, boundary `#8299a6`. The experimental CSS uses local semantic variables; no token file changed. Sample artwork is identical across drafts, not a proposal to recolor users' cards.
- No new user screenshot attachment was accessible in this request. Source and the existing native component were used, without claiming screenshot pixel parity.

## Actual skill use

`mobile-design` v0.3.0: read SKILL, design-process, accessibility-touch, navigation, screen-patterns and relevant Android/type guidance. Applied reachable repeated controls, 48px hit areas, 8px adjacent control gaps, limited gesture region, visible alternatives, safe-area padding, scrollable large-text layouts and modal keyboard/focus handling.

Design read: an offline membership wallet for quick checkout and one-handed use, with Pearl Gray Lagoon Glass controls, targeting Android first and iOS next.

Dials (variance / motion / density): A **4 / 2 / 5**, B **4 / 2 / 4**, C **4 / 2 / 7**. Visual language stays shared; density and information ordering differ. There is no decorative movement, auto-rotation or shimmer.

`ui-ux-pro-max`: read SKILL and pro-rules / relevant quick-reference priorities; actually ran its installed Python search tool:

- `swipe gesture alternative --domain ux`: Gesture Conflicts and Dragging Movements matched; led to code-region-only swipes plus visible buttons.
- `touch accessibility safe area --stack react-native`: touch expansion, Pressable and accessible roles matched. These stored stack results cite RN 0.86; treated as general guidance only, not verified implementation advice for this project's RN 0.88.1. No RN API was implemented in this round.
- `glassmorphism hierarchy contrast --domain style`: Glassmorphism matched. Preserved existing Pearl Gray colors rather than adopting a new palette or blindly applying the database's generic low-opacity values. Glass remains on controls, not over code geometry.

`playwright`: existing cached CLI and installed Chrome were used in a separate test browser profile; no package/browser was installed. Browser verification is not Samsung device acceptance.

## Materials and accessibility

- Controls: light gel gradient, upper-left reflection, thin rim, soft tinted shadow. Selected format/side has a dark opaque surface and a pressed state. No filter, blur or decorative overlay on the code.
- Frosting is limited to the backdrop; solid surfaces remain usable without backdrop-filter. Reduced-transparency CSS uses solid surfaces when the browser exposes that preference. This is not a promise that every Android browser exposes it.
- Buttons are at least 48×48 **CSS px in this web prototype**. Native implementation must verify actual 48dp Android / 44pt iOS targets, not assume unit equivalence.
- QR illustration stays 198×198px including 4-module illustrative quiet margins; Code 128 illustration stays 264×132px, black/white with margin. None validates scan quality or an actual encoder. Production must keep the existing encoder's payload-dependent module size and quiet-zone policy; never copy these mock patterns.
- Primary/secondary text uses the existing Pearl Gray contrast pairs. Large-text controls wrap rather than ellipsize. Focus is visible; format and side expose aria-pressed; changes announce through a live status. Closing returns focus to Reopen; Tab stays within the active sheet.
- Light theme only, as requested. Forced-colors and reduced-motion styles are included; no new dark theme or haptics implementation.
- All user-facing content is English. No fake purchase, share action or history entries. Share/History remain noninteractive Coming soon rows.

## Browser verification, 2026-11-08

Passed with existing Chrome/Playwright, using only the local preview server:

- Initial hierarchy for all three and B's explicit Show code step.
- QR/Code128 tap changes; horizontal mouse-pointer and CDP-emulated touch swipes; diagonal pointer motion rejected; keyboard arrow alternative.
- Front/Back state, Close/Reopen and Escape; scrolling to History; all visible sheet buttons measured at least 48×48px.
- 390×844 screenshots; 320×640, 375×812 and 844×390 layouts with portrait artwork; no horizontal page overflow; QR size retained.
- 200% CSS root text size with wrapping button labels and no page overflow; reduced-motion Close.
- Comparison orientation selection changes all three iframe fixtures without changing their number/data.
- JavaScript syntax check passed. Production/app/original-site source hashes were compared before/after and unchanged. No runtime tests or Android bundle were required for isolated HTML design files.

Screenshots: `screenshots/a.png`, `b.png`, `c.png`, `comparison.png` (initial landscape states). Browser verification source: `verify-browser.js`; requires the already-installed Playwright CLI if rerun, and saves raw captures under `output/playwright/` in the app workspace.

Not verified: physical Samsung thumb reach, Samsung browser text auto-sizing, OS gesture navigation/Android Hardware Back, TalkBack/VoiceOver, actual native insets/font metrics, real scan performance or Expo rendering. CSS safe-area environment variables and Chrome touch emulation do not establish those results. Large text and landscape intentionally allow vertical scroll. Sheet drag-to-dismiss is not simulated; Close/backdrop/Escape remain explicit paths.

## Scope and next approval

New files only in this design-preview directory plus generated browser artifacts. No changes to MembershipCardDetail, Home/Create, wallet runtime/storage, encoder, schema or old design previews. No dependencies, commit, push or deploy.

Choose A/B/C and describe what to retain/change. Next round changes the chosen prototype only; production implementation waits for final design approval.
