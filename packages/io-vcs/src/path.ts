import type { RelPath } from "./commitPlan";

export function normalizeRelPath(input: string): RelPath {
  if (typeof input !== "string") {
    throw new Error("Path must be a string");
  }

  const normalizedSlashes = input.replace(/\\/g, "/");

  if (normalizedSlashes.length === 0) {
    throw new Error("Path must not be empty");
  }

  if (normalizedSlashes.startsWith("//")) {
    throw new Error("Path must be relative");
  }

  if (normalizedSlashes.startsWith("/")) {
    throw new Error("Path must be relative");
  }

  if (/^[a-zA-Z]:/.test(normalizedSlashes)) {
    throw new Error("Path must be relative");
  }

  const segments = normalizedSlashes.split("/");
  const output: string[] = [];

  for (const segment of segments) {
    if (segment === "" || segment === ".") {
      continue;
    }
    if (segment === "..") {
      throw new Error("Path must not contain traversal segments");
    }
    output.push(segment);
  }

  if (output.length === 0) {
    throw new Error("Path must not be empty");
  }

  return output.join("/") as RelPath;
}
