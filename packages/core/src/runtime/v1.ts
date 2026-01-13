import { sha256 } from '@noble/hashes/sha256';

import type { DatasetSnapshot } from '../model/snapshotTypes';
import type { ValidationError } from '../validate/errors';
import { makeError } from '../validate/errors';
import { blockPathForCid, decodeDaslCidString } from '../cid/daslCid';
import { buildRecordLinkGraphFromSnapshot } from '../graph/graph';
import { discoverGraphdownObjects, IDENTIFIER_PATTERN, RECORD_KEY_PATTERN } from '../parse/datasetObjects';
import { extractCidRefs } from '../parse/wikiRefs';
import { validateDatasetSnapshot } from '../validate/validateDatasetSnapshot';
import { collectStringValues } from '../internal/collectStringValues';
import { fail } from './errors';

export const RUNTIME_API_VERSION_V1 = 1 as const;

export type RuntimeCapabilityV1 = 'gd.api.read';

export interface RuntimeTypeViewV1 {
  typeId: string;
  fields: Record<string, unknown>;
  body: string;
}

export interface RuntimeRecordViewV1 {
  typeId: string;
  recordId: string;
  recordKey: string;
  parent?: string | null;
  fields: Record<string, unknown>;
  body: string;
}

export type RuntimeTypeCompositionComponentV1 = {
  name: string;
  componentTypeId: string;
  required: boolean;
};

export type RuntimeTypeCompositionEdgeV1 = {
  fromTypeId: string;
  componentName: string;
  toTypeId: string;
  required: boolean;
};

export interface RuntimeApiV1 {
  apiVersion: 1;
  capabilities: readonly RuntimeCapabilityV1[];

  listTypeIds(): Promise<string[]>;
  listRecordKeysByType(typeId: string): Promise<string[]>;

  getType(typeId: string): Promise<RuntimeTypeViewV1 | null>;
  getRecord(recordKey: string): Promise<RuntimeRecordViewV1 | null>;

  getParentRecordKey(recordKey: string): Promise<string | null>;
  listChildRecordKeys(recordKey: string): Promise<string[]>;
  listRootRecordKeysByType(typeId: string): Promise<string[]>;

  getTypeCompositionComponents(
    typeId: string
  ): Promise<RuntimeTypeCompositionComponentV1[] | null>;
  listTypeCompositionEdges(): Promise<RuntimeTypeCompositionEdgeV1[]>;

  getOutgoingRecordLinks(recordKey: string): Promise<string[]>;
  getIncomingRecordLinks(recordKey: string): Promise<string[]>;

  listTypes(): Promise<RuntimeTypeViewV1[]>;
  listRecordsByType(typeId: string): Promise<RuntimeRecordViewV1[]>;

  getTypeMarkdownBytes(typeId: string): Promise<Uint8Array | null>;
  getRecordMarkdownBytes(recordKey: string): Promise<Uint8Array | null>;

  getBlockBytes(cid: string): Promise<Uint8Array | null>;
  hasBlock(cid: string): Promise<boolean>;

  listBlockCidsPresent(): Promise<string[]>;
  listBlockCidsReferencedByRecord(recordKey: string): Promise<string[]>;
  listReachableBlockCids(): Promise<string[]>;
}

export type RuntimeApiResult<T> =
  | { ok: true; value: T }
  | { ok: false; errors: ValidationError[] };

function deepFreeze<T>(value: T, seen = new WeakSet<object>()): T {
  if (typeof value !== 'object' || value === null) {
    return value;
  }
  if (value instanceof Map || value instanceof Set) {
    return value;
  }
  if (seen.has(value)) {
    return value;
  }
  seen.add(value);
  if (Array.isArray(value)) {
    for (const item of value) {
      deepFreeze(item, seen);
    }
    Object.freeze(value);
    return value;
  }
  const proto = Object.getPrototypeOf(value);
  if (proto === Object.prototype || proto === null) {
    for (const item of Object.values(value as Record<string, unknown>)) {
      deepFreeze(item, seen);
    }
    Object.freeze(value);
  }
  return value;
}

function requireTypeId(op: string, typeId: unknown): string {
  if (typeof typeId !== 'string') {
    fail(op, 'E_USAGE', 'typeId must be a string', { details: { typeId } });
  }
  const trimmed = typeId.trim();
  if (!IDENTIFIER_PATTERN.test(trimmed)) {
    fail(op, 'E_INVALID_IDENTIFIER', 'typeId must satisfy ID-001', {
      hint: `Expected /^[A-Za-z0-9][A-Za-z0-9_-]*$/`,
      details: { typeId, trimmed }
    });
  }
  return trimmed;
}

