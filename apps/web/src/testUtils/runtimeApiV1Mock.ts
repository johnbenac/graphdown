import type { DatasetSnapshot } from "@graphdown/dataset";
import { buildRecordLinkGraphFromSnapshot, parseMarkdownRecord } from "@graphdown/dataset";
import type {
  RuntimeApiV1,
  RuntimeRecordViewV1,
  RuntimeTypeCompositionComponentV1,
  RuntimeTypeCompositionEdgeV1,
  RuntimeTypeViewV1
} from "@graphdown/runtime";

const textDecoder =
  typeof TextDecoder !== "undefined" ? new TextDecoder("utf-8", { fatal: true }) : null;

function decodeBytes(bytes: Uint8Array): string | null {
  if (textDecoder) {
    try {
      return textDecoder.decode(bytes);
    } catch {
      return null;
    }
  }
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("utf8");
  }
  return null;
}

function normalizeFields(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function sortRecordKeys(
  recordKeys: string[],
  recordViews: Map<string, RuntimeRecordViewV1>
): string[] {
  return [...recordKeys].sort((a, b) => {
    const recordA = recordViews.get(a)?.recordId ?? a;
    const recordB = recordViews.get(b)?.recordId ?? b;
    return recordA.localeCompare(recordB);
  });
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
    const entries = [...snapshot.files.entries()].sort(([a], [b]) => a.localeCompare(b));
    for (const [path, bytes] of entries) {
      const text = decodeBytes(bytes);
      if (text === null) {
        continue;
      }
      const parsed = parseMarkdownRecord(text, path);
      if (!parsed.ok) {
        continue;
      }
      const yaml = parsed.yaml;
      const typeId = typeof yaml.typeId === "string" ? yaml.typeId : null;
      if (!typeId) {
        continue;
      }
      const recordId = typeof yaml.recordId === "string" ? yaml.recordId : null;
      if (recordId) {
        const recordKey = `${typeId}:${recordId}`;
        const parent =
          typeof yaml.parent === "string" || yaml.parent === null ? (yaml.parent as string | null) : undefined;
        const recordView: RuntimeRecordViewV1 = {
          typeId,
          recordId,
          recordKey,
          parent,
          fields: normalizeFields(yaml.fields),
          body: parsed.body ?? ""
        };
        recordViews.set(recordKey, recordView);
        recordFileByKey.set(recordKey, path);
        const keysForType = recordKeysByType.get(typeId) ?? [];
        keysForType.push(recordKey);
        recordKeysByType.set(typeId, keysForType);
        continue;
      }
      if (!typeViews.has(typeId)) {
        const typeView: RuntimeTypeViewV1 = {
          typeId,
          fields: normalizeFields(yaml.fields),
          body: parsed.body ?? ""
        };
        typeViews.set(typeId, typeView);
      }
      typeFileById.set(typeId, path);
    }
  }

  for (const [typeId, keys] of recordKeysByType.entries()) {
    recordKeysByType.set(typeId, sortRecordKeys(keys, recordViews));
  }

  for (const record of recordViews.values()) {
    if (record.parent) {
      const existing = childKeysByParent.get(record.parent) ?? [];
      existing.push(record.recordKey);
      childKeysByParent.set(record.parent, existing);
      continue;
    }
    const roots = rootKeysByType.get(record.typeId) ?? [];
    roots.push(record.recordKey);
    rootKeysByType.set(record.typeId, roots);
  }

  for (const [parentKey, keys] of childKeysByParent.entries()) {
    childKeysByParent.set(parentKey, sortRecordKeys(keys, recordViews));
  }
  for (const [typeId, keys] of rootKeysByType.entries()) {
    rootKeysByType.set(typeId, sortRecordKeys(keys, recordViews));
  }

  const graphResult = snapshot ? buildRecordLinkGraphFromSnapshot(snapshot) : null;
  const graph = graphResult && graphResult.ok ? graphResult.graph : null;

  return {
    apiVersion: 1,
    capabilities: ["gd.api.read"],
    async listTypeIds() {
      return [...typeViews.keys()].sort((a, b) => a.localeCompare(b));
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
      return [] as RuntimeTypeCompositionComponentV1[];
    },
    async listTypeCompositionEdges() {
      return [] as RuntimeTypeCompositionEdgeV1[];
    },
    async getOutgoingRecordLinks(recordKey: string) {
      return graph?.getOutgoingRecordLinks(recordKey) ?? [];
    },
    async getIncomingRecordLinks(recordKey: string) {
      return graph?.getIncomingRecordLinks(recordKey) ?? [];
    },
    async listTypes() {
      return [...typeViews.values()].sort((a, b) => a.typeId.localeCompare(b.typeId));
    },
    async listRecordsByType(typeId: string) {
      const recordKeys = recordKeysByType.get(typeId) ?? [];
      return recordKeys.map((key) => recordViews.get(key)).filter(Boolean) as RuntimeRecordViewV1[];
    },
    async getTypeMarkdownBytes(typeId: string) {
      if (!snapshot) {
        return null;
      }
      const filePath = typeFileById.get(typeId);
      return filePath ? snapshot.files.get(filePath) ?? null : null;
    },
    async getRecordMarkdownBytes(recordKey: string) {
      if (!snapshot) {
        return null;
      }
      const filePath = recordFileByKey.get(recordKey);
      return filePath ? snapshot.files.get(filePath) ?? null : null;
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
