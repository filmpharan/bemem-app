# bemem — Current-Approved Corporate Identity & Design System

**Documentation revision1 · 2026-11-13 · Pearl Gray — Lagoon Glass**

This is the authoritative current-production design specification. It describes the **current working tree**, including approved uncommitted work; Git HEAD alone does not represent this UI. This documentation revision is not a new runtime theme version, schema version or release gate.

The owner reports Samsung acceptance for CI Phase1 (shared confirmations), Phase2 (typography/semantic colors), Phase3 (sheets/Pearl Gray Detail), and the Add Card discard follow-up. Phase4 was **an audit only**; optional changes were deferred because the owner reported normal operation. Phase5 changes documentation only. No new Samsung test is claimed.

## 1. Authority, status and principles

Resolve conflicts in this order: owner's current approval → latest Samsung-approved implementation → current production source → historical documentation. If these disagree in future, report the discrepancy before changing runtime; do not silently restore an older specification.

| Status | Meaning |
| --- | --- |
| APPROVED CURRENT STANDARD | Current implementation/behavior accepted by the owner |
| HISTORICAL / SUPERSEDED STANDARD | Preserved design history, not instructions for new production work |
| INTENTIONAL EXCEPTION | Context-specific current behavior; do not mechanically normalize it |
| FUTURE / NOT YET IMPLEMENTED | Not available merely because a token, prototype or placeholder exists |
| UNVERIFIED / REQUIRES DEVICE TESTING | Static evidence or calculations do not establish native device behavior |

Priorities: comfortable everyday use; clear functional controls; minimal visual clutter; readable typography; consistent interactions; calm Pearl Gray surfaces; selective Lagoon Glass; reliable, safe user data handling. Branding must not dominate tasks. Keep the compact `bemem.` wordmark. Avoid blanket glass, heavy shadows, excessive gradients and decorative animation.

Use existing components first. App-owned interface chrome is governed by CI; user card artwork/images and decorative artwork are separate protected content. A CI change never authorizes recoloring those assets or changing data/persistence.

