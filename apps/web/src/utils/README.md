# Utilities

Small helpers that are specific to the web UI (as opposed to core dataset logic)
are placed in this directory.

## Wiki link helpers

- `wikiLinks.ts`
  - `readRef` and `readRefs` normalize references from UI inputs, supporting
    raw strings or `{ ref }` / `{ refs }` shapes.
  - `writeRef` and `writeRefs` format IDs as wiki-link tokens (`[[id]]`) for
    display or serialization.
  - Uses `graphdown/model/ids.cleanId` and `graphdown/model/types.isObject` to
    keep normalization behavior consistent with dataset parsing.

## Tests

- `wikiLinks.test.ts` covers ref parsing and serialization behavior.
