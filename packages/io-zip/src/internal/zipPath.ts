export function normalizeZipEntryPath(entryPath: string): string {
  const normalized = entryPath.replace(/\\/g, "/");

  if (normalized.includes("\0")) {
    throw new Error(`Invalid zip entry path: ${entryPath}`);
  }
  if (normalized.startsWith("/")) {
    throw new Error(`Invalid zip entry path: ${entryPath}`);
  }

  const pathToNormalize = normalized.endsWith("/") ? normalized.slice(0, -1) : normalized;
  if (!pathToNormalize) {
    throw new Error(`Invalid zip entry path: ${entryPath}`);
  }

  const segments = pathToNormalize.split("/");
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

  if (!safeSegments.length) {
    throw new Error(`Invalid zip entry path: ${entryPath}`);
  }

  return safeSegments.join("/");
}
