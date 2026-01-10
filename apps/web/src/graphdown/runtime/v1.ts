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

function deepFreeze<T>(value: T, seen = new WeakSet<object>()): T {
  if (!value || typeof value !== 'object') {
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
    return Object.freeze(value);
  }
  for (const item of Object.values(value)) {
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
    const fields = deepFreeze(typeObj.fields);
    const view: RuntimeTypeViewV1 = {
      typeId: typeObj.typeId,
      fields,
      body: typeObj.body,
    };
    typesById.set(typeObj.typeId, deepFreeze(view));
  }

  for (const recordObj of parsed.recordObjects) {
    const recordKey = recordObj.identity;
    const fields = deepFreeze(recordObj.fields);
    const view: RuntimeRecordViewV1 = {
      typeId: recordObj.typeId,
      recordId: recordObj.recordId,
      recordKey,
      parent: recordObj.parent,
      fields,
      body: recordObj.body,
    };
    recordsByKey.set(recordKey, deepFreeze(view));
    if (!recordKeysByTypeId.has(recordObj.typeId)) {
      recordKeysByTypeId.set(recordObj.typeId, []);
    }
    recordKeysByTypeId.get(recordObj.typeId)?.push(recordKey);
  }

  const typeIdsSorted = deepFreeze([...typesById.keys()].sort((a, b) => a.localeCompare(b)));
  for (const [typeId, recordKeys] of recordKeysByTypeId.entries()) {
    recordKeys.sort((a, b) => a.localeCompare(b));
    recordKeysByTypeId.set(typeId, deepFreeze(recordKeys));
  }

  const capabilities = deepFreeze(['gd.api.read'] as RuntimeCapabilityV1[]);
  const graph = graphResult.graph;

  return {
    ok: true,
    value: {
      apiVersion: RUNTIME_API_VERSION_V1,
      capabilities,
      listTypeIds(): string[] {
        return [...typeIdsSorted];
      },
      listRecordKeysByType(typeId: string): string[] {
        const recordKeys = recordKeysByTypeId.get(typeId);
        return recordKeys ? [...recordKeys] : [];
      },
      getType(typeId: string): RuntimeTypeViewV1 | null {
        return typesById.get(typeId) ?? null;
      },
      getRecord(recordKey: string): RuntimeRecordViewV1 | null {
        return recordsByKey.get(recordKey) ?? null;
      },
      getOutgoingRecordLinks(recordKey: string): string[] {
        return graph.getOutgoingRecordLinks(recordKey).sort((a, b) => a.localeCompare(b));
      },
      getIncomingRecordLinks(recordKey: string): string[] {
        return graph.getIncomingRecordLinks(recordKey).sort((a, b) => a.localeCompare(b));
      },
    },
  };
}
