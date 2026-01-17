import { unzipSync, zipSync } from 'fflate';

import type { DatasetSnapshot } from '@graphdown/core';

import { normalizeZipEntryPath } from './normalizeZipEntryPath';

export interface ZipBuildOptions {
  include?: (path: string) => boolean;
  excludeGit?: boolean;
}

export function loadDatasetSnapshotFromZipBytes(zipBytes: Uint8Array): DatasetSnapshot {
  const entries = unzipSync(zipBytes);
  const files = new Map<string, Uint8Array>();
  const seenPaths = new Map<string, string>();

  const entryPaths = Object.keys(entries).sort((a, b) => a.localeCompare(b));
  for (const entryPath of entryPaths) {
    const normalizedEntryPath = entryPath.replace(/\\/g, '/');
    const isDir = normalizedEntryPath.endsWith('/');
    const normalizedPath = normalizeZipEntryPath(normalizedEntryPath);
    const existing = seenPaths.get(normalizedPath);
    if (existing) {
      throw new Error(
        `Zip entry path collision: ${existing} and ${entryPath} normalize to ${normalizedPath}`
      );
    }
    seenPaths.set(normalizedPath, entryPath);
    if (isDir) {
      continue;
    }
    const contents = entries[entryPath];
    files.set(normalizedPath, contents);
  }

  return { files };
}

export function buildZipBytesFromSnapshot(
  snapshot: DatasetSnapshot,
  options: ZipBuildOptions = {}
): Uint8Array {
  const include = options.include ?? (() => true);
  const excludeGit = options.excludeGit ?? true;
  const entries: Record<string, Uint8Array> = {};

  const paths = [...snapshot.files.keys()].sort((a, b) => a.localeCompare(b));
  for (const filePath of paths) {
    if (excludeGit && (filePath === '.git' || filePath.startsWith('.git/'))) {
      continue;
    }
    if (!include(filePath)) {
      continue;
    }
    const contents = snapshot.files.get(filePath);
    if (!contents) {
      continue;
    }
    entries[filePath] = contents;
  }

  return zipSync(entries, { level: 0 });
}

/** @deprecated Use buildZipBytesFromSnapshot */
export const exportDatasetSnapshotToZipBytes = buildZipBytesFromSnapshot;

/** @deprecated Use ZipBuildOptions */
export type ExportZipOptions = ZipBuildOptions;
