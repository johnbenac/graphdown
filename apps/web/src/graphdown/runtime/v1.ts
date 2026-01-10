import { sha256 } from '@noble/hashes/sha256';

import type { DatasetSnapshot } from '../model/snapshotTypes';
import type { ValidationError } from '../validate/errors';
import { isObject } from '../model/types';
import { decodeDaslCidString, blockPathForCid } from '../cid/daslCid';
import { extractCidRefs } from '../parse/wikiRefs';
import { validateDatasetSnapshot } from '../validate/validateDatasetSnapshot';
import { discoverGraphdownObjects } from '../parse/datasetObjects';
import { buildRecordLinkGraphFromSnapshot } from '../graph/graph';

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

  listTypeIds(): string[];
  listRecordKeysByType(typeId: string): string[];

  getType(typeId: string): RuntimeTypeViewV1 | null;
  getRecord(recordKey: string): RuntimeRecordViewV1 | null;

  getParentRecordKey(recordKey: string): string | null;
  listChildRecordKeys(recordKey: string): string[];
  listRootRecordKeysByType(typeId: string): string[];

  getTypeCompositionComponents(typeId: string): RuntimeTypeCompositionComponentV1[] | null;
  listTypeCompositionEdges(): RuntimeTypeCompositionEdgeV1[];

  getOutgoingRecordLinks(recordKey: string): string[];
  getIncomingRecordLinks(recordKey: string): string[];

  listTypes(): RuntimeTypeViewV1[];
  listRecordsByType(typeId: string): RuntimeRecordViewV1[];

  getTypeMarkdownBytes(typeId: string): Uint8Array | null;
  getRecordMarkdownBytes(recordKey: string): Uint8Array | null;

  getBlockBytes(cid: string): Uint8Array | null;
  hasBlock(cid: string): boolean;

  listBlockCidsPresent(): string[];
  listBlockCidsReferencedByRecord(recordKey: string): string[];
  listReachableBlockCids(): string[];
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

function cloneForPlugin<T>(value: T): T {
  const sc = (globalThis as { structuredClone?: (value: unknown) => unknown }).structuredClone;
  if (typeof sc !== 'function') {
    throw new Error('structuredClone is required for Runtime API v1');
  }
  return sc(value) as T;
}

function collectStringValues(value: unknown, into: Set<string>): void {
  if (typeof value === 'string') {
    into.add(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      collectStringValues(item, into);
    }
    return;
  }
  if (isObject(value)) {
    for (const child of Object.values(value)) {
      collectStringValues(child, into);
    }
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

function blockPathForCidOrNull(cid: string): string | null {
  try {
    return blockPathForCid(cid);
  } catch {
    return null;
  }
}

function decodeCidOrNull(cid: string): ReturnType<typeof decodeDaslCidString> | null {
  try {
    return decodeDaslCidString(cid);
  } catch {
    return null;
  }
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

    const { cids } = extractBlockCidsFromRecord(recordObj.fields, recordObj.body);
    deepFreeze(cids);
    blockRefsByRecordKey.set(recordKey, cids);
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

  const reachableBlockCids = new Set<string>();
  for (const cids of blockRefsByRecordKey.values()) {
    for (const cid of cids) {
      reachableBlockCids.add(cid);
    }
  }
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
      listTypeIds: () => [...typeIdsSorted],
      listRecordKeysByType: (typeId: string) => {
        const keys = recordKeysByTypeId.get(typeId);
        return keys ? [...keys] : [];
      },
      getType: (typeId: string) => {
        const view = typesById.get(typeId);
        return view ? cloneForPlugin(view) : null;
      },
      getRecord: (recordKey: string) => {
        const view = recordsByKey.get(recordKey);
        return view ? cloneForPlugin(view) : null;
      },
      getParentRecordKey: (recordKey: string) => {
        const record = recordsByKey.get(recordKey);
        if (!record) {
          return null;
        }
        return typeof record.parent === 'string' ? record.parent : null;
      },
      listChildRecordKeys: (recordKey: string) => {
        const kids = childrenByParentKey.get(recordKey);
        return kids ? [...kids] : [];
      },
      listRootRecordKeysByType: (typeId: string) => {
        const roots = rootRecordKeysByTypeId.get(typeId);
        return roots ? [...roots] : [];
      },
      getTypeCompositionComponents: (typeId: string) => {
        if (!typesById.has(typeId)) {
          return null;
        }
        return cloneForPlugin(typeCompositionByTypeId.get(typeId) ?? []);
      },
      listTypeCompositionEdges: () => cloneForPlugin(typeCompositionEdges),
      listTypes: () =>
        typeIdsSorted
          .map((id) => typesById.get(id))
          .filter((value): value is RuntimeTypeViewV1 => Boolean(value))
          .map((value) => cloneForPlugin(value)),
      listRecordsByType: (typeId: string) => {
        const keys = recordKeysByTypeId.get(typeId) ?? [];
        return keys
          .map((key) => recordsByKey.get(key))
          .filter((value): value is RuntimeRecordViewV1 => Boolean(value))
          .map((value) => cloneForPlugin(value));
      },
      getTypeMarkdownBytes: (typeId: string) => {
        const file = typeFileById.get(typeId);
        if (!file) {
          return null;
        }
        const bytes = snapshotFiles.get(file);
        return bytes ? bytes.slice() : null;
      },
      getRecordMarkdownBytes: (recordKey: string) => {
        const file = recordFileByKey.get(recordKey);
        if (!file) {
          return null;
        }
        const bytes = snapshotFiles.get(file);
        return bytes ? bytes.slice() : null;
      },
      getOutgoingRecordLinks: (recordKey: string) =>
        [...graph.getOutgoingRecordLinks(recordKey)].sort((a, b) => a.localeCompare(b)),
      getIncomingRecordLinks: (recordKey: string) =>
        [...graph.getIncomingRecordLinks(recordKey)].sort((a, b) => a.localeCompare(b)),
      listBlockCidsPresent: () => [...blockCidsPresentSorted],
      listBlockCidsReferencedByRecord: (recordKey: string) => {
        const refs = blockRefsByRecordKey.get(recordKey);
        return refs ? [...refs] : [];
      },
      listReachableBlockCids: () => [...reachableBlockCidsSorted],
      hasBlock: (cid: string) => {
        const path = blockPathForCidOrNull(cid);
        if (!path) {
          return false;
        }
        return snapshotFiles.has(path);
      },
      getBlockBytes: (cid: string) => {
        const path = blockPathForCidOrNull(cid);
        if (!path) {
          return null;
        }
        const bytes = snapshotFiles.get(path);
        if (!bytes) {
          return null;
        }
        const decoded = decodeCidOrNull(cid);
        if (!decoded) {
          return null;
        }
        const digest = sha256(bytes);
        if (digest.length !== decoded.digest.length) {
          return null;
        }
        for (let i = 0; i < digest.length; i += 1) {
          if (digest[i] !== decoded.digest[i]) {
            return null;
          }
        }
        return bytes.slice();
      }
    }
  };
}
