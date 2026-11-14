# Editor page eligibility repair

Date: 2026-11-13. Applied on top of the existing uncommitted work; HEAD remains `c500a01`.

## Destination policy

`canvasAccess()` remains the policy source. `editorDestination` now equals its existing `editable` decision. Home's `visible`, `readable` and `preview` decisions are unchanged.

| Entitlement | Home | Create / Decorate |
| --- | --- | --- |
| Free | Readable 1; locked preview 2 | Only 1 |
| Active, selected count N | Readable 1–N | Editable 1–N |
| Expired, retained count N | Readable 1–N; next locked preview when N < 5 | Only 1 |

No hidden-page assignment grants an editing entitlement. Selected count, assignments and all stored content remain intact.

The editor selector filters out read-only/preview destinations independently of presentation metadata. With no alternatives, its 32dp circle remains visually normal in the existing header slot; the 48dp control is disabled and announces “Only available canvas.” It never requests a popup. Home still offers its original destinations.

## Entry and draft safety

- The owner exposes `pages.selectEditor()` alongside the existing Home `select()`; both share navigation and dirty/save fencing. Editor selection additionally checks live `editable` permission.
- Opening Create from a locked/read-only Home page selects editor page 1. A separate in-memory Home context restores the previous Home page on leaving, discarding or successfully saving. Ordinary editable-page navigation retains its previous behavior.
- Root Decorate/Add entry respects a rejected Create admission. Direct or stale forbidden Decorate entry mounts no session or lock screen and exits through the existing close callback.
- Hook and Decorate page-switch callbacks check live eligibility, including after confirmations. Stale Home selector callbacks cannot become an editor bypass.
- A clean session losing entitlement routes to editor 1. A dirty session losing entitlement exits editing, leaves its draft in the owner and displays a retained-draft message. Re-entry offers Stay/explicit Discard before changing to an allowed page. Unauthorized Save is not offered for that retained draft.
- A hidden dirty page retains its owner context until explicit resolution, preventing accidental reassignment of the draft to page 1. The owner still rejects new navigation while dirty or saving.
- Existing owner draft guards, single writer, page mutation checks and repository admission rechecks remain in force. No new writer or persistence path was added.
- Draft retention is in memory, as before; it is not a promise of unsaved-draft durability after process termination. Reactivation can restore editing permission without changing the retained data.
- The existing DEV entitlement simulator uses editor selection guards; it remains synthetic and process-local.

## Files changed in this task

Production / existing DEV code:

- `src/lib/canvas-pages.ts`
- `src/lib/wallet-runtime-owner.ts`
- `src/hooks/use-wallet-canvas.ts`
- `src/components/bemem/CanvasPageSelector.tsx`
- `src/components/bemem/DecorateMode.tsx`
- `src/app/index.tsx`
- `src/app/dev-multicanvas.tsx`

Tests:

- `scripts/test-canvas-page-ui.cjs`
- `scripts/test-multicanvas.cjs`
- `scripts/test-page-popover.cjs` (existing host/geometry tests now explicitly exercise Home previews)

This report and validation artifacts under `output/editor-eligibility-*` are additional local outputs.

## Validation

- TypeScript: `npx.cmd tsc --noEmit` — passed.
- Focused UI, policy, owner, Decorate, Account, header and popup tests — 126/126 passed.
- Full automated regression suite — 911/911 passed.
- Android Hermes: `npx.cmd expo export --platform android --output-dir output/editor-eligibility-android` — exit 0; `.hbc` bundle generated (~3.9 MB).
- Lint not run: although package.json contains a lint command, ESLint/configuration is not installed/configured. Nothing was installed.
- Pre-edit SHA256 comparison found changes only in the ten source/test files listed above. Shared EightSlotHeader, same-window popup host, popup geometry, drawer styling and all artwork assets were unchanged.
- No device Wallet files were accessed or changed. Tests use synthetic memory fixtures. No schema, repository transaction protocol, status bar configuration, dependencies or original website changes. No Commit, Push or Deploy.

Logs: `output/editor-eligibility-focused.txt`, `output/editor-eligibility-all-tests.txt`, `output/editor-eligibility-android.txt`, `output/editor-eligibility-android-stderr.txt`. Safety inventory: `output/editor-eligibility-baseline.json`, `output/editor-eligibility-changed-files.txt`.

## Samsung checks still required

1. Reload the current Expo Go bundle without clearing data. Free Home must still show page 2 with Unlock / Coming Soon.
2. From Home page 2, open Create: page 1 only; tapping its number opens no popup. Open Decorate: page 1 only. Close/Back/Save should preserve the original Home page 2 context.
3. In the existing memory-only `/dev-multicanvas` simulator, Active selected counts 2, 3 and 5 must offer exactly those editable ranges; Expired must retain Home read-only pages but offer editor page 1 only.
4. In the simulator, edit a premium page, then expire/free the entitlement. Confirm no unauthorized save, no silent discard, and explicit discard before entering another editable page. Reactivation should retain hidden data and selected count.
5. For actual authorized multi-page editing, check Create Save/Discard/Stay and Decorate dirty-session confirmations, outside-tap dismissal, Android Back and rapid double taps. Confirm unchanged 50dp header, circle position, 52dp center spacing, 20dp visible gap and sticker drawer.

Native appearance, physical touch behavior and entitlement-transition timing on Samsung have not been measured in this session. Do not reset Wallet or Expo Go to perform these checks.
