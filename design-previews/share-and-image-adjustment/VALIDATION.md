# Review output validation

2026-11-12. This phase changes only isolated review artifacts. No Production implementation or Samsung fix is claimed.

## Performed

| Check | Result |
| --- | --- |
| Crop model tests | 44/44 passed. Seven presets × three source shapes × Front/Back scenarios, four transforms and three render scales; coordinate equivalence checked against the unchanged production artworkFrame helper. Includes proof of nominal/painted ratio divergence. |
| Browser default/state captures | Nine 412×915 viewport scenarios checked; mock screens captured separately from external review docks. |
| Control geometry | Visible sheet buttons ≥48×48 CSS px at the default mobile viewport; no clipped button content or horizontal overflow in checked states. |
| Crop confirmation | A/B source viewBox identical before/after confirmation, including zoom 1.65 / x .7 / y .35. |
| Pointer / multi-touch | Real browser pointer drag changes crop; simulated Chromium two-finger pinch increased zoom to 1.8333. Cancel restored the sample entry framing. This is not a physical Samsung test. |
| Seven-size browser fit | 14 cases: A/Front and B/Back for all seven presets. Painted aspect within .001 of expected, viewport inside stage, exact source viewBox unchanged after Use Image. |
| Share states | Mode/side/format, explicit demo handoff, close/reopen, guided Back, missing Back disabled, QR-only Number with Code128 disabled, failed export prevents Share. |
| Narrow / enlarged text | All four proposals at 320×740, selected text enlarged to 150% in browser. No horizontal overflow/clipped button text; sticky footer remained within viewport. Body scrolls when required. This approximation is not Android fontScale/TalkBack verification. |
| PNG decoding | 18 PNGs decoded/verified with installed isolated Pillow. Matching default A/B captures are 412×832; comparison sheets 920×987. Manifest records all dimensions/bytes. |
| Syntax / local assets | JavaScript syntax checked. Browser captured local font, art and code fixtures. Review has no network API, file picker, storage or native-share calls. |
| Production guard | SHA256 baseline compared for existing src/assets/scripts and project config; no protected file changed. Final machine-readable result in scope-validation.json. |

Browser tool: existing cached Playwright CLI 0.1.23 with installed Chrome; no installation/update. Local review server bound to 127.0.0.1. Browser source/capture permissions were needed outside the sandbox; no security settings were changed. CLI file: navigation was blocked, so automated rendering used localhost. The gallery itself uses ordinary local relative resources and no fetch; double-click opening is provided for manual offline review.

## Evidence

- `model-test-results.txt`: 44 tests.
- `browser-review-results.txt`: default/state checks, matching viewBox, pointer drag/cancel, share states and enlarged-text layout.
- `browser-extra-results.txt`: 14 geometry cases, simulated multi-touch and guided Back.
- `screenshot-manifest.json`: decoded PNG dimensions and sizes.
- `scope-validation.json`: protected-file counts and unchanged hash verification.
- `production-baseline.json`, `starting-git-status.txt`: preservation evidence for extensive prior uncommitted work.

## Not verified / intentionally not run

- No native Production UI, Wallet write, migration, image replacement, share publication, Android bundle or app regression run was needed/performed for this design-only phase. The previous Production test results are not attributed to this workstream.
- Native EXIF decode, Gallery/Camera orientation, on-device crop/export parity, actual recipient scanning/delivery, Android Back, real safe-area/system bars, TalkBack and OS large-font behavior remain for a separately approved implementation/device phase.
- Synthetic SVG source art is deterministic test artwork, not a photograph or an AI illustration. It is not a proposed new card identity or decorative asset family.
- The two repeated crop frames prove the intended visual/coordinate contract in this mockup. They do not independently establish that the current React Native implementation already satisfies it. EXIF tests require actual oriented image fixtures and native decoding later.
- Source metadata is enough for the proposed math; no schema change or new dependency is currently demonstrated as necessary. If native orientation normalization/baked crop is needed, investigate and seek approval separately.

## Review route

Open `index.html` and compare Share A/B and Adjust A/B. In Share, switch Image/With code, Front/Back and format; use the outside review dock for missing Back / preparation / failure / QR-only states. Share opens a clearly labelled mock handoff only.

In Adjust, try all seven sizes and three source shapes from the outside review dock, drag, pinch, +/- zoom, and accessible range controls; confirm Use Image and compare the matching frames. Open `crop-proof.html` for the full seven-size grid. No source image or Wallet is written by these prototypes. Select one option per feature before any Production change.
