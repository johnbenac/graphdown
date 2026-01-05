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

export function exportWholeSnapshotZip(snapshot: RepoSnapshot): Uint8Array {
  return buildZipBytes(snapshot);
}

export function exportDatasetOnlyZip(snapshot: RepoSnapshot): Uint8Array {
  const parsed = discoverGraphdownObjects(snapshot);
  if (parsed.errors.length) {
    throw new Error(parsed.errors.map((error) => error.message).join("\n"));
  }

  const entries = new Map<string, Uint8Array>();

  for (const typeObj of parsed.typeObjects) {
    const bytes = snapshot.files.get(typeObj.file);
    if (!bytes) {
      throw new Error(`Missing type file ${typeObj.file}`);
    }
    entries.set(`types/${typeObj.typeId}.md`, bytes);
  }

  const recordByKey = new Map(parsed.recordObjects.map((record) => [record.identity, record]));
  const dirMemo = new Map<string, string>();
  const visiting = new Set<string>();

  const getRecordDir = (recordKey: string): string => {
    const memoized = dirMemo.get(recordKey);
    if (memoized) return memoized;
    if (visiting.has(recordKey)) {
      throw new Error(`Parent cycle detected while exporting ${recordKey}`);
    }
    visiting.add(recordKey);
    const record = recordByKey.get(recordKey);
    if (!record) {
      throw new Error(`Missing record ${recordKey}`);
    }
    const currentDir = `records/${record.typeId}.${record.recordId}`;
    let resolvedDir = currentDir;
    if (record.parent !== undefined && record.parent !== null) {
      if (typeof record.parent !== "string") {
        throw new Error(`Invalid parent value for ${recordKey}`);
      }
      const parentRecord = recordByKey.get(record.parent);
      if (!parentRecord) {
        throw new Error(`Missing parent ${record.parent} for ${recordKey}`);
      }
      const parentDir = getRecordDir(parentRecord.identity);
      resolvedDir = `${parentDir}/${record.typeId}.${record.recordId}`;
    }
    visiting.delete(recordKey);
    dirMemo.set(recordKey, resolvedDir);
    return resolvedDir;
  };

  for (const recordObj of parsed.recordObjects) {
    const bytes = snapshot.files.get(recordObj.file);
    if (!bytes) {
      throw new Error(`Missing record file ${recordObj.file}`);
    }
    const recordDir = getRecordDir(recordObj.identity);
    entries.set(`${recordDir}/${recordObj.recordId}.md`, bytes);
  }

  const blobPaths = collectReachableBlobPaths(snapshot);
  for (const blobPath of blobPaths) {
    const bytes = snapshot.files.get(blobPath);
    if (bytes) {
      entries.set(blobPath, bytes);
    }
  }

  const sortedEntries = [...entries.entries()].sort(([a], [b]) => a.localeCompare(b));
  return zipSync(Object.fromEntries(sortedEntries), { level: 0 });
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
