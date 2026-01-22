# @graphdown/dataset

`@graphdown/dataset` is the standalone Graphdown dataset SDK. It provides the canonical parsing, validation, hashing, and canonicalization semantics for Graphdown datasets, and is the **primary source of truth** for dataset behavior across the monorepo.

## Install

```bash
npm install @graphdown/dataset
```

## Usage

### Validate a dataset snapshot

```ts
import { validateDatasetSnapshot } from '@graphdown/dataset';

const snapshot = { files: new Map([['records/example.md', Buffer.from('---\nname: Example\n---\n')]]) };
const result = validateDatasetSnapshot(snapshot);

if (!result.ok) {
  console.error(result.errors);
}
```

### Compute a dataset hash

```ts
import { computeGdHashV1 } from '@graphdown/dataset';

const hash = computeGdHashV1({ files: new Map() });
```

### Canonicalize a snapshot

```ts
import { canonicalizeDatasetSnapshot } from '@graphdown/dataset';

const canonical = canonicalizeDatasetSnapshot({ files: new Map() });
```

## API surface

All public exports are re-exported from `src/index.ts`, which is the package barrel for the dataset SDK.

## Development

```bash
npm --workspace packages/dataset run build
npm --workspace packages/dataset run test
npm --workspace packages/dataset run typecheck
```
