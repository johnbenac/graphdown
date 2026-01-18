import type { RelPath } from "./commitPlan";

const WINDOWS_ABS_PATH = /^[A-Za-z]:[\\/]/;

export function normalizeRelPath(inputPath: string): RelPath {
  const normalized = inputPath.replace(/\\/g, "/");

  if (!normalized) {
    throw new Error(`Invalid relative path: ${inputPath}`);
  }
  if (normalized.includes("\0")) {
    throw new Error(`Invalid relative path: ${inputPath}`);
  }
  if (normalized.startsWith("/") || normalized.startsWith("//")) {
    throw new Error(`Invalid relative path: ${inputPath}`);
  }
  if (WINDOWS_ABS_PATH.test(normalized)) {
    throw new Error(`Invalid relative path: ${inputPath}`);
  }

  const pathToNormalize = normalized.endsWith("/") ? normalized.slice(0, -1) : normalized;
  if (!pathToNormalize) {
    throw new Error(`Invalid relative path: ${inputPath}`);
  }

  const segments = pathToNormalize.split("/");
  const safeSegments: string[] = [];
  for (const segment of segments) {
    if (!segment) {
      continue;
    }
    if (segment === ".") {
      continue;
    }
    if (segment === "..") {
      throw new Error(`Invalid relative path: ${inputPath}`);
    }
    safeSegments.push(segment);
  }

  if (!safeSegments.length) {
    throw new Error(`Invalid relative path: ${inputPath}`);
  }

  return safeSegments.join("/") as RelPath;
}
