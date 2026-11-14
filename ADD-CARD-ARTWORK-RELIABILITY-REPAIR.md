# Add Card default artwork — reliability and performance repair

This report supplements `ADD-CARD-DEFAULT-ARTWORK.md`. Its old six-back mapping is historical. New sessions now have seven front/back pairs. No saved-card migration was performed.

## Evidence and diagnosis

Confirmed from the previous implementation, compared with the task-start working-tree snapshot:

- The preview changed from a bundled URI to a Documents URI after preparation, creating another image request even though the artwork bytes were identical.
- A key containing preset, preview width and side remounted the preview when changing size or Front/Back.
- The renderer had no recycling identity or request-generation guard. This allowed a native view to retain its previous bitmap during loading; late display/error/dimension callbacks were not explicitly rejected.
- Preview decoding used the full-quality path, and cache policy was memory-only. Defaults now use a preview-only downscaling/cache path; saved/full/export rendering retains the existing full-quality path.
- Existing-file verification repeated file-info/hash work. Concurrent preparations could duplicate asset resolution and copy attempts. They now share in-flight work per asset within the store instance.

These are demonstrated code-level inefficiencies and stale-display risks. They do **not** prove which one caused the observed Samsung delay. No before/after Samsung latency was collected.

### What “old image” means

| Scenario | Finding / treatment |
| --- | --- |
| A: previous session becomes a new session's selection | No demonstrated selection leak. Selection remains lazy and once per mounted Add session. A legitimate random repeat can choose the same color. Independent-session and cancellation tests cover the lifecycle. |
| B: previous bitmap lingers while the next source loads | Concrete renderer risk. Added recycling identity, an immediate neutral current-request placeholder, and request-specific loaded/failed/displayed state. |
| C: late defaults replace a newer photo/session | Preparation already updated readiness/error only, not form contents. Retained that behavior and tested photo/camera priority and cancellation. Old renderer callbacks are now rejected too. |
| D: store incorrectly shares references | No evidence of wrong cross-color references. Versioned asset IDs and integrity verification are retained; concurrent identical default preparation is coalesced. |
| E: saved cards keep their old artwork | Correct and unchanged. Saved Coral/Brown stays Coral/Brown. New Coral sessions use Orange. |

## Targeted production changes

| File | Change |
| --- | --- |
| `src/components/bemem/AddCardEditor.tsx` | Resolve preview sources once per session; retain the same sources after preparation; skip preparation when both retained assets have already passed verification. |
| `src/components/bemem/AddCardForm.tsx` | Remove the size/side-dependent preview remount key. No layout or field redesign. |
| `src/components/bemem/CardArtworkImage.tsx` | Stable memoized source, per-request recycling key/token, stale/unmounted callback rejection, current-image loading state, preview-only downscaling and memory/disk cache. Preserve saved/full/export quality settings. |
| `src/lib/default-card-artwork-assets.ts` | Prefer an already local Expo Asset URI; register Orange with a static require. |
| `src/lib/default-card-artwork-native.ts` | Prefer verified Documents assets on cached reopen; keep preview source stable during initial retention; generic DEV timings. |
| `src/lib/card-artwork-store.ts` | Coalesce same-asset retention within an instance; reuse existing verification info; preserve exclusive copying and integrity checks. Photo retention is unchanged. |
| `src/lib/artwork-performance.ts` | DEV-only generic phase/duration measurements; no personal data, paths, card identifiers or image content in logs. |
| `src/constants/default-card-artwork.ts` | Generated Orange metadata and new-session mapping. |
| `assets/card-faces/MANIFEST.json` | Register the fourteenth PNG and its checksums. |
| `scripts/prepare-default-card-artwork.py` | Add Orange input and preserve handwritten loader logic when regenerating the static require table. Refuse mismatched existing asset bytes. |
| `scripts/test-default-card-artwork.cjs` | Extend lifecycle, stale-callback, concurrency, mapping, old-reference and measurement tests. |

### Lifecycle and persistence

1. A new Add session selects one pair. Verify already-retained references without changing Wallet.
2. Resolve one stable source map. Cached sessions use verified Documents URIs; otherwise the bundled/local Expo Asset source can render while retention runs independently.
3. Initial retention still validates source and target byte length/MD5. Concurrent requests for the same default share their work. Failures keep Add blocked and show the existing error path.
4. Readiness changes never rewrite user-selected front/back images. Each side remains independent. Gallery, camera and crop results keep priority.
5. Typing/size changes do not recreate the preview component or default source. Side changes request the selected side only. Each actual source change starts a new renderer token; old callbacks cannot mark it ready or failed.
6. Add still feeds the existing Create Draft flow. Explicit Save, writer admission/revision/readback and Wallet schema are unchanged. Preview URI overrides never enter the Wallet document.

Integrity checks still run on cached reopen; this is intentional. There is no unverified global “ready” cache. No base64 conversion, runtime image transformation, arbitrary delay, concealment animation, picker or new dependency was added.

The persistence model remains ordinary private local `CardArtwork` references with the existing crop fields. Detail, Home/Create, Group Folder, Full View and Share use that same path. Mock regression tests cover these contracts; actual process restart, offline Expo Go behavior and native Share output still require Samsung verification. Initial Expo Go asset delivery can depend on Metro until an asset is local; this repair does not claim cold first-launch network independence in Expo Go.

