import { describe, expect, it } from "vitest";
import type { DatasetSnapshot } from "../core/snapshotTypes";
import type { Graph } from "../core/graph";
import { createUiPluginHost } from "./host";

const encoder = new TextEncoder();

function makeSnapshot(pluginReturnValue: string): DatasetSnapshot {
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
  const pluginCode = `return { renderField: () => ${JSON.stringify(pluginReturnValue)} };`;

  return {
    files: new Map([
      ["plugins/boolean-01/plugin.json", encoder.encode(JSON.stringify(manifest))],
      ["plugins/boolean-01/plugin.js", encoder.encode(pluginCode)]
    ])
  };
}

function makeEmptyGraph(): Graph {
  const emptyMap = new Map();
  return {
    typesById: emptyMap,
    recordsByKey: emptyMap,
    nodesById: emptyMap,
    typesByRecordTypeId: emptyMap,
    outgoing: emptyMap,
    incoming: emptyMap,
    getLinksFrom: () => [],
    getLinksTo: () => [],
    getType: () => null,
    getRecord: () => null,
    getTypeForRecord: () => null,
    getRecordTypeId: () => null
  };
}

describe("uiPlugins cache scope", () => {
  it("keeps plugin exports isolated per host", () => {
    const snapshotA = makeSnapshot("A");
    const snapshotB = makeSnapshot("B");
    const graph = makeEmptyGraph();

    const hostA = createUiPluginHost(snapshotA, graph);
    const hostB = createUiPluginHost(snapshotB, graph);

    const ctx = {
      typeId: "note",
      recordId: "one",
      recordKey: "note:one",
      fieldName: "flag",
      kind: "boolean",
      value: true,
      recordFields: {},
      typeFields: {}
    };

    expect(hostA.renderField(ctx)).toBe("A");
    expect(hostB.renderField(ctx)).toBe("B");
  });
});
