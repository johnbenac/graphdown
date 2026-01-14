# Verification Matrix (SPEC.md ↔ tests)

Generated: 2026-01-14T19:19:30.009Z

## GOV-001 — Spec-first changes (testable=false)
Tests (0):
- (none)

## GOV-002 — Verification matrix must match spec (testable=true)
Tests (1):
- packages/core/src/__tests__/governance/spec-trace-matrix.governance.integration.test.ts — "GOV-002: spec-trace output matches committed matrix"

## P-001 — Repository-first, record-canonical (testable=false)
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
- packages/core/src/__tests__/spec/gaps.integration.test.ts — "NR-UI-002: arbitrary keys inside fields are accepted"

## NR-SEM-001 — No semantic validation of fields (testable=true)
Tests (1):
- packages/core/src/__tests__/spec/gaps.integration.test.ts — "NR-SEM-001: semantic shapes are ignored by validation"

## NR-SEC-001 — No security hardening requirement (testable=false)
Tests (0):
- (none)

## NR-LINK-001 — No requirement that links resolve
Tests (1):
- packages/core/src/__tests__/spec/gaps.integration.test.ts — "NR-LINK-001: missing record links are allowed (except composition)"

## NR-PLUG-LINK-001 — No relationship or CID extraction from plugin files (testable=true, verify=ci)
Tests (1):
- packages/core/src/__tests__/spec/plugins.nonRequirements.integration.test.ts — "NR-PLUG-LINK-001: no relationship or CID extraction from plugin manifest bodies or bundle contents"

## NR-PLUG-VAL-001 — No plugin-defined dataset validity rules (testable=true, verify=ci)
Tests (1):
- packages/core/src/__tests__/spec/plugins.nonRequirements.integration.test.ts — "NR-PLUG-VAL-001: plugin bundle content is not executed or interpreted as additional validity rules"

## NR-PLUG-EXP-001 — Plugins do not define canonical export (testable=true, verify=ci)
Tests (1):
- packages/core/src/__tests__/spec/plugins.nonRequirements.integration.test.ts — "NR-PLUG-EXP-001: plugins do not define canonical export (no extra includes, no layout overrides, no rewrites)"

## NR-PLUG-HASH-001 — Plugins do not define hashing semantics (testable=true, verify=ci)
Tests (1):
- packages/core/src/__tests__/spec/plugins.nonRequirements.integration.test.ts — "NR-PLUG-HASH-001: plugins do not define hashing semantics (gdhash-v1 inputs are fixed by core)"

## ID-001 — Identifier syntax is separator-safe (testable=true)
Tests (3):
- packages/core/src/model/__tests__/ids.unit.test.ts — "ID-001: accepts valid identifiers"
- packages/core/src/model/__tests__/ids.unit.test.ts — "ID-001: rejects recordId with colon"
- packages/core/src/model/__tests__/ids.unit.test.ts — "ID-001: rejects typeId with invalid characters"

## PLUG-ID-001 — pluginId syntax is separator-safe (testable=true, verify=todo)
Tests (1):
- packages/core/src/parse/__tests__/pluginManifest.ids.unit.test.ts — "PLUG-ID-001: pluginId matches separator-safe identifier syntax"

## PLUG-ID-002 — pluginId uniqueness (testable=true, verify=todo)
Tests (1):
- packages/core/src/__tests__/spec/plugins.validate.integration.test.ts — "PLUG-ID-002: duplicate pluginId fails validation"

## HASH-001 — Canonical dataset hashing (gdhash-v1)
Tests (6):
- packages/core/src/__tests__/spec/hash.plugins.integration.test.ts — "HASH-001: duplicate plugin bundle identities fail hashing with E_DUPLICATE_ID"
- packages/core/src/__tests__/spec/hash.plugins.integration.test.ts — "HASH-001: duplicate pluginId manifests fail hashing with E_DUPLICATE_ID"
- packages/core/src/__tests__/spec/hash.plugins.integration.test.ts — "HASH-001: snapshot hash includes plugin objects and is path-independent for plugin directory relocation"
- packages/core/src/snapshot/__tests__/hash.unit.test.ts — "HASH-001: duplicate identities fail hashing"
- packages/core/src/snapshot/__tests__/hash.unit.test.ts — "HASH-001: line ending normalization yields stable hashes"
- packages/core/src/snapshot/__tests__/hash.unit.test.ts — "HASH-001: non-record files are ignored"

## HASH-002 — Schema fingerprint (types only)
Tests (1):
- packages/core/src/snapshot/__tests__/hash.unit.test.ts — "HASH-002: schema fingerprint ignores record object changes"