## Orange Back and final pairs

Editable source: `design-previews/soft-pastel-minimal-orange-back/masters/A-orange.svg`.

Master PNG: `design-previews/soft-pastel-minimal-orange-back/masters/A-orange.png`.

Production PNG: `assets/card-faces/art-bemem-spm1-back-orange.png`.

Review sheet: `design-previews/soft-pastel-minimal-orange-back/seven-back-comparison.png`.

This is an extension of the existing SVG family exported through the installed Inkscape CLI, not a claim of hand illustration. Path geometry, composition, white lines, opacities and decorative structure match the original Yellow master exactly after normalizing four palette substitutions. New colors are `#f4ddcc`, `#ebbea0`, `#df9d72` and `#f7e7da`. No existing master was rewritten.

| Front | Back for new cards |
| --- | --- |
| Blush Pink | Pink |
| Warm Brown | Brown |
| Fresh Green | Green |
| Golden Yellow | Yellow |
| Sky Blue | Blue |
| Dream Purple | Purple |
| Coral Orange | Orange |

All 14 production PNGs decode correctly at 1536×1536 and match manifest byte length, MD5 and SHA-256. Combined encoded size is 17,080,635 bytes. Original 13 production PNG SHA-256 hashes match the task-start snapshot byte-for-byte. Existing saved Brown references remain valid.

## Validation

- TypeScript: passed (`tsc --noEmit`).
- Focused default-artwork and artwork-controls tests: **28/28 passed**.
- Full regression suite: **1,027/1,027 passed**, no skips (`node --test --test-isolation=none scripts/test-*.cjs`). Tests use fixtures/mock native filesystems, not Samsung Wallet data.
- Android Hermes export: passed; local output `output/artwork-repair-android`, bundle `entry-9989f63050862d815f5d42c8037f1b18.hbc`.
- Lint: not run. The project exposes `expo lint`, but no ESLint executable/configuration is installed. No installation was attempted.
- Changed/new code and asset paths are enumerated in `ADD-CARD-ARTWORK-RELIABILITY-VALIDATION.json`. Task-start SHA-256 comparison confirms existing Group Folder UI/logic, Wallet schema/repository/owner, Grid, app entry, dependencies, config and decorative assets were not changed by this repair.

Regression coverage includes all seven pairs/footprints; new-session independence; cancel/discard protection; pending default versus Gallery/Camera; side/size stability; source stability after preparation; concurrent retention; stale display/error/dimension callbacks including A→B→A and unmount; saved-reference preservation; and existing persistence, restart/readback, Share, Group Folder and Wallet contracts. Simulated renderer tests cannot substitute for Android image decoding and visual observation.

### Performance evidence and limits

`output/default-card-artwork-validation/mock-performance.json` records one real timed **Windows Node / mocked native filesystem** test. It uses real public PNG bytes for hashing, not a real Android filesystem or image decoder. Selection/resolution/preparation numbers are host test measurements, not Samsung timings; see the JSON for the latest run.

Measured operation counts: cold pair preparation performs two downloads and two copies; three concurrent preparations of the same pair still perform only two downloads/two copies total; twenty unchanged editor rerenders perform zero filesystem/asset operations. A cached open still performs integrity reads but no download or copy. There is no measured native first-visible time or numerical Samsung before/after comparison.

Latest full-suite host sample: selection **0.0592 ms**, source resolution **0.0124 ms**, cold pair preparation **6.0839 ms**, cached revalidation **2.5132 ms**. These are one-run mock/host timings, not device benchmarks or promised speedups.

DEV console measurements use only phase + duration: `asset-resolution`, `file-preparation`, `preview-visible`. The last measures this renderer request to display callback, **not** total form-open latency or proof of physical screen presentation. It also covers front/back source changes. Full native performance, memory pressure and decoder cache behavior remain unverified.

Expo Image API reference: https://docs.expo.dev/versions/v58.0.0/sdk/image/ (`recyclingKey`, `contentFit`, `allowDownscaling`, cache policy and display callbacks). Downscaling is confined to preview/thumbnail paths; crop geometry and full export rendering are retained.

## Samsung verification — no reset or data clearing

1. Start this same project with `npm.cmd start -- --go`; reload the current Expo Go project. Do not uninstall or clear data.
2. Open/close Add repeatedly. Confirm a correct current-session front appears without a previous photo flash; random color repeats are allowed. Check generic DEV timing logs if needed.
3. Type, test all seven sizes, and switch Front/Back rapidly. Default artwork must remain stable. Confirm a new Coral session has Orange Back.
4. Select Gallery/Camera images on both sides and crop while defaults may still be preparing. Wait, change side, Cancel/Discard/Android Back, then reopen. Late defaults must not replace the photos or leak them into the next session.
5. Only if you choose to create a test card: Add → explicit Create Save → Home → Detail → Full View → Share both sides. Restart/reload and verify the same pair/crops. Inspect old saved Coral/Brown cards: Brown must remain Brown.
6. Test after assets are retained with networking disabled, and inspect approved Group Folder previews/management without changing existing data. Compare first-open and cached-open responsiveness on the actual Samsung.

No device data was read, reset, migrated, rewritten or deleted by these tests. No original website edits, dependency installs, commit, push or deployment. Stop here for Samsung visual/performance review.
