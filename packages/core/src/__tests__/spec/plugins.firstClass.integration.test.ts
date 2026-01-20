import assert from "node:assert/strict";
import { describe, expect, it } from "vitest";

import {
  canonicalizeDatasetSnapshot,
  computeGdHashV1,
  validateDatasetSnapshot
} from "../../index";
import type { DatasetSnapshot } from "../../index";
import { loadFixtureSnapshot } from "../fixtureLoader";

const encoder = new TextEncoder();

function digestSnapshot(snapshot: DatasetSnapshot): string {
  const result = computeGdHashV1(snapshot, "snapshot");
  if (!result.ok) {
    assert.fail(JSON.stringify(result.errors));
  }
  return result.cid;
}

describe("plugins first-class behavior", () => {
  it("PLUG-000: plugin objects are validated at import time", () => {
    const snapshot = loadFixtureSnapshot("plugin-invalid-entry-not-in-files");
    const result = validateDatasetSnapshot(snapshot);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.some((error) => error.code === "E_PLUGIN_ENTRY_INVALID")).toBe(true);
  });

  it("PLUG-000: plugin objects participate in snapshot hashing", () => {
    const snapshot = loadFixtureSnapshot("plugin-valid-dataset");
    const digestBase = digestSnapshot(snapshot);

    const withoutPluginFiles = new Map(snapshot.files);
    withoutPluginFiles.delete("plugins/demo/manifest.md");
    withoutPluginFiles.delete("plugins/demo/entry.js");
    withoutPluginFiles.delete("plugins/demo/ui.md");
    const digestWithout = digestSnapshot({ files: withoutPluginFiles });

    expect(digestBase).not.toBe(digestWithout);
  });

  it("PLUG-000: plugin objects are included in canonical dataset export", () => {
    const snapshot = loadFixtureSnapshot("plugin-valid-dataset");
    const canonical = canonicalizeDatasetSnapshot(snapshot);

    expect(canonical.files.has("plugins/demo/manifest.md")).toBe(true);
    expect(canonical.files.has("plugins/demo/entry.js")).toBe(true);
    expect(canonical.files.has("plugins/demo/ui.md")).toBe(true);
  });

  it("LAYOUT-003: plugin bundle files can include malformed front matter and remain hashed/exported", () => {
    const manifestBytes = encoder.encode(
      [
        "---",
        "pluginId: demo",
        "gdApiVersion: 1",
        "entry: entry.js",
        "files:",
        "  - entry.js",
        "  - DEVLOG.md",
        "---",
        "Plugin manifest body"
      ].join("\n")
    );
    const entryBytes = encoder.encode("console.log('entry');\n");
    const devlogBytes = encoder.encode(["---", "not: [valid, yaml", "# missing bracket"].join("\n"));

    const snapshot: DatasetSnapshot = {
      files: new Map<string, Uint8Array>([
        ["plugins/demo/manifest.md", manifestBytes],
        ["plugins/demo/entry.js", entryBytes],
        ["plugins/demo/DEVLOG.md", devlogBytes]
      ])
    };

    const validation = validateDatasetSnapshot(snapshot);
    expect(validation.ok).toBe(true);

    const digest = digestSnapshot(snapshot);
    expect(typeof digest).toBe("string");

    const canonical = canonicalizeDatasetSnapshot(snapshot);
    expect(canonical.files.has("plugins/demo/manifest.md")).toBe(true);
    expect(canonical.files.has("plugins/demo/entry.js")).toBe(true);
    expect(canonical.files.has("plugins/demo/DEVLOG.md")).toBe(true);
  });

  it("VAL-PLUG-005: binary plugin bundle files are validated and exported with raw bytes", () => {
    const manifestBytes = encoder.encode(
      [
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
        ""
      ].join("\n")
    );
    const entryBytes = encoder.encode("console.log('entry');\n");
    const logoBytes = new Uint8Array([0xff, 0xd8, 0xff, 0x00, 0x80]);

    const snapshot: DatasetSnapshot = {
      files: new Map<string, Uint8Array>([
        ["plugins/demo/manifest.md", manifestBytes],
        ["plugins/demo/entry.js", entryBytes],
        ["plugins/demo/assets/logo.bin", logoBytes]
      ])
    };

    const validation = validateDatasetSnapshot(snapshot);
    expect(validation.ok).toBe(true);

    const digest = digestSnapshot(snapshot);
    expect(typeof digest).toBe("string");

    const canonical = canonicalizeDatasetSnapshot(snapshot);
    expect(canonical.files.get("plugins/demo/manifest.md")).toEqual(manifestBytes);
    expect(canonical.files.get("plugins/demo/entry.js")).toEqual(entryBytes);
    expect(canonical.files.get("plugins/demo/assets/logo.bin")).toEqual(logoBytes);
  });

  it("PLUG-000: dataset remains valid without plugins present", () => {
    const snapshot: DatasetSnapshot = {
      files: new Map([
        ["types/note.md", encoder.encode(["---", "typeId: note", "fields: {}", "---", ""].join("\n"))]
      ])
    };

    const result = validateDatasetSnapshot(snapshot);
    expect(result.ok).toBe(true);
    canonicalizeDatasetSnapshot(snapshot);
    const digest = digestSnapshot(snapshot);
    expect(typeof digest).toBe("string");
  });
});
