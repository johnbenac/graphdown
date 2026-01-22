import { describe, expect, it } from "vitest";

import { collectDeclaredPluginBundleRelPaths } from "../pluginManifest.js";

describe("collectDeclaredPluginBundleRelPaths", () => {
  it("includes entry, files, and binaryFiles with deterministic dedupe order", () => {
    const declared = collectDeclaredPluginBundleRelPaths(
      {
        entry: "entry.js",
        files: ["entry.js", "ui.md", "logo.png"],
        binaryFiles: ["logo.png", "bundle.bin"]
      },
      "plugins/demo/manifest.md"
    );

    expect(declared).toEqual(["entry.js", "ui.md", "logo.png", "bundle.bin"]);
  });

  it("throws when entry is not a string", () => {
    expect(() =>
      collectDeclaredPluginBundleRelPaths({ entry: 42 }, "plugins/demo/manifest.md")
    ).toThrow(/entry/);
  });

  it("throws when files is not a string array", () => {
    expect(() =>
      collectDeclaredPluginBundleRelPaths({ files: "entry.js" }, "plugins/demo/manifest.md")
    ).toThrow(/files/);
  });

  it("throws when binaryFiles is not a string array", () => {
    expect(() =>
      collectDeclaredPluginBundleRelPaths(
        { binaryFiles: { entry: "logo.png" } },
        "plugins/demo/manifest.md"
      )
    ).toThrow(/binaryFiles/);
  });

  it("throws when declared paths are not safe relative paths", () => {
    expect(() =>
      collectDeclaredPluginBundleRelPaths({ entry: "../entry.js" }, "plugins/demo/manifest.md")
    ).toThrow(/entry/);
    expect(() =>
      collectDeclaredPluginBundleRelPaths({ files: ["/abs.js"] }, "plugins/demo/manifest.md")
    ).toThrow(/files/);
    expect(() =>
      collectDeclaredPluginBundleRelPaths(
        { binaryFiles: ["./logo.png"] },
        "plugins/demo/manifest.md"
      )
    ).toThrow(/binaryFiles/);
    expect(() =>
      collectDeclaredPluginBundleRelPaths(
        { files: ["a\\b.png"] },
        "plugins/demo/manifest.md"
      )
    ).toThrow(/files/);
  });
});
