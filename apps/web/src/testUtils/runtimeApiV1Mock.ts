import type { DatasetSnapshot } from "@graphdown/core";
import type {
  RuntimeApiV1,
  RuntimeRecordViewV1,
  RuntimeTypeCompositionComponentV1,
  RuntimeTypeCompositionEdgeV1,
  RuntimeTypeViewV1
} from "@graphdown/runtime";

const defaultTypeIds = ["note"];

function collectTypeIds(snapshot?: DatasetSnapshot): string[] {
  const typeIds = new Set<string>(defaultTypeIds);
  if (snapshot) {
    for (const path of snapshot.files.keys()) {
      const match = path.match(/^types\/(.+)\.md$/);
      if (match?.[1]) {
        typeIds.add(match[1]);
      }
    }
  }
  return [...typeIds];
}

function buildTypeViews(typeIds: string[]): Map<string, RuntimeTypeViewV1> {
  const views = new Map<string, RuntimeTypeViewV1>();
  for (const typeId of typeIds) {
    views.set(typeId, { typeId, fields: {}, body: "" });
  }
  return views;
}

function buildRecordViews(snapshot?: DatasetSnapshot): Map<string, RuntimeRecordViewV1> {
  const views = new Map<string, RuntimeRecordViewV1>();
  if (!snapshot) {
    return views;
  }
  for (const path of snapshot.files.keys()) {
    const match = path.match(/^records\/([^/]+)\/(.+)\.md$/);
    if (!match) {
      continue;
    }
    const typeId = match[1];
    const recordId = match[2];
    const recordKey = `${typeId}:${recordId}`;
    views.set(recordKey, { typeId, recordId, recordKey, fields: {}, body: "" });
  }
  return views;
}

function buildRecordKeysByType(
  recordViews: Map<string, RuntimeRecordViewV1>
): Map<string, string[]> {
  const recordKeysByType = new Map<string, string[]>();
  for (const record of recordViews.values()) {
    const existing = recordKeysByType.get(record.typeId);
    if (existing) {
      existing.push(record.recordKey);
    } else {
      recordKeysByType.set(record.typeId, [record.recordKey]);
    }
  }
  return recordKeysByType;
}

export function createRuntimeApiV1Mock(snapshot?: DatasetSnapshot): RuntimeApiV1 {
  const typeIds = collectTypeIds(snapshot);
  const typeViews = buildTypeViews(typeIds);
  const recordViews = buildRecordViews(snapshot);
  const recordKeysByType = buildRecordKeysByType(recordViews);

  return {
    apiVersion: 1,
    capabilities: ["gd.api.read"],
    async listTypeIds() {
      return [...typeIds];
    },
    async listRecordKeysByType(typeId: string) {
      return recordKeysByType.get(typeId) ?? [];
    },
    async getType(typeId: string) {
      return typeViews.get(typeId) ?? null;
    },
    async getRecord(recordKey: string) {
      return recordViews.get(recordKey) ?? null;
    },
    async getParentRecordKey() {
      return null;
    },
    async listChildRecordKeys() {
      return [];
    },
    async listRootRecordKeysByType() {
      return [];
    },
    async getTypeCompositionComponents() {
      return [] as RuntimeTypeCompositionComponentV1[];
    },
    async listTypeCompositionEdges() {
      return [] as RuntimeTypeCompositionEdgeV1[];
    },
    async getOutgoingRecordLinks() {
      return [];
    },
    async getIncomingRecordLinks() {
      return [];
    },
    async listTypes() {
      return [...typeViews.values()];
    },
    async listRecordsByType(typeId: string) {
      const recordKeys = recordKeysByType.get(typeId) ?? [];
      return recordKeys.map((key) => recordViews.get(key)).filter(Boolean) as RuntimeRecordViewV1[];
    },
    async getTypeMarkdownBytes() {
      return null;
    },
    async getRecordMarkdownBytes() {
      return null;
    },
    async getBlockBytes() {
      return null;
    },
    async hasBlock() {
      return false;
    },
    async listBlockCidsPresent() {
      return [];
    },
    async listBlockCidsReferencedByRecord() {
      return [];
    },
    async listReachableBlockCids() {
      return [];
    }
  };
}
