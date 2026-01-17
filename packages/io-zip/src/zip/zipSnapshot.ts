import { unzipSync, zipSync } from "fflate";

import type { DatasetSnapshot } from "@graphdown/core";
import { normalizeZipEntryPath } from "./zipPath";

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
    const normalized = normalizeZipEntryPath(entryPath);
    if (seenPaths.has(normalized.path)) {
      throw new Error(`Zip entry path collision: ${normalized.path}`);
    }
    seenPaths.add(normalized.path);
    if (normalized.isDir) {
      continue;
    }
    files.set(normalized.path, contents);
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
    if (excludeGit && (filePath === ".git" || filePath.startsWith(".git/"))) {
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
