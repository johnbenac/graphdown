import { describe, expect, it } from "vitest";

import { cidFromRawBytes, validateDatasetSnapshot } from "..";
import type { DatasetSnapshot } from "..";
import { loadFixtureSnapshot } from "./fixtureLoader";

const encoder = new TextEncoder();

function snapshotFromEntries(entries: Array<[string, Uint8Array]>): DatasetSnapshot {
  return { files: new Map(entries) };
}

function pluginManifest(yamlLines: string[], body = ""): string {
  return ["---", ...yamlLines, "---", body].join("\n");
}

function getErrorCodes(snapshot: DatasetSnapshot) {
  const result = validateDatasetSnapshot(snapshot);
  if (result.ok) return [];
  return result.errors.map((error) => error.code);
}

describe("plugin validation", () => {
  it("VAL-PLUG-001: plugin-valid-dataset validates successfully", () => {
    const snapshot = loadFixtureSnapshot("plugin-valid-dataset");
    const result = validateDatasetSnapshot(snapshot);
    expect(result.ok).toBe(true);
  });

  it("PLUG-ID-002: duplicate pluginId fails validation", () => {
    const snapshot = loadFixtureSnapshot("plugin-invalid-duplicate-pluginId");
    expect(getErrorCodes(snapshot)).toContain("E_PLUGIN_DUPLICATE_ID");
  });

  it("VAL-PLUG-003: entry must appear in files list", () => {
    const snapshot = loadFixtureSnapshot("plugin-invalid-entry-not-in-files");
    expect(getErrorCodes(snapshot)).toContain("E_PLUGIN_ENTRY_INVALID");
  });

  it("VAL-PLUG-006: files must not include reserved manifest.md", () => {
    const snapshot = loadFixtureSnapshot("plugin-invalid-reserved-manifest-path");
    expect(getErrorCodes(snapshot)).toContain("E_PLUGIN_PATH_RESERVED");
  });

  it("VAL-PLUG-004: unsafe relative paths are rejected", () => {
    const snapshot = loadFixtureSnapshot("plugin-invalid-unsafe-relative-path");
    const codes = getErrorCodes(snapshot);
    expect(codes.includes("E_PLUGIN_ENTRY_INVALID") || codes.includes("E_PLUGIN_PATH_INVALID")).toBe(true);
  });

  it("VAL-PLUG-005: plugin bundle files must be UTF-8 decodable", () => {
    const manifest = pluginManifest([
      "pluginId: demo",
      "gdApiVersion: 1",
      "entry: entry.js",
      "files:",
      "  - entry.js",
      "  - bad.bin"
    ]);
    const snapshot = snapshotFromEntries([
      ["extensions/demo/plugin.md", encoder.encode(manifest)],
      ["extensions/demo/entry.js", encoder.encode("export default 1;")],
      ["extensions/demo/bad.bin", Uint8Array.of(0xff, 0xfe, 0xff)]
    ]);
    expect(getErrorCodes(snapshot)).toContain("E_PLUGIN_UTF8_INVALID");
  });

  it("VAL-PLUG-007: blocks must contain valid CID strings", () => {
    const manifest = pluginManifest([
      "pluginId: demo",
      "gdApiVersion: 1",
      "entry: entry.js",
      "files:",
      "  - entry.js",
      "blocks:",
      "  - not-a-cid"
    ]);
    const snapshot = snapshotFromEntries([
      ["extensions/demo/plugin.md", encoder.encode(manifest)],
      ["extensions/demo/entry.js", encoder.encode("export default 1;")]
    ]);
    expect(getErrorCodes(snapshot)).toContain("E_PLUGIN_BLOCK_CID_INVALID");
  });

  it("VAL-PLUG-008: plugin-declared blocks must resolve to matching block bytes", () => {
    const cid = cidFromRawBytes(encoder.encode("x"));
    const manifest = pluginManifest([
      "pluginId: demo",
      "gdApiVersion: 1",
      "entry: entry.js",
      "files:",
      "  - entry.js",
      "blocks:",
      `  - ${cid}`
    ]);
    const snapshot = snapshotFromEntries([
      ["extensions/demo/plugin.md", encoder.encode(manifest)],
      ["extensions/demo/entry.js", encoder.encode("export default 1;")]
    ]);
    expect(getErrorCodes(snapshot)).toContain("E_PLUGIN_BLOCK_MISSING_OR_INVALID");
  });
});
