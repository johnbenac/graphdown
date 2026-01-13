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

function cloneSnapshot(snapshot: DatasetSnapshot): DatasetSnapshot {
  return { files: new Map(snapshot.files) };
}

test("HASH-001: snapshot hash includes plugin objects and is path-independent for plugin directory relocation", () => {
  const base = loadFixtureSnapshot("plugin-valid-dataset");

  const digestBase = digest(computeGdHashV1(base, "snapshot"));

  const withoutPlugin = cloneSnapshot(base);
  withoutPlugin.files.delete("extensions/demo/plugin.md");
  withoutPlugin.files.delete("extensions/demo/entry.js");
  withoutPlugin.files.delete("extensions/demo/ui.md");

  const digestWithout = digest(computeGdHashV1(withoutPlugin, "snapshot"));
  assert.notEqual(digestBase, digestWithout);

  const movedFiles = new Map<string, Uint8Array>();
  const pluginPaths = new Set([
    "extensions/demo/plugin.md",
    "extensions/demo/entry.js",
    "extensions/demo/ui.md",
  ]);

  for (const [path, bytes] of base.files) {
    if (pluginPaths.has(path)) {
      movedFiles.set(path.replace("extensions/demo/", "relocated/demo/"), bytes);
    } else {
      movedFiles.set(path, bytes);
    }
  }

  const movedSnapshot: DatasetSnapshot = { files: movedFiles };
  const digestMoved = digest(computeGdHashV1(movedSnapshot, "snapshot"));
  assert.equal(digestMoved, digestBase);
});

test("HASH-003: snapshot fingerprint changes when a plugin bundle file changes", () => {
  const base = loadFixtureSnapshot("plugin-valid-dataset");
  const digestBase = digest(computeGdHashV1(base, "snapshot"));

  const updated = cloneSnapshot(base);
  updated.files.set("extensions/demo/entry.js", encoder.encode("console.log('updated');\n"));

  const digestUpdated = digest(computeGdHashV1(updated, "snapshot"));
  assert.notEqual(digestUpdated, digestBase);
});

test("HASH-001: duplicate pluginId manifests fail hashing with E_DUPLICATE_ID", () => {
  const snap = loadFixtureSnapshot("plugin-invalid-duplicate-pluginId");
  const result = computeGdHashV1(snap, "snapshot");
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.ok(result.errors.some((e) => e.code === "E_DUPLICATE_ID"));
  }
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
    "",
  ].join("\n");

  const snapshot: DatasetSnapshot = {
    files: new Map([
      ["plugin.md", encoder.encode(manifest)],
      ["entry.js", encoder.encode("console.log('demo');\n")],
    ]),
  };

  const result = computeGdHashV1(snapshot, "snapshot");
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.ok(result.errors.some((e) => e.code === "E_DUPLICATE_ID"));
  }
});
