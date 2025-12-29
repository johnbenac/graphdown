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

function shouldExcludeGit(filePath: string): boolean {
  return filePath === ".git" || filePath.startsWith(".git/");
}

function buildZipBytes(snapshot: RepoSnapshot, include: (path: string) => boolean): Uint8Array {
  const entries: Record<string, Uint8Array> = {};
  const paths = [...snapshot.files.keys()].sort((a, b) => a.localeCompare(b));
  for (const filePath of paths) {
    if (shouldExcludeGit(filePath)) {
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

export function exportWholeSnapshotZip(snapshot: RepoSnapshot): Uint8Array {
  return buildZipBytes(snapshot, () => true);
}

export function exportDatasetOnlyZip(snapshot: RepoSnapshot): Uint8Array {
  return buildZipBytes(snapshot, isDatasetRecordPath);
}

export function downloadZipBytes(bytes: Uint8Array, filename: string): void {
  const blob = new Blob([bytes], { type: "application/zip" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
