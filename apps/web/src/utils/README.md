# Utilities

Small helpers that are specific to the web UI (as opposed to core dataset logic)
are placed in this directory.

## Wiki link helpers

- `wikiRefStrings.ts`
  - `readRef` and `readRefs` normalize references from UI inputs, supporting
    raw strings.
  - `writeRef` and `writeRefs` format IDs as wiki-link tokens for display or
    serialization.
  - Record relationships use `[[typeId:recordId]]` (recordKey).
  - Block references use `[[<cid>]]` (CIDv1 strings).
  - Uses the `@graphdown/core` `cleanId` helper to keep normalization behavior
    consistent with dataset parsing.

## Tests

- `wikiRefStrings.unit.test.ts` covers ref parsing and serialization behavior.
