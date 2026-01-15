# @graphdown/runtime

Runtime API for Graphdown datasets.

## What is this package?

`@graphdown/runtime` provides a session-based read API on top of `@graphdown/core`. While core handles parsing, validation, and hashing of dataset snapshots, runtime provides a convenient API for querying and navigating dataset contents in memory.

The Runtime API v1 offers:

- Type and record lookups
- Parent-child hierarchy navigation
- Wiki-link graph traversal (incoming/outgoing links)
- Type composition dependency queries
- Block (binary file) resolution with content verification

## Dependencies

This package depends on:

- `@graphdown/core` - Dataset parsing, validation, and graph building
- `@noble/hashes` - Cryptographic hashing for block verification

## Architecture Constraints

**Important:** Runtime must import from `@graphdown/core` via the package barrel only:

```ts
// ✅ Correct
import { validateDatasetSnapshot, buildRecordLinkGraphFromSnapshot } from '@graphdown/core';

// ❌ Wrong - violates layering
import { validateDatasetSnapshot } from '../../core/src/validate/validateDatasetSnapshot';
```

Runtime must not:

- Import core internals via relative paths
- Re-export core symbols
- Depend on UI frameworks (runtime is platform-agnostic)

## Usage

```ts
import { openRuntimeApiV1 } from '@graphdown/runtime';
import type { DatasetSnapshot } from '@graphdown/core';

// Load your snapshot (e.g., from zip, filesystem, etc.)
const snapshot: DatasetSnapshot = /* ... */;

// Open a runtime session
const result = await openRuntimeApiV1({ snapshot });

if (!result.ok) {
  console.error('Validation errors:', result.errors);
  return;
}

const api = result.value;

// Query the dataset
const typeIds = await api.listTypeIds();
const recordKeys = await api.listRecordKeysByType('SomeType');
const record = await api.getRecord('SomeType:recordId');

// Navigate hierarchy
const parentKey = await api.getParentRecordKey('SomeType:childId');
const children = await api.listChildRecordKeys('SomeType:parentId');

// Traverse wiki-links
const outgoing = await api.getOutgoingRecordLinks('SomeType:recordId');
const incoming = await api.getIncomingRecordLinks('SomeType:recordId');

// Access block files
const blockBytes = await api.getBlockBytes('sha2-256:...');
const hasBlock = await api.hasBlock('sha2-256:...');
```

## API Stability

Runtime API v1 is defined by the `RuntimeApiV1` interface. All methods return promises and validate inputs, throwing descriptive errors for misuse.

See `src/v1.ts` for the complete API surface and `src/__tests__/` for usage examples.
