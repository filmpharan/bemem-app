# bemem — Expanded Artwork + Real Decorate Mode

Date: 2026-11-09. Status: implemented for Samsung / Expo Go testing; physical-device verification pending. No Commit, Push, Deploy, wallet reset, reimport or device data access performed.

## Design read and skills

Reading this as: an offline personal membership-wallet scrapbook for one-handed phone use, with Pearl Gray — Lagoon Glass controls and approved Cozy Cute illustrations, targeting Android first with native safe-area support on iOS.

Design dials: DESIGN_VARIANCE 4 (retain approved app), MOTION_INTENSITY 2 (direct gesture feedback, no decorative loops), VISUAL_DENSITY 6 (compact artwork tray with accessible controls).

Read the actual installed `bemem-illustrator`, `mobile-design`, and `ui-ux-pro-max` skills. Applied Illustrator's existing export/alpha/anchor functions without modifying its script; read mobile design-process, accessibility/touch, motion and feasibility guidance; ran UI/UX Pro Max's `touch drag gestures safe area --stack react-native` query (three matches), and reviewed its pre-delivery rules. The local UI/UX database's version-specific examples reference RN0.86; they were not treated as authority for the installed RN0.88.1. Current installed Expo is58.0.23. Checked official [Expo58 reference](https://docs.expo.dev/versions/v58.0.0/), [Expo Image](https://docs.expo.dev/versions/v58.0.0/sdk/image/) and [React Native PanResponder](https://reactnative.dev/docs/panresponder) before implementation.

No new design-token palette, app screen redesign or runtime dependency. No purchase, subscription, PRO entitlement or Theme Picker.

## Artwork inventory

The approved13 PNGs were copied byte-for-byte to `assets/decorations/cozy-cute-v1/`. Their source files, master illustrations and original trial folder were not edited. Hash comparison against their approved manifest passes. All new PNGs share the same192×192, nonanimated8-bit RGBA transparent format.

| Collection | Stickers | Modular pieces |
| --- | --- | --- |
| Pet & Care | pet-cat, pet-dog, pet-paw | Approved shared botanical family |
| Travel Diary | travel-suitcase, travel-plane, travel-cloud | Approved shared botanical family |
| Wellness | wellness-flower, wellness-leaf, wellness-teacup | Approved shared botanical family |
| Café Day | cafe-coffee, cafe-cookie, cafe-croissant | coffee-straight, coffee-corner, coffee-end, coffee-accent |
| Shopping & Gifts | shopping-bag, shopping-gift, shopping-bow | ribbon-straight, ribbon-corner, ribbon-end, ribbon-accent |
| Little Savings | savings-piggy, savings-coin, savings-wallet | savings-straight, savings-corner, savings-end, savings-accent |

The shared botanical IDs are `vine-straight`, `vine-corner`, `vine-end`, `vine-flower-accent`. There are34 unique assets, not42 duplicated files. Each of the six trays shows its three stickers and four frame pieces together, without Stickers/Frames sub-tabs.

New artwork is trial quality for user evaluation, not commercially finalized. Nine new raster illustrations were AI-generated from the approved cat as a style reference;12 new SVG frame masters were authored programmatically and rendered with installed Inkscape1.4.2. No human hand-painting claim. A wallet output with exterior haze was rejected and regenerated before inclusion. Slight soft AI fill variation is retained to match the approved set. SVG pieces use precise geometry rather than irregular edge anchors.

Tools already installed: project-local Python3.12 venv, Pillow13.0, Inkscape1.4.2. No reinstall or Krita installation. `build_artwork.py` imports the original Illustrator pipeline's `read_and_normalize`, SVG renderer and anchor checker, rather than changing the fixed13-item skill roster.

New trial files:

- `artwork-trials/decorate-expansion-2026-11-09/index.html` — offline gallery; double-click to open.
- `artwork-trials/decorate-expansion-2026-11-09/artist-originals/` —9 preserved high-resolution AI PNG originals.
- `artwork-trials/decorate-expansion-2026-11-09/artwork-source/` —9 normalized PNG masters and12 editable SVGs,96×96 viewBox.
- `review/contact-sheet.png` —21 labeled artworks,24/28/32px samples, light/dark review.
- `review/actual-size-preview.png` — tiny-size samples and3× magnification.
- `review/frame-connections.png` — closed frames, L paths and end-cap chains, enlarged and28px/tile.
- `review/asset-manifest.json`, `review/validation.json`, `provenance.json`, `build_artwork.py` — inventory, hashes, generation prompts, method and reproducible local pipeline.

