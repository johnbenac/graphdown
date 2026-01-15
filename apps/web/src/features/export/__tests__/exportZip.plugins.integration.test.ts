import { strToU8 } from "fflate";
import { describe, expect, it } from "vitest";
import {
  blockPathForCid,
  canonicalizeDatasetSnapshot,
  cidFromRawBytes,
  buildDatasetZipBytes,
  loadDatasetSnapshotFromZipBytes
} from "@graphdown/core";
import type { DatasetSnapshot } from "@graphdown/core";

function snapshotFromEntries(entries: Array<[string, string | Uint8Array]>): DatasetSnapshot {
  return {
    files: new Map(
      entries.map(([path, contents]) => [
        path,
        contents instanceof Uint8Array ? contents : new Uint8Array(strToU8(contents))
      ])
    )
  };
}

function exportAndLoad(rawSnapshot: DatasetSnapshot) {
  const canonical = canonicalizeDatasetSnapshot(rawSnapshot);
  const zipBytes = buildDatasetZipBytes(canonical);
  return loadDatasetSnapshotFromZipBytes(zipBytes);
}

describe("buildDatasetZipBytes plugin export", () => {
  it("EXP-PLUG-001: exports plugin bundles in canonical layout with exact bytes", () => {
    const pluginBlockBytes = new Uint8Array(strToU8("plugin-block"));
    const pluginCid = cidFromRawBytes(pluginBlockBytes);
    const pluginBlockPath = blockPathForCid(pluginCid);

    const manifest = [
      "---",
      "pluginId: demo",
      "gdApiVersion: 1",
      "entry: entry.js",
      "files:",
      "  - entry.js",
      "  - ui.md",
      "blocks:",
      `  - ${pluginCid}`,
      "---",
      "",
      "Plugin manifest."
    ].join("\n");

    const entryBytes = new Uint8Array(strToU8("console.log('entry');"));
    const uiBytes = new Uint8Array(strToU8("# UI"));

    const snapshot = snapshotFromEntries([
      ["weird/type-location.md", ["---", "typeId: note", "fields: {}", "---"].join("\n")],
      [
        "deep/nested/record.md",
        ["---", "typeId: note", "recordId: one", "fields: {}", "---", "Body"].join("\n")
      ],
      ["extensions/demo/plugin.md", manifest],
      ["extensions/demo/entry.js", entryBytes],
      ["extensions/demo/ui.md", uiBytes],
      ["docs/readme.md", "ignored"],
      [pluginBlockPath, pluginBlockBytes]
    ]);

    const imported = exportAndLoad(snapshot);

    expect(imported.files.has("plugins/demo/manifest.md")).toBe(true);
    expect(imported.files.has("plugins/demo/entry.js")).toBe(true);
    expect(imported.files.has("plugins/demo/ui.md")).toBe(true);

    expect(imported.files.has("extensions/demo/plugin.md")).toBe(false);
    expect(imported.files.has("extensions/demo/entry.js")).toBe(false);
    expect(imported.files.has("extensions/demo/ui.md")).toBe(false);
    expect(imported.files.has("docs/readme.md")).toBe(false);

    expect(imported.files.get("plugins/demo/manifest.md")).toEqual(snapshot.files.get("extensions/demo/plugin.md"));
    expect(imported.files.get("plugins/demo/entry.js")).toEqual(snapshot.files.get("extensions/demo/entry.js"));
    expect(imported.files.get("plugins/demo/ui.md")).toEqual(snapshot.files.get("extensions/demo/ui.md"));

    const paths = [...imported.files.keys()].sort();
    expect(paths).toEqual(
      [
        "plugins/demo/entry.js",
        "plugins/demo/manifest.md",
        "plugins/demo/ui.md",
        "records/note.one/one.md",
        "types/note.md",
        pluginBlockPath
      ].sort()
    );
  });

  it("EXP-006: includes plugin-declared blocks even when records do not reference them", () => {
    const pluginBlockBytes = new Uint8Array(strToU8("plugin-only-block"));
    const pluginCid = cidFromRawBytes(pluginBlockBytes);
    const pluginBlockPath = blockPathForCid(pluginCid);

    const manifest = [
      "---",
      "pluginId: demo",
      "gdApiVersion: 1",
      "entry: entry.js",
      "files:",
      "  - entry.js",
      "blocks:",
      `  - ${pluginCid}`,
      "---",
      "",
      "Plugin manifest."
    ].join("\n");

    const snapshot = snapshotFromEntries([
      ["types/note.md", ["---", "typeId: note", "fields: {}", "---"].join("\n")],
      [
        "records/note/record.md",
        ["---", "typeId: note", "recordId: one", "fields: {}", "---", "No refs"].join("\n")
      ],
      ["extensions/demo/plugin.md", manifest],
      ["extensions/demo/entry.js", "console.log('entry');"],
      [pluginBlockPath, pluginBlockBytes]
    ]);

    const imported = exportAndLoad(snapshot);
    expect(imported.files.has(pluginBlockPath)).toBe(true);
  });

  it("EXP-PLUG-001: preserves binary plugin bundle files through export/import", () => {
    const manifest = [
      "---",
      "pluginId: demo",
      "gdApiVersion: 1",
      "entry: entry.js",
      "files:",
      "  - entry.js",
      "  - assets/logo.bin",
      "binaryFiles:",
      "  - assets/logo.bin",
      "---",
      "",
      "Plugin manifest."
    ].join("\n");

    const entryBytes = new Uint8Array(strToU8("console.log('entry');"));
    const logoBytes = new Uint8Array([0xff, 0xd8, 0xff, 0x00, 0x80]);

    const snapshot = snapshotFromEntries([
      ["types/note.md", ["---", "typeId: note", "fields: {}", "---"].join("\n")],
      [
        "records/note/record.md",
        ["---", "typeId: note", "recordId: one", "fields: {}", "---", "No refs"].join("\n")
      ],
      ["extensions/demo/plugin.md", manifest],
      ["extensions/demo/entry.js", entryBytes],
      ["extensions/demo/assets/logo.bin", logoBytes]
    ]);

    const imported = exportAndLoad(snapshot);

    expect(imported.files.get("plugins/demo/assets/logo.bin")).toEqual(logoBytes);
    expect(imported.files.get("plugins/demo/manifest.md")).toEqual(snapshot.files.get("extensions/demo/plugin.md"));
  });
});
