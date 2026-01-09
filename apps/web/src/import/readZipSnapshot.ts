import { unzipSync } from "fflate";
import type { DatasetSnapshot } from "../graphdown";

const ROOT_DIRS = new Set(["types", "records", "blocks"]);

function normalizeZipPath(path: string): string | null {
  if (path.includes("\0")) {
    return null;
  }
  let normalized = path.replace(/\\/g, "/");
  if (normalized.startsWith("/")) {
    return null;
  }
  const segments = normalized.split("/");
  const safeSegments: string[] = [];
  for (const segment of segments) {
    if (!segment || segment === ".") {
      continue;
    }
    if (segment === "..") {
      return null;
    }
    safeSegments.push(segment);
  }
  if (!safeSegments.length) {
    return null;
  }
  return safeSegments.join("/");
}

function isDatasetPath(path: string): boolean {
  const lower = path.toLowerCase();
  if (path.startsWith("types/") && lower.endsWith(".md")) {
    return true;
  }
  if (path.startsWith("records/") && lower.endsWith(".md")) {
    return true;
  }
  if (path.startsWith("blocks/")) {
    return true;
  }
  return false;
}

export async function readZipSnapshot(
  file: File
): Promise<{ snapshot: DatasetSnapshot; ignored: string[] }> {
  const buffer = await file.arrayBuffer();
  const entries = unzipSync(new Uint8Array(buffer));
  const normalizedEntries: Array<{ path: string; contents: Uint8Array }> = [];
  for (const [path, contents] of Object.entries(entries)) {
    const isDir = path.endsWith("/");
    const normalized = normalizeZipPath(path);
    if (!normalized) {
      throw new Error(`Zip entry has invalid path: ${path}`);
    }
    if (isDir) {
      continue;
    }
    normalizedEntries.push({ path: normalized, contents });
  }

  const root = normalizedEntries[0]?.path.split("/")[0];
  const shouldStripRoot =
    Boolean(root) &&
    !ROOT_DIRS.has(root) &&
    normalizedEntries.every((entry) => entry.path.startsWith(`${root}/`));
  const files = new Map<string, Uint8Array>();
  const ignored: string[] = [];
  for (const entry of normalizedEntries) {
    const finalPath = shouldStripRoot ? entry.path.split("/").slice(1).join("/") : entry.path;
    if (!finalPath) {
      continue;
    }
    if (isDatasetPath(finalPath)) {
      files.set(finalPath, entry.contents);
    } else {
      ignored.push(finalPath);
    }
  }
  return { snapshot: { files }, ignored };
}
