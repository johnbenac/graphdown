# @graphmd/io

The `@graphmd/io` package provides **framework-agnostic import utilities** for GraphMD datasets. It handles semantic file selection, plugin bundle resolution, and provides types and error handling for dataset import operations.

## Install

```bash
npm install @graphmd/io
```

## Usage

### Select semantic files from a snapshot

The main export is `selectSemanticSnapshotFiles`, which filters a raw file collection to include only GraphMD records, blocks, and required plugin bundles:

```ts
import { selectSemanticSnapshotFiles } from '@graphmd/io';

const entries = new Map<string, Uint8Array>([
  ['types/note.md', new TextEncoder().encode('---\ntypeId: note\nfields: {}\n---\n')],
  ['records/note-one.md', new TextEncoder().encode('---\ntypeId: note\nrecordId: one\nfields: {}\n---\n')],
  ['blocks/sha2-256/ab/cd/abcd1234...', new Uint8Array([1, 2, 3])],
  ['docs/readme.md', new TextEncoder().encode('# Documentation')],
  ['assets/logo.png', new Uint8Array([137, 80, 78, 71])],
]);

const result = selectSemanticSnapshotFiles(entries);

// result.snapshot.files contains only GraphMD semantic files:
// - types/note.md
// - records/note-one.md
// - blocks/sha2-256/ab/cd/abcd1234...

// result.ignored contains non-semantic files:
// - docs/readme.md
// - assets/logo.png
```

### Handle plugin bundles

The function automatically detects plugin manifests and resolves their bundle dependencies:

```ts
const entries = new Map<string, Uint8Array>([
  ['types/widget.md', pluginManifestBytes], // Contains plugin: { bundle: "./widget.js" }
  ['widget.js', bundleBytes],
  ['types/note.md', regularTypeBytes],
]);

const result = selectSemanticSnapshotFiles(entries);

// result.pluginManifestPaths lists detected plugin manifests
// result.requiredPluginBundlePaths lists all required bundles
// result.missingPluginBundlePaths lists bundles that weren't found
// result.snapshot.files includes both the manifest and resolved bundles
```

### Import types and error handling

```ts
import type {
  ImportResult,
  ImportErrorInfo,
  ImportErrorCode,
  ImportSource,
  ImportProgress,
  SemanticSelectionResult
} from '@graphmd/io';
import { ImportError, isImportError } from '@graphmd/io';

// Check if an error is an ImportError
try {
  // ... import operation
} catch (error) {
  if (isImportError(error)) {
    console.error('Import failed:', error.info.code);
    if (error.info.source === 'github') {
      console.error('GitHub import error:', error.info.message);
    }
  }
}

// Create an ImportError
const errorInfo: ImportErrorInfo = {
  source: 'zip',
  code: 'missing_files',
  message: 'Required files not found in archive',
  missingPaths: ['types/note.md'],
};

throw new ImportError(errorInfo);
```

## API Surface

### Functions

- **`selectSemanticSnapshotFiles(entries: Map<string, Uint8Array>): SemanticSelectionResult`**

  Filters a raw file collection to include only GraphMD semantic files (records, blocks, and plugin bundles). Returns a result object with the filtered snapshot and metadata about ignored files and plugins.

### Types

- **`SemanticSelectionResult`** — Result of semantic file selection with snapshot, ignored paths, and plugin metadata
- **`ImportResult`** — Standard result type for import operations
- **`ImportErrorInfo`** — Structured error information for import failures
- **`ImportErrorCode`** — Union type of error codes: `"not_found" | "auth_required" | "rate_limited" | "missing_files" | "invalid_input" | "unknown"`
- **`ImportSource`** — Import source type: `"zip" | "github"`
- **`ImportProgress`** — Progress tracking for multi-phase import operations

### Error Handling

- **`ImportError`** — Error class for import failures with structured `info` property
- **`isImportError(error: unknown): error is ImportError`** — Type guard for ImportError instances

## Design Principles

### Framework Agnostic

This package is designed to work in any JavaScript environment and does not depend on Node.js, React, or any UI framework. It uses conditional runtime detection for platform-specific features (like `TextDecoder`).

### Semantic File Selection

The core responsibility is filtering raw file collections to include only files that are semantically meaningful to GraphMD:

- **Records** — Markdown files with YAML front matter containing `typeId`
- **Blocks** — Content-addressed files in `blocks/` directory
- **Plugin bundles** — JavaScript bundles referenced by plugin manifests

Non-semantic files (documentation, assets, configuration files) are excluded and reported in the `ignored` array.

### Plugin Bundle Resolution

The package handles the complexity of:
1. Detecting plugin manifests (type records with `plugin:` field)
2. Extracting bundle path declarations from manifests
3. Resolving relative bundle paths
4. Ensuring all required bundles are present
5. Reporting missing bundles without failing the import

## Testing

```bash
# Run tests
npm --workspace @graphmd/io run test

# Run tests in watch mode
npm --workspace @graphmd/io run test -- --watch

# Type check
npm --workspace @graphmd/io run typecheck
```

## Integration

This package is used by:

- **Import pipeline** — Filters files before validation
- **Zip import** — Processes zip archive contents
- **GitHub import** — Filters repository contents

It depends on `@graphmd/dataset` for core types and utilities like:
- `DatasetSnapshot`
- `isRecordFileBytes`
- `isPluginManifestCandidateBytes`
- `parsePluginManifest`
- Plugin bundle resolution functions
