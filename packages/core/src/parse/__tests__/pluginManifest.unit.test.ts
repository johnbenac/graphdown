import { describe, expect, it } from "vitest";

import { collectDeclaredPluginBundleRelPaths } from "../pluginManifest";

describe("plugin manifest declared bundles", () => {
  it("collects entry, files, and binaryFiles in order with dedupe", () => {
    const declared = collectDeclaredPluginBundleRelPaths(
      {
        entry: "entry.js",
        files: ["entry.js", "ui.md", "shared.json"],
        binaryFiles: ["logo.png", "ui.md"]
      },
      "extensions/demo/plugin.md"
    );

    expect(declared).toEqual(["entry.js", "ui.md", "shared.json", "logo.png"]);
  });

  it("throws when entry is not a string", () => {
    expect(() =>
      collectDeclaredPluginBundleRelPaths({ entry: 123 }, "extensions/demo/plugin.md")
    ).toThrow(/entry/);
  });

  it("throws when files is not a string array", () => {
    expect(() =>
      collectDeclaredPluginBundleRelPaths({ files: "entry.js" }, "extensions/demo/plugin.md")
    ).toThrow(/files/);
  });

  it("throws when binaryFiles is not a string array", () => {
    expect(() =>
      collectDeclaredPluginBundleRelPaths(
        { binaryFiles: ["ok.png", 42] },
        "extensions/demo/plugin.md"
      )
    ).toThrow(/binaryFiles/);
  });

  it("throws when declared paths are not safe relative paths", () => {
    expect(() =>
      collectDeclaredPluginBundleRelPaths(
        { entry: "../escape.js" },
        "extensions/demo/plugin.md"
      )
    ).toThrow(/entry/);
    expect(() =>
      collectDeclaredPluginBundleRelPaths(
        { files: ["/abs.js"] },
        "extensions/demo/plugin.md"
      )
    ).toThrow(/files/);
    expect(() =>
      collectDeclaredPluginBundleRelPaths(
        { binaryFiles: ["a\\b.png"] },
        "extensions/demo/plugin.md"
      )
    ).toThrow(/binaryFiles/);
  });
});
