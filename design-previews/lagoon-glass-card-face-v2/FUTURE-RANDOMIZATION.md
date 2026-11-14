# Proposed Add Card artwork selection — documentation only

No behavior described here is implemented in production by this design task.

1. When a **new Add Card session is explicitly created**, choose one of the seven approved local artwork IDs once. The palette still needs visual approval.
2. Store that choice in the existing form/session draft state. Do not choose in a component render, effect that reruns on focus, preview resize, orientation change, keyboard event or field change.
3. Keep the selection stable through that session and its ordinary draft lifecycle. Confirm the intended discard/reopen semantics before runtime implementation.
4. A user-selected photograph has priority. Existing front/back artwork, image crop and photo references must never be replaced by a random default. Do not overwrite the other side implicitly.
5. Edit opens the artwork already associated with that card. Opening Home, Create, Detail or a saved card must never rerandomize it.
6. Choosing the initial face must not change name, exact membership/code text, EXP, size/preset, page, coordinates or unrelated fields. Persist only through the existing authorized Wallet v2 single writer and readback flow in a future approved phase.
7. Older cards retain their current appearances and IDs. No blanket migration, backfill, photo replacement or randomization on app startup.

Before implementation: approve the artwork palette, map stable IDs onto the existing appearance/image model without duplicate fields, decide default-art replacement/undo behavior, test label contrast over actual crops, and verify the selected photo always wins. No schema or persistence changes are authorized here.
