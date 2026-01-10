import type { DatasetSnapshot } from '../model/snapshotTypes';
import type { ValidationError } from '../validate/errors';
import { discoverGraphdownObjects } from '../parse/datasetObjects';
import { buildRecordLinkGraphFromSnapshot } from '../graph/graph';
import { validateDatasetSnapshot } from '../validate/validateDatasetSnapshot';

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

export interface RuntimeApiV1 {
  apiVersion: 1;
  capabilities: readonly RuntimeCapabilityV1[];

  listTypeIds(): string[];
  listRecordKeysByType(typeId: string): string[];

  getType(typeId: string): RuntimeTypeViewV1 | null;
  getRecord(recordKey: string): RuntimeRecordViewV1 | null;

  getOutgoingRecordLinks(recordKey: string): string[];
  getIncomingRecordLinks(recordKey: string): string[];
}

export type RuntimeApiResult<T> =
  | { ok: true; value: T }
  | { ok: false; errors: ValidationError[] };

function deepFreeze<T>(value: T, seen: WeakSet<object> = new WeakSet()): T {
  if (!value || typeof value !== 'object') {
    return value;
  }
  if (value instanceof Map || value instanceof Set) {
    return value;
  }
  if (seen.has(value as object)) {
    return value;
  }
  seen.add(value as object);
  if (Array.isArray(value)) {
    for (const item of value) {
      deepFreeze(item, seen);
    }
    return Object.freeze(value);
  }
  for (const item of Object.values(value as Record<string, unknown>)) {
    deepFreeze(item, seen);
  }
  return Object.freeze(value);
}

export async function openRuntimeApiV1(input: {
  snapshot: DatasetSnapshot;
}): Promise<RuntimeApiResult<RuntimeApiV1>> {
  const validation = validateDatasetSnapshot(input.snapshot);
  if (!validation.ok) {
    return { ok: false, errors: validation.errors };
  }

  const parsed = discoverGraphdownObjects(input.snapshot);
  if (parsed.errors.length > 0) {
    return { ok: false, errors: parsed.errors };
  }

  const graphResult = buildRecordLinkGraphFromSnapshot(input.snapshot);
  if (!graphResult.ok) {
    return { ok: false, errors: graphResult.errors };
  }

  const typesById = new Map<string, RuntimeTypeViewV1>();
  const recordsByKey = new Map<string, RuntimeRecordViewV1>();
  const recordKeysByTypeId = new Map<string, string[]>();

  for (const typeObj of parsed.typeObjects) {
    const view: RuntimeTypeViewV1 = {
      typeId: typeObj.typeId,
      fields: typeObj.fields,
      body: typeObj.body,
    };
    deepFreeze(view.fields);
    deepFreeze(view);
    typesById.set(typeObj.typeId, view);
  }

  for (const recordObj of parsed.recordObjects) {
    const recordKey = recordObj.identity;
    const view: RuntimeRecordViewV1 = {
      typeId: recordObj.typeId,
      recordId: recordObj.recordId,
      recordKey,
      parent: recordObj.parent,
      fields: recordObj.fields,
      body: recordObj.body,
    };
    deepFreeze(view.fields);
    deepFreeze(view);
    recordsByKey.set(recordKey, view);
    const list = recordKeysByTypeId.get(recordObj.typeId) ?? [];
    list.push(recordKey);
    recordKeysByTypeId.set(recordObj.typeId, list);
  }

  const typeIdsSorted = [...typesById.keys()].sort((a, b) => a.localeCompare(b));
  for (const [typeId, recordKeys] of recordKeysByTypeId.entries()) {
    recordKeys.sort((a, b) => a.localeCompare(b));
    deepFreeze(recordKeys);
    recordKeysByTypeId.set(typeId, recordKeys);
  }

  const capabilities = deepFreeze<RuntimeCapabilityV1[]>(['gd.api.read']);
  deepFreeze(typeIdsSorted);

  const graph = graphResult.graph;

  const session: RuntimeApiV1 = {
    apiVersion: RUNTIME_API_VERSION_V1,
    capabilities,
    listTypeIds() {
      return [...typeIdsSorted];
    },
    listRecordKeysByType(typeId: string) {
      const recordKeys = recordKeysByTypeId.get(typeId);
      return recordKeys ? [...recordKeys] : [];
    },
    getType(typeId: string) {
      return typesById.get(typeId) ?? null;
    },
    getRecord(recordKey: string) {
      return recordsByKey.get(recordKey) ?? null;
    },
    getOutgoingRecordLinks(recordKey: string) {
      return [...graph.getOutgoingRecordLinks(recordKey)].sort((a, b) => a.localeCompare(b));
    },
    getIncomingRecordLinks(recordKey: string) {
      return [...graph.getIncomingRecordLinks(recordKey)].sort((a, b) => a.localeCompare(b));
    },
  };

  return { ok: true, value: session };
}
