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
  for (const key of Object.keys(value)) {
    deepFreeze((value as Record<string, unknown>)[key], seen);
  }
  Object.freeze(value);
  return value;
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
    const typeView: RuntimeTypeViewV1 = {
      typeId: typeObj.typeId,
      fields: deepFreeze(typeObj.fields),
      body: typeObj.body,
    };
    typesById.set(typeObj.typeId, deepFreeze(typeView));
  }

  for (const recordObj of parsed.recordObjects) {
    const recordKey = recordObj.identity;
    const recordView: RuntimeRecordViewV1 = {
      typeId: recordObj.typeId,
      recordId: recordObj.recordId,
      recordKey,
      parent: recordObj.parent,
      fields: deepFreeze(recordObj.fields),
      body: recordObj.body,
    };
    recordsByKey.set(recordKey, deepFreeze(recordView));
    const recordKeys = recordKeysByTypeId.get(recordObj.typeId) ?? [];
    recordKeys.push(recordKey);
    recordKeysByTypeId.set(recordObj.typeId, recordKeys);
  }

  const typeIdsSorted = [...typesById.keys()].sort((a, b) => a.localeCompare(b));
  deepFreeze(typeIdsSorted);

  for (const [typeId, recordKeys] of recordKeysByTypeId) {
    recordKeys.sort((a, b) => a.localeCompare(b));
    recordKeysByTypeId.set(typeId, deepFreeze(recordKeys));
  }

  const capabilities = deepFreeze(['gd.api.read'] as const);
  const graph = graphResult.graph;

  const session: RuntimeApiV1 = {
    apiVersion: RUNTIME_API_VERSION_V1,
    capabilities,
    listTypeIds: () => [...typeIdsSorted],
    listRecordKeysByType: (typeId) => {
      const recordKeys = recordKeysByTypeId.get(typeId);
      return recordKeys ? [...recordKeys] : [];
    },
    getType: (typeId) => typesById.get(typeId) ?? null,
    getRecord: (recordKey) => recordsByKey.get(recordKey) ?? null,
    getOutgoingRecordLinks: (recordKey) =>
      [...graph.getOutgoingRecordLinks(recordKey)].sort((a, b) => a.localeCompare(b)),
    getIncomingRecordLinks: (recordKey) =>
      [...graph.getIncomingRecordLinks(recordKey)].sort((a, b) => a.localeCompare(b)),
  };

  return {
    ok: true,
    value: session,
  };
}
