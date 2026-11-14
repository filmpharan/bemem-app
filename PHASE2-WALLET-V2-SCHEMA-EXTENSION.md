# Safe Wallet Schema v2 extension

Status: schema/validation preparation only. No runtime activation, device import,
cutover, production writer change or real Add Card Save.

## Audit and scope

Reviewed MembershipCard/WalletDocument, Add Card form/presentation, size definitions,
validator/JSON decoder, v1 memory migration, repository serializer/readback, storage
adapters, coordinator/runtime bundle cloning and collision checks.

The existing repository already validates before serialization and validates both
pending/final readback. Its JSON.stringify/decode path needs no replacement.
Migration stays a pure legacy-reader conversion; coordinator cloning already calls
the same validator. None of their transaction/admission/import protocols changed.

## Actual persisted shape

WalletDocument remains `schemaVersion:2`, dataset `bemem-wallet`. Required root
fields, card kind/ID/name/memberNumber/payload/format/orientation, imageAssetId,
createdAt/updatedAt, layout positions, revision and savedAt keep their meanings.

The following are permitted extensions on **membership** cards:

| Field | Type / rules | Existing form source |
| --- | --- | --- |
| sizePresetId | One of7 existing CardSizePresetId values | CardPresentationDraft.sizePresetId |
| widthBlocks | Positive safe integer, <=12, exact preset width | CARD_SIZE_PRESETS.ratioWidth |
| heightBlocks | Positive safe integer, exact preset height | CARD_SIZE_PRESETS.ratioHeight |
| country | `TH` only, the currently supported country | CardPresentationDraft.country |
| brandId | Existing catalogue ID or null | CardPresentationDraft.brandId |
| brandQuery | Exact string, including empty/custom text; no trimming | CardPresentationDraft.brandQuery |
| expiryMonth | Empty string or YYYY-MM, year not0000 | CardPresentationDraft.expiryMonth |
| appearance.gradientPresetId | Existing rendered gradient ID or null | Existing brand artwork preset |

Example (synthetic data only):

```json
{
  "kind": "membership",
  "id": "synthetic-new",
  "name": "Synthetic Club",
  "memberNumber": " 000Ab c ",
  "payload": " 000Ab c ",
  "preferredDisplayFormat": "qr",
  "orientation": "landscape",
  "sizePresetId": "mini-landscape",
  "widthBlocks": 3,
  "heightBlocks": 2,
  "country": "TH",
  "brandId": "ptt",
  "brandQuery": "",
  "expiryMonth": "2028-12",
  "appearance": {
    "backgroundColor": "#405764",
    "textColor": "#ffffff",
    "imageAssetId": null,
    "gradientPresetId": "ptt"
  },
  "createdAt": "2026-11-07T00:00:00.000Z",
  "updatedAt": "2026-11-07T00:00:00.000Z"
}
```

Brand IDs are `seven`, `the1`, `ptt`, `mcard`, `lotus`, `bigc`, derived from the existing
WEB_BRANDS catalogue. Gradient IDs are `seven`, `the1`, `ptt`, `lotus` or null; MCard
and BigC have no rendered gradient in the existing catalogue and are not invented.
Brand text is independent from card name and retained exactly. It is not forced to
equal a catalogue label: the existing default has PTT artwork/ID with empty brand
query, and custom brand text is allowed. Gradient is appearance data, not inferred
or changed automatically from brand/country/theme.

Expiration uses the existing expiryMonthError function, not a new date convention.
Null, dates with days/times, padded strings and invalid months are rejected. No
timezone conversion or normalization is performed.

## Read compatibility versus strict creation

- `validateWalletCard` and `validateWalletDocument` remain legacy-compatible readers.
  Their optional allowlists accept only the named extensions. Unknown fields at
  document/card/appearance/position levels still fail.
- Legacy cards do not need new fields. The reader does not add defaults, dimensions,
  country, brand, expiry or gradient to them. Absence stays absent when decoded.
- Size fields are an all-or-none triple. Any partial triple, undefined value,
  mismatched preset/dimensions/orientation or custom size is rejected.
- Other optional metadata may appear individually on a compatible read. If present
  it must pass its exact type/value validation; the reader does not invent missing
  metadata. This supports legacy-shaped cards without forcing an enrichment step.
