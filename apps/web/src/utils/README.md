# Utilities

Small helpers that are specific to the web UI (as opposed to core dataset logic)
are placed in this directory.

## Wiki link helpers

- `wikiRefStrings.ts`
  - `readRef` and `readRefs` normalize references from UI inputs, supporting
    raw strings or string arrays.
  - `writeRef` and `writeRefs` format record relationships as `[[typeId:recordId]]`
    (recordKey) and block references as `[[<cid>]]`.
  - Uses `@graphdown/core` export `cleanId` to keep normalization
    behavior consistent with dataset parsing.

## Tests

- `wikiRefStrings.unit.test.ts` covers ref parsing and serialization behavior.
