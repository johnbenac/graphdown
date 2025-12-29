import { unzipSync } from "fflate";
import type { RepoSnapshot } from "../../../../src/core/snapshotTypes";

const RESERVED_TOP_LEVEL = new Set(["datasets", "types", "records"]);

function normalizeZipPath(rawPath: string): string {
  const normalized = rawPath.replace(/\\/g, "/");
  if (normalized.includes("\0")) {
    throw new Error("Zip entry contains a null byte.");
  }
  if (normalized.startsWith("/")) {
    throw new Error("Zip entry paths must be relative.");
  }
  const parts = normalized.split("/").filter(Boolean);
  for (const part of parts) {
    if (part === "..") {
      throw new Error("Zip entry contains invalid path traversal.");
    }
  }
  return parts.filter((part) => part !== ".").join("/");
}

export async function readZipSnapshot(file: File): Promise<RepoSnapshot> {
  const buffer = await file.arrayBuffer();
  const entries = unzipSync(new Uint8Array(buffer));
  const files = new Map<string, Uint8Array>();

  const normalizedFiles = Object.entries(entries)
    .filter(([path]) => !path.endsWith("/"))
    .map(([path, contents]) => ({
      path: normalizeZipPath(path),
      contents
    }))
    .filter(({ path }) => path.length > 0);

  const rootSegments = new Set(normalizedFiles.map(({ path }) => path.split("/")[0]));
  const stripRoot =
    rootSegments.size === 1 && !RESERVED_TOP_LEVEL.has([...rootSegments][0])
      ? [...rootSegments][0]
      : null;

  for (const { path, contents } of normalizedFiles) {
    const finalPath = stripRoot ? path.split("/").slice(1).join("/") : path;
    if (!finalPath) {
      continue;
    }
    files.set(finalPath, contents);
  }

  return { files };
}
