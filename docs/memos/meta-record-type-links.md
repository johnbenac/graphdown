# Meta record-type links — assessment & counterfactual design

This memo discusses *type-level dependency ideas* beyond the current core standard.

## Current behavior (SPEC v0.4 + implementation)

### Relationships are record-to-record only
- SPEC §8 (REL-001/002/003/004/005/007) defines **record relationships** only via wiki-link tokens:
  - `[[typeId:recordId]]`
- Relationships are extracted from:
  - record bodies
  - and any string value anywhere inside record `fields` (REL-002)
- Type objects are not scanned for relationships (REL-002).

In implementation terms, the UI builds and uses the **Record Link Graph**:
- `packages/core/src/graph/graph.ts`

### Parent hierarchy is separate and structural
- Record hierarchy is defined only by the top-level YAML key `parent` (HIER-001).
- Parent pointers must resolve and must be acyclic (VAL-PARENT-002/003).
- Parent pointers are **not** record relationships under REL-001.

### Type composition already exists (type-level dependencies)
- Type objects may declare `fields.composition` (TYPE-COMP-001), which creates **Type Composition Dependencies** (type -> component type).
- Required components are enforced via outgoing record links to existing records of the required type (VAL-COMP-002).

So: there is no “type-to-type link graph” in the same sense as the Record Link Graph, but there *is* a schema-driven type dependency mechanism (composition).

## Counterfactual: “meta” type dependencies beyond composition
Goal: allow a type to declare richer expectations on related records so creation/editing can prompt/validate related records more strongly than today.

### Design options
1) **Suggestive dependencies (UI-only)**
   - Add optional metadata inside type `fields` used only for UI suggestions.
   - No validator changes; backward compatible; zero impact on existing datasets.

2) **Soft validation + UX scaffolding**
   - Validator emits warnings (not errors) if a record lacks suggested links.
   - UI nudges users to create/link recommended records.

3) **Hard validation (new integrity rules)**
   - Extend SPEC with new MUST requirements that enforce stronger constraints than current composition.
   - Validator fails import when constraints are not satisfied.

### Touchpoints if we implement stronger type-level dependencies
- **Spec**: new requirement IDs under Types/Relationships; clarify whether they are suggestions, warnings, or hard MUST rules.
- **Validator**: `packages/core/src/validate/validateDatasetSnapshot.ts`
- **Graph/index**: likely unchanged unless new constraints require additional derived indexes.
- **UI**: record creation/edit flows could surface “required/suggested related records” status.

## Recommendation
- Start with **UI-only suggestions** to explore UX without breaking datasets.
- If stronger guarantees are needed, introduce **warnings** first and only then consider new hard validation requirements with new SPEC IDs.
