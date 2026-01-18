import { describe, expect, it } from "vitest";

import { selectSemanticSnapshotFiles } from "../selectSemanticSnapshotFiles";

const textBytes = (text: string) => new TextEncoder().encode(text);

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
      ["extensions/demo/plugin.md", textBytes(manifestText)],
      ["extensions/demo/entry.js", textBytes("console.log('demo');")],
      ["extensions/demo/ui.md", textBytes("# demo ui")],
      ["extensions/demo/logo.png", new Uint8Array([0, 1, 2, 3])],
      ["assets/other.bin", new Uint8Array([9, 8, 7])]
    ]);

    const result = selectSemanticSnapshotFiles(entries);

    expect(result.snapshot.files.has("extensions/demo/plugin.md")).toBe(true);
    expect(result.snapshot.files.has("extensions/demo/entry.js")).toBe(true);
    expect(result.snapshot.files.has("extensions/demo/ui.md")).toBe(true);
    expect(result.snapshot.files.has("extensions/demo/logo.png")).toBe(true);
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
      "  - ui.md",
      "---",
      "Demo plugin"
    ].join("\n");

    const entries = new Map<string, Uint8Array>([
      ["extensions/demo/plugin.md", textBytes(manifestText)],
      ["extensions/demo/entry.js", textBytes("console.log('demo');")]
    ]);

    const result = selectSemanticSnapshotFiles(entries);

    expect(result.snapshot.files.has("extensions/demo/ui.md")).toBe(false);
    expect(result.missingPluginBundlePaths).toEqual(["extensions/demo/ui.md"]);
  });
});
