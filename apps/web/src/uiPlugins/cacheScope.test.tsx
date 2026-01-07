import { render, waitFor, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { buildGraphFromSnapshot } from "../core/graph";
import type { DatasetSnapshot } from "../core/snapshotTypes";
import { createUiPluginHost } from "./host";
import type { FieldViewContext } from "./types";

const manifest = JSON.stringify({
  id: "boolean-01",
  version: "1.0.0",
  entry: "plugin.js",
  providers: [
    {
      id: "default",
      capability: "field.view",
      match: { kind: "boolean" }
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

afterEach(() => cleanup());

describe("UI plugin export cache scope", () => {
  it("does not reuse exports across hosts with the same plugin id and version", async () => {
    const pluginCodeA = `
export default {
  default({ container }) {
    container.textContent = "A";
  }
};`;
    const pluginCodeB = `
export default {
  default({ container }) {
    container.textContent = "B";
  }
};`;
    const snapshotA = makeSnapshot(pluginCodeA);
    const snapshotB = makeSnapshot(pluginCodeB);

    const hostA = makeHost(snapshotA);
    const hostB = makeHost(snapshotB);

    const viewA = hostA.renderField(ctx);
    const { container: containerA } = render(<>{viewA}</>);
    await waitFor(() => expect(containerA.textContent).toContain("A"));

    const viewB = hostB.renderField(ctx);
    const { container: containerB } = render(<>{viewB}</>);
    await waitFor(() => expect(containerB.textContent).toContain("B"));
  });
});
