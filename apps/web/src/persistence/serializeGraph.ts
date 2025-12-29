import type { Graph, GraphNode, GraphTypeDef } from "@graphdown/core";

export interface PersistedGraph {
  nodesById: Array<[string, GraphNode]>;
  typesByRecordTypeId: Array<[string, GraphTypeDef]>;
  outgoing: Array<[string, string[]]>;
  incoming: Array<[string, string[]]>;
}

class HydratedGraph implements Graph {
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
    if (node.kind === "dataset") {
      return "sys:dataset";
    }
    if (node.kind === "type") {
      const recordTypeId = node.fields.recordTypeId;
      return typeof recordTypeId === "string" ? recordTypeId : null;
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
    nodesById: [...graph.nodesById.entries()],
    typesByRecordTypeId: [...graph.typesByRecordTypeId.entries()],
    outgoing: [...graph.outgoing.entries()].map(([key, value]) => [key, [...value]]),
    incoming: [...graph.incoming.entries()].map(([key, value]) => [key, [...value]]),
  };
}

export function deserializeGraph(raw: PersistedGraph): Graph {
  return new HydratedGraph(
    new Map(raw.nodesById),
    new Map(raw.typesByRecordTypeId),
    new Map(raw.outgoing.map(([key, value]) => [key, new Set(value)])),
    new Map(raw.incoming.map(([key, value]) => [key, new Set(value)]))
  );
}
