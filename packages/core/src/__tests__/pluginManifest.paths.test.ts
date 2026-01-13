import { describe, expect, it } from "vitest";

import { isSafeRelativePath, resolvePluginBundlePaths } from "../parse/pluginManifest";

describe("pluginManifest paths", () => {
  it("PLUG-LAYOUT-002: resolves bundle files relative to the manifest directory", () => {
    const resolved = resolvePluginBundlePaths("extensions/demo/plugin.md", ["entry.js", "ui.md"]);
    expect(resolved.get("entry.js")).toBe("extensions/demo/entry.js");
    expect(resolved.get("ui.md")).toBe("extensions/demo/ui.md");
  });

  it("PLUG-LAYOUT-002: root manifest resolves bundle files without a directory prefix", () => {
    const resolved = resolvePluginBundlePaths("plugin.md", ["entry.js"]);
    expect(resolved.get("entry.js")).toBe("entry.js");
  });

  it("PLUG-LAYOUT-003: safe relative path rules reject traversal, absolute paths, and whitespace", () => {
    expect(isSafeRelativePath("entry.js")).toBe(true);
    expect(isSafeRelativePath("dir/file.js")).toBe(true);
    expect(isSafeRelativePath("manifest.md")).toBe(true);

    expect(isSafeRelativePath("")).toBe(false);
    expect(isSafeRelativePath("  entry.js")).toBe(false);
    expect(isSafeRelativePath("entry.js  ")).toBe(false);
    expect(isSafeRelativePath("/abs.js")).toBe(false);
    expect(isSafeRelativePath("./rel.js")).toBe(false);
    expect(isSafeRelativePath("a\\b.js")).toBe(false);
    expect(isSafeRelativePath("a//b.js")).toBe(false);
    expect(isSafeRelativePath("a/./b.js")).toBe(false);
    expect(isSafeRelativePath("a/../b.js")).toBe(false);
    expect(isSafeRelativePath("../escape.js")).toBe(false);
    expect(isSafeRelativePath("a\0b.js")).toBe(false);
  });
});
