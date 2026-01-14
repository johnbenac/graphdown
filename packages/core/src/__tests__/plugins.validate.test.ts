import { describe, expect, it } from "vitest";

import { cidFromRawBytes, validateDatasetSnapshot } from "..";
import type { DatasetSnapshot } from "..";
import { loadFixtureSnapshot } from "./fixtureLoader";

const encoder = new TextEncoder();

function snapshotFromEntries(entries: Array<[string, Uint8Array]>): DatasetSnapshot {
  return { files: new Map(entries) };
}

function manifestContent(lines: string[]): Uint8Array {
  return encoder.encode(["---", ...lines, "---", ""].join("\n"));
}

function getErrorCodes(snapshot: DatasetSnapshot): string[] {
  const result = validateDatasetSnapshot(snapshot);
  if (result.ok) return [];
  return result.errors.map((error) => error.code);
}

function expectDuplicatePluginIdFails() {
  const snapshot = loadFixtureSnapshot("plugin-invalid-duplicate-pluginId");
  expect(getErrorCodes(snapshot)).toContain("E_PLUGIN_DUPLICATE_ID");
}

describe("plugins validation", () => {
  it("VAL-PLUG-001: plugin-valid-dataset validates successfully", () => {
    const snapshot = loadFixtureSnapshot("plugin-valid-dataset");
    const result = validateDatasetSnapshot(snapshot);
    expect(result.ok).toBe(true);
  });

  it("PLUG-ID-002: duplicate pluginId fails validation", () => {
    expectDuplicatePluginIdFails();
  });

  it("VAL-PLUG-002: duplicate pluginId fails validation", () => {
    expectDuplicatePluginIdFails();
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
    expect(getErrorCodes(snapshot)).toEqual(
      expect.arrayContaining([expect.stringMatching(/E_PLUGIN_ENTRY_INVALID|E_PLUGIN_PATH_INVALID/)])
    );
  });

  it("VAL-PLUG-005: plugin bundle files must be UTF-8 decodable", () => {
    const manifest = manifestContent([
      "pluginId: demo",
      "gdApiVersion: 1",
      "entry: entry.js",
      "files:",
      "  - entry.js",
      "  - bad.bin"
    ]);
    const snapshot = snapshotFromEntries([
      ["extensions/demo/plugin.md", manifest],
      ["extensions/demo/entry.js", encoder.encode("console.log('ok');")],
      ["extensions/demo/bad.bin", new Uint8Array([0xff, 0xfe, 0xff])]
    ]);

    expect(getErrorCodes(snapshot)).toContain("E_PLUGIN_UTF8_INVALID");
  });

  it("VAL-PLUG-007: blocks must contain valid CID strings", () => {
    const manifest = manifestContent([
      "pluginId: demo",
      "gdApiVersion: 1",
      "entry: entry.js",
      "files:",
      "  - entry.js",
      "blocks:",
      "  - not-a-cid"
    ]);
    const snapshot = snapshotFromEntries([
      ["extensions/demo/plugin.md", manifest],
      ["extensions/demo/entry.js", encoder.encode("console.log('ok');")]
    ]);

    expect(getErrorCodes(snapshot)).toContain("E_PLUGIN_BLOCK_CID_INVALID");
  });

  it("VAL-PLUG-008: plugin-declared blocks must resolve to matching block bytes", () => {
    const cid = cidFromRawBytes(encoder.encode("x"));
    const manifest = manifestContent([
      "pluginId: demo",
      "gdApiVersion: 1",
      "entry: entry.js",
      "files:",
      "  - entry.js",
      "blocks:",
      `  - ${cid}`
    ]);
    const snapshot = snapshotFromEntries([
      ["extensions/demo/plugin.md", manifest],
      ["extensions/demo/entry.js", encoder.encode("console.log('ok');")]
    ]);

    expect(getErrorCodes(snapshot)).toContain("E_PLUGIN_BLOCK_MISSING_OR_INVALID");
  });

  it("PLUG-FR-002: plugin-valid-dataset passes manifest schema validation", () => {
    const snapshot = loadFixtureSnapshot("plugin-valid-dataset");
    const result = validateDatasetSnapshot(snapshot);
    expect(result.ok).toBe(true);
  });

  it("PLUG-FR-002: missing required keys fails with E_PLUGIN_KEYS_INVALID", () => {
    const manifest = manifestContent(["pluginId: demo", "gdApiVersion: 1"]);
    const snapshot = snapshotFromEntries([["extensions/demo/plugin.md", manifest]]);

    const result = validateDatasetSnapshot(snapshot);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.some((error) => error.code === "E_PLUGIN_KEYS_INVALID")).toBe(true);
    expect(result.errors.some((error) => error.message.includes("missing required keys"))).toBe(true);
  });

  it("PLUG-FR-002: unknown top-level keys fail with E_PLUGIN_KEYS_INVALID", () => {
    const manifest = manifestContent([
      "pluginId: demo",
      "gdApiVersion: 1",
      "entry: entry.js",
      "files:",
      "  - entry.js",
      "  - ui.md",
      "extra: true"
    ]);
    const snapshot = snapshotFromEntries([
      ["extensions/demo/plugin.md", manifest],
      ["extensions/demo/entry.js", encoder.encode("console.log('ok');")],
      ["extensions/demo/ui.md", encoder.encode("ok")]
    ]);

    const result = validateDatasetSnapshot(snapshot);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.some((error) => error.code === "E_PLUGIN_KEYS_INVALID")).toBe(true);
    expect(result.errors.some((error) => error.message.includes("unknown key"))).toBe(true);
  });

  it("PLUG-FR-002: forbidden top-level keys fail with E_PLUGIN_KEYS_INVALID", () => {
    const manifest = manifestContent([
      "pluginId: demo",
      "gdApiVersion: 1",
      "entry: entry.js",
      "files:",
      "  - entry.js",
      "  - ui.md",
      "fields: {}"
    ]);
    const snapshot = snapshotFromEntries([
      ["extensions/demo/plugin.md", manifest],
      ["extensions/demo/entry.js", encoder.encode("console.log('ok');")],
      ["extensions/demo/ui.md", encoder.encode("ok")]
    ]);

    const result = validateDatasetSnapshot(snapshot);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.some((error) => error.code === "E_PLUGIN_KEYS_INVALID")).toBe(true);
    expect(result.errors.some((error) => error.message.includes("forbidden keys"))).toBe(true);
  });
});