function requireRecordKey(op: string, recordKey: unknown): string {
  if (typeof recordKey !== 'string') {
    fail(op, 'E_USAGE', 'recordKey must be a string', { details: { recordKey } });
  }
  const trimmed = recordKey.trim();
  if (!RECORD_KEY_PATTERN.test(trimmed)) {
    fail(op, 'E_USAGE', 'recordKey must be "typeId:recordId" (both ID-001)', {
      hint: 'Use listRecordKeysByType(typeId) to discover valid recordKeys.',
      details: { recordKey, trimmed }
    });
  }
  return trimmed;
}

function requireCid(
  op: string,
  cid: unknown
): { cid: string; path: string; decoded: ReturnType<typeof decodeDaslCidString> } {
  if (typeof cid !== 'string') {
    fail(op, 'E_USAGE', 'cid must be a string', { details: { cid } });
  }
  const trimmed = cid.trim();
  try {
    const decoded = decodeDaslCidString(trimmed);
    const path = blockPathForCid(trimmed);
    return { cid: trimmed, path, decoded };
  } catch (error) {
    const hint = error instanceof Error ? error.message : String(error);
    fail(op, 'E_CID_INVALID', 'Invalid DASL CIDv1 string', { hint, details: { cid: trimmed } });
  }
}

function extractBlockCidsFromRecord(fields: unknown, body: string): { cids: string[] } {
  const strings = new Set<string>();
  collectStringValues(fields, strings);
  collectStringValues(body, strings);

  const cids = new Set<string>();
  for (const text of strings) {
    const { cids: found } = extractCidRefs(text);
    for (const cid of found) {
      cids.add(cid);
    }
  }

  return { cids: [...cids].sort((a, b) => a.localeCompare(b)) };
}

