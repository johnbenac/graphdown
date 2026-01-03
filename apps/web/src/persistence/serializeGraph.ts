import type { Graph, GraphRecordNode, GraphTypeNode } from "../../../../src/core/graph";
import type { PersistedGraph } from "./types";

class GraphImpl implements Graph {
  constructor(
    public typesById: Map<string, GraphTypeNode>,
    public recordsByKey: Map<string, GraphRecordNode>,
    public nodesById: Map<string, GraphTypeNode | GraphRecordNode>,
    public typesByRecordTypeId: Map<string, GraphTypeNode>,
    public outgoing: Map<string, Set<string>>,
    public incoming: Map<string, Set<string>>
  ) {}

  getLinksFrom(recordKey: string): string[] {
    const links = this.outgoing.get(recordKey);
    return links ? [...links].sort((a, b) => a.localeCompare(b)) : [];
  }

  getLinksTo(recordKey: string): string[] {
    const links = this.incoming.get(recordKey);
    return links ? [...links].sort((a, b) => a.localeCompare(b)) : [];
  }

  getType(typeId: string) {
    return this.typesById.get(typeId) ?? null;
  }

  getRecord(recordKey: string) {
    return this.recordsByKey.get(recordKey) ?? null;
  }

  getTypeForRecord(recordKey: string): GraphTypeNode | null {
    const record = this.recordsByKey.get(recordKey);
    if (!record) return null;
    return this.typesById.get(record.typeId) ?? null;
  }

  getRecordTypeId(recordKey: string): string | null {
    const record = this.recordsByKey.get(recordKey);
    if (record) return record.typeId;
    const type = this.typesById.get(recordKey);
    if (type) return type.typeId;
    return null;
  }
}

export function serializeGraph(graph: Graph): PersistedGraph {
  return {
    types: [...graph.typesById.values()],
    records: [...graph.recordsByKey.values()],
    outgoing: [...graph.outgoing.entries()].map(([id, targets]) => [id, [...targets]]),
    incoming: [...graph.incoming.entries()].map(([id, sources]) => [id, [...sources]])
  };
}

export function deserializeGraph(payload: PersistedGraph): Graph {
  const typesById = new Map(payload.types.map((type) => [type.typeId, type]));
  const recordsByKey = new Map(payload.records.map((record) => [record.recordKey, record]));
  const nodesById = new Map<string, GraphTypeNode | GraphRecordNode>();
  for (const type of payload.types) {
    nodesById.set(type.typeId, type);
  }
  for (const record of payload.records) {
    nodesById.set(record.recordKey, record);
  }
  return new GraphImpl(
    typesById,
    recordsByKey,
    nodesById,
    typesById,
    new Map(payload.outgoing.map(([id, targets]) => [id, new Set(targets)])),
    new Map(payload.incoming.map(([id, sources]) => [id, new Set(sources)]))
  );
}
