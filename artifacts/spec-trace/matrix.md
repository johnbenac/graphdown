# Verification Matrix (SPEC.md ↔ tests)

Generated: 2026-01-08T17:01:24.148Z

## GOV-001 — Spec-first changes (testable=false)
Tests (0):
- (none)

## GOV-002 — Verification matrix must match spec (testable=true)
Tests (1):
- apps/web/src/__tests__/governance/spec-trace-matrix.test.ts — "GOV-002: spec-trace output matches committed matrix"

## P-001 — Repository-first, Markdown-canonical (testable=false)
Tests (0):
- (none)

## P-002 — Dataset defines the model (testable=false)
Tests (0):
- (none)

## P-003 — Universality and minimal assumptions (testable=false)
Tests (0):
- (none)

## NR-UI-001 — No standardized UI hints (testable=false)
Tests (0):
- (none)

## NR-UI-002 — UI hint keys are ignored by core validation (testable=true)
Tests (1):
- apps/web/src/graphdown/__tests__/gaps.test.ts — "NR-UI-002: arbitrary keys inside fields are accepted"

## NR-SEM-001 — No semantic validation of fields (testable=true)
Tests (1):
- apps/web/src/graphdown/__tests__/gaps.test.ts — "NR-SEM-001: semantic shapes are ignored by validation"

## NR-SEC-001 — No security hardening requirement (testable=false)
Tests (0):
- (none)

## NR-LINK-001 — No requirement that links resolve
Tests (1):
- apps/web/src/graphdown/__tests__/gaps.test.ts — "NR-LINK-001: missing record links are allowed (except composition)"

## ID-001 — Identifier syntax is separator-safe (testable=true)
Tests (3):
- apps/web/src/graphdown/__tests__/ids.test.ts — "ID-001: accepts valid identifiers"
- apps/web/src/graphdown/__tests__/ids.test.ts — "ID-001: rejects recordId with colon"
- apps/web/src/graphdown/__tests__/ids.test.ts — "ID-001: rejects typeId with invalid characters"

## ID-002 — Reserved typeId for blob references (testable=true)
Tests (1):
- apps/web/src/graphdown/__tests__/ids.test.ts — "ID-002: rejects reserved gdblob typeId"

## HASH-001 — Canonical dataset hashing (gdhash-v1)
Tests (3):
- apps/web/src/graphdown/__tests__/hash.test.ts — "HASH-001: duplicate identities fail hashing"
- apps/web/src/graphdown/__tests__/hash.test.ts — "HASH-001: line ending normalization yields stable hashes"
- apps/web/src/graphdown/__tests__/hash.test.ts — "HASH-001: non-record files are ignored"

## HASH-002 — Schema fingerprint (types only)
Tests (1):
- apps/web/src/graphdown/__tests__/hash.test.ts — "HASH-002: schema fingerprint ignores record object changes"

## HASH-003 — Snapshot fingerprint (types + record objects)
Tests (1):
- apps/web/src/graphdown/__tests__/hash.test.ts — "HASH-003: snapshot hash is path-independent for record files"

## HASH-004 — Only schema and snapshot fingerprints are defined in core (testable=true)
Tests (1):
- apps/web/src/graphdown/__tests__/hash.test.ts — "HASH-004: invalid hash scope fails with E_USAGE"

## HASH-005 — Blob content is committed by reference digests (testable=true)
Tests (1):
- apps/web/src/graphdown/__tests__/hash.test.ts — "HASH-005: snapshot hash ignores blob store bytes"

## BLOB-001 — Canonical blob digest (sha256) (testable=true)
Tests (1):
- apps/web/src/graphdown/__tests__/blobs.test.ts — "BLOB-001: computeBlobDigest hashes raw bytes"

## BLOB-002 — BlobId format is deterministic (testable=true)
Tests (1):
- apps/web/src/graphdown/__tests__/wikiRefs.test.ts — "BLOB-002: blob ids must be 64 lowercase hex characters"

