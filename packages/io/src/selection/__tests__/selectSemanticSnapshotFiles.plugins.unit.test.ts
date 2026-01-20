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
      "  - logo.png",
      "binaryFiles:",
      "  - logo.png",
      "---",
      "Demo plugin"
    ].join("\n");

    const entries = new Map<string, Uint8Array>([
      ["plugins/demo/manifest.md", encoder.encode(manifestText)],
      ["plugins/demo/entry.js", encoder.encode("console.log('demo');")],
      ["plugins/demo/ui.md", encoder.encode("# demo ui")],
      ["plugins/demo/logo.png", new Uint8Array([0, 1, 2, 3])],
      [
        "types/note.md",
        encoder.encode(["---", "typeId: note", "fields: {}", "---"].join("\n"))
      ],
      [
        "records/note-one.md",
        encoder.encode(["---", "typeId: note", "recordId: one", "fields: {}", "---"].join("\n"))
      ],
      ["assets/other.bin", new Uint8Array([9, 8, 7])]
    ]);

    const result = selectSemanticSnapshotFiles(entries);

    expect(result.snapshot.files.has("plugins/demo/manifest.md")).toBe(true);
    expect(result.snapshot.files.has("plugins/demo/entry.js")).toBe(true);
    expect(result.snapshot.files.has("plugins/demo/ui.md")).toBe(true);
    expect(result.snapshot.files.has("plugins/demo/logo.png")).toBe(true);
    expect(result.missingPluginBundlePaths).toEqual([]);
    expect(result.ignored).toContain("assets/other.bin");
  });

  it("reports missing plugin bundle paths without throwing", () => {
    const manifestText = [
      "---",
      "pluginId: demo",
      "gdApiVersion: 1",
      "entry: entry.js",
      "files:",
      "  - entry.js",
      "---",
      "Demo plugin"
    ].join("\n");

    const entries = new Map<string, Uint8Array>([
      ["plugins/demo/manifest.md", encoder.encode(manifestText)],
      [
        "types/note.md",
        encoder.encode(["---", "typeId: note", "fields: {}", "---"].join("\n"))
      ]
    ]);

    const result = selectSemanticSnapshotFiles(entries);

    expect(result.snapshot.files.has("plugins/demo/manifest.md")).toBe(true);
    expect(result.snapshot.files.has("plugins/demo/entry.js")).toBe(false);
    expect(result.requiredPluginBundlePaths).toEqual(["plugins/demo/entry.js"]);
    expect(result.missingPluginBundlePaths).toEqual(["plugins/demo/entry.js"]);
  });
});
