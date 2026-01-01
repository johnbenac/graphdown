# Meta record-type links — assessment & counterfactual design

## Current behavior (spec + implementation)
- SPEC §8 (REL-001/002/003/004/005) defines relationships **between records only** via wiki-links or `ref`/`refs` values inside record YAML; no type-to-type link concept.
- Type records (SPEC §7) describe schema per `recordTypeId`; `fieldDefs` may include `kind: ref` / `ref[]` with optional UI hints (`refTypeHints`), but these are **not enforced associations**—they guide UI.
- Core graph builder (`src/core/graph.ts`) extracts links from record bodies/YAML; `GraphTypeDef` only stores `recordTypeId`, `typeRecordId`, `fields`; there is no type-level linking.
- Validator (`src/core/validateDatasetSnapshot.ts`) enforces per-record invariants (id uniqueness, typeId alignment, directory layout) and schema optionality; it does **not** validate type-to-type constraints.
- Web UI (`apps/web/src/components/RecordEditor.tsx`, `RecordViewer.tsx`, `TypeNav.tsx`) renders per-record fields and links; there is no UI for type-level associations.
- Golden datasets (`product-tracker-dataset`, `research-lab-dataset`) use record-level refs/wiki-links; type files include `refTypeHints` for UI but no cross-type linkage.

## Counterfactual: meta record types (e.g., “car” requires “engine” + “chassis”)
Goal: allow a type to declare dependencies on other types so creating/editing a record can prompt/validate related records.

### Design options
1) **Suggestive composition (UI-only)**  
   - Add optional type metadata (e.g., `fields.requiredTypes: [engine, chassis]` or a new `requiresRecordTypes` list) used to **suggest** related records when creating a “car”.  
   - No validator changes; backward compatible; zero impact on existing datasets.

2) **Soft validation + UX scaffolding**  
   - Type metadata declares expected related types; validator emits warnings (not errors) if a “car” record lacks links to required types.  
   - UI nudges users to create/link required records; no hard failures to preserve compatibility.

3) **Hard validation (composition as integrity rule)**  
   - Extend spec with new MUST (e.g., “CAR-001: records of type car MUST link ≥1 engine and ≥1 chassis”).  
   - Validator checks presence of required links; import/export and CLI would fail on missing associations.  
   - Highest risk of breaking existing datasets; needs gated rollout and new requirement IDs.

### Touchpoints if we implement type-level dependencies
- **Spec**: new requirement IDs under Types/Relationships defining type-level composition semantics; clarify whether they are suggestions, warnings, or hard MUST.
- **Type schema parsing**: `apps/web/src/schema/typeSchema.ts` to accept/shape new metadata (e.g., `requiredRecordTypes` or a structured composition object).
- **Validator**: `src/core/validateDatasetSnapshot.ts` to surface warnings/errors when records of a type lack mandated links; new error codes if enforced.
- **Graph model**: `src/core/graph.ts` `GraphTypeDef` may need to carry dependency metadata; link extraction stays record-based unless composition auto-creates links.
- **UI**: `RecordEditor.tsx`, `RecordViewer.tsx`, creation flows to prompt for required related records, pre-filter link pickers by required types, and display composition status.
- **CLI**: `src/cli/output.ts` to include any new warning/error codes for unmet type dependencies.
- **Tests/fixtures**: update core/web tests and sample datasets to include type-level dependency metadata and example records satisfying them.

## Recommendation
- Start with **Option 1 (UI-only suggestions)** to avoid breaking existing datasets while exploring UX; emit metadata in type schema and use UI hints only.
- If stronger guarantees are needed, introduce **warnings first** (Option 2) behind a feature flag and **add new SPEC IDs** before enforcing (Option 3).
- Keep relationships fundamentally record-to-record to stay compatible with current spec and golden datasets; treat type dependencies as metadata that drives UX/validation.