PNG payload for all34 assets is377,043 bytes (368.21KiB), excluding originals, tooling and review sheets. PNGs decode, have true alpha0–255, correct PNG signatures and192×192 RGBA format. All150 new-family rotated seam pairings pass with zero alpha difference and RGB difference≤2/255 (actual new tests use integer stroke widths to avoid edge rounding). Approved botanical geometry retains its previous50-pair validation unchanged. Pieces connect within their own family; mixing families with different stem weights is not claimed seamless.

Actual-size sheets simulate24–32px blocks. The live drawer uses measured native canvas width÷12, not a fixed thumbnail dimension; its art is centered within separate48×48dp gesture targets. Source bitmap192px is not its display size. Native DPR, physical size and visual charm on Samsung remain for user review.

## User-visible flow

Home → Create → **Decorate** (replaces the visible Create PRO entry). Requires active, unlocked Wallet v2. A v1/locked wallet receives an explanation and is not migrated automatically.

Decorate opens the existing Create draft arrangement in the same `WalletCanvas` component. Cards keep their footprints, appearance, IDs, payloads and metadata. They can be moved with the existing350ms hold gesture; tapping never opens Card Detail, Add/Edit, Delete Card or Resize. Decorations can be selected, moved, rotated and deleted. On normal Create they are display-only collision occupants; normal card detail/edit flows remain available there.

The drawer starts at approximately40% of usable editor height. Drag its handle or tap the48dp handle control to expand/collapse it. The six collections scroll horizontally, and the asset area scrolls independently. Canvas remains visible and scrollable. Toolbar order: Cancel / Undo / Redo / Save. Cancel is60dp wide; Undo/Redo56dp each; Save takes the remaining prominent space. Buttons are at least48dp high; text may wrap rather than ellipsize.

Hold a drawer item350ms and drag it to the canvas. The full1×1 bitmap follows the finger at measured block size. A candidate cell is green/red according to the existing collision validator. Before the hold, a scroll-sized movement cancels pickup and leaves the tray free to scroll. During a held drag, tray/canvas scrolling is disabled to keep native coordinate mapping stable. Releasing outside the visible canvas or in an occupied cell adds nothing.

There is a tap alternative: tap an artwork thumbnail, then tap an empty canvas cell. Existing canvas items retain accessibility movement actions. Drag does not require selecting a new panel or confirming placement.

Tap a placed decoration to show48×48dp Trash and clockwise Rotate controls close to it; tap elsewhere to dismiss. Rotation advances0→90→180→270→0. No Done/Apply action; these operations affect only the draft. There is no automatic frame generation, neighboring-piece rotation or relocation.

## Grid and history

`canPlace`, `canvasItemFrame`, `canvasMetrics`, existing footprints and the12-column grid are reused. Decorations reserve one whole block and have **zero paint inset**, preserving frame edges. Cards retain0.1block inset per side and14dp radius. Collisions use full logical rectangles, never the inset. A card cannot cover a decoration and vice versa. Invalid existing-item drops return to the previous valid position. Completed moves create one history entry; gesture-frame offsets do not write Draft or history.

Undo/Redo is session-local in memory and covers add, move, rotate, delete and membership-card move. A new operation after Undo drops the Redo branch. No-op moves add no history. The existing single owner receives each completed draft update; no additional repository/coordinator/writer or persistent undo journal was created.

The current production240-row compatibility boundary is retained. Canvas content grows according to the existing row calculation until that boundary; placement past it is rejected. No distant data is clipped/repositioned. General unbounded production-canvas activation is outside this change.

## Persistence and compatibility

Wallet schemaVersion remains2. This strict optional canvas extension is added:

```json
{
  "canvas": {
    "columns": 12,
    "layout": { "existing-card-id": { "col": 0, "row": 0 } },
    "decorations": {
      "version": 1,
      "items": [
        { "id": "decor-example", "assetId": "pet-cat", "position": { "col": 8, "row": 0 }, "rotation": 90 }
      ]
    }
  }
}
```

Legacy documents without this extension validate and remain absent on read; no startup write or migration is introduced. Validator checks exact fields, extension version, known asset IDs, unique instance IDs (including card-ID conflicts), integer positions, rotation and collisions against cards/other decorations. Card positions remain in their original layout map. Decorations are not membership-card records and never get fake membership data. Unsupported assets/versions fail closed rather than dropping information.

UI DTO conversion merges decoration positions only for presentation. Persistence keeps Cards, original Layout and the optional extension together in the same existing snapshot transaction. The v1 adapter rejects decoration extensions explicitly, so its legacy writer cannot silently drop them. Add and normal Create moves preserve the canvas extension; Add/Resize collision checks include decorations. Existing Edit/Delete already preserve other canvas fields, with added regressions proving this behavior.

