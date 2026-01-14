import { describe, expect, it } from "vitest";

import { parsePluginManifest } from "../parse/pluginManifest";

describe("plugin manifest front matter", () => {
  const filePath = "extensions/demo/plugin.md";

  it("PLUG-FR-001: missing opening delimiter fails with E_FRONT_MATTER_MISSING", () => {
    const text = ["pluginId: demo", "---", ""].join("\n");
    const result = parsePluginManifest(text, filePath);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("E_FRONT_MATTER_MISSING");
    expect(result.error.file).toBe(filePath);
  });

  it("PLUG-FR-001: missing closing delimiter fails with E_FRONT_MATTER_UNTERMINATED", () => {
    const text = ["---", "pluginId: demo", ""].join("\n");
    const result = parsePluginManifest(text, filePath);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("E_FRONT_MATTER_UNTERMINATED");
    expect(result.error.file).toBe(filePath);
  });

  it("PLUG-FR-001: invalid YAML fails with E_YAML_INVALID", () => {
    const text = ["---", "pluginId: [", "---", ""].join("\n");
    const result = parsePluginManifest(text, filePath);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("E_YAML_INVALID");
    expect(result.error.file).toBe(filePath);
  });

  it("PLUG-FR-001: non-object YAML fails with E_YAML_NOT_OBJECT", () => {
    const text = ["---", "- entry.js", "---", ""].join("\n");
    const result = parsePluginManifest(text, filePath);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("E_YAML_NOT_OBJECT");
    expect(result.error.file).toBe(filePath);
  });
});
