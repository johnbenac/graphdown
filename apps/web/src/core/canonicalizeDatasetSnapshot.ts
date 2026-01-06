import { discoverGraphdownObjects, type ParsedRecordObject } from './datasetObjects';
import type { DatasetSnapshot } from './snapshotTypes';
import { isObject } from './types';
import { discoverUiPluginPackages, isUnderDir, selectUiConfigPath } from './uiPluginArtifacts';
import { extractBlobRefs } from './wikiLinks';

function collectStringValues(value: unknown, into: Set<string>): void {
  if (typeof value === 'string') {
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

function collectReachableBlobPaths(
  snapshot: DatasetSnapshot,
  recordObjects: ParsedRecordObject[]
): Set<string> {
  const digests = new Set<string>();

  for (const record of recordObjects) {
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

export function canonicalizeDatasetSnapshot(snapshot: DatasetSnapshot): DatasetSnapshot {
  const packages = discoverUiPluginPackages(snapshot.files);
  const pluginDirs = packages.map((pkg) => pkg.rootDir);
  const configPath = selectUiConfigPath(snapshot.files);

  const filteredFiles = new Map<string, Uint8Array>();
  for (const [path, bytes] of snapshot.files.entries()) {
    if (pluginDirs.some((dir) => isUnderDir(path, dir))) {
      continue;
    }
    filteredFiles.set(path, bytes);
  }

  const parsed = discoverGraphdownObjects({ files: filteredFiles });
  const outputFiles = new Map<string, Uint8Array>();

  for (const typeObj of parsed.typeObjects) {
    const bytes = snapshot.files.get(typeObj.file);
    if (!bytes) {
      continue;
    }
    outputFiles.set(`types/${typeObj.typeId}.md`, bytes);
  }

  const recordsByKey = new Map(parsed.recordObjects.map((record) => [record.identity, record]));
  const dirMemo = new Map<string, string>();
  const visiting = new Set<string>();

  const resolveRecordDir = (recordKey: string): string => {
    const cached = dirMemo.get(recordKey);
    if (cached) {
      return cached;
    }
    const record = recordsByKey.get(recordKey);
    if (!record) {
      throw new Error(`Missing record for key ${recordKey}`);
    }
    if (visiting.has(recordKey)) {
      throw new Error(`Parent cycle detected at ${recordKey}`);
    }
    visiting.add(recordKey);
    const ownDir = `records/${record.typeId}.${record.recordId}`;
    let fullDir = ownDir;
    if (typeof record.parent === 'string') {
      const parentDir = resolveRecordDir(record.parent);
      fullDir = `${parentDir}/${record.typeId}.${record.recordId}`;
    }
    visiting.delete(recordKey);
    dirMemo.set(recordKey, fullDir);
    return fullDir;
  };

  for (const recordObj of parsed.recordObjects) {
    const bytes = snapshot.files.get(recordObj.file);
    if (!bytes) {
      continue;
    }
    const recordDir = resolveRecordDir(recordObj.identity);
    outputFiles.set(`${recordDir}/${recordObj.recordId}.md`, bytes);
  }

  const blobPaths = collectReachableBlobPaths(snapshot, parsed.recordObjects);
  for (const blobPath of blobPaths) {
    const bytes = snapshot.files.get(blobPath);
    if (bytes) {
      outputFiles.set(blobPath, bytes);
    }
  }

  if (configPath) {
    const bytes = snapshot.files.get(configPath);
    if (bytes) {
      outputFiles.set('graphdown.ui.json', bytes);
    }
  }

  const sortedPaths = [...snapshot.files.keys()].sort((a, b) => a.localeCompare(b));
  for (const pkg of packages) {
    for (const path of sortedPaths) {
      if (!isUnderDir(path, pkg.rootDir)) {
        continue;
      }
      const bytes = snapshot.files.get(path);
      if (!bytes) continue;
      const relative = path.slice(pkg.rootDir.length + 1);
      if (!relative) continue;
      outputFiles.set(`plugins/${pkg.pluginId}/${relative}`, bytes);
    }
  }

  return { files: outputFiles };
}
