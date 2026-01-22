import type { DatasetSnapshot } from "@graphdown/dataset";

const encoder = new TextEncoder();

/**
 * Convenience helper for integration tests: build a DatasetSnapshot from UTF-8 text files.
 */
export function snapshotFromTextFiles(
  entries: Array<[path: string, contents: string]>
): DatasetSnapshot {
  return {
    files: new Map(entries.map(([path, contents]) => [path, encoder.encode(contents)]))
  };
}