## HASH-003 — Snapshot fingerprint (types + record objects + plugin objects)
Tests (2):
- packages/core/src/__tests__/spec/hash.plugins.integration.test.ts — "HASH-003: snapshot fingerprint changes when a plugin bundle file changes"
- packages/core/src/snapshot/__tests__/hash.unit.test.ts — "HASH-003: snapshot hash is path-independent for record files"

## HASH-004 — Only schema and snapshot fingerprints are defined in core (testable=true)
Tests (1):
- packages/core/src/snapshot/__tests__/hash.unit.test.ts — "HASH-004: invalid hash scope fails with E_USAGE"

## HASH-005 — Block content is committed by reference CIDs (testable=true)
Tests (1):
- packages/core/src/snapshot/__tests__/hash.unit.test.ts — "HASH-005: snapshot hash ignores block store bytes"

## BLOCK-001 — Canonical block digest (sha256) (testable=true)
Tests (1):
- packages/core/src/cid/__tests__/cid.unit.test.ts — "BLOCK-001: digest embedded in CID is sha2-256(bytes)"

## CID-001 — CID test vector for empty bytes (testable=true)
Tests (1):
- packages/core/src/cid/__tests__/cid.unit.test.ts — "CID-001: cidFromRawBytes handles empty input"

## CID-002 — CID test vector for hello (testable=true)
Tests (1):
- packages/core/src/cid/__tests__/cid.unit.test.ts — "CID-002: cidFromRawBytes handles hello"

## CID-003 — CID test vector for abc (testable=true)
Tests (1):
- packages/core/src/cid/__tests__/cid.unit.test.ts — "CID-003: cidFromRawBytes handles abc"

## CID-004 — Decoded CID exposes raw codec and digest (testable=true)
Tests (1):
- packages/core/src/cid/__tests__/cid.unit.test.ts — "CID-004: decodeDaslCidString round-trips and exposes digest"

## LAYOUT-001 — Record files are discovered by content (not path) (testable=true)
Tests (1):
- packages/core/src/__tests__/spec/validateDatasetSnapshot.integration.test.ts — "LAYOUT-001: no recordId means the object is treated as a type"

## LAYOUT-002 — One object per file (testable=true)
Tests (1):
- packages/core/src/__tests__/spec/layout.integration.test.ts — "LAYOUT-002: only first front matter block defines a record object"

## BLOCK-LAYOUT-001 — Block store paths are derived from CID (testable=true)
Tests (1):
- packages/core/src/__tests__/spec/blocks.integration.test.ts — "BLOCK-LAYOUT-001: canonical block path is accepted"

## BLOCK-LAYOUT-002 — Only canonical block files are allowed in the block store (testable=true)
Tests (2):
- packages/core/src/__tests__/spec/blocks.integration.test.ts — "BLOCK-LAYOUT-002: blocks namespace is fully reserved"
- packages/core/src/__tests__/spec/blocks.integration.test.ts — "BLOCK-LAYOUT-002: invalid block path shape fails validation"

## BLOCK-LAYOUT-003 — Non-record, non-block-store, non-plugin files are non-semantic (testable=true)
Tests (1):
- packages/core/src/__tests__/spec/blocks.integration.test.ts — "BLOCK-LAYOUT-003: non-record, non-block files are ignored by validation"

## PLUG-000 — Plugins are a first-class dataset object class (testable=true, verify=ci)
Tests (4):
- packages/core/src/__tests__/spec/plugins.firstClass.integration.test.ts — "PLUG-000: dataset remains valid without plugins present"
- packages/core/src/__tests__/spec/plugins.firstClass.integration.test.ts — "PLUG-000: plugin objects are included in canonical dataset export"
- packages/core/src/__tests__/spec/plugins.firstClass.integration.test.ts — "PLUG-000: plugin objects are validated at import time"
- packages/core/src/__tests__/spec/plugins.firstClass.integration.test.ts — "PLUG-000: plugin objects participate in snapshot hashing"

## PLUG-LAYOUT-001 — Plugin manifests are discovered by content (not path) (testable=true, verify=todo)
Tests (4):
- packages/core/src/parse/__tests__/pluginManifest.discovery.unit.test.ts — "PLUG-LAYOUT-001: detects plugin manifests with CR-only line endings"
- packages/core/src/parse/__tests__/pluginManifest.discovery.unit.test.ts — "PLUG-LAYOUT-001: discovers plugin manifests in fixtures"
- packages/core/src/parse/__tests__/pluginManifest.discovery.unit.test.ts — "PLUG-LAYOUT-001: record precedence keeps type records from being plugin manifests"
- packages/core/src/parse/__tests__/pluginManifest.discovery.unit.test.ts — "PLUG-LAYOUT-001: requires pluginId and gdApiVersion keys"

## PLUG-RES-001 — pluginId and gdApiVersion are reserved top-level keys (testable=false)
Tests (0):
- (none)

