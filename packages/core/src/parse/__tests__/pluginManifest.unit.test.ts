import { describe, expect, it } from "vitest";

import { collectDeclaredPluginBundleRelPaths } from "../pluginManifest";

describe("collectDeclaredPluginBundleRelPaths", () => {
  it("returns entry, files, and binaryFiles in order with deterministic de-dupe", () => {
    const yaml = {
      entry: "entry.js",
      files: ["entry.js", "ui.md"],
      binaryFiles: ["logo.png", "ui.md"]
    };

    const result = collectDeclaredPluginBundleRelPaths(yaml, "extensions/demo/plugin.md");

    expect(result).toEqual(["entry.js", "ui.md", "logo.png"]);
  });

  it("throws when entry is not a string", () => {
    expect(() =>
      collectDeclaredPluginBundleRelPaths({ entry: 123 }, "plugins/demo/plugin.md")
    ).toThrow(/invalid entry/i);
  });

  it("throws when files is not a string array", () => {
    expect(() =>
      collectDeclaredPluginBundleRelPaths({ files: "entry.js" }, "plugins/demo/plugin.md")
    ).toThrow(/invalid files/i);
  });

  it("throws when binaryFiles is not a string array", () => {
    expect(() =>
      collectDeclaredPluginBundleRelPaths({ binaryFiles: ["ok", 1] }, "plugins/demo/plugin.md")
    ).toThrow(/invalid binaryfiles/i);
  });

  it("throws when declared paths are not safe relative paths", () => {
    expect(() =>
      collectDeclaredPluginBundleRelPaths({ entry: "../escape.js" }, "plugins/demo/plugin.md")
    ).toThrow(/safe relative path/i);
  });
});
