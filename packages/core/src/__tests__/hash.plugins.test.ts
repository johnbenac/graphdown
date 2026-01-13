import assert from "node:assert/strict";
import { test } from "vitest";

import { computeGdHashV1 } from "..";
import type { DatasetSnapshot } from "..";
import { loadFixtureSnapshot } from "./fixtureLoader";

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

    const withoutFiles = new Map(base.files);
    withoutFiles.delete("extensions/demo/plugin.md");
    withoutFiles.delete("extensions/demo/entry.js");
    withoutFiles.delete("extensions/demo/ui.md");

    const digestWithout = digest(computeGdHashV1({ files: withoutFiles }, "snapshot"));
    assert.notEqual(digestBase, digestWithout);

    const relocatedFiles = new Map<string, Uint8Array>();
    const pluginPaths = new Set([
      "extensions/demo/plugin.md",
      "extensions/demo/entry.js",
      "extensions/demo/ui.md",
    ]);
    for (const [path, bytes] of base.files) {
      if (pluginPaths.has(path)) {
        relocatedFiles.set(path.replace("extensions/demo/", "relocated/demo/"), bytes);
      } else {
        relocatedFiles.set(path, bytes);
      }
    }

    const digestMoved = digest(computeGdHashV1({ files: relocatedFiles }, "snapshot"));
    assert.equal(digestMoved, digestBase);
  }
);

test("HASH-003: snapshot fingerprint changes when a plugin bundle file changes", () => {
  const base = loadFixtureSnapshot("plugin-valid-dataset");
  const digestBase = digest(computeGdHashV1(base, "snapshot"));

  const changedFiles = new Map(base.files);
  changedFiles.set("extensions/demo/entry.js", encoder.encode("console.log(\"changed\");\n"));

  const digestChanged = digest(computeGdHashV1({ files: changedFiles }, "snapshot"));
  assert.notEqual(digestChanged, digestBase);
});

test("HASH-001: duplicate pluginId manifests fail hashing with E_DUPLICATE_ID", () => {
  const snap = loadFixtureSnapshot("plugin-invalid-duplicate-pluginId");
  const result = computeGdHashV1(snap, "snapshot");
  if (result.ok) {
    assert.fail("Expected duplicate identity error");
  }
  assert.ok(result.errors.some((e) => e.code === "E_DUPLICATE_ID"));
});

test("HASH-001: duplicate plugin bundle identities fail hashing with E_DUPLICATE_ID", () => {
  const pluginManifest = [
    "---",
    "pluginId: demo",
    "gdApiVersion: 1",
    "entry: entry.js",
    "files:",
    "  - entry.js",
    "  - entry.js",
    "---",
    "",
  ].join("\n");

  const snapshot: DatasetSnapshot = {
    files: new Map<string, Uint8Array>([
      ["plugin.md", encoder.encode(pluginManifest)],
      ["entry.js", encoder.encode("console.log(\"ok\");\n")],
    ]),
  };

  const result = computeGdHashV1(snapshot, "snapshot");
  if (result.ok) {
    assert.fail("Expected duplicate identity error");
  }
  assert.ok(result.errors.some((e) => e.code === "E_DUPLICATE_ID"));
});
