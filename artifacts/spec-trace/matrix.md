# Verification Matrix (SPEC.md ↔ tests)

Generated: 2026-01-01T11:06:50.092Z

## Testable requirements with no tests
- NFR-001 — No full reloads for CRUD
- NFR-010 — Read-only offline after initial load
- NR-SEM-001 — No kind-based semantic validation of fields

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
- tests/core.gaps.test.js — "NR-UI-002: UI hint keys are ignored by validation"

## NR-SEM-001 — No kind-based semantic validation of fields (testable=true)
Tests (0):
- (none)

## NR-SEC-001 — No security hardening requirement (testable=false)
Tests (0):
- (none)

## NR-LINK-001 — No requirement that links resolve
Tests (1):
- tests/core.gaps.test.js — "NR-LINK-001: missing link targets do not fail validation"

## HASH-001 — Canonical dataset hashing (gdhash-v1)
Tests (5):
- tests/core.hash.test.js — "HASH-001: duplicate ids fail hashing"
- tests/core.hash.test.js — "HASH-001: ids are ordered deterministically by UTF-8 bytes"
- tests/core.hash.test.js — "HASH-001: invalid UTF-8 fails hashing with E_UTF8_INVALID"
- tests/core.hash.test.js — "HASH-001: line ending normalization produces stable hashes"
- tests/core.hash.test.js — "HASH-001: non-record files do not affect hashes"

## HASH-002 — Schema fingerprint (types only)
Tests (1):
- tests/core.hash.test.js — "HASH-002: schema hash ignores type file paths"

## HASH-003 — Snapshot fingerprint (types + data records)
Tests (1):
- tests/core.hash.test.js — "HASH-003: snapshot hash is path-independent for records"

## HASH-004 — Only schema and snapshot fingerprints are defined in core (testable=true)
Tests (1):
- tests/core.hash.test.js — "HASH-004: unknown hash scopes are rejected"

## LAYOUT-001 — Required directories
Tests (2):
- apps/web/src/core/validateDatasetSnapshot.test.ts — "LAYOUT-001: missing required directories fails validation"
- tests/cli.test.js — "LAYOUT-001: missing required directories fails validation"

## LAYOUT-002 — What counts as a record file
Tests (2):
- apps/web/src/core/validateDatasetSnapshot.test.ts — "LAYOUT-002: ignores non-markdown files placed under records/"
- apps/web/src/core/validateDatasetSnapshot.test.ts — "LAYOUT-002: ignores non-markdown files under records/"

## LAYOUT-004 — Type records location
Tests (1):
- tests/core.composition.test.js — "LAYOUT-004: nested type and record paths are accepted"

## LAYOUT-005 — Data records location
Tests (2):
- apps/web/src/core/validateDatasetSnapshot.test.ts — "LAYOUT-005: markdown files must live under records/<recordTypeId>/"
- apps/web/src/core/validateDatasetSnapshot.test.ts — "LAYOUT-005: record files directly under records/ are invalid"

## FR-MD-020 — YAML front matter is required
Tests (7):
- apps/web/src/core/validateDatasetSnapshot.test.ts — "FR-MD-020: invalid YAML fails validation"
- apps/web/src/core/validateDatasetSnapshot.test.ts — "FR-MD-020: missing YAML front matter fails validation"
- tests/core.frontMatter.test.js — "FR-MD-020: extracts yaml and body for valid front matter"
- tests/core.frontMatter.test.js — "FR-MD-020: missing YAML front matter fails parsing"
- tests/core.yaml.test.js — "FR-MD-020: invalid YAML fails parsing"
- tests/core.yaml.test.js — "FR-MD-020: non-object YAML front matter is invalid"
- tests/core.yaml.test.js — "FR-MD-020: parses YAML objects"

## FR-MD-021 — Required top-level fields
Tests (1):
- apps/web/src/core/validateDatasetSnapshot.test.ts — "FR-MD-021: missing required id field fails validation"

## FR-MD-022 — Body is raw Markdown
Tests (1):
- apps/web/src/core/markdownRecord.test.ts — "FR-MD-022: serializer preserves raw Markdown body and updated YAML"

## EXT-001 — Minimal reserved vocabulary
Tests (1):
- tests/ext.reserved-vocabulary.test.js — "EXT-001: allows arbitrary extra top-level keys on types and records"

## EXT-002 — `fields` is open
Tests (1):
- tests/ext.reserved-vocabulary.test.js — "EXT-002: accepts arbitrary shapes within fields"

## TYPE-001 — Type records are the schema source of truth
Tests (1):
- tests/core.graph.test.js — "TYPE-001: resolves a record's type via type records"

## TYPE-002 — `recordTypeId` directory compatibility
Tests (1):
- tests/core.graph.test.js — "TYPE-002: recordTypeId must be directory-safe"

## TYPE-003 — recordTypeId uniqueness
Tests (1):
- tests/core.graph.test.js — "TYPE-003: duplicate recordTypeId fails validation"

## TYPE-004 — Optional schema definition: `fieldDefs`
Tests (4):
- apps/web/src/schema/typeSchema.test.ts — "TYPE-004: fieldDefs array is rejected"
- apps/web/src/schema/typeSchema.test.ts — "TYPE-004: fieldDefs map is accepted"
- apps/web/src/schema/typeSchema.test.ts — "TYPE-004: missing fieldDefs yields an empty schema"
- apps/web/src/schema/typeSchema.test.ts — "TYPE-004: null fieldDefs yields an empty schema"

