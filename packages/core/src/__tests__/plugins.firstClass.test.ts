import { describe, expect, it } from "vitest";

import { canonicalizeDatasetSnapshot, computeGdHashV1, validateDatasetSnapshot } from "..";
import { loadFixtureSnapshot } from "./fixtureLoader";

function digestOrThrow(result: ReturnType<typeof computeGdHashV1>): string {
  if (!result.ok) {
    throw new Error(JSON.stringify(result.errors));
  }
  return result.cid;
}

describe("plugins as first-class dataset objects", () => {
  it("PLUG-000: plugin objects are validated at import time", () => {
    const snapshot = loadFixtureSnapshot("plugin-invalid-entry-not-in-files");
    const result = validateDatasetSnapshot(snapshot);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.map((error) => error.code)).toContain("E_PLUGIN_ENTRY_INVALID");
  });

  it("PLUG-000: plugin objects participate in snapshot hashing", () => {
    const snapshot = loadFixtureSnapshot("plugin-valid-dataset");
    const digestBase = digestOrThrow(computeGdHashV1(snapshot, "snapshot"));

    const reducedFiles = new Map(snapshot.files);
    reducedFiles.delete("extensions/demo/plugin.md");
    reducedFiles.delete("extensions/demo/entry.js");
    reducedFiles.delete("extensions/demo/ui.md");

    const digestReduced = digestOrThrow(
      computeGdHashV1({ files: reducedFiles }, "snapshot")
    );

    expect(digestReduced).not.toEqual(digestBase);
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

  it("PLUG-000: dataset remains valid without plugins present", () => {
    const snapshot = loadFixtureSnapshot("valid-dataset");
    const validation = validateDatasetSnapshot(snapshot);

    expect(validation.ok).toBe(true);
    const canonical = canonicalizeDatasetSnapshot(snapshot);
    expect(canonical.files.size).toBeGreaterThan(0);
    expect(digestOrThrow(computeGdHashV1(snapshot, "snapshot"))).toBeTruthy();
  });
});
