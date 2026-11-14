# Phase 2 — Step 2B: Samsung FileSystem test harness

Prepared for manual device testing. **Samsung/device results: NOT VERIFIED until the developer runs the tool.** Automated mock results are separate and do not certify native crash safety.

## Open in Expo Go

1. From bemem-app run `npx.cmd expo start --clear` using SDK 58 Expo Go on the same LAN.
2. Note the `exp://<LAN-IP>:8081` address shown by Expo CLI (use its actual host/port).
3. In Expo Go's Enter URL field open `exp://<LAN-IP>:8081/--/dev-wallet-test`.
4. The screen title is `Wallet v2 · Device FileSystem Tests`. Verify its displayed URI ends in `/bemem-wallet-v2-test` (an optional trailing slash is fine).
5. No tests run merely from opening the app or this screen. Press **Run Test** yourself.

If the Expo Go version does not provide Enter URL, open the equivalent `exp://.../--/dev-wallet-test` link on the phone. Normal `/` startup and Home/Create navigation are unchanged. No UI entry was added to Home/Create. **Back to Home** exits the developer tool.

The route redirects to Home when `__DEV__` is false; the tool and every sandbox operation also have DEV guards. A production route/module may still exist in the bundle, but the test UI is inaccessible and performs no automatic I/O. No dev-menu package was installed.

## What Run Test actually does

Every operation is inside `Paths.document/bemem-wallet-v2-test/`:

| Path | Purpose |
| --- | --- |
| `main/` | Synthetic membership cards + layout committed through the Step 2A repository; increment revision; retain old bytes; reject stale Save |
| `pending/` | Deliberately abandoned pending snapshot; load reports it without automatic promotion |
| `corrupt/` | Valid test revision followed by deliberate invalid JSON; latest load/save fail closed without silent fallback |
| `run-info.json` | Synthetic run revision + random JS session ID, used for manual restart verification |

The sandbox adapter uses SDK 58 `Directory`, `File`, `Paths.document`, awaited `write`, `text`, and `move(...,{overwrite:false})`. It uses the existing `createWalletRepository` API, not a replacement transaction implementation. A separate fixed-root adapter is necessary because the production adapter intentionally has a non-configurable real-wallet directory; **the Step 2A storage/repository API was not changed**.

Run Test may be repeated without clearing: it adds main revisions, retains pending evidence and adds a newer deliberately corrupt test revision. No real migration runs. Payload and membership numbers are fixed synthetic strings and are not printed as logs.

Expected first-run results: 7 Passed checks and 3 Not Verified checks. A Failed result names the failed stage and shows sanitized repository codes when available; native exception text and wallet contents are withheld.

## Verify readback after reopening

1. Run Test successfully and keep a screenshot of its results.
2. Fully close Expo Go (force stop if needed). Do not uninstall Expo Go, clear its app data or change the project URL/storage experience.
3. Reopen the same project and developer route.
4. Press **Verify After Restart** BEFORE pressing Run Test again.
5. A different JS session plus the exact marked synthetic revision gives `Passed · Different JS session readback`.

The tool detects a changed JS session, not an OS process ID. Fast Refresh can also change a module session. The developer must perform the actual close/reopen procedure; this result is not proof of native crash or power-loss durability.

## Protected data and cleanup

The harness does not list Documents itself, read/checksum user wallets, or call the production v2 storage factory. It cannot access Phase 1 or `bemem-wallet-v2` through its fixed-root API. Automated path-guard tests reject traversal and verify untouched synthetic protected folders in a mock filesystem.

`Protected v1 / real v2 contents unchanged` remains **Not Verified** on-device: computing before/after checksums would violate the instruction not to read actual user files. Namespace guards are enforced instead; no content-level proof is claimed.

Keep results with screenshots or copy the selectable result text. There is no upload/share service or automatic report export. No files are removed until **Clear Test Files** is pressed and the confirmation is accepted.

Cleanup preflights all sandbox entries and refuses unknown names or nested directories before deleting anything. It deletes recognized test files individually, then empty known case folders. It retains the empty test root and never recursively deletes a computed root. If unknown files are found, stop and inspect; do not broaden cleanup to user folders. Cleaning removes restart evidence too.

## What remains unverified

- Actual Samsung operation results until the user runs the screen.
- iOS native operation behavior.
- Power-loss/crash atomicity, fsync/durability, cross-process writers and native move races.
- Cold offline startup without Metro, production backup rules and recovery UX: require a separately approved development/standalone build test.
- Production adapter's complete native behavior is not certified by the sandbox adapter; it uses the same native API family but intentionally never accesses the real wallet root here.

The existing Home/Create Save/Discard/Cancel, gestures, Search Reflow, UI and Phase 1 storage remain unchanged. Do not advance to runtime adoption until device results have been reviewed.
