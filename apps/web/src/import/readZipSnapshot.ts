import { unzipSync } from "fflate";
import type { RepoSnapshot } from "../../../../src/core/snapshotTypes";

function normalizeZipPath(path: string): string | null {
  if (path.includes("\0")) {
    return null;
  }
  const normalized = path.replace(/\\/g, "/");
  if (normalized.startsWith("/")) {
    return null;
  }
  const parts = normalized.split("/");
  const safeParts: string[] = [];
  for (const part of parts) {
    if (!part || part === ".") {
      continue;
    }
    if (part === "..") {
      return null;
    }
    safeParts.push(part);
  }
  if (!safeParts.length) {
    return null;
  }
  return safeParts.join("/");
}

function stripCommonRoot(paths: string[]): string[] {
  if (!paths.length) {
    return paths;
  }
  const firstSegments = paths.map((path) => path.split("/")[0]);
  const candidate = firstSegments[0];
  if (!candidate || !firstSegments.every((segment) => segment === candidate)) {
    return paths;
  }
  if (["datasets", "types", "records"].includes(candidate)) {
    return paths;
  }
  return paths.map((path) => path.split("/").slice(1).join("/"));
}

export async function readZipSnapshot(file: File): Promise<RepoSnapshot> {
  const buffer = await file.arrayBuffer();
  const entries = unzipSync(new Uint8Array(buffer));
  const normalizedEntries: Array<[string, Uint8Array]> = [];
  for (const [path, contents] of Object.entries(entries)) {
    if (path.endsWith("/")) {
      continue;
    }
    const normalizedPath = normalizeZipPath(path);
    if (!normalizedPath) {
      continue;
    }
    normalizedEntries.push([normalizedPath, contents]);
  }
  const normalizedPaths = normalizedEntries.map(([path]) => path);
  const strippedPaths = stripCommonRoot(normalizedPaths);
  const files = new Map<string, Uint8Array>();
  strippedPaths.forEach((path, index) => {
    const contents = normalizedEntries[index]?.[1];
    if (!contents || !path) {
      return;
    }
    files.set(path, contents);
  });
  return { files };
}
