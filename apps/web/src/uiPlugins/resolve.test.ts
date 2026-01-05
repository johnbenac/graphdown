import { describe, expect, it } from "vitest";
import { resolveProvider } from "./resolve";
import type { DatasetUiConfig, PluginCatalog, ProviderRef, UiRequirement } from "./types";

function makeCatalog(providers: ProviderRef[]): PluginCatalog {
  return {
    manifestsById: new Map(),
    providers
  };
}

const requirement: UiRequirement = {
  capability: "field.view",
  selector: { kind: "boolean" }
};

describe("uiPlugins resolver", () => {
  it("deterministically breaks ties by plugin id and marks ambiguity", () => {
    const providers: ProviderRef[] = [
      {
        pluginId: "boolean-redgreen",
        version: "1.0.0",
        mainPath: "plugins/boolean-redgreen/plugin.js",
        capability: "field.view",
        match: { kind: "boolean" },
        entry: "renderField",
        providerIndex: 0
      },
      {
        pluginId: "boolean-01",
        version: "1.0.0",
        mainPath: "plugins/boolean-01/plugin.js",
        capability: "field.view",
        match: { kind: "boolean" },
        entry: "renderField",
        providerIndex: 0
      }
    ];
    const resolved = resolveProvider(requirement, makeCatalog(providers), null);
    expect(resolved?.chosen.pluginId).toBe("boolean-01");
    expect(resolved?.ambiguousTopGroup.length).toBe(2);
    expect(resolved?.usedResolution).toBe(false);
  });

  it("honors explicit resolution overrides and suppresses ambiguity", () => {
    const providers: ProviderRef[] = [
      {
        pluginId: "boolean-redgreen",
        version: "1.0.0",
        mainPath: "plugins/boolean-redgreen/plugin.js",
        capability: "field.view",
        match: { kind: "boolean" },
        entry: "renderField",
        providerIndex: 0
      },
      {
        pluginId: "boolean-01",
        version: "1.0.0",
        mainPath: "plugins/boolean-01/plugin.js",
        capability: "field.view",
        match: { kind: "boolean" },
        entry: "renderField",
        providerIndex: 0
      }
    ];
    const config: DatasetUiConfig = {
      schemaVersion: 1,
      resolutions: [
        {
          capability: "field.view",
          match: { kind: "boolean" },
          use: "boolean-redgreen"
        }
      ]
    };
    const resolved = resolveProvider(requirement, makeCatalog(providers), config);
    expect(resolved?.chosen.pluginId).toBe("boolean-redgreen");
    expect(resolved?.usedResolution).toBe(true);
    expect(resolved?.ambiguousTopGroup.length).toBe(1);
  });
});
