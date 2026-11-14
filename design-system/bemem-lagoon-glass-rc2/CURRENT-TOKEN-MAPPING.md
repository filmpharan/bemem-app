# Current-approved token mapping and runtime safety

Companion to [the authoritative master](BEMEM-CI-CURRENT-APPROVED.md). This document maps existing declarations; it is not an importable theme or second token architecture. Current colors and typography are defined once in master §§2–3.

## File classification for Phase5

| Category | File(s) | Phase5 action |
| --- | --- | --- |
| A — documentation only | Current master, this mapping, developer guide, design-system README, historical Markdown entry notices | Create/update only these documents |
| B — non-runtime design metadata | No JSON metadata selected for change | No changes required |
| C — runtime-consumed tokens/theme/configuration | rc2 TOKENS.json; src/constants/lagoon-theme.ts, bemem-theme.ts, ci-theme.ts, sheet-visual.ts; production geometry/components | **Unchanged**; no renamed keys, values, aliases or runtime import changes |

The entire rc2 JSON is imported by [lagoon-theme.ts:1](../../src/constants/lagoon-theme.ts#L1). The adapter reads `metadata.defaultThemeId`, exports palettes, tokens and core, and exposes existing font aliases. Therefore even historical-looking metadata is not edited speculatively. `schemaVersion:1` here describes a design-token contract, **not WalletDocument schemaVersion2**.

## Actual consumption chain

| Existing source | Consumer / consequence |
| --- | --- |
| TOKENS.json metadata.defaultThemeId and palettes | lagoon-theme palette selection; current default pearl-gray; all six palette IDs retained |
| Palette canvas/text/action/surface/rim/highlight/shadow/grid | lagoon adapter and current components; not all consumers use ciColors yet |
| semantic.status.error / success | ci-theme error/back/discard/destructive and success roles; Save keeps its separate approved green |
| core.materials and core.radius.utility | [GlassButton.tsx:11](../../src/components/bemem/GlassButton.tsx#L11): materials, default radius and light/shadow; preserve live values |
| core.geometry.fab and actionRail.horizontalInset | [CanvasActions.tsx:19](../../src/components/bemem/CanvasActions.tsx#L19): current Home-empty FAB;56×56/radius22, rail inset20; these historical-file values are still live here |
| core.radius.card | [bemem-theme.ts:13](../../src/constants/bemem-theme.ts#L13) still exports compatibility alias `bemem.radius`=23; no `bemem.radius` production usage found in current src search. Keep alias, do not use it for new cards |
| ciColors / ciTypography / ciStates | Current semantic/type/state aliases; no global Text override; authoritative UI roles in master |
| sheetVisual | Local shared presentation colors/scrim/rim/shadows; no modal ownership or sizing |
| Component-owned geometry | EightSlotHeader, PAGE_POPOVER, addCardLayout, CARD_CORNER_RADIUS, card-size-presets and card-geometry override obsolete examples by explicit current implementation |

The JSON's `core.typography`, `core.geometry.header`, `core.geometry.card`, and historical Component examples are not the authority for today's corresponding geometry. This observation does not make the entire JSON safe to replace. No compatibility export was deleted and no import migration was attempted.

## Historical → approved current mapping

| Historical declaration/example | Current authority | Status |
| --- | --- | --- |
| core.geometry.header.heightMin=70 | [EightSlotHeader.tsx:25](../../src/components/bemem/EightSlotHeader.tsx#L25):height/minHeight50 | SUPERSEDED Header geometry |
| core.typography.styles.wordmark.fontSize=30 | Same component:24;22 below measured320dp; bounded fitting | SUPERSEDED wordmark sizing |
| core.radius.card=23 / core.geometry.card.borderRadius=23 | [card-appearance.ts:5](../../src/constants/card-appearance.ts#L5):CARD_CORNER_RADIUS14 | SUPERSEDED card rendering rule; alias retained |
| Bottom floating Create Save / old Save geometry | [HomeHeader.tsx:20](../../src/components/bemem/HomeHeader.tsx#L20):conditional green Save in slot6 | SUPERSEDED placement; do not change Home-empty FAB |
| Circular numbered Canvas selector | [CanvasPageGlyph.tsx:13](../../src/components/bemem/CanvasPageGlyph.tsx#L13):28dp square/radius5 | SUPERSEDED selector shape |
| Home Search+Create; Create Back+CreatePRO | Master §4 current Home/Create/Decorate slot table | SUPERSEDED Header/navigation example |
| Lagoon Mint default in rc1 | rc2 metadata.defaultThemeId=pearl-gray | SUPERSEDED default; other palettes preserved |
| Lavender Card Detail chrome | Master §8 OptionB mapping | SUPERSEDED chrome only; card/code/export unchanged |
| Demo-only Add Card restriction / coming-in-future copy | Current production Add/Edit and existing Wallet owner; stale empty copy explicitly deferred | HISTORICAL restriction; do not remove live safety gates |
| rc2 metadata status=implementation-awaiting-android-review and old adoption text | Owner's latest CI1–3/Add-discard acceptance recorded in master §1 | HISTORICAL metadata discrepancy, JSON left unchanged |

No new master JSON was created or wired into runtime. The master maps specification names such as `overlay.confirmation` to actual local styles rather than pretending those exports already exist.

## Units and boundaries

- RN dimensions are logical units, not screenshot/image pixels. Do not multiply14dp radius or Header50 by PixelRatio.
- Theme metadata versions, documentation revisions and Wallet schemas are separate contracts.
- Historical visual examples cannot authorize Storage migration, entitlement changes, resizing, image recoloring or new release-gate activation.
- Any future token cleanup that could affect runtime needs separate explicit approval, import/consumer analysis and regression/device validation. Preserve all currently approved uncommitted work.
