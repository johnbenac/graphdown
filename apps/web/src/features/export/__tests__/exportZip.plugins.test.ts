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

describe("buildDatasetZipBytes plugins", () => {
  it("EXP-PLUG-001: exports plugin manifests and bundles in canonical layout", () => {
    const blockBytes = new Uint8Array(strToU8("plugin-block"));
    const blockCid = cidFromRawBytes(blockBytes);
    const blockPath = blockPathForCid(blockCid);

    const manifestText = [
      "---",
      "pluginId: demo",
      "gdApiVersion: v1",
      "files:",
      "  - entry.js",
      "  - ui.md",
      "blocks:",
      `  - ${blockCid}`,
      "---",
      "# Demo plugin"
    ].join("\n");
    const manifestBytes = new Uint8Array(strToU8(manifestText));
    const entryBytes = new Uint8Array(strToU8("console.log('demo');"));
    const uiBytes = new Uint8Array(strToU8("# UI"));

    const snapshot = snapshotFromEntries([
      ["weird/type-location.md", ["---", "typeId: note", "fields: {}", "---"].join("\n")],
      ["deep/nested/record.md", ["---", "typeId: note", "recordId: one", "fields: {}", "---"].join("\n")],
      ["extensions/demo/plugin.md", manifestBytes],
      ["extensions/demo/entry.js", entryBytes],
      ["extensions/demo/ui.md", uiBytes],
      ["docs/readme.md", "# ignore"],
      [blockPath, blockBytes]
    ]);

    const imported = exportAndLoad(snapshot);

    expect(imported.files.has("plugins/demo/manifest.md")).toBe(true);
    expect(imported.files.has("plugins/demo/entry.js")).toBe(true);
    expect(imported.files.has("plugins/demo/ui.md")).toBe(true);

    expect(imported.files.has("extensions/demo/plugin.md")).toBe(false);
    expect(imported.files.has("extensions/demo/entry.js")).toBe(false);
    expect(imported.files.has("extensions/demo/ui.md")).toBe(false);
    expect(imported.files.has("docs/readme.md")).toBe(false);

    expect(imported.files.get("plugins/demo/manifest.md")).toEqual(manifestBytes);
    expect(imported.files.get("plugins/demo/entry.js")).toEqual(entryBytes);
    expect(imported.files.get("plugins/demo/ui.md")).toEqual(uiBytes);

    const paths = [...imported.files.keys()].sort();
    expect(paths).toEqual(
      ["types/note.md", "records/note.one/one.md", "plugins/demo/manifest.md", "plugins/demo/entry.js", "plugins/demo/ui.md", blockPath].sort()
    );
  });

  it("EXP-006: reachable blocks include plugin-declared blocks", () => {
    const blockBytes = new Uint8Array(strToU8("plugin-only-block"));
    const blockCid = cidFromRawBytes(blockBytes);
    const blockPath = blockPathForCid(blockCid);

    const manifestText = [
      "---",
      "pluginId: blocks",
      "gdApiVersion: v1",
      "files:",
      "  - entry.js",
      "blocks:",
      `  - ${blockCid}`,
      "---",
      "# Plugin"
    ].join("\n");

    const snapshot = snapshotFromEntries([
      ["extensions/blocks/manifest.md", manifestText],
      ["extensions/blocks/entry.js", "export const demo = true;"],
      [blockPath, blockBytes]
    ]);

    const imported = exportAndLoad(snapshot);
    expect(imported.files.has(blockPath)).toBe(true);
  });
});
