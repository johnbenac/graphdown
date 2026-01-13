import assert from "node:assert/strict";
import { test } from "vitest";

import { isSafeRelativePath, resolvePluginBundlePaths } from "..";

test("PLUG-LAYOUT-002: resolves bundle files relative to the manifest directory", () => {
  const resolved = resolvePluginBundlePaths("extensions/demo/plugin.md", ["entry.js", "ui.md"]);
  assert.equal(resolved.get("entry.js"), "extensions/demo/entry.js");
  assert.equal(resolved.get("ui.md"), "extensions/demo/ui.md");
});

test("PLUG-LAYOUT-002: root manifest resolves bundle files without a directory prefix", () => {
  const resolved = resolvePluginBundlePaths("plugin.md", ["entry.js"]);
  assert.equal(resolved.get("entry.js"), "entry.js");
});

test("PLUG-LAYOUT-003: safe relative path rules reject traversal, absolute paths, and whitespace", () => {
  const valid = ["entry.js", "dir/file.js", "manifest.md"];
  const invalid = [
    "",
    "  entry.js",
    "entry.js  ",
    "/abs.js",
    "./rel.js",
    "a\\b.js",
    "a//b.js",
    "a/./b.js",
    "a/../b.js",
    "../escape.js",
    "a\0b.js",
  ];

  for (const value of valid) {
    assert.equal(isSafeRelativePath(value), true, `${value} should be valid`);
  }

  for (const value of invalid) {
    assert.equal(isSafeRelativePath(value), false, `${value} should be invalid`);
  }
});