## TYPE-005 — Field definition minimum shape
Tests (1):
- tests/core.gaps.test.js — "TYPE-005: fieldDefs must declare kind"

## TYPE-006 — Open world field kinds
Tests (1):
- tests/core.gaps.test.js — "TYPE-006: unknown kinds are accepted"

## TYPE-007 — Body semantics: `bodyField` (optional)
Tests (1):
- tests/core.gaps.test.js — "TYPE-007: bodyField is optional"

## TYPE-COMP-001 — Optional type composition metadata
Tests (2):
- tests/core.composition.test.js — "TYPE-COMP-001: composition schema rejects non-map composition shapes"
- tests/core.composition.test.js — "TYPE-COMP-001: composition schema rejects null composition"

## REL-001 — Canonical relationship marker is Obsidian wiki-link syntax
Tests (2):
- tests/core.wikiLinks.test.js — "REL-001: extracts ids from wiki-link tokens"
- tests/core.wikiLinks.test.js — "REL-001: ignores wiki-link alias text"

## REL-002 — Where relationships may appear
Tests (3):
- tests/core.graph.test.js — "REL-002: computes incoming links from extracted relationships"
- tests/core.graph.test.js — "REL-002: extracts outgoing links from record content"
- tests/core.graph.test.js — "REL-002: extracts wiki-links from YAML field strings"

## REL-003 — ID normalization for link resolution
Tests (4):
- tests/core.ids.test.js — "REL-003: cleanId returns null for blank strings"
- tests/core.ids.test.js — "REL-003: cleanId returns null for non-strings"
- tests/core.ids.test.js — "REL-003: cleanId trims whitespace"
- tests/core.ids.test.js — "REL-003: cleanId unwraps [[...]] tokens"

## REL-004 — Preservation: do not rewrite link spellings (testable=false)
Tests (0):
- (none)

## REL-005 — Graphdown-created relationships are serialized as wiki-links (testable=true)
Tests (2):
- apps/web/src/schema/typeSchema.test.ts — "REL-005: writeRef writes wiki-links"
- apps/web/src/schema/typeSchema.test.ts — "REL-005: writeRefs writes wiki-link arrays"

## REL-007 — Only wiki-links are recognized as relationships in core
Tests (2):
- apps/web/src/schema/typeSchema.test.ts — "REL-007: readRef/readRefs return cleaned ids from legacy shapes"
- tests/core.composition.test.js — "REL-007: structured {ref} objects do not satisfy composition requirements"

## VAL-001 — Type/records must be internally consistent
Tests (2):
- apps/web/src/core/validateDatasetSnapshot.test.ts — "VAL-001: unknown record type directories fail validation"
- apps/web/src/state/DatasetContext.test.tsx — "VAL-001: invalid datasets are reported as dataset_invalid"

## VAL-002 — Global ID uniqueness
Tests (2):
- apps/web/src/core/validateDatasetSnapshot.test.ts — "VAL-002: ids must be globally unique"
- tests/core.graph.test.js — "VAL-002: enforces global id uniqueness"

## VAL-004 — Data record directory/type consistency
Tests (1):
- apps/web/src/core/validateDatasetSnapshot.test.ts — "VAL-004: record typeId must match records/<recordTypeId>/ directory"

## VAL-005 — Required fields (schema-driven)
Tests (3):
- apps/web/src/core/validateDatasetSnapshot.test.ts — "VAL-005: missing required fields fails validation"
- apps/web/src/core/validateDatasetSnapshot.test.ts — "VAL-005: null required field fails validation"
- apps/web/src/core/validateDatasetSnapshot.test.ts — "VAL-005: present required field passes validation"

## VAL-006 — No semantic validation of values
Tests (1):
- tests/core.gaps.test.js — "VAL-006: semantic constraints are not enforced"

## VAL-COMP-001 — Composition referenced record types must exist
Tests (1):
- tests/core.composition.test.js — "VAL-COMP-001: composition references must point at existing types"

## VAL-COMP-002 — Composition requirements must be satisfied by outgoing wiki-links
Tests (4):
- tests/core.composition.test.js — "VAL-COMP-002: composition fails when required component links are missing"
- tests/core.composition.test.js — "VAL-COMP-002: composition ignores links that resolve to the wrong type"
- tests/core.composition.test.js — "VAL-COMP-002: composition passes when required components are linked via wiki-links"
- tests/core.composition.test.js — "VAL-COMP-002: duplicate links to the same target do not satisfy higher mins"

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
Tests (2):
- apps/web/src/export/exportZip.test.ts — "EXP-002: record-only export includes only type/record markdown"
- tests/core.roundtrip.test.js — "EXP-002: record-only zip export/import round-trips"

## EXP-003 — Whole-repo export
Tests (1):
- apps/web/src/export/exportZip.test.ts — "EXP-003: whole-repo export round-trips snapshot files"

## EXP-004 — Path stability
Tests (1):
- apps/web/src/export/exportZip.test.ts — "EXP-004: export preserves original record paths"

## EXP-005 — Content preservation (no “reformat the universe”)
Tests (1):
- tests/core.roundtrip.test.js — "EXP-005: whole-repo zip export preserves content bytes"

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