export async function openRuntimeApiV1(input: {
  snapshot: DatasetSnapshot;
}): Promise<RuntimeApiResult<RuntimeApiV1>> {
  const validated = validateDatasetSnapshot(input.snapshot);
  if (!validated.ok) {
    return { ok: false, errors: validated.errors };
  }

  const parsed = discoverGraphdownObjects(input.snapshot);
  if (parsed.errors.length > 0) {
    return { ok: false, errors: parsed.errors };
  }

  const graphResult = buildRecordLinkGraphFromSnapshot(input.snapshot);
  if (!graphResult.ok) {
    return { ok: false, errors: graphResult.errors };
  }

  const sc = (globalThis as { structuredClone?: (value: unknown) => unknown }).structuredClone;
  if (typeof sc !== 'function') {
    return {
      ok: false,
      errors: [
        makeError(
          'E_INTERNAL',
          'structuredClone is required for Runtime API v1',
          undefined,
          'Upgrade runtime or polyfill structuredClone'
        )
      ]
    };
  }
  const clone = <T>(value: T): T => sc(value) as T;

  const snapshotFiles = input.snapshot.files;
  const typesById = new Map<string, RuntimeTypeViewV1>();
  const recordsByKey = new Map<string, RuntimeRecordViewV1>();
  const recordKeysByTypeId = new Map<string, string[]>();
  const childrenByParentKey = new Map<string, string[]>();
  const rootRecordKeysByTypeId = new Map<string, string[]>();
  const typeFileById = new Map<string, string>();
  const recordFileByKey = new Map<string, string>();
  const typeCompositionByTypeId = new Map<string, RuntimeTypeCompositionComponentV1[]>();
  const typeCompositionEdges: RuntimeTypeCompositionEdgeV1[] = [];
  const blockRefsByRecordKey = new Map<string, string[]>();
  const reachableBlockCids = new Set<string>();

  for (const typeObj of parsed.typeObjects) {
    const view: RuntimeTypeViewV1 = {
      typeId: typeObj.typeId,
      fields: typeObj.fields,
      body: typeObj.body
    };
    deepFreeze(view);
    typesById.set(typeObj.typeId, view);
    typeFileById.set(typeObj.typeId, typeObj.file);

    const compositionRaw = (typeObj.fields as Record<string, unknown>).composition;
    if (compositionRaw === undefined) {
      const components: RuntimeTypeCompositionComponentV1[] = [];
      deepFreeze(components);
      typeCompositionByTypeId.set(typeObj.typeId, components);
      continue;
    }
    const components: RuntimeTypeCompositionComponentV1[] = [];
    for (const [name, component] of Object.entries(
      compositionRaw as Record<string, { typeId: string; required: boolean }>
    )) {
      const componentTypeId = component.typeId;
      const required = component.required;
      components.push({ name, componentTypeId, required });
      typeCompositionEdges.push({
        fromTypeId: typeObj.typeId,
        componentName: name,
        toTypeId: componentTypeId,
        required
      });
    }
    components.sort((a, b) => a.name.localeCompare(b.name));
    deepFreeze(components);
    typeCompositionByTypeId.set(typeObj.typeId, components);
  }

  for (const recordObj of parsed.recordObjects) {
    const recordKey = recordObj.identity;
    const view: RuntimeRecordViewV1 = {
      typeId: recordObj.typeId,
      recordId: recordObj.recordId,
      recordKey,
      parent: recordObj.parent,
      fields: recordObj.fields,
      body: recordObj.body
    };
    deepFreeze(view);
    recordsByKey.set(recordKey, view);
    recordFileByKey.set(recordKey, recordObj.file);
    const { cids } = extractBlockCidsFromRecord(recordObj.fields, recordObj.body);
    deepFreeze(cids);
    blockRefsByRecordKey.set(recordKey, cids);
    for (const cid of cids) {
      reachableBlockCids.add(cid);
    }
    if (!recordKeysByTypeId.has(recordObj.typeId)) {
      recordKeysByTypeId.set(recordObj.typeId, []);
    }
    recordKeysByTypeId.get(recordObj.typeId)?.push(recordKey);

    if (typeof recordObj.parent === 'string') {
      if (!childrenByParentKey.has(recordObj.parent)) {
        childrenByParentKey.set(recordObj.parent, []);
      }
      childrenByParentKey.get(recordObj.parent)?.push(recordKey);
    } else {
      if (!rootRecordKeysByTypeId.has(recordObj.typeId)) {
        rootRecordKeysByTypeId.set(recordObj.typeId, []);
      }
      rootRecordKeysByTypeId.get(recordObj.typeId)?.push(recordKey);
    }
  }

  const typeIdsSorted = [...typesById.keys()].sort((a, b) => a.localeCompare(b));
  deepFreeze(typeIdsSorted);

  for (const [typeId, recordKeys] of recordKeysByTypeId) {
    recordKeys.sort((a, b) => a.localeCompare(b));
    deepFreeze(recordKeys);
    recordKeysByTypeId.set(typeId, recordKeys);
  }

  for (const [parentKey, children] of childrenByParentKey) {
    children.sort((a, b) => a.localeCompare(b));
    deepFreeze(children);
    childrenByParentKey.set(parentKey, children);
  }

  for (const [typeId, roots] of rootRecordKeysByTypeId) {
    roots.sort((a, b) => a.localeCompare(b));
    deepFreeze(roots);
    rootRecordKeysByTypeId.set(typeId, roots);
  }

  typeCompositionEdges.sort((a, b) => {
    const byType = a.fromTypeId.localeCompare(b.fromTypeId);
    if (byType !== 0) {
      return byType;
    }
    return a.componentName.localeCompare(b.componentName);
  });
  deepFreeze(typeCompositionEdges);

  const reachableBlockCidsSorted = [...reachableBlockCids].sort((a, b) => a.localeCompare(b));
  deepFreeze(reachableBlockCidsSorted);

  const blockCidsPresent = new Set<string>();
  for (const path of snapshotFiles.keys()) {
    if (!path.startsWith('blocks/sha2-256/')) {
      continue;
    }
    const parts = path.split('/');
    if (parts.length !== 4) {
      continue;
    }
    const cid = parts[3];
    if (cid) {
      blockCidsPresent.add(cid);
    }
  }
  const blockCidsPresentSorted = [...blockCidsPresent].sort((a, b) => a.localeCompare(b));
  deepFreeze(blockCidsPresentSorted);

  const capabilities = deepFreeze(['gd.api.read'] as const);
  const graph = graphResult.graph;

  return {
    ok: true,
    value: {
      apiVersion: RUNTIME_API_VERSION_V1,
      capabilities,
      listTypeIds: async () => [...typeIdsSorted],
      listRecordKeysByType: async (typeIdInput: string) => {
        const typeId = requireTypeId('listRecordKeysByType', typeIdInput);
        const keys = recordKeysByTypeId.get(typeId);
        return keys ? [...keys] : [];
      },
      getType: async (typeIdInput: string) => {
        const typeId = requireTypeId('getType', typeIdInput);
        const view = typesById.get(typeId);
        return view ? clone(view) : null;
      },
      getRecord: async (recordKeyInput: string) => {
        const recordKey = requireRecordKey('getRecord', recordKeyInput);
        const view = recordsByKey.get(recordKey);
        return view ? clone(view) : null;
      },
      getParentRecordKey: async (recordKeyInput: string) => {
        const recordKey = requireRecordKey('getParentRecordKey', recordKeyInput);
        const record = recordsByKey.get(recordKey);
        if (!record) {
          return null;
        }
        return typeof record.parent === 'string' ? record.parent : null;
      },
      listChildRecordKeys: async (recordKeyInput: string) => {
        const recordKey = requireRecordKey('listChildRecordKeys', recordKeyInput);
        const kids = childrenByParentKey.get(recordKey);
        return kids ? [...kids] : [];
      },
      listRootRecordKeysByType: async (typeIdInput: string) => {
        const typeId = requireTypeId('listRootRecordKeysByType', typeIdInput);
        const roots = rootRecordKeysByTypeId.get(typeId);
        return roots ? [...roots] : [];
      },
      getTypeCompositionComponents: async (typeIdInput: string) => {
        const typeId = requireTypeId('getTypeCompositionComponents', typeIdInput);
        if (!typesById.has(typeId)) {
          return null;
        }
        return clone(typeCompositionByTypeId.get(typeId) ?? []);
      },
      listTypeCompositionEdges: async () => clone(typeCompositionEdges),
      listTypes: async () =>
        typeIdsSorted
          .map((id) => typesById.get(id))
          .filter((value): value is RuntimeTypeViewV1 => Boolean(value))
          .map((value) => clone(value)),
      listRecordsByType: async (typeIdInput: string) => {
        const typeId = requireTypeId('listRecordsByType', typeIdInput);
        const keys = recordKeysByTypeId.get(typeId) ?? [];
        return keys
          .map((key) => recordsByKey.get(key))
          .filter((value): value is RuntimeRecordViewV1 => Boolean(value))
          .map((value) => clone(value));
      },
      getTypeMarkdownBytes: async (typeIdInput: string) => {
        const typeId = requireTypeId('getTypeMarkdownBytes', typeIdInput);
        const file = typeFileById.get(typeId);
        if (!file) {
          return null;
        }
        const bytes = snapshotFiles.get(file);
        return bytes ? bytes.slice() : null;
      },
      getRecordMarkdownBytes: async (recordKeyInput: string) => {
        const recordKey = requireRecordKey('getRecordMarkdownBytes', recordKeyInput);
        const file = recordFileByKey.get(recordKey);
        if (!file) {
          return null;
        }
        const bytes = snapshotFiles.get(file);
        return bytes ? bytes.slice() : null;
      },
      getBlockBytes: async (cidInput: string) => {
        const op = 'getBlockBytes';
        const { cid, path, decoded } = requireCid(op, cidInput);
        const bytes = snapshotFiles.get(path);
        if (!bytes) {
          fail(op, 'E_BLOCK_REFERENCE_MISSING', `Block is missing for CID ${cid}`, {
            file: path,
            hint: 'Call listBlockCidsPresent() or hasBlock(cid) before resolving bytes.',
            details: { cid, path }
          });
        }
        const digest = sha256(bytes);
        for (let i = 0; i < digest.length; i += 1) {
          if (digest[i] !== decoded.digest[i]) {
            fail(op, 'E_BLOCK_DIGEST_MISMATCH', `Block bytes do not match CID digest for ${cid}`, {
              file: path,
              hint: 'The block file content is corrupted or the CID/path is wrong. Recompute CID from bytes or fix the file.',
              details: { cid, path }
            });
          }
        }
        return bytes.slice();
      },
      hasBlock: async (cidInput: string) => {
        const { path } = requireCid('hasBlock', cidInput);
        return snapshotFiles.has(path);
      },
      listBlockCidsPresent: async () => [...blockCidsPresentSorted],
      listBlockCidsReferencedByRecord: async (recordKeyInput: string) => {
        const recordKey = requireRecordKey('listBlockCidsReferencedByRecord', recordKeyInput);
        const cids = blockRefsByRecordKey.get(recordKey);
        return cids ? [...cids] : [];
      },
      listReachableBlockCids: async () => [...reachableBlockCidsSorted],
      getOutgoingRecordLinks: async (recordKeyInput: string) => {
        const recordKey = requireRecordKey('getOutgoingRecordLinks', recordKeyInput);
        return [...graph.getOutgoingRecordLinks(recordKey)].sort((a, b) => a.localeCompare(b));
      },
      getIncomingRecordLinks: async (recordKeyInput: string) => {
        const recordKey = requireRecordKey('getIncomingRecordLinks', recordKeyInput);
        return [...graph.getIncomingRecordLinks(recordKey)].sort((a, b) => a.localeCompare(b));
      }
    }
  };
}