## LAYOUT-001 — Record files are discovered by content (not path) (testable=true)
Tests (1):
- apps/web/src/graphdown/__tests__/validateDatasetSnapshot.test.ts — "LAYOUT-001: no recordId means the object is treated as a type"

## LAYOUT-002 — One object per file (testable=true)
Tests (1):
- apps/web/src/graphdown/__tests__/layout.test.ts — "LAYOUT-002: only first front matter block defines a record object"

## BLOB-LAYOUT-001 — Blob store paths are derived from BlobId (testable=true)
Tests (1):
- apps/web/src/graphdown/__tests__/blobs.test.ts — "BLOB-LAYOUT-001: canonical blob path is accepted"

## BLOB-LAYOUT-002 — Only canonical blob files are allowed in the blob store (testable=true)
Tests (1):
- apps/web/src/graphdown/__tests__/blobs.test.ts — "BLOB-LAYOUT-002: invalid blob path shape fails validation"

## BLOB-LAYOUT-003 — Non-record, non-blob-store files are non-semantic (testable=true)
Tests (1):
- apps/web/src/graphdown/__tests__/blobs.test.ts — "BLOB-LAYOUT-003: non-record, non-blob files are ignored by validation"

## FR-MD-020 — YAML front matter is required
Tests (7):
- apps/web/src/graphdown/__tests__/frontMatter.test.ts — "FR-MD-020: extracts yaml and body for valid front matter"
- apps/web/src/graphdown/__tests__/frontMatter.test.ts — "FR-MD-020: missing YAML front matter fails parsing"
- apps/web/src/graphdown/__tests__/validateDatasetSnapshot.test.ts — "FR-MD-020: invalid YAML fails validation"
- apps/web/src/graphdown/__tests__/validateDatasetSnapshot.test.ts — "FR-MD-020: missing YAML front matter fails validation"
- apps/web/src/graphdown/__tests__/yaml.test.ts — "FR-MD-020: invalid YAML fails parsing"
- apps/web/src/graphdown/__tests__/yaml.test.ts — "FR-MD-020: non-object YAML front matter is invalid"
- apps/web/src/graphdown/__tests__/yaml.test.ts — "FR-MD-020: parses YAML objects"

## FR-MD-021 — Required top-level keys for type objects (testable=true)
Tests (2):
- apps/web/src/graphdown/__tests__/validateDatasetSnapshot.test.ts — "FR-MD-021: fields must be an object"
- apps/web/src/graphdown/__tests__/validateDatasetSnapshot.test.ts — "FR-MD-021: type objects must not define parent"

## FR-MD-023 — Required top-level keys for record objects (testable=true)
Tests (2):
- apps/web/src/graphdown/__tests__/validateDatasetSnapshot.test.ts — "FR-MD-023: record objects may include parent"
- apps/web/src/graphdown/__tests__/validateDatasetSnapshot.test.ts — "FR-MD-023: recordId must be a string identifier when present"

## FR-MD-022 — Body is raw Markdown
Tests (1):
- apps/web/src/graphdown/__tests__/markdownRecord.test.ts — "FR-MD-022: serializer preserves raw Markdown body and updated YAML"

## EXT-001 — Top-level vocabulary is fixed (testable=true)
Tests (2):
- apps/web/src/graphdown/__tests__/reserved-vocabulary.test.ts — "EXT-001: extra top-level keys are forbidden"
- apps/web/src/graphdown/__tests__/validateDatasetSnapshot.test.ts — "EXT-001: extra top-level keys are rejected"

## EXT-002 — `fields` is open
Tests (1):
- apps/web/src/graphdown/__tests__/reserved-vocabulary.test.ts — "EXT-002: accepts arbitrary shapes within fields"

## TYPE-001 — Types are defined by type objects (testable=true)
Tests (1):
- apps/web/src/graphdown/__tests__/ids.test.ts — "TYPE-001: type object without recordId is valid"

## TYPE-002 — typeId uniqueness (testable=true)
Tests (1):
- apps/web/src/graphdown/__tests__/ids.test.ts — "TYPE-002: duplicate typeId fails validation"

