import type { DatasetSnapshot } from "@graphdown/core";
import { buildRecordLinkGraphFromSnapshot, parseMarkdownRecord } from "@graphdown/core";
import type {
  RuntimeApiV1,
  RuntimeRecordViewV1,
  RuntimeTypeCompositionComponentV1,
  RuntimeTypeCompositionEdgeV1,
  RuntimeTypeViewV1
} from "@graphdown/runtime";

const textDecoder = typeof TextDecoder !== "undefined" ? new TextDecoder("utf-8") : null;

function decodeBytes(raw: Uint8Array): string {
  if (textDecoder) {
    return textDecoder.decode(raw);
  }
  if (typeof Buffer !== "undefined") {
    return Buffer.from(raw).toString("utf8");
  }
  return String.fromCharCode(...raw);
}

function coerceFields(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

export function createRuntimeApiV1Mock(snapshot?: DatasetSnapshot): RuntimeApiV1 {
  const typeViews = new Map<string, RuntimeTypeViewV1>();
  const recordViews = new Map<string, RuntimeRecordViewV1>();
  const typeFileById = new Map<string, string>();
  const recordFileByKey = new Map<string, string>();
  const recordKeysByType = new Map<string, string[]>();
  const childKeysByParent = new Map<string, string[]>();
  const rootKeysByType = new Map<string, string[]>();

  if (snapshot) {
    for (const [filePath, bytes] of snapshot.files.entries()) {
      const parsed = parseMarkdownRecord(decodeBytes(bytes), filePath);
      if (!parsed.ok) {
        continue;
      }
      const { typeId, recordId, parent } = parsed.yaml;
      if (typeof typeId !== "string") {
        continue;
      }
      if (typeof recordId === "string") {
        const recordKey = `${typeId}:${recordId}`;
        const recordView: RuntimeRecordViewV1 = {
          typeId,
          recordId,
          recordKey,
          fields: coerceFields(parsed.yaml.fields),
          body: parsed.body ?? "",
          ...(typeof parent === "string" || parent === null ? { parent } : {})
        };
        recordViews.set(recordKey, recordView);
        recordFileByKey.set(recordKey, filePath);
        const existing = recordKeysByType.get(typeId);
        if (existing) {
          existing.push(recordKey);
        } else {
          recordKeysByType.set(typeId, [recordKey]);
        }
        if (typeof parent === "string" && parent) {
          const children = childKeysByParent.get(parent);
          if (children) {
            children.push(recordKey);
          } else {
            childKeysByParent.set(parent, [recordKey]);
          }
        } else {
          const roots = rootKeysByType.get(typeId);
          if (roots) {
            roots.push(recordKey);
          } else {
            rootKeysByType.set(typeId, [recordKey]);
          }
        }
        continue;
      }

      const typeView: RuntimeTypeViewV1 = {
        typeId,
        fields: coerceFields(parsed.yaml.fields),
        body: parsed.body ?? ""
      };
      typeViews.set(typeId, typeView);
      typeFileById.set(typeId, filePath);
    }
  }

  const recordLinkGraphResult = snapshot ? buildRecordLinkGraphFromSnapshot(snapshot) : null;
  const recordLinkGraph = recordLinkGraphResult && recordLinkGraphResult.ok ? recordLinkGraphResult.graph : null;

  return {
    apiVersion: 1,
    capabilities: ["gd.api.read"],
    async listTypeIds() {
      return [...typeViews.keys()];
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
    async getParentRecordKey(recordKey: string) {
      return recordViews.get(recordKey)?.parent ?? null;
    },
    async listChildRecordKeys(recordKey: string) {
      return childKeysByParent.get(recordKey) ?? [];
    },
    async listRootRecordKeysByType(typeId: string) {
      return rootKeysByType.get(typeId) ?? [];
    },
    async getTypeCompositionComponents() {
      return null as RuntimeTypeCompositionComponentV1[] | null;
    },
    async listTypeCompositionEdges() {
      return [] as RuntimeTypeCompositionEdgeV1[];
    },
    async getOutgoingRecordLinks(recordKey: string) {
      if (!recordLinkGraph) {
        return [];
      }
      return recordLinkGraph.getOutgoingRecordLinks(recordKey);
    },
    async getIncomingRecordLinks(recordKey: string) {
      if (!recordLinkGraph) {
        return [];
      }
      return recordLinkGraph.getIncomingRecordLinks(recordKey);
    },
    async listTypes() {
      return [...typeViews.values()];
    },
    async listRecordsByType(typeId: string) {
      const recordKeys = recordKeysByType.get(typeId) ?? [];
      return recordKeys.map((key) => recordViews.get(key)).filter(Boolean) as RuntimeRecordViewV1[];
    },
    async getTypeMarkdownBytes(typeId: string) {
      const filePath = typeFileById.get(typeId);
      return filePath ? snapshot?.files.get(filePath) ?? null : null;
    },
    async getRecordMarkdownBytes(recordKey: string) {
      const filePath = recordFileByKey.get(recordKey);
      return filePath ? snapshot?.files.get(filePath) ?? null : null;
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
