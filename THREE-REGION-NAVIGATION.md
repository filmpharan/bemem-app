# Three-region navigation refinement

2026-11-20 — implemented, awaiting Samsung acceptance. All work local/uncommitted.
Existing baseline HEAD: `3ec5a45bd9765594f5901b8ab196ba2f8950bde4`.

## Prior implementation and current boundaries

The previous Header sat inside a flexible content wrapper. Footer controls changed by
mode and Canvas choices replaced that whole footer row. Card Preview, Membership Card
Detail and Group Folder Sheet opened native Modal windows with full-window backdrops,
which made the underlying Footer inaccessible regardless of z-index.

Main now uses one existing SafeAreaView, then three sibling regions:

1. Header, with no Canvas top gap.
2. Flexible Canvas region, including its ordinary inline sheet layer.
3. Docked Footer in normal flex flow, above the existing system bottom inset.

Decorate retains its existing separate native Modal and its established Status Bar,
navigation-bar translucency and SafeAreaView. Inside it, Header / Canvas+drawer / Footer
use the same composition. No new animations, windows, scrolling wrappers or safe-area
padding were added to the main shell.

## Header

Home keeps Profile / centred bemem. / Search. Create and Decorate have Profile /
centred bemem. / Cancel + Save. Editor side regions are symmetric 120dp, leaving the
remaining centre region to the wordmark. Cancel has a 56x48dp target; Save is 48x48dp.
Their labels retain 14/22 typography and a 1.3 maximum font multiplier. The existing
wordmark font and fitting policy are unchanged.

At available widths >=360dp the Header is 48dp. At widths below360dp, editors use a
second 48dp action row (96dp total) instead of overlapping the wordmark or shrinking
touch targets. Home remains48dp. These are configured bounds, not Samsung measurements.

Create Save calls the existing hook Save, stays on the same Create page on success,
and preserves the draft on failure. Cancel and central Home use the existing leave
flow with Save / Discard / Stay. Decorate Save uses the existing session/readback and
returns Home on success; Cancel/Home preserve the existing session cancellation rules.
An earlier inherited Create draft remains protected by those original rules.

## Permanent text-only Footer

| Mode | 1 | 2 | 3 | 4 | 5 |
|---|---|---|---|---|---|
| Home | Canvas N | Decorate | Home | Create | Empty |
| Create | Canvas N | Decorate (unavailable) | Home | Add Card | Empty |
| Decorate | Canvas N | Decorate (active) | Home | Create (unavailable) | Empty |

Five equal 20% slots; no Footer icons, hidden fifth-slot button or touch surface.
Existing minHeight56dp, paddingVertical4dp, >=48dp targets and bottom Safe Area are
retained. Large labels can wrap to two lines; active Home/Decorate uses weight and an
underline as well as the existing teal colour. Unsupported direct editor transitions
are disabled, explained by accessibility hints, and rejected inside callbacks too.
Busy state blocks navigation. A blocked writer can still leave safely through Home/Cancel.

Undo/Redo remain available as text controls in a48dp row in the Decorate drawer,
between collections and the artwork grid. This row consumes48dp of Decorate's middle
region; it does not enlarge the Header/Footer or overlap Canvas gestures. Collection
targets and drawer artwork were not shrunk to make room.

Canvas1–5 choices now float immediately above the permanent Footer in the same native
window. Only that popover is absolutely positioned. Its backdrop is confined to the
Canvas region; the Footer itself is not an overlay. Current-page selection, outside
tap and Android Back dismiss it. Locked2 shows Login Coming Soon; 3–5 remain temporarily
disabled unless existing entitlement/current-content rules provide safe access.
No entitlement, page count, stored data or Home swipe changes.

## Ordinary sheets and navigation sequencing

