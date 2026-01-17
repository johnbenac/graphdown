import { unzipSync, zipSync } from "fflate";

import type { DatasetSnapshot } from "@graphdown/core";
import { normalizeZipEntryPath } from "./normalizeZipEntryPath";

export interface ZipBuildOptions {
  include?: (path: string) => boolean;
  excludeGit?: boolean;
}

export function loadDatasetSnapshotFromZipBytes(zipBytes: Uint8Array): DatasetSnapshot {
  const entries = unzipSync(zipBytes);
  const files = new Map<string, Uint8Array>();
  const seenPaths = new Map<string, string>();

  const sortedEntries = Object.entries(entries).sort((a, b) => a[0].localeCompare(b[0]));
  for (const [entryPath, contents] of sortedEntries) {
    const isDir = entryPath.endsWith("/");
    const pathForNormalize = isDir ? entryPath.slice(0, -1) : entryPath;
    const normalizedPath = normalizeZipEntryPath(pathForNormalize);
    const existing = seenPaths.get(normalizedPath);
    if (existing) {
      throw new Error(
        `Zip entry path collision for "${normalizedPath}": "${existing}" and "${entryPath}"`
      );
    }
    seenPaths.set(normalizedPath, entryPath);
    if (isDir) {
      continue;
    }
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
