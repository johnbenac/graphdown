import type { DatasetSnapshot } from '../model/snapshotTypes';
import type { ValidationError } from '../validate/errors';
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

  getOutgoingRecordLinks(recordKey: string): string[];
  getIncomingRecordLinks(recordKey: string): string[];

  getParentRecordKey(recordKey: string): string | null;
  listChildRecordKeys(recordKey: string): string[];
  listRootRecordKeysByType(typeId: string): string[];

  getTypeCompositionComponents(typeId: string): RuntimeTypeCompositionComponentV1[] | null;
  listTypeCompositionEdges(): RuntimeTypeCompositionEdgeV1[];

  listTypes(): RuntimeTypeViewV1[];
  listRecordsByType(typeId: string): RuntimeRecordViewV1[];

  getTypeMarkdownBytes(typeId: string): Uint8Array | null;
  getRecordMarkdownBytes(recordKey: string): Uint8Array | null;
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
      const emptyComponents: RuntimeTypeCompositionComponentV1[] = [];
      deepFreeze(emptyComponents);
      typeCompositionByTypeId.set(typeObj.typeId, emptyComponents);
      continue;
    }
    const rawEntries = Object.entries(
      compositionRaw as Record<string, { typeId: string; required: boolean }>
    );
    const components = rawEntries
      .map(([name, component]) => ({
        name,
        componentTypeId: component.typeId,
        required: component.required
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
    deepFreeze(components);
    typeCompositionByTypeId.set(typeObj.typeId, components);
    for (const component of components) {
      typeCompositionEdges.push({
        fromTypeId: typeObj.typeId,
        componentName: component.name,
        toTypeId: component.componentTypeId,
        required: component.required
      });
    }
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
  }

  const typeIdsSorted = [...typesById.keys()].sort((a, b) => a.localeCompare(b));
  deepFreeze(typeIdsSorted);

  for (const [typeId, recordKeys] of recordKeysByTypeId) {
    recordKeys.sort((a, b) => a.localeCompare(b));
    deepFreeze(recordKeys);
    recordKeysByTypeId.set(typeId, recordKeys);
  }

  for (const [parentKey, childKeys] of childrenByParentKey) {
    childKeys.sort((a, b) => a.localeCompare(b));
    deepFreeze(childKeys);
    childrenByParentKey.set(parentKey, childKeys);
  }

  for (const [typeId, rootKeys] of rootRecordKeysByTypeId) {
    rootKeys.sort((a, b) => a.localeCompare(b));
    deepFreeze(rootKeys);
    rootRecordKeysByTypeId.set(typeId, rootKeys);
  }

  typeCompositionEdges.sort((a, b) => {
    const fromCompare = a.fromTypeId.localeCompare(b.fromTypeId);
    if (fromCompare !== 0) {
      return fromCompare;
    }
    return a.componentName.localeCompare(b.componentName);
  });
  deepFreeze(typeCompositionEdges);

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
      listTypes: () =>
        typeIdsSorted
          .map((id) => typesById.get(id))
          .filter((value): value is RuntimeTypeViewV1 => Boolean(value))
          .map((value) => cloneForPlugin(value)),
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
        [...graph.getIncomingRecordLinks(recordKey)].sort((a, b) => a.localeCompare(b))
    }
  };
}
