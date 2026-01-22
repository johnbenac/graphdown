# @graphdown/dataset

The Graphdown dataset SDK is the **canonical home for dataset semantics**: parsing, validation, hashing, and canonicalization defined by the Graphdown Standard. It is the foundation that other packages (runtime, importers, web app) rely on.

## Install

```bash
npm install @graphdown/dataset
```

## Usage

### Validate a dataset snapshot

```ts
import { validateDatasetSnapshot } from '@graphdown/dataset';

const snapshot = {
  files: new Map([
    ['types/note.md', new TextEncoder().encode('---\ntypeId: note\nfields: {}\n---\n')],
    ['records/note/record--1.md', new TextEncoder().encode('---\ntypeId: note\nrecordId: record--1\nfields: {}\n---\n')],
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

const result = computeGdHashV1(snapshot);
if (result.ok) {
  console.log(result.hashes.snapshot);
}
```

### Canonicalize a snapshot

```ts
import { canonicalizeDatasetSnapshot } from '@graphdown/dataset';

const result = canonicalizeDatasetSnapshot(snapshot);
if (result.ok) {
  console.log([...result.snapshot.files.keys()]);
}
```

## API surface

The public API is exported from `src/index.ts` as a barrel. Consult that file for the canonical entry points.

## Build + test

```bash
npm --workspace packages/dataset run build
npm --workspace packages/dataset run test
```
