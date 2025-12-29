import { zipSync } from "fflate";
import type { RepoSnapshot } from "../../../../src/core/snapshotTypes";

const DATASET_PREFIXES = ["datasets/", "types/", "records/"];

function isDatasetRecordPath(filePath: string): boolean {
  const lowerPath = filePath.toLowerCase();
  if (!lowerPath.endsWith(".md")) {
    return false;
  }
  return DATASET_PREFIXES.some((prefix) => filePath.startsWith(prefix));
}

function shouldExcludePath(filePath: string): boolean {
  return filePath === ".git" || filePath.startsWith(".git/");
}

function buildZip(snapshot: RepoSnapshot, include?: (path: string) => boolean): Uint8Array {
  const entries: Record<string, Uint8Array> = {};
  const paths = [...snapshot.files.keys()]
    .filter((path) => !shouldExcludePath(path))
    .filter((path) => (include ? include(path) : true))
    .sort((a, b) => a.localeCompare(b));

  for (const path of paths) {
    const contents = snapshot.files.get(path);
    if (!contents) {
      continue;
    }
    entries[path] = contents;
  }

  return zipSync(entries, { level: 0 });
}

export function exportWholeSnapshotZip(snapshot: RepoSnapshot): Uint8Array {
  return buildZip(snapshot);
}

export function exportDatasetOnlyZip(snapshot: RepoSnapshot): Uint8Array {
  return buildZip(snapshot, isDatasetRecordPath);
}

export function downloadZipBytes(bytes: Uint8Array, filename: string): void {
  const blob = new Blob([bytes], { type: "application/zip" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
