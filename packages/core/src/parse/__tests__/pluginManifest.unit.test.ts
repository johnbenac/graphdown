import { describe, expect, it } from "vitest";

import { collectDeclaredPluginBundleRelPaths } from "../pluginManifest";

describe("plugin manifest declared bundle paths", () => {
  it("includes entry, files, and binaryFiles with deterministic de-dupe", () => {
    const yaml = {
      entry: "entry.js",
      files: ["entry.js", "ui.md"],
      binaryFiles: ["logo.png", "ui.md"]
    };

    const declared = collectDeclaredPluginBundleRelPaths(yaml, "extensions/demo/plugin.md");

    expect(declared).toEqual(["entry.js", "ui.md", "logo.png"]);
  });

  it("throws when entry is not a string", () => {
    expect(() =>
      collectDeclaredPluginBundleRelPaths({ entry: 42 }, "extensions/demo/plugin.md")
    ).toThrow();
  });

  it("throws when files is not a string[]", () => {
    expect(() =>
      collectDeclaredPluginBundleRelPaths({ files: "not-array" }, "extensions/demo/plugin.md")
    ).toThrow();
    expect(() =>
      collectDeclaredPluginBundleRelPaths({ files: ["ok", 1] }, "extensions/demo/plugin.md")
    ).toThrow();
  });

  it("throws when binaryFiles is not a string[]", () => {
    expect(() =>
      collectDeclaredPluginBundleRelPaths(
        { binaryFiles: "not-array" },
        "extensions/demo/plugin.md"
      )
    ).toThrow();
    expect(() =>
      collectDeclaredPluginBundleRelPaths(
        { binaryFiles: ["ok", false] },
        "extensions/demo/plugin.md"
      )
    ).toThrow();
  });

  it("throws when declared paths are not safe relative paths", () => {
    expect(() =>
      collectDeclaredPluginBundleRelPaths({ entry: "../escape.js" }, "plugin.md")
    ).toThrow();
    expect(() =>
      collectDeclaredPluginBundleRelPaths({ files: ["/abs.js"] }, "plugin.md")
    ).toThrow();
    expect(() =>
      collectDeclaredPluginBundleRelPaths({ files: ["./rel.js"] }, "plugin.md")
    ).toThrow();
    expect(() =>
      collectDeclaredPluginBundleRelPaths({ files: ["a\\b.js"] }, "plugin.md")
    ).toThrow();
  });
});
