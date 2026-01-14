import assert from "node:assert/strict";
import { test } from "vitest";

import { computeGdHashV1 } from "../../index";
import type { DatasetSnapshot } from "../../index";
import { loadFixtureSnapshot } from "../fixtureLoader";

const encoder = new TextEncoder();

function digest(result: ReturnType<typeof computeGdHashV1>): string {
  if (!result.ok) {
    assert.fail(JSON.stringify(result.errors));
  }
  return result.cid;
}

test(
  "HASH-001: snapshot hash includes plugin objects and is path-independent for plugin directory relocation",
  () => {
    const base = loadFixtureSnapshot("plugin-valid-dataset");
    const digestBase = digest(computeGdHashV1(base, "snapshot"));

    const withoutPluginFiles = new Map(base.files);
    withoutPluginFiles.delete("extensions/demo/plugin.md");
    withoutPluginFiles.delete("extensions/demo/entry.js");
    withoutPluginFiles.delete("extensions/demo/ui.md");
    const digestWithout = digest(computeGdHashV1({ files: withoutPluginFiles }, "snapshot"));
    assert.notEqual(digestBase, digestWithout);

    const movedFiles = new Map<string, Uint8Array>();
    for (const [path, bytes] of base.files) {
      const newPath = path.startsWith("extensions/demo/")
        ? path.replace("extensions/demo/", "relocated/demo/")
        : path;
      movedFiles.set(newPath, bytes);
    }
    const digestMoved = digest(computeGdHashV1({ files: movedFiles }, "snapshot"));
    assert.equal(digestMoved, digestBase);
  }
);

test("HASH-003: snapshot fingerprint changes when a plugin bundle file changes", () => {
  const base = loadFixtureSnapshot("plugin-valid-dataset");
  const digestBase = digest(computeGdHashV1(base, "snapshot"));

  const updatedFiles = new Map(base.files);
  updatedFiles.set("extensions/demo/entry.js", encoder.encode("console.log('updated');\n"));
  const digestUpdated = digest(computeGdHashV1({ files: updatedFiles }, "snapshot"));

  assert.notEqual(digestUpdated, digestBase);
});

test("HASH-001: plugin bundle files with broken front matter are hashed", () => {
  const base = loadFixtureSnapshot("plugin-bundle-bad-frontmatter");
  const digestBase = digest(computeGdHashV1(base, "snapshot"));

  const updatedFiles = new Map(base.files);
  updatedFiles.set(
    "extensions/demo/DEVLOG.md",
    encoder.encode("---\nnot: [still, broken\n# updated\n")
  );
  const digestUpdated = digest(computeGdHashV1({ files: updatedFiles }, "snapshot"));

  assert.notEqual(digestUpdated, digestBase);
});

test("HASH-001: duplicate pluginId manifests fail hashing with E_DUPLICATE_ID", () => {
  const snap = loadFixtureSnapshot("plugin-invalid-duplicate-pluginId");
  const result = computeGdHashV1(snap, "snapshot");
  if (result.ok) {
    assert.fail("Expected duplicate pluginId error");
  }
  assert.ok(result.errors.some((e) => e.code === "E_DUPLICATE_ID"));
});

test("HASH-001: duplicate plugin bundle identities fail hashing with E_DUPLICATE_ID", () => {
  const manifest = [
    "---",
    "pluginId: demo",
    "gdApiVersion: 1",
    "entry: entry.js",
    "files:",
    "  - entry.js",
    "  - entry.js",
    "---",
    ""
  ].join("\n");
  const snapshot: DatasetSnapshot = {
    files: new Map<string, Uint8Array>([
      ["plugin.md", encoder.encode(manifest)],
      ["entry.js", encoder.encode("console.log('entry');\n")]
    ])
  };

  const result = computeGdHashV1(snapshot, "snapshot");
  if (result.ok) {
    assert.fail("Expected duplicate plugin bundle identity error");
  }
  assert.ok(result.errors.some((e) => e.code === "E_DUPLICATE_ID"));
});
