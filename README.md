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
node dist/cli.js validate <datasetPath|githubUrl> [--ref <ref>] [--subdir <path>]
```

You can also invoke it as a package (once published or via `npm link`):

```bash
npx graphdown validate <datasetPath|githubUrl> [--ref <ref>] [--subdir <path>]
```

Choose the output mode:

```bash
# Human mode (default)
graphdown validate ./my-dataset

# Explicit human mode
graphdown validate ./my-dataset --pretty

# Machine-readable mode
graphdown validate ./my-dataset --json

# GitHub URL validation
graphdown validate https://github.com/owner/repo --json
graphdown validate https://github.com/owner/repo/tree/main/path/to/dataset --pretty
graphdown validate https://github.com/owner/repo --ref main --subdir path/to/dataset
```

### Examples

```bash
# Validate a local dataset
node dist/cli.js validate ./my-dataset

# Validate an example dataset
node dist/cli.js validate ../product-tracker-dataset

# Validate an example dataset via GitHub URL
node dist/cli.js validate https://github.com/johnbenac/product-tracker-dataset --json
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
 - [E_FRONT_MATTER_MISSING] Front matter error: Missing YAML front matter delimiter
   file: datasets/dataset--name.md
   hint: Add YAML front matter delimited by --- at the top of the file.
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
