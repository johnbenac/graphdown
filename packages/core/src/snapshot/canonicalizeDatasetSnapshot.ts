import { discoverGraphdownObjects, type ParsedRecordObject } from '../parse/datasetObjects';
import type { DatasetSnapshot } from '../model/snapshotTypes';
import { isObject } from '../model/types';
import { blockPathForCid } from '../cid/daslCid';
import { extractCidRefs } from '../parse/wikiRefs';
import {
  isPluginManifestCandidateBytes,
  parsePluginManifest,
  resolvePluginBundlePaths,
} from '../parse/pluginManifest';
import { isValidPluginId } from '../model/ids';

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

function decodeUtf8Strict(bytes: Uint8Array): string {
  if (typeof TextDecoder !== 'undefined') {
    const decoder = new TextDecoder('utf-8', { fatal: true });
    return decoder.decode(bytes);
  }
  if (typeof Buffer !== 'undefined') {
    const buffer = Buffer.from(bytes);
    const text = buffer.toString('utf8');
    const roundTrip = Buffer.from(text, 'utf8');
    if (!roundTrip.equals(buffer)) {
      throw new Error('Invalid UTF-8');
    }
    return text;
  }
  throw new Error('No UTF-8 decoder available');
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
      const { cids: foundCids, invalidCidTokens } = extractCidRefs(value);
      if (invalidCidTokens.length > 0) {
        throw new Error('Canonicalization requires validated CID references');
      }
      for (const cid of foundCids) {
        cids.add(cid);
      }
    }
  }

  for (const [path, bytes] of snapshot.files) {
    if (!isPluginManifestCandidateBytes(path, bytes)) {
      continue;
    }
    const text = decodeUtf8Strict(bytes);
    const parsed = parsePluginManifest(text, path);
    if (!parsed.ok) {
      throw new Error('Canonicalization requires validated plugin manifests');
    }
    const blocks = parsed.manifest.yaml.blocks;
    if (blocks === undefined) {
      continue;
    }
    if (!Array.isArray(blocks) || blocks.some((item) => typeof item !== 'string')) {
      throw new Error('Canonicalization requires validated plugin manifests');
    }
    for (const cid of blocks) {
      cids.add(cid);
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

  // --- Plugins: canonical export layout (EXP-PLUG-001) ---
  const allPaths = [...snapshot.files.keys()].sort((a, b) => a.localeCompare(b));
  for (const path of allPaths) {
    const bytes = snapshot.files.get(path);
    if (!bytes) {
      continue;
    }
    if (!isPluginManifestCandidateBytes(path, bytes)) {
      continue;
    }

    const text = decodeUtf8Strict(bytes);
    const parsedManifest = parsePluginManifest(text, path);
    if (!parsedManifest.ok) {
      throw new Error('Canonicalization requires validated plugin manifests');
    }

    const yaml = parsedManifest.manifest.yaml;
    const pluginId = yaml.pluginId;
    const files = yaml.files;

    if (typeof pluginId !== 'string' || !isValidPluginId(pluginId)) {
      throw new Error('Canonicalization requires validated plugin manifests');
    }
    if (!Array.isArray(files) || files.some((item) => typeof item !== 'string')) {
      throw new Error('Canonicalization requires validated plugin manifests');
    }

    const pluginRoot = `plugins/${pluginId}`;
    const manifestDest = `${pluginRoot}/manifest.md`;
    if (outputFiles.has(manifestDest)) {
      throw new Error(`Duplicate plugin export path ${manifestDest}`);
    }
    outputFiles.set(manifestDest, bytes);

    const resolved = resolvePluginBundlePaths(path, files);
    for (const rel of files) {
      const resolvedPath = resolved.get(rel);
      if (!resolvedPath) {
        throw new Error('Canonicalization requires validated plugin manifests');
      }
      const bundleBytes = snapshot.files.get(resolvedPath);
      if (!bundleBytes) {
        throw new Error('Canonicalization requires validated plugin manifests');
      }
      const bundleDest = `${pluginRoot}/${rel}`;
      if (outputFiles.has(bundleDest)) {
        throw new Error(`Duplicate plugin export path ${bundleDest}`);
      }
      outputFiles.set(bundleDest, bundleBytes);
    }
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
