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
    withoutPluginFiles.delete("extensions/demo/plugin.md");
    withoutPluginFiles.delete("extensions/demo/entry.js");
    withoutPluginFiles.delete("extensions/demo/ui.md");
    const digestWithout = digestSnapshot({ files: withoutPluginFiles });

    expect(digestBase).not.toBe(digestWithout);
  });

  it("PLUG-000: plugin objects are included in canonical dataset export", () => {
    const snapshot = loadFixtureSnapshot("plugin-valid-dataset");
    const canonical = canonicalizeDatasetSnapshot(snapshot);

    expect(canonical.files.has("plugins/demo/manifest.md")).toBe(true);
    expect(canonical.files.has("plugins/demo/entry.js")).toBe(true);
    expect(canonical.files.has("plugins/demo/ui.md")).toBe(true);

    expect(canonical.files.has("extensions/demo/plugin.md")).toBe(false);
    expect(canonical.files.has("extensions/demo/entry.js")).toBe(false);
    expect(canonical.files.has("extensions/demo/ui.md")).toBe(false);
  });

  it("PLUG-000: plugin bundle files with malformed YAML are still hashed and exported", () => {
    const manifest = [
      "---",
      "pluginId: demo",
      "gdApiVersion: 1",
      "entry: entry.js",
      "files:",
      "  - entry.js",
      "  - DEVLOG.md",
      "---",
      ""
    ].join("\n");
    const devlog = ["---", "not: [valid, yaml", "# missing close"].join("\n");
    const snapshot: DatasetSnapshot = {
      files: new Map([
        ["extensions/demo/plugin.md", encoder.encode(manifest)],
        ["extensions/demo/entry.js", encoder.encode("console.log('entry');\n")],
        ["extensions/demo/DEVLOG.md", encoder.encode(devlog)]
      ])
    };

    const validation = validateDatasetSnapshot(snapshot);
    expect(validation.ok).toBe(true);

    const canonical = canonicalizeDatasetSnapshot(snapshot);
    expect(canonical.files.has("plugins/demo/manifest.md")).toBe(true);
    expect(canonical.files.has("plugins/demo/entry.js")).toBe(true);
    expect(canonical.files.has("plugins/demo/DEVLOG.md")).toBe(true);

    const digestBase = digestSnapshot(snapshot);
    const updatedFiles = new Map(snapshot.files);
    updatedFiles.set("extensions/demo/DEVLOG.md", encoder.encode(`${devlog}\nUpdate.`));
    const digestUpdated = digestSnapshot({ files: updatedFiles });
    expect(digestUpdated).not.toBe(digestBase);
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
