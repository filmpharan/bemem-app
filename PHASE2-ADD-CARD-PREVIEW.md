# Add Card — Development Preview

Status: ready for Samsung / Expo Go testing; no persistence or encoder.

Updated UX: see `PHASE2-ORIGINAL-WEB-UX.md`. The screen now uses the original
web bottom-sheet flow. **Add Card - Preview only** replaces **Check fields** as
the validation-only action; code/color controls are expandable. It still cannot Save.

## Open

Run `npx.cmd expo start --clear` in bemem-app. On the same Wi-Fi network,
open the Metro address in Expo Go with `/--/dev-add-card` appended:
`exp://<computer-LAN-IP>:<Metro-port>/--/dev-add-card`.
The route redirects to Home outside development mode. Home/Create and their FABs are unchanged.

## Samsung checks

1. Tap **Check fields** with empty inputs: required errors should appear.
2. Enter a synthetic name and membership number such as ` 000Ab c `.
   Code value follows the number, preserving spaces, zeroes and case.
3. Edit Code value, then change Membership number: the custom code must remain.
   **Use membership number** explicitly restores tracking.
4. Choose Code 128 with non-ASCII text: validation must explain the restriction,
   without changing the entered value or silently selecting QR Code.
5. Change orientation and each of the six colors; inspect the live card appearance.
6. With the Samsung keyboard open, move between fields using Next/Done and scroll
   to all controls. Also test enlarged system text and a narrow viewport.
7. Leave and reopen the route: the form starts empty. Home cards and layout remain unchanged.

## Reuse and boundaries

`AddCardForm` is controlled through values/errors/onChange/onBlur. It owns no
navigation, repository, ID generation or save side effects. `card-form.ts` adapts
raw strings to the existing MembershipCard validator using metadata supplied by
a future caller. The development route supplies preview-only metadata in memory.

Membership number is required by this form. QR eligibility currently means model
validation only; actual encoder size/capacity checks are deferred. Code 128 uses
the current model's printable ASCII restriction. No actual or simulated code is
drawn, and no Save action is provided. Existing migration Import remains locked.

Automated tests exercise field validation, exact string preservation, tracking,
independent payloads, choices, DEV gating and keyboard container configuration.
They do not replace native keyboard, touch, font scaling or visual testing on Samsung.
