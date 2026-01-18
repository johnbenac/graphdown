import type { RelPath } from "./commitPlan";

export function normalizeRelPath(input: string): RelPath {
  if (!input) {
    throw new Error("Invalid relative path: empty");
  }

  const normalized = input.replace(/\\/g, "/");

  if (normalized.includes("\0")) {
    throw new Error(`Invalid relative path: ${input}`);
  }
  if (normalized.startsWith("/")) {
    throw new Error(`Invalid relative path: ${input}`);
  }
  if (/^[A-Za-z]:/.test(normalized)) {
    throw new Error(`Invalid relative path: ${input}`);
  }

  const segments = normalized.split("/");
  const safeSegments: string[] = [];
  for (const segment of segments) {
    if (!segment) {
      continue;
    }
    if (segment === ".") {
      continue;
    }
    if (segment === "..") {
      throw new Error(`Invalid relative path: ${input}`);
    }
    safeSegments.push(segment);
  }

  if (!safeSegments.length) {
    throw new Error(`Invalid relative path: ${input}`);
  }

  return safeSegments.join("/") as RelPath;
}
