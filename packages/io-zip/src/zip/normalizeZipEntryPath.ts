export function normalizeZipEntryPath(entryPath: string): string {
  const normalized = entryPath.replace(/\\/g, "/");
  if (normalized.includes("\0")) {
    throw new Error(`Invalid zip entry path: ${entryPath}`);
  }
  if (normalized.startsWith("/")) {
    throw new Error(`Invalid zip entry path: ${entryPath}`);
  }

  const segments = normalized.split("/");
  const safeSegments: string[] = [];
  for (const segment of segments) {
    if (!segment) {
      throw new Error(`Invalid zip entry path: ${entryPath}`);
    }
    if (segment === ".") {
      continue;
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
