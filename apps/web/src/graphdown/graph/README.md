# Graph utilities

`graph/` builds a link graph from parsed Graphdown datasets. The graph is used
by the UI to look up types/records and render relationships.

## Key exports

- `buildGraphFromSnapshot` (`graph.ts`)
  - Parses a `DatasetSnapshot` and returns either a `Graph` or validation
    errors.
  - Builds `typesById`, `recordsByKey`, and per-record incoming/outgoing link
    sets by scanning record fields and markdown bodies.
  - Filters out blob references (`gdblob:sha256-...`) when computing links.
- `Graph` interface
  - Provides lookup helpers for types and records plus sorted link lists.

## Usage notes

- Graph building depends on parsing rules from `parse/` and validation error
  shapes from `validate/`.
- Link extraction operates on *all* string values in fields and body text, so
  nested objects/arrays are traversed recursively.