## TYPE-004 — fieldDefs shape (testable=true)
Tests (1):
- apps/web/src/graphdown/__tests__/gaps.test.ts — "TYPE-004: fieldDefs must be map of objects; required must be boolean when present"

## TYPE-COMP-001 — composition shape (testable=true)
Tests (2):
- apps/web/src/graphdown/__tests__/composition.test.ts — "TYPE-COMP-001: composition component must include required boolean"
- apps/web/src/graphdown/__tests__/composition.test.ts — "TYPE-COMP-001: composition must be a map with only typeId + required"

## REL-001 — Record relationships use composite wiki-links (testable=true)
Tests (1):
- apps/web/src/graphdown/__tests__/wikiRefs.test.ts — "REL-001: blob references are not treated as record relationships"

## REL-002 — Where record relationships are extracted (testable=true)
Tests (2):
- apps/web/src/graphdown/__tests__/graph.test.ts — "REL-002: does not synthesize links across separate string values"
- apps/web/src/graphdown/__tests__/graph.test.ts — "REL-002: extracts record links from bodies and fields"

## REL-003 — Record reference normalization (testable=true)
Tests (2):
- apps/web/src/graphdown/__tests__/wikiRefs.test.ts — "REL-003: extracts record references from wiki-link tokens"
- apps/web/src/graphdown/__tests__/wikiRefs.test.ts — "REL-003: ignores malformed record tokens and aliases"

## REL-004 — Preservation: do not rewrite link spellings (testable=false)
Tests (0):
- (none)

## REL-005 — Graphdown-created relationships are serialized as wiki-links (testable=true)
Tests (2):
- apps/web/src/utils/__tests__/wikiRefStrings.test.ts — "REL-005: writeRef writes wiki-links"
- apps/web/src/utils/__tests__/wikiRefStrings.test.ts — "REL-005: writeRefs writes wiki-link arrays"

## REL-007 — Only composite wiki-links are relationships in core (testable=true)
Tests (1):
- apps/web/src/utils/__tests__/wikiRefStrings.test.ts — "REL-007: readRef/readRefs return cleaned ids from legacy shapes"

## BLOB-REF-001 — Blob references use composite wiki-link tokens (testable=true)
Tests (2):
- apps/web/src/graphdown/__tests__/blobs.test.ts — "BLOB-REF-001: split strings do not synthesize blob references"
- apps/web/src/graphdown/__tests__/wikiRefs.test.ts — "BLOB-REF-001: extracts blob references"

## BLOB-REF-002 — Blob reference normalization is strict (testable=true)
Tests (1):
- apps/web/src/graphdown/__tests__/wikiRefs.test.ts — "BLOB-REF-002: ignores malformed blob references"

## HIER-001 — Record hierarchy uses explicit parent pointers (testable=true)
Tests (1):
- apps/web/src/graphdown/__tests__/validateDatasetSnapshot.test.ts — "HIER-001: parent missing and parent null both define hierarchy roots"

## VAL-001 — Type/records must be internally consistent
Tests (1):
- apps/web/src/state/__tests__/DatasetContext.test.tsx — "VAL-001: invalid datasets are reported as dataset_invalid"

## VAL-002 — Identity uniqueness rules (testable=true)
Tests (2):
- apps/web/src/graphdown/__tests__/graph.test.ts — "VAL-002: duplicate record identity fails Record Link Graph build"
- apps/web/src/graphdown/__tests__/validateDatasetSnapshot.test.ts — "VAL-002: duplicate record identity fails validation"

## VAL-003 — Record objects must reference an existing type (testable=true)
Tests (1):
- apps/web/src/graphdown/__tests__/validateDatasetSnapshot.test.ts — "VAL-003: record referencing missing type fails validation"

## VAL-005 — Required fields (schema-driven)
Tests (1):
- apps/web/src/graphdown/__tests__/validateDatasetSnapshot.test.ts — "VAL-005: required fields enforced when fieldDefs.required = true"

