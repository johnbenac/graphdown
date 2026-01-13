import { strToU8 } from "fflate";
import { describe, expect, it } from "vitest";
import {
  blockPathForCid,
  canonicalizeDatasetSnapshot,
  cidFromRawBytes,
  loadDatasetSnapshotFromZipBytes,
  buildDatasetZipBytes
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

describe("buildDatasetZipBytes plugins", () => {
  it("EXP-PLUG-001: exports plugins in canonical layout with exact bytes", () => {
    const blockBytes = new Uint8Array(strToU8("plugin-only"));
    const blockCid = cidFromRawBytes(blockBytes);
    const blockPath = blockPathForCid(blockCid);

    const manifestBytes = new Uint8Array(
      strToU8(
        [
          "---",
          "pluginId: demo",
          "gdApiVersion: 1",
          "files:",
          "  - entry.js",
          "  - ui.md",
          "blocks:",
          `  - ${blockCid}`,
          "---",
          "Plugin manifest body"
        ].join("\n")
      )
    );
    const entryBytes = new Uint8Array(strToU8("console.log('hello');"));
    const uiBytes = new Uint8Array(strToU8("# UI\nNo front matter."));

    const snapshot = snapshotFromEntries([
      ["weird/type-location.md", ["---", "typeId: note", "fields: {}", "---"].join("\n")],
      ["deep/nested/record.md", ["---", "typeId: note", "recordId: one", "fields: {}", "---"].join("\n")],
      ["extensions/demo/plugin.md", manifestBytes],
      ["extensions/demo/entry.js", entryBytes],
      ["extensions/demo/ui.md", uiBytes],
      ["docs/readme.md", "Ignore me"],
      [blockPath, blockBytes]
    ]);

    const imported = exportAndLoad(snapshot);

    const paths = [...imported.files.keys()].sort();
    expect(paths).toEqual(
      [
        "plugins/demo/entry.js",
        "plugins/demo/manifest.md",
        "plugins/demo/ui.md",
        "records/note.one/one.md",
        "types/note.md",
        blockPath
      ].sort()
    );

    expect(imported.files.has("extensions/demo/plugin.md")).toBe(false);
    expect(imported.files.has("extensions/demo/entry.js")).toBe(false);
    expect(imported.files.has("extensions/demo/ui.md")).toBe(false);
    expect(imported.files.has("docs/readme.md")).toBe(false);

    expect(imported.files.get("plugins/demo/manifest.md")).toEqual(manifestBytes);
    expect(imported.files.get("plugins/demo/entry.js")).toEqual(entryBytes);
    expect(imported.files.get("plugins/demo/ui.md")).toEqual(uiBytes);
  });

  it("EXP-006: includes blocks declared by plugins even without record references", () => {
    const blockBytes = new Uint8Array(strToU8("plugin-block"));
    const blockCid = cidFromRawBytes(blockBytes);
    const blockPath = blockPathForCid(blockCid);

    const manifestBytes = new Uint8Array(
      strToU8(
        [
          "---",
          "pluginId: plugin-only",
          "gdApiVersion: 1",
          "files:",
          "  - entry.js",
          "blocks:",
          `  - ${blockCid}`,
          "---"
        ].join("\n")
      )
    );
    const entryBytes = new Uint8Array(strToU8("console.log('block');"));

    const snapshot = snapshotFromEntries([
      ["extensions/only/plugin.md", manifestBytes],
      ["extensions/only/entry.js", entryBytes],
      [blockPath, blockBytes]
    ]);

    const imported = exportAndLoad(snapshot);
    expect(imported.files.has(blockPath)).toBe(true);
  });
});