## PLUG-LAYOUT-002 — Plugin bundle files are resolved from the manifest (testable=true, verify=todo)
Tests (2):
- packages/core/src/parse/__tests__/pluginManifest.paths.unit.test.ts — "PLUG-LAYOUT-002: resolves bundle files relative to the manifest directory"
- packages/core/src/parse/__tests__/pluginManifest.paths.unit.test.ts — "PLUG-LAYOUT-002: root manifest resolves bundle files without a directory prefix"

## PLUG-LAYOUT-003 — Plugin bundle file paths are safe and self-contained (testable=true, verify=todo)
Tests (1):
- packages/core/src/parse/__tests__/pluginManifest.paths.unit.test.ts — "PLUG-LAYOUT-003: safe relative path rules reject traversal, absolute paths, and whitespace"

## FR-MD-020 — YAML front matter is required
Tests (8):
- packages/core/src/__tests__/spec/validateDatasetSnapshot.integration.test.ts — "FR-MD-020: invalid YAML fails validation"
- packages/core/src/__tests__/spec/validateDatasetSnapshot.integration.test.ts — "FR-MD-020: missing YAML front matter fails validation"
- packages/core/src/parse/__tests__/frontMatter.unit.test.ts — "FR-MD-020: extracts yaml and body for valid front matter"
- packages/core/src/parse/__tests__/frontMatter.unit.test.ts — "FR-MD-020: missing YAML front matter fails parsing"
- packages/core/src/parse/__tests__/frontMatter.unit.test.ts — "FR-MD-020: parses YAML front matter with CR-only line endings"
- packages/core/src/parse/__tests__/yaml.unit.test.ts — "FR-MD-020: invalid YAML fails parsing"
- packages/core/src/parse/__tests__/yaml.unit.test.ts — "FR-MD-020: non-object YAML front matter is invalid"
- packages/core/src/parse/__tests__/yaml.unit.test.ts — "FR-MD-020: parses YAML objects"

## FR-MD-021 — Required top-level keys for type objects (testable=true)
Tests (2):
- packages/core/src/__tests__/spec/validateDatasetSnapshot.integration.test.ts — "FR-MD-021: fields must be an object"
- packages/core/src/__tests__/spec/validateDatasetSnapshot.integration.test.ts — "FR-MD-021: type objects must not define parent"

## FR-MD-023 — Required top-level keys for record objects (testable=true)
Tests (2):
- packages/core/src/__tests__/spec/validateDatasetSnapshot.integration.test.ts — "FR-MD-023: record objects may include parent"
- packages/core/src/__tests__/spec/validateDatasetSnapshot.integration.test.ts — "FR-MD-023: recordId must be a string identifier when present"

## FR-MD-022 — Body is raw Markdown
Tests (1):
- packages/core/src/parse/__tests__/markdownRecord.unit.test.ts — "FR-MD-022: serializer preserves raw Markdown body and updated YAML"

## PLUG-FR-001 — Plugin manifest YAML front matter is required (testable=true, verify=ci)
Tests (4):
- packages/core/src/parse/__tests__/pluginManifest.frontMatter.unit.test.ts — "PLUG-FR-001: invalid YAML yields E_YAML_INVALID"
- packages/core/src/parse/__tests__/pluginManifest.frontMatter.unit.test.ts — "PLUG-FR-001: missing closing delimiter yields E_FRONT_MATTER_UNTERMINATED"
- packages/core/src/parse/__tests__/pluginManifest.frontMatter.unit.test.ts — "PLUG-FR-001: missing opening delimiter yields E_FRONT_MATTER_MISSING"
- packages/core/src/parse/__tests__/pluginManifest.frontMatter.unit.test.ts — "PLUG-FR-001: non-object YAML yields E_YAML_NOT_OBJECT"

## PLUG-FR-002 — Required top-level keys for plugin manifests (testable=true, verify=ci)
Tests (4):
- packages/core/src/__tests__/spec/plugins.validate.integration.test.ts — "PLUG-FR-002: forbidden top-level keys fail with E_PLUGIN_KEYS_INVALID"
- packages/core/src/__tests__/spec/plugins.validate.integration.test.ts — "PLUG-FR-002: missing required keys fails with E_PLUGIN_KEYS_INVALID"
- packages/core/src/__tests__/spec/plugins.validate.integration.test.ts — "PLUG-FR-002: plugin-valid-dataset passes manifest schema validation"
- packages/core/src/__tests__/spec/plugins.validate.integration.test.ts — "PLUG-FR-002: unknown top-level keys fail with E_PLUGIN_KEYS_INVALID"

## PLUG-FR-003 — Plugin manifest body is raw Markdown (testable=false)
Tests (0):
- (none)

