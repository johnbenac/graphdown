import { describe, expect, it } from "vitest";

import { parsePluginManifest } from "..";

describe("plugin manifest front matter parsing", () => {
  it("PLUG-FR-001: missing opening delimiter returns E_FRONT_MATTER_MISSING", () => {
    const filePath = "extensions/demo/plugin.md";
    const input = ["pluginId: demo", "---", ""].join("\n");

    const result = parsePluginManifest(input, filePath);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("E_FRONT_MATTER_MISSING");
    expect(result.error.file).toBe(filePath);
  });

  it("PLUG-FR-001: missing closing delimiter returns E_FRONT_MATTER_UNTERMINATED", () => {
    const filePath = "extensions/demo/plugin.md";
    const input = ["---", "pluginId: demo", "gdApiVersion: 1"].join("\n");

    const result = parsePluginManifest(input, filePath);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("E_FRONT_MATTER_UNTERMINATED");
    expect(result.error.file).toBe(filePath);
  });

  it("PLUG-FR-001: invalid YAML returns E_YAML_INVALID", () => {
    const filePath = "extensions/demo/plugin.md";
    const input = ["---", "pluginId: [", "---", ""].join("\n");

    const result = parsePluginManifest(input, filePath);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("E_YAML_INVALID");
    expect(result.error.file).toBe(filePath);
  });

  it("PLUG-FR-001: non-object YAML returns E_YAML_NOT_OBJECT", () => {
    const filePath = "extensions/demo/plugin.md";
    const input = ["---", "- demo", "---", ""].join("\n");

    const result = parsePluginManifest(input, filePath);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("E_YAML_NOT_OBJECT");
    expect(result.error.file).toBe(filePath);
  });
});
