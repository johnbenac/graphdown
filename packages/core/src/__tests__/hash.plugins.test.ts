import assert from "node:assert/strict";
import { test } from "vitest";

import { computeGdHashV1 } from "..";
import type { DatasetSnapshot } from "..";
import { loadFixtureSnapshot } from "./fixtureLoader";

const encoder = new TextEncoder();

type HashResult = ReturnType<typeof computeGdHashV1>;

type SnapshotEntry = [string, string];

function digest(result: HashResult): string {
  if (!result.ok) {
    assert.fail(JSON.stringify(result.errors));
  }
  return result.cid;
}

function snapshot(entries: SnapshotEntry[]): DatasetSnapshot {
  return {
    files: new Map(entries.map(([path, content]) => [path, encoder.encode(content)]))
  };
}

test(
  "HASH-001: snapshot hash includes plugin objects and is path-independent for plugin directory relocation",
  () => {
    const base = loadFixtureSnapshot("plugin-valid-dataset");

    const digestBase = digest(computeGdHashV1(base, "snapshot"));

    const withoutPlugin = {
      files: new Map(base.files)
    };
    withoutPlugin.files.delete("extensions/demo/plugin.md");
    withoutPlugin.files.delete("extensions/demo/entry.js");
    withoutPlugin.files.delete("extensions/demo/ui.md");

    const digestWithout = digest(computeGdHashV1(withoutPlugin, "snapshot"));
    assert.notEqual(digestBase, digestWithout);

    const movedFiles = new Map<string, Uint8Array>();
    for (const [path, bytes] of base.files.entries()) {
      if (path.startsWith("extensions/demo/")) {
        const relocatedPath = `relocated/demo/${path.slice("extensions/demo/".length)}`;
        movedFiles.set(relocatedPath, bytes);
      } else {
        movedFiles.set(path, bytes);
      }
    }
    const moved: DatasetSnapshot = { files: movedFiles };

    const digestMoved = digest(computeGdHashV1(moved, "snapshot"));
    assert.equal(digestMoved, digestBase);
  }
);

test("HASH-003: snapshot fingerprint changes when a plugin bundle file changes", () => {
  const base = loadFixtureSnapshot("plugin-valid-dataset");
  const digestBase = digest(computeGdHashV1(base, "snapshot"));

  const changed = {
    files: new Map(base.files)
  };
  changed.files.set("extensions/demo/entry.js", encoder.encode("console.log('updated')\n"));

  const digestChanged = digest(computeGdHashV1(changed, "snapshot"));
  assert.notEqual(digestChanged, digestBase);
});

test("HASH-001: duplicate pluginId manifests fail hashing with E_DUPLICATE_ID", () => {
  const snap = loadFixtureSnapshot("plugin-invalid-duplicate-pluginId");
  const result = computeGdHashV1(snap, "snapshot");
  assert.equal(result.ok, false);
  if (result.ok) {
    return;
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

  const snap = snapshot([
    ["plugin.md", manifest],
    ["entry.js", "console.log('demo')\n"]
  ]);

  const result = computeGdHashV1(snap, "snapshot");
  assert.equal(result.ok, false);
  if (result.ok) {
    return;
  }
  assert.ok(result.errors.some((e) => e.code === "E_DUPLICATE_ID"));
});