## EXT-001 — Type/record top-level vocabulary is fixed (testable=true)
Tests (2):
- packages/core/src/__tests__/spec/reserved-vocabulary.integration.test.ts — "EXT-001: extra top-level keys are forbidden"
- packages/core/src/__tests__/spec/validateDatasetSnapshot.integration.test.ts — "EXT-001: extra top-level keys are rejected"

## EXT-002 — `fields` is open
Tests (1):
- packages/core/src/__tests__/spec/reserved-vocabulary.integration.test.ts — "EXT-002: accepts arbitrary shapes within fields"

## TYPE-001 — Types are defined by type objects (testable=true)
Tests (1):
- packages/core/src/model/__tests__/ids.unit.test.ts — "TYPE-001: type object without recordId is valid"

## TYPE-002 — typeId uniqueness (testable=true)
Tests (1):
- packages/core/src/model/__tests__/ids.unit.test.ts — "TYPE-002: duplicate typeId fails validation"

## TYPE-004 — fieldDefs shape (testable=true)
Tests (1):
- packages/core/src/__tests__/spec/gaps.integration.test.ts — "TYPE-004: fieldDefs must be map of objects; required must be boolean when present"

## TYPE-COMP-001 — composition shape (testable=true)
Tests (2):
- packages/core/src/__tests__/spec/composition.integration.test.ts — "TYPE-COMP-001: composition component must include required boolean"
- packages/core/src/__tests__/spec/composition.integration.test.ts — "TYPE-COMP-001: composition must be a map with only typeId + required"

## REL-001 — Record relationships use composite wiki-links (testable=true)
Tests (1):
- packages/core/src/parse/__tests__/wikiRefs.unit.test.ts — "REL-001: legacy blob references are not treated as record relationships"

## REL-002 — Where record relationships are extracted (testable=true)
Tests (2):
- packages/core/src/graph/__tests__/graph.unit.test.ts — "REL-002: does not synthesize links across separate string values"
- packages/core/src/graph/__tests__/graph.unit.test.ts — "REL-002: extracts record links from bodies and fields"

## REL-003 — Record reference normalization (testable=true)
Tests (2):
- packages/core/src/parse/__tests__/wikiRefs.unit.test.ts — "REL-003: extracts record references from wiki-link tokens"
- packages/core/src/parse/__tests__/wikiRefs.unit.test.ts — "REL-003: ignores malformed record tokens and aliases"

## REL-004 — Preservation: do not rewrite link spellings (testable=false)
Tests (0):
- (none)

## REL-005 — Graphdown-created relationships are serialized as wiki-links (testable=true)
Tests (2):
- apps/web/src/utils/__tests__/wikiRefStrings.unit.test.ts — "REL-005: writeRef writes wiki-links"
- apps/web/src/utils/__tests__/wikiRefStrings.unit.test.ts — "REL-005: writeRefs writes wiki-link arrays"

## REL-007 — Only composite wiki-links are relationships in core (testable=true)
Tests (1):
- apps/web/src/utils/__tests__/wikiRefStrings.unit.test.ts — "REL-007: readRef/readRefs return cleaned ids from legacy shapes"

## CID-REF-001 — Block references use CID wiki-link tokens (testable=true)
Tests (2):
- packages/core/src/__tests__/spec/blocks.integration.test.ts — "CID-REF-001: split strings do not synthesize CID references"
- packages/core/src/parse/__tests__/wikiRefs.unit.test.ts — "CID-REF-001: extracts CID references"

## CID-REF-002 — CID reference normalization is strict (testable=true)
Tests (1):
- packages/core/src/parse/__tests__/wikiRefs.unit.test.ts — "CID-REF-002: ignores non-CID tokens"

## HIER-001 — Record hierarchy uses explicit parent pointers (testable=true)
Tests (1):
- packages/core/src/__tests__/spec/validateDatasetSnapshot.integration.test.ts — "HIER-001: parent missing and parent null both define hierarchy roots"

## VAL-001 — Type/records/plugins/blocks must be internally consistent
Tests (1):
- apps/web/src/state/__tests__/DatasetContext.unit.test.tsx — "VAL-001: invalid datasets are reported as dataset_invalid"

## VAL-002 — Identity uniqueness rules (testable=true)
Tests (2):
- packages/core/src/__tests__/spec/validateDatasetSnapshot.integration.test.ts — "VAL-002: duplicate record identity fails validation"
- packages/core/src/graph/__tests__/graph.unit.test.ts — "VAL-002: duplicate record identity fails Record Link Graph build"

## VAL-003 — Record objects must reference an existing type (testable=true)
Tests (1):
- packages/core/src/__tests__/spec/validateDatasetSnapshot.integration.test.ts — "VAL-003: record referencing missing type fails validation"

## VAL-005 — Required fields (schema-driven)
Tests (1):
- packages/core/src/__tests__/spec/validateDatasetSnapshot.integration.test.ts — "VAL-005: required fields enforced when fieldDefs.required = true"

