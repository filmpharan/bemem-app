# Add Card default Front / Back artwork — production integration

14 November 2026 · Implemented; awaiting Samsung acceptance. No device data was accessed during implementation/testing. No Commit, Push or Deploy.

## Assets and exact pairing

Production directory: `assets/card-faces/`. Exactly thirteen approved PNGs were copied **byte-for-byte**, with dimensions 1536×1536. No gallery, screenshot, SVG source or newly invented back was bundled.

| Front color | Front filename / persisted asset ID | Soft Pastel Minimal Back filename / ID |
|---|---|---|
| Blush Pink | `art-bemem-lg2-front-blush-pink.png` | `art-bemem-spm1-back-pink.png` |
| Warm Brown | `art-bemem-lg2-front-warm-brown.png` | `art-bemem-spm1-back-brown.png` |
| Fresh Green | `art-bemem-lg2-front-fresh-green.png` | `art-bemem-spm1-back-green.png` |
| Golden Yellow | `art-bemem-lg2-front-golden-yellow.png` | `art-bemem-spm1-back-yellow.png` |
| Sky Blue | `art-bemem-lg2-front-sky-blue.png` | `art-bemem-spm1-back-blue.png` |
| Dream Purple | `art-bemem-lg2-front-dream-purple.png` | `art-bemem-spm1-back-purple.png` |
| Coral Orange | `art-bemem-lg2-front-coral-orange.png` | `art-bemem-spm1-back-brown.png` |

Front sources: `design-previews/lagoon-glass-card-face-v2/masters/png/<color>.png`.
Back sources: `design-previews/card-face-and-group-frame/masters/A-{pink,brown,green,yellow,blue,purple}.png`.

The six original A-series backs exist and decode correctly. Coral Orange deliberately shares the existing warm Brown back; there is no seventh back artwork. Every original preview asset remains unchanged.

`assets/card-faces/MANIFEST.json` records source paths, exact byte lengths, MD5 and SHA-256. The thirteen PNGs total **17,025,140 bytes** (approximately 16.24MiB), excluding small registry/manifest overhead. Android export confirmed all thirteen image files in the bundle. This is a deliberate master-resolution asset cost; it is not thirteen new images per membership card.

## Session lifecycle and immediate preview

`createDefaultCardArtworkSession()` is a pure lazy initializer used only by the production **new Add Card editor**. It samples one of seven fronts once and assigns the fixed complementary back. Both references start with centered crop `{x:.5,y:.5,zoom:1}`. Form values/presentation and their pristine baseline are created from that selection.

Typing, EXP, changing any of the seven sizes, Front/Back flips, keyboard/layout changes, scanner/photo/crop sheets and normal rerenders do not invoke selection again. A newly mounted Add session can choose another color, including the same color by chance. There is no Random Design button or template browser. Edit/loading/rendering paths never choose defaults.

The Add preview initially uses ephemeral bundled source URIs **keyed by asset ID**, so the selected artwork can display before its private file copy completes. These overrides are passed only as component props, never in form data or Wallet JSON. After both required default files are verified, the preview uses the same private artwork URI as saved cards. Changing source remounts only the image, not the form or session.

Defaults are prepared in an effect with a per-mounted-session active flag. Completion changes only readiness/error state, **never the controlled artwork pair or entered fields**. A cancelled session's completion cannot update a later session. Default preparation alone is not a user edit and does not trigger Discard confirmation on an otherwise pristine form.

While required files are preparing, the existing Add CTA is disabled and a compact “Preparing artwork...” status appears. Failed preparation shows a concise error and never submits an unverified reference. Users can reopen Add or replace failed defaults with photos. If only one side failed and was replaced, the verified other default can remain. No automatic retry or silent flat-color substitution was added.

## Persistence without schema changes

The same existing `appearance.artwork.front/back` shape is persisted: `assetId`, width/height, byteLength, MD5 and crop. No new Wallet field, version, migration or repository was introduced.

The existing Artwork Store gained one named-default retention operation. Versioned deterministic IDs identify immutable approved files in the existing `bemem-card-artwork` Documents directory:

1. If the named file exists, verify its size/MD5; reuse it only if correct.
2. Otherwise load the existing bundled asset, then verify the actual local source bytes against the registry.
3. Copy with the existing exclusive/no-overwrite file adapter and verify the retained file.
4. Concurrent attempts may reuse an identical already-retained file; mismatches fail closed. No existing image is overwritten, repaired or deleted automatically.

New cards can share these immutable source files while retaining their own crop metadata. Cancel may leave reusable public default files retained, just as the existing non-destructive image lifecycle can retain unused copies; it does not write a card or Wallet snapshot. This task does not add image garbage collection.

Add still submits only to the existing **Create Draft**. Existing Create Save/Discard, v2 single writer, revision, snapshot/readback and artwork verification are unchanged. Saved cards use private Documents copies, not an expiring asset-cache path or development-server URL. Mock Save/readback/restarted-repository tests preserve the same exact references and member-number text.

`expo-asset` **58.0.20 was already installed** with Expo. It is reused for `Asset.fromModule()` / `downloadAsync()`; no dependency was installed and package/lockfile were not changed. On Expo Go, uncached new bundle assets are initially delivered by Metro. Saved artwork copies remain independent of that cache. Offline operation after a real save/restart must still be confirmed on Samsung; a standalone native build includes the required static images.

