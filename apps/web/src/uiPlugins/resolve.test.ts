import { describe, expect, it } from "vitest";
import { resolveProvider } from "./resolve";
import type { ProviderRef, UiResolutionConfig } from "./types";

function makeProvider(input: {
  pluginId: string;
  version: string;
  match: Record<string, string>;
  index?: number;
}): ProviderRef {
  return {
    pluginId: input.pluginId,
    version: input.version,
    mainPath: `plugins/${input.pluginId}/plugin.js`,
    capability: "field.view",
    match: input.match,
    entry: "renderField",
    index: input.index ?? 0
  };
}

describe("resolveProvider", () => {
  it("deterministically breaks ties by plugin id and reports ambiguity", () => {
    const providers = [
      makeProvider({ pluginId: "boolean-redgreen", version: "1.0.0", match: { kind: "boolean" } }),
      makeProvider({ pluginId: "boolean-01", version: "1.0.0", match: { kind: "boolean" } })
    ];

    const resolved = resolveProvider({
      requirement: { capability: "field.view", selector: { kind: "boolean" } },
      providers
    });

    expect(resolved?.chosen.pluginId).toBe("boolean-01");
    expect(resolved?.ambiguousTopGroup.length).toBe(2);
    expect(resolved?.usedResolution).toBe(false);
  });

  it("uses dataset resolution overrides to select a plugin without ambiguity", () => {
    const providers = [
      makeProvider({ pluginId: "boolean-redgreen", version: "1.0.0", match: { kind: "boolean" } }),
      makeProvider({ pluginId: "boolean-01", version: "1.0.0", match: { kind: "boolean" } })
    ];
    const resolutions: UiResolutionConfig[] = [
      { capability: "field.view", match: { kind: "boolean" }, use: "boolean-redgreen" }
    ];

    const resolved = resolveProvider({
      requirement: { capability: "field.view", selector: { kind: "boolean" } },
      providers,
      resolutions
    });

    expect(resolved?.chosen.pluginId).toBe("boolean-redgreen");
    expect(resolved?.ambiguousTopGroup.length).toBe(0);
    expect(resolved?.usedResolution).toBe(true);
  });
});
