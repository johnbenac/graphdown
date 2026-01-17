export type NormalizedZipEntry = {
  path: string;
  isDir: boolean;
};

export function normalizeZipEntryPath(entryPath: string): NormalizedZipEntry {
  let normalized = entryPath.replace(/\\/g, "/");

  if (normalized.includes("\0")) {
    throw new Error(`Invalid zip entry path: ${entryPath}`);
  }
  if (normalized.startsWith("/")) {
    throw new Error(`Invalid zip entry path: ${entryPath}`);
  }

  const isDir = normalized.endsWith("/");
  if (isDir) {
    normalized = normalized.slice(0, -1);
  }

  const segments = normalized.split("/");
  const safeSegments: string[] = [];
  for (const segment of segments) {
    if (segment === ".") {
      continue;
    }
    if (segment.length === 0) {
      throw new Error(`Invalid zip entry path: ${entryPath}`);
    }
    if (segment === "..") {
      throw new Error(`Invalid zip entry path: ${entryPath}`);
    }
    safeSegments.push(segment);
  }

  if (safeSegments.length === 0) {
    throw new Error(`Invalid zip entry path: ${entryPath}`);
  }

  return { path: safeSegments.join("/"), isDir };
}
