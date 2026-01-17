import { unzipSync, zipSync } from "fflate";

import type { DatasetSnapshot } from "@graphdown/core";
import { normalizeZipEntryPath } from "../internal/zipPath";

export interface ZipBuildOptions {
  include?: (path: string) => boolean;
  excludeGit?: boolean;
}

export function loadDatasetSnapshotFromZipBytes(zipBytes: Uint8Array): DatasetSnapshot {
  const entries = unzipSync(zipBytes);
  const files = new Map<string, Uint8Array>();
  const seenPaths = new Set<string>();

  const sortedEntries = Object.entries(entries).sort(([a], [b]) => a.localeCompare(b));
  for (const [entryPath, contents] of sortedEntries) {
    const normalizedPath = normalizeZipEntryPath(entryPath);
    if (seenPaths.has(normalizedPath)) {
      throw new Error(`Zip entry path collision: ${normalizedPath}`);
    }
    seenPaths.add(normalizedPath);
    if (entryPath.replace(/\\/g, "/").endsWith("/")) {
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
