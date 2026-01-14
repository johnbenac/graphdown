import { describe, expect, it } from "vitest";

import { parsePluginManifest } from "..";

const manifestPath = "extensions/demo/plugin.md";

describe("plugin manifest front matter parsing", () => {
  it("PLUG-FR-001: missing opening delimiter yields E_FRONT_MATTER_MISSING", () => {
    const text = "pluginId: demo\n";
    const result = parsePluginManifest(text, manifestPath);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("E_FRONT_MATTER_MISSING");
    expect(result.error.file).toBe(manifestPath);
  });

  it("PLUG-FR-001: missing closing delimiter yields E_FRONT_MATTER_UNTERMINATED", () => {
    const text = ["---", "pluginId: demo", ""].join("\n");
    const result = parsePluginManifest(text, manifestPath);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("E_FRONT_MATTER_UNTERMINATED");
    expect(result.error.file).toBe(manifestPath);
  });

  it("PLUG-FR-001: invalid YAML yields E_YAML_INVALID", () => {
    const text = ["---", "pluginId: [", "---", ""].join("\n");
    const result = parsePluginManifest(text, manifestPath);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("E_YAML_INVALID");
    expect(result.error.file).toBe(manifestPath);
  });

  it("PLUG-FR-001: non-object YAML yields E_YAML_NOT_OBJECT", () => {
    const text = ["---", "- entry.js", "---", ""].join("\n");
    const result = parsePluginManifest(text, manifestPath);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("E_YAML_NOT_OBJECT");
    expect(result.error.file).toBe(manifestPath);
  });
});
