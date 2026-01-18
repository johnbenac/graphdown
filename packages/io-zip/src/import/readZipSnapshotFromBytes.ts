import { unzipSync } from "fflate";
import { ImportError, selectSemanticSnapshotFiles, type ImportResult } from "@graphdown/io";

import { normalizeZipEntryPath } from "../internal/zipPath";

const ROOT_DIRS = new Set(["types", "records", "blocks", "plugins"]);

type ZipEntry = {
  path: string;
  contents: Uint8Array;
};

function normalizeZipEntries(entries: Record<string, Uint8Array>): ZipEntry[] {
  const normalizedEntries: ZipEntry[] = [];
  const seen = new Set<string>();

  const sortedEntries = Object.entries(entries).sort(([a], [b]) => a.localeCompare(b));
  for (const [entryPath, contents] of sortedEntries) {
    const normalizedPath = normalizeZipEntryPath(entryPath);
    if (seen.has(normalizedPath)) {
      throw new Error(`Zip entry path collision: ${normalizedPath}`);
    }
    seen.add(normalizedPath);

    if (entryPath.replace(/\\/g, "/").endsWith("/")) {
      continue;
    }

    normalizedEntries.push({ path: normalizedPath, contents });
  }

  return normalizedEntries;
}

function stripRootDirectory(entries: ZipEntry[]): Map<string, Uint8Array> {
  const topLevelSegments = new Set<string>();
  for (const entry of entries) {
    topLevelSegments.add(entry.path.split("/")[0]);
  }

  const sortedTopLevels = [...topLevelSegments].sort((a, b) => a.localeCompare(b));
  const shouldStrip =
    sortedTopLevels.length === 1 &&
    Boolean(sortedTopLevels[0]) &&
    !ROOT_DIRS.has(sortedTopLevels[0]);

  const allEntries = new Map<string, Uint8Array>();
  for (const entry of entries) {
    const finalPath = shouldStrip ? entry.path.split("/").slice(1).join("/") : entry.path;
    if (!finalPath) {
      throw new Error(`Zip entry resolves to empty path after root stripping: ${entry.path}`);
    }
    if (allEntries.has(finalPath)) {
      throw new Error(`Zip entry path collision: ${finalPath}`);
    }
    allEntries.set(finalPath, entry.contents);
  }

  return allEntries;
}

export function readZipSnapshotFromBytes(zipBytes: Uint8Array): ImportResult {
  let entries: Record<string, Uint8Array>;
  try {
    entries = unzipSync(zipBytes);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new ImportError({
      source: "zip",
      code: "invalid_input",
      message: `Invalid zip file: ${message}`
    });
  }

  const normalizedEntries = normalizeZipEntries(entries);
  const allEntries = stripRootDirectory(normalizedEntries);

  let selection;
  try {
    selection = selectSemanticSnapshotFiles(allEntries);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new ImportError({ source: "zip", code: "invalid_input", message });
  }

  if (selection.missingPluginBundlePaths.length > 0) {
    throw new ImportError({
      source: "zip",
      code: "missing_files",
      message: `Missing plugin bundle files: ${selection.missingPluginBundlePaths.join(", ")}`,
      missingPaths: selection.missingPluginBundlePaths
    });
  }

  return { snapshot: selection.snapshot, ignored: selection.ignored };
}
