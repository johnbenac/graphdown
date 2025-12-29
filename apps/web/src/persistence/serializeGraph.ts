import type { ParsedGraph, PersistedParsedGraph } from "./types";

export function serializeGraph(graph: ParsedGraph): PersistedParsedGraph {
  return graph;
}

export function deserializeGraph(graph: PersistedParsedGraph): ParsedGraph {
  return graph;
}