Save uses the existing owner generation, expected revision, repository pending gate, commit and readback. Local admission closes synchronously before awaiting. Runtime errors retain their existing typed categories. The editor additionally verifies revision+1 and exact Cards+Canvas readback before calling the existing screen's Home transition. No Save success or navigation occurs before that verification. Failed/uncertain Save disables further edits/retry; closing retains the owner draft and requires existing wallet reinspection. No automatic retry, stale-wallet overwrite, reset or reimport.

Cancel/Android Back immediately exits when Decorate made no changes. Otherwise the confirmation defaults to **Keep decorating**. Discard restores the draft captured on entering Decorate, returns to Create and writes nothing. Importantly, pre-existing unsaved Create edits remain in that entry draft. Save commits the complete current draft, including any such earlier Create changes, and goes directly Home. Session undo history is reset on successful Save or Discard.

Home renders only saved local PNGs at saved coordinates, with rotation and pointerEvents none. Its card taps still open Detail. No drawer/editor is mounted while on Home. There are no live SVGs, per-decoration storage reads or continuous Home animations. Search reuses the existing card-only filtered reflow; decorations are hidden for a nonempty search and restored with exact saved coordinates when cleared. An empty wallet containing decorations still receives Home's existing Add FAB because emptiness is based on cards, not decorations.

Compatibility is backward-reading: this version reads previous Wallet v2 files unchanged. An older binary with strict pre-extension validation may reject a new decorated snapshot; downgrading to that binary is not promised and must never be handled by resetting data. No100% native crash-atomicity or multiprocess lock guarantee is added; existing repository limitations remain.

## Files created/modified in this workstream

Production:

- New `src/lib/decoration-catalog.ts`, `src/lib/decorate-session.ts`.
- New `src/types/decoration.ts`, `src/constants/decoration-images.ts`.
- New `src/components/bemem/DecorateMode.tsx`, `DecorationImage.tsx`, `DecorateIcon.tsx`.
- Updated `src/types/wallet-document.ts`, `src/types/wallet-ui.ts`.
- Updated `src/lib/wallet-validation.ts`, `wallet-preparation.ts`, `wallet-production-policy.ts`.
- Updated `src/lib/wallet-cutover-runtime.ts` and `wallet-storage-adapters.ts` only to reject decoration extensions on v1; no protocol, backup, migration or release-gate changes.
- Updated `src/hooks/use-wallet-canvas.ts`, `src/components/bemem/WalletCanvas.tsx`, `HomeHeader.tsx`, `src/app/index.tsx`.
- Added34 PNGs under `assets/decorations/cozy-cute-v1/`.

Tests/review:

- New `scripts/test-decorate.cjs` (29 tests).
- Updated `scripts/test-production-integration.cjs` (three additional actual-owner/native-storage-mock regression tests), `test-card-form.cjs` (new renderer stubs), `test-header-layout.cjs` (approved Decorate label).
- New expansion artwork folder, this report, `output/decorate-tests.txt` and local `output/decorate-android/` bundle.

Existing uncommitted app/config/package changes predate this task and were retained. This work did not install dependencies or edit package.json, package-lock.json, app.json, the website, Wallet/History files, approved Card Detail/Journal styling, encoders or their payloads. HEAD stays `c500a015cfc80bd6a63c88d3848562b33f02faa3`.

## Validation

| Check | Result |
| --- | --- |
| TypeScript | PASS: local `tsc --noEmit` |
| Full automated suite | PASS: **704/704**, zero failures/skips |
| New Decorate tests |29/29 plus3 production regressions |
| Asset decode/format/alpha |34/34 pass; approved13 byte-identical |
| New frame rotations/connections |150/150 pairings pass |
| Android bundle |PASS: Hermes `.hbc`,1570 modules, all34 decoration PNGs included |
| Lint |Not configured: no ESLint config; intentionally did not trigger Expo's automatic installation/configuration |
| Samsung physical touch/rendering/QR scans |**Not Verified** by these automated tests |

Tests use synthetic data and a mocked filesystem. They cover all six trays/registry entries, native responder's350ms timer, quick tap/scroll cancellation, one drop per gesture, coordinate mapping with scroll/safe-area offset, candidate feedback, selection/rotation/deletion, all five Undo/Redo action types, branch clearing, invalid drops, Cancel/Back confirmations, Save/double-submit/readback/repository restart, Pending/Revision conflicts, stale session, Save failure, Home rendering, Search restoration, legacy reads and preservation through Add/Edit/Delete/normal Create. Existing Card Detail, encoder/decoder, Sharing, Journal and recoverable deletion tests remain in the passing full suite.

