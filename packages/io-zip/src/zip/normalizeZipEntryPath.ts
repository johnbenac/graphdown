export function normalizeZipEntryPath(entryPath: string): string {
  const normalized = entryPath.replace(/\\/g, "/");
  if (normalized.includes("\0")) {
    throw new Error(`Invalid zip entry path: ${entryPath}`);
  }
  if (normalized.startsWith("/")) {
    throw new Error(`Invalid zip entry path: ${entryPath}`);
  }

  const trimmed = normalized.endsWith("/") ? normalized.slice(0, -1) : normalized;
  const segments = trimmed.split("/");
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

  return safeSegments.join("/");
}
