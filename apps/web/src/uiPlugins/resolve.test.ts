import { describe, expect, it } from "vitest";
import { resolveProvider } from "./resolve";
import type { PluginCatalog, ProviderRef } from "./types";

function makeProvider(input: {
  pluginId: string;
  version: string;
  match: Record<string, string>;
  providerIndex?: number;
}): ProviderRef {
  return {
    pluginId: input.pluginId,
    version: input.version,
    main: "plugin.js",
    capability: "field.view",
    match: input.match,
    entry: "renderField",
    providerIndex: input.providerIndex ?? 0
  };
}

function makeCatalog(providers: ProviderRef[]): PluginCatalog {
  return {
    manifestsById: new Map(),
    providers
  };
}

describe("resolveProvider", () => {
  it("UI-PLUGIN-003: chooses lexicographic plugin id on a deterministic tie", () => {
    const providers = [
      makeProvider({ pluginId: "boolean-redgreen", version: "1.0.0", match: { kind: "boolean" } }),
      makeProvider({ pluginId: "boolean-01", version: "1.0.0", match: { kind: "boolean" } })
    ];
    const resolved = resolveProvider({
      requirement: { capability: "field.view", selector: { kind: "boolean" } },
      catalog: makeCatalog(providers),
      config: null
    });

    expect(resolved?.chosen.pluginId).toBe("boolean-01");
    expect(resolved?.ambiguousTopGroup.map((provider) => provider.pluginId).sort()).toEqual([
      "boolean-01",
      "boolean-redgreen"
    ]);
  });

  it("UI-PLUGIN-003: respects dataset resolution overrides", () => {
    const providers = [
      makeProvider({ pluginId: "boolean-redgreen", version: "1.0.0", match: { kind: "boolean" } }),
      makeProvider({ pluginId: "boolean-01", version: "1.0.0", match: { kind: "boolean" } })
    ];
    const resolved = resolveProvider({
      requirement: { capability: "field.view", selector: { kind: "boolean" } },
      catalog: makeCatalog(providers),
      config: {
        schemaVersion: 1,
        resolutions: [
          { capability: "field.view", match: { kind: "boolean" }, use: "boolean-redgreen" }
        ]
      }
    });

    expect(resolved?.chosen.pluginId).toBe("boolean-redgreen");
    expect(resolved?.usedResolution).toBe(true);
    expect(resolved?.ambiguousTopGroup).toHaveLength(1);
  });
});