## VAL-006 — No semantic validation of values
Tests (1):
- apps/web/src/graphdown/__tests__/validateDatasetSnapshot.test.ts — "VAL-006: semantic validation of field values is not enforced"

## VAL-COMP-001 — Composition referenced types must exist
Tests (1):
- apps/web/src/graphdown/__tests__/composition.test.ts — "VAL-COMP-001: composition referenced types must exist"

## VAL-COMP-002 — Required components must be satisfied by outgoing record links
Tests (3):
- apps/web/src/graphdown/__tests__/composition.test.ts — "VAL-COMP-002: link to wrong type does not satisfy requirement"
- apps/web/src/graphdown/__tests__/composition.test.ts — "VAL-COMP-002: missing required component link fails"
- apps/web/src/graphdown/__tests__/composition.test.ts — "VAL-COMP-002: required component link resolves to correct type"

## VAL-PARENT-001 — Parent field shape is strict (testable=true)
Tests (1):
- apps/web/src/graphdown/__tests__/validateDatasetSnapshot.test.ts — "VAL-PARENT-001: invalid parent shapes fail validation"

## VAL-PARENT-002 — Parent pointers must resolve (testable=true)
Tests (1):
- apps/web/src/graphdown/__tests__/validateDatasetSnapshot.test.ts — "VAL-PARENT-002: parent pointers must resolve to an existing record"

## VAL-PARENT-003 — Record hierarchy must be acyclic (testable=true)
Tests (2):
- apps/web/src/graphdown/__tests__/validateDatasetSnapshot.test.ts — "VAL-PARENT-003: parent pointer cycles fail validation"
- apps/web/src/graphdown/__tests__/validateDatasetSnapshot.test.ts — "VAL-PARENT-003: parent pointer self-cycle fails validation"

## VAL-BLOB-001 — Blob references must resolve to matching blob bytes (testable=true)
Tests (1):
- apps/web/src/graphdown/__tests__/blobs.test.ts — "VAL-BLOB-001: referenced blob must exist"

## VAL-BLOB-002 — Blob store files must match their path digest (testable=true)
Tests (1):
- apps/web/src/graphdown/__tests__/blobs.test.ts — "VAL-BLOB-002: blob bytes must match referenced digest"

## GC-001 — Reachable blob set is computed from blob references (testable=true)
Tests (1):
- apps/web/src/features/export/__tests__/exportZip.test.ts — "GC-001: reachable blob set includes references from fields"

## GC-002 — Unreferenced blobs are garbage and are excluded from record-only export (testable=true)
Tests (1):
- apps/web/src/graphdown/__tests__/roundtrip.test.ts — "GC-002: export excludes unreferenced blobs"

## GC-003 — Garbage blobs do not make a dataset invalid (testable=true)
Tests (1):
- apps/web/src/graphdown/__tests__/blobs.test.ts — "GC-003: unreferenced but valid blobs do not fail validation"

## ERR-001 — File-specific errors when possible
Tests (1):
- apps/web/src/graphdown/__tests__/errors.test.ts — "ERR-001: validation errors expose stable fields"

## ERR-002 — Clear failure categories for GitHub import
Tests (2):
- apps/web/src/state/__tests__/DatasetContext.test.tsx — "ERR-002: maps GitHub 404 repo responses to not_found"
- apps/web/src/state/__tests__/DatasetContext.test.tsx — "ERR-002: maps GitHub rate limits to rate_limited"

## GH-001 — Supported URL forms
Tests (5):
- apps/web/src/import/github/__tests__/parseGitHubUrl.test.ts — "GH-001: accepts /tree/<ref> URLs"
- apps/web/src/import/github/__tests__/parseGitHubUrl.test.ts — "GH-001: accepts https repo URLs"
- apps/web/src/import/github/__tests__/parseGitHubUrl.test.ts — "GH-001: accepts repo URLs with trailing slash and .git"
- apps/web/src/import/github/__tests__/parseGitHubUrl.test.ts — "GH-001: accepts scheme-less repo URLs"
- apps/web/src/import/github/__tests__/parseGitHubUrl.test.ts — "GH-001: rejects malformed, non-github, or unsupported URLs"

