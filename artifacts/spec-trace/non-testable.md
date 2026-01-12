# Non-testable requirements

These governance/process requirements are marked `testable=false` and are excluded from coverage.

## API (39)
- API-003 — All Runtime API operations are asynchronous
- API-005 — Runtime API payloads are structured-clone compatible
- API-BLOCK-001 — Block identity is CID and blocks are immutable
- API-BLOCK-GC-001 — Reachable block set computation is exposed
- API-BLOCK-READ-001 — Resolve block bytes by CID
- API-BLOCK-READ-002 — Block existence check by CID
- API-BLOCK-READ-003 — List blocks present in the snapshot
- API-BLOCK-REF-001 — List block references extracted from a record
- API-BLOCK-WRITE-001 — Block insertion by bytes returns CID
- API-BLOCK-WRITE-002 — Block insertion is idempotent
- API-BLOCK-WRITE-003 — Block deletion is constrained by validity
- API-BLOCK-WRITE-004 — Garbage collection mutation removes only garbage blocks
- API-COMP-001 — Type Composition Dependencies are readable
- API-DET-001 — Read results are deterministic for a fixed snapshot
- API-DET-002 — List order is stable and documented
- API-ERR-001 — Errors are structured and include stable codes
- API-EVENT-001 — API provides change notifications
- API-EXP-001 — API can produce canonical dataset export bytes
- API-HASH-001 — API exposes schema and snapshot fingerprints only
- API-HIER-001 — Record Hierarchy (parent pointers) is readable
- API-PARK-000 — Parked requirements are capability-conditional
- API-QUERY-001 — No required text query language
- API-READ-001 — List and get type objects
- API-READ-002 — List and get record objects
- API-READ-003 — Raw Markdown access for type/record files is available
- API-RLG-001 — Record Link Graph adjacency is readable
- API-SESSION-001 — Runtime API can open a session from a snapshot
- API-SESSION-002 — Read operations are side-effect free
- API-SHAPE-001 — Type object view shape
- API-SHAPE-002 — Record object view shape
- API-TXN-001 — API supports explicit transactions
- API-V1-000 — Runtime API v1 conformance scope
- API-WRITE-001 — Record mutations are capability-gated
- API-WRITE-002 — Type mutations are capability-gated
- API-WRITE-003 — All mutations validate the resulting dataset
- API-WRITE-004 — Mutations are atomic at the dataset level
- API-WRITE-005 — Mutations must not rewrite unrelated files
- API-WRITE-006 — API-created objects must serialize as valid record files
- API-WRITE-007 — Structured relationship editing serializes as wiki-links

## GOV (1)
- GOV-001 — Spec-first changes

## NFR (2)
- NFR-030 — Plugins must not require core modification
- NFR-031 — New field kinds without rewriting CRUD

## NR (2)
- NR-SEC-001 — No security hardening requirement
- NR-UI-001 — No standardized UI hints

## P (3)
- P-001 — Repository-first, record-canonical
- P-002 — Dataset defines the model
- P-003 — Universality and minimal assumptions

## PLUG (2)
- PLUG-FR-003 — Plugin manifest body is raw Markdown
- PLUG-RES-001 — pluginId and gdApiVersion are reserved top-level keys

## REL (1)
- REL-004 — Preservation: do not rewrite link spellings

## UI (2)
- UI-001 — Desktop + mobile usable
- UI-004 — Consistent CRUD + relationship affordances

