import { discoverGraphdownObjects, type ParsedRecordObject } from '../parse/datasetObjects';
import type { DatasetSnapshot } from '../model/snapshotTypes';
import { isObject } from '../model/types';
import { blockPathForCid } from '../cid/daslCid';
import { extractCidRefs } from '../parse/wikiRefs';

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

function collectReachableBlockPaths(
  snapshot: DatasetSnapshot,
  recordObjects: ParsedRecordObject[]
): Set<string> {
  const cids = new Set<string>();

  for (const record of recordObjects) {
    const strings = new Set<string>();
    collectStringValues(record.fields, strings);
    collectStringValues(record.body, strings);
    for (const value of strings) {
      const { cids: found, invalidCidTokens, legacyBlobTokens } = extractCidRefs(value);
      if (invalidCidTokens.length > 0 || legacyBlobTokens.length > 0) {
        throw new Error('Canonicalization requires validated CID references');
      }
      for (const cid of found) {
        cids.add(cid);
      }
    }
  }

  const paths = new Set<string>();
  for (const cid of cids) {
    const path = blockPathForCid(cid);
    if (snapshot.files.has(path)) {
      paths.add(path);
    }
  }

  return paths;
}

export function canonicalizeDatasetSnapshot(snapshot: DatasetSnapshot): DatasetSnapshot {
  const parsed = discoverGraphdownObjects(snapshot);
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

  const blockPaths = collectReachableBlockPaths(snapshot, parsed.recordObjects);
  for (const blockPath of blockPaths) {
    const bytes = snapshot.files.get(blockPath);
    if (bytes) {
      outputFiles.set(blockPath, bytes);
    }
  }

  return { files: outputFiles };
}
