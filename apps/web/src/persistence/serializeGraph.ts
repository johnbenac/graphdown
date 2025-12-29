import type { ParsedGraph, PersistedParsedGraph } from "./types";

export function serializeGraph(graph: ParsedGraph): PersistedParsedGraph {
  return { ...graph };
}

export function deserializeGraph(raw: PersistedParsedGraph): ParsedGraph {
  return { ...raw };
}
