# Verification Matrix (SPEC.md ↔ tests)

Generated: 2026-01-02T18:33:26.282Z

## Testable requirements with no tests
- BLOB-002 — BlobId format is deterministic
- BLOB-LAYOUT-001 — Blob store paths are derived from BlobId
- BLOB-LAYOUT-003 — Non-record, non-blob-store files are non-semantic
- EXP-006 — Record-only export includes reachable blobs
- GC-001 — Reachable blob set is computed from blob references
- GC-002 — Unreferenced blobs are garbage and are excluded from record-only export
- GC-003 — Garbage blobs do not make a dataset invalid
- HASH-004 — Only schema and snapshot fingerprints are defined in core
- HASH-005 — Blob content is committed by reference digests
- LAYOUT-002 — One object per file
- NFR-001 — No full reloads for CRUD
- NFR-010 — Read-only offline after initial load
- TYPE-001 — Types are defined by type objects
- TYPE-002 — typeId uniqueness
- VAL-BLOB-001 — Blob references must resolve to matching blob bytes
- VAL-BLOB-002 — Blob store files must match their path digest

## GOV-001 — Spec-first changes (testable=false)
Tests (0):
- (none)

## GOV-002 — Verification matrix must match spec (testable=true)
Tests (1):
- tests/spec-trace-matrix.test.js — "GOV-002: spec-trace output matches committed matrix"

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
- tests/core.gaps.test.js — "NR-UI-002: arbitrary keys inside fields are accepted"

## NR-SEM-001 — No semantic validation of fields (testable=true)
Tests (1):
- tests/core.gaps.test.js — "NR-SEM-001: semantic shapes are ignored by validation"

## NR-SEC-001 — No security hardening requirement (testable=false)
Tests (0):
- (none)

## NR-LINK-001 — No requirement that links resolve
Tests (1):
- tests/core.gaps.test.js — "NR-LINK-001: missing record links are allowed (except composition)"

## ID-001 — Identifier syntax is separator-safe (testable=true)
Tests (3):
- tests/core.ids.test.js — "ID-001: accepts valid identifiers"
- tests/core.ids.test.js — "ID-001: rejects recordId with colon"
- tests/core.ids.test.js — "ID-001: rejects typeId with invalid characters"

## ID-002 — Reserved typeId for blob references (testable=true)
Tests (1):
- tests/core.ids.test.js — "ID-002: rejects reserved gdblob typeId"

## HASH-001 — Canonical dataset hashing (gdhash-v1)
Tests (3):
- tests/core.hash.test.js — "HASH-001: duplicate identities fail hashing"
- tests/core.hash.test.js — "HASH-001: line ending normalization yields stable hashes"
- tests/core.hash.test.js — "HASH-001: non-record files are ignored"

## HASH-002 — Schema fingerprint (types only)
Tests (0):
- (none)

## HASH-003 — Snapshot fingerprint (types + record objects)
Tests (1):
- tests/core.hash.test.js — "HASH-003: snapshot hash is path-independent for record files"

## HASH-004 — Only schema and snapshot fingerprints are defined in core (testable=true)
Tests (0):
- (none)

## HASH-005 — Blob content is committed by reference digests (testable=true)
Tests (0):
- (none)

## BLOB-001 — Canonical blob digest (sha256) (testable=true)
Tests (1):
- tests/core.blobs.test.js — "BLOB-001: computeBlobDigest hashes raw bytes"

## BLOB-002 — BlobId format is deterministic (testable=true)
Tests (0):
- (none)

## LAYOUT-001 — Record files are discovered by content (not path) (testable=true)
Tests (1):
- apps/web/src/core/validateDatasetSnapshot.test.ts — "LAYOUT-001: no recordId means the object is treated as a type"

## LAYOUT-002 — One object per file (testable=true)
Tests (0):
- (none)

## BLOB-LAYOUT-001 — Blob store paths are derived from BlobId (testable=true)
Tests (0):
- (none)

## BLOB-LAYOUT-002 — Only canonical blob files are allowed in the blob store (testable=true)
Tests (1):
- tests/core.blobs.test.js — "BLOB-LAYOUT-002: invalid blob path shape fails validation"

## BLOB-LAYOUT-003 — Non-record, non-blob-store files are non-semantic (testable=true)
Tests (0):
- (none)

## FR-MD-020 — YAML front matter is required
Tests (7):
- apps/web/src/core/validateDatasetSnapshot.test.ts — "FR-MD-020: invalid YAML fails validation"
- apps/web/src/core/validateDatasetSnapshot.test.ts — "FR-MD-020: missing YAML front matter fails validation"
- tests/core.frontMatter.test.js — "FR-MD-020: extracts yaml and body for valid front matter"
- tests/core.frontMatter.test.js — "FR-MD-020: missing YAML front matter fails parsing"
- tests/core.yaml.test.js — "FR-MD-020: invalid YAML fails parsing"
- tests/core.yaml.test.js — "FR-MD-020: non-object YAML front matter is invalid"
- tests/core.yaml.test.js — "FR-MD-020: parses YAML objects"

