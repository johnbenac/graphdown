import { describe, expect, it } from "vitest";
import { canonicalizeDatasetSnapshot } from "./canonicalizeDatasetSnapshot";
import type { DatasetSnapshot } from "./snapshotTypes";

function snapshotFromEntries(entries: Array<[string, string | Uint8Array]>): DatasetSnapshot {
  const files = new Map<string, Uint8Array>();
  for (const [path, contents] of entries) {
    files.set(path, typeof contents === "string" ? new TextEncoder().encode(contents) : contents);
  }
  return { files };
}

describe("canonicalizeDatasetSnapshot plugins", () => {
  it("UI-PLUGIN-001: canonicalization rewrites plugin artifacts and UI config to canonical locations", () => {
    const pluginJson = JSON.stringify({
      id: "boolean-01",
      version: "1.0.0",
      entry: "plugin.js",
      providers: [{ id: "default", capability: "field.view", match: { kind: "boolean" } }]
    });
    const configJson = JSON.stringify({
      resolutions: [{ capability: "field.view", match: { kind: "boolean" }, use: "boolean-01" }]
    });
    const snapshot = snapshotFromEntries([
      ["notes/type.md", ["---", "typeId: flag", "fields: {}", "---"].join("\n")],
      ["content/flag.md", ["---", "typeId: flag", "recordId: demo", "fields: {}", "---"].join("\n")],
      ["custom/ui/boolean-01/plugin.json", pluginJson],
      ["custom/ui/boolean-01/plugin.js", "return { renderField() { return 'ok'; } };"],
      ["custom/ui/boolean-01/README.md", "# plugin docs"],
      ["nested/graphdown.ui.json", configJson],
      ["docs/readme.md", "# ignore me"]
    ]);

    const canonical = canonicalizeDatasetSnapshot(snapshot);

    expect(canonical.files.has("plugins/boolean-01/plugin.json")).toBe(true);
    expect(canonical.files.has("plugins/boolean-01/plugin.js")).toBe(true);
    expect(canonical.files.has("plugins/boolean-01/README.md")).toBe(true);
    expect(canonical.files.has("graphdown.ui.json")).toBe(true);

    expect(canonical.files.has("custom/ui/boolean-01/plugin.json")).toBe(false);
    expect(canonical.files.has("custom/ui/boolean-01/plugin.js")).toBe(false);
    expect(canonical.files.has("custom/ui/boolean-01/README.md")).toBe(false);
    expect(canonical.files.has("nested/graphdown.ui.json")).toBe(false);
    expect(canonical.files.has("docs/readme.md")).toBe(false);

    expect(canonical.files.get("plugins/boolean-01/plugin.json")).toEqual(snapshot.files.get("custom/ui/boolean-01/plugin.json"));
    expect(canonical.files.get("plugins/boolean-01/plugin.js")).toEqual(snapshot.files.get("custom/ui/boolean-01/plugin.js"));
    expect(canonical.files.get("graphdown.ui.json")).toEqual(snapshot.files.get("nested/graphdown.ui.json"));
  });
});