`CardPreview`, `MembershipCardDetail` and `GroupFolderSheet` have an optional
`presentation="inline"` mode. The production main screen opts in; existing other
callers keep their original Modal presentation by default. Inline surfaces cover only
the Canvas, use no additional SafeAreaView and keep their original content/scroll/code
renderers. Their backdrop catches Canvas touches; underlying Canvas accessibility is
hidden while Header, Footer and sheet remain reachable.

Footer requests from an ordinary sheet are serialized by a small screen-local UI
intent ref. It closes Card Detail and Folder state first, waits for that committed
render/effect, consumes the intent once, verifies the session generation/current
page/mode and non-saving state, then invokes existing navigation commands. Duplicate
taps cannot replace a pending intent; stale intents are dropped. There is no new Wallet
owner/coordinator, persistence layer or automatic Save.

Home while already Home closes sheets and stays on the current Canvas page. A member
detail opened from a folder still returns to that folder on ordinary Close/Back. A
Footer navigation intentionally closes both. Inline Folder confirmation registers its
existing dismiss function with the screen, so Android Back cancels the confirmation
before closing the folder. Rename and Ungroup handlers are unchanged.

Nested Edit, Share, History, full-screen viewers, camera/gallery/crop and native
permission UI retain their existing presentation and exit guards. Navigation is locked
while these nested interactions/confirmation are active. This task does not promise a
persistent usable Footer through those native windows or bypass their draft safety.

## Protection and validation

Runtime source changes: `index.tsx`, `NavigationHeader.tsx`, `HomeHeader.tsx`,
`ContextualFooter.tsx`, `DecorateMode.tsx`, `CardPreview.tsx`, `MembershipCardDetail.tsx`,
`GroupFolderSheet.tsx`. Five existing test scripts updated for the new action locations
and additional inline presentation, queue/stale-intent, Folder Back and draft-safe exit
coverage. `output/three-region-validation/` holds local results and scope hashes.

Wallet types/schema, owner/repository/coordinator, hook, Grid engine, positions,
Folder membership/geometry, encoders, image handling, Vivid Lagoon tokens and all344
existing assets remain byte-identical to task start. No device Wallet was read or
written. Local Android Hermes export validates bundle compatibility, not device UX.

## Samsung checks

1. All modes: verify centred Header, compact Footer, five stable text slots and empty5.
2. Check Cancel/Save at normal/enlarged fonts and narrow display settings; <360dp
   editors deliberately have a second action row. Confirm Status Bar/navigation-bar clearance.
3. Home: open a membership detail, toggle QR/Code128, swipe, flip and scroll. Footer
   must stay visible/tappable. Home closes the sheet without resetting page or positions.
4. From an open detail, press Create, Decorate or Canvas N. Sheet closes before the
   destination/selector appears; rapid double taps must not launch two destinations.
5. Open a folder and a member detail. Normal Close/Android Back returns to the folder;
   Footer Home closes both. Check Folder contents scrolling and member artwork unchanged.
6. In Create, move a test item, open detail/folder and press Home or Header Cancel.
   Stay keeps the draft; Save must finish before exit; Discard restores Saved. Ordinary
   Header Save must remain in Create on the same Canvas.
7. Check Rename keyboard and Ungroup confirmation. Android Back cancels the nested
   confirmation first. Footer must not bypass an active Edit/confirmation form.
8. Decorate: test Hold350ms, drawer drag, Undo/Redo in the drawer, Cancel safeguards,
   Save->Home and failed-save retention. Create is visibly unavailable; Decorate active
   must not restart the session. Verify drawer/Canvas drag coordinates after layout changes.
9. Check Canvas2 lock/Coming Soon, disabled3–5 and any existing entitled/current pages.
   Popover keeps main navigation visible and dismisses on outside/current/Android Back.
10. Full View, Share, History, Gallery/Camera/crop and native Back retain their existing
    protected flows. Reload normally; verify saved cards/folders and positions unchanged.

Deferred: Motion Phase3, unsupported direct Create↔Decorate navigation and reworking
nested native tools into the shell. No dependencies, commit, push, deploy or reset.
