import { describe, expect, it } from "vitest";

import { collectDeclaredPluginBundleRelPaths } from "../pluginManifest";

describe("collectDeclaredPluginBundleRelPaths", () => {
  it("includes entry, files, and binaryFiles with deterministic dedupe order", () => {
    const declared = collectDeclaredPluginBundleRelPaths(
      {
        entry: "entry.js",
        files: ["entry.js", "ui.md", "logo.png"],
        binaryFiles: ["logo.png", "bundle.bin"]
      },
      "extensions/demo/plugin.md"
    );

    expect(declared).toEqual(["entry.js", "ui.md", "logo.png", "bundle.bin"]);
  });

  it("throws when entry is not a string", () => {
    expect(() =>
      collectDeclaredPluginBundleRelPaths({ entry: 42 }, "extensions/demo/plugin.md")
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
        { binaryFiles: { entry: "logo.png" } },
        "extensions/demo/plugin.md"
      )
    ).toThrow(/binaryFiles/);
  });

  it("throws when declared paths are not safe relative paths", () => {
    expect(() =>
      collectDeclaredPluginBundleRelPaths({ entry: "../entry.js" }, "extensions/demo/plugin.md")
    ).toThrow(/entry/);
    expect(() =>
      collectDeclaredPluginBundleRelPaths({ files: ["/abs.js"] }, "extensions/demo/plugin.md")
    ).toThrow(/files/);
    expect(() =>
      collectDeclaredPluginBundleRelPaths(
        { binaryFiles: ["./logo.png"] },
        "extensions/demo/plugin.md"
      )
    ).toThrow(/binaryFiles/);
    expect(() =>
      collectDeclaredPluginBundleRelPaths(
        { files: ["a\\b.png"] },
        "extensions/demo/plugin.md"
      )
    ).toThrow(/files/);
  });
});
