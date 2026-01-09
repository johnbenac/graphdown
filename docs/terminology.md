# Terminology and Glossary

This glossary defines canonical terms used in Graphdown documentation and code.
When writing docs, avoid ambiguous terms (especially “graph”) unless qualified.

## Standard terms (from SPEC.md)

These are the terms used by the Graphdown Standard (see `SPEC.md`, §3).

### Dataset
A repository (or repository-like snapshot) of files containing Graphdown record files and optional block store files.

### Record file
A Markdown file discovered by content per **LAYOUT-001**:
- ends with `.md`
- begins with YAML front matter at byte 0 (`---` + line break)
- YAML contains a `typeId` key

### Type object
A record file whose YAML defines a type per **FR-MD-021**:
- `typeId` (string)
- `fields` (object)
- MUST NOT define `recordId` or `parent`
- MUST NOT define any other top-level keys

### Record object
A record file whose YAML defines a record instance per **FR-MD-023**:
- `typeId` (string)
- `recordId` (string)
- `fields` (object)
- optional `parent` (string record reference, or null)

### typeId
Stable identifier for a type object.

### recordId
Stable identifier for a record object within its type.

### recordKey (computed)
The globally unique record identity string:
`recordKey = typeId:recordId`

Core treats `recordKey` as computed and MUST NOT store it as a separate YAML field.

### Record reference
A string equal to a `recordKey` (`typeId:recordId`), used inside wiki-links.

### Wiki-link
Obsidian-style token `[[...]]`. For record relationships, the inner text is a record reference: `[[typeId:recordId]]` (REL-001).

### Block store
Reserved directory layout for raw bytes per **BLOCK-LAYOUT-001**:
`blocks/sha2-256/<p>/<cid>`

### Block reference
A wiki-link token that points at block content (CID-REF-001):
`[[<cid>]]`

## Implementation terms (this repository)

These terms describe the TypeScript structures and derived views built from a dataset snapshot.

### DatasetSnapshot
In-memory representation of files:
`{ files: Map<string, Uint8Array> }`

A snapshot may contain non-record files. Core semantics ignore non-record and non-block-store files (BLOCK-LAYOUT-003), but snapshots can still carry them for whole-snapshot export.

### ParsedTypeObject / ParsedRecordObject
Structured objects produced by `discoverGraphdownObjects()` from `parse/datasetObjects.ts`.

These represent type objects and record objects extracted from record files.

### Record Link
A directed relationship edge implied by a record wiki-link token `[[typeId:recordId]]` found in:
- record body, or
- any string value anywhere inside record `fields` (nested arrays/objects included)

This matches **REL-002** and is implemented by `parse/wikiRefs.ts` and `graph/graph.ts`.

### Record Link Graph
The directed graph induced by Record Links.

- Nodes: record objects (by `recordKey`)
- Edges: `sourceRecordKey -> targetRecordKey` for each extracted link

Important properties:
- The Record Link Graph may contain cycles.
- Links may be unresolved/dangling (NR-LINK-001), and dangling links still appear as edges in extracted adjacency.

### Record Hierarchy
The parent-pointer structure defined by record YAML `parent` (HIER-001):

- Each record has at most one parent.
- The structure MUST be acyclic and parents MUST resolve (VAL-PARENT-002/003).
- Valid datasets produce a forest (a set of rooted trees).

The Record Hierarchy is **structural** and MUST NOT be inferred from wiki-links.

### Type Composition Dependencies
Type-level dependency declarations from `fields.composition` (TYPE-COMP-001):

- Nodes: types (`typeId`)
- Edges: `typeId -> componentTypeId` with attribute `required: boolean`

Composition constraints are validated using Record Links:
required components must be satisfied by outgoing record links to existing records of the required type (VAL-COMP-002).

### Block Dependency Graph
Record→block edges implied by block references extracted from record body/fields.

- Nodes: records + block CIDs
- Edges: `recordKey -> cid`

Validation requires referenced blocks exist and match digest (VAL-BLOCK-001/002).

### Canonical Record-Only Layout
The deterministic directory layout described by **EXP-HIER-001** and produced by `canonicalizeDatasetSnapshot()`:

- Type objects exported to: `types/<typeId>.md`
- Record objects exported under `records/` with nesting derived solely from `parent` pointers

This is a path/layout concept. It is not a “graph” of relationships; it is a deterministic filesystem representation derived from identities + hierarchy.

### Graph Cache (Persisted Record Link Graph Cache)
The serialized adjacency/index stored by the persistence layer (`persistence/serializeRecordLinkGraphCache.ts`).

It exists for performance so the UI can rehydrate quickly without rebuilding the Record Link Graph from the snapshot every load.

## Writing rules

- Do not say “graph” by itself. Say:
  - “Record Link Graph”
  - “Record Hierarchy”
  - “Type Composition Dependencies”
  - “Block Dependency Graph”
  - “Canonical Layout (filesystem tree)”

- Use `recordKey` when you mean a global record identity string (`typeId:recordId`).
- Use `recordId` only when you mean the within-type identifier.
