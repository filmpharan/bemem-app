# Phase 2 Step 6 — Scannable Card Detail and activation readiness

Status: **Real QR / Code 128 SVG generation implemented. Samsung scan validation
and separately authorized production cutover remain pending.**

Baseline remains `c500a015cfc80bd6a63c88d3848562b33f02faa3`.
No real Samsung backup/import/cutover was executed. Release approval remains false.

## Functionality delivered

The shared production `MembershipCardDetail` now renders an actual code instead
of the previous unavailable placeholder. It passes the SAME stored `card.payload`
to both encoders; it does not encode the display member number or generate a new
identifier. It preserves leading zeros, spaces, case and valid Unicode exactly.

- QR uses qrcode's pure `lib/core/qrcode` entry with explicit UTF-8 byte segments
  and error correction M. No server PNG, browser canvas or DOM renderer is called.
- Code 128 uses JsBarcode's public object renderer to retrieve encoded modules.
  Model validation checks printable ASCII eligibility first. Unsupported values
  disable Code128 selection with a clear explanation; the stored payload is unchanged.
- SVG geometry is generated locally with solid black modules/bars on solid white.
  Payload strings are not embedded in SVG text/attributes, logs or URLs to servers.
- QR has a 4-module quiet zone on every side. Code128 has 10 modules of whitespace
  on each horizontal side, plus vertical white padding.
- The installed `expo-image` decodes Base64 SVG sources in memory, with disk cache
  disabled, no tint, blur, gradient, overlay or animation over the code.
- Physical sizing uses whole pixels per module, with a minimum of two. QR targets
  the original 176-unit preview size where feasible; Code128 retains 110-unit bars
  plus white vertical padding. Intrinsic SVG raster dimensions match display pixels.
- If the complete symbol cannot fit, no clipped/partial symbol is displayed. The
  user is told to rotate the phone or choose QR. Encoder/display failures are
  explicit, not silent blank/fake codes. No automatic format change/truncation occurs.
- Code128 values longer than 4096 characters are rejected at rendering as a
  resource safeguard. This is not a wallet schema or persisted payload change.
  QR uses the encoder's actual capacity validation.

The detail retains the original page order: title/Share status/Close, white code
area and format controls, expiry/card preview/front-back controls, member number,
history status and Create-only Edit status. Existing demo previews never call an
encoder and still have no scannable code. Close, outside tap and Android Back do
not change Saved/Draft or positions. Share, History/Receipts and Edit remain clearly
Coming soon; no working share/history capability is claimed.

Original web source was referenced read-only: `src/routes/index.tsx` ScanView,
`src/components/QRCode.tsx`, and `src/components/Barcode.tsx`. No website files or
build/deployment were changed. No new layout concept or redesign was introduced.

## Dependencies

Added using Expo's installer, with the user's authorization:

| Package | Installed version | Scope |
|---|---|---|
| qrcode | 1.5.4 | Runtime encoder; only pure core imported by app |
| jsbarcode | 3.12.3 | Runtime encoder; object renderer only |
| @zxing/library | 0.23.0 | **devDependency**, separately approved during this step |

`react-native-svg` is absent and was not installed. Existing expo-image renders
SVG without a new native module, DOM or WebView. No new camera/scan permission,
scanner feature, browser automation dependency or types package was installed.
The narrow qrcode-core TypeScript declaration is local to the app.

Package managers installed the normal transitive packages and updated package-lock.
Installer output reported 5 moderate advisories for the overall dependency tree;
no automatic audit fix or unrelated version upgrade was performed.

