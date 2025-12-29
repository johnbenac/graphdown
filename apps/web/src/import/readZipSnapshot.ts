import { unzipSync } from "fflate";
import type { RepoSnapshot } from "../../../../src/core/snapshotTypes";

function normalizeZipPath(path: string): string {
  if (path.includes("\0")) {
    throw new Error("Invalid zip entry path.");
  }
  const normalized = path.replace(/\\/g, "/");
  if (normalized.startsWith("/")) {
    throw new Error("Invalid zip entry path.");
  }
  const parts = normalized.split("/");
  if (parts.some((part) => part === "..")) {
    throw new Error("Invalid zip entry path.");
  }
  return parts.filter(Boolean).join("/");
}

export async function readZipSnapshot(source: File | ArrayBuffer | Uint8Array): Promise<RepoSnapshot> {
  const buffer =
    source instanceof Uint8Array || source instanceof ArrayBuffer ? source : await source.arrayBuffer();
  const zipData = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  const entries = unzipSync(zipData);
  const files = new Map<string, Uint8Array>();
  const normalizedEntries: Array<[string, Uint8Array]> = [];
  for (const [path, contents] of Object.entries(entries)) {
    let entryPath = path;
    if (entryPath.endsWith("/")) {
      entryPath = entryPath.replace(/\/+$/, "");
      if (!entryPath) {
        continue;
      }
    }
    const normalized = normalizeZipPath(entryPath);
    if (!normalized) {
      continue;
    }
    normalizedEntries.push([normalized, contents]);
  }

  const firstSegments = normalizedEntries.map(([path]) => path.split("/")[0]).filter(Boolean);
  const allSameRoot = firstSegments.length > 0 && firstSegments.every((segment) => segment === firstSegments[0]);
  const rootFolder = allSameRoot ? firstSegments[0] : null;
  const shouldStripRoot =
    rootFolder && !["datasets", "types", "records"].includes(rootFolder);

  for (const [path, contents] of normalizedEntries) {
    const normalizedPath = shouldStripRoot && rootFolder ? path.slice(rootFolder.length + 1) : path;
    if (!normalizedPath) {
      continue;
    }
    files.set(normalizedPath, contents);
  }
  return { files };
}