JSX/component-prop and responder tests are not native hit testing. The initial sandbox blocked process-spawn testing; running tests with Node's `--test-isolation=none` avoided child processes without changing the tests. Android Hermes export required running the existing compiler outside that sandbox as the standard user; no Administrator/security changes. No device data was touched.

Commands from project root:

```powershell
.\node_modules\.bin\tsc.cmd --noEmit
node --test --test-isolation=none scripts/test-*.cjs
$env:CI='1'
$env:EXPO_NO_TELEMETRY='1'
.\node_modules\.bin\expo.cmd export --platform android --output-dir output/decorate-android --max-workers 2
```

## One complete Samsung test workflow

1. From `C:\ฉันจะทำเว็บไซด์\bemem-app`, run `npx.cmd expo start --lan`. Open the same project in the existing Expo Go installation using the Metro QR or existing project entry. If it was already open, use Reload to load the current bundle. Do not uninstall Expo Go, clear data, import or reset the wallet. Once Metro has loaded the bundle, artwork/rendering/saving has no cloud dependency; a cold Expo Go launch can still require Metro to serve the development bundle.
2. Confirm Home's original cards and saved positions are unchanged. Tap a membership card and check Detail, real QR/Code128, Sharing and Journal still open normally; close back to Home. Do not infer physical scan success from bundle tests.
3. Tap Create, then **Decorate**. Confirm the same current arrangement and approximately40% drawer. If Wallet v2 is not active/unlocked, stop at the explanatory message; this feature does not import automatically.
4. Expand/collapse with both the handle drag and its tap action. Check all six collections. Artwork should occupy about one measured block inside48dp gesture targets; it should not look enlarged in the tray. Check normal and enlarged system fonts, safe areas and Android navigation bar. Allow tray/canvas scrolling before pickup.
5. Hold an artwork350ms then drag into an empty cell. Confirm its ghost and target highlight. Try dropping on a card, another decoration, outside the viewport and beyond a grid edge: nothing else should move. Try a quick tray scroll: it should not place an item. Also try tap artwork → tap empty cell as the alternate placement method.
6. Hold and move a placed decoration. Tap it to reveal Trash/Rotate, rotate all four angles, dismiss tools by tapping elsewhere, then delete it. Undo and Redo each operation. Undo an action, make a different action and verify Redo clears. Hold and move one membership card; its dimensions/appearance should stay unchanged, taps should not open Detail, and moves must reject occupied cells. Undo/Redo that move.
7. Manually place straight/corner/end pieces into an L and closed frame within one family. Rotate pieces as needed. Check joins at normal zoom; also check the approved botanical family. No adjacent piece should auto-rotate or relocate.
8. Test Cancel/Android Back with changes: **Keep decorating** retains them; confirmed Discard returns to the Create entry draft with no persistent changes. If Create already had unsaved moves before Decorate, those earlier moves should remain. Enter/exit Decorate without changes: no confirmation is required.
9. Enter again, make the desired draft changes and press Save once. It should show busy, reject repeated saves and go directly Home only after readback. Check exact card/decor positions, static decoration rendering and normal card taps. Search for a known card: decoration items hide and existing filtered search reflows; clear it and confirm exact saved positions/decorations return.
10. Reload/reopen the same app project without clearing its data. Confirm cards and saved decoration positions/rotations persist. Try another edit after reopening and ensure normal Save/Discard/Cancel works. Use only intentionally disposable entries/cards when checking destructive functions; no real card or history was deleted by automated testing.

## Remaining limitations

- Native Samsung scrolling/responder arbitration, gesture navigation, large-font layout, frame subpixel seams, tiny art legibility, touch feedback, TalkBack focus and long-session performance require the above device test. iOS hardware is also unverified.
- There is no edge auto-scroll during an active drag. Scroll the canvas first or collapse the drawer, then pick up/place an item. Dragging into an offscreen row is intentionally not guessed.
- Existing240-row production policy remains. The schema can read larger logical positions, but runtime compatibility blocks them instead of trimming.
- Undo/Redo is in-memory and ends with the editor session; unsaved edits are not crash-persistent. No extra persistent history system was added.
- Initial drawer tap targets are48dp; a placed decoration itself occupies its literal24–32dp block for precise selection. Nearby frame tiles are not given overlapping expanded hitboxes. Selected tools are48dp, and existing-item accessibility movement plus tap-placement provide alternatives, but screen-reader usability needs native verification.
- New artwork remains awaiting user aesthetic approval. Cross-family frame-stroke matching and commercially finalized illustration quality are not claimed.

Stop after this implementation and report. Await Samsung feedback before another feature.
