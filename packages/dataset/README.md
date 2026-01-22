# @graphdown/dataset

The `@graphdown/dataset` package is the **canonical home for Graphdown dataset semantics**. It contains the parsing, validation, hashing, and canonicalization logic that defines what a Graphdown dataset means. Other packages (including the legacy `packages/core` wrapper) should treat this as the authoritative implementation.

## Install

```bash
npm install @graphdown/dataset
```

## Usage

### Validate a snapshot

```ts
import { validateDatasetSnapshot } from '@graphdown/dataset';

const snapshot = {
  files: new Map([
    ['types/book.md', new TextEncoder().encode('---\ntypeId: book\nfields: {}\n---\n')],
  ]),
};

const result = validateDatasetSnapshot(snapshot);
if (!result.ok) {
  console.error(result.errors);
}
```

### Compute a dataset hash

```ts
import { computeGdHashV1 } from '@graphdown/dataset';

const result = computeGdHashV1(snapshot, 'snapshot');
if (result.ok) {
  console.log(result.cid);
}
```

### Canonicalize a snapshot

```ts
import { canonicalizeDatasetSnapshot } from '@graphdown/dataset';

const canonical = canonicalizeDatasetSnapshot(snapshot);
```

## API surface

The public API is defined by the barrel export in `src/index.ts`. Use that file as the canonical map of exported functions and types.

## Development

```bash
# Build ESM + CJS outputs
npm --workspace packages/dataset run build

# Run tests
npm --workspace packages/dataset test

# Typecheck
npm --workspace packages/dataset run typecheck
```
