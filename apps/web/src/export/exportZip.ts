import { zipSync } from "fflate";
import { discoverGraphdownObjects, extractBlobRefs } from "../../../../src/core";
import type { RepoSnapshot } from "../../../../src/core/snapshotTypes";
import { isObject } from "../../../../src/core/types";

function collectStringValues(value: unknown, into: Set<string>): void {
  if (typeof value === "string") {
    into.add(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectStringValues(item, into);
    return;
  }
  if (isObject(value)) {
    for (const child of Object.values(value)) collectStringValues(child, into);
  }
}

function collectReachableBlobPaths(snapshot: RepoSnapshot): Set<string> {
  const parsed = discoverGraphdownObjects(snapshot);
  const digests = new Set<string>();

  for (const record of parsed.recordObjects) {
    const strings = new Set<string>();
    collectStringValues(record.fields, strings);
    collectStringValues(record.body, strings);
    for (const value of strings) {
      for (const digest of extractBlobRefs(value)) {
        digests.add(digest);
      }
    }
  }

  const paths = new Set<string>();
  for (const digest of digests) {
    const path = `blobs/sha256/${digest.slice(0, 2)}/${digest}`;
    if (snapshot.files.has(path)) {
      paths.add(path);
    }
  }
  return paths;
}

function isGitPath(filePath: string): boolean {
  return filePath === ".git" || filePath.startsWith(".git/");
}

function buildZipBytes(snapshot: RepoSnapshot, include?: (path: string) => boolean): Uint8Array {
  const entries: Record<string, Uint8Array> = {};
  const sortedPaths = [...snapshot.files.keys()]
    .filter((path) => !isGitPath(path))
    .filter((path) => (include ? include(path) : true))
    .sort((a, b) => a.localeCompare(b));

  for (const path of sortedPaths) {
    const contents = snapshot.files.get(path);
    if (contents) {
      entries[path] = contents;
    }
  }

  return zipSync(entries, { level: 0 });
}

function buildZipBytesFromEntries(entries: Map<string, Uint8Array>): Uint8Array {
  const sortedEntries = [...entries.entries()].sort(([a], [b]) => a.localeCompare(b));
  const output: Record<string, Uint8Array> = {};

  for (const [path, contents] of sortedEntries) {
    output[path] = contents;
  }

  return zipSync(output, { level: 0 });
}

function buildCanonicalDatasetOnlyEntries(snapshot: RepoSnapshot): Map<string, Uint8Array> {
  const parsed = discoverGraphdownObjects(snapshot);
  const outFiles = new Map<string, Uint8Array>();

  for (const typeObj of parsed.typeObjects) {
    const bytes = snapshot.files.get(typeObj.file);
    if (!bytes) {
      throw new Error(`Missing bytes for type ${typeObj.typeId}`);
    }
    outFiles.set(`types/${typeObj.typeId}.md`, bytes);
  }

  const recordByKey = new Map(parsed.recordObjects.map((record) => [record.identity, record]));
  const dirCache = new Map<string, string>();
  const visiting = new Set<string>();

  const getDirForRecord = (recordKey: string): string => {
    const cached = dirCache.get(recordKey);
    if (cached) {
      return cached;
    }
    if (visiting.has(recordKey)) {
      throw new Error(`Parent cycle detected at ${recordKey}`);
    }
    const record = recordByKey.get(recordKey);
    if (!record) {
      throw new Error(`Missing record for key ${recordKey}`);
    }

    visiting.add(recordKey);
    let dir = `records/${record.typeId}.${record.recordId}`;
    if (typeof record.parent === "string") {
      const parentDir = getDirForRecord(record.parent);
      dir = `${parentDir}/${record.typeId}.${record.recordId}`;
    }
    visiting.delete(recordKey);
    dirCache.set(recordKey, dir);
    return dir;
  };

  for (const record of parsed.recordObjects) {
    const bytes = snapshot.files.get(record.file);
    if (!bytes) {
      throw new Error(`Missing bytes for record ${record.identity}`);
    }
    const recordDir = getDirForRecord(record.identity);
    outFiles.set(`${recordDir}/${record.recordId}.md`, bytes);
  }

  const blobPaths = collectReachableBlobPaths(snapshot);
  for (const blobPath of blobPaths) {
    const bytes = snapshot.files.get(blobPath);
    if (bytes) {
      outFiles.set(blobPath, bytes);
    }
  }

  return outFiles;
}

export function exportWholeSnapshotZip(snapshot: RepoSnapshot): Uint8Array {
  return buildZipBytes(snapshot);
}

export function exportDatasetOnlyZip(snapshot: RepoSnapshot): Uint8Array {
  const entries = buildCanonicalDatasetOnlyEntries(snapshot);
  return buildZipBytesFromEntries(entries);
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  if (bytes.buffer instanceof ArrayBuffer) {
    return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  }

  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

export function downloadZipBytes(bytes: Uint8Array, filename: string): void {
  const blob = new Blob([toArrayBuffer(bytes)], { type: "application/zip" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
