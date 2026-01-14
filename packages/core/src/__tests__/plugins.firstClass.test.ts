import assert from "node:assert/strict";
import { describe, expect, it } from "vitest";

import { canonicalizeDatasetSnapshot, computeGdHashV1, validateDatasetSnapshot } from "..";
import { loadFixtureSnapshot } from "./fixtureLoader";

function digest(result: ReturnType<typeof computeGdHashV1>): string {
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
    const digestBase = digest(computeGdHashV1(snapshot, "snapshot"));

    const withoutPlugins = new Map(snapshot.files);
    withoutPlugins.delete("extensions/demo/plugin.md");
    withoutPlugins.delete("extensions/demo/entry.js");
    withoutPlugins.delete("extensions/demo/ui.md");
    const digestWithout = digest(computeGdHashV1({ files: withoutPlugins }, "snapshot"));

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
});
