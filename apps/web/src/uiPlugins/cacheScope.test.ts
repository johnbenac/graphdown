import { describe, expect, it } from "vitest";
import { buildGraphFromSnapshot } from "../core/graph";
import type { DatasetSnapshot } from "../core/snapshotTypes";
import { createUiPluginHost } from "./host";
import type { FieldViewContext } from "./types";

const manifest = JSON.stringify({
  schemaVersion: 1,
  id: "boolean-01",
  version: "1.0.0",
  main: "plugin.js",
  provides: [
    {
      capability: "field.view",
      match: { kind: "boolean" },
      entry: "renderField"
    }
  ]
});

function makeSnapshot(pluginCode: string): DatasetSnapshot {
  const encoder = new TextEncoder();
  const files = new Map<string, Uint8Array>([
    ["plugins/boolean-01/plugin.json", encoder.encode(manifest)],
    ["plugins/boolean-01/plugin.js", encoder.encode(pluginCode)]
  ]);
  return { files };
}

function makeHost(snapshot: DatasetSnapshot) {
  const graphResult = buildGraphFromSnapshot(snapshot);
  if (!graphResult.ok) {
    throw new Error("Graph build failed in test setup");
  }
  return createUiPluginHost(snapshot, graphResult.graph);
}

const ctx: FieldViewContext = {
  typeId: "note",
  recordId: "one",
  recordKey: "note:one",
  fieldName: "value",
  kind: "boolean",
  value: true,
  recordFields: {},
  typeFields: {}
};

describe("UI plugin export cache scope", () => {
  it("does not reuse exports across hosts with the same plugin id and version", () => {
    const snapshotA = makeSnapshot('return { renderField() { return "A"; } };');
    const snapshotB = makeSnapshot('return { renderField() { return "B"; } };');

    const hostA = makeHost(snapshotA);
    const hostB = makeHost(snapshotB);

    expect(hostA.renderField(ctx)).toBe("A");
    expect(hostB.renderField(ctx)).toBe("B");
  });
});
