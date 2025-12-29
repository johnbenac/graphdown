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

function isGitPath(filePath: string): boolean {
  return filePath === ".git" || filePath.startsWith(".git/");
}

function exportSnapshotZip(
  snapshot: RepoSnapshot,
  include: (path: string) => boolean
): Uint8Array {
  const entries: Record<string, Uint8Array> = {};
  const paths = [...snapshot.files.keys()].sort((a, b) => a.localeCompare(b));

  for (const filePath of paths) {
    if (isGitPath(filePath)) {
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
  return exportSnapshotZip(snapshot, () => true);
}

export function exportDatasetOnlyZip(snapshot: RepoSnapshot): Uint8Array {
  return exportSnapshotZip(snapshot, isDatasetRecordPath);
}

export function downloadZipBytes(bytes: Uint8Array, filename: string): void {
  const blob = new Blob([bytes], { type: "application/zip" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
