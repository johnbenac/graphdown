import { describe, expect, it } from "vitest";
import { buildGraphFromSnapshot } from "../core/graph";
import type { DatasetSnapshot } from "../core/snapshotTypes";
import { createUiPluginHost } from "./host";

function buildSnapshot(label: string): DatasetSnapshot {
  const encoder = new TextEncoder();
  const manifest = {
    schemaVersion: 1,
    id: "boolean-01",
    version: "1.0.0",
    provides: [
      {
        capability: "field.view",
        match: { kind: "boolean" },
        entry: "renderField"
      }
    ]
  };
  return {
    files: new Map<string, Uint8Array>([
      ["plugins/boolean-01/plugin.json", encoder.encode(JSON.stringify(manifest))],
      ["plugins/boolean-01/plugin.js", encoder.encode(`return { renderField: () => "${label}" };`)]
    ])
  };
}

describe("ui plugin export cache", () => {
  it("does not leak exports across hosts for identical plugin id versions", () => {
    const snapshotA = buildSnapshot("A");
    const snapshotB = buildSnapshot("B");

    const graphA = buildGraphFromSnapshot(snapshotA);
    if (!graphA.ok) {
      throw new Error("Failed to build graph for snapshot A");
    }
    const graphB = buildGraphFromSnapshot(snapshotB);
    if (!graphB.ok) {
      throw new Error("Failed to build graph for snapshot B");
    }

    const hostA = createUiPluginHost(snapshotA, graphA.graph);
    const hostB = createUiPluginHost(snapshotB, graphB.graph);

    const ctx = {
      typeId: "note",
      recordId: "one",
      recordKey: "note:one",
      fieldName: "done",
      kind: "boolean",
      value: true,
      recordFields: {},
      typeFields: {}
    };

    expect(hostA.renderField(ctx)).toBe("A");
    expect(hostB.renderField(ctx)).toBe("B");
  });
});
