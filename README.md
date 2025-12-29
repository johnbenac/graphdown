# Graphdown Validator

A validator for Markdown-canonical datasets following the Graphdown specification.

## Overview

This tool validates the structure and contents of Graphdown datasets - data stored as Markdown files with YAML front matter, organized into a graph-like structure with types and records.

## Features

- Validates required directory structure (`datasets/`, `types/`, `records/`)
- Ensures proper YAML front matter in all Markdown files
- Checks required fields (id, datasetId, typeId, timestamps, fields)
- Validates ID uniqueness and consistency
- Verifies record type organization
- Enforces proper ID prefixes (`dataset:`, `type:`)

## Requirements

- **Node.js** (v12 or higher)
- **Python 3** with PyYAML library

Install PyYAML if needed:
```bash
pip install pyyaml
```

## Usage

```bash
node validateDataset.js <datasetPath>
```

### Examples

```bash
# Validate a local dataset
node validateDataset.js ./my-dataset

# Validate an example dataset
node validateDataset.js ../product-tracker-dataset
```

### Output

If the dataset is valid:
```
Validation passed: dataset is valid.
```

If there are errors:
```
Validation failed with the following errors:
 - Missing required `datasets/` directory
 - Dataset id must be a string beginning with "dataset:"
 ...
```

## Dataset Structure

A valid Graphdown dataset must have:

```
dataset-root/
├── datasets/
│   └── dataset--name.md          # Exactly one dataset definition
├── types/
│   ├── type--foo.md               # Type definitions
│   └── type--bar.md
└── records/
    ├── foo/                       # Directory per recordTypeId
    │   └── record-1.md
    └── bar/
        └── record-2.md
```

### File Format

All files must be Markdown with YAML front matter:

```markdown
---
id: "dataset:example"
datasetId: "dataset:example"
typeId: "sys:dataset"
createdAt: 2025-12-28T00:00:00Z
updatedAt: 2025-12-28T00:00:00Z
fields:
  name: "Example Dataset"
  description: "An example dataset"
---

# Dataset Body

Markdown content goes here.
```

## Validation Rules

### Dataset Record
- Must have exactly one `.md` file in `datasets/`
- `id` must start with `"dataset:"`
- `datasetId` must equal `id`
- `typeId` must be `"sys:dataset"`
- Must have `createdAt` and `updatedAt` timestamps
- Must have `fields.name` and `fields.description`

### Type Records
- `id` must start with `"type:"`
- `typeId` must be `"sys:type"`
- `datasetId` must match the dataset's `id`
- Must have `fields.recordTypeId` (defines the record type this describes)
- All type IDs must be unique

### Data Records
- Must be in `records/<typeId>/` subdirectories
- Directory name must match a defined `recordTypeId`
- `typeId` must match the containing directory name
- `datasetId` must match the dataset's `id`
- Must have `createdAt` and `updatedAt` timestamps
- Must have `fields` object

### Global Rules
- All IDs must be unique across the entire dataset
- All Markdown files must have valid YAML front matter
- YAML must parse to a valid object

## Example Datasets

See the companion repositories for working examples:
- `product-tracker-dataset` - Project management example
- `research-lab-dataset` - Academic research example