## Photos, rendering and output parity

- Gallery/camera/crop controls are unchanged. Confirming a replacement updates only the chosen side and retains the other side exactly. Original uploaded bytes remain immutable; crop remains metadata.
- Default loading never merges over a newer photo selection. Source overrides match default IDs only, so a personal photo immediately uses its own retained file.
- Seven existing presets, uniform cover math, 0.1-block inset and 14dp corners are unchanged. One square master supplies all shapes; no size-specific source collection was created.
- New Golden Yellow uses an existing dark-text form color; the other new fronts use the existing light-text form color. These are fallback/text settings beneath actual opaque artwork, not replacements for the rendered PNGs.
- The six registered pastel backs receive dark text in the existing shared appearance renderer so the existing Back membership-number overlay stays readable. Legacy images/photos are outside that ID-specific rule.
- Add, Home/Create, Detail, Full View, Edit and Share reuse existing artwork fields/renderers. No default selection runs there after creation. Existing image-only Share privacy rules remain intact: artwork is shared without adding a number/code unless the user chooses the corresponding scan-sharing mode.
- Group Folder code is unchanged. Its approved upright cover preview reads the actual retained Front file, including these new defaults or personal photos.

## Files changed

New source:

- `src/constants/default-card-artwork.ts` — pure seven-front/six-back metadata registry.
- `src/lib/default-card-artwork.ts` — pure selection/session/reference helpers.
- `src/lib/default-card-artwork-assets.ts` — thirteen literal static requires and bundled-asset loading.
- `src/lib/default-card-artwork-native.ts` — existing-store preparation/readiness and temporary preview sources.

Existing source:

- `src/components/bemem/AddCardEditor.tsx` — lazy session choice, guarded preparation, CTA readiness.
- `src/components/bemem/AddCardForm.tsx` — forward preview-only source overrides.
- `src/components/bemem/CardAppearancePreview.tsx` — source override and ID-specific dark back ink.
- `src/lib/card-artwork-store.ts` — exclusive verified retention of immutable named defaults; existing photo retain/verify behavior remains.

Assets/tooling/tests:

- Thirteen PNGs and `MANIFEST.json` under `assets/card-faces/`.
- `scripts/prepare-default-card-artwork.py` — byte-preserving copy/validation/registry generation. It refuses to overwrite a different production asset. Future changed artwork needs a new versioned ID.
- `scripts/test-default-card-artwork.cjs` — first-use, lifecycle, integrity, image replacement and persistence tests.
- Existing `test-card-form.cjs` and `test-production-integration.cjs` fixtures extended for the new dependency. Older UI regressions model cached defaults; dedicated tests exercise real preparation logic with a memory filesystem and approved public asset bytes.

Used the previously read installed mobile-design/ui-ux-pro-max guidance for stable session behavior, unobtrusive progress/error states, contrast and unchanged geometry; bemem-illustrator guidance for verifying approved source artwork, exact copies and crop safety. No new illustration/design exploration was performed. Checked the installed module/API against [Expo Asset SDK 58](https://docs.expo.dev/versions/v58.0.0/sdk/asset/) and [Expo FileSystem SDK 58](https://docs.expo.dev/versions/v58.0.0/sdk/filesystem/).

## Validation

- TypeScript: passed.
- New focused tests: **16/16** passed.
- Full regression: **1020/1020** passed, including the locked Group Folder tests.
- Android Hermes export: passed, `output/default-card-artwork-android/`.
- Lint: package script exists, but ESLint CLI is not installed; no installation attempted.
- Asset dimensions, signatures, exact source equality, metadata and bundle inclusion checked.
- Logs: `output/default-card-artwork-validation/`; structured results: `ADD-CARD-DEFAULT-ARTWORK-VALIDATION.json`.

Existing asset hashes, original galleries, CI documentation, Group Folder implementation, Wallet schema/repository/owner, geometry, app configuration and dependency manifests were compared to the pre-task working tree. No protected file changed. No user image, real Wallet file, website source or Samsung app data was accessed by tests.

## Samsung checklist — pending, not performed by Codex

Start the same project with `npm.cmd start -- --go`. Do not clear Expo Go or reset the Wallet.

1. Open new Add Card: a colorful Lagoon Glass Front appears. Flip to the paired pastel Back. An untouched Cancel should close without a Discard prompt.
2. Type name, exact number and EXP; try all seven sizes, flip repeatedly, open/close scanner or keyboard. Artwork must stay the same within that session.
3. Choose a Gallery Front photo and confirm crop: Back stays intact. Take/choose a Back photo: Front stays intact. Cancel crop and Add Discard must retain the existing safe behavior.
4. Add → Create Draft → Save → Home. Reopen Detail, switch Front/Back, use Full View and both image/scan Share modes. Compare the reviewed image and exported image on the actual device; mock tests do not certify native capture pixels.
5. Group a newly created card and confirm the actual Front appears in the approved upright regions. Existing folders and older card appearances must remain unchanged.
6. Reload/restart and reopen the saved card; check both images and exact number. Then test saved-card access offline. Confirm a later **new** Add session can choose another front, while Edit never rerandomizes the saved card.

Remaining device checks: first uncached Expo Go asset delivery, SVG/PNG decoding and native memory/first-load timing, photo/camera permission paths, text contrast over the actual cropped content, and real Share/ViewShot export parity. No Samsung acceptance is claimed by this report.