The runtime palette defaults to `pearl-gray`. Six palettes remain in the existing JSON: lagoon-mint, blush-pink, warm-beige, lilac-dream, sky-blue, pearl-gray. Peach Glow is excluded. Palette availability is **not** an implemented Theme Picker or preference-storage feature. Source: [lagoon-theme.ts:1](../../src/constants/lagoon-theme.ts#L1), [TOKENS.json](TOKENS.json).

## 2. Current semantic colors

APPROVED CURRENT STANDARD. Hex values below are resolved for Pearl Gray, not new runtime declarations. Main source: [ci-theme.ts:4](../../src/constants/ci-theme.ts#L4); supporting sheet recipe: [sheet-visual.ts:5](../../src/constants/sheet-visual.ts#L5).

| Specification role | Current value | Actual runtime binding / distinction |
| --- | --- | --- |
| surface.canvas | `#eceff1` | `ciColors.surface.canvas` → `lagoon.canvas.base` |
| surface.sheet | `#eceff1` | `ciColors.surface.sheet`; `sheetVisual.surface` |
| surface.elevated | `#fafcfd` | `ciColors.surface.elevated`; `sheetVisual.elevated` |
| text.primary | `#263943` | `ciColors.text.primary` |
| text.secondary | `#4c606c` | `ciColors.text.secondary` |
| text.supporting | `#4c606c` | `ciColors.text.supporting` |
| text.onAction | `#ffffff` | `ciColors.text.onAction` |
| action.primary | `#405764` | `ciColors.action.primary`; safe filled CTA |
| action.positiveSave | `#26734d` | `ciColors.action.positiveSave`; Header Save |
| action.destructive | `#b42318` | `ciColors.action.destructive`; destructive text |
| action.back / action.discard | `#b42318` | Separate aliases, same approved ink |
| action.neutral | `#263943` | `ciColors.action.neutral` |
| status.error | `#b42318` | `ciColors.status.error` |
| status.disabled | `#263943` | Existing `lagoon.text.disabled`; not an automatic opacity or global foreground override |
| status.success | `#176b4a` | Existing status token; **not** Header Save green |
| overlay.confirmation | `rgba(15,23,42,0.5)` | Local `ConfirmationDialog.styles.overlay`; specification role, no exported alias with this name |
| overlay.sheet | `#2b3e4966` | `sheetVisual.scrim` = `alpha(lagoon.action.deep,.4)` |
| sheet divider / boundary | `#8299a6` | `sheetVisual.border` |
| sheet rim | `#8299a699` | `sheetVisual.rim` |

Do not invent a global overlay token that replaces every specialized backdrop. Account popup overlay, scanner, full-view and image/render surfaces retain local context-specific treatments. Unspecified roles are unresolved until actual source or owner approval establishes them.

INTENTIONAL EXCEPTIONS: solid white QR/Code128 panels with black code output; user artwork/photos; decoration assets; scanner dark background and white controls; fixed export pixels. Theme changes must not tint any of these.

## 3. Typography and language

Source: [ci-theme.ts:13](../../src/constants/ci-theme.ts#L13).

| Role | Font size / line height | Weight |
| --- | --- | --- |
| title | 18 /26 | 800 |
| section | 16 /24 | 700 |
| body | 14 /22 | Existing/default |
| supporting | 12 /18 | 500 |
| button | 14 /22 | 600 |

Font size is RN logical text sizing (commonly described as sp on Android); line height is a logical value that can participate in native text scaling, not a device-pixel guarantee. The roles have no margins, geometry or colors and do not globally override Text.

Manrope is `BememManrope`; Noto Sans Thai is `BememThai`, both bundled locally. Root registration: [_layout.tsx:10](../../src/app/_layout.tsx#L10). `fontForUiText()` selects Noto for a **whole** UI string containing Thai, including mixed Thai/English, without splitting combining marks or normalizing content. This strategy is used by dynamic confirmation text and measured AddCardText labels; it is not a claim that every user-content Text/TextInput is rewritten. Preserve user-entered values and formatting. Source: [ci-theme.ts:26](../../src/constants/ci-theme.ts#L26), [AddCardText.tsx:14](../../src/components/bemem/AddCardText.tsx#L14).

INTENTIONAL EXCEPTIONS:

- Wordmark:24sp,22sp when measured Header width is greater than0 and below320dp; lineHeight30, weight800, letterSpacing−.8, includeFontPadding false. Single line, adjustsFontSizeToFit, minimumFontScale .7, maxFontSizeMultiplier1.15, ellipsizeMode clip. Keep the final dot.
- Canvas number:14/20, weight700, multiplier capped1.3.
- Shared sheet title:18/28; EXP title18/28 weight700.
- Policy body:15/24. Add/Edit action labels:14/20 weight700. Some compact form/footer labels remain10/15; supporting feedback may retain19dp line height.
- Detail number:monospace22/32, weight700, letterSpacing2; EXP11/16, side/status11/17, code label11/17; Detail History label14/20.
- Three-wheel EXP typography and row sizing, card artwork typography and fixed export text remain specialized.

Do not mechanically replace these exceptions with a role that changes approved geometry. Native Thai shaping, clipping and extreme scaling still require device checks for future changes.

## 4. Header: protected eight-slot standard

Source: [EightSlotHeader.tsx:9](../../src/components/bemem/EightSlotHeader.tsx#L9), [HomeHeader.tsx:15](../../src/components/bemem/HomeHeader.tsx#L15), [DecorateMode.tsx:150](../../src/components/bemem/DecorateMode.tsx#L150).

- One row; eight equal logical columns;50dp height/minHeight **below** SafeArea, excluding Status Bar height. Header width100%, maxWidth600dp, centered.
- Brand occupies37.5% (slots1–3), height50, horizontal padding12/4; content height48. Each remaining slot is12.5%×50 with centered content and overflow hidden. No visible column dividers.

| Slot | Home | Create | Decorate |
| --- | --- | --- | --- |
| 1–3 | bemem. | bemem. | bemem. |
| 4 | Empty | Red Back | Red Back |
| 5 | Empty | Empty | Undo |
| 6 | Search | Conditional green Save | Redo |
| 7 | Account/Profile | Add Card | Green Save |
| 8 | Square Canvas selector | Square Canvas selector | Square Canvas selector |

Create Save appears for dirty, editable Create state; busy Save uses a small green spinner in the same target. Back/Search use20dp BememIcon geometry; Add/Save/Undo/Redo use22dp SVG; Account uses24×26dp Native geometry inside an intentional32dp circle. Editor actions remain frameless.

Target is `width:100%, maxWidth:48, height:48` within its own slot. CALCULATED: with usable Header widths360/393/412dp, slot widths are45/49.125/51.5 and action targets are45×48/48×48/48×48. Actual safe-area-constrained parent width is authoritative; do not infer Samsung width from its model or screenshot pixels. Do not overlap hitSlop across slots or add a second row to chase a nominal48dp width.

Home/Create actions use pressed .7 and disabled .45. Create Save exposes busy/disabled and preserves target size. Decorate exposes disabled states (opacity .4), Undo/Redo hints, and Save busy/spinner. Its absent extra pressed styling is a **deferred optional Phase4 item**, not an instruction to alter it now.

Home/Create share the main window. Decorate retains its own native Modal, SafeAreaView, `statusBarTranslucent` and `navigationBarTranslucent`. Keep the approved StatusBar/translucency behavior; do not add measured Status Bar height to the50dp Header. Source: [index.tsx:88](../../src/app/index.tsx#L88), [DecorateMode.tsx:146](../../src/components/bemem/DecorateMode.tsx#L146).

## 5. Canvas selector and destination policy

Source: [CanvasPageGlyph.tsx:7](../../src/components/bemem/CanvasPageGlyph.tsx#L7), [page-popover-geometry.ts:2](../../src/lib/page-popover-geometry.ts#L2), [CanvasPageSelector.tsx:7](../../src/components/bemem/CanvasPageSelector.tsx#L7), [CanvasPagePopoverHost.tsx:15](../../src/components/bemem/CanvasPagePopoverHost.tsx#L15).

- Visible glyph28×28dp, square page outline, radius5, stroke1.8, primary ink, Pearl Gray fill; number14/20 weight700. This supersedes the earlier circular selector.
- Header target follows §4; floating choice targets48×48, vertical target gap4dp, host edge clearance8dp. Maximum four alternatives. Current page excluded. No rectangular popup background.
- List is aligned to the current selector toward the right edge, clamped inside the same-window Host. First target begins at anchor bottom+4. With48dp anchor/target and28dp glyphs, visible-glyph gap is24dp and center distance52dp. These are calculated, not measured device spacing.
- Anchor and Host both use `measureInWindow` in the **same native window**; subtract Host origin once. No extra StatusBar/inset correction. One Host in main, another in Decorate. No additional popup Modal.
- Outside tap/Back dismiss; layout change closes; owner unmount/current-page/eligibility changes invalidate. Sequence/validity guards consume a choice before navigation to reject stale/double taps. No Home horizontal swipe.
- Selector announces current page and expanded/disabled state; alternatives include Locked preview/Read-only labels where applicable. No-alternative state is intentionally disabled without inventing destinations.

Entitlements are defined by [canvas-pages.ts:9](../../src/lib/canvas-pages.ts#L9): page1 editable; Active allows selected pages up to5; Free/Expired retain their existing readable pages and next locked-preview policy. Home offers visible destinations (including preview where allowed). Create/Decorate offer only other currently editable, non-preview editor destinations. Do not change page preservation, expiry rules or introduce subscriptions from these UI controls.

## 6. Button and icon categories

Use existing custom components, not a new icon library. [AddCardIcon.tsx:46](../../src/components/bemem/AddCardIcon.tsx#L46) uses24-unit SVG, fill none, stroke2, rounded caps/joins; default display16dp, with20/22dp local roles. [BememIcon.tsx:4](../../src/components/bemem/BememIcon.tsx#L4) and [AccountIcon.tsx:5](../../src/components/bemem/AccountIcon.tsx#L5) use Native Views. Native Search stroke1.8 and Back stroke2 are not equivalent to an unscaled24-unit SVG stroke2 at every display size.

| Category | Current treatment / target / states |
| --- | --- |
| Frameless Header Action | §4; semantic primary/back/save inks; fixed slot target; current pressed/disabled/busy behavior preserved |
| Square Canvas Selector | §5; no extra pressed recipe currently; expanded/disabled semantics retained |
| Circular Account Control |32dp visual circle within Header target; Account label, expanded/disabled, .7 pressed/.45 disabled |
| Primary Filled CTA | Existing GlassButton action, charcoal fill/white text; min48 unless explicit approved local override; native disabled/busy guard; caller owns loading text/spinner |
| Secondary Action | Utility GlassButton with dark text; existing static glass feedback; e.g. Cancel/Back/Reset |
| Destructive Text Action | Semantic red with secondary placement and explicit confirmation; no filled destructive primary substituted |
| Utility GlassButton | Default min48×48, radius18 unless locally overridden; static highlight/rim/depth; pressed modifies shadow/light, not layout; disabled recipe removes shadow; no mandatory global opacity |
| Dialog Action | §7; flat button, primary safe fill / red destructive text / neutral ink; .8 pressed/.65 disabled |
| Sheet Close Control | Shared Sheet36dp circle +6dp hitSlop with supporting header padding; native guarding; Detail36dp visual inside48dp target; Crop/Scanner48dp target |
| Small Contextual Control | Keep approved local sizes/HitRect; Add rail36+6 per edge; Detail48 target; decoration Delete/Rotate48×48 with8dp gap; compact orientation controls remain exceptions pending evidence |

GlassButton source: [GlassButton.tsx:11](../../src/components/bemem/GlassButton.tsx#L11). `disabled || busy` blocks Pressable; accessibilityState merges caller state and adds disabled/busy. Busy does **not** automatically insert a spinner: Edit provides `Saving...`, Share provides preparation/opening feedback, Header owns its spinner. Selected controls must preserve caller-provided selected state. Do not universally fade action labels, change bounds or apply native blur.

Icon mapping is locked: Delete refined trash; Rotate refined rotation; Edit original standalone pencil; Decorate minimal palette; Policy text-line document without checkmark; Login existing Account/Profile; Add Card refined card-plus. Search/Camera/FrontBack and other approved anchors remain. Source: [DecorateIcon.tsx:5](../../src/components/bemem/DecorateIcon.tsx#L5), [HomeAccountMenu.tsx:65](../../src/components/bemem/HomeAccountMenu.tsx#L65).

## 7. Shared confirmation contract

Source: [ConfirmationDialog.tsx:10](../../src/components/bemem/ConfirmationDialog.tsx#L10). Dialog radius20dp, content padding20, gap12, maxWidth400, outside clearance24, ScrollView-bounded content; primary title18/26, body14/22, label14/22 weight600. Actions have minHeight48, padding12, radius12; safe primary charcoal/white, destructive red text, neutral primary ink. No heavy glass or new X control.

| Approved flow | Actions in current order | Owner / safe dismissal |
| --- | --- | --- |
| Create Exit (Phase1) | Save / Discard / Cancel | [UnsavedChangesDialog.tsx:4](../../src/components/bemem/UnsavedChangesDialog.tsx#L4); dismissal→Cancel |
| Create Page Switch (Phase1) | Save / Discard / Stay | [use-wallet-canvas.ts:108](../../src/hooks/use-wallet-canvas.ts#L108); dismissal→Stay; eligibility may omit Save when writes are forbidden |
| Decorate Exit (Phase1) | Keep Decorating / Discard Changes | [DecorateMode.tsx:103](../../src/components/bemem/DecorateMode.tsx#L103); dismissal keeps draft/session |
| History Bulk Delete (Phase1) | Cancel / Delete Selected Entries | [CardHistorySheet.tsx:91](../../src/components/bemem/CardHistorySheet.tsx#L91); dismissal cancels confirmation |
| Edit Card Delete (Phase1) | Cancel / Delete Card or Delete Card & History | [EditMembershipCardEditor.tsx:66](../../src/components/bemem/EditMembershipCardEditor.tsx#L66); counts/recovery remain caller-owned |
| Add Card Discard (later approved follow-up) | Keep Editing / Discard Changes | [AddCardEditor.tsx:35](../../src/components/bemem/AddCardEditor.tsx#L35); dismissal retains form/images; explicit discard calls original cancel-token/exit path |

The original Phase1 had five flows; Add discard is the sixth approved follow-up, not a claim that Phase1 originally implemented six.

Shared component consumes actions synchronously, guards busy/stale/unmounted callbacks, dismisses keyboard and focuses Title. Back/outside dismissal follows safe caller behavior and is blocked while busy. Async callback exceptions show failure, not success/retry. Callers retain all data mutations, revision/readback rules and Draft ownership. Nothing destructive happens automatically.

Nested Sheet/Decorate confirmations use `presentation="inline"` in the existing window with the established overlay and accessibility masking; do not add a competing native Modal. AddCardSheet routes Android Back to its `confirmation.onRequestClose` while active. Do not migrate unrelated native Alerts merely because this component exists.

## 8. Sheets, modals and Pearl Gray Detail

Presentation recipes: [sheet-visual.ts:5](../../src/constants/sheet-visual.ts#L5). Sheet shadow `0 -6px 28px -10px #293e4838`; Detail control shadow `0 1px 2px #293e4821`. These are restrained current recipes, not a requirement to add shadow to every surface.

| Context | Current geometry / ownership |
| --- | --- |
| Add/Edit; Policy/Login; Share; History | Shared [AddCardSheet.tsx:14](../../src/components/bemem/AddCardSheet.tsx#L14): top radius22, content padding20, maxHeight92%; title18/28, header marginBottom10, padded close hit area; footer marginTop12/gap4 |
| Normal sheet content | Header/form/footer share ScrollView; keyboard taps handled; keyboard dismiss on drag; existing iOS padding / Android height KeyboardAvoidingView |
| Share | Same owner, fixed-footer92% variant; Preview First; one Share CTA; exact PNG preview and capture independent of outer sheet styling |
| History list | Same owner, virtualized92% variant; FlatList retains layout/selection; footer ScrollView capped40%; entry/detail screens use their existing variant |
| Membership Coming Soon | [LockedCanvas.tsx:8](../../src/components/bemem/LockedCanvas.tsx#L8): separate existing Modal, radius24, padding24/gap16, close48 at top/right16; title18/26, body14/22; no new billing |
| EXP | [ExpirationDatePicker.tsx:114](../../src/components/bemem/ExpirationDatePicker.tsx#L114): separate Modal, maxHeight96%, maxWidth600, radius24, padding16/gap12; title18/28 weight700; three-wheel rowHeight=max(48,ceil(40×fontScale+12)), snapping/date logic unchanged |
| Membership Detail | [MembershipCardDetail.tsx:157](../../src/components/bemem/MembershipCardDetail.tsx#L157): separate Modal, maxHeight92%, maxWidth600, radius24; paddingTop20, header paddingHorizontal20/marginBottom16; content horizontal/bottom20/gap8; controls36 inside48 targets |

AddCardSheet uses SafeAreaView and its existing Android/iOS keyboard strategy. Detail/EXP retain translucent status/navigation-bar props and SafeAreaView. Membership retains its own existing Modal defaults; do not force those props onto it. Decorate's window configuration remains §4. Never add duplicate backdrop handlers, system-bar offsets or Back listeners merely to reuse visual styles.

APPROVED CURRENT STANDARD — OptionB Detail chrome mapping:

| Historical outer UI | Current outer UI |
| --- | --- |
| Sheet `#f4f4fa` | Pearl Gray `#eceff1` |
| Supporting controls `#f4f4f9` | Elevated `#fafcfd` |
| Primary text `#10121c` | `#263943` |
| Supporting text `#596577` | `#4c606c` |

This mapping applies only to surrounding UI chrome/suitable controls. Code panel stays solid white, black label/output, radius20, horizontal padding4 and existing code-region layout. Front/Back, code toggle/Swipe, Full View, Share and Photo Journal entry retain placement/behavior. It does not authorize any change to card geometry, artwork, photos, code modules/quiet zone, exported pixels or crop. Do not normalize all sheets to one height/footer/animation.

## 9. Protected card, canvas and image contracts

Source: [card-size-presets.ts:5](../../src/lib/card-size-presets.ts#L5), [card-geometry.ts:2](../../src/lib/card-geometry.ts#L2), [canvas-layout.ts:5](../../src/lib/canvas-layout.ts#L5), [card-appearance.ts:1](../../src/constants/card-appearance.ts#L1).

| Preset ID | Full logical footprint |
| --- | --- |
| mini-landscape |3×2 |
| card-landscape |6×4 |
| voucher-landscape |7×3 |
| boarding-pass-landscape |8×4 |
| mini-portrait |2×3 |
| card-portrait |4×6 |
| vaccine-passport-portrait |5×7 |

- Twelve equal square-block columns. Card radius is a **fixed14dp**, independent of footprint, fontScale or PixelRatio. No new clamp formula.
- Paint inset is **.1 Block on every side**: paintWidth=(widthBlocks−.2)×unit; paintHeight=(heightBlocks−.2)×unit. Collision reserves the full integer-block footprint, not the inset paint rectangle.
- Current Canvas viewport has horizontal margins16/top margin12. Square unit=usable Canvas width/12. Full rectangles, integer positions and no overlap remain protected. Default production compatibility/placement limit remains240 rows; DEV Sandbox/search projections can use explicit Infinity. Do not confuse those contexts with approval to expand the Production limit. Source: [wallet-production-policy.ts:9](../../src/lib/wallet-production-policy.ts#L9), [WalletCanvas.tsx:171](../../src/components/bemem/WalletCanvas.tsx#L171).
- Stored widthBlocks/heightBlocks and preset must agree. Legacy cards without new dimensions resolve in memory to6×4 landscape or4×6 portrait, without rewriting stored data. Source: [wallet-validation.ts:85](../../src/lib/wallet-validation.ts#L85).
- Detail reads stored dimensions through the existing resolver. Its base Block Unit follows capped600dp Create width minus32dp margins; one common fit scale based on the widest preset keeps relative sizes, rather than expanding every card to the same width. Radius stays14dp. Source: [card-detail-layout.ts:11](../../src/lib/card-detail-layout.ts#L11).
- Five pages retain item-ID assignments and page-local logical positions; absent assignment means page1. No cross-page movement/repacking is implied by CI. Preserve Saved/Draft isolation, Search presentation and current automatic placement.
- Decoration tiles reserve1×1 Block with zero card paint inset, keep stored rotation in90° steps and page assignment. Six collections/270 assets and drawer8×3 remain protected. Picker gap2/padding8, cell=(measuredWidth−30)/8; rowHeight=max(32,min(cell,(measuredWidth−30)/12+4)). This documents current geometry, not a new48dp target promise. Source: [decoration-pagination.ts:25](../../src/lib/decoration-pagination.ts#L25).
- Card/Artwork masks use shared radius14 and overflow clipping; do not distort/crop images as a CI change. Existing WYSIWYG crop source/adjustment/rendering must agree. Source: [CardArtworkImage.tsx:9](../../src/components/bemem/CardArtworkImage.tsx#L9), [CardAppearancePreview.tsx:44](../../src/components/bemem/CardAppearancePreview.tsx#L44).
- Share captures the existing CardShareSurface without new width/height resampling, then shows the exact prepared PNG. Keep source-image checks, dimensions and code module fidelity. Source: [ShareCardSheet.tsx:75](../../src/components/bemem/ShareCardSheet.tsx#L75), [CardShareSurface.tsx](../../src/components/bemem/CardShareSurface.tsx).
- QR/Code128 use the existing offline encoder path and exact number/payload handling. Preserve leading zeros, spaces and case; do not fabricate demo codes or recolor/blur code output. Code Detail eligibility and quiet-zone/layout controls remain specialized. Source: [CardCodeView.tsx](../../src/components/bemem/CardCodeView.tsx), [card-code.ts](../../src/lib/card-code.ts), [card-detail-controls.ts](../../src/lib/card-detail-controls.ts).

## 10. Historical compatibility and deferred work

[CURRENT-TOKEN-MAPPING.md](CURRENT-TOKEN-MAPPING.md) records consumed token paths and superseded values. The historical rc2 `TOKENS.json` is **still runtime-consumed**; do not rewrite it to resemble this document. Its metadata and some geometry declarations remain outdated. Runtime colors/materials and compatibility aliases are preserved; document/source mismatch is not authorization to migrate them.

Earlier [MASTER.md](MASTER.md), [IMPLEMENTATION.md](IMPLEMENTATION.md), rc1 and v1 documents are history. Old Create/CreatePRO Header examples,70dp Header,30sp wordmark,23dp card radius, bottom Create Save, circular selector, fixed Create label and demo-only Add restrictions do not override current production. Root CI reports describe their writing-time approval state; this document records the owner's newer acceptance statement.

| Deferred item | Classification / next action |
| --- | --- |
| Phase4 pressed feedback on some Decorate/Detail/popup controls | OPTIONAL POLISH; audited, **not implemented or newly Samsung-approved** |
| Drawer target sizes below a nominal48dp in representative layouts | CALCULATED POTENTIAL ISSUE; owner reports normal operation; require Samsung evidence before geometry work |
| Orientation target measurement | POTENTIAL ISSUE / REQUIRES SAMSUNG VALIDATION; current minHeight32/36 alone is not a device measurement |
| TalkBack Sticker Select→Place | POTENTIAL ACCESSIBILITY ISSUE; actual successful/blocked use needs device verification |
| Popup/sheet focus handoff and restoration | REQUIRES SAMSUNG VALIDATION; missing explicit focus code does not alone prove native failure |
| Obsolete Empty Wallet Phase1 demo-only copy | CONFIRMED STALE COPY; separate copy approval, do not silently edit here |
| Remaining independent native Alerts | KNOWN LOCAL PRESENTATIONS; migration not approved merely for uniformity; preserve Edit reinspection/resize and recovery semantics |
| Real Login, billing, subscriptions, Cloud, Theme Picker | FUTURE / NOT YET IMPLEMENTED; placeholder/access simulations are not service availability |

For future implementation, start with [BEMEM-CI-DEVELOPER-GUIDE.md](BEMEM-CI-DEVELOPER-GUIDE.md). No deferred item above is an instruction to implement it automatically.

## 11. Evidence and validation boundary

Important implementation history: [Phase1](../../CI-CONFIRMATION-PHASE1.md), [Phase2](../../CI-TYPOGRAPHY-COLOR-PHASE2.md), [Phase3](../../CI-SHEETS-MODALS-PHASE3.md), [Add discard repair](../../ADD-CARD-DISCARD-CONFIRMATION-REPAIR.md), [Header refinement](../../HEADER-UX-REFINEMENT.md), [Home Swipe removal](../../HOME-SWIPE-REMOVAL.md). The Phase4 audit was delivered in the conversation; no new local Phase4 implementation is implied.

Values and referenced paths were checked against current source. Representative-width calculations and automated tests from prior implementation reports do not establish native hit regions, font rasterization, TalkBack focus or scanner performance. This phase has no runtime change and no new device acceptance or build result. Meaningful future visual changes require source checks, appropriate automated regression and Samsung acceptance.
