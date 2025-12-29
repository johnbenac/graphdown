import { buildGraphFromSnapshot, type Graph, type RepoSnapshot } from "@graphdown/core";

export function parseGraphFromSnapshot(snapshot: RepoSnapshot): Graph {
  const result = buildGraphFromSnapshot(snapshot);
  if (!result.ok) {
    const message = result.errors.map((error) => error.message).join("\n");
    throw new Error(message || "Failed to parse dataset snapshot.");
  }
  return result.graph;
}
