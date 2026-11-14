# Code 128 aspect ratio — display-only fix

Status: code/tests ready; awaiting physical Samsung verification.

## Cause verified in installed native source

`expo-image`58.0.18 Android `SVGDecoder.kt` derives its rendering aspect from `documentViewBox`. `SVGDrawableTranscoder.kt` also reports intrinsic width/height from that viewBox. Changing only the SVG root width/height therefore does not change the intrinsic ratio used by `contentFit="contain"`.

The encoder intentionally represents the X axis in bar modules and gives the Y axis a110-unit bar height plus8-unit margins. For the synthetic eight-digit payload `00123456`, the original viewBox is99×126. The previous display changed width/height to physical image dimensions but left that narrow viewBox unchanged. QR stays square and did not expose this mismatch.

## Fix and scope

- `src/lib/code128-display.ts` is a presentation adapter, not an encoder. It consumes only the existing encoded rectangle runs and measured frame, never the membership payload.
- Horizontal run positions/widths and gaps are mapped using the SAME integer physical-pixels-per-module factor already selected by `cardCodeFrame`. Vertical coordinates retain110dp bars, with physical-pixel rounding. SVG width, height, viewBox and native image-source dimensions now agree. No CSS/SVG transform or ad hoc bar-width distortion is used.
- White background and10-module quiet zones on both sides remain. Existing `contentFit="contain"`, Base64 SVG loading and no-cache policy remain.
- `CardCodeView.tsx` selects this adapter for Code128 only. QR retains its exact former SVG construction. Invalid presentation geometry produces an explicit error rather than a partial barcode.
- Existing too-wide policy is retained: show a clear rotate/use-QR error when a complete symbol cannot fit at the existing minimum physical module width. Never truncate, omit bars, silently shrink below that minimum or change the payload.

Example: at304dp available width and density3, the existing frame for `00123456` is297×126dp. The display SVG is891×378 physical pixels, and its viewBox is also891×378, rather than99×126. Encoded runs, checksum and source payload are unchanged.

Changed files: `src/components/bemem/CardCodeView.tsx`, new `src/lib/code128-display.ts`, `scripts/test-card-codes.cjs`, this report. The renderer is used only by MembershipCardDetail. No edits to MembershipCardDetail layout, encoder/card-code.ts, QR logic, card preview, controls, Wallet, saved cards, Home/Create, grid, schema, dependencies or original website source. Before/after source hashes confirmed this scope.

## Verification

- TypeScript passed; read-only ESLint81 files, zero errors/warnings.
- Related automated tests82/82 passed: code/decoder34, native Detail19, existing production integration29.
- New regression coverage: short/long payloads at densities1/1.5/2.625/3/4; matching SVG/source/native aspect; independent decoding of the actual presentation SVG; every bar width/position proportional to the original runs;110dp bar height; white quiet zones; unchanged encoded SVG input; QR byte equality; invalid geometry and explicit error behavior.
- Native `expo-image` behavior was inspected from installed source, not assumed from browser SVG rendering. Automated tests do not execute the Android decoder or replace a phone/scanner test.

## Samsung acceptance

Reload the existing Expo Go project without clearing storage or reinstalling. Open the same saved membership card and switch to Code128. Confirm a wide horizontal barcode, unchanged number, visible white margins and normal bar height. Scan with a separate device/scanner and compare every character including leading zeros/spaces/case.

Try both shorter and longer synthetic numbers using the existing memory-only `/dev-add-card` route if needed; no saved-card edits, import or Cutover are required. Very long symbols must show the existing full-symbol-fit error, never clipped bars. Switch back to QR and verify its shape, then test Swipe/Close/Front-Back remain as before.

No commit, push, deploy, data clearing or real-wallet writes were performed.