## FR-MD-021 — Required top-level keys for type objects (testable=true)
Tests (1):
- apps/web/src/core/validateDatasetSnapshot.test.ts — "FR-MD-021: fields must be an object"

## FR-MD-023 — Required top-level keys for record objects (testable=true)
Tests (1):
- apps/web/src/core/validateDatasetSnapshot.test.ts — "FR-MD-023: recordId must be a string identifier when present"

## FR-MD-022 — Body is raw Markdown
Tests (1):
- apps/web/src/core/markdownRecord.test.ts — "FR-MD-022: serializer preserves raw Markdown body and updated YAML"

## EXT-001 — Top-level vocabulary is fixed (testable=true)
Tests (2):
- apps/web/src/core/validateDatasetSnapshot.test.ts — "EXT-001: extra top-level keys are rejected"
- tests/ext.reserved-vocabulary.test.js — "EXT-001: extra top-level keys are forbidden"

## EXT-002 — `fields` is open
Tests (1):
- tests/ext.reserved-vocabulary.test.js — "EXT-002: accepts arbitrary shapes within fields"

## TYPE-001 — Types are defined by type objects (testable=true)
Tests (0):
- (none)

## TYPE-002 — typeId uniqueness (testable=true)
Tests (0):
- (none)

## TYPE-004 — fieldDefs shape (testable=true)
Tests (5):
- apps/web/src/schema/typeSchema.test.ts — "TYPE-004: fieldDefs array is rejected"
- apps/web/src/schema/typeSchema.test.ts — "TYPE-004: fieldDefs map is accepted"
- apps/web/src/schema/typeSchema.test.ts — "TYPE-004: missing fieldDefs yields an empty schema"
- apps/web/src/schema/typeSchema.test.ts — "TYPE-004: null fieldDefs yields an empty schema"
- tests/core.gaps.test.js — "TYPE-004: fieldDefs must be map of objects; required must be boolean when present"

## TYPE-COMP-001 — composition shape (testable=true)
Tests (2):
- tests/core.composition.test.js — "TYPE-COMP-001: composition component must include required boolean"
- tests/core.composition.test.js — "TYPE-COMP-001: composition must be a map with only typeId + required"

## REL-001 — Record relationships use composite wiki-links (testable=true)
Tests (1):
- tests/core.wikiLinks.test.js — "REL-001: blob references are not treated as record relationships"

## REL-002 — Where record relationships are extracted (testable=true)
Tests (1):
- tests/core.graph.test.js — "REL-002: does not synthesize links across separate string values"

## REL-003 — Record reference normalization (testable=true)
Tests (2):
- tests/core.wikiLinks.test.js — "REL-003: extracts record references from wiki-link tokens"
- tests/core.wikiLinks.test.js — "REL-003: ignores malformed record tokens and aliases"

## REL-004 — Preservation: do not rewrite link spellings (testable=false)
Tests (0):
- (none)

## REL-005 — Graphdown-created relationships are serialized as wiki-links (testable=true)
Tests (2):
- apps/web/src/schema/typeSchema.test.ts — "REL-005: writeRef writes wiki-links"
- apps/web/src/schema/typeSchema.test.ts — "REL-005: writeRefs writes wiki-link arrays"

## REL-007 — Only composite wiki-links are relationships in core (testable=true)
Tests (1):
- apps/web/src/schema/typeSchema.test.ts — "REL-007: readRef/readRefs return cleaned ids from legacy shapes"

## BLOB-REF-001 — Blob references use composite wiki-link tokens (testable=true)
Tests (2):
- tests/core.blobs.test.js — "BLOB-REF-001: split strings do not synthesize blob references"
- tests/core.wikiLinks.test.js — "BLOB-REF-001: extracts blob references"

## BLOB-REF-002 — Blob reference normalization is strict (testable=true)
Tests (1):
- tests/core.wikiLinks.test.js — "BLOB-REF-002: ignores malformed blob references"

## VAL-001 — Type/records must be internally consistent
Tests (1):
- apps/web/src/state/DatasetContext.test.tsx — "VAL-001: invalid datasets are reported as dataset_invalid"

## VAL-002 — Identity uniqueness rules (testable=true)
Tests (2):
- apps/web/src/core/validateDatasetSnapshot.test.ts — "VAL-002: duplicate record identity fails validation"
- tests/core.graph.test.js — "VAL-002: duplicate record identity fails graph build"

## VAL-003 — Record objects must reference an existing type (testable=true)
Tests (1):
- apps/web/src/core/validateDatasetSnapshot.test.ts — "VAL-003: record referencing missing type fails validation"