- New `validateNewMembershipCard()` is the explicit strict creation entry point.
  It requires every listed extension, including gradientPresetId (nullable) and
  expiryMonth (empty when unused), in addition to all previous required fields.
  `NewMembershipCard` exposes that stricter TypeScript shape.
- Current Add Card UI and prepareCardForm are not integrated or changed. A future
  production form adapter must assemble these details and call the strict new-card
  path. Passing only the old prepareCardForm.card would omit data and is not approved.
- Demo cards retain their original strict shape. They cannot gain member payloads
  or be converted into memberships by adding extension fields.

Backward compatibility is **new reader -> old v2 snapshots**. Old application builds
with the original strict allowlist will not understand extended snapshots. No schema
version is silently bumped; downgrade/forward compatibility must be considered before
production adoption. Device data has not been rewritten to the extended shape.

## Footprint and collision

`resolveWalletCardFootprint()` operates only in memory on validated card data:

- Extended membership: validate ID + positive integer dimensions against the single
  existing preset catalogue and check orientation; return that full footprint.
- Legacy membership/demo: resolve the original orientation rule (landscape6×4,
  portrait4×6). Do not add the resolved dimensions to the card or persisted file.

Document validation uses these full rectangles for12-column bounds, integer/safe
coordinates and overlap checks. It never uses0.1-block paint inset or card radius.
Mixed legacy/new snapshots therefore preserve the legacy rectangles while permitting
the correct3×2/2×3/etc dimensions on new cards.

The unmounted display projection copies sizePresetId only when present, allowing its
existing shared search/geometry helper to use the same validated footprint. It still
excludes member payload/number. Saved/Draft and owner-bundle clones preserve all
extensions through existing validation; no provider/runtime was mounted.

### The240-row distinction

Production Phase1 v1 uses the240-row validator and compatibility gates; those files
and limits are unchanged. The existing unmounted **v2 document validator already
accepted row300** and other safe integer rows before this task. Its numeric safety
contract remains unchanged; imposing240 on legacy v2 reads now would break the
requested compatibility. No production ceiling was removed or runtime switched.

## Tests

- TypeScript passed.
- Read-only lint60 source files,0 errors/0 warnings; no dependencies installed.
- All automated tests250/250 passed;23 new schema-extension tests.
- New coverage:7 presets; legacy shape/absence/immutability; explicit strict creation;
  partial/mismatched/invalid dimensions; country/brand/gradient allowlists; current
  expiry format; unknown fields; exact payload/member/image/metadata preservation;
  mixed full-block collisions; bounds; old row policy; JSON round-trip; existing
  repository save/readback/restart using an in-memory filesystem; unchanged old
  committed bytes; pure v1 demo migration; real form-name mapping with synthetic
  values; owner clone/Saved-Draft separation and size-aware search projection.
- Android bundle exported offline to `.expo/wallet-v2-schema-extension-review` with
  bytecode disabled for review. This is not a Samsung filesystem/save/cutover test.
- Protected source hashes before/after match: existing UI, Sandbox,14dp radius,
  0.1-block inset, storage/repository/transaction code, coordinator, production startup,
  v1 reader/writer, migration/import lock, theme and original website source unchanged.

## Files

1. `src/types/membership-card.ts`
2. `src/lib/wallet-validation.ts`
3. `src/lib/wallet-preparation.ts` (unmounted display DTO only)
4. `scripts/test-wallet-schema-extension.cjs` (new)
5. This report

No parallel schema, repository, serializer or Grid Engine was introduced. No actual
Wallet files were opened for these tests. No commit, push, deploy, migration or
Samsung data change.

## Next approvals/integration work

1. Implement an explicit form-to-new-card adapter including dimensions, metadata
   and actual gradient/null selection. Do not serialize UI-only side state or drop
   supported fields. Keep any future image references local and durable.
2. Connect the existing single owner/coordinator and typed Saved/Draft bundle,
   retaining save admission, revision/pending/conflict/uncertain handling.
3. Resolve legacy startup/import consent and readback verification before any device
   cutover; Import remains locked now. Old v1 must never be overwritten or used as
   a second writer after v2 activation.
4. Approve coherent dynamic-row compatibility gates for real runtime separately.
5. Test Add Draft/Discard/Cancel/Save/restart and physical Samsung readback only after
   those changes are explicitly authorized. No real Save is enabled by this schema task.

Stop here and await approval for the next step.
