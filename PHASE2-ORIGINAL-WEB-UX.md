# Add Card — Original Web UX restoration

Status: development-only visual review; no Wallet write or migration.

## Read-only reference audit

All references below are in the original website project, which was only read.

| Source | Findings | Native adaptation |
| --- | --- | --- |
| `src/routes/index.tsx` — `Sheet` | Bottom anchored, max-height 92%, rounded top corners, dimmed/blurred backdrop, Add Card heading, X and backdrop dismissal | Reusable `AddCardSheet`: React Native Modal, Safe Area, keyboard avoidance, scroll body, persistent footer; X/backdrop/Android Back share dismissal |
| `src/components/CardForm.tsx` | Live preview beside Front/Back, gallery and camera; size selectors; Thailand; brand datalist; name; member/phone; optional month; Add Card submit | Same primary sequence; local brand choices; explicit disabled image/camera with Coming soon; two supported orientations; date month entered as YYYY-MM |
| `src/components/CardDisplay.tsx` | CardFace has top-left name, rounded-xl, shadow, top/bottom dark overlay; CardBack has number near bottom; landscape 1.586 and portrait 2/3 | Rounded 12dp artwork, gradient presets, name on front, exact unformatted number on back. Card height follows measured width and grows for long text; no ellipsis |
| `src/styles.css` | `--brand-seven`, `--brand-the1`, `--brand-ptt`, `--brand-lotus`, `--shadow-card` | Approximate sRGB versions of web OKLCH gradients; Pearl Gray controls remain unchanged. M Card/Big C presets lack matching gradient definitions here and use the chosen plain card color |
| `src/routes/index.tsx` — `ScanView` | White code panel above card; Barcode/QR switch; expiry; front/back; member number; Card History & Receipts | Future Card Detail reference only; no Detail or encoder implemented |
| `src/components/Barcode.tsx` | Web SVG/jsbarcode CODE128; no displayValue | Not portable DOM code; native offline encoder choice remains separate |

The web public asset tree includes stickers, which are not required for this form.
Card artwork here uses CSS gradients in the web source, not imported user photos.
The live website could not be fetched by the browsing tool; the implementation is
based on the local source. No browser profile or real account/data was used.

## Interactions

- `/dev-add-card` opens the sheet directly; production redirects to Home.
- X, backdrop and Android Back close the route and discard this in-memory preview.
- Front/Back switches only the visual side. No QR or barcode pattern is rendered.
- Brand suggestions are six local English entries based on the original presets,
  not the web's entire catalogue. Selecting one fills the card name and artwork.
  Typing a query does not silently replace a manually entered name.
- Landscape/Portrait correspond to web Card 6x4/4x6 options; special voucher,
  boarding-pass and vaccine-passport sizes are Coming soon.
- Expiration is optional YYYY-MM, validated without trimming the supplied string.
- Code and color options expand separately. Existing number/payload tracking and
  exact-string validation remain unchanged. Choosing a plain color replaces the
  selected brand artwork preview, while retaining the entered brand text.
- The bottom **Add Card - Preview only** action validates; it never adds a wallet
  card or reports Save success. All fields stay in memory, including preview-only fields.

## Rendering and native limits

No dependencies added. RN 0.88 `filter: [{blur: 5}]` blurs only the caller-provided
background subtree on Android API 31+. It is not a general backdrop capture or
BlurView. This development route supplies a clearly labelled static development
background, not Home or a copy of the user's wallet. iOS and older Android use a
dimmed fallback. No blur is applied to the form, card text, QR or barcode.
Native visual correctness and performance still require Samsung testing.

The sheet does not implement drag-to-dismiss. Scroll, close button, backdrop and
Android Back are available. Keyboard avoidance and touch/large-font behavior
must be checked on the device; automated tests use native component stubs.

## Data model gaps — mandatory before persistence

`MembershipCard` currently supports name, member number, exact payload, preferred
code format, orientation, flat background/text colors and a future imageAssetId.
It does not support country, brand identity/catalogue, expiry month, gradient
presets, independent front/back images, special card sizes or a local image asset
lifecycle. The form keeps country/brand/expiry/side in a separate controlled
`CardPresentationDraft`; it is not a Wallet schema change.

Before a real Save is connected, these fields must receive an explicitly approved
schema/asset design and serialization/validation tests, or remain unavailable
with clear consent. Do not call `prepareCardForm` alone and silently discard them.
No Save handler is exposed by this development route.

## Samsung review

Run `npx.cmd expo start --clear`, then open
`exp://<LAN-IP>:<Metro-port>/--/dev-add-card` in Expo Go.

1. Inspect the bottom sheet, rounded top, Add Card/X and backdrop.
2. Flip the card; select PTT/The 1/Lotus's; inspect the matching artwork and name.
3. Change orientation, then test long names and enlarged system text: no ellipsis.
4. Search for a brand with no result; enter your own Card / Store name.
5. Enter a synthetic number with zeroes/spaces/case; expand code options and edit
   the code independently. Number changes must not overwrite that custom code.
6. Select Code 128 with non-ASCII input and press the preview action: an explicit
   error must appear without changing the input or selecting QR automatically.
7. Test blank, valid and invalid expiry months. Confirm Image/Camera are disabled
   and labelled Coming soon. No permission request should appear.
8. Scroll with Samsung keyboard open; inspect the visible footer and focused field.
9. Dismiss with X, backdrop and Android Back, reopening each time. Fields reset;
   Home/Create cards and saved layout must remain unchanged.

Home/Create, migration Import lock, storage, coordinator and transaction protocol
are untouched. No commit, push or deployment.