## VAL-005 — Required fields (schema-driven)
Tests (1):
- apps/web/src/core/validateDatasetSnapshot.test.ts — "VAL-005: required fields enforced when fieldDefs.required = true"

## VAL-006 — No semantic validation of values
Tests (0):
- (none)

## VAL-COMP-001 — Composition referenced types must exist
Tests (0):
- (none)

## VAL-COMP-002 — Required components must be satisfied by outgoing record links
Tests (3):
- tests/core.composition.test.js — "VAL-COMP-002: link to wrong type does not satisfy requirement"
- tests/core.composition.test.js — "VAL-COMP-002: missing required component link fails"
- tests/core.composition.test.js — "VAL-COMP-002: required component link resolves to correct type"

## VAL-BLOB-001 — Blob references must resolve to matching blob bytes (testable=true)
Tests (0):
- (none)

## VAL-BLOB-002 — Blob store files must match their path digest (testable=true)
Tests (0):
- (none)

## GC-001 — Reachable blob set is computed from blob references (testable=true)
Tests (0):
- (none)

## GC-002 — Unreferenced blobs are garbage and are excluded from record-only export (testable=true)
Tests (0):
- (none)

## GC-003 — Garbage blobs do not make a dataset invalid (testable=true)
Tests (0):
- (none)

## ERR-001 — File-specific errors when possible
Tests (2):
- tests/cli.output.test.js — "ERR-001: json output includes stable error fields"
- tests/cli.output.test.js — "ERR-001: pretty output includes stable error codes"

## ERR-002 — Clear failure categories for GitHub import
Tests (3):
- apps/web/e2e/app.spec.ts — "ERR-002: shows invalid_url category for unsupported GitHub URLs (e2e)"
- apps/web/src/state/DatasetContext.test.tsx — "ERR-002: maps GitHub 404 repo responses to not_found"
- apps/web/src/state/DatasetContext.test.tsx — "ERR-002: maps GitHub rate limits to rate_limited"

## GH-001 — Supported URL forms
Tests (5):
- apps/web/src/import/github/parseGitHubUrl.test.ts — "GH-001: accepts /tree/<ref> URLs"
- apps/web/src/import/github/parseGitHubUrl.test.ts — "GH-001: accepts https repo URLs"
- apps/web/src/import/github/parseGitHubUrl.test.ts — "GH-001: accepts repo URLs with trailing slash and .git"
- apps/web/src/import/github/parseGitHubUrl.test.ts — "GH-001: accepts scheme-less repo URLs"
- apps/web/src/import/github/parseGitHubUrl.test.ts — "GH-001: rejects malformed, non-github, or unsupported URLs"

## GH-002 — Default ref resolution
Tests (1):
- apps/web/src/import/github/loadGitHubSnapshot.test.ts — "GH-002: falls back to main when default_branch is missing"

## GH-003 — Recursive listing + raw fetch
Tests (2):
- apps/web/e2e/app.spec.ts — "GH-003: imports GitHub repos via tree API + raw fetch (e2e)"
- apps/web/src/state/DatasetContext.test.tsx — "GH-003: imports a repo snapshot via tree listing + raw fetch"

## GH-005 — Reject subdirectory URLs
Tests (1):
- apps/web/src/import/github/parseGitHubUrl.test.ts — "GH-005: rejects /tree/<ref>/<subdir> URLs"

## GH-008 — Public repo import requires no auth
Tests (1):
- apps/web/src/import/github/loadGitHubSnapshot.test.ts — "GH-008: does not send Authorization headers for public fetches"

## EXP-002 — Record-only export
Tests (0):
- (none)

## EXP-006 — Record-only export includes reachable blobs (testable=true)
Tests (0):
- (none)

## EXP-003 — Whole-repo export
Tests (0):
- (none)

## EXP-004 — Path stability
Tests (0):
- (none)

## EXP-005 — Content preservation (no “reformat the universe”)
Tests (0):
- (none)

## UI-001 — Desktop + mobile usable (testable=false)
Tests (0):
- (none)

## UI-004 — Consistent CRUD + relationship affordances (testable=false)
Tests (0):
- (none)

## NFR-001 — No full reloads for CRUD (testable=true)
Tests (0):
- (none)

## NFR-010 — Read-only offline after initial load (testable=true)
Tests (0):
- (none)

## UI-RAW-001 — Schema-agnostic record editor (testable=true)
Tests (2):
- apps/web/src/components/RecordEditor.raw.test.tsx — "UI-RAW-001: edits arbitrary fields without kind semantics"
- apps/web/src/components/RecordEditor.raw.test.tsx — "UI-RAW-001: edits fields outside any schema and persists them"

## NFR-030 — Plugins must not require core modification (testable=false)
Tests (0):
- (none)

## NFR-031 — New field kinds without rewriting CRUD (testable=false)
Tests (0):
- (none)
