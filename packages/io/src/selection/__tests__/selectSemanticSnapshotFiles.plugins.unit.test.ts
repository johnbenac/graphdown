import { describe, expect, it } from "vitest";

import { selectSemanticSnapshotFiles } from "../selectSemanticSnapshotFiles";

const encoder = new TextEncoder();

describe("selectSemanticSnapshotFiles plugin bundles", () => {
  it("IMP-PLUG-001: includes plugin manifest and bundle files in the snapshot", () => {
    const manifestText = [
      "---",
      "pluginId: demo",
      "gdApiVersion: 1",
      "entry: entry.js",
      "files:",
      "  - entry.js",
      "  - ui.md",
      "binaryFiles:",
      "  - logo.png",
      "---",
      "Demo plugin"
    ].join("\n");

    const entries = new Map<string, Uint8Array>([
      ["extensions/demo/plugin.md", encoder.encode(manifestText)],
      ["extensions/demo/entry.js", encoder.encode("console.log('demo');")],
      ["extensions/demo/ui.md", encoder.encode("# demo ui")],
      ["extensions/demo/logo.png", new Uint8Array([0, 1, 2, 3])],
      [
        "types/note.md",
        encoder.encode(["---", "typeId: note", "fields: {}", "---"].join("\n"))
      ],
      ["assets/other.bin", new Uint8Array([9, 8, 7])]
    ]);

    const result = selectSemanticSnapshotFiles(entries);

    expect(result.snapshot.files.has("extensions/demo/plugin.md")).toBe(true);
    expect(result.snapshot.files.has("extensions/demo/entry.js")).toBe(true);
    expect(result.snapshot.files.has("extensions/demo/ui.md")).toBe(true);
    expect(result.snapshot.files.has("extensions/demo/logo.png")).toBe(true);
    expect(result.pluginManifestPaths).toEqual(["extensions/demo/plugin.md"]);
    expect(result.missingPluginBundlePaths).toEqual([]);
    expect(result.ignored).toContain("assets/other.bin");
  });

  it("reports missing plugin bundle paths without including them in the snapshot", () => {
    const manifestText = [
      "---",
      "pluginId: demo",
      "gdApiVersion: 1",
      "entry: entry.js",
      "files:",
      "  - entry.js",
      "  - ui.md",
      "---",
      "Demo plugin"
    ].join("\n");

    const entries = new Map<string, Uint8Array>([
      ["extensions/demo/plugin.md", encoder.encode(manifestText)],
      ["extensions/demo/ui.md", encoder.encode("# demo ui")]
    ]);

    const result = selectSemanticSnapshotFiles(entries);

    expect(result.requiredPluginBundlePaths).toEqual([
      "extensions/demo/entry.js",
      "extensions/demo/ui.md"
    ]);
    expect(result.missingPluginBundlePaths).toEqual(["extensions/demo/entry.js"]);
    expect(result.snapshot.files.has("extensions/demo/entry.js")).toBe(false);
  });
});