## VAL-006 — No semantic validation of values
Tests (1):
- packages/core/src/__tests__/spec/validateDatasetSnapshot.integration.test.ts — "VAL-006: semantic validation of field values is not enforced"

## VAL-COMP-001 — Composition referenced types must exist
Tests (1):
- packages/core/src/__tests__/spec/composition.integration.test.ts — "VAL-COMP-001: composition referenced types must exist"

## VAL-COMP-002 — Required components must be satisfied by outgoing record links
Tests (3):
- packages/core/src/__tests__/spec/composition.integration.test.ts — "VAL-COMP-002: link to wrong type does not satisfy requirement"
- packages/core/src/__tests__/spec/composition.integration.test.ts — "VAL-COMP-002: missing required component link fails"
- packages/core/src/__tests__/spec/composition.integration.test.ts — "VAL-COMP-002: required component link resolves to correct type"

## VAL-PARENT-001 — Parent field shape is strict (testable=true)
Tests (1):
- packages/core/src/__tests__/spec/validateDatasetSnapshot.integration.test.ts — "VAL-PARENT-001: invalid parent shapes fail validation"

## VAL-PARENT-002 — Parent pointers must resolve (testable=true)
Tests (1):
- packages/core/src/__tests__/spec/validateDatasetSnapshot.integration.test.ts — "VAL-PARENT-002: parent pointers must resolve to an existing record"

## VAL-PARENT-003 — Record hierarchy must be acyclic (testable=true)
Tests (2):
- packages/core/src/__tests__/spec/validateDatasetSnapshot.integration.test.ts — "VAL-PARENT-003: parent pointer cycles fail validation"
- packages/core/src/__tests__/spec/validateDatasetSnapshot.integration.test.ts — "VAL-PARENT-003: parent pointer self-cycle fails validation"

## VAL-PLUG-001 — Plugin manifests must parse and satisfy PLUG-FR-002 (testable=true, verify=todo)
Tests (1):
- packages/core/src/__tests__/spec/plugins.validate.integration.test.ts — "VAL-PLUG-001: plugin-valid-dataset validates successfully"

## VAL-PLUG-002 — pluginId must be unique (testable=true, verify=todo)
Tests (1):
- packages/core/src/__tests__/spec/plugins.validate.integration.test.ts — "VAL-PLUG-002: duplicate pluginId fails validation"

## VAL-PLUG-003 — Plugin entry must exist and be included (testable=true, verify=todo)
Tests (1):
- packages/core/src/__tests__/spec/plugins.validate.integration.test.ts — "VAL-PLUG-003: entry must appear in files list"

## VAL-PLUG-004 — Plugin bundle file paths must resolve safely and exist (testable=true, verify=todo)
Tests (1):
- packages/core/src/__tests__/spec/plugins.validate.integration.test.ts — "VAL-PLUG-004: unsafe relative paths are rejected"

## VAL-PLUG-005 — Plugin bundle files must be UTF-8 decodable (testable=true, verify=todo)
Tests (1):
- packages/core/src/__tests__/spec/plugins.validate.integration.test.ts — "VAL-PLUG-005: plugin bundle files must be UTF-8 decodable"

## VAL-PLUG-006 — Plugin bundle must not contain reserved export paths (testable=true, verify=todo)
Tests (1):
- packages/core/src/__tests__/spec/plugins.validate.integration.test.ts — "VAL-PLUG-006: files must not include reserved manifest.md"

## VAL-PLUG-007 — Plugin-declared block dependencies must be valid CIDs (testable=true, verify=todo)
Tests (1):
- packages/core/src/__tests__/spec/plugins.validate.integration.test.ts — "VAL-PLUG-007: blocks must contain valid CID strings"

## VAL-PLUG-008 — Plugin-declared block dependencies must resolve to matching block bytes (testable=true, verify=todo)
Tests (1):
- packages/core/src/__tests__/spec/plugins.validate.integration.test.ts — "VAL-PLUG-008: plugin-declared blocks must resolve to matching block bytes"

## VAL-CID-001 — Invalid CID-shaped block reference tokens fail validation (testable=true)
Tests (1):
- packages/core/src/__tests__/spec/blocks.integration.test.ts — "VAL-CID-001: invalid CID-shaped tokens fail validation"

## VAL-BLOCK-001 — Block references must resolve to matching block bytes (testable=true)
Tests (1):
- packages/core/src/__tests__/spec/blocks.integration.test.ts — "VAL-BLOCK-001: referenced block must exist"

## VAL-BLOCK-002 — Block store files must match their CID digest (testable=true)
Tests (1):
- packages/core/src/__tests__/spec/blocks.integration.test.ts — "VAL-BLOCK-002: block bytes must match referenced CID digest"

