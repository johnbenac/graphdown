import { describe, expect, it } from "vitest";

import { isValidPluginId } from "../ids.js";

describe("plugin manifest ids", () => {
  it("PLUG-ID-001: pluginId matches separator-safe identifier syntax", () => {
    expect(isValidPluginId("demo")).toBe(true);
    expect(isValidPluginId("a")).toBe(true);
    expect(isValidPluginId("A1")).toBe(true);
    expect(isValidPluginId("a_b")).toBe(true);
    expect(isValidPluginId("a-b")).toBe(true);
    expect(isValidPluginId("0abc")).toBe(true);

    expect(isValidPluginId("")).toBe(false);
    expect(isValidPluginId("   ")).toBe(false);
    expect(isValidPluginId(" demo")).toBe(false);
    expect(isValidPluginId("demo ")).toBe(false);
    expect(isValidPluginId("-bad")).toBe(false);
    expect(isValidPluginId("_bad")).toBe(false);
    expect(isValidPluginId("a.b")).toBe(false);
    expect(isValidPluginId("a:b")).toBe(false);
    expect(isValidPluginId("a/b")).toBe(false);
  });
});
