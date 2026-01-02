import { discoverGraphdownObjects } from './datasetObjects';
import { extractBlobRefs } from './wikiLinks';
import { RepoSnapshot } from './snapshot';
import { exportRepoSnapshotToZipBytes } from './zipSnapshot';
import { isObject } from './types';

function collectStringValues(value: unknown, into: Set<string>): void {
  if (typeof value === 'string') {
    into.add(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectStringValues(item, into);
    return;
  }
  if (isObject(value)) {
    for (const child of Object.values(value)) collectStringValues(child, into);
  }
}

function collectReachableBlobPaths(snapshot: RepoSnapshot): Set<string> {
  const parsed = discoverGraphdownObjects(snapshot);
  const digests = new Set<string>();

  for (const record of parsed.recordObjects) {
    const strings = new Set<string>();
    collectStringValues(record.fields, strings);
    collectStringValues(record.body, strings);
    for (const digest of extractBlobRefs([...strings].join('\n'))) {
      digests.add(digest);
    }
  }

  const paths = new Set<string>();
  for (const digest of digests) {
    const path = `blobs/sha256/${digest.slice(0, 2)}/${digest}`;
    if (snapshot.files.has(path)) {
      paths.add(path);
    }
  }

  return paths;
}

export function exportDatasetOnlyZip(snapshot: RepoSnapshot): Uint8Array {
  const parsed = discoverGraphdownObjects(snapshot);
  const recordPaths = new Set<string>([
    ...parsed.typeObjects.map((t) => t.file),
    ...parsed.recordObjects.map((r) => r.file)
  ]);
  const blobPaths = collectReachableBlobPaths(snapshot);

  return exportRepoSnapshotToZipBytes(snapshot, {
    include: (path) => recordPaths.has(path) || blobPaths.has(path)
  });
}

export function exportWholeRepoZip(snapshot: RepoSnapshot): Uint8Array {
  return exportRepoSnapshotToZipBytes(snapshot);
}