## GC-001 — Reachable block set is computed from declared block dependencies (testable=true)
Tests (2):
- apps/web/src/features/export/__tests__/exportZip.unit.test.ts — "GC-001: reachable block set includes references from fields"
- packages/core/src/__tests__/spec/plugins.gc.integration.test.ts — "GC-001: plugin-declared blocks are included in the reachable set"

## GC-002 — Unreferenced blocks are garbage and are excluded from canonical dataset export (testable=true)
Tests (2):
- packages/core/src/__tests__/spec/plugins.gc.integration.test.ts — "GC-002: export excludes blocks not referenced by records or plugin blocks"
- packages/core/src/__tests__/spec/roundtrip.integration.test.ts — "GC-002: export excludes unreferenced blocks"

## GC-003 — Garbage blocks do not make a dataset invalid (testable=true)
Tests (2):
- packages/core/src/__tests__/spec/blocks.integration.test.ts — "GC-003: unreferenced but valid blocks do not fail validation"
- packages/core/src/__tests__/spec/plugins.gc.integration.test.ts — "GC-003: garbage blocks do not make dataset invalid (with plugins present)"

## ERR-001 — File-specific errors when possible
Tests (1):
- packages/core/src/validate/__tests__/errors.unit.test.ts — "ERR-001: validation errors expose stable fields"

## ERR-002 — Clear failure categories for GitHub import
Tests (3):
- apps/web/e2e/app.e2e.spec.js — "ERR-002: shows invalid_url category for unsupported GitHub URLs (e2e)"
- apps/web/src/state/__tests__/DatasetContext.unit.test.tsx — "ERR-002: maps GitHub 404 repo responses to not_found"
- apps/web/src/state/__tests__/DatasetContext.unit.test.tsx — "ERR-002: maps GitHub rate limits to rate_limited"

## GH-001 — Supported URL forms
Tests (5):
- apps/web/src/import/github/__tests__/parseGitHubUrl.unit.test.ts — "GH-001: accepts /tree/<ref> URLs"
- apps/web/src/import/github/__tests__/parseGitHubUrl.unit.test.ts — "GH-001: accepts https repo URLs"
- apps/web/src/import/github/__tests__/parseGitHubUrl.unit.test.ts — "GH-001: accepts repo URLs with trailing slash and .git"
- apps/web/src/import/github/__tests__/parseGitHubUrl.unit.test.ts — "GH-001: accepts scheme-less repo URLs"
- apps/web/src/import/github/__tests__/parseGitHubUrl.unit.test.ts — "GH-001: rejects malformed, non-github, or unsupported URLs"

## GH-002 — Default ref resolution
Tests (1):
- apps/web/src/import/github/__tests__/loadGitHubSnapshot.unit.test.ts — "GH-002: falls back to main when default_branch is missing"

## GH-003 — Recursive listing + raw fetch
Tests (2):
- apps/web/e2e/app.e2e.spec.js — "GH-003: imports GitHub repos via tree API + raw fetch (e2e)"
- apps/web/src/state/__tests__/DatasetContext.unit.test.tsx — "GH-003: imports a dataset snapshot via tree listing + raw fetch"

## GH-005 — Reject subdirectory URLs
Tests (1):
- apps/web/src/import/github/__tests__/parseGitHubUrl.unit.test.ts — "GH-005: rejects /tree/<ref>/<subdir> URLs"

## GH-008 — Public repo import requires no auth
Tests (1):
- apps/web/src/import/github/__tests__/loadGitHubSnapshot.unit.test.ts — "GH-008: does not send Authorization headers for public fetches"

## IMP-PLUG-001 — Importers must include plugin manifests and bundles (testable=true, verify=todo)
Tests (2):
- apps/web/src/import/__tests__/readZipSnapshot.plugins.integration.test.ts — "IMP-PLUG-001: includes plugin manifest and bundle files in the snapshot"
- apps/web/src/import/github/__tests__/loadGitHubSnapshot.plugins.integration.test.ts — "IMP-PLUG-001: fetches plugin bundles (including non-md) and includes them in snapshot.files"

## EXP-003 — Canonical dataset export
Tests (3):
- apps/web/src/features/export/__tests__/exportZip.unit.test.ts — "EXP-003: canonical dataset export excludes non-graph files"
- apps/web/src/features/export/__tests__/exportZip.unit.test.ts — "EXP-003: canonical dataset export ignores imported record/type file paths"
- packages/core/src/__tests__/spec/roundtrip.integration.test.ts — "EXP-003: canonical dataset export round-trips bytes and graph"

## EXP-006 — Canonical dataset export includes reachable blocks (testable=true)
Tests (3):
- apps/web/src/features/export/__tests__/exportZip.plugins.integration.test.ts — "EXP-006: includes plugin-declared blocks even when records do not reference them"
- apps/web/src/features/export/__tests__/exportZip.unit.test.ts — "EXP-006: includes only referenced blocks alongside canonical records/types"
- packages/core/src/__tests__/spec/roundtrip.integration.test.ts — "EXP-006: export includes reachable blocks"

