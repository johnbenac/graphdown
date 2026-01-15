import type { DatasetSnapshot } from "@graphdown/core";
import type { RuntimeApiV1 } from "@graphdown/runtime";

function extractTypeIds(snapshot?: DatasetSnapshot): string[] {
  const typeIds = new Set<string>();
  if (snapshot) {
    for (const path of snapshot.files.keys()) {
      if (path.startsWith("types/") && path.endsWith(".md")) {
        const fileName = path.slice("types/".length, -".md".length).trim();
        if (fileName) {
          typeIds.add(fileName);
        }
      }
    }
  }
  typeIds.add("note");
  return [...typeIds].sort((a, b) => a.localeCompare(b));
}

function extractRecordKeys(snapshot?: DatasetSnapshot, typeId?: string): string[] {
  if (!snapshot) {
    return [];
  }
  const recordKeys: string[] = [];
  for (const path of snapshot.files.keys()) {
    if (!path.startsWith("records/") || !path.endsWith(".md")) {
      continue;
    }
    const [prefix, recordType, recordIdWithExt] = path.split("/");
    if (prefix !== "records" || !recordType || !recordIdWithExt) {
      continue;
    }
    if (typeId && recordType !== typeId) {
      continue;
    }
    const recordId = recordIdWithExt.replace(/\.md$/, "");
    if (recordId) {
      recordKeys.push(`${recordType}:${recordId}`);
    }
  }
  return recordKeys.sort((a, b) => a.localeCompare(b));
}

export function createRuntimeApiV1Mock(snapshot?: DatasetSnapshot): RuntimeApiV1 {
  const typeIds = extractTypeIds(snapshot);
  return {
    apiVersion: 1,
    capabilities: ["gd.api.read"],

    listTypeIds: async () => typeIds,
    listRecordKeysByType: async (typeId: string) => extractRecordKeys(snapshot, typeId),

    getType: async () => null,
    getRecord: async () => null,

    getParentRecordKey: async () => null,
    listChildRecordKeys: async () => [],
    listRootRecordKeysByType: async () => [],

    getTypeCompositionComponents: async () => null,
    listTypeCompositionEdges: async () => [],

    getOutgoingRecordLinks: async () => [],
    getIncomingRecordLinks: async () => [],

    listTypes: async () =>
      typeIds.map((typeId) => ({
        typeId,
        fields: {},
        body: ""
      })),
    listRecordsByType: async () => [],

    getTypeMarkdownBytes: async () => null,
    getRecordMarkdownBytes: async () => null,

    getBlockBytes: async () => null,
    hasBlock: async () => false,

    listBlockCidsPresent: async () => [],
    listBlockCidsReferencedByRecord: async () => [],
    listReachableBlockCids: async () => []
  };
}
