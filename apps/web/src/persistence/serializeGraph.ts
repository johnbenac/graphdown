import type { Graph, GraphNode, GraphTypeDef } from "../../../../src/core/graph";
import type { PersistedGraph } from "./types";

class GraphImpl implements Graph {
  constructor(
    public nodesById: Map<string, GraphNode>,
    public typesByRecordTypeId: Map<string, GraphTypeDef>,
    public outgoing: Map<string, Set<string>>,
    public incoming: Map<string, Set<string>>
  ) {}

  getLinksFrom(id: string): string[] {
    const links = this.outgoing.get(id);
    return links ? [...links].sort((a, b) => a.localeCompare(b)) : [];
  }

  getLinksTo(id: string): string[] {
    const links = this.incoming.get(id);
    return links ? [...links].sort((a, b) => a.localeCompare(b)) : [];
  }

  getRecordTypeId(id: string): string | null {
    const node = this.nodesById.get(id);
    if (!node) {
      return null;
    }
    if (node.kind === "type") {
      const recordTypeId = typeof node.fields.recordTypeId === "string" ? node.fields.recordTypeId : null;
      return recordTypeId ?? null;
    }
    return node.typeId || null;
  }

  getTypeForRecord(id: string): GraphTypeDef | null {
    const node = this.nodesById.get(id);
    if (!node || node.kind !== "record") {
      return null;
    }
    return this.typesByRecordTypeId.get(node.typeId) ?? null;
  }
}

export function serializeGraph(graph: Graph): PersistedGraph {
  return {
    nodes: [...graph.nodesById.values()],
    types: [...graph.typesByRecordTypeId.values()],
    outgoing: [...graph.outgoing.entries()].map(([id, targets]) => [id, [...targets]]),
    incoming: [...graph.incoming.entries()].map(([id, sources]) => [id, [...sources]])
  };
}

export function deserializeGraph(payload: PersistedGraph): Graph {
  return new GraphImpl(
    new Map(payload.nodes.map((node) => [node.id, node])),
    new Map(payload.types.map((type) => [type.recordTypeId, type])),
    new Map(payload.outgoing.map(([id, targets]) => [id, new Set(targets)])),
    new Map(payload.incoming.map(([id, sources]) => [id, new Set(sources)]))
  );
}