## EXP-HIER-001 — Canonical parent-based export layout (testable=true)
Tests (1):
- apps/web/src/features/export/__tests__/exportZip.unit.test.ts — "EXP-HIER-001: export uses canonical layout paths"

## EXP-PLUG-001 — Canonical plugin export layout (testable=true, verify=todo)
Tests (1):
- apps/web/src/features/export/__tests__/exportZip.plugins.integration.test.ts — "EXP-PLUG-001: exports plugin bundles in canonical layout with exact bytes"

## EXP-005 — Content preservation (no “reformat the universe”)
Tests (1):
- apps/web/src/features/export/__tests__/exportZip.unit.test.ts — "EXP-005: export preserves bytes exactly"

## UI-001 — Desktop + mobile usable (testable=false)
Tests (0):
- (none)

## UI-004 — Consistent CRUD + relationship affordances (testable=false)
Tests (0):
- (none)

## NFR-001 — No full reloads for CRUD (testable=true)
Tests (1):
- apps/web/src/state/__tests__/DatasetContext.nfr.integration.test.tsx — "NFR-001: CRUD actions do not trigger a full document load event"

## NFR-PERSIST-001 — Web persistence requires IndexedDB (testable=true)
Tests (1):
- apps/web/src/state/__tests__/DatasetContext.unit.test.tsx — "NFR-PERSIST-001: reports persistence_unavailable when IndexedDB is missing"

## NFR-010 — Read-only offline after initial load (testable=true)
Tests (1):
- apps/web/src/state/__tests__/DatasetContext.nfr.integration.test.tsx — "NFR-010: uses persisted dataset for read-only access when offline"

## UI-RAW-001 — Schema-agnostic record editor (testable=true)
Tests (3):
- apps/web/src/components/__tests__/RecordEditor.raw.unit.test.tsx — "UI-RAW-001: edits arbitrary fields without kind semantics"
- apps/web/src/components/__tests__/RecordEditor.raw.unit.test.tsx — "UI-RAW-001: edits fields outside any schema and persists them"
- apps/web/src/components/__tests__/RecordEditor.raw.unit.test.tsx — "UI-RAW-001: removes fields when YAML omits them"

## NFR-030 — Plugins must not require core modification (testable=false)
Tests (0):
- (none)

## NFR-031 — New field kinds without rewriting CRUD (testable=false)
Tests (0):
- (none)

## PLUG-UTIL-001 — Core exposes deterministic plugin object discovery (testable=true)
Tests (1):
- packages/core/src/__tests__/pluginObjects.discoveryUtility.unit.test.ts — "PLUG-UTIL-001: discovers plugin manifests + resolves bundle paths deterministically (sorted by manifest path)"

## API-V1-000 — Runtime API v1 conformance scope (testable=false)
Tests (0):
- (none)

## API-001 — Runtime API is explicitly versioned (testable=true)
Tests (1):
- packages/core/src/runtime/__tests__/runtimeApiV1.unit.test.ts — "API-001: runtime api v1 is explicitly versioned"

## API-002 — Capabilities are discoverable (testable=true)
Tests (1):
- packages/core/src/runtime/__tests__/runtimeApiV1.unit.test.ts — "API-002: capabilities are discoverable and include gd.api.read"

## API-003 — All Runtime API operations are asynchronous (testable=false)
Tests (1):
- packages/core/src/runtime/__tests__/runtimeApiV1.unit.test.ts — "API-003: all Runtime API operations are asynchronous (thenable)"

## API-004 — Runtime API addresses objects by Graphdown identities (testable=true)
Tests (1):
- packages/core/src/runtime/__tests__/runtimeApiV1.unit.test.ts — "API-004: runtime api methods are identity-addressed and path-independent"

## API-005 — Runtime API payloads are structured-clone compatible (testable=false)
Tests (1):
- packages/core/src/runtime/__tests__/runtimeApiV1.unit.test.ts — "API-005: Runtime API payloads are structured-clone compatible"

## API-ERR-001 — Errors are structured and include stable codes (testable=false)
Tests (3):
- packages/core/src/runtime/__tests__/runtimeApiV1.errors.unit.test.ts — "API-ERR-001: getBlockBytes missing block rejects with structured error + file + hint"
- packages/core/src/runtime/__tests__/runtimeApiV1.errors.unit.test.ts — "API-ERR-001: invalid CID argument rejects with structured error"
- packages/core/src/runtime/__tests__/runtimeApiV1.errors.unit.test.ts — "API-ERR-001: open fails with structured error when structuredClone is unavailable"

