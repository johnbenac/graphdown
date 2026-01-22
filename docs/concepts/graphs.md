# Graphs in Graphdown

This repository contains several distinct “graph-like” structures.
They are related, but not interchangeable.

This document names each one precisely and points at the code that builds or validates it.

## 1) Record Link Graph (wiki-link relationships)

**Definition:** Directed edges implied by wiki-link tokens `[[typeId:recordId]]` extracted from record objects.

**Where links are extracted from (REL-002):**
- record Markdown body
- any string value anywhere inside record `fields` (deep traversal of nested objects/arrays)

**What is NOT scanned:**
- type objects are not scanned for relationships

**Key modules:**
- Extraction: `packages/dataset/src/parse/wikiRefs.ts`
- Graph build/index: `packages/dataset/src/graph/graph.ts`

**Important properties:**
- May contain cycles.
- May contain dangling edges (links that do not resolve to existing records), per NR-LINK-001.
- Block references `[[<cid>]]` are explicitly excluded from record relationships.

**UI usage:**
- `RecordViewer` displays incoming and outgoing Record Links using the built graph index.

## 2) Record Hierarchy (parent pointers)

**Definition:** A structural hierarchy defined by the optional top-level YAML key `parent` on record objects (HIER-001).

**Edge direction:** child -> parent

**Validity constraints:**
- Parent values must be strict in shape (VAL-PARENT-001).
- Parent pointers must resolve to an existing record (VAL-PARENT-002).
- The structure must be acyclic (VAL-PARENT-003).

**Key module:**
- Validation: `packages/dataset/src/validate/validateDatasetSnapshot.ts`

**Usage:**
- Canonical export/import layout uses this hierarchy to nest record directories:
  `packages/dataset/src/snapshot/canonicalizeDatasetSnapshot.ts`

**Important separation:**
- `parent` pointers are *not* record relationships under REL-001/REL-002.
  Wiki-link relationships remain independent.

## 3) Type Composition Dependencies (type -> type)

**Definition:** A type-level dependency declaration in type objects:
`fields.composition.<name> = { typeId: <otherType>, required: boolean }`

**Key modules:**
- Validation: `packages/dataset/src/validate/validateDatasetSnapshot.ts`

**How it is enforced:**
- It is not satisfied by hierarchy parent pointers.
- It is satisfied by outgoing Record Links (wiki-links) to existing records of the required type (VAL-COMP-002).

This creates a “two-layer” relationship:
- schema layer: type -> required component type
- data layer: record -> record links

## 4) Block Dependency Graph (record/type/plugin -> block CID)

**Definition:** A record or type references a block if it contains a CID wiki-link token:
`[[<cid>]]`

**Where references are extracted from:**
- record body
- any string value anywhere inside record `fields`
- type body
- any string value anywhere inside type `fields`

Plugin manifests may also declare block dependencies explicitly via `blocks[]`.

**Key modules:**
- Extraction: `packages/dataset/src/parse/wikiRefs.ts`
- Validation: `packages/dataset/src/validate/validateDatasetSnapshot.ts`
- Reachable block pruning: `packages/dataset/src/snapshot/canonicalizeDatasetSnapshot.ts`

**Validity constraints:**
- referenced block must exist at canonical path
- block bytes must hash to the referenced CID digest (VAL-BLOCK-001/002)

## 5) Canonical Layout Tree (filesystem paths)

**Definition:** A deterministic filesystem representation of type/record objects, used for record-only exports (EXP-HIER-001).

This is not a semantic “relationship graph.” It is a derived directory tree used for stable exports.

**Key module:**
- `packages/dataset/src/snapshot/canonicalizeDatasetSnapshot.ts`

**Inputs:**
- type identities (`typeId`)
- record identities (`typeId:recordId`)
- record hierarchy (`parent` pointers)
- reachable block set (CID references)

**Output:**
- a new `DatasetSnapshot` with canonical paths for type objects, record objects, and reachable blocks only
