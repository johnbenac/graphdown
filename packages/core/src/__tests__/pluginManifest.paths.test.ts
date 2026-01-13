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
  assert.equal(isSafeRelativePath("entry.js"), true);
  assert.equal(isSafeRelativePath("dir/file.js"), true);
  assert.equal(isSafeRelativePath("manifest.md"), true);

  assert.equal(isSafeRelativePath(""), false);
  assert.equal(isSafeRelativePath("  entry.js"), false);
  assert.equal(isSafeRelativePath("entry.js  "), false);
  assert.equal(isSafeRelativePath("/abs.js"), false);
  assert.equal(isSafeRelativePath("./rel.js"), false);
  assert.equal(isSafeRelativePath("a\\b.js"), false);
  assert.equal(isSafeRelativePath("a//b.js"), false);
  assert.equal(isSafeRelativePath("a/./b.js"), false);
  assert.equal(isSafeRelativePath("a/../b.js"), false);
  assert.equal(isSafeRelativePath("../escape.js"), false);
  assert.equal(isSafeRelativePath("a\0b.js"), false);
});
