# Graphdown Dataset Validity Specification

**Spec Version:** 0.1
**Last Updated:** 2025-12-28

This specification defines the authoritative validity rules for Graphdown datasets.
It describes the required structure, record formats, and integrity constraints that
must be met for a dataset to be considered valid. Dataset authors and tooling
implementers should use this document as the canonical reference when creating or
validating Graphdown datasets.

## Definitions

- **Dataset root**: The top-level directory that contains the Graphdown dataset.
- **Dataset record**: The single record that describes the dataset itself, stored
  under `datasets/`.
- **Type record**: A record that defines a record type, stored under `types/`.
- **Data record**: A record that represents domain data, stored under `records/`.
- **Markdown record file**: A `.md` file that contains a record represented as YAML
  front matter plus Markdown body content.
- **YAML front matter**: The YAML metadata block at the start of a Markdown record
  file, delimited by `---` lines.
- **Record ID**: The `id` field that uniquely identifies a record across the dataset.
- **Record type ID** (`recordTypeId`): The identifier stored in
  `fields.recordTypeId` on a type record, used to name record directories under
  `records/`.
- **Wiki-link** (`[[id]]`): A reference syntax that may appear in Markdown bodies
  or fields; normalization rules are anticipated but not fully enforced yet.

## File eligibility

- Only files ending in `.md` are considered Markdown record files.
- Non-`.md` files are ignored by validators/loaders for record purposes, but may
  exist within the dataset repository.

## Required directory layout

- The dataset root MUST contain the following directories:
  - `datasets/`
  - `types/`
  - `records/`
- `datasets/` MUST contain exactly one dataset record `.md` file.

## Markdown record format

Every Markdown record file MUST use YAML front matter with this structure:

```
---
<yaml object>
---
<markdown body>
```

Import/validation MUST fail if:

- the front matter is missing,
- the YAML is invalid, or
- the YAML parses to a non-object (array/string/null).

## Required fields (record shape)

Every record MUST define the following fields in its YAML front matter:

- `id` (string)
- `datasetId` (string)
- `typeId` (string)
- `createdAt` (string timestamp)
- `updatedAt` (string timestamp)
- `fields` (object/map)

Timestamp expectations:

- `createdAt` and `updatedAt` MUST be non-empty strings.
- ISO-8601 timestamps are RECOMMENDED, but not yet required by this spec.

## Dataset record validity

The dataset record MUST satisfy all of the following:

- `id` MUST start with `dataset:`
- `datasetId` MUST equal `id`
- `typeId` MUST equal `sys:dataset`
- `fields.name` MUST exist and be a non-empty string
- `fields.description` MUST exist and be a non-empty string

## Type record validity

Type records MUST satisfy all of the following:

- Stored under `types/` (nesting is allowed)
- `id` MUST start with `type:`
- `typeId` MUST equal `sys:type`
- `datasetId` MUST match the dataset record `id`
- `fields.recordTypeId` MUST exist and be a string
- Each `fields.recordTypeId` MUST be unique across all type records

Type records SHOULD also include:

- `fields.displayName`
- `fields.pluralName`

Type records MAY include:

- `fields.fieldDefs` (schema-driven UI support; not required yet)

## Data record validity

For records under `records/`:

- Every directory under `records/` is a **record type directory**.
- Each record type directory name MUST match a defined `fields.recordTypeId` from a
  type record.

For each record file under `records/<recordTypeId>/`:

- `typeId` MUST equal the directory name `<recordTypeId>`
- `datasetId` MUST equal the dataset record `id`
- required fields (`id`, timestamps, `fields`) MUST exist

## Global integrity rules

- All record IDs MUST be globally unique across the dataset record, type records,
  and data records.
- Validators MUST report duplicates as errors.
- Unknown `records/<dir>` directories without a corresponding type definition MUST
  fail validation.

## Error reporting requirements (spec-level)

Validators MUST:

- report file-specific errors when possible (path + message), and
- differentiate structural errors (layout, required directories, duplicates) from
  per-file parsing errors (front matter, YAML parsing).

## Compatibility and forward evolution

- Spec versioning policy:
  - While the spec is in the 0.x series, changes may be introduced without a major
    version bump.
  - Starting with 1.0, breaking changes MUST require a major version bump.

Likely future changes include:

- ID normalization for wiki-links (`[[id]]`)
- reference field normalization (single value vs array)
- export path stability requirements
