import type { ParsedGraph, RepoSnapshot } from "./types";

export function buildParsedGraph(snapshot: RepoSnapshot): ParsedGraph {
  const size = snapshot.bytes.length;
  return {
    nodeCount: 0,
    edgeCount: 0,
    summary: `${snapshot.fileName} (${size.toLocaleString()} bytes)`,
  };
}