## API-SESSION-001 — Runtime API can open a session from a snapshot (testable=false)
Tests (0):
- (none)

## API-SESSION-002 — Read operations are side-effect free (testable=false)
Tests (5):
- packages/core/src/runtime/__tests__/runtimeApiV1.unit.test.ts — "API-SESSION-002: block bytes are returned as copies"
- packages/core/src/runtime/__tests__/runtimeApiV1.unit.test.ts — "API-SESSION-002: getType returns isolated copies"
- packages/core/src/runtime/__tests__/runtimeApiV1.unit.test.ts — "API-SESSION-002: listRecordsByType returns isolated copies"
- packages/core/src/runtime/__tests__/runtimeApiV1.unit.test.ts — "API-SESSION-002: raw bytes are returned as copies"
- packages/core/src/runtime/__tests__/runtimeApiV1.unit.test.ts — "API-SESSION-002: view getters return isolated copies (mutations do not affect subsequent reads)"

## API-SHAPE-001 — Type object view shape (testable=false)
Tests (0):
- (none)

## API-SHAPE-002 — Record object view shape (testable=false)
Tests (0):
- (none)

## API-READ-001 — List and get type objects (testable=false)
Tests (0):
- (none)

## API-READ-002 — List and get record objects (testable=false)
Tests (0):
- (none)

## API-READ-003 — Raw Markdown access for type/record files is available (testable=false)
Tests (0):
- (none)

## API-RLG-001 — Record Link Graph adjacency is readable (testable=false)
Tests (0):
- (none)

## API-HIER-001 — Record Hierarchy (parent pointers) is readable (testable=false)
Tests (0):
- (none)

## API-COMP-001 — Type Composition Dependencies are readable (testable=false)
Tests (0):
- (none)

## API-BLOCK-001 — Block identity is CID and blocks are immutable (testable=false)
Tests (0):
- (none)

## API-BLOCK-READ-001 — Resolve block bytes by CID (testable=false)
Tests (0):
- (none)

## API-BLOCK-READ-002 — Block existence check by CID (testable=false)
Tests (0):
- (none)

## API-BLOCK-READ-003 — List blocks present in the snapshot (testable=false)
Tests (0):
- (none)

## API-BLOCK-REF-001 — List block references extracted from a record (testable=false)
Tests (0):
- (none)

## API-BLOCK-GC-001 — Reachable block set computation is exposed (testable=false)
Tests (0):
- (none)

## API-DET-001 — Read results are deterministic for a fixed snapshot (testable=false)
Tests (1):
- packages/core/src/runtime/__tests__/runtimeApiV1.unit.test.ts — "API-DET-001: read results are deterministic for a fixed snapshot"

## API-DET-002 — List order is stable and documented (testable=false)
Tests (1):
- packages/core/src/runtime/__tests__/runtimeApiV1.unit.test.ts — "API-DET-002: runtime api v1 listTypes + listRecordsByType return deterministic sorted views"

## API-PARK-000 — Parked requirements are capability-conditional (testable=false)
Tests (0):
- (none)

## API-WRITE-001 — Record mutations are capability-gated (testable=false)
Tests (0):
- (none)

## API-WRITE-002 — Type mutations are capability-gated (testable=false)
Tests (0):
- (none)

## API-WRITE-003 — All mutations validate the resulting dataset (testable=false)
Tests (0):
- (none)

## API-WRITE-004 — Mutations are atomic at the dataset level (testable=false)
Tests (0):
- (none)

## API-WRITE-005 — Mutations must not rewrite unrelated files (testable=false)
Tests (0):
- (none)

## API-WRITE-006 — API-created objects must serialize as valid record files (testable=false)
Tests (0):
- (none)

## API-WRITE-007 — Structured relationship editing serializes as wiki-links (testable=false)
Tests (0):
- (none)

## API-BLOCK-WRITE-001 — Block insertion by bytes returns CID (testable=false)
Tests (0):
- (none)

## API-BLOCK-WRITE-002 — Block insertion is idempotent (testable=false)
Tests (0):
- (none)

## API-BLOCK-WRITE-003 — Block deletion is constrained by validity (testable=false)
Tests (0):
- (none)

## API-BLOCK-WRITE-004 — Garbage collection mutation removes only garbage blocks (testable=false)
Tests (0):
- (none)

## API-HASH-001 — API exposes schema and snapshot fingerprints only (testable=false)
Tests (0):
- (none)

## API-EXP-001 — API can produce canonical dataset export bytes (testable=false)
Tests (0):
- (none)

## API-EVENT-001 — API provides change notifications (testable=false)
Tests (0):
- (none)

## API-TXN-001 — API supports explicit transactions (testable=false)
Tests (0):
- (none)

## API-QUERY-001 — No required text query language (testable=false)
Tests (0):
- (none)
