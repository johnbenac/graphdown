import type {
  RecordLinkGraph,
  RecordLinkGraphRecordNode,
  RecordLinkGraphTypeNode
} from "../graphdown";
import type { PersistedRecordLinkGraphCache } from "./types";

class RecordLinkGraphImpl implements RecordLinkGraph {
  constructor(
    public typesById: Map<string, RecordLinkGraphTypeNode>,
    public recordsByKey: Map<string, RecordLinkGraphRecordNode>,
    public nodesByIdentity: Map<string, RecordLinkGraphTypeNode | RecordLinkGraphRecordNode>,
    public outgoingRecordLinks: Map<string, Set<string>>,
    public incomingRecordLinks: Map<string, Set<string>>
  ) {}

  getOutgoingRecordLinks(recordKey: string): string[] {
    const links = this.outgoingRecordLinks.get(recordKey);
    return links ? [...links].sort((a, b) => a.localeCompare(b)) : [];
  }

  getIncomingRecordLinks(recordKey: string): string[] {
    const links = this.incomingRecordLinks.get(recordKey);
    return links ? [...links].sort((a, b) => a.localeCompare(b)) : [];
  }

  getType(typeId: string) {
    return this.typesById.get(typeId) ?? null;
  }

  getRecord(recordKey: string) {
    return this.recordsByKey.get(recordKey) ?? null;
  }

  getTypeForRecord(recordKey: string): RecordLinkGraphTypeNode | null {
    const record = this.recordsByKey.get(recordKey);
    if (!record) return null;
    return this.typesById.get(record.typeId) ?? null;
  }

  getTypeIdForIdentity(identity: string): string | null {
    const record = this.recordsByKey.get(identity);
    if (record) return record.typeId;
    const type = this.typesById.get(identity);
    if (type) return type.typeId;
    return null;
  }
}

export function serializeRecordLinkGraphCache(graph: RecordLinkGraph): PersistedRecordLinkGraphCache {
  return {
    types: [...graph.typesById.values()],
    records: [...graph.recordsByKey.values()],
    outgoingRecordLinks: [...graph.outgoingRecordLinks.entries()].map(([id, targets]) => [id, [...targets]]),
    incomingRecordLinks: [...graph.incomingRecordLinks.entries()].map(([id, sources]) => [id, [...sources]])
  };
}

export function deserializeRecordLinkGraphCache(payload: PersistedRecordLinkGraphCache): RecordLinkGraph {
  const typesById = new Map(payload.types.map((type) => [type.typeId, type]));
  const recordsByKey = new Map(payload.records.map((record) => [record.recordKey, record]));
  const nodesByIdentity = new Map<string, RecordLinkGraphTypeNode | RecordLinkGraphRecordNode>();
  for (const type of payload.types) {
    nodesByIdentity.set(type.typeId, type);
  }
  for (const record of payload.records) {
    nodesByIdentity.set(record.recordKey, record);
  }
  return new RecordLinkGraphImpl(
    typesById,
    recordsByKey,
    nodesByIdentity,
    new Map(payload.outgoingRecordLinks.map(([id, targets]) => [id, new Set(targets)])),
    new Map(payload.incomingRecordLinks.map(([id, sources]) => [id, new Set(sources)]))
  );
}
