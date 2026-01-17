# Utilities

Small helpers that are specific to the web UI (as opposed to core dataset logic)
are placed in this directory.

## Wiki link helpers

- `wikiRefStrings.ts`
  - `readRef` and `readRefs` normalize references from UI inputs, supporting
    raw strings or `{ ref }` / `{ refs }` shapes.
  - `writeRef` and `writeRefs` format IDs as wiki-link tokens:
    - record relationships: `[[typeId:recordId]]` (recordKey)
    - block references: `[[<cid>]]`
  - Uses `@graphdown/core` exports (`cleanId`, `isObject`) to keep normalization
    behavior consistent with dataset parsing.

## Tests

- `wikiRefStrings.unit.test.ts` covers ref parsing and serialization behavior.