## GH-002 — Default ref resolution
Tests (1):
- apps/web/src/import/github/__tests__/loadGitHubSnapshot.test.ts — "GH-002: falls back to main when default_branch is missing"

## GH-003 — Recursive listing + raw fetch
Tests (1):
- apps/web/src/state/__tests__/DatasetContext.test.tsx — "GH-003: imports a dataset snapshot via tree listing + raw fetch"

## GH-005 — Reject subdirectory URLs
Tests (1):
- apps/web/src/import/github/__tests__/parseGitHubUrl.test.ts — "GH-005: rejects /tree/<ref>/<subdir> URLs"

## GH-008 — Public repo import requires no auth
Tests (1):
- apps/web/src/import/github/__tests__/loadGitHubSnapshot.test.ts — "GH-008: does not send Authorization headers for public fetches"

## EXP-002 — Record-only export
Tests (1):
- apps/web/src/features/export/__tests__/exportZip.test.ts — "EXP-002: record-only export excludes non-graph files"

## EXP-006 — Record-only export includes reachable blobs (testable=true)
Tests (2):
- apps/web/src/features/export/__tests__/exportZip.test.ts — "EXP-006: includes only referenced blobs alongside canonical records/types"
- apps/web/src/graphdown/__tests__/roundtrip.test.ts — "EXP-006: export includes reachable blobs"

## EXP-003 — Whole-repo export
Tests (1):
- apps/web/src/graphdown/__tests__/roundtrip.test.ts — "EXP-003: canonical dataset export round-trips bytes and graph"

## EXP-004 — Path stability
Tests (1):
- apps/web/src/features/export/__tests__/exportZip.test.ts — "EXP-004: export canonicalizes record/type file paths"

## EXP-HIER-001 — Canonical parent-based export layout (testable=true)
Tests (1):
- apps/web/src/features/export/__tests__/exportZip.test.ts — "EXP-HIER-001: export uses canonical layout paths"

## EXP-005 — Content preservation (no “reformat the universe”)
Tests (1):
- apps/web/src/features/export/__tests__/exportZip.test.ts — "EXP-005: export preserves bytes exactly"

## UI-001 — Desktop + mobile usable (testable=false)
Tests (0):
- (none)

## UI-004 — Consistent CRUD + relationship affordances (testable=false)
Tests (0):
- (none)

## NFR-001 — No full reloads for CRUD (testable=true)
Tests (1):
- apps/web/src/state/__tests__/DatasetContext.nfr.test.tsx — "NFR-001: CRUD actions do not trigger a full document load event"

## NFR-PERSIST-001 — Web persistence requires IndexedDB (testable=true)
Tests (1):
- apps/web/src/state/__tests__/DatasetContext.test.tsx — "NFR-PERSIST-001: reports persistence_unavailable when IndexedDB is missing"

## NFR-010 — Read-only offline after initial load (testable=true)
Tests (1):
- apps/web/src/state/__tests__/DatasetContext.nfr.test.tsx — "NFR-010: uses persisted dataset for read-only access when offline"

## UI-RAW-001 — Schema-agnostic record editor (testable=true)
Tests (3):
- apps/web/src/components/__tests__/RecordEditor.raw.test.tsx — "UI-RAW-001: edits arbitrary fields without kind semantics"
- apps/web/src/components/__tests__/RecordEditor.raw.test.tsx — "UI-RAW-001: edits fields outside any schema and persists them"
- apps/web/src/components/__tests__/RecordEditor.raw.test.tsx — "UI-RAW-001: removes fields when YAML omits them"

## NFR-030 — Plugins must not require core modification (testable=false)
Tests (0):
- (none)

## NFR-031 — New field kinds without rewriting CRUD (testable=false)
Tests (0):
- (none)
