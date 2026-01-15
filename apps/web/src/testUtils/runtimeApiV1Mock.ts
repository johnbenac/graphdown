import type { DatasetSnapshot } from "@graphdown/core";
import type {
  RuntimeApiV1,
  RuntimeRecordViewV1,
  RuntimeTypeCompositionComponentV1,
  RuntimeTypeCompositionEdgeV1,
  RuntimeTypeViewV1
} from "@graphdown/runtime";

const DEFAULT_TYPE_ID = "note";

function inferTypeIds(snapshot?: DatasetSnapshot): string[] {
  if (!snapshot) {
    return [DEFAULT_TYPE_ID];
  }
  const typeIds = new Set<string>();
  for (const path of snapshot.files.keys()) {
    const match = /^types\/([^/]+)\.md$/u.exec(path);
    if (match?.[1]) {
      typeIds.add(match[1]);
    }
  }
  typeIds.add(DEFAULT_TYPE_ID);
  return [...typeIds].sort((a, b) => a.localeCompare(b));
}

export function createRuntimeApiV1Mock(snapshot?: DatasetSnapshot): RuntimeApiV1 {
  const typeIds = inferTypeIds(snapshot);
  const typesById = new Map<string, RuntimeTypeViewV1>(
    typeIds.map((typeId) => [typeId, { typeId, fields: {}, body: "" }])
  );

  const emptyRecordView: RuntimeRecordViewV1[] = [];
  const emptyComponents: RuntimeTypeCompositionComponentV1[] = [];
  const emptyEdges: RuntimeTypeCompositionEdgeV1[] = [];

  return {
    apiVersion: 1,
    capabilities: ["gd.api.read"],

    listTypeIds: async () => typeIds,
    listRecordKeysByType: async () => [],

    getType: async (typeId: string) => typesById.get(typeId) ?? null,
    getRecord: async () => null,

    getParentRecordKey: async () => null,
    listChildRecordKeys: async () => [],
    listRootRecordKeysByType: async () => [],

    getTypeCompositionComponents: async () => emptyComponents,
    listTypeCompositionEdges: async () => emptyEdges,

    getOutgoingRecordLinks: async () => [],
    getIncomingRecordLinks: async () => [],

    listTypes: async () => [...typesById.values()],
    listRecordsByType: async () => emptyRecordView,

    getTypeMarkdownBytes: async () => null,
    getRecordMarkdownBytes: async () => null,

    getBlockBytes: async () => null,
    hasBlock: async () => false,

    listBlockCidsPresent: async () => [],
    listBlockCidsReferencedByRecord: async () => [],
    listReachableBlockCids: async () => []
  };
}
