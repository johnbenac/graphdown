import type { ParsedGraph, RepoSnapshot } from "./types";

export function buildGraphFromSnapshot(snapshot: RepoSnapshot): ParsedGraph {
  const nodes = [...snapshot.files.keys()]
    .sort((a, b) => a.localeCompare(b))
    .map((file) => ({
      id: file,
      file,
    }));

  return {
    nodes,
    edges: [],
  };
}
