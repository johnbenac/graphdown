import { describe, expect, it } from "vitest";

import { selectSemanticSnapshotFiles } from "../selectSemanticSnapshotFiles";

const encoder = new TextEncoder();
const bytes = (text: string) => encoder.encode(text);

function pluginManifest(): Uint8Array {
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
  return bytes(manifestText);
}

describe("selectSemanticSnapshotFiles plugin bundles", () => {
  it("IMP-PLUG-001: includes plugin manifest and bundle files in the snapshot", () => {
    const entries = new Map<string, Uint8Array>([
      ["extensions/demo/plugin.md", pluginManifest()],
      ["extensions/demo/entry.js", bytes("console.log('demo');")],
      ["extensions/demo/ui.md", bytes("# demo ui")],
      ["extensions/demo/logo.png", new Uint8Array([0, 1, 2, 3])],
      ["types/note.md", bytes(["---", "typeId: note", "fields: {}", "---"].join("\n"))],
      [
        "records/note-one.md",
        bytes(["---", "typeId: note", "recordId: one", "fields: {}", "---"].join("\n"))
      ],
      ["assets/other.bin", new Uint8Array([9, 8, 7])]
    ]);

    const result = selectSemanticSnapshotFiles(entries);

    expect(result.snapshot.files.has("extensions/demo/plugin.md")).toBe(true);
    expect(result.snapshot.files.has("extensions/demo/entry.js")).toBe(true);
    expect(result.snapshot.files.has("extensions/demo/ui.md")).toBe(true);
    expect(result.snapshot.files.has("extensions/demo/logo.png")).toBe(true);
    expect(result.ignored).toContain("assets/other.bin");
    expect(result.missingPluginBundlePaths).toEqual([]);
  });

  it("reports missing plugin bundle files without adding them to the snapshot", () => {
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
      ["extensions/demo/plugin.md", bytes(manifestText)],
      ["extensions/demo/entry.js", bytes("console.log('demo');")]
    ]);

    const result = selectSemanticSnapshotFiles(entries);

    expect(result.missingPluginBundlePaths).toEqual(["extensions/demo/ui.md"]);
    expect(result.snapshot.files.has("extensions/demo/ui.md")).toBe(false);
  });
});
