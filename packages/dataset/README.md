# @graphdown/dataset

The dataset package is the canonical SDK for Graphdown dataset semantics. It defines how
snapshots are parsed, validated, hashed, and canonicalized. This is the new core: any
consumer that needs dataset domain logic should depend on `@graphdown/dataset`.

## Installation

```bash
npm install @graphdown/dataset
```

## Usage

### Validate a dataset snapshot

```ts
import { validateDatasetSnapshot } from '@graphdown/dataset';

const snapshot = {
  files: new Map([
    ['datasets/example.md', Buffer.from('# Example\n')],
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

const hash = computeGdHashV1({
  files: new Map([
    ['datasets/example.md', Buffer.from('# Example\n')],
  ]),
});
```

### Canonicalize a dataset snapshot

```ts
import { canonicalizeDatasetSnapshot } from '@graphdown/dataset';

const canonical = canonicalizeDatasetSnapshot({
  files: new Map([
    ['datasets/example.md', Buffer.from('# Example\n')],
  ]),
});
```

## API surface

The public API is defined by the barrel exports in `src/index.ts`.

## Development

Build artifacts (ESM, CJS, and types):

```bash
npm --workspace packages/dataset run build
```

Run tests:

```bash
npm --workspace packages/dataset run test
```
