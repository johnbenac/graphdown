import type { DatasetSnapshot } from "@graphdown/core";
import type {
  RuntimeRecordViewV1,
  RuntimeTypeCompositionComponentV1,
  RuntimeTypeCompositionEdgeV1,
  RuntimeTypeViewV1
} from "@graphdown/runtime";
import type { RuntimeApiV1 } from "@graphdown/runtime";

function extractTypeIds(snapshot?: DatasetSnapshot): string[] {
  const typeIds = new Set<string>(["note"]);
  if (!snapshot) {
    return [...typeIds].sort();
  }
  for (const path of snapshot.files.keys()) {
    const typeMatch = path.match(/^types\/([^/]+)\.md$/);
    if (typeMatch) {
      typeIds.add(typeMatch[1]);
    }
  }
  return [...typeIds].sort();
}

function extractRecordKeys(snapshot?: DatasetSnapshot): Map<string, string[]> {
  const recordKeysByType = new Map<string, string[]>();
  if (!snapshot) {
    return recordKeysByType;
  }
  for (const path of snapshot.files.keys()) {
    const recordMatch = path.match(/^records\/([^/]+)\/([^/]+)\.md$/);
    if (!recordMatch) {
      continue;
    }
    const [, typeId, recordId] = recordMatch;
    const recordKey = `${typeId}:${recordId}`;
    const existing = recordKeysByType.get(typeId);
    if (existing) {
      existing.push(recordKey);
    } else {
      recordKeysByType.set(typeId, [recordKey]);
    }
  }
  for (const [typeId, recordKeys] of recordKeysByType.entries()) {
    recordKeysByType.set(typeId, [...new Set(recordKeys)].sort());
  }
  return recordKeysByType;
}

function getTypeView(typeId: string): RuntimeTypeViewV1 {
  return {
    typeId,
    fields: {},
    body: ""
  };
}

function getRecordView(recordKey: string): RuntimeRecordViewV1 {
  const [typeId, recordId = ""] = recordKey.split(":");
  return {
    typeId,
    recordId,
    recordKey,
    parent: null,
    fields: {},
    body: ""
  };
}

function getTypeMarkdownBytes(snapshot: DatasetSnapshot | undefined, typeId: string): Uint8Array | null {
  if (!snapshot) {
    return null;
  }
  return snapshot.files.get(`types/${typeId}.md`) ?? null;
}

function getRecordMarkdownBytes(
  snapshot: DatasetSnapshot | undefined,
  recordKey: string
): Uint8Array | null {
  if (!snapshot) {
    return null;
  }
  const [typeId, recordId = ""] = recordKey.split(":");
  return snapshot.files.get(`records/${typeId}/${recordId}.md`) ?? null;
}

export function createRuntimeApiV1Mock(snapshot?: DatasetSnapshot): RuntimeApiV1 {
  const typeIds = extractTypeIds(snapshot);
  const recordKeysByType = extractRecordKeys(snapshot);
  const typeViews = typeIds.map((typeId) => getTypeView(typeId));

  return {
    apiVersion: 1,
    capabilities: ["gd.api.read"],

    async listTypeIds() {
      return typeIds;
    },
    async listRecordKeysByType(typeId: string) {
      return recordKeysByType.get(typeId) ?? [];
    },

    async getType(typeId: string) {
      return typeIds.includes(typeId) ? getTypeView(typeId) : null;
    },
    async getRecord(recordKey: string) {
      const [typeId] = recordKey.split(":");
      const recordKeys = recordKeysByType.get(typeId) ?? [];
      return recordKeys.includes(recordKey) ? getRecordView(recordKey) : null;
    },

    async getParentRecordKey() {
      return null;
    },
    async listChildRecordKeys() {
      return [];
    },
    async listRootRecordKeysByType(typeId: string) {
      return recordKeysByType.get(typeId) ?? [];
    },

    async getTypeCompositionComponents(typeId: string): Promise<RuntimeTypeCompositionComponentV1[] | null> {
      return typeIds.includes(typeId) ? [] : null;
    },
    async listTypeCompositionEdges(): Promise<RuntimeTypeCompositionEdgeV1[]> {
      return [];
    },

    async getOutgoingRecordLinks() {
      return [];
    },
    async getIncomingRecordLinks() {
      return [];
    },

    async listTypes() {
      return typeViews;
    },
    async listRecordsByType(typeId: string) {
      const recordKeys = recordKeysByType.get(typeId) ?? [];
      return recordKeys.map((recordKey) => getRecordView(recordKey));
    },

    async getTypeMarkdownBytes(typeId: string) {
      return getTypeMarkdownBytes(snapshot, typeId);
    },
    async getRecordMarkdownBytes(recordKey: string) {
      return getRecordMarkdownBytes(snapshot, recordKey);
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
