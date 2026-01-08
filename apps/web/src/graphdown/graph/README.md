# Record Link Graph utilities

`graph/` builds the **Record Link Graph** from parsed Graphdown datasets.

This graph is used by the UI for:
- looking up type/record nodes by identity
- rendering incoming/outgoing wiki-link relationships between records

## What this graph represents

**Record Link Graph**
- Nodes: type objects and record objects (for lookup convenience)
- Relationship edges: record -> record only
- Edge source: wiki-link tokens `[[typeId:recordId]]` extracted from:
  - record body
  - any string anywhere inside record `fields` (nested arrays/objects included)

Blob references (`[[gdblob:sha256-...]]`) are excluded from record relationships.

## What this graph does NOT represent

This module does **not** encode:
- the **Record Hierarchy** defined by `parent:` pointers (see validation + canonicalization)
- **Type Composition Dependencies** (`fields.composition`) or composition satisfaction
- blob integrity or reachable blob sets

Those are handled in `validate/` and `snapshot/`.

## Key exports

- `buildRecordLinkGraphFromSnapshot` (`graph.ts`)
  - Parses a `DatasetSnapshot` and returns either a graph index or validation errors.
  - Builds:
    - `typesById`
    - `recordsByKey`
    - `nodesByIdentity`
    - per-record incoming/outgoing record link sets

- `RecordLinkGraph` interface
  - Lookup helpers for types/records
  - Sorted incoming/outgoing link lists

## Related modules

- Link parsing: `parse/wikiRefs.ts`
- Dataset parsing: `parse/datasetObjects.ts`
- Validity rules: `validate/validateDatasetSnapshot.ts`
