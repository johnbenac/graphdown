import { unzipSync } from "fflate";
import type { RepoSnapshot } from "./types";

function normalizeZipPath(entryPath: string): string {
  let normalized = entryPath.replace(/\\/g, "/");
  while (normalized.startsWith("./")) {
    normalized = normalized.slice(2);
  }

  if (!normalized || normalized === ".") {
    throw new Error("Invalid zip entry path");
  }
  if (normalized.startsWith("/")) {
    throw new Error(`Invalid zip entry path: ${entryPath}`);
  }
  if (normalized.includes("\0")) {
    throw new Error(`Invalid zip entry path: ${entryPath}`);
  }

  const segments = normalized.split("/");
  if (segments.some((segment) => segment.length === 0)) {
    throw new Error(`Invalid zip entry path: ${entryPath}`);
  }
  if (segments.some((segment) => segment === "..")) {
    throw new Error(`Invalid zip entry path: ${entryPath}`);
  }

  return segments.join("/");
}

export function loadRepoSnapshotFromZipBytes(zipBytes: Uint8Array): RepoSnapshot {
  const entries = unzipSync(zipBytes);
  const files = new Map<string, Uint8Array>();

  for (const [entryPath, contents] of Object.entries(entries)) {
    const normalizedEntryPath = entryPath.replace(/\\/g, "/");
    if (normalizedEntryPath.endsWith("/")) {
      continue;
    }
    const normalizedPath = normalizeZipPath(normalizedEntryPath);
    files.set(normalizedPath, contents);
  }

  return { files };
}
