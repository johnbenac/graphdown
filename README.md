# Graphdown Validator

A validator for Markdown-canonical datasets following the Graphdown specification.

## Overview

This tool validates the structure and contents of Graphdown datasets - data stored as Markdown files with YAML front matter, organized into a graph-like structure with types and records.

## Specification

Graphdown datasets are defined by the Graphdown Dataset Validity Specification.

**Spec Version:** 0.1 (see [`docs/spec/dataset-validity.md`](docs/spec/dataset-validity.md))

## Features

- Validates dataset structure and organization
- Ensures Markdown files include YAML front matter
- Checks record metadata consistency and uniqueness

## Requirements

- **Node.js** (v20 or higher)

## Usage

Install dependencies and build the CLI:

```bash
npm ci
npm run build
```

Run the CLI locally:

```bash
node dist/cli.js validate <datasetPath>
```

You can also invoke it as a package (once published or via `npm link`):

```bash
npx graphdown validate <datasetPath>
```

### Examples

```bash
# Validate a local dataset
node dist/cli.js validate ./my-dataset

# Explicit human-readable output
node dist/cli.js validate ./my-dataset --pretty

# Machine-readable output
node dist/cli.js validate ./my-dataset --json

# Validate an example dataset
node dist/cli.js validate ../product-tracker-dataset
```

### Output

If the dataset is valid:
```
Validation passed: dataset is valid.
```

If there are errors:
```
Validation failed with 2 error(s):
 - [E_DIR_MISSING] Missing required `datasets/` directory
   hint: Ensure dataset root contains datasets/, types/, and records/.
 - [E_ID_PREFIX_INVALID] Dataset id must be a string beginning with "dataset:"
 ...
```

For machine-readable output, pass `--json`:

```json
{"ok":false,"errors":[{"code":"E_DIR_MISSING","message":"Missing required `datasets/` directory","file":null,"hint":"Ensure dataset root contains datasets/, types/, and records/."}]}
```

## Dataset Structure

Example layout:

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

For the authoritative validity rules, refer to the Graphdown Dataset Validity Specification:
[`docs/spec/dataset-validity.md`](docs/spec/dataset-validity.md).

## Example Datasets

See the companion repositories for working examples:
- `product-tracker-dataset` - Project management example
- `research-lab-dataset` - Academic research example