SDK/API checks used the installed Expo58/RN0.88 packages and
[SDK58 Image documentation](https://docs.expo.dev/versions/v58.0.0/sdk/image/).
Primary encoder APIs: [node-qrcode](https://github.com/soldair/node-qrcode),
[JsBarcode](https://github.com/lindell/JsBarcode).

## Independent Encoder / Decoder evidence

`scripts/test-card-codes.cjs` tests the ACTUAL SVG, not just encoder metadata:

1. Run production encoding and parse the emitted black SVG rectangles/path runs.
2. Rasterize those runs over white into synthetic grayscale pixels without a DOM.
3. Read the pixels using independent ZXing QR/Code128 readers.
4. Compare decoded text and barcode type to the exact original payload.

There are 30 new tests, including 25 successful image round-trips and one expected
rejection of an intentionally damaged Code128 symbol. Fixtures cover leading
zeros, spaces at both ends/repeated/all-space strings, case, ASCII punctuation,
numeric Code128 switching, phone-like strings, Thai, accented/decomposed Unicode,
emoji, newline/tab/NUL QR bytes. Non-ASCII Code128 is rejected rather than converted.

Tests also verify full white quiet zones, no SVG text/image/filter/gradient/script,
malformed Unicode and empty/capacity errors, code generation without a global
TextEncoder or browser, integral pixel sizing, oversized-symbol refusal, image
load error feedback and exact Base64 SVG sources delivered to the native view.
QR bytes do not require a Hermes Buffer/TextEncoder polyfill.

Existing production integration tests were updated to assert the real Code View
payload/format binding instead of the prior placeholder. They retain Home→detail
binding, Saved/Draft, search/clear, close/flip and release-gate coverage.

**This proves symbol correctness and independent decoding from synthetic SVG
pixels. It does not prove a physical Samsung screen/store scanner has scanned it.**
Native SVG rasterization, brightness, reflections, focus and scanner configuration
still need device testing. Raw Unicode is encoded as UTF-8; hardware scanners must
be configured to interpret that correctly. Keyboard-wedge trimming by a scanner
is not an app-side payload transformation.

The Android export was checked for decoder references: neither `@zxing/library`
nor `RGBLuminanceSource` occurs in the app bundle. Decoder code is test-only.

## Production activation readiness — still locked

The existing Step4/5 path remains connected to Review/Consent; no new owner,
coordinator, repository, grid or migration system was created:

`Review v1 → clean Draft/save admission → fresh source comparison → exclusive
native source copy → backup readback → source revision/bytes recheck → migration
validation/collision policy → v2 pending/commit/readback → complete owner activation`

Opening or acknowledging consent remains read-only. Actual backup/import requires
both a separately approved release and explicit user confirmation. The release
constant is still:

```ts
PRODUCTION_WALLET_V2_APPROVED = false
```

Existing tests confirm no source-copy/import is possible through the request API
or an attempted command bypass while it is false. Source changes, pending,
uncertainty and failed activation retain locks and use explicit reinspection or
verified activation retry; there is no automatic retry, old-revision fallback or
return to v1 writer after committed v2.

Home/Create still uses its single root owner. Before cutover, existing v1 layout
saves remain available; membership-card Save cannot be hidden in v1. After a future
approved activation, the already connected Home and CardPreview branch will use
the stored v2 MembershipCard and this same scannable view. Opening/closing a detail
does not call any storage writer. No actual production data was touched by tests.

## Verification

- TypeScript passed.
- Read-only ESLint passed: 78 files, 0 errors / 0 warnings.
- Automated tests: **375/375 passed** (previous 345 plus 30 code tests).
- Android export passed: `.expo/scannable-card-detail-review/metadata.json`.
- No decoder code found in the emitted app JavaScript bundle.
- Samsung display/physical decode, Airplane Mode scanning and production restart
  after cutover: **not yet verified in this step**.

The schema, release constant, production runtime routing, grid, 7 presets,
automatic placement/search, inset/radius, theme and original website were not
changed in this step. Prior uncommitted work remains intact.

## Samsung checks available immediately

```powershell
cd C:\ฉันจะทำเว็บไซด์\bemem-app
npx.cmd expo start
```

Use the existing `/dev-add-card` route in Expo Go, e.g.
`exp://<computer-LAN-IP>:8081/--/dev-add-card`, with the actual host/port printed by
Expo. This route uses memory-only fictitious cards and the SHARED production detail.

1. Add `Synthetic Club`, membership number `0000012345`, and an independent code
   value such as ` 000Ab c ` (including spaces). Choose QR or Code128 preference.
2. Add to the memory draft, then tap the card. Check a real black/white QR appears.
3. Switch Code128/QR and read each using another phone or scanner. Verify the raw
   result equals the code value, not the separately entered membership number.
4. Test a Thai/emoji QR payload. Code128 must be disabled with a truthful reason.
5. Flip Front/Back and close via Close, outside tap and Android Back. Reopen and
   verify positions/Draft are unchanged. Try normal and enlarged system text.
6. For a long Code128, confirm the full code fits or the width warning appears;
   never expect to scan a cropped/partially visible code. Rotate or use QR.
7. For an offline run, load the Expo Go JS bundle first, enable Airplane Mode with
   Wi-Fi off, then reopen/toggle the already running card detail. Code generation
   must continue without a network request. A cold Expo Go relaunch may still need
   Metro to load its development bundle; that is separate from offline encoding
   and must later be verified in a development/production build.
8. Return to normal Home/Create and verify existing v1 cards/search/drag/save/dialog
   behavior. Demo cards must never show QR/barcodes. Review Wallet v2 still shows
   the locked execution action and performs no migration by opening it.

Memory Test Save in the existing DEV route is NOT phone persistence. Do not treat
it as a completed production cutover. No new harness/route was added in this step.

## Files in this step

New:
- `src/lib/card-code.ts` — strict encoder/SVG/Base64/pixel geometry helpers.
- `src/components/bemem/CardCodeView.tsx` — native offline SVG display/error states.
- `src/types/qrcode-core.d.ts` — narrow pure-core API declaration.
- `scripts/test-card-codes.cjs` — independent decoder and native-view contract tests.
- `PHASE2-SCANNABLE-CARD-DETAIL.md` — this report and device acceptance procedure.

Modified:
- `src/components/bemem/MembershipCardDetail.tsx` — replace placeholder with real
  Code View; keep original title/flip/expiry/number/share/history layout and behavior.
- `scripts/test-production-integration.cjs` — mock the native leaf in existing
  integration tests and assert real payload/format propagation.
- `package.json`, `package-lock.json` — two approved encoders and approved test decoder.

## Next approval

First review the Samsung symbols and physical scan results. Separately authorize
opening the production release gate and the supervised Native Backup/Import/
Cutover procedure. After that, verify real Add→Draft→Save→Home→Detail→scan,
committed-card restart persistence and Airplane Mode in a suitable build.

No production gate, backup, import, cutover, reset, revert, commit, push or deploy
was executed. Share, History/Receipts, Edit and image picking remain out of scope.
