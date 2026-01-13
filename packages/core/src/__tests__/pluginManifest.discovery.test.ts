import { describe, expect, it } from "vitest";

import { isPluginManifestCandidateBytes } from "../parse/pluginManifest";
import { loadFixtureSnapshot } from "./fixtureLoader";

const encoder = new TextEncoder();

describe("plugin manifest discovery", () => {
  it("PLUG-LAYOUT-001: discovers plugin manifests in fixtures", () => {
    const snapshot = loadFixtureSnapshot("plugin-valid-dataset");
    const bytes = snapshot.files.get("extensions/demo/plugin.md");
    expect(bytes).toBeDefined();
    expect(isPluginManifestCandidateBytes("extensions/demo/plugin.md", bytes!)).toBe(true);
  });

  it("PLUG-LAYOUT-001: detects plugin manifests with CR-only line endings", () => {
    const text = ["---", "pluginId: demo", "gdApiVersion: 1", "---", "body"].join("\r");
    const bytes = encoder.encode(text);
    expect(isPluginManifestCandidateBytes("extensions/demo/plugin.md", bytes)).toBe(true);
  });

  it("PLUG-LAYOUT-001: record precedence keeps type records from being plugin manifests", () => {
    const text = ["---", "typeId: note", "pluginId: demo", "gdApiVersion: 1", "---", "body"].join("\n");
    const bytes = encoder.encode(text);
    expect(isPluginManifestCandidateBytes("records/note.md", bytes)).toBe(false);
  });

  it("PLUG-LAYOUT-001: requires pluginId and gdApiVersion keys", () => {
    const onlyPluginId = ["---", "pluginId: demo", "---", "body"].join("\n");
    const onlyApiVersion = ["---", "gdApiVersion: 1", "---", "body"].join("\n");
    expect(isPluginManifestCandidateBytes("extensions/demo/plugin.md", encoder.encode(onlyPluginId))).toBe(false);
    expect(isPluginManifestCandidateBytes("extensions/demo/plugin.md", encoder.encode(onlyApiVersion))).toBe(false);
  });
});
