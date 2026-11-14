# bemem Design System — start here

The current production identity is **Pearl Gray — Lagoon Glass**. Approved uncommitted working-tree code is newer than historical Git HEAD and early design proposals.

1. [Current-approved master CI specification](bemem-lagoon-glass-rc2/BEMEM-CI-CURRENT-APPROVED.md) — the single authoritative design reference.
2. [Semantic token / historical mapping](bemem-lagoon-glass-rc2/CURRENT-TOKEN-MAPPING.md) — actual runtime consumption, superseded values and unresolved compatibility declarations.
3. [Developer guide](bemem-lagoon-glass-rc2/BEMEM-CI-DEVELOPER-GUIDE.md) — concise workflow and component checklist.

## Preserved history — not current production instructions

- [Original bemem v1](bemem/MASTER.md)
- [Lagoon Glass rc1](bemem-lagoon-glass/MASTER.md)
- [Early rc2 visual implementation](bemem-lagoon-glass-rc2/MASTER.md)
- [Early rc2 review notes](bemem-lagoon-glass-rc2/IMPLEMENTATION.md)

Historical documents retain their original text. Their obsolete geometry, navigation, feature restrictions and writing-time approval status do not override the current-approved master.

**Runtime safety:** [rc2 TOKENS.json](bemem-lagoon-glass-rc2/TOKENS.json) is still imported by the app. It contains both live values and historical declarations. It was not rewritten in CI Phase5; consult the mapping before proposing any token edit. Documentation revision does not change the runtime theme version or Wallet schema.

CI1–3 and Add-discard acceptance were reported by the owner. CI4 optional interaction work remains deferred; CI5 is documentation-only, with no new Samsung test implied.
