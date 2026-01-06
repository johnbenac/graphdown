import { describe, expect, it } from "vitest";
import { strToU8 } from "fflate";
import { canonicalizeDatasetSnapshot } from "../core/canonicalizeDatasetSnapshot";
import { buildGraphFromSnapshot } from "../core/graph";
import type { DatasetSnapshot } from "../core/snapshotTypes";
import { createUiPluginHost } from "./host";

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

const typeContent = ["---", "typeId: flag", "fields: {}", "---"].join("\n");

function toBytes(value: string): Uint8Array {
  return new Uint8Array(strToU8(value));
}

function buildHost(pluginReturnValue: string) {
  const files = new Map<string, Uint8Array>();
  files.set("types/flag.md", toBytes(typeContent));
  files.set("plugins/boolean-01/plugin.json", toBytes(manifest));
  files.set(
    "plugins/boolean-01/plugin.js",
    toBytes(
      ["return {", "  renderField() {", `    return "${pluginReturnValue}";`, "  }", "};"].join("\n")
    )
  );
  const snapshot: DatasetSnapshot = { files };
  const canonical = canonicalizeDatasetSnapshot(snapshot);
  const graphResult = buildGraphFromSnapshot(canonical);
  if (!graphResult.ok) {
    throw new Error("Graph build failed in test setup");
  }
  return createUiPluginHost(canonical, graphResult.graph);
}

describe("UiPluginHost export cache scope", () => {
  it("scopes plugin exports per dataset host instance", () => {
    const hostA = buildHost("A");
    const hostB = buildHost("B");

    const ctx = {
      typeId: "flag",
      recordId: "one",
      recordKey: "flag:one",
      fieldName: "value",
      kind: "boolean",
      value: true,
      recordFields: {},
      typeFields: {}
    };

    expect(hostA.renderField(ctx)).toBe("A");
    expect(hostB.renderField(ctx)).toBe("B");
  });
});
