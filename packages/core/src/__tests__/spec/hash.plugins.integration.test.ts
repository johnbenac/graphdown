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

test("HASH-001: plugin text bundle files normalize line endings", () => {
  const manifest = [
    "---",
    "pluginId: demo",
    "gdApiVersion: 1",
    "entry: entry.js",
    "files:",
    "  - entry.js",
    "---",
    ""
  ].join("\n");
  const lfSnapshot: DatasetSnapshot = {
    files: new Map<string, Uint8Array>([
      ["extensions/demo/plugin.md", encoder.encode(manifest)],
      ["extensions/demo/entry.js", encoder.encode("console.log('hi');\n")]
    ])
  };
  const crlfSnapshot: DatasetSnapshot = {
    files: new Map<string, Uint8Array>([
      ["extensions/demo/plugin.md", encoder.encode(manifest)],
      ["extensions/demo/entry.js", encoder.encode("console.log('hi');\r\n")]
    ])
  };

  const digestLf = digest(computeGdHashV1(lfSnapshot, "snapshot"));
  const digestCrlf = digest(computeGdHashV1(crlfSnapshot, "snapshot"));

  assert.equal(digestLf, digestCrlf);
});

test("HASH-001: binary plugin bundle files hash raw bytes", () => {
  const manifest = [
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
  ].join("\n");
  const base: DatasetSnapshot = {
    files: new Map<string, Uint8Array>([
      ["extensions/demo/plugin.md", encoder.encode(manifest)],
      ["extensions/demo/entry.js", encoder.encode("console.log('entry');\n")],
      ["extensions/demo/assets/logo.bin", new Uint8Array([0xff, 0xd8, 0xff, 0x00, 0x80])]
    ])
  };
  const changed: DatasetSnapshot = {
    files: new Map<string, Uint8Array>([
      ["extensions/demo/plugin.md", encoder.encode(manifest)],
      ["extensions/demo/entry.js", encoder.encode("console.log('entry');\n")],
      ["extensions/demo/assets/logo.bin", new Uint8Array([0xff, 0xd8, 0xff, 0x00, 0x81])]
    ])
  };

  const digestBase = digest(computeGdHashV1(base, "snapshot"));
  const digestChanged = digest(computeGdHashV1(changed, "snapshot"));

  assert.notEqual(digestBase, digestChanged);
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
