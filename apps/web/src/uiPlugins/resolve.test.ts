import { describe, expect, it } from "vitest";
import type { DatasetUiConfig } from "./types";
import { resolveProvider } from "./resolve";

function provider(pluginId: string) {
  return {
    pluginId,
    version: "1.0.0",
    mainPath: "plugin.js",
    capability: "field.view" as const,
    match: { kind: "boolean" },
    entry: "renderField",
    index: 0
  };
}

describe("resolveProvider", () => {
  it("chooses deterministically by plugin id and reports ambiguity", () => {
    const providers = [provider("boolean-01"), provider("boolean-redgreen")];
    const { resolved } = resolveProvider({
      requirement: { capability: "field.view", selector: { kind: "boolean" } },
      providers,
      config: null
    });

    expect(resolved?.chosen.pluginId).toBe("boolean-01");
    expect(resolved?.ambiguousTopGroup.map((item) => item.pluginId).sort()).toEqual([
      "boolean-01",
      "boolean-redgreen"
    ]);
  });

  it("honors config resolution to select plugin without ambiguity", () => {
    const providers = [provider("boolean-01"), provider("boolean-redgreen")];
    const config: DatasetUiConfig = {
      schemaVersion: 1,
      resolutions: [
        { capability: "field.view", match: { kind: "boolean" }, use: "boolean-redgreen" }
      ]
    };

    const { resolved } = resolveProvider({
      requirement: { capability: "field.view", selector: { kind: "boolean" } },
      providers,
      config
    });

    expect(resolved?.chosen.pluginId).toBe("boolean-redgreen");
    expect(resolved?.ambiguousTopGroup).toEqual([]);
    expect(resolved?.usedResolution).toBe(true);
  });
});
