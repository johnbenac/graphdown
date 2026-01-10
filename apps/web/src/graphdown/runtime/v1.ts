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

  const typesById = new Map<string, RuntimeTypeViewV1>();
  const recordsByKey = new Map<string, RuntimeRecordViewV1>();
  const recordKeysByTypeId = new Map<string, string[]>();

  for (const typeObj of parsed.typeObjects) {
    const view: RuntimeTypeViewV1 = {
      typeId: typeObj.typeId,
      fields: typeObj.fields,
      body: typeObj.body
    };
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
      body: recordObj.body
    };
    deepFreeze(view);
    recordsByKey.set(recordKey, view);
    if (!recordKeysByTypeId.has(recordObj.typeId)) {
      recordKeysByTypeId.set(recordObj.typeId, []);
    }
    recordKeysByTypeId.get(recordObj.typeId)?.push(recordKey);
  }

  const typeIdsSorted = [...typesById.keys()].sort((a, b) => a.localeCompare(b));
  deepFreeze(typeIdsSorted);

  for (const [typeId, recordKeys] of recordKeysByTypeId) {
    recordKeys.sort((a, b) => a.localeCompare(b));
    deepFreeze(recordKeys);
    recordKeysByTypeId.set(typeId, recordKeys);
  }

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
      getType: (typeId: string) => typesById.get(typeId) ?? null,
      getRecord: (recordKey: string) => recordsByKey.get(recordKey) ?? null,
      getOutgoingRecordLinks: (recordKey: string) =>
        [...graph.getOutgoingRecordLinks(recordKey)].sort((a, b) => a.localeCompare(b)),
      getIncomingRecordLinks: (recordKey: string) =>
        [...graph.getIncomingRecordLinks(recordKey)].sort((a, b) => a.localeCompare(b))
    }
  };
}
